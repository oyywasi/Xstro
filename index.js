const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const { initSession } = require('./lib/session');
async function readAndRequireFiles(directory) {
 const files = await fs.readdir(directory);
 return await Promise.all(
  files
   .filter((file) => path.extname(file) === '.js')
   .map(async (file) => {
    try {
     return require(path.join(directory, file));
    } catch (error) {
     const filePath = path.join(directory, file);
     const errorLocation = error.stack.split('\n')[1].trim();
     console.error(`Error in file: ${filePath}\nError at: ${errorLocation}`);
    }
   })
 );
}

async function initialize() {
 await readAndRequireFiles(path.join(__dirname, '/lib/sql/'));
 console.log('Syncing Database');
 await config.DATABASE.sync();
 console.log('⬇  Installing Plugins...');
 await readAndRequireFiles(path.join(__dirname, '/plugins/'));
 console.log('📑 Plugins Installed!');
 await initSession(config.SESSION_ID.trim());
 const Client = require('./lib/client');
 const bot = new Client();
 return bot.connect();
}

initialize();
