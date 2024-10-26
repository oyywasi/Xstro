const DB = require('../lib/sql/GroupMessageService');
const { handler } = require('../lib');

handler(
 {
  pattern: 'welcome',
  desc: 'Setup Welcome Messages for Group',
  type: 'group',
  usage: '.welcome on/off/get [custom message]',
 },
 async (message, match, m) => {
  if (!message.isGroup) return message.reply('This command is for groups only.');
  if (!m.isAdmin) return message.reply('Only admins can modify welcome settings.');

  const [cmd, ...args] = match.split(' ');
  const customMessage = args.join(' ');

  switch (cmd) {
   case 'on':
    await DB.toggleMessage(message.jid, 'welcome', true);
    return message.reply('Welcome messages enabled!');

   case 'off':
    await DB.toggleMessage(message.jid, 'welcome', false);
    return message.reply('Welcome messages disabled!');

   case 'get':
    const welcomeConfig = await DB.getMessage(message.jid, 'welcome');
    return message.reply(welcomeConfig ? `Current Welcome Message: ${welcomeConfig.message}` : 'No custom welcome message set.');

   default:
    if (customMessage) {
     await DB.setMessage(message.jid, 'welcome', customMessage);
     return message.reply('Custom welcome message set!');
    } else {
     return message.reply('Usage: .welcome on/off/get [custom message]\n' + 'Placeholders: @user, @gname, @gdesc, @botname, @members, @admins, @runtime, &quotes, &facts');
    }
  }
 }
);

handler(
 {
  pattern: 'goodbye',
  desc: 'Setup Goodbye Messages for Group',
  type: 'group',
  usage: '.goodbye on/off/get [custom message]',
 },
 async (message, match, m) => {
  if (!message.isGroup) return message.reply('This command is for groups only.');
  if (!m.isAdmin) return message.reply('Only admins can modify goodbye settings.');

  const [cmd, ...args] = match.split(' ');
  const customMessage = args.join(' ');

  switch (cmd) {
   case 'on':
    await DB.toggleMessage(message.jid, 'goodbye', true);
    return message.reply('Goodbye messages enabled!');

   case 'off':
    await DB.toggleMessage(message.jid, 'goodbye', false);
    return message.reply('Goodbye messages disabled!');

   case 'get':
    const goodbyeConfig = await DB.getMessage(message.jid, 'goodbye');
    return message.reply(goodbyeConfig ? `Current Goodbye Message: ${goodbyeConfig.message}` : 'No custom goodbye message set.');

   default:
    if (customMessage) {
     await DB.setMessage(message.jid, 'goodbye', customMessage);
     return message.reply('Custom goodbye message set!');
    } else {
     return message.reply('Usage: .goodbye on/off/get [custom message]\n' + 'Placeholders: @user, @gname, @gdesc, @botname, @members, @admins, @runtime, &quotes, &facts');
    }
  }
 }
);
