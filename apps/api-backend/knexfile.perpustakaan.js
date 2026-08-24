const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function getDbHost() {
  const h = process.env.PERPUSTAKAAN_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  return (h === 'localhost') ? '127.0.0.1' : h;
}

const dbUser = process.env.PERPUSTAKAAN_DB_USER || process.env.DB_USER || 'perpustakaan_local';
const dbPassword = process.env.PERPUSTAKAAN_DB_PASSWORD || process.env.DB_PASSWORD || '';
const dbName = process.env.PERPUSTAKAAN_DB_NAME || process.env.DB_NAME || 'perpustakaan_local';
const dbPort = Number(process.env.PERPUSTAKAAN_PORT || process.env.PERPUSTAKAAN_DB_PORT || process.env.DB_PORT || 3306);

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
      directory: path.join(__dirname, 'db', 'migrations', 'perpustakaan'),
      tableName: 'knex_migrations_perpustakaan',
    },
    seeds: {
      directory: path.join(__dirname, 'db', 'seeds', 'perpustakaan'),
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
      directory: path.join(__dirname, 'db', 'migrations', 'perpustakaan'),
      tableName: 'knex_migrations_perpustakaan',
    },
    seeds: {
      directory: path.join(__dirname, 'db', 'seeds', 'perpustakaan'),
    },
    pool: { min: 2, max: 10 },
  },
};
