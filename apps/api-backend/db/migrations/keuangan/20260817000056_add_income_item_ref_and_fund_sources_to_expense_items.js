/**
 * Migration 56: Add fund_source_income_item_id and fund_sources to budget_plan_expense_items
 * Modul: Keuangan (RAPBS & Multi-source Funding for Lump Sum Budgeting)
 */
exports.up = async function(knex) {
  const hasIncomeRef = await knex.schema.hasColumn('budget_plan_expense_items', 'fund_source_income_item_id');
  if (!hasIncomeRef) {
    await knex.schema.table('budget_plan_expense_items', (table) => {
      table.bigInteger('fund_source_income_item_id').unsigned().nullable().after('fund_source_fee_type_id');
      table.text('fund_sources').nullable().after('lump_sum_description');
      table.index(['fund_source_income_item_id'], 'idx_bpei_income_item');
    });
  }
};

exports.down = async function(knex) {
  const hasIncomeRef = await knex.schema.hasColumn('budget_plan_expense_items', 'fund_source_income_item_id');
  if (hasIncomeRef) {
    await knex.schema.table('budget_plan_expense_items', (table) => {
      table.dropIndex(['fund_source_income_item_id'], 'idx_bpei_income_item');
      table.dropColumn('fund_sources');
      table.dropColumn('fund_source_income_item_id');
    });
  }
};
