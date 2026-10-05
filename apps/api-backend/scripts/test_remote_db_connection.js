const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const knex = require('knex');

const databases = [
  { name: 'Core', host: process.env.CORE_DB_HOST, port: process.env.CORE_DB_PORT, user: process.env.CORE_DB_USER, password: process.env.CORE_DB_PASSWORD, database: process.env.CORE_DB_NAME },
  { name: 'Kepegawaian', host: process.env.KEPEGAWAIAN_DB_HOST, port: process.env.KEPEGAWAIAN_DB_PORT, user: process.env.KEPEGAWAIAN_DB_USER, password: process.env.KEPEGAWAIAN_DB_PASSWORD, database: process.env.KEPEGAWAIAN_DB_NAME },
  { name: 'Akademik', host: process.env.AKADEMIK_DB_HOST, port: process.env.AKADEMIK_DB_PORT, user: process.env.AKADEMIK_DB_USER, password: process.env.AKADEMIK_DB_PASSWORD, database: process.env.AKADEMIK_DB_NAME },
  { name: 'Keuangan', host: process.env.KEUANGAN_DB_HOST, port: process.env.KEUANGAN_DB_PORT, user: process.env.KEUANGAN_DB_USER, password: process.env.KEUANGAN_DB_PASSWORD, database: process.env.KEUANGAN_DB_NAME },
];

async function testConnections() {
  console.log('=== TES KONEKSI REMOTE MYSQL KE HOSTINGER ===\n');
  for (const db of databases) {
    const dbClient = knex({
      client: 'mysql2',
      connection: {
        host: db.host,
        port: Number(db.port),
        user: db.user,
        password: db.password,
        database: db.database,
        connectTimeout: 10000,
      }
    });

    try {
      const result = await dbClient.raw('SELECT 1+1 AS result');
      console.log(`[BERHASIL] Modul ${db.name} -> Terhubung ke Hostinger (${db.database})`);
    } catch (err) {
      console.error(`[GAGAL]    Modul ${db.name} (${db.database}):`, err.message);
    } finally {
      await dbClient.destroy();
    }
  }
}

testConnections();
