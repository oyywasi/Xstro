const { DataTypes } = require('sequelize');
const config = require('../../config');

const GroupMessage = config.DATABASE.define('GroupMessage', {
 groupJid: {
  type: DataTypes.STRING,
  allowNull: false,
 },
 type: {
  type: DataTypes.ENUM('welcome', 'goodbye'),
  allowNull: false,
 },
 message: {
  type: DataTypes.TEXT,
  allowNull: true,
 },
 enabled: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
 },
});

module.exports = {
 GroupMessage,
 async getMessage(groupJid, type) {
  return await GroupMessage.findOne({
   where: { groupJid, type },
  });
 },
 async setMessage(groupJid, type, message) {
  return await GroupMessage.upsert({
   groupJid,
   type,
   message,
   enabled: true,
  });
 },
 async toggleMessage(groupJid, type, enabled) {
  return await GroupMessage.update({ enabled }, { where: { groupJid, type } });
 },
 async getMessageStatus(groupJid, type) {
  const messageConfig = await GroupMessage.findOne({
   where: { groupJid, type },
  });
  return messageConfig ? messageConfig.enabled : false;
 },
};
