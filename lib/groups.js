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
   switch (action) {
    case 'add':
     for (const participant of participants) {
      const { getMessage } = require('./sql/groups');
      const messageConfig = await getMessage(groupId, 'welcome');
      if (!messageConfig || !messageConfig.enabled) return;

      const groupMetadata = await this.conn.groupMetadata(groupId);
      const adminCount = groupMetadata.participants.filter((p) => p.admin).length;
      const memberCount = groupMetadata.participants.length;

      let welcomeMessage = messageConfig.message || 'Welcome @user to @gname!';
      welcomeMessage = welcomeMessage
       .replace('@user', `@${participant.split('@')[0]}`)
       .replace('@gname', groupMetadata.subject)
       .replace('@gdesc', groupMetadata.desc || '')
       .replace('@botname', this.conn.user.name)
       .replace('@members', memberCount)
       .replace('@admins', adminCount)
       .replace('@runtime', this.formatRuntime(process.uptime()));

      await this.conn.sendMessage(groupId, {
       text: welcomeMessage,
       mentions: [participant],
      });
     }
     break;

    case 'remove':
     for (const participant of participants) {
      const { getMessage } = require('./sql/groups');
      const messageConfig = await getMessage(groupId, 'goodbye');
      if (!messageConfig || !messageConfig.enabled) return;

      const groupMetadata = await this.conn.groupMetadata(groupId);
      const adminCount = groupMetadata.participants.filter((p) => p.admin).length;
      const memberCount = groupMetadata.participants.length;

      let goodbyeMessage = messageConfig.message || 'Goodbye @user from @gname!';
      goodbyeMessage = goodbyeMessage
       .replace('@user', `@${participant.split('@')[0]}`)
       .replace('@gname', groupMetadata.subject)
       .replace('@gdesc', groupMetadata.desc || '')
       .replace('@botname', this.conn.user.name)
       .replace('@members', memberCount)
       .replace('@admins', adminCount)
       .replace('@runtime', this.formatRuntime(process.uptime()));

      await this.conn.sendMessage(groupId, {
       text: goodbyeMessage,
       mentions: [participant],
      });
     }
     break;

    case 'promote':
     for (const participant of participants) {
      const groupMetadata = await this.conn.groupMetadata(groupId);
      const message = `*👑 NEW ADMIN*\n\n@${participant.split('@')[0]} has been promoted to admin in *${groupMetadata.subject}*`;
      await this.conn.sendMessage(groupId, {
       text: message,
       mentions: [participant],
      });
     }
     break;

    case 'demote':
     for (const participant of participants) {
      const groupMetadata = await this.conn.groupMetadata(groupId);
      const message = `*⬇️ ADMIN DEMOTED*\n\n@${participant.split('@')[0]} is no longer an admin in *${groupMetadata.subject}*`;
      await this.conn.sendMessage(groupId, {
       text: message,
       mentions: [participant],
      });
     }
     break;
   }
  } catch (error) {
   console.error('Error in handleGroupParticipantUpdate:', error);
  }
 }

 formatRuntime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
 }
}

module.exports = GroupHandler;
