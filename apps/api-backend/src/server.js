/**
 * Server Entry Point for Aldepos API Backend (Modular Monolith)
 */
require('./resolve-paths');
const path = require('path');

// Pastikan Node.js menemukan dependencies baik di subfolder maupun root Hostinger
const extraPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
  path.resolve(__dirname, '../../node_modules'),
  path.resolve(__dirname, '../../../node_modules'),
  path.resolve(process.cwd(), 'node_modules'),
  path.resolve(process.cwd(), '../node_modules'),
];
for (const p of extraPaths) {
  if (!module.paths.includes(p)) {
    module.paths.push(p);
  }
}

try {
  require('dotenv').config();
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
} catch (e) {
  // Environment variables already in process.env
}

const app = require('./app');
const dbCore = require('./config/db/core');

// Tangani unhandled rejection & exception (seperti ECONNRESET socket pool MariaDB remote) agar server tetap running
process.on('unhandledRejection', (reason) => {
  if (reason && reason.code === 'ECONNRESET') {
    // Abaikan ECONNRESET idle connection pool
    return;
  }
  console.warn('[SERVER UNHANDLED REJECTION]', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  if (err && err.code === 'ECONNRESET') {
    return;
  }
  console.error('[SERVER UNCAUGHT EXCEPTION]', err);
});

const PORT = process.env.PORT || process.env.CORE_PORT || 3000;

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

    // Inisialisasi Background Scheduler
    const { startScheduler } = require('./services/scheduler');
    startScheduler();
  });
}

startServer();
