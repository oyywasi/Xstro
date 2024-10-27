const fs = require('fs').promises;
const path = require('path');
const envPath = path.join(process.cwd(), '.env');

async function manageVar(params) {
 const { command, key, value } = params;

 switch (command) {
  case 'set': {
   const envContent = `${key}=${value}`;
   await fs.writeFile(envPath, envContent);
   return true;
  }
  case 'get': {
   const data = await fs.readFile(envPath, 'utf8');
   return data || null;
  }
  case 'del': {
   const data = await fs.readFile(envPath, 'utf8');
   const updatedData = data
    .split('\n')
    .filter((line) => !line.startsWith(`${key}=`))
    .join('\n');
   await fs.writeFile(envPath, updatedData);
   return true;
  }
 }
}
module.exports = { manageVar };
