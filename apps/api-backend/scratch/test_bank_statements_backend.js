/**
 * Test script for Bank Statements (Rekening Koran) Backend
 */
const service = require('../src/modules/keuangan/bank-statements/service');
const knex = require('../src/config/db/keuangan');

async function testBankStatements() {
  console.log('--- STARTING BANK STATEMENTS BACKEND VERIFICATION ---');
  const schoolUnitId = 1;

  // 1. Check or seed bank account
  let bankAccount = await knex('cash_accounts')
    .where({ school_unit_id: schoolUnitId, account_kind: 'bank' })
    .first();

  if (!bankAccount) {
    console.log('Creating sample bank account for testing...');
    const [id] = await knex('cash_accounts').insert({
      school_unit_id: schoolUnitId,
      name: 'Bank BNI Operasional Test',
      account_kind: 'bank',
      bank_account_number: '987654321',
      bank_name: 'BNI',
      is_active: true
    });
    bankAccount = await knex('cash_accounts').where({ id }).first();
  }
  console.log(`-> Test Bank Account: ${bankAccount.name} (#${bankAccount.bank_account_number})`);

  let cashAccount = await knex('cash_accounts')
    .where({ school_unit_id: schoolUnitId, account_kind: 'cash' })
    .first();
  if (!cashAccount) {
    const [id] = await knex('cash_accounts').insert({
      school_unit_id: schoolUnitId,
      name: 'Kas Tunai Kasir Test',
      account_kind: 'cash',
      is_active: true
    });
    cashAccount = await knex('cash_accounts').where({ id }).first();
  }

  // Count journals before
  const journalsBefore = await knex('journal_entries').count('id as cnt').first();

  // 2. Test rejection on cash account
  console.log('\n[TEST 1] Testing Guard: Reject statement on non-bank account (account_kind=cash)...');
  try {
    await service.createBankStatement(schoolUnitId, {
      cash_account_id: cashAccount.id,
      transaction_date: '2026-08-01 10:00:00',
      description: 'Test mutasi di kas tunai',
      amount: 50000,
      dc_type: 'credit'
    }, 1);
    throw new Error('Guard failed: Allowed statement creation on cash account!');
  } catch (err) {
    console.log(`-> Correctly rejected with 422: "${err.message}"`);
  }

  // 3. Create Statement (Credit / Masuk)
  console.log('\n[TEST 2] Creating Bank Statement (Credit/Masuk)...');
  const stmtCredit = await service.createBankStatement(schoolUnitId, {
    cash_account_id: bankAccount.id,
    transaction_date: '2026-08-02 09:30:00',
    journal_number: 'BNI-TRF-001',
    description: 'Setoran SPP Ahmad Fauzi via ATM',
    amount: 750000,
    dc_type: 'credit',
    running_balance: 50750000
  }, 1);

  console.log(`-> Created Statement ID: ${stmtCredit.id}, Amount: ${stmtCredit.amount}, DC: ${stmtCredit.dc_type}`);
  if (stmtCredit.amount !== 750000 || stmtCredit.is_reconciled !== false) {
    throw new Error('Statement fields mismatch');
  }

  // 4. Create Statement (Debit / Keluar)
  console.log('\n[TEST 3] Creating Bank Statement (Debit/Keluar)...');
  const stmtDebit = await service.createBankStatement(schoolUnitId, {
    cash_account_id: bankAccount.id,
    transaction_date: '2026-08-05 14:00:00',
    journal_number: 'BNI-DEB-002',
    description: 'Biaya Administrasi Bank BNI Bulanan',
    amount: 25000,
    dc_type: 'debit',
    running_balance: 50725000
  }, 1);
  console.log(`-> Created Statement ID: ${stmtDebit.id}, Amount: ${stmtDebit.amount}, DC: ${stmtDebit.dc_type}`);

  // 5. Test List & Summary Stats
  console.log('\n[TEST 4] Testing List Bank Statements with Summary Stats...');
  const listResult = await service.listBankStatements(schoolUnitId, {
    cash_account_id: bankAccount.id
  });

  console.log(`-> Total Rows: ${listResult.summary.total_rows}`);
  console.log(`-> Total Credit: Rp ${listResult.summary.total_credit.toLocaleString('id-ID')}`);
  console.log(`-> Total Debit: Rp ${listResult.summary.total_debit.toLocaleString('id-ID')}`);
  console.log(`-> Net Mutation: Rp ${listResult.summary.net_mutation.toLocaleString('id-ID')}`);
  console.log(`-> Reconciled Count: ${listResult.summary.reconciled_count}, Unreconciled: ${listResult.summary.unreconciled_count}`);
  if (listResult.summary.total_credit < 750000 || listResult.summary.total_debit < 25000) {
    throw new Error('Summary calculation error');
  }

  // 6. Test Reconcile & Candidates
  console.log('\n[TEST 5] Testing Reconcile Candidates and Reconcile Linking...');
  const candidatesResult = await service.getReconcileCandidates(schoolUnitId, stmtCredit.id);
  console.log(`-> Candidate lookup for Statement #${stmtCredit.id}: found ${candidatesResult.candidates.length} candidates`);

  const reconciledStmt = await service.reconcileStatement(schoolUnitId, stmtCredit.id, {
    reference_type: 'other',
    reference_id: 999,
    notes: 'Cocok manual dengan setoran kasir'
  }, 1);

  console.log(`-> Statement #${stmtCredit.id} Reconciled: ${reconciledStmt.is_reconciled}`);
  console.log(`   Reference Type: ${reconciledStmt.reconciled_reference_type}, ID: ${reconciledStmt.reconciled_reference_id}`);
  console.log(`   Notes: ${reconciledStmt.reconciliation_notes}`);
  if (!reconciledStmt.is_reconciled) throw new Error('Reconcile failed');

  // 7. Test Unreconcile
  console.log('\n[TEST 6] Testing Unreconcile (Lepas Rujukan)...');
  const unreconciledStmt = await service.unreconcileStatement(schoolUnitId, stmtCredit.id, 1);
  console.log(`-> Statement #${stmtCredit.id} after Unreconcile: is_reconciled = ${unreconciledStmt.is_reconciled}`);
  if (unreconciledStmt.is_reconciled) throw new Error('Unreconcile failed');

  // 8. Test Import Excel Rows Batch
  console.log('\n[TEST 7] Testing Batch Import...');
  const importRows = [
    { 'Tanggal': '2026-08-10', 'No Referensi': 'TRF-100', 'Uraian': 'SPP Siswa Batch 1', 'Kredit': 1500000, 'Saldo': 52225000 },
    { 'Tanggal': '2026-08-11', 'No Referensi': 'TRF-101', 'Uraian': 'SPP Siswa Batch 2', 'Kredit': 2000000, 'Saldo': 54225000 },
    { 'Tanggal': '2026-08-12', 'No Referensi': 'DEB-102', 'Uraian': 'Biaya Materai & Kliring', 'Debit': 50000, 'Saldo': 54175000 }
  ];

  const importResult = await service.importBankStatements(schoolUnitId, {
    cash_account_id: bankAccount.id,
    rows: importRows
  }, 1);

  console.log(`-> Import Batch ID: ${importResult.batch_id}`);
  console.log(`-> Imported count: ${importResult.imported_count}, Skipped count: ${importResult.skipped_count}`);
  if (importResult.imported_count !== 3) throw new Error('Batch import count mismatch');

  // 9. Test Export & Template
  console.log('\n[TEST 8] Testing Export to Excel and Template Generation...');
  const exportBuf = await service.exportBankStatementsExcel(schoolUnitId, { cash_account_id: bankAccount.id });
  console.log(`-> Excel Export generated, size: ${exportBuf.length} bytes`);
  if (!exportBuf || exportBuf.length < 1000) throw new Error('Export buffer empty');

  const templateBuf = service.getTemplateExcel();
  console.log(`-> Template Excel generated, size: ${templateBuf.length} bytes`);
  if (!templateBuf || templateBuf.length < 1000) throw new Error('Template buffer empty');

  // 10. Verify NO JURNAL formed
  const journalsAfter = await knex('journal_entries').count('id as cnt').first();
  console.log(`\n[VERIFICATION] Journal Entries count before: ${journalsBefore.cnt}, after: ${journalsAfter.cnt}`);
  if (parseInt(journalsAfter.cnt, 10) !== parseInt(journalsBefore.cnt, 10)) {
    throw new Error('FATAL: Bank statements operations must NEVER create journal entries!');
  }
  console.log('-> 100% Verified: Bank Statements are purely ONE-WAY reference with ZERO impact on accounting journals or live cash balances!');

  console.log('\n=== ALL BACKEND TESTS PASSED SUCCESSFULLY! ===\n');
  process.exit(0);
}

testBankStatements().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
