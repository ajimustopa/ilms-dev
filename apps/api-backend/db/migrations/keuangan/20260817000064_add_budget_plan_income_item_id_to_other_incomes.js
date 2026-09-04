/**
 * Migration 64: Add budget_plan_income_item_id to other_incomes
 * Module: Keuangan - RAPBS Income Item Integration for Other Incomes
 */
exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('other_incomes', 'budget_plan_income_item_id');
  if (!hasCol) {
    await knex.schema.alterTable('other_incomes', function(table) {
      table.bigInteger('budget_plan_income_item_id').unsigned().nullable().after('transaction_category_id')
        .references('id').inTable('budget_plan_income_items').onDelete('RESTRICT');
      table.index(['budget_plan_income_item_id'], 'idx_other_incomes_bpii');
    });
  }
};

exports.down = async function(knex) {
  const hasCol = await knex.schema.hasColumn('other_incomes', 'budget_plan_income_item_id');
  if (hasCol) {
    await knex.schema.alterTable('other_incomes', function(table) {
      table.dropForeign(['budget_plan_income_item_id']);
      table.dropIndex(['budget_plan_income_item_id'], 'idx_other_incomes_bpii');
      table.dropColumn('budget_plan_income_item_id');
    });
  }
};
