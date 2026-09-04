/**
 * Migration 66: Add budget_plan_income_item_id to fund_balances and expand fund_type
 * Module: Keuangan - RAPBS Income Item as Fund Balance Pocket
 */
exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('fund_balances', 'budget_plan_income_item_id');
  if (!hasCol) {
    await knex.schema.alterTable('fund_balances', function(table) {
      table.string('fund_type', 50).notNullable().alter();
      table.bigInteger('budget_plan_income_item_id').unsigned().nullable().after('fund_ref_id')
        .references('id').inTable('budget_plan_income_items').onDelete('SET NULL');
      table.index(['budget_plan_income_item_id'], 'idx_fund_balances_bpii');
    });
  }
};

exports.down = async function(knex) {
  const hasCol = await knex.schema.hasColumn('fund_balances', 'budget_plan_income_item_id');
  if (hasCol) {
    await knex.schema.alterTable('fund_balances', function(table) {
      table.dropForeign(['budget_plan_income_item_id']);
      table.dropIndex(['budget_plan_income_item_id'], 'idx_fund_balances_bpii');
      table.dropColumn('budget_plan_income_item_id');
    });
  }
};
