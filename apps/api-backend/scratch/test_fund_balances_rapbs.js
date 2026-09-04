/**
 * Test Fund Balances RAPBS Pockets Integration & Inter-Year Loans
 */
const engine = require('../src/modules/keuangan/bookkeeping/fundBalanceEngine');
const knex = require('../src/config/db/keuangan');

async function runTest() {
  console.log('--- TEST FUND BALANCES RAPBS INTEGRATION ---');
  const schoolUnitId = 1;
  const academicYearId = 2;

  // 1. Test listing fund balances for TA 2
  console.log('1. Querying listFundBalances for TA 2...');
  const resAy2 = await engine.listFundBalances(schoolUnitId, academicYearId);
  console.log('-> Summary TA 2:', resAy2.summary);
  console.log(`-> Total fund pockets: ${resAy2.funds.length}`);

  const hasOpeningPool = resAy2.funds.some(f => f.fund_type === 'opening_pool');
  if (!hasOpeningPool) throw new Error('Opening pool row is missing');

  // 2. Test apply mutation with budget_income_item
  console.log('\n2. Testing applyFundMutation with budget_income_item...');
  const testBpiiId = 10; // Subsidi Donasi Yayasan Test
  const mutationResult = await engine.applyFundMutation({
    schoolUnitId,
    fundType: 'budget_income_item',
    fundRefId: testBpiiId,
    academicYearId,
    direction: 'in',
    amount: 5000000,
    sourceTable: 'other_incomes',
    sourceId: 9999,
    notes: 'Test donasi masuk ke pos RAPBS Subsidi Donasi Yayasan'
  });

  console.log('-> Mutation result:', {
    fund_balance_id: mutationResult.fund_balance_id,
    direction: mutationResult.direction,
    amount: mutationResult.amount,
    balance_after: mutationResult.balance_after
  });

  // Verify that listFundBalances now reflects the mutation
  const resAfterMut = await engine.listFundBalances(schoolUnitId, academicYearId);
  const targetPocket = resAfterMut.funds.find(f => f.budget_plan_income_item_id === testBpiiId);
  console.log('-> Pocket after mutation:', {
    name: targetPocket?.name,
    planned: targetPocket?.planned_amount,
    in: targetPocket?.total_in,
    bal: targetPocket?.balance,
    serapan: targetPocket?.realization_percentage
  });

  if (!targetPocket || targetPocket.balance < 5000000) {
    throw new Error('Pocket balance did not reflect the 5.000.000 mutation');
  }

  // Cleanup the test mutation to leave db pristine
  await knex('fund_balance_mutations').where({ source_table: 'other_incomes', source_id: 9999 }).del();
  await knex('fund_balances').where({ id: mutationResult.fund_balance_id }).decrement('balance', 5000000);

  console.log('\n=== ALL FUND BALANCES RAPBS TESTS PASSED CLEANLY! ===\n');
  process.exit(0);
}

runTest().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
