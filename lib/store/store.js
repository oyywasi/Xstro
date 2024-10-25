const { isJidGroup, extractMessageContent } = require('baileys');
const { DataTypes, Op } = require('sequelize');
const { DATABASE } = require('../../config');

const ChatModel = DATABASE.define('Chat', {
 id: {
  type: DataTypes.STRING,
  allowNull: false,
  primaryKey: true,
 },
 conversationTimestamp: {
  type: DataTypes.INTEGER,
  allowNull: false,
 },
 isGroup: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
 },
 name: {
  type: DataTypes.STRING,
  allowNull: true,
 },
 unreadCount: {
  type: DataTypes.INTEGER,
  defaultValue: 0,
 },
 isPaused: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
 },
});

const MessageModel = DATABASE.define('Message', {
 jid: {
  type: DataTypes.STRING,
  allowNull: false,
 },
 message: {
  type: DataTypes.JSON,
  allowNull: false,
 },
 id: {
  type: DataTypes.STRING,
  allowNull: false,
  primaryKey: true,
 },
 timestamp: {
  type: DataTypes.INTEGER,
  allowNull: false,
 },
 isDeleted: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
 },
 deletedTimestamp: {
  type: DataTypes.INTEGER,
  allowNull: true,
 },
});

const ContactModel = DATABASE.define('Contact', {
 jid: {
  type: DataTypes.STRING,
  allowNull: false,
  primaryKey: true,
 },
 name: {
  type: DataTypes.STRING,
  allowNull: false,
 },
 lastSeen: {
  type: DataTypes.INTEGER,
  allowNull: true,
 },
 status: {
  type: DataTypes.STRING,
  allowNull: true,
 },
});

class WhatsAppStore {
 static async saveMessage(message, user) {
  const { remoteJid: jid, id } = message?.key || {};
  if (!jid || !id) return;

  if (user && message.pushName) {
   await this.saveContact(user, message.pushName);
  }

  const messageContent = extractMessageContent(message);
  const timestamp = message.messageTimestamp;

  try {
   await MessageModel.upsert({
    id,
    jid,
    message: messageContent,
    timestamp,
    isDeleted: false,
   });
  } catch (error) {
   console.error('Error saving message:', error);
  }
 }

 static async loadMessage(id) {
  if (!id) return false;
  try {
   const message = await MessageModel.findOne({
    where: { id, isDeleted: false },
   });
   return message ? message.dataValues : false;
  } catch (error) {
   console.error('Error loading message:', error);
   return false;
  }
 }

 static async markMessageAsDeleted(messageId, timestamp) {
  try {
   await MessageModel.update(
    {
     isDeleted: true,
     deletedTimestamp: timestamp,
    },
    {
     where: { id: messageId },
    }
   );
  } catch (error) {
   console.error('Error marking message as deleted:', error);
  }
 }

 static async saveChat(chat) {
  const { id, conversationTimestamp, name } = chat || {};
  if (!id || !conversationTimestamp || id === 'status@broadcast' || id === 'broadcast') return;

  const isGroup = isJidGroup(id);
  try {
   await ChatModel.upsert({
    id,
    conversationTimestamp,
    isGroup,
    name: name || null,
   });
  } catch (error) {
   console.error('Error saving chat:', error);
  }
 }

 static async getChatHistory(jid, limit = 50) {
  try {
   return await MessageModel.findAll({
    where: { jid },
    order: [['timestamp', 'DESC']],
    limit,
   });
  } catch (error) {
   console.error('Error getting chat history:', error);
   return [];
  }
 }

 static async getDeletedMessages(jid, since = 0) {
  try {
   return await MessageModel.findAll({
    where: {
     jid,
     isDeleted: true,
     deletedTimestamp: { [Op.gte]: since },
    },
    order: [['deletedTimestamp', 'DESC']],
   });
  } catch (error) {
   console.error('Error getting deleted messages:', error);
   return [];
  }
 }

 static async saveContact(jid, name, lastSeen = null, status = null) {
  if (!jid || !name || isJidGroup(jid)) return;

  try {
   await ContactModel.upsert({
    jid,
    name,
    lastSeen,
    status,
   });
  } catch (error) {
   console.error('Error saving contact:', error);
  }
 }

 static async getName(jid) {
  if (!jid) return;
  try {
   const contact = await ContactModel.findOne({ where: { jid } });
   return contact ? contact.name : jid.split('@')[0].replace(/_/g, ' ');
  } catch (error) {
   console.error('Error getting contact name:', error);
   return jid.split('@')[0];
  }
 }

 static async getPausedChats() {
  try {
   return await ChatModel.findAll({
    where: { isPaused: true },
   });
  } catch (error) {
   console.error('Error getting paused chats:', error);
   return [];
  }
 }

 static async toggleChatPause(chatId, isPaused) {
  try {
   await ChatModel.update({ isPaused }, { where: { id: chatId } });
  } catch (error) {
   console.error('Error toggling chat pause:', error);
  }
 }
}

module.exports = WhatsAppStore;
