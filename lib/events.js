const { downloadContentFromMessage, proto, generateWAMessageFromContent } = require('baileys');
const { getBuffer, imageToWebp, writeExifVid, videoToWebp, writeExifImg, toAudio, decodeJid } = require('./utils');
const fs = require('fs/promises');
const config = require('../config');
const crypto = require('crypto');
const path = require('path');
const FileType = require('file-type');
const { SudoDB, getBan } = require('./sql');
const { Sequelize } = require('sequelize');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

class Handler {
  constructor(client, data) {
    this.client = client;
    this.outputDir = path.join(__dirname, '..', 'temp');
    this._patch(data);
    this.ready = this._asyncPatch(data);
  }

  _patch(data) {
    Object.assign(this, {
      data,
      key: data.key,
      id: data.key.id,
      jid: data.key.remoteJid,
      fromMe: data.key.fromMe,
      participant: decodeJid(data.sender),
      sender: data.pushName,
      bot: data.key.id.startsWith('BAE5'),
      user: decodeJid(this.client.user.id),
      isGroup: data.isGroup,
      timestamp: data.messageTimestamp?.low || data.messageTimestamp || Date.now(),
      text: data.body || '',
      prefix: config.PREFIX,
      sudo: false,
      owner: false
    });

    try {
      this.sudo = config.SUDO.split(',').includes(this.participant.split('@')[0]);
    } catch {}

    this.owner = this.fromMe || this.sudo;
    if (data.message) this._processMessageContent(data);
  }

  async _asyncPatch() {
    if (this.participant) {
      const [dbSudo, dbBan] = await Promise.all([
        Handler.isSudo(this.participant),
        this.isBan(this.participant)
      ]);
      this.sudo ||= dbSudo;
      this.isban = dbBan;
    }
    this.owner = this.fromMe || this.sudo;
    this.mode = await this.getMode(this.owner, this.participant);
  }

  _processMessageContent(data) {
    const typeKey = Object.keys(data.message)[0];
    this.type = typeKey.replace('Message', '').toLowerCase();
    this.message = data.message[typeKey];
    this.body = data.body || '';
    this.mention = this.message?.contextInfo?.mentionedJid || [];

    const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker'];
    this.mediaType = mediaTypes.includes(this.type) ? this.type : 'text';
    this.mediaUrl = this.message?.url;
    this.fileSize = this.message?.fileLength;
    this.caption = this.message?.caption;
    this.mimetype = this.message?.mimetype;

    if (data.quoted) this._processQuotedMessage(data.quoted);
  }

  _processQuotedMessage(quoted) {
    const message = quoted.message;
    const mediaTypes = {
      imageMessage: 'image',
      videoMessage: 'video',
      audioMessage: 'audio',
      documentMessage: 'document',
      stickerMessage: 'sticker'
    };

    const mediaType = Object.keys(mediaTypes).find(key => message[key]) || 'text';
    this.reply_message = {
      data: message,
      quoted,
      key: quoted.key,
      sender: quoted.key.participant,
      contextInfo: message?.extendedTextMessage?.contextInfo || message?.contextInfo || {},
      caption: message?.imageMessage?.caption || message?.videoMessage?.caption || message?.documentMessage?.caption,
      mediaType,
      viewonce: quoted.type === 'view_once',
      text: message?.conversation || message?.extendedTextMessage?.text || '',
      bot: quoted.key.id.includes('BAE5'),
      isText: !!(message?.conversation || message?.extendedTextMessage?.text),
      image: mediaType === 'image' || !!message?.imageMessage,
      video: mediaType === 'video' || !!message?.videoMessage,
      audio: mediaType === 'audio' || !!message?.audioMessage,
      document: mediaType === 'document' || !!message?.documentMessage,
      sticker: mediaType === 'sticker' || !!message?.stickerMessage
    };
  }

  static session = path.join(__dirname, 'session');

  async reply(text, options = {}) {
    const message = await this.client.sendMessage(
      this.jid,
      { text: String(text), mentions: options.mentions },
      { quoted: this.data, ...options }
    );
    return new Handler(this.client, message);
  }

  async react(emoji) {
    return this.client.sendMessage(this.jid, { react: { text: emoji, key: this.key } });
  }

  async edit(text, opt = {}) {
    return this.client.sendMessage(this.jid, { text, edit: this.key }, opt);
  }

  async getMode(owner, user) {
    const mode = config.MODE.toLowerCase();
    return mode === 'private' ? owner : mode === 'public' ? (owner || user) : false;
  }

  static async isSudo(userId) {
    if (!userId) return false;
    try {
      const [result] = await SudoDB.sequelize.query(
        'SELECT 1 FROM sudos WHERE userId = :userId LIMIT 1',
        {
          replacements: { userId: userId.split('@')[0] },
          type: Sequelize.QueryTypes.SELECT
        }
      );
      return !!result;
    } catch {
      return false;
    }
  }

