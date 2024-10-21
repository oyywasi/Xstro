const { command } = require('../lib');
const { spawn } = require('child_process');
const path = require('path');

command(
 {
  pattern: 'ping',
  desc: 'To check ping',
  type: 'system',
 },
 async (message) => {
  const msg = await message.reply('ᴄʜᴇᴄᴋɪɴɢ...');
  const updateInterval = 1000;

  for (let i = 0; i < 10; i++) {
   const start = new Date().getTime();
   await new Promise((resolve) => setTimeout(resolve, 20));
   const latency = new Date().getTime() - start;
   await msg.edit(`ʟᴀᴛᴇɴᴄʏ ${latency} ᴍs`);
   await new Promise((resolve) => setTimeout(resolve, updateInterval));
  }
 }
);

command(
 {
  pattern: 'restart',
  desc: 'Restart System',
  type: 'system',
 },
 async (message) => {
  await message.reply('Restarting the bot...');
  const filePath = path.resolve(__dirname, '..', 'index.js');
  spawn(process.execPath, [filePath], {
   detached: true,
   stdio: 'inherit',
  });
  process.exit();
 }
);

command(
 {
  pattern: 'shutdown',
  desc: 'Shutdown System',
  type: 'system',
 },
 async (message) => {
  await message.reply('Shutting down the bot...');
  process.exit();
 }
);
