const path = require('path');
const os = require('os');
const { tiny } = require('xstro');
const { handler, runtime } = require('../lib');
const { spawn, exec } = require('child_process');
const simplegit = require('simple-git');
const git = simplegit();

handler(
 {
  pattern: 'ping',
  alias: 'speed',
  desc: 'To check ping',
  type: 'system',
 },
 async (message) => {
  if (!message.mode) return;if (message.isban) return await message.reply('you are banned');
  const msg = await message.reply('ᴄʜᴇᴄᴋɪɴɢ...');
  const updateInterval = 1000;

  for (let i = 0; i < 10; i++) {
   const start = performance.now();
   await new Promise((resolve) => setTimeout(resolve, 20));
   const latency = (performance.now() - start).toFixed(5);
   await msg.edit(`\`\`\`Latancy ${latency} secs\`\`\``);
   await new Promise((resolve) => setTimeout(resolve, updateInterval));
  }
 }
);

handler(
 {
  pattern: 'restart',
  alias: 'reboot',
  desc: 'Restart System',
  type: 'system',
 },
 async (message) => {
  if (!message.mode) return;
  await message.reply('Restarting the bot...');
  const filePath = path.resolve(__dirname, '..', 'index.js');
  spawn(process.execPath, [filePath], {
   detached: true,
   stdio: 'inherit',
  });
  process.exit();
 }
);

handler(
 {
  pattern: 'shutdown',
  desc: 'Shutdown System',
  type: 'system',
 },
 async (message) => {
  if (!message.mode) return;
  await message.reply('Shutting down the bot...');
  process.exit();
 }
);

handler(
 {
  pattern: 'cpu',
  desc: 'Get CPU details',
  type: 'system',
 },
 async (message) => {
  if (!message.mode) return;
  const cpus = os.cpus();
  const coreCount = cpus.length;
  const model = cpus[0].model;
  const averageSpeed = (cpus.reduce((acc, cpu) => acc + cpu.speed, 0) / coreCount).toFixed(2);

  const coreDetails = cpus.map((cpu, index) => `Core ${index + 1}: *${cpu.speed} MHz*`).join('\n');

  const output = `*CPU Information*\n\n` + `Total Cores: *${coreCount}*\n` + `Model: *${model}*\n` + `Average Speed: *${averageSpeed} MHz*\n\n` + `*Core Speeds:*\n${coreDetails}`;

  await message.reply(tiny(output));
 }
);

handler(
 {
  pattern: 'network',
  desc: 'Get network interfaces details',
  type: 'system',
 },
 async (message) => {
  if (!message.mode) return;
  const interfaces = os.networkInterfaces();
  const interfaceDetails = Object.keys(interfaces)
   .map((iface) => {
    const addresses = interfaces[iface].map((addr) => `${addr.family} - ${addr.address} ${addr.internal ? '(internal)' : ''}`).join('\n');
    return `*${iface}*\n${addresses}`;
   })
   .join('\n\n');
  const output = `*Network Interfaces*\n\n${interfaceDetails}`;
  await message.reply(tiny(output));
 }
);

handler(
 {
  pattern: 'runtime',
  desc: 'Get Runtime Of Bot',
  type: 'system',
 },
 async (message) => {
  if (!message.mode) return;
  const uptime = await runtime(process.uptime());
  return await message.send(tiny(`Running Since ${uptime}`));
 }
);

handler(
 {
  pattern: 'update',
  desc: 'Update the bot',
  type: 'system',
 },
 async (message, match) => {
  if (!message.mode) return;
  if (!message.owner) return message.reply(owner);
  await git.fetch();
  const commits = await git.log(['master..origin/master']);
  if (commits.total === 0) return await message.reply('```No changes in the latest commit```');
  if (match === 'now') {
   await message.reply('*Updating...*');
   exec('git stash && git pull origin master', async (err, stderr) => {
    if (err) return await message.reply('```' + stderr + '```');
    await message.reply('*Restarting...*');
    exec('pm2 restart', (err, _, stderr) => {
     if (err) return message.reply('```' + stderr + '```');
     message.reply('*Restart complete*');
    });
   });
  } else {
   let changes = '_New update available!_\n\n' + '*Commits:* ```' + commits.total + '```\n' + '*Changes:*\n' + commits.all.map((c, i) => '```' + (i + 1) + '. ' + c.message + '```').join('\n') + '\n*To update, send* ```' + message.prefix + 'update now```';
   await message.reply(changes);
  }
 }
);
