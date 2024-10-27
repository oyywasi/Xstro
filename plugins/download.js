const { twitter, isUrl } = require('xstro');
const { handler, getJson } = require('../lib');

handler(
 {
  pattern: 'twitter ?(.*)',
  desc: 'downloads x videos',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (!match || !match.includes('x.com')) return message.reply('_Not Vaild Twitter URl!_');
  await message.reply('_Downloading_');
  const res = await twitter(match);
  return await message.send(res);
 }
);

handler(
 {
  pattern: 'drive',
  desc: 'downloads documents from Google Drive URl',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (!match || !match.includes('drive.google.com')) return message.reply('_Not Vaild Google Drive Url!_');
  if (!isUrl(match)) return message.reply('_Inavild Url!_');
  await message.reply('_Downloading file_');
  const res = await getJson(`https://api.giftedtech.my.id/api/download/gdrivedl?apikey=astro_fx-k56DdhdS7@gifted_api&url=${match}`);
  return await message.send(res.result.download);
 }
);

handler(
 {
  pattern: 'tiktok',
  desc: 'downloads tiktok vidoes',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (!match || !match.includes('tiktok.com')) return message.reply('_Provide Vaild Tiktok URl_');
  if (!isUrl(match)) return message.reply('_Invaild Url!_');
  await message.reply('_Downloading!_');
  const res = await getJson(`https://api.giftedtech.my.id/api/download/tiktokdlv1?apikey=astro_fx-k56DdhdS7@gifted_api&url=${encodeURIComponent(match)}`);
  const { title, created_at, video } = res.result;
  return await message.send(video.noWatermark, { caption: `${title}\n${created_at}` });
 }
);

handler(
 {
  pattern: 'spotify',
  desc: 'downloads spotify music',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (!match || !match.includes('open.spotify.com')) return message.reply('_Not Vaild Spotify Url!_');
  if (!isUrl(match)) return message.reply('_Invaild Url_');
  const msg = await message.reply('_Downloading_');
  const res = await getJson(`https://api.giftedtech.my.id/api/download/spotifydl?apikey=astro_fx-k56DdhdS7@gifted_api&url=${match}`);
  await msg.edit('_Downloading ' + res.result.data.title + '_');
  return await message.send(res.result.data.preview);
 }
);

handler(
 {
  pattern: 'ytmp4',
  desc: 'download youtube video mp4',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (!isUrl(match)) return message.reply('_Inavild Url!_');
  await message.reply('_Downloading!_');
  const res = await getJson(`https://api.giftedtech.my.id/api/download/ytmp4?apikey=astro_fx-k56DdhdS7@gifted_api&url=${match}`);
  return await message.send(res.result.download_url, { caption: res.result.title });
 }
);

handler(
 {
  pattern: 'ytmp3',
  desc: 'download youtube videos mp3',
  type: 'download',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (!isUrl(match)) return message.reply('_Inavild Url!_');
  await message.reply('_Downloading!_');
  const res = await getJson(`https://api.giftedtech.my.id/api/download/mp3?apikey=astro_fx-k56DdhdS7@gifted_api&url=${match}`);
  return await message.send(res.result.download['.m4a'].download_url, { type: 'audio' });
 }
);

handler(
 {
  pattern: 'pinterest',
  desc: 'Get Pinterest Images',
  type: 'download',
 },
 async (message, match) => {
  if (!match) return message.reply('_provide me query_');
  const res = await getJson(`https://ironman.koyeb.app/ironman/search/pinterest?q=${match}`);
  const uniqueImages = [...new Set(res)].slice(1);
  for (const image of uniqueImages) {
   await message.send(image);
  }
 }
);