  async isBan(userId) {
    return !!(await getBan(userId));
  }

  static createInteractiveMessage(data, options = {}) {
    const { jid, button, header, footer, body } = data;
    const buttons = button.map(btn => ({
      buttonParamsJson: JSON.stringify(btn.params),
      name: {
        copy: 'cta_copy',
        url: 'cta_url',
        location: 'send_location',
        address: 'address_message',
        call: 'cta_call',
        list: 'single_select'
      }[btn.type] || 'quick_reply'
    }));

    const mess = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: proto.Message.InteractiveMessage.create({
            body: proto.Message.InteractiveMessage.Body.create(body),
            footer: proto.Message.InteractiveMessage.Footer.create(footer),
            header: proto.Message.InteractiveMessage.Header.create(header),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
              buttons
            })
          })
        }
      }
    };

    return generateWAMessageFromContent(jid, mess, options);
  }

  async sendInteractive(content) {
    const msg = Handler.createInteractiveMessage(content);
    await this.client.relayMessage(this.jid, msg.message, { messageId: msg.key.id });
  }

  async send(content, options = {}) {
    const jid = options.jid || this.jid;
    const quoted = options.quoted || this.data;

    const getBuffer = async content => {
      if (Buffer.isBuffer(content)) return content;
      if (typeof content === 'string' && content.startsWith('http')) {
        return await getBuffer(content);
      }
      return Buffer.from(content);
    };

    const processContent = async () => {
      if (typeof content === 'string' && !content.startsWith('http')) {
        return { buffer: content, mimeType: 'text/plain' };
      }
      const buffer = await getBuffer(content);
      const mimeType = await FileType.fromBuffer(buffer) || { mime: 'application/octet-stream' };
      return { buffer, mimeType: mimeType.mime };
    };

    try {
      const { buffer, mimeType } = await processContent();
      const contentType = options.type || mimeType.split('/')[0];
      const sendOptions = { ...options, quoted };

      const handlers = {
        text: () => this.client.sendMessage(jid, { text: buffer.toString(), ...sendOptions }),
        image: () => options.asSticker ? 
          this.sendSticker(buffer, sendOptions) : 
          this.client.sendMessage(jid, { image: buffer, ...sendOptions }),
        video: async () => {
          if (options.asSticker) return this.sendSticker(buffer, sendOptions);
          if (options.asAudio) {
            const audioBuffer = await toAudio(buffer);
            return this.client.sendMessage(jid, { audio: audioBuffer, mimetype: 'audio/mp4', ...sendOptions });
          }
          return this.client.sendMessage(jid, { video: buffer, ...sendOptions });
        },
        audio: () => this.client.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4', ...sendOptions }),
        document: () => this.client.sendMessage(jid, {
          document: buffer,
          mimetype: options.mimetype || mimeType,
          fileName: options.filename || 'file',
          ...sendOptions
        }),
        sticker: () => this.sendSticker(buffer, sendOptions)
      };

      return (handlers[contentType] || handlers.document)();
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Invalid Media: ' + error.message);
    }
  }

  async sendSticker(buffer, options) {
    const fileType = await FileType.fromBuffer(buffer);
    const isWebp = fileType?.mime === 'image/webp';
    let stickerBuffer;

    if (isWebp) {
      stickerBuffer = await writeExifImg(buffer, options);
    } else if (fileType?.mime.startsWith('video/')) {
      stickerBuffer = await videoToWebp(buffer);
      stickerBuffer = await writeExifVid(stickerBuffer, options);
    } else {
      stickerBuffer = await imageToWebp(buffer);
      stickerBuffer = await writeExifImg(stickerBuffer, options);
    }

    if (typeof stickerBuffer === 'string') {
      stickerBuffer = await fs.readFile(stickerBuffer);
    }

    return this.client.sendMessage(this.jid, { sticker: stickerBuffer, ...options });
  }

  async download(message) {
    const mimeMap = {
      imageMessage: 'image',
      videoMessage: 'video',
      stickerMessage: 'sticker',
      documentMessage: 'document',
      audioMessage: 'audio'
    };

    const type = Object.keys(mimeMap).find(key => message[key]);
    if (!type) return null;

    const mediaType = mimeMap[type];
    const stream = await downloadContentFromMessage(message[type], mediaType);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const mimeType = message[type].mimetype;
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'video/mp4': 'mp4',
      'audio/ogg; codecs=opus': 'ogg',
      'application/pdf': 'pdf',
      'image/webp': 'webp'
    };

    const fileExtension = extensions[mimeType] || 'bin';
    const fileName = `${mediaType}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${fileExtension}`;
    const filePath = path.join(this.outputDir, fileName);

    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    return { buffer, filePath };
  }
}

module.exports = Handler;