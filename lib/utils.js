const fs = require('fs');
const Crypto = require('crypto');
const axios = require('axios');
const webp = require('node-webpmux');
const path = require('path');
const os = require('os');
const fileType = require('file-type');
const { tmpdir } = require('os');
const { createCanvas, loadImage } = require('canvas');
const { fromBuffer } = require('file-type');
const { Buffer } = require('buffer');
const { Readable, PassThrough } = require('stream');
const ffmpeg = require('fluent-ffmpeg');
const { jidDecode } = require('baileys');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

const toAudio = (inputBuffer) => {
 return new Promise((resolve, reject) => {
  const stream = new Readable();
  stream.push(inputBuffer);
  stream.push(null);
  const chunks = [];
  ffmpeg(stream)
   .toFormat('mp3')
   .on('error', (err) => reject(err))
   .on('end', () => {
    resolve(Buffer.concat(chunks));
   })
   .pipe()
   .on('data', (chunk) => chunks.push(chunk));
 });
};

async function getBuffer(url, options = {}) {
 try {
  const res = await axios({
   method: 'get',
   url,
   headers: {
    DNT: 1,
    'Upgrade-Insecure-Request': 1,
   },
   ...options,
   responseType: 'arraybuffer',
  });
  return res.data;
 } catch (error) {
  throw new Error(`Error: ${error.message}`);
 }
}

async function FiletypeFromUrl(url) {
 const buffer = await getBuffer(url);
 const out = await fromBuffer(buffer);
 let type;
 if (out) {
  type = out.mime.split('/')[0];
 }
 return { type, buffer };
}
function UrlFromMsg(message) {
 const urlRegex = /(https?:\/\/[^\s]+)/gi;
 const match = urlRegex.exec(message);
 return match ? match[0] : null;
}

async function getJson(url, options) {
 try {
  options ? options : {};
  const res = await axios({
   method: 'GET',
   url: url,
   headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
   },
   ...options,
  });
  return res.data;
 } catch (err) {
  return err;
 }
}
async function imageToWebp(media) {
 const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`);

 fs.writeFileSync(tmpFileIn, media);

 await new Promise((resolve, reject) => {
  ffmpeg(tmpFileIn)
   .on('error', reject)
   .on('end', () => resolve(true))
   .addOutputOptions(['-vcodec', 'libwebp', '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"])
   .toFormat('webp')
   .save(tmpFileOut);
 });

 const buff = fs.readFileSync(tmpFileOut);
 fs.unlinkSync(tmpFileOut);
 fs.unlinkSync(tmpFileIn);
 return buff;
}

async function videoToWebp(media) {
 const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`);

 fs.writeFileSync(tmpFileIn, media);

 await new Promise((resolve, reject) => {
  ffmpeg(tmpFileIn)
   .on('error', reject)
   .on('end', () => resolve(true))
   .addOutputOptions(['-vcodec', 'libwebp', '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse", '-loop', '0', '-ss', '00:00:00', '-t', '00:00:05', '-preset', 'default', '-an', '-vsync', '0'])
   .toFormat('webp')
   .save(tmpFileOut);
 });

 const buff = fs.readFileSync(tmpFileOut);
 fs.unlinkSync(tmpFileOut);
 fs.unlinkSync(tmpFileIn);
 return buff;
}

async function writeExifImg(media, metadata) {
 let wMedia = await imageToWebp(media);
 const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 fs.writeFileSync(tmpFileIn, wMedia);

 if (metadata.packname || metadata.author) {
  const img = new webp.Image();
  const json = {
   'sticker-pack-id': `https://github.com/AstroX10/xstro-bot`,
   'sticker-pack-name': metadata.packname,
   'sticker-pack-publisher': metadata.author,
   emojis: metadata.categories ? metadata.categories : [''],
  };
  const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);
  await img.load(tmpFileIn);
  fs.unlinkSync(tmpFileIn);
  img.exif = exif;
  await img.save(tmpFileOut);
  return tmpFileOut;
 }
}

