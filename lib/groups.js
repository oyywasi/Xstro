const DB = require('../lib/sql/GroupMessageService');
const { getRandomQuote, getRandomFact, fetchJoke } = require('./misc');
const { runtime } = require('./utils');

class GroupHandler {
 constructor(conn) {
  this.conn = conn;
  this.setupGroupEvents();
 }

 setupGroupEvents() {
  this.conn.ev.on('group-participants.update', this.handleGroupParticipantUpdate.bind(this));
 }

 async handleGroupParticipantUpdate(update) {
  const { id: groupId, participants, action } = update;
  const groupMetadata = await this.conn.groupMetadata(groupId);
  const adminCount = groupMetadata.participants.filter((p) => p.admin).length;
  const placeholders = {
   gname: groupMetadata.subject,
   gdesc: groupMetadata.desc || '',
   botname: this.conn.user.name,
   members: groupMetadata.participants.length,
   admins: adminCount,
   runtime: runtime(process.uptime()),
   quotes: getRandomQuote(),
   facts: getRandomFact(),
  };

  for (const participant of participants) {
   const userMention = `@${participant.split('@')[0]}`;
   const profilePic = await this.getProfilePicture(participant);

   const messageConfig = await DB.getMessage(groupId, action);
   const messageEnabled = await DB.getMessageStatus(groupId, action);
   if (!messageEnabled) continue;

   const defaultMessages = {
    welcome: `${userMention} welcome to ${placeholders.gname}, we have ${placeholders.admins} admins & ${placeholders.quotes}`,
    goodbye: `${userMention} goodbye from ${placeholders.gname}, we have ${placeholders.admins} admins & ${placeholders.quotes}`,
   };

   const messageText = (messageConfig?.message || defaultMessages[action]).replace(/@(\w+)/g, (_, key) => placeholders[key] || userMention);

   const msgPayload = {
    image: { url: profilePic },
    caption: messageText,
    mentions: [participant],
   };

   switch (action) {
    case 'add':
     await this.conn.sendMessage(groupId, msgPayload);
     break;
    case 'remove':
     await this.conn.sendMessage(groupId, msgPayload);
     break;
   }
  }
 }

 async getProfilePicture(participant) {
  try {
   return await this.conn.profilePictureUrl(participant, 'image');
  } catch {
   return 'https://i.sstatic.net/l60Hf.png';
  }
 }
}

module.exports = GroupHandler;
