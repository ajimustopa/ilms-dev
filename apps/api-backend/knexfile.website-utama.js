/**
 * Knex Configuration for Website Utama & PPDB Module
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function getDbHost() {
  const h = process.env.WEBSITE_UTAMA_DB_HOST || process.env.WEBSITEUTAMA_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  return (h === 'localhost') ? '127.0.0.1' : h;
}

const dbUser = process.env.WEBSITE_UTAMA_DB_USER || process.env.WEBSITEUTAMA_DB_USER || process.env.DB_USER || 'websiteutama_local';
const dbPassword = process.env.WEBSITE_UTAMA_DB_PASSWORD || process.env.WEBSITEUTAMA_DB_PASSWORD || process.env.DB_PASSWORD || '';
const dbName = process.env.WEBSITE_UTAMA_DB_NAME || process.env.WEBSITEUTAMA_DB_NAME || process.env.DB_NAME || 'websiteutama_local';
const dbPort = Number(process.env.WEBSITE_UTAMA_DB_PORT || process.env.WEBSITEUTAMA_DB_PORT || process.env.DB_PORT || 3306);

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
      directory: './db/migrations/website-utama',
      tableName: 'knex_migrations_website_utama',
      disableTransactions: true,
    },
    seeds: {
      directory: './db/seeds/website-utama',
    },
    pool: { min: 2, max: 10 },
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
      directory: './db/migrations/website-utama',
      tableName: 'knex_migrations_website_utama',
      disableTransactions: true,
    },
    seeds: {
      directory: './db/seeds/website-utama',
    },
    pool: { min: 2, max: 10 },
  },
};
