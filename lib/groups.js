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
   const quotes = `"Stay positive!"`; // Example quote; you could randomly pick from an array of quotes

   for (const participant of participants) {
    const userMention = `@${participant.split('@')[0]}`;
    const profilePic = await this.getProfilePicture(participant);

    switch (action) {
     case 'add':
      const welcomeMessage = {
       text: `${userMention} welcome to ${groupMetadata.subject}, we have ${adminCount} admins & ${quotes}`,
       mentions: [participant],
      };
      await this.conn.sendMessage(groupId, { image: { url: profilePic }, caption: welcomeMessage.text, mentions: welcomeMessage.mentions });
      break;

     case 'remove':
      const goodbyeMessage = {
       text: `${userMention} goodbye from ${groupMetadata.subject}, we have ${adminCount} admins & ${quotes}`,
       mentions: [participant],
      };
      await this.conn.sendMessage(groupId, { image: { url: profilePic }, caption: goodbyeMessage.text, mentions: goodbyeMessage.mentions });
      break;

     case 'promote':
      const promoteMessage = `👑 NEW ADMIN\n\n${userMention} has been promoted to admin in ${groupMetadata.subject}`;
      await this.conn.sendMessage(groupId, { text: promoteMessage, mentions: [participant] });
      break;

     case 'demote':
      const demoteMessage = `⬇️ ADMIN DEMOTED\n\n${userMention} is no longer an admin in ${groupMetadata.subject}`;
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
