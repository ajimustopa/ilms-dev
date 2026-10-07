/**
 * CLI Script: Close Leave Period (SPEC §5.3)
 * Usage:
 *   node close_period.js --period=1 [--apply]
 *   node close_period.js --key="2026/2027" [--apply]
 * Defaults to dry-run unless --apply flag is provided.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });
const db = require('../../../../config/db/kepegawaian');
const leaveLedgerService = require('../leaveLedgerService');

function assertDevDatabase() {
  const host = process.env.DB_KEPEGAWAIAN_HOST || process.env.DB_HOST || 'localhost';
  const database = process.env.DB_KEPEGAWAIAN_NAME || 'kepegawaian_dev';

  console.log(`[DB GUARD] Target Host: ${host} | Database: ${database}`);

  const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(host.trim().toLowerCase());
  const isDevDb = database.endsWith('_dev');

  if (!isLocal || !isDevDb) {
    console.error(`[FATAL] Safety guard triggered: host (${host}) is not localhost or DB (${database}) does not end with _dev! Aborting.`);
    process.exit(1);
  }
}

async function run() {
  assertDevDatabase();

  const args = process.argv.slice(2);
  const applyFlag = args.includes('--apply');
  const dryRun = !applyFlag;

  let periodId = null;
  let periodKey = null;

  for (const arg of args) {
    if (arg.startsWith('--period=')) {
      periodId = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--key=')) {
      periodKey = arg.split('=')[1];
    }
  }

  if (!periodId && !periodKey) {
    // Default to active open period
    const activePeriod = await leaveLedgerService.getActivePeriod(1);
    if (!activePeriod) {
      console.error('[ERROR] Tidak ditemukan periode aktif yang terbuka.');
      process.exit(1);
    }
    periodId = activePeriod.id;
  } else if (!periodId && periodKey) {
    const p = await db('leave_balance_periods').where({ period_key: periodKey }).first();
    if (!p) {
      console.error(`[ERROR] Periode dengan key "${periodKey}" tidak ditemukan.`);
      process.exit(1);
    }
    periodId = p.id;
  }

  console.log(`[LEAVE CLOSE-PERIOD] Menjalankan penutupan periode ID: ${periodId} (Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'})...`);

  try {
    const result = await leaveLedgerService.closePeriod(periodId, { dryRun }, { userId: 1, name: 'CLI System' });
    console.log('[RESULT]', JSON.stringify(result, null, 2));
    if (dryRun) {
      console.log('\n[INFO] Ini adalah simulasi (dry-run). Tambahkan flag --apply untuk mengeksekusi perubahan ke database.');
    } else {
      console.log('\n[SUCCESS] Periode berhasil ditutup dan carry over berhasil dicatat.');
    }
  } catch (err) {
    console.error('[ERROR]', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

run();
