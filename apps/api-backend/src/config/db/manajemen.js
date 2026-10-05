/**
 * Knex Database Connection Instance for Manajemen Module
 */
const knex = require('knex');
try {
  require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
} catch (e) {}

function getDbHost() {
  const h = process.env.MANAJEMEN_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  return (h === 'localhost') ? '127.0.0.1' : h;
}

const dbUser = process.env.MANAJEMEN_DB_USER || process.env.DB_USER || 'manajemen_local';
const dbPassword = process.env.MANAJEMEN_DB_PASSWORD || process.env.DB_PASSWORD || '';
const dbName = process.env.MANAJEMEN_DB_NAME || process.env.DB_NAME || 'manajemen_local';
const dbPort = Number(process.env.MANAJEMEN_PORT || process.env.MANAJEMEN_DB_PORT || process.env.DB_PORT || 3306);

let knexConfig;
try {
  knexConfig = require('../../../knexfile.manajemen');
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
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        ssl: (Number(dbPort) === 4000 || process.env.DB_SSL === 'true') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
      },
      pool: { min: 0, max: 10, idleTimeoutMillis: 30000, acquireTimeoutMillis: 30000 },
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
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        ssl: (Number(dbPort) === 4000 || process.env.DB_SSL === 'true') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
      },
      pool: { min: 0, max: 10, idleTimeoutMillis: 30000, acquireTimeoutMillis: 30000 },
    }
  };
}

const environment = process.env.MANAJEMEN_NODE_ENV || process.env.NODE_ENV || 'development';
const config = knexConfig[environment] || knexConfig.development || knexConfig.production;

const db = knex(config);

module.exports = db;
