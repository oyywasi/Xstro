// plugins/example.js
module.exports = {
 pattern: /^!hello$/i,
 alias: ['hi', 'hey'],
 function: async (handler, args) => {
   await handler.reply('Hello!');
 }
};