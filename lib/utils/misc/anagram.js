class AnagramGame {
 constructor() {
  this.games = new Map();
  this.difficultySettings = {
   easy: {
    maxHints: 3,
    wordLength: { min: 4, max: 6 },
    timeLimit: 90000, // 90 seconds
    maxAttempts: 5,
   },
   medium: {
    maxHints: 2,
    wordLength: { min: 6, max: 8 },
    timeLimit: 60000, // 60 seconds
    maxAttempts: 3,
   },
   hard: {
    maxHints: 1,
    wordLength: { min: 8, max: 12 },
    timeLimit: 45000, // 45 seconds
    maxAttempts: 2,
   },
  };
 }

 async getRandomWordFromAPI(difficulty) {
  try {
   const settings = this.difficultySettings[difficulty];
   const minLength = settings.wordLength.min;
   const maxLength = settings.wordLength.max;

   // Using Random Word API (no API key required)
   const response = await fetch(`https://random-word-api.herokuapp.com/word?length=${maxLength}`);

   if (!response.ok) {
    throw new Error('Failed to fetch word from API');
   }

   const [word] = await response.json();

   // Get definition from Free Dictionary API
   const defResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);

   let definition = 'No definition available';
   if (defResponse.ok) {
    const defData = await defResponse.json();
    definition = defData[0]?.meanings[0]?.definitions[0]?.definition || 'No definition available';
   }

   return { word, definition };
  } catch (error) {
   return this.getRandomWordFallback(difficulty);
  }
 }

 getRandomWordFallback(difficulty) {
  const wordsByDifficulty = {
   easy: [
    { word: 'code', definition: 'Instructions for a computer' },
    { word: 'byte', definition: 'A unit of digital information' },
    { word: 'data', definition: 'Facts and statistics collected' },
    { word: 'game', definition: 'An activity for entertainment' },
    { word: 'word', definition: 'A single unit of language' },
    { word: 'play', definition: 'Engage in activity for enjoyment' },
    { word: 'quiz', definition: 'A test of knowledge' },
    { word: 'text', definition: 'Written or printed words' },
   ],
   medium: [
    { word: 'python', definition: 'A popular programming language' },
    { word: 'server', definition: 'A computer that provides data' },
    { word: 'script', definition: 'A program written for software' },
    { word: 'coding', definition: 'The process of programming' },
    { word: 'system', definition: 'A set of connected things' },
    { word: 'binary', definition: 'A number system using only 0 and 1' },
    { word: 'syntax', definition: 'The arrangement of words and phrases' },
    { word: 'function', definition: 'A piece of code that performs a task' },
   ],
   hard: [
    { word: 'algorithm', definition: 'A process or set of rules to be followed' },
    { word: 'database', definition: 'A structured set of data' },
    { word: 'framework', definition: 'A basic structure underlying a system' },
    { word: 'variable', definition: 'A value that can change' },
    { word: 'compiler', definition: 'A program that converts code to machine language' },
    { word: 'interface', definition: 'A point where two systems meet and interact' },
    { word: 'protocol', definition: 'A set of rules governing data exchange' },
    { word: 'recursive', definition: 'Involving repeated application of a procedure' },
   ],
  };

  const words = wordsByDifficulty[difficulty];
  return words[Math.floor(Math.random() * words.length)];
 }

 shuffleWord(word) {
  let shuffled = word
   .split('')
   .sort(() => Math.random() - 0.5)
   .join('');

  // Make sure shuffled word is different from original
  while (shuffled === word) {
   shuffled = word
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
  }
  return shuffled;
 }

 async startGame(jid, difficulty = 'medium') {
  // Check if there's a game active in another chat
  if (global.activeGameJid && global.activeGameJid !== jid) {
   throw new Error('There is already an active game in another chat.');
  }

  if (!this.difficultySettings[difficulty]) {
   difficulty = 'medium';
  }

  const settings = this.difficultySettings[difficulty];

  // Get random word and definition
  const { word, definition } = await this.getRandomWordFromAPI(difficulty);
  const scrambled = this.shuffleWord(word);

  // Clear any existing game for this chat
  if (this.games.has(jid)) {
   clearTimeout(this.games.get(jid).timeout);
  }

  const gameState = {
   word: word,
   definition: definition,
   scrambled: scrambled,
   attempts: 0,
   hintsGiven: 0,
   difficulty: difficulty,
   maxHints: settings.maxHints,
   maxAttempts: settings.maxAttempts,
   timeout: setTimeout(() => {
    if (this.games.has(jid)) {
     this.endGame(jid, 'timeout');
    }
   }, settings.timeLimit),
   startTime: Date.now(),
   timeLimit: settings.timeLimit,
  };

  this.games.set(jid, gameState);
  global.activeGameJid = jid;

  return {
   scrambled,
   length: word.length,
   difficulty,
   timeLimit: settings.timeLimit / 1000,
   maxAttempts: settings.maxAttempts,
  };
 }

 getHint(jid) {
  if (jid !== global.activeGameJid) {
   return {
    status: 'wrong_chat',
    message: 'This game is active in another chat!',
   };
  }

  const game = this.games.get(jid);
  if (!game) {
   return {
    status: 'no_game',
    message: 'No active game found in this chat!',
   };
  }

  if (game.hintsGiven >= game.maxHints) {
   return {
    status: 'hint_limit',
    message: `❌ No more hints available in ${game.difficulty} mode! (${game.hintsGiven}/${game.maxHints} used)`,
   };
  }

  game.hintsGiven++;
  const hintsRemaining = game.maxHints - game.hintsGiven;

  let hintMessage;
  switch (game.hintsGiven) {
   case 1:
    hintMessage = `📖 Definition: ${game.definition}`;
    break;
   case 2:
    hintMessage = `🔤 The word starts with '${game.word[0]}' and ends with '${game.word[game.word.length - 1]}'`;
    break;
   case 3:
    const vowels = (game.word.match(/[aeiou]/gi) || []).length;
    const consonants = game.word.length - vowels;
    hintMessage = `📏 The word has ${vowels} vowels and ${consonants} consonants`;
    break;
  }

  return {
   status: 'hint',
   message: `${hintMessage}\n(${hintsRemaining} hints remaining)`,
  };
 }

 checkGuess(jid, text) {
  if (jid !== global.activeGameJid) {
   return {
    status: 'wrong_chat',
    message: 'This game is active in another chat!',
   };
  }

  const game = this.games.get(jid);
  if (!game) {
   return {
    status: 'no_game',
    message: 'No active game found in this chat!',
   };
  }

  const guess = String(text).trim().toLowerCase();
  game.attempts++;
  const attemptsLeft = game.maxAttempts - game.attempts;

  if (guess === game.word.toLowerCase()) {
   clearTimeout(game.timeout);
   const score = this.calculateScore(game);
   const timeTaken = Math.floor((Date.now() - game.startTime) / 1000);
   this.games.delete(jid);
   global.activeGameJid = null;

   return {
    status: 'win',
    message: `🎉 Correct! You solved it in ${game.attempts} attempts!\n` + `Word: ${game.word}\nDefinition: ${game.definition}\n` + `Difficulty: ${game.difficulty}\n` + `Time taken: ${timeTaken} seconds\n` + `Score: ${score} points\n` + `Hints used: ${game.hintsGiven}/${game.maxHints}`,
   };
  }

  if (attemptsLeft <= 0) {
   return this.endGame(jid, 'fail');
  }

  return {
   status: 'wrong',
   message: `Wrong guess! You have ${attemptsLeft} attempts left.`,
  };
 }

 calculateScore(game) {
  const difficultyMultiplier = {
   easy: 1,
   medium: 1.5,
   hard: 2,
  };

  const baseScore = 100;
  const attemptsPenalty = game.attempts * 10;
  const hintsPenalty = game.hintsGiven * 20;
  const timePenalty = Math.floor((Date.now() - game.startTime) / 1000) * 2;

  return Math.max(Math.floor((baseScore - attemptsPenalty - hintsPenalty - timePenalty) * difficultyMultiplier[game.difficulty]), 10);
 }

 endGame(jid, reason) {
  const game = this.games.get(jid);
  if (!game) return null;

  clearTimeout(game.timeout);
  this.games.delete(jid);
  global.activeGameJid = null;

  if (reason === 'timeout') {
   return {
    status: 'timeout',
    message: `⏰ Time's up! The word was: ${game.word}\nDefinition: ${game.definition}`,
   };
  } else if (reason === 'fail') {
   return {
    status: 'fail',
    message: `❌ Game Over! You've run out of attempts.\nThe word was: ${game.word}\nDefinition: ${game.definition}`,
   };
  }
 }

 forceEndGame(jid) {
  const game = this.games.get(jid);
  if (game) {
   clearTimeout(game.timeout);
   this.games.delete(jid);
   if (global.activeGameJid === jid) {
    global.activeGameJid = null;
   }
   return true;
  }
  return false;
 }

 hasActiveGame(jid) {
  return this.games.has(jid);
 }

 getGameState(jid) {
  return this.games.get(jid);
 }
}

module.exports = AnagramGame;