async function writeExifVid(media, metadata) {
 let wMedia = await videoToWebp(media);
 const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 fs.writeFileSync(tmpFileIn, wMedia);

 if (metadata.packname || metadata.author) {
  const img = new webp.Image();
  const json = {
   'sticker-pack-id': `https://github.com/AstroX10/xstro-bot`,
   'sticker-pack-name': metadata.packname,
   'sticker-pack-publisher': metadata.author,
   emojis: metadata.categories ? metadata.categories : [''],
  };
  const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);
  await img.load(tmpFileIn);
  fs.unlinkSync(tmpFileIn);
  img.exif = exif;
  await img.save(tmpFileOut);
  return tmpFileOut;
 }
}

async function writeExifWebp(media, metadata) {
 const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 fs.writeFileSync(tmpFileIn, media);

 if (metadata.packname || metadata.author) {
  const img = new webp.Image();
  const json = {
   'sticker-pack-id': `https://github.com/AstroX10/xstro-bot`,
   'sticker-pack-name': metadata.packname,
   'sticker-pack-publisher': metadata.author,
   emojis: metadata.categories ? metadata.categories : [''],
  };
  const exifAttr = await Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const jsonBuff = await Buffer.from(JSON.stringify(json), 'utf-8');
  const exif = await Buffer.concat([exifAttr, jsonBuff]);
  await exif.writeUIntLE(jsonBuff.length, 14, 4);
  await img.load(tmpFileIn);
  fs.unlinkSync(tmpFileIn);
  img.exif = exif;
  await img.save(tmpFileOut);
  return tmpFileOut;
 }
}
const runtime = function (seconds) {
 seconds = Number(seconds);
 var d = Math.floor(seconds / (3600 * 24));
 var h = Math.floor((seconds % (3600 * 24)) / 3600);
 var m = Math.floor((seconds % 3600) / 60);
 var s = Math.floor(seconds % 60);
 var dDisplay = d > 0 ? d + (d == 1 ? ' d ' : ' d ') : '';
 var hDisplay = h > 0 ? h + (h == 1 ? ' h ' : ' h ') : '';
 var mDisplay = m > 0 ? m + (m == 1 ? ' m ' : ' m ') : '';
 var sDisplay = s > 0 ? s + (s == 1 ? ' s' : ' s') : '';
 return dDisplay + hDisplay + mDisplay + sDisplay;
};
function decodeJid(jid) {
 if (!jid) return jid;
 if (/:\d+@/gi.test(jid)) {
  const decode = jidDecode(jid) || {};
  return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
 } else return jid;
}
const adminCache = new Map();

async function isAdmin(groupJid, userJid, client) {
 const cacheKey = `${groupJid}-${userJid}`;
 if (adminCache.has(cacheKey)) return adminCache.get(cacheKey);

 const metadata = await client.groupMetadata(groupJid);
 const participant = metadata.participants.find((p) => p.id === userJid);
 const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
 adminCache.set(cacheKey, isAdmin);
 setTimeout(() => adminCache.delete(cacheKey), 300000);
 return isAdmin;
}

async function addTextToTweet(inputText, imagePathOrBuffer) {
 const canvas = createCanvas(825, 462);
 const ctx = canvas.getContext('2d');

 const image = typeof imagePathOrBuffer === 'string' ? await loadImage(imagePathOrBuffer) : await loadImage(imagePathOrBuffer);
 ctx.drawImage(image, 0, 0);

 ctx.font = '20px Sans-Serif';
 ctx.fillStyle = 'black';
 ctx.textAlign = 'left';
 ctx.textBaseline = 'top';

 const lineHeight = 30;
 const maxWidth = 780;
 const textX = 20;
 const textY = 140;

 function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';

  for (let n = 0; n < words.length; n++) {
   const testLine = line + words[n] + ' ';
   const metrics = context.measureText(testLine);
   const testWidth = metrics.width;
   if (testWidth > maxWidth && n > 0) {
    context.fillText(line, x, y);
    line = words[n] + ' ';
    y += lineHeight;
   } else {
    line = testLine;
   }
  }
  context.fillText(line, x, y);
 }

 wrapText(ctx, inputText, textX, textY, maxWidth, lineHeight);

 const buffer = canvas.toBuffer('image/png');
 const outputPath = path.join(__dirname, '..', 'temp', `${Date.now()}.png`);
 await fs.promises.writeFile(outputPath, buffer);

 return { buffer, outputPath };
}

