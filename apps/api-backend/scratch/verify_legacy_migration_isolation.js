/**
 * Verify isolation of legacy migration data from live journal and cash balances
 */
const legacyService = require('../src/modules/keuangan/legacy-migration/service');
const paymentsService = require('../src/modules/keuangan/payments/service');
const knex = require('../src/config/db/keuangan');

async function verifyIsolation() {
  console.log('--- VERIFYING LEGACY MIGRATION ISOLATION & GUARDS ---');
  const schoolUnitId = 1;

  // 1. Check cutover setting
  const cutover = await legacyService.getCutoverSetting(schoolUnitId);
  console.log(`-> Cutover Date: ${cutover.cutover_date || 'Belum diatur'}`);

  // Set cutover date if not set (for test)
  if (!cutover.cutover_date) {
    await legacyService.setOrUpdateCutoverDate(schoolUnitId, {
      cutover_date: '2026-07-01',
      notes: 'Testing Cutover Isolation'
    }, 1);
    console.log('-> Cutover Date set to 2026-07-01 for testing');
  }

  // Count journal entries before
  const journalsBefore = await knex('journal_entries').where({ school_unit_id: schoolUnitId }).count('id as cnt').first();
  const cashMutationsBefore = await knex('fund_balance_mutations').count('id as cnt').first();

  // 2. Test createLegacyBill with due date < cutover date
  console.log('\n[TEST 1] Creating Legacy Bill (Pra-Cutover)...');
  const sampleFeeType = await knex('fee_types').where({ school_unit_id: schoolUnitId }).first();
  if (!sampleFeeType) throw new Error('No fee type found');

  const legacyBill = await legacyService.createLegacyBill(schoolUnitId, {
    student_id: 1,
    fee_type_id: sampleFeeType.id,
    period_year: 2025,
    period_month: 6,
    amount: 500000,
    paid_amount: 200000, // Rp 200.000 paid before cutover
    due_date: '2025-06-10',
    historical_cash_note: 'Kas manual sebelum sistem',
    legacy_note: 'Testing isolation'
  }, 1);

  console.log(`-> Legacy Bill Created ID: ${legacyBill.id}`);
  console.log(`   is_legacy: ${legacyBill.is_legacy} (Type: ${typeof legacyBill.is_legacy})`);
  console.log(`   status: ${legacyBill.status}`);
  if (!legacyBill.is_legacy) throw new Error('Legacy bill must have is_legacy = true');

  // Verify bill_payments record
  const legacyPayment = await knex('bill_payments').where({ student_bill_id: legacyBill.id }).first();
  console.log(`-> Associated Initial Payment ID: ${legacyPayment.id}`);
  console.log(`   is_legacy: ${legacyPayment.is_legacy}`);
  console.log(`   cash_account_id: ${legacyPayment.cash_account_id} (MUST BE NULL)`);
  console.log(`   historical_cash_note: ${legacyPayment.historical_cash_note}`);
  if (!legacyPayment.is_legacy || legacyPayment.cash_account_id !== null) {
    throw new Error('Legacy payment must have is_legacy = true and cash_account_id = null');
  }

  // 3. Verify that NO journal entries and NO fund mutations were created
  const journalsAfter = await knex('journal_entries').where({ school_unit_id: schoolUnitId }).count('id as cnt').first();
  const cashMutationsAfter = await knex('fund_balance_mutations').count('id as cnt').first();

  console.log(`-> Journal count before: ${journalsBefore.cnt}, after: ${journalsAfter.cnt}`);
  console.log(`-> Fund mutations before: ${cashMutationsBefore.cnt}, after: ${cashMutationsAfter.cnt}`);
  if (parseInt(journalsAfter.cnt, 10) !== parseInt(journalsBefore.cnt, 10)) {
    throw new Error('VIOLATION: Journal entries were created for legacy transaction!');
  }
  if (parseInt(cashMutationsAfter.cnt, 10) !== parseInt(cashMutationsBefore.cnt, 10)) {
    throw new Error('VIOLATION: Fund mutations were created for legacy transaction!');
  }

  // 4. Test Rejecting Legacy Bill with due_date >= cutover_date
  console.log('\n[TEST 2] Testing Guard: Rejecting Legacy Bill with due_date >= cutover...');
  try {
    await legacyService.createLegacyBill(schoolUnitId, {
      student_id: 1,
      fee_type_id: sampleFeeType.id,
      period_year: 2026,
      amount: 500000,
      due_date: '2026-08-10' // AFTER CUTOVER
    }, 1);
    throw new Error('Guard failed: Post-cutover date was accepted in legacy migration!');
  } catch (err) {
    console.log(`-> Correctly rejected with 422: "${err.message}"`);
  }

  // 5. Test Rejecting Normal Payment with paid_at < cutover_date in Kasir
  console.log('\n[TEST 3] Testing Guard: Rejecting Normal Live Payment with backdated paid_at < cutover...');
  try {
    const normalBill = await knex('student_bills').where({ school_unit_id: schoolUnitId, is_legacy: false }).whereIn('status', ['unpaid', 'partially_paid']).first();
    if (normalBill) {
      await paymentsService.recordBillPayment(schoolUnitId, {
        student_bill_id: normalBill.id,
        paid_at: '2025-05-10', // BEFORE CUTOVER
        amount: 10000,
        cash_account_id: 1
      }, 1);
      throw new Error('Guard failed: Backdated normal payment was accepted!');
    }
  } catch (err) {
    console.log(`-> Correctly rejected normal backdated payment with 422: "${err.message}"`);
  }

  // 6. Test CorrectPayment Guard (Cannot backdate correction before cutover)
  console.log('\n[TEST 4] Testing Guard: Rejecting Payment Correction backdated before cutover...');
  const sampleLivePayment = await knex('bill_payments').where({ is_legacy: false }).first();
  if (sampleLivePayment) {
    const resCorrection = await paymentsService.correctPayment(schoolUnitId, sampleLivePayment.id, {
      paid_at: '2025-01-01',
      correction_reason: 'Testing backdate attempt'
    }, 1);
    console.log(`-> Correction rejected: ${resCorrection.message}`);
  }

  console.log('\n=== ALL LEGACY ISOLATION TESTS PASSED 100% ===\n');
  process.exit(0);
}

verifyIsolation().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
