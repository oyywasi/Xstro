const DB = require('../lib/sql/groupMessage');
const { handler } = require('../lib');

handler(
 {
  pattern: 'welcome',
  desc: 'Setup Welcome Messages for Group',
  type: 'group',
  usage: '.welcome on/off/message [custom message]',
 },
 async (message, match, m, client) => {
  if (!message.mode) return;
  if (message.isban) return message.reply(ban);
  if (!message.isGroup) return message.reply(group);
  if (!m.isAdmin) return message.reply(admin);

  const [cmd, ...args] = match.split(' ');
  const customMessage = args.join(' ');

  switch (cmd) {
   case 'on':
    await DB.toggleMessage(message.jid, 'welcome', true);
    return message.reply('Welcome messages enabled!');

   case 'off':
    await DB.toggleMessage(message.jid, 'welcome', false);
    return message.reply('Welcome messages disabled!');

   case 'message':
    if (!customMessage) {
     return message.reply('Usage: .welcome on/off/message [custom message]\n' + 'Variables: @user, @gname, @gdesc, @botname, @members, @admins, @runtime, &quotes, &facts');
    }
    await DB.setMessage(message.jid, 'welcome', customMessage);
    return message.reply('Welcome message updated!');

   default:
    return message.reply('Invalid command. Use .welcome on/off/message [custom message]');
  }
 }
);

handler(
 {
  pattern: 'goodbye',
  desc: 'Setup Goodbye Messages for Group',
  type: 'group',
  usage: '.goodbye on/off/message [custom message]',
 },
 async (message, match, m, client) => {
  if (!message.mode) return;
  if (message.isban) return message.reply(ban);
  if (!message.isGroup) return message.reply(group);
  if (!m.isAdmin) return message.reply(admin);

  const [cmd, ...args] = match.split(' ');
  const customMessage = args.join(' ');

  switch (cmd) {
   case 'on':
    await DB.toggleMessage(message.jid, 'goodbye', true);
    return message.reply('Goodbye messages enabled!');

   case 'off':
    await DB.toggleMessage(message.jid, 'goodbye', false);
    return message.reply('Goodbye messages disabled!');

   case 'message':
    if (!customMessage) {
     return message.reply('Usage: .goodbye on/off/message [custom message]\n' + 'Variables: @user, @gname, @gdesc, @botname, @members, @admins, @runtime, &quotes, &facts');
    }
    await DB.setMessage(message.jid, 'goodbye', customMessage);
    return message.reply('Goodbye message updated!');

   default:
    return message.reply('Invalid command. Use .goodbye on/off/message [custom message]');
  }
 }
);
