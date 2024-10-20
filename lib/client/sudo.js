const { SudoDB } = require('../store');
const { Sequelize } = require('sequelize');

function isSudo(userId) {
 const cleanedId = userId.split('@')[0];
 const result = SudoDB.sequelize
  .query('SELECT COUNT(*) AS count FROM sudos WHERE userId = :userId', {
   replacements: { userId: cleanedId },
   type: Sequelize.QueryTypes.SELECT,
  })
  .then((result) => {
   return result.length > 0 && result[0].count > 0;
  })
  .catch((error) => {
   console.error('Error checking sudo status:', error);
   return false;
  });

 return result;
}
module.exports = { isSudo };
