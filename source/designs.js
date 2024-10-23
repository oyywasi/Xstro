const { command } = require('../lib');

const { heartDesign, weatherDesign, gemDesign, treeDesign, musicDesign, sportDesign, toolDesign, holidayDesign, dessertDesign, travelDesign, spaceDesign, fashionDesign, beverageDesign, instrumentDesign, gameDesign, emojiArtDesign, partyDesign, holidaySeasonDesign, fitnessDesign, technologyDesign, animalEmojiDesign, kissDesign, hugDesign, slapDesign } = require('../lib/misc/designs');

command(
 {
  pattern: 'hrt',
  desc: 'Heart Designs',
  type: 'designs',
 },
 async (message) => {
  await heartDesign(message);
 }
);
command(
 {
  pattern: 'wth',
  desc: 'Weather Designs',
  type: 'designs',
 },
 async (message) => {
  await weatherDesign(message);
 }
);

command(
 {
  pattern: 'gem',
  desc: 'Gem Designs',
  type: 'designs',
 },
 async (message) => {
  await gemDesign(message);
 }
);

command(
 {
  pattern: 'tree',
  desc: 'Tree Designs',
  type: 'designs',
 },
 async (message) => {
  await treeDesign(message);
 }
);

command(
 {
  pattern: 'msc',
  desc: 'Music Designs',
  type: 'designs',
 },
 async (message) => {
  await musicDesign(message);
 }
);

command(
 {
  pattern: 'sts',
  desc: 'Sport Designs',
  type: 'designs',
 },
 async (message) => {
  await sportDesign(message);
 }
);

command(
 {
  pattern: 'tls',
  desc: 'Tool Designs',
  type: 'designs',
 },
 async (message) => {
  await toolDesign(message);
 }
);

command(
 {
  pattern: 'holi',
  desc: 'Holiday Designs',
  type: 'designs',
 },
 async (message) => {
  await holidayDesign(message);
 }
);

command(
 {
  pattern: 'desi',
  desc: 'Dessert Designs',
  type: 'designs',
 },
 async (message) => {
  await dessertDesign(message);
 }
);

command(
 {
  pattern: 'trv',
  desc: 'Travel Designs',
  type: 'designs',
 },
 async (message) => {
  await travelDesign(message);
 }
);

command(
 {
  pattern: 'spc',
  desc: 'Space Designs',
  type: 'designs',
 },
 async (message) => {
  await spaceDesign(message);
 }
);

command(
 {
  pattern: 'fas',
  desc: 'Fashion Designs',
  type: 'designs',
 },
 async (message) => {
  await fashionDesign(message);
 }
);

command(
 {
  pattern: 'bev',
  desc: 'Beverage Designs',
  type: 'designs',
 },
 async (message) => {
  await beverageDesign(message);
 }
);

command(
 {
  pattern: 'ist',
  desc: 'Instrument Designs',
  type: 'designs',
 },
 async (message) => {
  await instrumentDesign(message);
 }
);

command(
 {
  pattern: 'gs',
  desc: 'Game Designs',
  type: 'designs',
 },
 async (message) => {
  await gameDesign(message);
 }
);

command(
 {
  pattern: 'ert',
  desc: 'Emoji Art Designs',
  type: 'designs',
 },
 async (message) => {
  await emojiArtDesign(message);
 }
);

command(
 {
  pattern: 'pty',
  desc: 'Party Designs',
  type: 'designs',
 },
 async (message) => {
  await partyDesign(message);
 }
);

command(
 {
  pattern: 'hol',
  desc: 'Holiday Season Designs',
  type: 'designs',
 },
 async (message) => {
  await holidaySeasonDesign(message);
 }
);

command(
 {
  pattern: 'fit',
  desc: 'Fitness Designs',
  type: 'designs',
 },
 async (message) => {
  await fitnessDesign(message);
 }
);

command(
 {
  pattern: 'tec',
  desc: 'Technology Designs',
  type: 'designs',
 },
 async (message) => {
  await technologyDesign(message);
 }
);

command(
 {
  pattern: 'ani',
  desc: 'Animal Emoji Designs',
  type: 'designs',
 },
 async (message) => {
  await animalEmojiDesign(message);
 }
);

command(
 {
  pattern: 'kiss',
  desc: 'Kiss Designs',
 },
 async (message) => {
  await kissDesign(message);
 }
);

command(
 {
  pattern: 'hug',
  desc: 'Hug Designs',
 },
 async (message) => {
  await hugDesign(message);
 }
);

command(
 {
  pattern: 'slap',
  desc: 'Slap Designs',
 },
 async (message) => {
  await slapDesign(message);
 }
);
