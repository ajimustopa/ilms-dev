const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function getDbHost() {
  const h = process.env.CORE_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  return (h === 'localhost') ? '127.0.0.1' : h;
}

const dbUser = process.env.CORE_DB_USER || process.env.DB_USER || 'core_local';
const dbPassword = process.env.CORE_DB_PASSWORD || process.env.DB_PASSWORD || '';
const dbName = process.env.CORE_DB_NAME || process.env.DB_NAME || 'core_local';
const dbPort = Number(process.env.CORE_DB_PORT || process.env.DB_PORT || 3306);

/**
 * Knexfile Configuration for Core Service MariaDB in Modular Monorepo
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
    },
    migrations: {
      directory: './db/migrations/core',
      tableName: 'knex_migrations_core',
    },
    seeds: {
      directory: './db/seeds/core',
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
    },
    migrations: {
      directory: './db/migrations/core',
      tableName: 'knex_migrations_core',
    },
    seeds: {
      directory: './db/seeds/core',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
