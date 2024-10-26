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
     await this.handleWelcome(groupId, participants);
     break;
    case 'remove':
     await this.handleGoodbye(groupId, participants);
     break;
    case 'promote':
     await this.handlePromotion(groupId, participants);
     break;
    case 'demote':
     await this.handleDemotion(groupId, participants);
     break;
   }
  } catch (error) {
   console.error('Error in handleGroupParticipantUpdate:', error);
  }
 }

 async handleWelcome(groupId, newParticipants) {
  try {
   const { getMessage } = require('./sql/groups');
   const messageConfig = await getMessage(groupId, 'welcome');
   if (!messageConfig || !messageConfig.enabled) return;
   const messageData = await this.getMessageData(groupId);

   for (const participant of newParticipants) {
    messageData.userMention = `@${participant.split('@')[0]}`;
    const formattedMessage = this.formatMessage(messageConfig.message || 'Welcome @user to @gname!', messageData);

    await this.conn.sendMessage(groupId, {
     text: formattedMessage,
     mentions: [participant],
    });
   }
  } catch (error) {
   console.error('Error in handleWelcome:', error);
  }
 }

 async handleGoodbye(groupId, leftParticipants) {
  try {
   const { getMessage } = require('./sql/groups');
   const messageConfig = await getMessage(groupId, 'goodbye');
   if (!messageConfig || !messageConfig.enabled) return;
   const messageData = await this.getMessageData(groupId);

   for (const participant of leftParticipants) {
    messageData.userMention = `@${participant.split('@')[0]}`;
    const formattedMessage = this.formatMessage(messageConfig.message || 'Goodbye @user from @gname!', messageData);

    await this.conn.sendMessage(groupId, {
     text: formattedMessage,
     mentions: [participant],
    });
   }
  } catch (error) {
   console.error('Error in handleGoodbye:', error);
  }
 }

 async handlePromotion(groupId, promotedParticipants) {
  try {
   const metadata = await this.conn.groupMetadata(groupId);

   for (const participant of promotedParticipants) {
    const announceMessage = `*👑 NEW ADMIN*\n\n@${participant.split('@')[0]} has been promoted to admin in *${metadata.subject}*`;

    await this.conn.sendMessage(groupId, {
     text: announceMessage,
     mentions: [participant],
    });
   }
  } catch (error) {
   console.error('Error in handlePromotion:', error);
  }
 }

 async handleDemotion(groupId, demotedParticipants) {
  try {
   const metadata = await this.conn.groupMetadata(groupId);

   for (const participant of demotedParticipants) {
    const announceMessage = `*⬇️ ADMIN DEMOTED*\n\n@${participant.split('@')[0]} is no longer an admin in *${metadata.subject}*`;

    await this.conn.sendMessage(groupId, {
     text: announceMessage,
     mentions: [participant],
    });
   }
  } catch (error) {
   console.error('Error in handleDemotion:', error);
  }
 }

 async getMessageData(groupId) {
  try {
   const metadata = await this.conn.groupMetadata(groupId);
   return {
    groupName: metadata.subject,
    groupDesc: metadata.desc || '',
    botName: this.conn.user.name,
    memberCount: metadata.participants.length,
    adminCount: metadata.participants.filter((p) => p.admin).length,
    runtime: this.formatRuntime(process.uptime()),
   };
  } catch (error) {
   console.error('Error getting message data:', error);
   return {};
  }
 }

 formatMessage(template, data) {
  if (!template) return '';

  const replacements = {
   '@user': data.userMention,
   '@gname': data.groupName,
   '@gdesc': data.groupDesc,
   '@botname': data.botName,
   '@members': data.memberCount,
   '@admins': data.adminCount,
   '@runtime': data.runtime,
  };

  return template.replace(new RegExp(Object.keys(replacements).join('|'), 'g'), (match) => replacements[match]);
 }

 formatRuntime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
 }
}

module.exports = GroupHandler;
