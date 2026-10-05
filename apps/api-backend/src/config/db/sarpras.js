/**
 * Knex Database Connection Instance for Sarpras Module
 */
const knex = require('knex');
try {
  require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
} catch (e) {}

function getDbHost() {
  const h = process.env.SARPRAS_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  return (h === 'localhost') ? '127.0.0.1' : h;
}

const dbUser = process.env.SARPRAS_DB_USER || process.env.DB_USER || 'sarpras_local';
const dbPassword = process.env.SARPRAS_DB_PASSWORD || process.env.DB_PASSWORD || '';
const dbName = process.env.SARPRAS_DB_NAME || process.env.DB_NAME || 'sarpras_local';
const dbPort = Number(process.env.SARPRAS_PORT || process.env.SARPRAS_DB_PORT || process.env.DB_PORT || 3306);

let knexConfig;
try {
  knexConfig = require('../../../knexfile.sarpras');
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
        ssl: (Number(dbPort) === 4000 || process.env.DB_SSL === 'true') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
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
        ssl: (Number(dbPort) === 4000 || process.env.DB_SSL === 'true') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
      },
      pool: { min: 2, max: 10 },
    },
  };
}

const env = process.env.NODE_ENV || 'development';
const config = knexConfig[env] || knexConfig.development;

const db = knex(config);

module.exports = db;
