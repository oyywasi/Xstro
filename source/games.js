const axios = require('axios');

class WordChainGame {
 constructor() {
  this.games = new Map();
  this.difficulties = {
   easy: { turnTime: 60, minLength: 3 }, // 60 seconds per turn
   medium: { turnTime: 45, minLength: 4 }, // 45 seconds per turn
   hard: { turnTime: 30, minLength: 5 }, // 30 seconds per turn
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
  const game = new Game(settings.turnTime, settings.minLength);
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
 constructor(turnTime, minLength) {
  this.players = new Set();
  this.currentPlayer = null;
  this.lastWord = '';
  this.usedWords = new Set();
  this.turnTime = turnTime; // Time in seconds per turn
  this.minLength = minLength;
  this.score = new Map();
  this.status = 'waiting'; // waiting, active
  this.currentTurnStartTime = null;
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
  this.currentTurnStartTime = Date.now();
  return true;
 }

 getTimeElapsedInCurrentTurn() {
  if (!this.currentTurnStartTime) return 0;
  return Math.floor((Date.now() - this.currentTurnStartTime) / 1000);
 }

 getTimeRemainingInCurrentTurn() {
  const elapsed = this.getTimeElapsedInCurrentTurn();
  return Math.max(0, this.turnTime - elapsed);
 }

 async validateTurn(playerId, word) {
  if (this.status !== 'active') {
   return { valid: false, reason: 'Game is not active' };
  }

  if (playerId !== this.currentPlayer) {
   return { valid: false, reason: 'Not your turn' };
  }

  const timeElapsed = this.getTimeElapsedInCurrentTurn();
  if (timeElapsed > this.turnTime) {
   return {
    valid: false,
    reason: `Time's up! You took ${timeElapsed} seconds. Moving to next player.`,
    skipTurn: true,
   };
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

  try {
   const isValidWord = await wcg.validateWord(word);
   if (!isValidWord) {
    return { valid: false, reason: 'Not a valid English word' };
   }
  } catch (error) {
   console.error('Word validation error:', error);
   return { valid: false, reason: 'Error validating word. Please try again.' };
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
  this.currentTurnStartTime = Date.now();
 }

 skipCurrentTurn() {
  const players = Array.from(this.players);
  const currentIndex = players.indexOf(this.currentPlayer);
  this.currentPlayer = players[(currentIndex + 1) % players.length];
  this.currentTurnStartTime = Date.now();
 }

 getGameStatus() {
  return {
   currentPlayer: this.currentPlayer,
   scores: Object.fromEntries(this.score),
   totalWords: this.usedWords.size,
   lastWord: this.lastWord,
   timeRemaining: this.getTimeRemainingInCurrentTurn(),
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

  if (game && game.status === 'active') {
   return await message.reply('A game is already in progress!');
  }

  const args = message.text.split(' ');
  const difficulty = args[1] && ['easy', 'medium', 'hard'].includes(args[1].toLowerCase()) ? args[1].toLowerCase() : 'medium';

  game = wcg.createGame(chatId, difficulty);
  game.addPlayer(message.sender);

  return await message.reply(`Word Chain Game started (${difficulty} mode)!\n` + `Minimum word length: ${game.minLength} letters\n` + `Time per turn: ${game.turnTime} seconds\n\n` + 'Type "join" to participate. Game starts when at least 2 players join.');
 }
);

command(
 {
  on: 'text',
 },
 async (message) => {
  try {
   const chatId = message.jid;
   const game = wcg.getGame(chatId);

   if (!game) return;

   const text = message.text.toLowerCase();

   // Handle join requests
   if (text === 'join' && game.status === 'waiting') {
    if (game.addPlayer(message.sender)) {
     await message.reply('You joined the game! Waiting for more players...');

     if (game.players.size >= 2) {
      game.start();
      return await message.reply(`Game started! First player ${game.currentPlayer}'s turn.\n` + `Start with any word of at least ${game.minLength} letters.\n` + `You have ${game.turnTime} seconds per turn.`);
     }
    }
    return;
   }

   // Handle word submissions
   if (game.status === 'active') {
    const validation = await game.validateTurn(message.sender, text);

    if (!validation.valid) {
     if (validation.skipTurn) {
      game.skipCurrentTurn();
      return await message.reply(`${validation.reason}\n` + `Next player ${game.currentPlayer}'s turn.\n` + `Current word to follow: '${game.lastWord}'\n` + `Time remaining: ${game.getTimeRemainingInCurrentTurn()} seconds`);
     }
     return await message.reply(validation.reason);
    }

    game.makeMove(message.sender, text);

    return await message.reply(`Valid word: ${text}\n` + `Next player ${game.currentPlayer}'s turn.\n` + `Word must start with: '${text[text.length - 1]}'\n` + `Time remaining: ${game.turnTime} seconds`);
   }
  } catch (error) {
   console.error('Word Chain Game error:', error);
   return await message.reply('An error occurred. Please try again.');
  }
 }
);
