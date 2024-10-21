const { getBan } = require('../store');
async function isBan(userId) {
 const bannedUser = await getBan(userId);
 return !!bannedUser;
}
module.exports = { isBan };
