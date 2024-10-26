const config = require('../config');
const { getRandomFact, getRandomQuote, fetchJoke } = require('./misc');
const { runtime } = require('./utils');
const { GroupMessageService } = require('./sql/groupMessage');

class GroupHandler {
 constructor(conn) {
  this.conn = conn;
  this.setupGroupEvents();
 }

 setupGroupEvents() {
  this.conn.ev.on('group-participants.update', this.handleGroupParticipantUpdate.bind(this));
 }

 async handleGroupParticipantUpdate(update) {
  try {
   const { id: groupId, participants, action } = update;
   const groupMetadata = await this.conn.groupMetadata(groupId);
   const adminCount = groupMetadata.participants.filter((p) => p.admin).length;
   const quotes = getRandomQuote();
   const facts = getRandomFact();
   const joke = await fetchJoke();
   const botname = config.BOT_INFO.split(';')[1];
   const uptime = runtime(process.uptime());
   const groupDesc = groupMetadata.desc || 'No description provided.';

   for (const participant of participants) {
    const userMention = `@${participant.split('@')[0]}`;
    const profilePic = await this.getProfilePicture(participant);

    switch (action) {
     case 'add':
      const welcomeMessageConfig = await GroupMessageService.getMessage(groupId, 'welcome');
      const welcomeText = welcomeMessageConfig?.enabled && welcomeMessageConfig.message ? welcomeMessageConfig.message : `${userMention} welcome to *${groupMetadata.subject}*! 👤 *Admins*: ${adminCount}\n📝 *Group Description*: ${groupDesc}\n💬 *Quote*: ${quotes}\n📜 *Fact*: ${facts}\n🤣 *Joke*: ${joke}\n🤖 *Bot*: ${botname}\n⏳ *Uptime*: ${uptime}`;
      await this.conn.sendMessage(groupId, { image: { url: profilePic }, caption: welcomeText, mentions: [participant] });
      break;

     case 'remove':
      const goodbyeMessageConfig = await GroupMessageService.getMessage(groupId, 'goodbye');
      const goodbyeText = goodbyeMessageConfig?.enabled && goodbyeMessageConfig.message ? goodbyeMessageConfig.message : `${userMention} has left *${groupMetadata.subject}*. 👤 *Admins*: ${adminCount}\n📝 *Group Description*: ${groupDesc}\n💬 *Quote*: ${quotes}\n📜 *Fact*: ${facts}\n🤖 *Bot*: ${botname}\n⏳ *Uptime*: ${uptime}`;
      await this.conn.sendMessage(groupId, { image: { url: profilePic }, caption: goodbyeText, mentions: [participant] });
      break;

     case 'promote':
      const promoteMessage = `👑 NEW ADMIN\n\n${userMention} has been promoted to admin in *${groupMetadata.subject}*.\n📝 *Group Description*: ${groupDesc}`;
      await this.conn.sendMessage(groupId, { text: promoteMessage, mentions: [participant] });
      break;

     case 'demote':
      const demoteMessage = `⬇️ ADMIN DEMOTED\n\n${userMention} is no longer an admin in *${groupMetadata.subject}*.\n📝 *Group Description*: ${groupDesc}`;
      await this.conn.sendMessage(groupId, { text: demoteMessage, mentions: [participant] });
      break;
    }
   }
  } catch (error) {
   console.error('Error in handleGroupParticipantUpdate:', error);
  }
 }

 async getProfilePicture(participant) {
  try {
   return await this.conn.profilePictureUrl(participant, 'image');
  } catch {
   return 'https://i.sstatic.net/l60Hf.png'; // Fallback profile picture URL
  }
 }
}

module.exports = GroupHandler;
