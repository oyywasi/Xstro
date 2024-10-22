const { MODE } = require('../../config');

async function getMode(owner, user) {
 if (MODE.toLowerCase() === 'private') {
  return owner === true;
 } else if (MODE.toLowerCase() === 'public') {
  return owner === true || user === true;
 } else {
  return false;
 }
}

module.exports = { getMode };
