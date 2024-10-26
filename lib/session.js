const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

module.exports.initSession = async (accessKey) => {
 const downloadPath = path.join(__dirname, 'temp.zip');
 const sessionDir = path.join(__dirname, 'session');
 if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir);
 const response = await axios.get(`https://session-wd8n.onrender.com/download/${accessKey}`, { responseType: 'stream' });
 await new Promise((resolve, reject) => response.data.pipe(fs.createWriteStream(downloadPath)).on('finish', resolve).on('error', reject));

 new AdmZip(downloadPath)
  .getEntries()
  .filter((e) => e.entryName === 'creds.json' || e.entryName.startsWith('app-state'))
  .forEach((e) => e.extractEntryTo(e, sessionDir, false, true));
 fs.unlinkSync(downloadPath);
 console.log(`session created`);
};
