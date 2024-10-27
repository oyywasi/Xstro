const fs = require('fs').promises;
const path = require('path');

const envPath = path.join(process.cwd(), '.env');

async function readEnvFile() {
 try {
  const data = await fs.readFile(envPath, 'utf8');
  return data.split('\n').reduce((acc, line) => {
   if (line && !line.startsWith('#')) {
    const [key, ...values] = line.split('=');
    acc[key.trim()] = values.join('=').trim();
   }
   return acc;
  }, {});
 } catch (error) {
  if (error.code === 'ENOENT') {
   await fs.writeFile(envPath, '');
   return {};
  }
  throw error;
 }
}

async function writeEnvFile(envVars) {
 const content = Object.entries(envVars)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');
 await fs.writeFile(envPath, content);
}

async function manageVar(action, key, value = null) {
 const restricted = ['NODE_ENV', 'PRODUCTION', 'DEVELOPMENT'];

 if (restricted.includes(key?.toUpperCase())) {
  throw new Error(`Cannot modify restricted variable: ${key}`);
 }

 const envVars = await readEnvFile();

 switch (action) {
  case 'get':
   return envVars[key] || null;
  case 'getAll':
   return envVars;
  case 'set':
   if (!key || value === null) {
    throw new Error('Key and value are required for set operation');
   }
   envVars[key] = value;
   await writeEnvFile(envVars);
   return true;
  case 'delete':
   if (!key) {
    throw new Error('Key is required for delete operation');
   }
   if (!(key in envVars)) {
    throw new Error(`Variable ${key} does not exist`);
   }
   delete envVars[key];
   await writeEnvFile(envVars);
   return true;
  default:
   throw new Error('Invalid action');
 }
}
module.exports = { manageVar };
