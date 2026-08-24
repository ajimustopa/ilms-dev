const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function getDbHost() {
  const h = process.env.KEPEGAWAIAN_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  return (h === 'localhost') ? '127.0.0.1' : h;
}

const dbUser = process.env.KEPEGAWAIAN_DB_USER || process.env.DB_USER || 'kepegawaian_local';
const dbPassword = process.env.KEPEGAWAIAN_DB_PASSWORD || process.env.DB_PASSWORD || '';
const dbName = process.env.KEPEGAWAIAN_DB_NAME || process.env.DB_NAME || 'kepegawaian_local';
const dbPort = Number(process.env.KEPEGAWAIAN_DB_PORT || process.env.DB_PORT || 3306);

/**
 * Knexfile Configuration for Kepegawaian Module MariaDB in Modular Monorepo
 */
module.exports = {
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
    migrations: {
      directory: './db/migrations/kepegawaian',
      tableName: 'knex_migrations_kepegawaian',
      disableTransactions: true,
    },
    seeds: {
      directory: './db/seeds/kepegawaian',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

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
    migrations: {
      directory: './db/migrations/kepegawaian',
      tableName: 'knex_migrations_kepegawaian',
      disableTransactions: true,
    },
    seeds: {
      directory: './db/seeds/kepegawaian',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
