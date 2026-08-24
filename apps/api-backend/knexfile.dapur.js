const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function getDbHost() {
  const h = process.env.DAPUR_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  return (h === 'localhost') ? '127.0.0.1' : h;
}

const dbUser = process.env.DAPUR_DB_USER || process.env.DB_USER || 'dapur_local';
const dbPassword = process.env.DAPUR_DB_PASSWORD || process.env.DB_PASSWORD || '';
const dbName = process.env.DAPUR_DB_NAME || process.env.DB_NAME || 'dapur_local';
const dbPort = Number(process.env.DAPUR_PORT || process.env.DAPUR_DB_PORT || process.env.DB_PORT || 3306);

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
      directory: path.join(__dirname, 'db', 'migrations', 'dapur'),
      tableName: 'knex_migrations_dapur',
    },
    seeds: {
      directory: path.join(__dirname, 'db', 'seeds', 'dapur'),
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
      directory: path.join(__dirname, 'db', 'migrations', 'dapur'),
      tableName: 'knex_migrations_dapur',
    },
    seeds: {
      directory: path.join(__dirname, 'db', 'seeds', 'dapur'),
    },
    pool: { min: 2, max: 10 },
  },
};
