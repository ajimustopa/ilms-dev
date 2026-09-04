/**
 * Test Expenses Storno Reversal, Non-Budgeted Expense, and Multi-Source Funding
 */
const service = require('../src/modules/keuangan/expenses/service');
const knex = require('../src/config/db/keuangan');

async function testExpenses() {
  console.log('--- TESTING EXPENSES STORNO & NON-BUDGETED ---');
  const schoolUnitId = 1;
  const academicYearId = 1;

  // Check journals count before
  const jBefore = await knex('journal_entries').count('id as cnt').first();
  const jbCnt = parseInt(jBefore.cnt, 10);

  // 1. Create a Non-Budgeted Expense (Di Luar RAPBS)
  console.log('1. Creating Non-Budgeted Expense...');
  const expOutside = await service.createExpense(schoolUnitId, {
    academic_year_id: academicYearId,
    is_outside_budget: true,
    item_name: 'Pembelian Cat Tembok Darurat Aula',
    unit: 'Kaleng',
    unit_price: 250000,
    quantity: 4, // 1.000.000
    vendor: 'Toko Bangunan Berkah',
    expense_date: '2026-08-16',
    notes: 'Perbaikan mendadak bocor aula',
    fund_source_type: 'opening_pool',
    fund_source_ref_id: 0
  }, 1);

  console.log(`-> Created Non-Budgeted Expense ID: ${expOutside.id}, is_outside_budget: ${expOutside.is_outside_budget}, total: ${expOutside.total_amount}`);
  if (!expOutside.is_outside_budget) {
    throw new Error('is_outside_budget flag was not set to true');
  }

  // Check journals after create
  const jAfterCreate = await knex('journal_entries').count('id as cnt').first();
  const jacCnt = parseInt(jAfterCreate.cnt, 10);
  console.log(`-> Journals after create: ${jacCnt} (was ${jbCnt})`);
  if (jacCnt !== jbCnt + 1) {
    throw new Error('Expected 1 journal entry to be formed for new expense');
  }

  // 2. Test Soft Delete with Storno Reversal
  console.log('\n2. Testing softDeleteExpense with Storno Reversal...');
  const cancelResult = await service.softDeleteExpense(
    schoolUnitId,
    expOutside.id,
    'Vendor membatalkan pesanan dan uang kas dikembalikan utuh',
    1
  );

  console.log('-> Cancellation result:', cancelResult);

  // Verify journal after soft delete
  const jAfterDelete = await knex('journal_entries').count('id as cnt').first();
  const jadCnt = parseInt(jAfterDelete.cnt, 10);
  console.log(`-> Journals after soft delete: ${jadCnt} (was ${jacCnt})`);
  if (jadCnt !== jacCnt + 1) {
    throw new Error('Expected 1 storno reversal journal entry to be formed');
  }

  // Inspect the reversal journal entry
  const stornoJournal = await knex('journal_entries')
    .where({ school_unit_id: schoolUnitId, source_type: 'expense', source_id: expOutside.id })
    .orderBy('id', 'desc')
    .first();

  console.log(`-> Storno Journal #${stornoJournal.journal_number}: "${stornoJournal.description}" (is_manual_correction: ${stornoJournal.is_manual_correction})`);

  const stornoLines = await knex('journal_entry_lines').where({ journal_entry_id: stornoJournal.id });
  console.log('-> Storno Lines:', stornoLines.map(l => ({ side: l.entry_side, coa_id: l.chart_of_account_id, amount: l.amount, memo: l.memo })));

  const debitLine = stornoLines.find(l => l.entry_side === 'debit');
  const creditLine = stornoLines.find(l => l.entry_side === 'credit');
  if (!debitLine || !creditLine) {
    throw new Error('Expected both debit and credit lines in storno entry');
  }

  // 3. Test Multi-Source Funding Expense
  console.log('\n3. Testing Multi-Source Funding Expense...');
  const multiExp = await service.createExpense(schoolUnitId, {
    academic_year_id: academicYearId,
    is_outside_budget: false,
    item_name: 'Pengadaan Meja Kursi Kelas Baru',
    unit: 'Set',
    unit_price: 500000,
    quantity: 10, // 5.000.000
    vendor: 'CV Mebel Karya',
    expense_date: '2026-08-17',
    notes: 'Pembiayaan gabungan SPP dan Subsidi',
    fund_sources: [
      { fund_type: 'fee_type', fund_ref_id: 1, amount: 3000000 },
      { fund_type: 'opening_pool', fund_ref_id: 0, amount: 2000000 }
    ]
  }, 1);

  console.log(`-> Created Multi-Source Expense ID: ${multiExp.id}, fund_sources: ${multiExp.fund_sources}`);
  if (!multiExp.fund_sources) {
    throw new Error('fund_sources JSON was not saved');
  }

  // Cancel multi-source expense to verify multi-source refund
  console.log('-> Cancelling multi-source expense...');
  const cancelMulti = await service.softDeleteExpense(schoolUnitId, multiExp.id, 'Salah input faktur', 1);
  console.log('-> Cancel Multi Result:', cancelMulti.success);

  console.log('\n=== ALL EXPENSES STORNO & RAPBS TESTS PASSED SUCCESSFULLY! ===\n');
  process.exit(0);
}

testExpenses().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
