const fs = require('fs');
const path = require('path');
const { getJson } = require('../utils');
const TicTacToe = require('./ttt');
const WordChainGame = require('./wcg');
const TriviaGame = require('./trivia');

function getRandomFact() {
 const facts = JSON.parse(fs.readFileSync(path.join(__dirname, 'facts.json'), 'utf8')).facts;
 return facts[Math.floor(Math.random() * facts.length)];
}
function getRandomQuote() {
 const { quotes } = JSON.parse(fs.readFileSync(path.join(__dirname, 'quotes.json'), 'utf8'));
 const { quote, author } = quotes[Math.floor(Math.random() * quotes.length)];
 return `${quote} — ${author}`;
}
const fetchJoke = async () => {
 const response = await getJson('https://api.giftedtech.my.id/api/fun/jokes?apikey=astro_fx-k56DdhdS7@gifted_api');
 const { setup, punchline } = response.result;
 return `${setup}\n${punchline}`;
};

async function loader(message) {
 const loadingStages = ['ʟᴏᴀᴅɪɴɢ █▒▒▒▒▒▒▒▒▒▒▒ 𝟷𝟶%', 'ʟᴏᴀᴅɪɴɢ ████▒▒▒▒▒▒▒▒ 𝟹𝟶%', 'ʟᴏᴀᴅɪɴɢ ███████▒▒▒▒▒ 𝟻𝟶%', 'ʟᴏᴀᴅɪɴɢ ██████████▒▒ 𝟾𝟶%', 'ʟᴏᴀᴅɪɴɢ ████████████ 𝟷𝟶𝟶%', 'ʟᴏᴀᴅɪɴɢ ᴄᴏᴍᴘʟᴇᴛᴇ'];

 const msg = await message.reply('ʟᴏᴀᴅɪɴɢ...');
 for (let i = 0; i < loadingStages.length; i++) {
  await msg.edit(loadingStages[i]);
  await new Promise((resolve) => setTimeout(resolve, 800));
 }
}
module.exports = {
 getRandomFact,
 getRandomQuote,
 fetchJoke,
 loader,
 TicTacToe,
 WordChainGame,
 TriviaGame,
};
