const { tiny } = require('xstro');
const path = require('path');
const { handler, addTextToTweet } = require('../lib');

handler(
 {
  pattern: 'elon',
  desc: 'Create Fake Elonmusk tweet',
 },
 async (message, match) => {
  if (!match) return message.reply('_provide text_');
  const buff = await addTextToTweet(match, path.join(__dirname, '..', 'media', 'image', 'elonmusk.png'));
  const { buffer } = buff;
  return await message.send(buffer, { caption: tiny('created by xstro') });
 }
);