async function flipMedia(inputBuffer, direction) {
 return new Promise(async (resolve, reject) => {
  const validDirections = ['left', 'right', 'vertical', 'horizontal'];
  if (!validDirections.includes(direction.toLowerCase())) {
   return reject(new Error('Invalid direction. Use: left, right, vertical, or horizontal'));
  }

  const type = await fileType.fromBuffer(inputBuffer);
  if (!type || !['image', 'video'].includes(type.mime.split('/')[0])) {
   return reject(new Error('Invalid input: must be an image or video file.'));
  }

  const inputPath = path.join(os.tmpdir(), `input-${Date.now()}.${type.ext}`);
  const outputPath = path.join(os.tmpdir(), `output-${Date.now()}.${type.ext}`);

  fs.writeFileSync(inputPath, inputBuffer);

  let command = ffmpeg(inputPath);
  switch (direction.toLowerCase()) {
   case 'left':
    command = command.videoFilters(type.mime.startsWith('video') ? 'transpose=2' : 'transpose=2');
    break;
   case 'right':
    command = command.videoFilters(type.mime.startsWith('video') ? 'transpose=1' : 'transpose=1');
    break;
   case 'vertical':
    command = command.videoFilters(type.mime.startsWith('video') ? 'vflip' : 'vflip');
    break;
   case 'horizontal':
    command = command.videoFilters(type.mime.startsWith('video') ? 'hflip' : 'hflip');
    break;
  }

  command
   .on('error', (err) => {
    fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    reject(new Error(`FFmpeg error: ${err.message}`));
   })
   .on('end', () => {
    const outputBuffer = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    resolve(outputBuffer);
   })
   .save(outputPath);
 });
}

async function audioToBlackVideo(audioBuffer) {
 const tempDir = os.tmpdir();
 const inputPath = path.join(tempDir, `input-${Date.now()}.mp3`);
 const outputPath = path.join(tempDir, `output-${Date.now()}.mp4`);

 fs.writeFileSync(inputPath, audioBuffer);

 return new Promise((resolve, reject) => {
  ffmpeg()
   .input(inputPath)
   .inputFormat('lavfi')
   .input('color=c=black:s=1280x720:r=30')
   .outputOptions(['-shortest', '-pix_fmt', 'yuv420p'])
   .audioCodec('aac')
   .videoCodec('libx264')
   .on('error', (err) => {
    fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    reject(new Error(`FFmpeg error: ${err.message}`));
   })
   .on('end', () => {
    const outputBuffer = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    resolve(outputBuffer);
   })
   .save(outputPath);
 });
}

module.exports = {
 toAudio,
 FiletypeFromUrl,
 getBuffer,
 UrlFromMsg,
 parseJid(text = '') {
  return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net');
 },
 parsedJid(text = '') {
  return [...text.matchAll(/([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net');
 },
 getJson,
 isUrl: (isUrl = (url) => {
  return new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi').test(url);
 }),
 getUrl: (getUrl = (url) => {
  return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
 }),
 imageToWebp,
 videoToWebp,
 writeExifImg,
 writeExifVid,
 writeExifWebp,
 runtime,
 decodeJid,
 isAdmin,
 addTextToTweet,
 flipMedia,
 audioToBlackVideo,
};
fs.mkdirSync(path.join(__dirname, '..', 'temp'), { recursive: true });
