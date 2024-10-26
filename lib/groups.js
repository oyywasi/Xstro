class GroupHandler {
 constructor(conn) {
  this.conn = conn;
  this.setupGroupEvents();
 }

 setupGroupEvents() {
  this.conn.ev.on('group-participants.update', this.handleGroupParticipantUpdate.bind(this));
 }

 async getGroupMetadataWithMentions(groupId) {
  const metadata = await this.conn.groupMetadata(groupId);
  const participants = metadata.participants.map((participant) => participant.id);
  return { metadata, participants };
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

    const formattedMessage = await this.formatMessage(messageConfig.message || 'Welcome @user to @gname! 👋', messageData);

    if (formattedMessage) {
     await this.conn.sendMessage(groupId, {
      text: formattedMessage,
      mentions: [participant],
     });
    }
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

    const formattedMessage = await this.formatMessage(messageConfig.message || 'Goodbye @user from @gname! 👋', messageData);

    if (formattedMessage) {
     await this.conn.sendMessage(groupId, {
      text: formattedMessage,
      mentions: [participant],
     });
    }
   }
  } catch (error) {
   console.error('Error in handleGoodbye:', error);
  }
 }

 async handlePromotion(groupId, promotedParticipants) {
  try {
   const { metadata, participants } = await this.getGroupMetadataWithMentions(groupId);
   const groupName = metadata.subject;

   for (const promotedUser of promotedParticipants) {
    const userMention = `@${promotedUser.split('@')[0]}`;
    const announceMessage = `*👑 NEW ADMIN*\n\n${userMention} has been promoted to admin of *${groupName}*\n\nCongratulations! 🎉`;

    await this.conn.sendMessage(groupId, {
     text: announceMessage,
     mentions: [...participants],
    });
   }
  } catch (error) {
   console.error('Error in handlePromotion:', error);
  }
 }

 async handleDemotion(groupId, demotedParticipants) {
  try {
   const { metadata, participants } = await this.getGroupMetadataWithMentions(groupId);
   const groupName = metadata.subject;

   for (const demotedUser of demotedParticipants) {
    const userMention = `@${demotedUser.split('@')[0]}`;
    const announceMessage = `*👤 ADMIN DEMOTION*\n\n${userMention} is no longer an admin of *${groupName}*`;

    await this.conn.sendMessage(groupId, {
     text: announceMessage,
     mentions: [...participants],
    });
   }
  } catch (error) {
   console.error('Error in handleDemotion:', error);
  }
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
   '@runtime': this.formatRuntime(data.runtime),
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
   runtime: process.uptime(),
  };
 }

 formatRuntime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
 }

 async getRandomQuote() {
  const quotes = ['Welcome to our amazing community!', 'Great to have you here with us!', 'Welcome aboard! Enjoy your stay!', 'A warm welcome to our new member!', "Welcome! We're glad you joined us!"];
  return quotes[Math.floor(Math.random() * quotes.length)];
 }

 async getRandomFact() {
  const facts = ['Did you know? Groups make WhatsApp more fun!', 'Fun fact: You can pin up to 3 messages in groups!', 'Groups can have up to 256 participants!', 'You can set custom wallpapers for each group!', 'Groups support live location sharing!'];
  return facts[Math.floor(Math.random() * facts.length)];
 }
}
module.exports = GroupHandler;
