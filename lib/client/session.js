const fs = require('fs').promises;
const { createWriteStream, createReadStream } = require('fs');
const axios = require('axios');
const path = require('path');
const unzipper = require('unzipper');
const { delay } = require('baileys');

const BASE_URL = 'https://session-manager-x9wf.onrender.com';

async function createSession(accessKey) {
 try {
  const { data } = await axios.get(`${BASE_URL}/download/${accessKey}`, { responseType: 'arraybuffer' });
  const filePath = path.join(__dirname, `downloaded_${accessKey}.zip`);

  await fs.writeFile(filePath, data);
  await delay(1500);

  const extractPath = path.join(__dirname, '..', 'session');
  await fs.mkdir(extractPath, { recursive: true });

  await new Promise((resolve, reject) => {
   createReadStream(filePath)
    .pipe(unzipper.Parse())
    .on('entry', async (entry) => {
     const entryPath = entry.path;
     if (entryPath.endsWith('.json') || entryPath === 'creds.json' || entryPath.startsWith('app-state')) {
      const outputFilePath = path.join(extractPath, path.basename(entryPath));
      await new Promise((res, rej) => entry.pipe(createWriteStream(outputFilePath)).on('finish', res).on('error', rej));
     } else {
      entry.autodrain();
     }
    })
    .on('close', resolve)
    .on('error', reject);
  });

  await fs.unlink(filePath);
 } catch (err) {
  console.error('Error during extraction:', err);
 }
}

module.exports = { createSession };
