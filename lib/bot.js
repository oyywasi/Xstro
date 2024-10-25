const pino = require('pino');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys');
const config = require('../config');
const WhatsAppStore = require('./store/store');
const { serialize } = require('./serialize');
const { Handler } = require('./handler');
const { commands } = require('./plugins');

class WhatsAppBot {
 constructor() {
  this.logger = pino({ level: config.DEBUG ? 'debug' : 'silent' });
  this.conn = null;
  this.store = WhatsAppStore;
  this.retryCount = 0;
  this.isConnected = false;
  this.qrCode = null;
 }

 async connect() {
  try {
   const sessionDir = path.join(__dirname, '../session');
   const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

   this.conn = makeWASocket({
    auth: {
     creds: state.creds,
     keys: makeCacheableSignalKeyStore(state.keys, this.logger),
    },
    printQRInTerminal: true,
    logger: this.logger,
    browser: Browsers.macOS('Desktop'),
    downloadHistory: false,
    syncFullHistory: false,
    markOnlineOnConnect: config.MARK_ONLINE_ON_CONNECT,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
     const msg = await this.store.loadMessage(key.id);
     return msg?.message || { conversation: null };
    },
    version: [2, 2323, 4],
   });

   this.setupEventListeners(saveCreds);
   return this.conn;
  } catch (error) {
   console.error('Error in connect:', error);
   throw error;
  }
 }

 setupEventListeners(saveCreds) {
  this.conn.ev.on('connection.update', async (update) => {
   await this.handleConnectionUpdate(update);
  });

  this.conn.ev.on('creds.update', saveCreds);

  this.conn.ev.on('messages.upsert', async (m) => {
   await this.handleMessages(m);
  });

  this.conn.ev.on('messages.update', async (updates) => {
   await this.handleMessageUpdates(updates);
  });

  this.conn.ev.on('chats.upsert', async (chats) => {
   for (const chat of chats) {
    await this.store.saveChat(chat);
   }
  });

  this.conn.ev.on('chats.update', async (updates) => {
   for (const update of updates) {
    await this.store.saveChat(update);
   }
  });

  this.conn.ev.on('contacts.update', async (updates) => {
   for (const update of updates) {
    const { id, notify, verifiedName } = update;
    if (notify || verifiedName) {
     await this.store.saveContact(id, notify || verifiedName);
    }
   }
  });

  this.conn.ev.on('call', async (calls) => {
   await this.handleCalls(calls);
  });

  this.conn.ev.on('group-participants.update', async (update) => {
   await this.handleGroupParticipantsUpdate(update);
  });

  process.on('unhandledRejection', this.handleError.bind(this));
  process.on('uncaughtException', this.handleError.bind(this));
 }

 async handleConnectionUpdate(update) {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
   this.qrCode = qr;
   console.log('New QR Code received:', qr);
  }

  if (connection === 'close') {
   const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
   console.log('Connection closed due to:', lastDisconnect?.error?.message);

   if (shouldReconnect && this.retryCount < config.MAX_RETRIES) {
    this.retryCount++;
    console.log(`Reconnecting... Attempt ${this.retryCount}`);
    await delay(this.retryCount * 1000);
    await this.connect();
   } else {
    console.log('Connection closed. Exiting...');
    process.exit(0);
   }
  } else if (connection === 'open') {
   this.isConnected = true;
   this.retryCount = 0;
   console.log('Connected successfully!');
   await this.sendInitialStatus();
  }
 }

 async handleMessages(m) {
  if (m.type !== 'notify') return;

  for (const msg of m.messages) {
   try {
    const serialized = await serialize(JSON.parse(JSON.stringify(msg)), this.conn);
    await this.store.saveMessage(msg, serialized.sender);
    if (config.AUTO_READ) {
     await this.conn.readMessages([serialized.key]);
    }
    if (config.PRESENCE_UPDATE) {
     await this.conn.sendPresenceUpdate(config.PRESENCE_UPDATE, serialized.from);
    }
    const pausedChats = await this.store.getPausedChats();
    if (pausedChats.some((chat) => chat.id === serialized.from)) {
     continue;
    }
    await this.processCommands(serialized);
    if (config.LOG_MESSAGES) {
     await this.logMessage(serialized);
    }
   } catch (error) {
    console.error('Error processing message:', error);
    await this.handleError(error);
   }
  }
 }

 async handleMessageUpdates(updates) {
  for (const update of updates) {
   if (update.type === 'delete') {
    await this.store.markMessageAsDeleted(update.key.id, Date.now());
   }
  }
 }

 async handleCalls(calls) {
  if (!config.ANTI_CALL) return;

  for (const call of calls) {
   if (call.status === 'offer') {
    const { from, id } = call;
    await this.conn.rejectCall(id, from);

    if (config.ANTI_CALL === 'block') {
     await this.conn.updateBlockStatus(from, 'block');
     await this.conn.sendMessage(from, {
      text: '_Calls are not allowed. You have been blocked._',
     });
    } else {
     await this.conn.sendMessage(from, {
      text: '_Calls are not allowed._',
     });
    }
   }
  }
 }

 async handleGroupParticipantsUpdate(update) {
  const { id, participants, action } = update;

  if (config.GROUP_WELCOME) {
   const groupMetadata = await this.conn.groupMetadata(id);
   const welcomeText = this.generateWelcomeMessage(action, participants, groupMetadata);

   if (welcomeText) {
    await this.conn.sendMessage(id, { text: welcomeText });
   }
  }
 }

 generateWelcomeMessage(action, participants, groupMetadata) {
  const messages = {
   add: `Welcome to ${groupMetadata.subject}! 👋`,
   remove: `Goodbye! 👋`,
   promote: `Congratulations on becoming an admin! 🎉`,
   demote: `Admin privileges have been removed.`,
  };

  return messages[action];
 }

 async processCommands(msg) {
  for (const command of commands) {
   const matched = this.matchCommand(command, msg);
   if (matched) {
    const handler = new Handler(this.conn, msg);
    try {
     await command.function(handler, matched.args, msg);
    } catch (error) {
     console.error(`Error executing command ${command.pattern}:`, error);
     await this.handleError(error, msg);
    }
    break;
   }
  }
 }

 matchCommand(command, msg) {
  if (!msg.body) return null;
  if (command.pattern) {
   const match = msg.body.match(command.pattern);
   if (match) {
    return { args: match[3] || '' };
   }
  }
  if (command.alias && command.alias.length > 0) {
   const aliasPattern = new RegExp(`^(${config.PREFIX})(${command.alias.join('|')})(?:\\s+(.*))?$`, 'i');
   const match = msg.body.match(aliasPattern);
   if (match) {
    return { args: match[3] || '' };
   }
  }

  return null;
 }

 async handleError(error, msg = null) {
  console.error('Error:', error);

  const errorReport = {
   message: error.message,
   stack: error.stack,
   timestamp: new Date().toISOString(),
   messageInfo: msg
    ? {
       from: msg.from,
       type: msg.type,
       command: msg.body,
      }
    : null,
  };

  if (config.ADMIN_GROUP) {
   await this.conn.sendMessage(config.ADMIN_GROUP, {
    text: '```' + JSON.stringify(errorReport, null, 2) + '```',
   });
  }
 }

 async logMessage(msg) {
  try {
   const sender = await this.store.getName(msg.sender);
   const chat = await this.store.getName(msg.from);
   const messageContent = msg.body || '[media message]';

   console.log(`[${new Date().toISOString()}] ${chat} | ${sender}: ${messageContent}`);
  } catch (error) {
   console.error('Error logging message:', error);
  }
 }

 async sendInitialStatus() {
  if (!this.conn?.user?.id) return;

  const status = {
   version: require('../package.json').version,
   prefix: config.PREFIX,
   mode: config.MODE,
   commands: commands.length,
   uptime: process.uptime(),
  };

  await this.conn.sendMessage(this.conn.user.id, {
   text: '```' + JSON.stringify(status, null, 2) + '```',
  });
 }
}

module.exports = WhatsAppBot;
