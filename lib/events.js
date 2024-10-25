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
    this._setupAuth(data);
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
      prefix: config.PREFIX
    });

    if (data.message) this._processMessageContent(data);
  }

  async _setupAuth(data) {
    const uid = this.participant?.split('@')[0];
    const sudoList = config.SUDO.split(',');
    
    let isSudo = sudoList.includes(uid);
    let isBanned = false;

    if (uid) {
      try {
        const [sudoCheck, banCheck] = await Promise.all([
          SudoDB.sequelize.query('SELECT 1 FROM sudos WHERE userId = ? LIMIT 1', {
            replacements: [uid],
            type: Sequelize.QueryTypes.SELECT
          }),
          getBan(this.participant)
        ]);
        
        isSudo = isSudo || sudoCheck.length > 0;
        isBanned = !!banCheck;
      } catch {}
    }

    this.sudo = isSudo;
    this.isban = isBanned;
    this.owner = this.fromMe || isSudo;
    
    const mode = config.MODE.toLowerCase();
    this.mode = mode === 'private' ? this.owner : mode === 'public';
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
    const msg = quoted.message;
    const mediaTypes = {
      imageMessage: 'image',
      videoMessage: 'video',
      audioMessage: 'audio',
      documentMessage: 'document',
      stickerMessage: 'sticker'
    };

    const mType = Object.keys(mediaTypes).find(k => msg[k]) || 'text';
    this.reply_message = {
      data: msg,
      quoted,
      key: quoted.key,
      sender: quoted.key.participant,
      contextInfo: msg?.extendedTextMessage?.contextInfo || msg?.contextInfo || {},
      caption: msg?.imageMessage?.caption || msg?.videoMessage?.caption || msg?.documentMessage?.caption,
      mediaType: mType,
      viewonce: quoted.type === 'view_once',
      text: msg?.conversation || msg?.extendedTextMessage?.text || '',
      bot: quoted.key.id.includes('BAE5'),
      isText: !!(msg?.conversation || msg?.extendedTextMessage?.text),
      image: mType === 'image' || !!msg?.imageMessage,
      video: mType === 'video' || !!msg?.videoMessage,
      audio: mType === 'audio' || !!msg?.audioMessage,
      document: mType === 'document' || !!msg?.documentMessage,
      sticker: mType === 'sticker' || !!msg?.stickerMessage
    };
  }

  async reply(text, opts = {}) {
    const msg = await this.client.sendMessage(
      this.jid,
      { text: String(text), mentions: opts.mentions },
      { quoted: this.data, ...opts }
    );
    return new Handler(this.client, msg);
  }

  async react(emoji) {
    return this.client.sendMessage(this.jid, { react: { text: emoji, key: this.key } });
  }

  async edit(text, opt = {}) {
    return this.client.sendMessage(this.jid, { text, edit: this.key }, opt);
  }

  async sendInteractive(content) {
    const { jid, button, header, footer, body } = content;
    
    const btnMap = {
      copy: 'cta_copy',
      url: 'cta_url',
      location: 'send_location',
      address: 'address_message',
      call: 'cta_call',
      list: 'single_select'
    };

    const btns = button.map(b => ({
      buttonParamsJson: JSON.stringify(b.params),
      name: btnMap[b.type] || 'quick_reply'
    }));

    const msg = {
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
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons: btns })
          })
        }
      }
    };

    const generated = generateWAMessageFromContent(jid, msg, {});
    await this.client.relayMessage(this.jid, generated.message, { messageId: generated.key.id });
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
    const exts = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'video/mp4': 'mp4',
      'audio/ogg; codecs=opus': 'ogg',
      'application/pdf': 'pdf',
      'image/webp': 'webp'
    };

    const ext = exts[mimeType] || 'bin';
    const fname = `${mediaType}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const fpath = path.join(this.outputDir, fname);

    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.writeFile(fpath, buffer);

    return { buffer, filePath: fpath };
  }
}

module.exports = Handler;