/**
 * CLI Script: Reconcile Leave Balances against Append-Only Ledger (SPEC §5.4)
 * Usage:
 *   node reconcile_balances.js [--period=1] [--employee=4] [--apply]
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
  let employeeId = null;

  for (const arg of args) {
    if (arg.startsWith('--period=')) {
      periodId = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--employee=')) {
      employeeId = parseInt(arg.split('=')[1], 10);
    }
  }

  if (!periodId) {
    const activePeriod = await leaveLedgerService.getActivePeriod(1);
    if (!activePeriod) {
      console.error('[ERROR] Tidak ditemukan periode aktif.');
      process.exit(1);
    }
    periodId = activePeriod.id;
  }

  console.log(`[LEAVE RECONCILE] Memeriksa saldo terhadap mutasi ledger untuk periode ID: ${periodId} (Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'})...`);

  try {
    const result = await leaveLedgerService.reconcileBalances(periodId, { employeeId, dryRun }, { userId: 1, name: 'CLI System' });
    console.log('[RESULT]', JSON.stringify(result, null, 2));

    if (result.discrepancies_count === 0) {
      console.log('\n[PASS] 0 selisih ditemukan. Seluruh cache saldo cocok sempurna dengan mutasi append-only ledger!');
    } else {
      if (dryRun) {
        console.log(`\n[WARNING] Ditemukan ${result.discrepancies_count} selisih saldo. Tambahkan flag --apply untuk menyinkronkan cache dari ledger.`);
      } else {
        console.log(`\n[SUCCESS] ${result.discrepancies_count} saldo pegawai berhasil disinkronkan dari ledger.`);
      }
    }
  } catch (err) {
    console.error('[ERROR]', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

run();
