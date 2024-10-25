const { enhanceImage } = require('xstro');
const { handler, getJson } = require('../lib');

handler(
 {
  pattern: 'upscale',
  alias: 'enhance',
  desc: 'enchnace image quality',
  type: 'ai',
 },
 async (message) => {
  if (!message.mode) return;
  if (message.isban) return await message.reply(ban);
  if (!message.reply_message?.image) return message.reply('_Reply An Image_');
  const req = await message.download(message.reply_message.data);
  const res = await enhanceImage(req.buffer, 'enhance');
  return await message.send(res);
 }
);

handler(
 {
  pattern: 'recolor',
  desc: 'Recolors Dead Images',
  type: 'ai',
 },
 async (message) => {
  if (!message.mode) return;
  if (message.isban) return await message.reply(ban);
  if (!message.reply_message?.image) return message.reply('_Reply An Image_');
  const req = await message.download(message.reply_message.data);
  const res = await enhanceImage(req.buffer, 'recolor');
  return await message.send(res);
 }
);

handler(
 {
  pattern: 'dehaze',
  desc: 'Add dehaze effect to an image',
  type: 'ai',
 },
 async (message) => {
  if (!message.mode) return;
  if (message.isban) return await message.reply(ban);
  if (!message.reply_message?.image) return message.reply('_Reply An Image_');
  const req = await message.download(message.reply_message.data);
  const res = await enhanceImage(req.buffer, 'dehaze');
  return await message.send(res);
 }
);

handler(
 {
  pattern: 'gemini',
  desc: 'Chat with Google Gemini Ai',
 },
 async (message, match) => {
  const { sender, prefix } = message;
  if (!match) return message.reply('_Hi ' + sender + '_\n\n_' + prefix + 'Gemini What is life_');
  const msg = await message.reply('_Thinking 🤔_');
  const res = await getJson(`https://api.giftedtech.my.id/api/ai/geminiai?apikey=astro_fx-k56DdhdS7@gifted_api&q=${encodeURIComponent(match)}`);
  return await msg.edit(res.result);
 }
);
