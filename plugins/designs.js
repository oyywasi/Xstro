// const { handler } = require('../lib');

// const { heartDesign, weatherDesign, gemDesign, treeDesign, musicDesign, sportDesign, toolDesign, holidayDesign, dessertDesign, travelDesign, spaceDesign, fashionDesign, beverageDesign, instrumentDesign, gameDesign, emojiArtDesign, partyDesign, holidaySeasonDesign, fitnessDesign, technologyDesign, animalEmojiDesign, kissDesign, hugDesign, slapDesign, callConversation } = require('../lib');

// handler(
//  {
//   pattern: 'hrt',
//   desc: 'Heart Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await heartDesign(message);
//  }
// );
// handler(
//  {
//   pattern: 'wth',
//   desc: 'Weather Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await weatherDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'gem',
//   desc: 'Gem Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await gemDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'tree',
//   desc: 'Tree Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await treeDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'msc',
//   desc: 'Music Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await musicDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'sts',
//   desc: 'Sport Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await sportDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'tls',
//   desc: 'Tool Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await toolDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'holi',
//   desc: 'Holiday Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await holidayDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'desi',
//   desc: 'Dessert Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await dessertDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'trv',
//   desc: 'Travel Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await travelDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'spc',
//   desc: 'Space Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await spaceDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'fas',
//   desc: 'Fashion Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await fashionDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'bev',
//   desc: 'Beverage Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await beverageDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'ist',
//   desc: 'Instrument Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await instrumentDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'gs',
//   desc: 'Game Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await gameDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'ert',
//   desc: 'Emoji Art Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await emojiArtDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'pty',
//   desc: 'Party Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await partyDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'hol',
//   desc: 'Holiday Season Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await holidaySeasonDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'fit',
//   desc: 'Fitness Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await fitnessDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'tec',
//   desc: 'Technology Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await technologyDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'ani',
//   desc: 'Animal Emoji Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await animalEmojiDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'kiss',
//   desc: 'Kiss Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await kissDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'hug',
//   desc: 'Hug Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await hugDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'slap',
//   desc: 'Slap Designs',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await slapDesign(message);
//  }
// );

// handler(
//  {
//   pattern: 'call',
//   desc: 'Initiate a call conversation',
//   type: 'designs',
//  },
//  async (message) => {
//   if (!message.mode) return;
//   if (message.isban) return message.reply(ban);
//   await callConversation(message);
//  }
// );
