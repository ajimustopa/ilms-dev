/**
 * Server Entry Point for Core Service
 */
require('dotenv').config();

const app = require('./app');
const db = require('./config/database');

const PORT = Number(process.env.CORE_PORT || process.env.PORT || 3000);

// Tes koneksi database saat startup
async function startServer() {
  const dbHost = process.env.CORE_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  const dbUser = process.env.CORE_DB_USER || process.env.DB_USER || 'u622997391_core';
  const dbName = process.env.CORE_DB_NAME || process.env.DB_NAME || 'u622997391_dbcore';

  try {
    await db.raw('SELECT 1+1 AS result');
    console.log(`[DATABASE SUCCESS] Koneksi ke MariaDB (${dbUser}@${dbHost}/${dbName}) BERHASIL!`);
  } catch (err) {
    console.warn(`[DATABASE WARNING] Gagal terhubung ke (${dbUser}@${dbHost}/${dbName}):`, err.message);
    console.warn('[DATABASE WARNING] Pastikan konfigurasi .env dan layanan MariaDB aktif.');
  }

  app.listen(PORT, () => {
    console.log(`==============================================`);
    console.log(` Core Service is running on port ${PORT}`);
    console.log(` Environment : ${process.env.CORE_NODE_ENV || 'production'}`);
    console.log(` Base URL    : http://localhost:${PORT}/api/v1`);
    console.log(` Health Check: http://localhost:${PORT}/`);
    console.log(`==============================================`);
  });
}

startServer();
