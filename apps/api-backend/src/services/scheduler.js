/**
 * Background Scheduler Service for Automated Daily Tasks
 * - Perpustakaan: Pemicu otomatis antrean pengingat jatuh tempo H-1 buku
 * - Manajemen: Pembuatan snapshot kesehatan modul agregat harian
 */
const remindersService = require('../modules/perpustakaan/reminders/service');
const qualityService = require('../modules/manajemen/quality/service');

let intervalId = null;
let lastReminderDate = null;
let lastSnapshotDate = null;
let lastBillsCronDate = null;

async function runDailyJobs() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const hour = now.getHours();

  // 1. Job Pengingat Perpustakaan (Jalankan sekali sehari di pagi hari)
  if (lastReminderDate !== todayStr) {
    try {
      console.log(`[Scheduler ${todayStr}] Menjalankan job pemicu antrean pengingat buku perpustakaan...`);
      const result = await remindersService.runReminderJob(1);
      console.log(`[Scheduler ${todayStr}] Pengingat buku selesai:`, result.message || 'Job antrean selesai');
      lastReminderDate = todayStr;
    } catch (err) {
      console.warn(`[Scheduler] Gagal menjalankan pengingat buku:`, err.message);
    }
  }

  // 2. Job Snapshot Dashboard Eksekutif Manajemen
  if (lastSnapshotDate !== todayStr) {
    try {
      console.log(`[Scheduler ${todayStr}] Menjalankan job snapshot kesehatan modul eksekutif...`);
      await qualityService.generateCrossAppSnapshot(1);
      console.log(`[Scheduler ${todayStr}] Snapshot eksekutif selesai diperbarui.`);
      lastSnapshotDate = todayStr;
    } catch (err) {
      console.warn(`[Scheduler] Gagal memperbarui snapshot eksekutif:`, err.message);
    }
  }

  // 3. Job Generator Draf Tagihan Bulanan Keuangan (Jalankan setiap tanggal 25)
  if (now.getDate() === 25 && lastBillsCronDate !== todayStr) {
    try {
      console.log(`[Scheduler ${todayStr}] Menjalankan auto-generator draf tagihan bulanan Keuangan...`);
      const billsService = require('../modules/keuangan/bills/service');
      await billsService.autoGenerateMonthlyDraftBills();
      lastBillsCronDate = todayStr;
      console.log(`[Scheduler ${todayStr}] Draf tagihan bulanan Keuangan selesai di-generate.`);
    } catch (err) {
      console.warn(`[Scheduler] Gagal generate draf tagihan bulanan:`, err.message);
    }
  }
}

function startScheduler(intervalMs = 60000 * 30) {
  // Jalankan segera saat server boot
  runDailyJobs();

  // Periksa setiap 30 menit
  if (!intervalId) {
    intervalId = setInterval(runDailyJobs, intervalMs);
    console.log('[Scheduler] Background Scheduler aktif.');
  }
}

function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Scheduler] Background Scheduler dihentikan.');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  runDailyJobs,
};
