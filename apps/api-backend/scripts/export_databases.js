/**
 * Script untuk mengekspor seluruh 11 database lokal ke file .sql siap import ke Hostinger.
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dumpDir = path.join(__dirname, '../../database_dumps');
if (!fs.existsSync(dumpDir)) {
  fs.mkdirSync(dumpDir, { recursive: true });
}

// Cek lokasi mysqldump
const mysqldumpBin = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
const useMysqldump = fs.existsSync(mysqldumpBin);

const modules = [
  { name: 'core', prefix: '01', targetDb: 'u622997391_core', localDb: process.env.CORE_DB_NAME || 'core_local', user: process.env.CORE_DB_USER || 'root', pass: process.env.CORE_DB_PASSWORD || '', host: process.env.CORE_DB_HOST || '127.0.0.1', port: process.env.CORE_DB_PORT || 3306 },
  { name: 'kepegawaian', prefix: '02', targetDb: 'u622997391_kepegawaian', localDb: process.env.KEPEGAWAIAN_DB_NAME || 'kepegawaian_local', user: process.env.KEPEGAWAIAN_DB_USER || 'root', pass: process.env.KEPEGAWAIAN_DB_PASSWORD || '', host: process.env.KEPEGAWAIAN_DB_HOST || '127.0.0.1', port: process.env.KEPEGAWAIAN_DB_PORT || 3306 },
  { name: 'akademik', prefix: '03', targetDb: 'u622997391_akademik', localDb: process.env.AKADEMIK_DB_NAME || 'akademik_local', user: process.env.AKADEMIK_DB_USER || 'root', pass: process.env.AKADEMIK_DB_PASSWORD || '', host: process.env.AKADEMIK_DB_HOST || '127.0.0.1', port: process.env.AKADEMIK_DB_PORT || 3306 },
  { name: 'keuangan', prefix: '04', targetDb: 'u622997391_keuangan', localDb: process.env.KEUANGAN_DB_NAME || 'keuangan_local', user: process.env.KEUANGAN_DB_USER || 'root', pass: process.env.KEUANGAN_DB_PASSWORD || '', host: process.env.KEUANGAN_DB_HOST || '127.0.0.1', port: process.env.KEUANGAN_DB_PORT || 3306 },
  { name: 'alquran', prefix: '05', targetDb: 'u622997391_alquran', localDb: process.env.ALQURAN_DB_NAME || 'alquran_local', user: process.env.ALQURAN_DB_USER || 'root', pass: process.env.ALQURAN_DB_PASSWORD || '', host: process.env.ALQURAN_DB_HOST || '127.0.0.1', port: process.env.ALQURAN_DB_PORT || 3306 },
  { name: 'kantin', prefix: '06', targetDb: 'u622997391_kantin', localDb: process.env.KANTIN_DB_NAME || 'kantin_local', user: process.env.KANTIN_DB_USER || 'root', pass: process.env.KANTIN_DB_PASSWORD || '', host: process.env.KANTIN_DB_HOST || '127.0.0.1', port: process.env.KANTIN_DB_PORT || 3306 },
  { name: 'sarpras', prefix: '07', targetDb: 'u622997391_sarpras', localDb: process.env.SARPRAS_DB_NAME || 'sarpras_local', user: process.env.SARPRAS_DB_USER || 'root', pass: process.env.SARPRAS_DB_PASSWORD || '', host: process.env.SARPRAS_DB_HOST || '127.0.0.1', port: process.env.SARPRAS_DB_PORT || 3306 },
  { name: 'dapur', prefix: '08', targetDb: 'u622997391_dapur', localDb: process.env.DAPUR_DB_NAME || 'dapur_local', user: process.env.DAPUR_DB_USER || 'root', pass: process.env.DAPUR_DB_PASSWORD || '', host: process.env.DAPUR_DB_HOST || '127.0.0.1', port: process.env.DAPUR_DB_PORT || 3306 },
  { name: 'perpustakaan', prefix: '09', targetDb: 'u622997391_perpustakaan', localDb: process.env.PERPUSTAKAAN_DB_NAME || 'perpustakaan_local', user: process.env.PERPUSTAKAAN_DB_USER || 'root', pass: process.env.PERPUSTAKAAN_DB_PASSWORD || '', host: process.env.PERPUSTAKAAN_DB_HOST || '127.0.0.1', port: process.env.PERPUSTAKAAN_DB_PORT || 3306 },
  { name: 'manajemen', prefix: '10', targetDb: 'u622997391_manajemen', localDb: process.env.MANAJEMEN_DB_NAME || 'manajemen_local', user: process.env.MANAJEMEN_DB_USER || 'root', pass: process.env.MANAJEMEN_DB_PASSWORD || '', host: process.env.MANAJEMEN_DB_HOST || '127.0.0.1', port: process.env.MANAJEMEN_DB_PORT || 3306 },
  { name: 'website_utama', prefix: '11', targetDb: 'u622997391_website_utama', localDb: process.env.WEBSITE_UTAMA_DB_NAME || 'website_utama_local', user: process.env.WEBSITE_UTAMA_DB_USER || 'root', pass: process.env.WEBSITE_UTAMA_DB_PASSWORD || '', host: process.env.WEBSITE_UTAMA_DB_HOST || '127.0.0.1', port: process.env.WEBSITE_UTAMA_DB_PORT || 3306 },
];

console.log('=== MEMULAI EKSPOR 11 DATABASE LOKAL ===');

let successCount = 0;
for (const mod of modules) {
  const outputFile = path.join(dumpDir, `${mod.prefix}_${mod.targetDb}.sql`);
  console.log(`\n[${mod.prefix}/11] Mengekspor ${mod.localDb} -> ${outputFile}...`);

  const passArg = mod.pass ? `-p"${mod.pass}"` : '';
  const hostArg = `-h ${mod.host}`;
  const portArg = `-P ${mod.port}`;
  const userArg = `-u ${mod.user}`;

  // Menggunakan opsi mysqldump standar (tanpa CREATE DATABASE agar pas di-import langsung ke database target di Hostinger)
  const cmd = `"${mysqldumpBin}" ${hostArg} ${portArg} ${userArg} ${passArg} --single-transaction --routines --triggers --no-create-db ${mod.localDb} > "${outputFile}"`;

  try {
    execSync(cmd, { shell: 'cmd.exe', stdio: 'pipe' });
    const stats = fs.statSync(outputFile);
    console.log(`  -> Berhasil! Ukuran file: ${(stats.size / 1024).toFixed(2)} KB`);
    successCount++;
  } catch (err) {
    console.error(`  -> Gagal mengekspor ${mod.localDb}:`, err.message);
  }
}

console.log(`\n=== SELESAI: ${successCount} dari ${modules.length} database berhasil diekspor ke folder database_dumps/ ===`);
