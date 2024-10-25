const { getContentType } = require('baileys');
const { parsedJid } = require('./utils');
const config = require('../config');

async function serialize(msg, conn) {
 conn.logger = { info() {}, error() {}, warn() {} };

 if (msg.key) {
  msg.id = msg.key.id || null;
  msg.isSelf = msg.key.fromMe || false;
  msg.from = msg.key.remoteJid || null;
  msg.isGroup = msg.from ? msg.from.endsWith('@g.us') : false;
  msg.sender = msg.isGroup ? msg.key.participant : msg.isSelf ? conn.user.id : msg.from;
  msg.senderJid = parsedJid(msg.sender)[0];
  msg.timestamp = msg.key.timestamp || Date.now();

  try {
   msg.sudo = config.SUDO.split(',').includes(msg.senderJid.split('@')[0]) || msg.key.fromMe;
   msg.isAdmin = msg.isGroup ? (await conn.groupMetadata(msg.from)).participants.find((p) => p.id === msg.sender)?.admin : false;
   msg.isBotAdmin = msg.isGroup ? (await conn.groupMetadata(msg.from)).participants.find((p) => p.id === conn.user.id)?.admin : false;
  } catch {
   msg.sudo = false;
   msg.isAdmin = false;
   msg.isBotAdmin = false;
  }
 }

 if (msg.message) {
  msg.type = getContentType(msg.message) || null;

  try {
   msg.mentions = [...(msg.message[msg.type]?.contextInfo?.mentionedJid || []), ...(msg.message[msg.type]?.contextInfo?.participant ? [msg.message[msg.type].contextInfo.participant] : [])];
  } catch {
   msg.mentions = [];
  }

  try {
   msg.isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(msg.type);

   if (msg.isMedia) {
    msg.media = {
     type: msg.type,
     size: msg.message[msg.type]?.fileSize,
     mime: msg.message[msg.type]?.mimetype,
     height: msg.message[msg.type]?.height,
     width: msg.message[msg.type]?.width,
     seconds: msg.message[msg.type]?.seconds,
     caption: msg.message[msg.type]?.caption,
    };
   }
  } catch {
   msg.isMedia = false;
   msg.media = null;
  }

  try {
   const quoted = msg.message[msg.type]?.contextInfo;
   if (quoted && quoted.quotedMessage) {
    msg.quoted = {
     type: quoted.type,
     stanzaId: quoted.stanzaId,
     sender: quoted.participant || quoted.remoteJid,
     message: quoted.quotedMessage,
     isSelf: false,
     text: '',
     jid: parsedJid(quoted.participant || quoted.remoteJid)[0],
    };

    if (quoted.quotedMessage['ephemeralMessage']) {
     const ephemeralMessage = quoted.quotedMessage.ephemeralMessage.message;
     const messageType = Object.keys(ephemeralMessage)[0];
     msg.quoted.type = messageType === 'viewOnceMessageV2' ? 'view_once' : 'ephemeral';
     msg.quoted.message = messageType === 'viewOnceMessageV2' ? ephemeralMessage.viewOnceMessageV2.message : ephemeralMessage;
     msg.quoted.disappearingTime = quoted.quotedMessage.ephemeralMessage.duration;
    } else if (quoted.quotedMessage['viewOnceMessageV2']) {
     msg.quoted.type = 'view_once';
     msg.quoted.message = quoted.quotedMessage.viewOnceMessageV2.message;
    } else if (quoted.quotedMessage['viewOnceMessageV2Extension']) {
     msg.quoted.type = 'view_once_audio';
     msg.quoted.message = quoted.quotedMessage.viewOnceMessageV2Extension.message;
    } else {
     msg.quoted.type = 'normal';
     msg.quoted.message = quoted.quotedMessage;
    }

    msg.quoted.isSelf = msg.quoted.sender === conn.user.id;
    msg.quoted.mtype = Object.keys(msg.quoted.message)[0];
    msg.quoted.isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(msg.quoted.mtype);

    msg.quoted.text = msg.quoted.message[msg.quoted.mtype]?.text || msg.quoted.message[msg.quoted.mtype]?.caption || msg.quoted.message[msg.quoted.mtype]?.description || (msg.quoted.mtype === 'templateButtonReplyMessage' && msg.quoted.message[msg.quoted.mtype].hydratedTemplate?.hydratedContentText) || msg.quoted.message[msg.quoted.mtype] || '';

    msg.quoted.key = {
     id: msg.quoted.stanzaId,
     fromMe: msg.quoted.isSelf,
     remoteJid: msg.from,
     participant: msg.quoted.sender,
     timestamp: quoted.timestamp || Date.now(),
    };

    if (msg.quoted.isMedia) {
     msg.quoted.media = {
      type: msg.quoted.mtype,
      size: msg.quoted.message[msg.quoted.mtype]?.fileSize,
      mime: msg.quoted.message[msg.quoted.mtype]?.mimetype,
      height: msg.quoted.message[msg.quoted.mtype]?.height,
      width: msg.quoted.message[msg.quoted.mtype]?.width,
      seconds: msg.quoted.message[msg.quoted.mtype]?.seconds,
      caption: msg.quoted.message[msg.quoted.mtype]?.caption,
     };
    }
   }
  } catch (error) {
   console.error('Error in processing quoted message:', error);
   msg.quoted = null;
  }

  try {
   msg.body = msg.message.conversation || msg.message[msg.type]?.text || msg.message[msg.type]?.caption || (msg.type === 'listResponseMessage' && msg.message[msg.type].singleSelectReply.selectedRowId) || (msg.type === 'buttonsResponseMessage' && msg.message[msg.type].selectedButtonId) || (msg.type === 'templateButtonReplyMessage' && msg.message[msg.type].selectedId) || (msg.type === 'reactionMessage' && msg.message[msg.type].text) || '';

   msg.isReaction = msg.type === 'reactionMessage';
   msg.isViewOnce = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'].includes(msg.type);
   msg.isEphemeral = msg.message?.ephemeralMessage != null;

   if (msg.isEphemeral) {
    msg.disappearingTime = msg.message.ephemeralMessage.duration;
   }
  } catch (error) {
   console.error('Error in extracting message body:', error);
   msg.body = '';
  }

  conn.client = msg;
 }
 return msg;
}

module.exports = { serialize };
