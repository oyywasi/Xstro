const pino = require('pino');
const path = require('path');
const config = require('../config');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore, DisconnectReason } = require('baileys');
const { loadMessage, saveMessage, saveChat, getName, getPausedChats } = require('./sql');
const { serialize, commands } = require('./serialize');
const Handler = require('./events');

class Client {
 constructor() {
  this.logger = pino({ level: 'silent' });
  this.conn = null;
 }

 async connect() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'));

  this.conn = makeWASocket({
   auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, this.logger),
   },
   logger: this.logger,
   browser: Browsers.macOS('Desktop'),
   downloadHistory: false,
   syncFullHistory: true,
   markOnlineOnConnect: false,
   emitOwnEvents: false,
   version: [2, 3000, 1017531287],
   getMessage: async (key) => (loadMessage(key.id) || {}).message || { conversation: null },
   defaultQueryTimeoutMs: undefined,
   generateHighQualityLinkPreview: true,
  });

  this.conn.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
  this.conn.ev.on('creds.update', saveCreds);
  this.conn.ev.on('chats.update', async (chats) => chats.forEach(async (chat) => await saveChat(chat)));
  this.conn.ev.on('messages.upsert', this.handleMessages.bind(this));
  this.conn.ev.on('call', this.handleCalls.bind(this));
  process.on('unhandledRejection', (err) => this.handleErrors(err));
  process.on('uncaughtException', (err) => this.handleErrors(err));

  return this.conn;
 }

 async handleConnectionUpdate(reason) {
  const { connection, lastDisconnect } = reason;
  if (connection === 'connecting') console.log('Connecting...');
  else if (connection === 'open') {
   console.log('Bot Connected');
   const { version } = require('../package.json');
   const str = `\`\`\`xstro ${version}\nprefix: ${config.PREFIX}\ncommands: ${commands.length}\nmode: ${config.MODE}\`\`\``;
   await this.conn.sendMessage(this.conn.user.id, { text: str });
  } else if (connection === 'close') {
   if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) this.connect();
   else {
    console.log('Connection closed. Device logged out.');
    await delay(10000);
    process.exit(0);
   }
  }
 }

 async handleMessages(m) {
  if (m.type !== 'notify') return;

  for (const msg of m.messages) {
   const serialized = await serialize(JSON.parse(JSON.stringify(msg)), this.conn);
   await saveMessage(msg, serialized.sender);
   if (config.AUTO_READ_MESSAGE) await this.conn.readMessages([serialized.key]);
   if (config.AUTO_STATUS_READ && serialized.from === 'status@broadcast') await this.conn.readMessages([serialized.key]);
   if (config.PRESENCE_UPDATE) {
    const presenceState = config.PRESENCE_UPDATE;
    await this.conn.sendPresenceUpdate(presenceState, serialized.from);
   }

   if (serialized.body?.startsWith(config.PREFIX)) {
    const instance = new Handler(this.conn, serialized);
    if (instance.ready) {
     await instance.ready;
    }
    if (!instance.mode || (instance.mode && !instance.owner)) return;
    if (instance.isban) {
     const userMention = `@${instance.participant.split('@')[0]}`;
     await this.conn.sendMessage(serialized.from, {
      text: `*_${userMention} you have been banned from using commands._*`,
      mentions: [instance.participant],
     });
     return;
    }
    const userInput = serialized.body.slice(config.PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
    let commandFound = false;

    for (const command of commands) {
     if (command.on) {
      const handlers = {
       text: () => serialized.body && execute(Handler, [serialized.body]),
      };
      const result = handlers[command.on]?.();
      if (result instanceof Promise) await result;
     }

     let matched = false;
     let commandPatterns = [];
     if (command.pattern) {
      const patternStr = command.pattern.toString();
      const match = patternStr.match(/\((.*?)\)/);
      if (match) {
       commandPatterns.push(...match[1].split('|'));
      }
     }
     if (command.alias && command.alias.length > 0) commandPatterns.push(...command.alias);
     if (serialized.body && command.pattern) matched = serialized.body.match(command.pattern);
     if (!matched && command.alias?.length > 0) {
      const aliasPattern = new RegExp(`^${config.PREFIX}\\s*(${command.alias.join('|')})(?:\\s+(.*))?`, 'i');
      matched = serialized.body.match(aliasPattern);
     }
     if (matched) {
      commandFound = true;
      serialized.prefix = matched[1];
      serialized.command = matched[1] + (matched[2] || '');
      const result = execute(Handler, [matched[3] || false]);
      if (result instanceof Promise) await result;
      break;
     }
     if (!commandFound) {
      const similarCommands = commandPatterns.filter((pattern) => {
       const patternClean = pattern.replace(/[^a-z0-9]/gi, '').toLowerCase();
       return patternClean.includes(userInput) || userInput.includes(patternClean);
      });

      if (similarCommands.length > 0) {
       const userMention = `@${serialized.sender.split('@')[0]}`;
       const suggestion = similarCommands[0];
       await this.conn.sendMessage(serialized.from, {
        text: `${userMention} did you mean *${suggestion}*?`,
        mentions: [serialized.sender],
       });
       break;
      }
     }
    }
   }
  }
 }

 async handleCalls(call) {
  const { from, id: callId, status } = call[0];

  if (config.ANTI_CALL && status === 'offer') {
   if (config.ANTI_CALL === 'true') {
    await this.conn.rejectCall(callId, from);
    await this.conn.sendMessage(from, { text: '_Calls not allowed._' });
   } else if (config.ANTI_CALL === 'block') {
    await this.conn.rejectCall(callId, from);
    await this.conn.sendMessage(from, { text: '_Calls are not allowed, You have been blocked._' });
    return await this.conn.updateBlockStatus(from, 'block');
   }
  }
 }

 async handleErrors(err, msg = {}) {
  const { message, stack } = err;
  const fileName = stack?.split('\n')[1]?.trim();
  const errorText = `─━❲ ERROR REPORT ❳━─\nMessage: ${message}\nFrom: ${fileName}`;
  await this.conn.sendMessage(this.conn.user.id, { text: '```' + errorText + '```' });
 }

 async logMessage(msg) {
  try {
   const name = await getName(msg.sender);
   const isGroup = msg.from.endsWith('@g.us');
   const groupName = isGroup ? (await this.conn.groupMetadata(msg.from)).subject : null;
   const messageType = Object.keys(msg.message || {})[0];
   const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.[messageType]?.text || messageType;
   console.log(isGroup ? `${groupName}\n${name}: ${text}` : `${name}: ${text}`);
  } catch {}
 }
}

module.exports = Client;
