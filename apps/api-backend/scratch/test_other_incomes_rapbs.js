/**
 * Test Other Incomes RAPBS Integration
 */
const service = require('../src/modules/keuangan/other-incomes/service');
const knex = require('../src/config/db/keuangan');

async function testRapbsIncome() {
  console.log('--- TESTING OTHER INCOMES RAPBS INTEGRATION ---');
  const schoolUnitId = 1;
  const academicYearId = 1;

  // 1. Fetch available RAPBS income sources
  const rapbsSources = await service.getRapbsIncomeSources(schoolUnitId, academicYearId);
  console.log(`-> Found ${rapbsSources.length} RAPBS income sources for unit ${schoolUnitId}, AY ${academicYearId}`);
  if (rapbsSources.length > 0) {
    console.log(`   Sample: ID ${rapbsSources[0].id}, Name: "${rapbsSources[0].name}", Planned: ${rapbsSources[0].planned_amount}`);
  }

  // 2. Pick or seed an income item
  let targetItem = rapbsSources[0];
  if (!targetItem) {
    // Check if any budget plan exists
    let bp = await knex('budget_plans').where({ school_unit_id: schoolUnitId }).first();
    if (!bp) {
      const [id] = await knex('budget_plans').insert({
        school_unit_id: schoolUnitId,
        academic_year_id: academicYearId,
        title: 'RAPBS Test 2025/2026',
        version: 1,
        status: 'published'
      });
      bp = await knex('budget_plans').where({ id }).first();
    }
    const [bpiId] = await knex('budget_plan_income_items').insert({
      budget_plan_id: bp.id,
      name: 'Subsidi Donasi Yayasan Test',
      planned_amount: 15000000
    });
    targetItem = { id: bpiId, name: 'Subsidi Donasi Yayasan Test' };
  }

  // Check cash account
  const cashAcc = await knex('cash_accounts').where({ school_unit_id: schoolUnitId }).first();
  if (!cashAcc) throw new Error('No cash account found');

  const journalsBefore = await knex('journal_entries').count('id as cnt').first();

  // 3. Create Other Income linked to RAPBS
  console.log(`\nCreating other income linked to RAPBS Item ID: ${targetItem.id} ("${targetItem.name}")...`);
  const created = await service.createOtherIncome(schoolUnitId, {
    academic_year_id: academicYearId,
    budget_plan_income_item_id: targetItem.id,
    cash_account_id: cashAcc.id,
    amount: 2500000,
    received_at: '2026-08-15',
    notes: 'Penerimaan termin 1 dari Yayasan'
  }, 1);

  console.log(`-> Created Other Income ID: ${created.id}`);
  console.log(`   budget_plan_income_item_id: ${created.budget_plan_income_item_id}`);
  console.log(`   amount: ${created.amount}`);

  // 4. Verify listOtherIncomes returns budget_income_name
  const list = await service.listOtherIncomes(schoolUnitId, { academic_year_id: academicYearId });
  const found = list.find(x => x.id === created.id);
  console.log(`-> Listed item: ID ${found.id}, budget_income_name: "${found.budget_income_name}"`);
  if (found.budget_plan_income_item_id !== targetItem.id) {
    throw new Error('budget_plan_income_item_id not preserved');
  }

  // 5. Verify journal was created
  const journalsAfter = await knex('journal_entries').count('id as cnt').first();
  console.log(`-> Journals before: ${journalsBefore.cnt}, after: ${journalsAfter.cnt}`);
  if (parseInt(journalsAfter.cnt, 10) !== parseInt(journalsBefore.cnt, 10) + 1) {
    throw new Error('Expected 1 journal entry to be formed');
  }

  console.log('\n=== ALL RAPBS OTHER INCOMES TESTS PASSED SUCCESSFULLY! ===\n');
  process.exit(0);
}

testRapbsIncome().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
