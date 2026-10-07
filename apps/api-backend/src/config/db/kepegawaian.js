const fs = require('fs');
const path = require('path');
const knex = require('knex');
const { assertDevDatabase } = require('./dbGuard');

try {
  const devEnvPath = path.join(__dirname, '../../../.env.dev');
  const rootDevEnvPath = path.join(__dirname, '../../../../.env.dev');
  if (fs.existsSync(devEnvPath)) {
    require('dotenv').config({ path: devEnvPath, override: true });
  } else if (fs.existsSync(rootDevEnvPath)) {
    require('dotenv').config({ path: rootDevEnvPath, override: true });
  } else {
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
  }
} catch (e) {}

function getDbHost() {
  const h = process.env.KEPEGAWAIAN_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  return (h === 'localhost') ? '127.0.0.1' : h;
}

const dbUser = process.env.KEPEGAWAIAN_DB_USER || process.env.DB_USER || 'root';
const dbPassword = process.env.KEPEGAWAIAN_DB_PASSWORD || process.env.DB_PASSWORD || '';
const dbName = process.env.KEPEGAWAIAN_DB_NAME || process.env.DB_NAME || 'kepegawaian_dev';
const dbPort = Number(process.env.KEPEGAWAIAN_DB_PORT || process.env.DB_PORT || 3306);

let knexConfig;
try {
  knexConfig = require('../../../knexfile.kepegawaian');
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

const environment = process.env.KEPEGAWAIAN_NODE_ENV || process.env.NODE_ENV || 'development';
const config = knexConfig[environment] || knexConfig.development || knexConfig.production;

const db = knex(config);

module.exports = db;
