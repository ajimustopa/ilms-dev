const bookkeepingService = require('../src/modules/keuangan/bookkeeping/service');

async function test() {
  console.log('--- TEST BOOKKEEPING GENERAL LEDGER & WORKSHEET ---');
  const schoolUnitId = 1;

  // 1. Test General Ledger
  console.log('1. Testing getGeneralLedger...');
  const ledger = await bookkeepingService.getGeneralLedger(schoolUnitId, {});
  console.log(`-> Loaded ${ledger.length} accounts in ledger.`);
  if (ledger.length > 0) {
    console.log('Sample account in ledger:', {
      code: ledger[0].account_code,
      name: ledger[0].account_name,
      total_debit: ledger[0].total_debit,
      total_credit: ledger[0].total_credit,
      ending_balance: ledger[0].ending_balance,
      mutation_count: ledger[0].mutations.length
    });
  }

  // 2. Test Worksheet
  console.log('\n2. Testing getWorksheet...');
  const ws = await bookkeepingService.getWorksheet(schoolUnitId, {});
  console.log('-> Worksheet totals:', ws.totals);
  console.log('-> Net surplus/deficit:', ws.surplus_deficit);
  console.log(`-> Worksheet rows: ${ws.worksheet.length}`);

  console.log('\n=== ALL BOOKKEEPING TESTS PASSED CLEANLY! ===\n');
  process.exit(0);
}

test().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
