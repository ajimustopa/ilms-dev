/**
 * Server Entry Point for Aldepos API Backend (Modular Monolith)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const dbCore = require('./config/db/core');

const PORT = Number(process.env.CORE_PORT || process.env.PORT || 3000);

// Tes koneksi database saat startup
async function startServer() {
  const dbHost = process.env.CORE_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  const dbUser = process.env.CORE_DB_USER || process.env.DB_USER || 'core_local';
  const dbName = process.env.CORE_DB_NAME || process.env.DB_NAME || 'core_local';

  try {
    await dbCore.raw('SELECT 1+1 AS result');
    console.log(`[DATABASE SUCCESS] Koneksi ke MariaDB Core (${dbUser}@${dbHost}/${dbName}) BERHASIL!`);
  } catch (err) {
    console.warn(`[DATABASE WARNING] Gagal terhubung ke MariaDB Core (${dbUser}@${dbHost}/${dbName}):`, err.message);
    console.warn('[DATABASE WARNING] Pastikan konfigurasi .env dan layanan MariaDB aktif.');
  }

  app.listen(PORT, () => {
    console.log(`==============================================`);
    console.log(` Aldepos API Backend is running on port ${PORT}`);
    console.log(` Environment : ${process.env.CORE_NODE_ENV || 'development'}`);
    console.log(` Base URL    : http://localhost:${PORT}/api/v1`);
    console.log(` Core API    : http://localhost:${PORT}/api/v1/core`);
    console.log(` Health Check: http://localhost:${PORT}/`);
    console.log(`==============================================`);
  });
}

startServer();
