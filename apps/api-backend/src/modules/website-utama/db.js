/**
 * Knex Database Connection Instance for Website Utama & PPDB Module
 */
const knex = require('knex');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

function getDbHost() {
  const h = process.env.WEBSITEUTAMA_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  return (h === 'localhost') ? '127.0.0.1' : h;
}

const dbUser = process.env.WEBSITEUTAMA_DB_USER || 'websiteutama_local';
const dbPassword = process.env.WEBSITEUTAMA_DB_PASSWORD || '';
const dbName = process.env.WEBSITEUTAMA_DB_NAME || 'websiteutama_local';
const dbPort = Number(process.env.WEBSITEUTAMA_PORT || process.env.WEBSITEUTAMA_DB_PORT || 3306);

let knexConfig;
try {
  knexConfig = require('../../../knexfile.website-utama');
} catch (e) {
  knexConfig = null;
}

const config = knexConfig ? (knexConfig[process.env.NODE_ENV || 'development'] || knexConfig.development) : {
  client: 'mysql2',
  connection: {
    host: getDbHost(),
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    charset: 'utf8mb4',
  },
  pool: { min: 2, max: 10 },
};

const db = knex(config);

module.exports = db;
