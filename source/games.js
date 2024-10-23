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

class TicTacToe {
 constructor() {
  this.games = new Map();
 }

 createGame(chatId) {
  const game = new Game();
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
 constructor() {
  this.board = Array(9).fill(null);
  this.players = { X: null, O: null };
  this.currentTurn = 'X';
  this.status = 'waiting'; // waiting, active, ended
  this.winner = null;
 }

 addPlayer(playerId) {
  if (this.status !== 'waiting') return false;

  if (!this.players.X) {
   this.players.X = playerId;
   return 'X';
  } else if (!this.players.O && playerId !== this.players.X) {
   this.players.O = playerId;
   this.status = 'active';
   return 'O';
  }
  return false;
 }

 makeMove(playerId, position) {
  // Check if it's a valid move
  if (this.status !== 'active') {
   return { valid: false, reason: 'Game is not active' };
  }

  if (playerId !== this.players[this.currentTurn]) {
   return { valid: false, reason: 'Not your turn' };
  }

  if (position < 1 || position > 9) {
   return { valid: false, reason: 'Invalid position (use 1-9)' };
  }

  const boardIndex = position - 1;
  if (this.board[boardIndex] !== null) {
   return { valid: false, reason: 'Position already taken' };
  }

  // Make the move
  this.board[boardIndex] = this.currentTurn;

  // Check for win or draw
  if (this.checkWin()) {
   this.status = 'ended';
   this.winner = this.currentTurn;
   return {
    valid: true,
    gameEnd: true,
    reason: 'win',
    winner: this.players[this.currentTurn],
   };
  }

  if (this.checkDraw()) {
   this.status = 'ended';
   return {
    valid: true,
    gameEnd: true,
    reason: 'draw',
   };
  }

  // Switch turns
  this.currentTurn = this.currentTurn === 'X' ? 'O' : 'X';
  return { valid: true };
 }

 checkWin() {
  const winPatterns = [
   [0, 1, 2],
   [3, 4, 5],
   [6, 7, 8], // Rows
   [0, 3, 6],
   [1, 4, 7],
   [2, 5, 8], // Columns
   [0, 4, 8],
   [2, 4, 6], // Diagonals
  ];

  return winPatterns.some((pattern) => {
   const [a, b, c] = pattern;
   return this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c];
  });
 }

 checkDraw() {
  return !this.board.includes(null);
 }

 renderBoard() {
  let display = '```\n';
  for (let i = 0; i < 9; i += 3) {
   display += ' ' + (this.board[i] || i + 1) + ' │ ' + (this.board[i + 1] || i + 2) + ' │ ' + (this.board[i + 2] || i + 3) + '\n';
   if (i < 6) {
    display += '───┼───┼───\n';
   }
  }
  display += '```';
  return display;
 }

 getStatus() {
  return {
   board: this.renderBoard(),
   currentTurn: this.currentTurn,
   currentPlayer: this.players[this.currentTurn],
   status: this.status,
  };
 }
}

const ttt = new TicTacToe();

command(
 {
  pattern: 'ttt',
  desc: 'Tic Tac Toe Game',
  type: 'games',
 },
 async (message) => {
  const chatId = message.chat;
  let game = ttt.getGame(chatId);

  if (game && game.status !== 'ended') {
   return await message.reply('A game is already in progress!\n' + game.renderBoard());
  }

  game = ttt.createGame(chatId);
  const symbol = game.addPlayer(message.sender);

  return await message.reply('Tic Tac Toe game started!\n\n' + 'How to play:\n' + '1. Use numbers 1-9 to place your mark\n' + '2. First player to get 3 in a row wins\n\n' + `${message.sender} joined as ${symbol}\n` + 'Type "join" to play against them!\n\n' + game.renderBoard());
 }
);

command(
 {
  on: 'text',
 },
 async (message) => {
  try {
   const chatId = message.chat;
   const game = ttt.getGame(chatId);

   if (!game) return;

   const text = message.text.toLowerCase();

   // Handle join requests
   if (text === 'join' && game.status === 'waiting') {
    const symbol = game.addPlayer(message.sender);
    if (symbol) {
     return await message.reply(`${message.sender} joined as ${symbol}\n` + 'Game starts now!\n\n' + `${game.players.X} (X) goes first\n` + game.renderBoard());
    }
    return;
   }

   // Handle moves
   if (game.status === 'active') {
    const position = parseInt(text);
    if (isNaN(position)) return; // Not a number, ignore

    const result = game.makeMove(message.sender, position);

    if (!result.valid) {
     return await message.reply(result.reason);
    }

    if (result.gameEnd) {
     ttt.deleteGame(chatId);
     if (result.reason === 'win') {
      return await message.reply(`Game Over! ${message.sender} wins!\n\n` + game.renderBoard());
     } else {
      return await message.reply("Game Over! It's a draw!\n\n" + game.renderBoard());
     }
    }

    return await message.reply(`${message.sender} placed ${game.currentTurn === 'X' ? 'O' : 'X'} at position ${position}\n` + `${game.players[game.currentTurn]}'s turn (${game.currentTurn})\n\n` + game.renderBoard());
   }
  } catch (error) {
   console.error('Tic Tac Toe error:', error);
   return await message.reply('An error occurred. Please try again or start a new game.');
  }
 }
);
