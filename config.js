const { Sequelize } = require('sequelize');
require('dotenv').config();
const env = (key, def) => process.env[key] || def;
const DB_URL = env('DATABASE_URL', './database.db');

let sequelize;
if (DB_URL === './database.db' || !DB_URL.startsWith('postgres://')) {
 sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.db',
  logging: false,
 });
} else {
 sequelize = new Sequelize(DB_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  ssl: true,
  dialectOptions: {
   ssl: { require: true, rejectUnauthorized: false },
  },
  logging: false,
 });
}

module.exports = {
 BOT_INFO: process.env.BOT_INFO || 'Astro;Xstro',
 LOG_MESSAGES: process.env.LOG_MESSAGES || true,
 SESSION_ID: process.env.SESSION_ID || '',
 PREFIX: process.env.HANDLER || '.',
 ANTI_CALL: process.env.ANTI_CALL || 'false',
 STICKER_PACK: process.env.STICKER_PACK || 'Astro;Xstro',
 WARN_COUNT: 3,
 ADMIN_GROUP: process.env.ADMIN_GROUP || null,
 GROUP_WELCOME: process.env.GROUP_WELCOME || 'welcome',
 AUTO_READ: process.env.AUTO_READ || false,
 DEBUG: process.env.DEBUG || 'silent',
 MARK_ONLINE_ON_CONNECT: process.env.MARK_ONLINE_ON_CONNECT || false,
 SUDO: process.env.SUDO || '',
 AUTO_READ_MESSAGE: process.env.AUTO_READ || false,
 AUTO_STATUS_READ: process.env.AUTO_STATUS_READ || false,
 PRESENCE_UPDATE: process.env.PRESENCE_UPDATE || 'available',
 MODE: process.env.MODE || 'private',
 DATABASE_URL: DB_URL,
 DATABASE: sequelize,
};
