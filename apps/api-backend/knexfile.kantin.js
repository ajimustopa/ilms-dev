const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function sanitizeHost(h) {
  return (h === 'localhost') ? '127.0.0.1' : h;
}

const config = {
  host: sanitizeHost(process.env.KANTIN_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
  port: Number(process.env.KANTIN_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.KANTIN_DB_USER || process.env.DB_USER || 'kantin_local',
  password: process.env.KANTIN_DB_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.KANTIN_DB_NAME || process.env.DB_NAME || 'kantin_local',
  migrationsDir: './db/migrations/kantin',
  migrationsTable: 'knex_migrations_kantin',
  seedsDir: './db/seeds/kantin',
};

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      charset: 'utf8mb4',
      ssl: (Number(dbPort) === 4000 || process.env.DB_SSL === 'true') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    },
    migrations: {
      directory: config.migrationsDir,
      tableName: config.migrationsTable,
      disableTransactions: true,
    },
    seeds: {
      directory: config.seedsDir,
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  production: {
    client: 'mysql2',
    connection: {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      charset: 'utf8mb4',
      ssl: (Number(dbPort) === 4000 || process.env.DB_SSL === 'true') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    },
    migrations: {
      directory: config.migrationsDir,
      tableName: config.migrationsTable,
      disableTransactions: true,
    },
    seeds: {
      directory: config.seedsDir,
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
