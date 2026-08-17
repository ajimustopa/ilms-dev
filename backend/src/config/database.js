/**
 * Knex Database Connection Instance
 */
const knex = require('knex');
require('dotenv').config();

function getDbHost() {
  const h = process.env.CORE_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  return (h === 'localhost') ? '127.0.0.1' : h;
}

const dbUser = process.env.CORE_DB_USER || process.env.DB_USER || 'u622997391_core';
const dbPassword = process.env.CORE_DB_PASSWORD || process.env.DB_PASSWORD || '';
const dbName = process.env.CORE_DB_NAME || process.env.DB_NAME || 'u622997391_dbcore';
const dbPort = Number(process.env.CORE_DB_PORT || process.env.DB_PORT || 3306);

let knexConfig;
try {
  knexConfig = require('../../knexfile');
} catch (e) {
  knexConfig = {
    production: {
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
    },
    development: {
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
    }
  };
}

const environment = process.env.CORE_NODE_ENV || process.env.NODE_ENV || 'production';
const config = knexConfig[environment] || knexConfig.production || knexConfig.development;

const db = knex(config);

module.exports = db;
