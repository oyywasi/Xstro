const { command } = require('../lib');
const fs = require('fs');
const path = require('path');

command(
 {
  pattern: 'temp',
  desc: 'Clean temp folder',
  type: 'tools',
 },
 async (message) => {
  if (!message.mode) return;
  if (message.isban) return message.reply(ban);
  const tempPath = path.join(__dirname, '..', 'lib', 'temp');
  const clearFiles = (folderPath) => fs.readdirSync(folderPath).forEach((file) => fs.unlinkSync(path.join(folderPath, file)));
  clearFiles(tempPath);
  return await message.reply('_Cache Cleared_');
 }
);
