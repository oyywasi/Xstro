const axios = require('axios');

class WordChainGame {
 constructor() {
  this.games = new Map();
  this.difficulties = {
   easy: { timeLimit: 30000, minLength: 3 },
   medium: { timeLimit: 20000, minLength: 4 },
   hard: { timeLimit: 15000, minLength: 5 },
  };
 }

 async validateWord(word) {
  try {
   const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
   return response.status === 200;
  } catch {
   return false;
  }
 }

 createGame(chatId, difficulty = 'medium') {
  const settings = this.difficulties[difficulty];
  const game = new Game(settings.timeLimit, settings.minLength);
  this.games.set(chatId, game);
  return game;
 }

 getGame(chatId) {
  return this.games.get(chatId);
 }

 deleteGame(chatId) {
  this.games.delete(chatId);
 }
}

class Game {
 constructor(timeLimit, minLength) {
  this.players = new Set();
  this.currentPlayer = null;
  this.lastWord = '';
  this.usedWords = new Set();
  this.timeLimit = timeLimit;
  this.minLength = minLength;
  this.timer = null;
  this.score = new Map();
  this.status = 'waiting'; // waiting, active, ended
 }

 addPlayer(playerId) {
  if (this.status === 'waiting') {
   this.players.add(playerId);
   this.score.set(playerId, 0);
   return true;
  }
  return false;
 }

 start() {
  if (this.players.size < 2) return false;
  this.status = 'active';
  this.currentPlayer = Array.from(this.players)[0];
  return true;
 }

 async validateTurn(playerId, word) {
  if (this.status !== 'active' || playerId !== this.currentPlayer) {
   return { valid: false, reason: 'Not your turn' };
  }

  word = word.toLowerCase();

  if (word.length < this.minLength) {
   return { valid: false, reason: `Word must be at least ${this.minLength} characters long` };
  }

  if (this.usedWords.has(word)) {
   return { valid: false, reason: 'Word already used' };
  }

  if (this.lastWord && word[0] !== this.lastWord[this.lastWord.length - 1]) {
   return { valid: false, reason: `Word must start with '${this.lastWord[this.lastWord.length - 1]}'` };
  }

  const isValidWord = await wcg.validateWord(word);
  if (!isValidWord) {
   return { valid: false, reason: 'Not a valid English word' };
  }

  return { valid: true };
 }

 makeMove(playerId, word) {
  this.lastWord = word;
  this.usedWords.add(word);
  this.score.set(playerId, (this.score.get(playerId) || 0) + word.length);

  // Move to next player
  const players = Array.from(this.players);
  const currentIndex = players.indexOf(this.currentPlayer);
  this.currentPlayer = players[(currentIndex + 1) % players.length];

  // Reset timer
  if (this.timer) clearTimeout(this.timer);
  this.timer = setTimeout(() => this.endGame(), this.timeLimit);
 }

 endGame() {
  this.status = 'ended';
  if (this.timer) clearTimeout(this.timer);

  // Calculate winner
  let highestScore = 0;
  let winner = null;

  for (const [player, score] of this.score) {
   if (score > highestScore) {
    highestScore = score;
    winner = player;
   }
  }

  return {
   winner,
   scores: Object.fromEntries(this.score),
   totalWords: this.usedWords.size,
  };
 }
}

const wcg = new WordChainGame();

const { command } = require('../lib');

command(
 {
  pattern: 'wcg',
  desc: 'Word Chain Game',
  type: 'games',
 },
 async (message) => {
  const chatId = message.jid;
  let game = wcg.getGame(chatId);

  if (game && game.status !== 'ended') {
   return await message.reply('A game is already in progress!');
  }

  // Parse difficulty from message
  const args = message.text.split(' ');
  const difficulty = args[1] && ['easy', 'medium', 'hard'].includes(args[1].toLowerCase()) ? args[1].toLowerCase() : 'medium';

  game = wcg.createGame(chatId, difficulty);
  game.addPlayer(message.sender);

  return await message.reply(`Word Chain Game started (${difficulty} mode)!\n` + `Minimum word length: ${wcg.difficulties[difficulty].minLength}\n` + `Time limit per turn: ${wcg.difficulties[difficulty].timeLimit / 1000}s\n\n` + 'Type "join" to participate. Game starts when at least 2 players join.');
 }
);

command(
 {
  on: 'text',
 },
 async (message) => {
  const chatId = message.jid;
  const game = wcg.getGame(chatId);

  if (!game) return;

  const text = message.text.toLowerCase();

  // Handle join requests
  if (text === 'join' && game.status === 'waiting') {
   if (game.addPlayer(message.sender)) {
    await message.reply('You joined the game! Waiting for more players...');

    // Start game if enough players
    if (game.players.size >= 2) {
     game.start();
     return await message.reply(`Game started! First player ${game.currentPlayer}'s turn.\n` + `Start with any word of at least ${game.minLength} letters.`);
    }
   }
   return;
  }

  // Handle word submissions
  if (game.status === 'active') {
   const validation = await game.validateTurn(message.sender, text);

   if (!validation.valid) {
    return await message.reply(validation.reason);
   }

   game.makeMove(message.sender, text);

   await message.reply(`Valid word: ${text}\n` + `Next player ${game.currentPlayer}'s turn.\n` + `Word must start with: '${text[text.length - 1]}'`);

   // Check if game ended due to timeout
   if (game.status === 'ended') {
    const results = game.endGame();
    wcg.deleteGame(chatId);

    return await message.reply(`Game Over!\n` + `Winner: ${results.winner}\n` + `Scores: ${JSON.stringify(results.scores)}\n` + `Total words played: ${results.totalWords}`);
   }
  }
 }
);
