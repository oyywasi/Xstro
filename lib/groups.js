const { runtime } = require('./utils');

class GroupHandler {
 constructor(conn) {
  this.conn = conn;
  this.setupGroupEvents();
 }

 setupGroupEvents() {
  this.conn.ev.on('group-participants.update', this.handleGroupParticipantUpdate.bind(this));
 }

 async formatMessage(template, data) {
  if (!template) return null;

  const replacements = {
   '@user': data.userMention,
   '@gname': data.groupName,
   '@gdesc': data.groupDesc || '',
   '@botname': data.botName,
   '@members': data.memberCount,
   '@admins': data.adminCount,
   '&runtime': data.runtime,
   '&quotes': await this.getRandomQuote(),
   '&facts': await this.getRandomFact(),
  };

  return template.replace(new RegExp(Object.keys(replacements).join('|'), 'g'), (match) => replacements[match]);
 }

 async getMessageData(groupId) {
  const groupMetadata = await this.conn.groupMetadata(groupId);
  const adminList = groupMetadata.participants.filter((p) => p.admin).map((p) => p.id);

  return {
   groupName: groupMetadata.subject,
   groupDesc: groupMetadata.desc,
   botName: this.conn.user.name,
   memberCount: groupMetadata.participants.length,
   adminCount: adminList.length,
   runtime: runtime(process.uptime()),
  };
 }

 async handleGroupParticipantUpdate(update) {
  try {
   const { id: groupId, participants, action } = update;

   if (action === 'add' || action === 'remove') {
    const type = action === 'add' ? 'welcome' : 'goodbye';
    const { getMessage } = require('./sql/groups');
    const messageConfig = await getMessage(groupId, type);

    if (!messageConfig || !messageConfig.enabled) return;

    const messageData = await this.getMessageData(groupId);

    for (const participant of participants) {
     messageData.userMention = `@${participant.split('@')[0]}`;

     const formattedMessage = await this.formatMessage(messageConfig.message, messageData);

     if (formattedMessage) {
      await this.conn.sendMessage(groupId, {
       text: formattedMessage,
       mentions: participants,
      });
     }
    }
   }
  } catch (error) {
   console.error('Error in handleGroupParticipantUpdate:', error);
  }
 }
 async getRandomQuote() {
  const quotes = ['Welcome to our community!', 'Great to have you here!', 'Welcome aboard!'];
  return quotes[Math.floor(Math.random() * quotes.length)];
 }

 async getRandomFact() {
  const facts = ['Did you know? Groups make WhatsApp more fun!', 'Fun fact: You can pin messages in groups!', 'Groups can have up to 256 participants!'];
  return facts[Math.floor(Math.random() * facts.length)];
 }
}

module.exports = GroupHandler;
