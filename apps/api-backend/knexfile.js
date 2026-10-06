const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function getModule() {
  const moduleIndex = process.argv.indexOf('--module');
  if (moduleIndex !== -1 && process.argv[moduleIndex + 1]) {
    return process.argv[moduleIndex + 1].toLowerCase();
  }
  const moduleArg = process.argv.find(a => typeof a === 'string' && a.startsWith('--module='));
  if (moduleArg) {
    return moduleArg.split('=')[1].toLowerCase();
  }
  const clientIndex = process.argv.indexOf('--client');
  if (clientIndex !== -1 && process.argv[clientIndex + 1]) {
    return process.argv[clientIndex + 1].toLowerCase();
  }
  const clientArg = process.argv.find(a => typeof a === 'string' && a.startsWith('--client='));
  if (clientArg) {
    return clientArg.split('=')[1].toLowerCase();
  }
  if (process.env.MODULE) {
    return process.env.MODULE.toLowerCase();
  }
  return 'core';
}

const targetModule = getModule();

function sanitizeHost(h) {
  return (h === 'localhost') ? '127.0.0.1' : h;
}

function getDbConfig(mod) {
  switch (mod) {
    case 'manajemen':
      return {
        host: sanitizeHost(process.env.MANAJEMEN_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: Number(process.env.MANAJEMEN_PORT || process.env.MANAJEMEN_DB_PORT || process.env.DB_PORT || 3306),
        user: process.env.MANAJEMEN_DB_USER || process.env.DB_USER || 'manajemen_local',
        password: process.env.MANAJEMEN_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.MANAJEMEN_DB_NAME || process.env.DB_NAME || 'manajemen_local',
        migrationsDir: './db/migrations/manajemen',
        migrationsTable: 'knex_migrations_manajemen',
        seedsDir: './db/seeds/manajemen',
        disableTransactions: true,
      };
    case 'perpustakaan':
      return {
        host: sanitizeHost(process.env.PERPUSTAKAAN_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: Number(process.env.PERPUSTAKAAN_PORT || process.env.PERPUSTAKAAN_DB_PORT || process.env.DB_PORT || 3306),
        user: process.env.PERPUSTAKAAN_DB_USER || process.env.DB_USER || 'perpustakaan_local',
        password: process.env.PERPUSTAKAAN_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.PERPUSTAKAAN_DB_NAME || process.env.DB_NAME || 'perpustakaan_local',
        migrationsDir: './db/migrations/perpustakaan',
        migrationsTable: 'knex_migrations_perpustakaan',
        seedsDir: './db/seeds/perpustakaan',
        disableTransactions: true,
      };
    case 'dapur':
      return {
        host: sanitizeHost(process.env.DAPUR_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: Number(process.env.DAPUR_PORT || process.env.DAPUR_DB_PORT || process.env.DB_PORT || 3306),
        user: process.env.DAPUR_DB_USER || process.env.DB_USER || 'dapur_local',
        password: process.env.DAPUR_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.DAPUR_DB_NAME || process.env.DB_NAME || 'dapur_local',
        migrationsDir: './db/migrations/dapur',
        migrationsTable: 'knex_migrations_dapur',
        seedsDir: './db/seeds/dapur',
        disableTransactions: true,
      };
    case 'sarpras':
      return {
        host: sanitizeHost(process.env.SARPRAS_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: Number(process.env.SARPRAS_PORT || process.env.SARPRAS_DB_PORT || process.env.DB_PORT || 3306),
        user: process.env.SARPRAS_DB_USER || process.env.DB_USER || 'sarpras_local',
        password: process.env.SARPRAS_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.SARPRAS_DB_NAME || process.env.DB_NAME || 'sarpras_local',
        migrationsDir: './db/migrations/sarpras',
        migrationsTable: 'knex_migrations_sarpras',
        seedsDir: './db/seeds/sarpras',
        disableTransactions: true,
      };
    case 'kantin':
      return {
        host: sanitizeHost(process.env.KANTIN_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: Number(process.env.KANTIN_DB_PORT || process.env.DB_PORT || 3306),
        user: process.env.KANTIN_DB_USER || process.env.DB_USER || 'kantin_local',
        password: process.env.KANTIN_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.KANTIN_DB_NAME || process.env.DB_NAME || 'kantin_local',
        migrationsDir: './db/migrations/kantin',
        migrationsTable: 'knex_migrations_kantin',
        seedsDir: './db/seeds/kantin',
        disableTransactions: true,
      };
    case 'alquran':
      return {
        host: sanitizeHost(process.env.ALQURAN_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: Number(process.env.ALQURAN_DB_PORT || process.env.DB_PORT || 3306),
        user: process.env.ALQURAN_DB_USER || process.env.DB_USER || 'alquran_local',
        password: process.env.ALQURAN_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.ALQURAN_DB_NAME || process.env.DB_NAME || 'alquran_local',
        migrationsDir: './db/migrations/alquran',
        migrationsTable: 'knex_migrations_alquran',
        seedsDir: './db/seeds/alquran',
        disableTransactions: true,
      };
    case 'keuangan':
      return {
        host: sanitizeHost(process.env.KEUANGAN_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: Number(process.env.KEUANGAN_DB_PORT || process.env.DB_PORT || 3306),
        user: process.env.KEUANGAN_DB_USER || process.env.DB_USER || 'keuangan_local',
        password: process.env.KEUANGAN_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.KEUANGAN_DB_NAME || process.env.DB_NAME || 'keuangan_local',
        migrationsDir: './db/migrations/keuangan',
        migrationsTable: 'knex_migrations_keuangan',
        seedsDir: './db/seeds/keuangan',
        disableTransactions: true,
      };
    case 'kepegawaian':
      return {
        host: sanitizeHost(process.env.KEPEGAWAIAN_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: Number(process.env.KEPEGAWAIAN_DB_PORT || process.env.DB_PORT || 3306),
        user: process.env.KEPEGAWAIAN_DB_USER || process.env.DB_USER || 'kepegawaian_local',
        password: process.env.KEPEGAWAIAN_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.KEPEGAWAIAN_DB_NAME || process.env.DB_NAME || 'kepegawaian_local',
        migrationsDir: './db/migrations/kepegawaian',
        migrationsTable: 'knex_migrations_kepegawaian',
        seedsDir: './db/seeds/kepegawaian',
        disableTransactions: true,
      };
    case 'akademik':
      return {
        host: sanitizeHost(process.env.AKADEMIK_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: Number(process.env.AKADEMIK_DB_PORT || process.env.DB_PORT || 3306),
        user: process.env.AKADEMIK_DB_USER || process.env.DB_USER || 'akademik_local',
        password: process.env.AKADEMIK_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.AKADEMIK_DB_NAME || process.env.DB_NAME || 'akademik_local',
        migrationsDir: './db/migrations/akademik',
        migrationsTable: 'knex_migrations_akademik',
        seedsDir: './db/seeds/akademik',
        disableTransactions: true,
      };
    case 'website-utama':
    case 'websiteutama':
      return {
        host: sanitizeHost(process.env.WEBSITEUTAMA_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: Number(process.env.WEBSITEUTAMA_PORT || process.env.WEBSITEUTAMA_DB_PORT || 3306),
        user: process.env.WEBSITEUTAMA_DB_USER || process.env.DB_USER || 'website_utama_local',
        password: process.env.WEBSITEUTAMA_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.WEBSITEUTAMA_DB_NAME || process.env.DB_NAME || 'website_utama_local',
        migrationsDir: './db/migrations/website-utama',
        migrationsTable: 'knex_migrations_website_utama',
        seedsDir: './db/seeds/website-utama',
        disableTransactions: true,
      };
    case 'core':
    default:
      return {
        host: sanitizeHost(process.env.CORE_DB_HOST || process.env.DB_HOST || '127.0.0.1'),
        port: Number(process.env.CORE_DB_PORT || process.env.DB_PORT || 3306),
        user: process.env.CORE_DB_USER || process.env.DB_USER || 'core_local',
        password: process.env.CORE_DB_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.CORE_DB_NAME || process.env.DB_NAME || 'core_local',
        migrationsDir: './db/migrations/core',
        migrationsTable: 'knex_migrations_core',
        seedsDir: './db/seeds/core',
        disableTransactions: false,
      };
  }
}

const dbConfig = getDbConfig(targetModule);

/**
 * Knexfile Configuration with Multi-Module support via --module <name>
 */
module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      charset: 'utf8mb4',
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 20000,
      ssl: (Number(dbConfig.port) === 4000 || process.env.DB_SSL === 'true') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    },
    migrations: {
      directory: dbConfig.migrationsDir,
      tableName: dbConfig.migrationsTable,
      disableTransactions: dbConfig.disableTransactions,
    },
    seeds: {
      directory: dbConfig.seedsDir,
    },
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
      afterCreate: (conn, done) => {
        conn.on('error', (err) => {
          // Tangani koneksi idle yang ditutup MariaDB agar tidak melempar ECONNRESET tak tertangani
        });
        done(null, conn);
      },
    },
  },

  production: {
    client: 'mysql2',
    connection: {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      charset: 'utf8mb4',
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 20000,
      ssl: (Number(dbConfig.port) === 4000 || process.env.DB_SSL === 'true') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    },
    migrations: {
      directory: dbConfig.migrationsDir,
      tableName: dbConfig.migrationsTable,
      disableTransactions: dbConfig.disableTransactions,
    },
    seeds: {
      directory: dbConfig.seedsDir,
    },
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
      afterCreate: (conn, done) => {
        conn.on('error', (err) => {
          // Tangani koneksi idle yang ditutup MariaDB agar tidak melempar ECONNRESET tak tertangani
        });
        done(null, conn);
      },
    },
  },
};
