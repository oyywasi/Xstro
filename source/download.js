const { twitter, isUrl } = require('xstro');
const { command, getJson } = require('../lib');

command(
 {
  pattern: 'twitter ?(.*)',
  desc: 'downloads x videos',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (message.isban) return await message.reply(ban);
  if (!match || !match.includes('x.com')) return message.reply('_Not Vaild Twitter URl!_');
  await message.reply('_Downloading_');
  const res = await twitter(match);
  return await message.send(res);
 }
);

command(
 {
  pattern: 'drive',
  desc: 'downloads documents from Google Drive URl',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (message.isban) return await message.reply(ban);
  if (!match || !match.includes('drive.google.com')) return message.reply('_Not Vaild Google Drive Url!_');
  if (!isUrl(match)) return message.reply('_Inavild Url!_');
  await message.reply('_Downloading file_');
  const res = await getJson(`https://api.giftedtech.my.id/api/download/gdrivedl?apikey=gifted&url=${match}`);
  return await message.send(res.result.download);
 }
);

command(
 {
  pattern: 'tiktok',
  desc: 'downloads tiktok vidoes',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (message.isban) return await message.reply(ban);
  if (!match || !match.includes('tiktok.com')) return message.reply('_Provide Vaild Tiktok URl_');
  if (!isUrl(match)) return message.reply('_Invaild Url!_');
  await message.reply('_Downloading!_');
  const res = await getJson(`https://api.giftedtech.my.id/api/download/tiktokdlv1?apikey=gifted&url=${encodeURIComponent(match)}`);
  const { title, created_at, video } = res.result;
  return await message.send(video.noWatermark, { caption: `${title}\n${created_at}` });
 }
);

command(
 {
  pattern: 'spotify',
  desc: 'downloads spotify music',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (message.isban) return await message.reply(ban);
  if (!match || !match.includes('open.spotify.com')) return message.reply('_Not Vaild Spotify Url!_');
  if (!isUrl(match)) return message.reply('_Invaild Url_');
  const msg = await message.reply('_Downloading_');
  const res = await getJson(`https://api.giftedtech.my.id/api/download/spotifydl?apikey=gifted&url=${match}`);
  await msg.edit('_Downloading ' + res.result.data.title + '_');
  return await message.send(res.result.data.preview);
 }
);

command(
 {
  pattern: 'ytmp4',
  desc: 'download youtube video mp4',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (message.isban) return await message.reply(ban);
  if (!isUrl(match)) return message.reply('_Inavild Url!_');
  await message.reply('_Downloading!_');
  const res = await getJson(`https://api.giftedtech.my.id/api/download/ytmp4?apikey=gifted&url=${match}`);
  return await message.send(res.result.download_url, { caption: res.result.title });
 }
);

command(
 {
  pattern: 'ytmp3',
  desc: 'download youtube videos mp3',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (message.isban) return await message.reply(ban);
  if (!isUrl(match)) return message.reply('_Inavild Url!_');
  await message.reply('_Downloading!_');
  const res = await getJson(`https://api.giftedtech.my.id/api/download/mp3?apikey=gifted&url=${match}`);
  return await message.send(res.result.download['.m4a'].download_url, { type: 'audio' });
 }
);
