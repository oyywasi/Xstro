global.ban = '*_ʏᴏᴜ ʜᴀᴠᴇ ʙᴇᴇɴ ʙᴀɴɴᴇᴅ ғʀᴏᴍ ᴜsɪɴɢ ᴛʜɪs ʙᴏᴛ!_*';
global.owner = '*_ғᴏʀ ᴍʏ ᴏᴡɴᴇʀs ᴏɴʟʏ!_*';
global.group = '*_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_*';
global.admin = '*_ɪ ᴀᴍ ɴᴏᴛ ᴀᴅᴍɪɴ_*';

const { SudoDB, getBan } = require('./sql');
const config = require('../config');

async function getMode(owner, user) {
 if (config.MODE.toLowerCase() === 'private') {
  return owner === true;
 } else if (config.MODE.toLowerCase() === 'public') {
  return owner === true || user === true;
 } else {
  return false;
 }
}

async function isSudo(userId) {
 if (!userId) return false;
 const id = userId.split('@')[0];
 const exists = await SudoDB.findOne({ where: { userId: id } });
 return !!exists;
}

async function isBan(userId) {
 const bannedUser = await getBan(userId);
 return !!bannedUser;
}

module.exports = {
 global,
 getMode,
 isSudo,
 isBan,
};
