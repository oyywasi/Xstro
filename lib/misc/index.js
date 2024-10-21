const fs = require('fs');
const path = require('path');

function getRandomFact() {
 const facts = JSON.parse(fs.readFileSync(path.join(__dirname, 'facts.json'), 'utf8')).facts;
 return facts[Math.floor(Math.random() * facts.length)];
}
function getRandomQuote() {
 const { quotes } = JSON.parse(fs.readFileSync(path.join(__dirname, 'quotes.json'), 'utf8'));
 const { quote, author } = quotes[Math.floor(Math.random() * quotes.length)];
 return `${quote} — ${author}`;
}

module.exports = {
 getRandomFact,
 getRandomQuote,
};
