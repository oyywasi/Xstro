const { command } = require('../lib');
const randomWords = require('random-words');

const activeGames = {};

class WordGuessingGame {
  constructor(initialLetter, requiredLength, maxAttempts = 6) {
    this.initialLetter = initialLetter.toLowerCase();
    this.requiredLength = requiredLength;
    this.maxAttempts = maxAttempts;
    this.resetGame();
  }

  resetGame() {
    this.attemptsLeft = this.maxAttempts;
    this.gameOver = false;
    this.currentWord = '';
    this.generateNewWord();
  }

  generateNewWord() {
    const words = randomWords({ exactly: 10, wordsPerString: 1, minLength: this.requiredLength, maxLength: this.requiredLength });
    this.currentWord = words.find(word => word[0].toLowerCase() === this.initialLetter);
  }

  checkGuess(guess) {
    if (this.gameOver) return 'Game is over. Please start a new game.';
    
    guess = guess.toLowerCase();
    if (guess.length !== this.requiredLength || guess[0] !== this.initialLetter) {
      return `❌ Invalid guess! Please guess a valid word starting with "*${this.initialLetter}*" and having ${this.requiredLength} letters.`;
    }
    
    if (guess === this.currentWord) {
      const response = `✅ Correct guess! "${guess}" is a valid word. You still have ${this.attemptsLeft} attempts left.`;
      this.generateNewWord();
      return `${response} Guess a new word starting with "*${this.initialLetter}*".`;
    }
    
    this.attemptsLeft -= 1;
    if (this.attemptsLeft <= 0) {
      this.gameOver = true;
      return `🚫 No more attempts left! Game over. The word was "*${this.currentWord}*".`;
    }
    
    return `❌ Incorrect guess! You have ${this.attemptsLeft} attempts left.`;
  }

  getRemainingAttempts() { return this.attemptsLeft; }
  isGameOver() { return this.gameOver; }
  hasWon() { return this.won; }
  getInitialLetter() { return this.initialLetter; }
  getRequiredLength() { return this.requiredLength; }
}

function generateInitialLetterAndLength(level) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let requiredLength;
  switch (level) {
    case 'easy': requiredLength = 4; break;
    case 'medium': requiredLength = 6; break;
    case 'hard': requiredLength = 8; break;
    default: throw new Error('Invalid level. Please choose easy, medium, or hard.');
  }
  const randomIndex = Math.floor(Math.random() * alphabet.length);
  const initialLetter = alphabet[randomIndex];
  return { initialLetter, requiredLength };
}

function startGameTimer(chatId, message) {
  setTimeout(async () => {
    if (activeGames[chatId] && !activeGames[chatId].isGameOver()) {
      delete activeGames[chatId];
      await message.reply(`⏰ Time's up! You didn't guess the word correctly. The game is over.`);
    }
  }, 30000);
}

command(
  {
    pattern: 'wcg ?(easy|medium|hard)?',
    desc: 'play Word Guessing Game',
    type: 'games'
  },
  async (message, match) => {
    const chatId = message.jid;
    const level = match[1] || 'easy';
    try {
      const { initialLetter, requiredLength } = generateInitialLetterAndLength(level);
      activeGames[chatId] = new WordGuessingGame(initialLetter, requiredLength);
      await message.reply(`Word Guessing Game started on ${level} level! Guess a ${requiredLength}-letter word starting with "*${initialLetter}*". You have 30 seconds.`);
      startGameTimer(chatId, message);
    } catch (error) {
      await message.reply(`❌ ${error.message}`);
    }
  }
);

command(
  {
    on: 'text'
  },
  async (message) => {
    const chatId = message.jid;
    const guess = message.text.trim();
    if (!activeGames[chatId]) return;
    const game = activeGames[chatId];
    const result = game.checkGuess(guess);
    await message.reply(result);
    if (game.isGameOver()) {
      delete activeGames[chatId];
    }
  }
);
