/**
 * Migration 85: Add debit_account_id, credit_account_id, cash_account_id, and fund_source_income_item_id
 * to catalog_items and budget_plan_expense_items.
 */
exports.up = async function(knex) {
  // 1. Alter catalog_items
  const hasCatDebit = await knex.schema.hasColumn('catalog_items', 'debit_account_id');
  if (!hasCatDebit) {
    await knex.schema.table('catalog_items', (table) => {
      table.bigInteger('debit_account_id').unsigned().nullable().after('reference_price');
      table.bigInteger('credit_account_id').unsigned().nullable().after('debit_account_id');
      table.bigInteger('cash_account_id').unsigned().nullable().after('credit_account_id');
      table.bigInteger('fund_source_income_item_id').unsigned().nullable().after('cash_account_id');

      table.foreign('debit_account_id', 'fk_catalog_debit_acc').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.foreign('credit_account_id', 'fk_catalog_credit_acc').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.foreign('cash_account_id', 'fk_catalog_cash_acc').references('id').inTable('cash_accounts').onDelete('SET NULL');
      table.foreign('fund_source_income_item_id', 'fk_catalog_income_item').references('id').inTable('budget_plan_income_items').onDelete('SET NULL');
    });
  }

  // 2. Alter budget_plan_expense_items
  const hasBpeiDebit = await knex.schema.hasColumn('budget_plan_expense_items', 'debit_account_id');
  if (!hasBpeiDebit) {
    await knex.schema.table('budget_plan_expense_items', (table) => {
      table.bigInteger('debit_account_id').unsigned().nullable().after('fund_source_income_item_id');
      table.bigInteger('credit_account_id').unsigned().nullable().after('debit_account_id');
      table.bigInteger('cash_account_id').unsigned().nullable().after('credit_account_id');

      table.foreign('debit_account_id', 'fk_bpei_debit_acc').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.foreign('credit_account_id', 'fk_bpei_credit_acc').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.foreign('cash_account_id', 'fk_bpei_cash_acc').references('id').inTable('cash_accounts').onDelete('SET NULL');
    });
  }
};

exports.down = async function(knex) {
  const hasCatDebit = await knex.schema.hasColumn('catalog_items', 'debit_account_id');
  if (hasCatDebit) {
    await knex.schema.table('catalog_items', (table) => {
      table.dropForeign(['debit_account_id'], 'fk_catalog_debit_acc');
      table.dropForeign(['credit_account_id'], 'fk_catalog_credit_acc');
      table.dropForeign(['cash_account_id'], 'fk_catalog_cash_acc');
      table.dropForeign(['fund_source_income_item_id'], 'fk_catalog_income_item');
      table.dropColumn(['debit_account_id', 'credit_account_id', 'cash_account_id', 'fund_source_income_item_id']);
    });
  }

  const hasBpeiDebit = await knex.schema.hasColumn('budget_plan_expense_items', 'debit_account_id');
  if (hasBpeiDebit) {
    await knex.schema.table('budget_plan_expense_items', (table) => {
      table.dropForeign(['debit_account_id'], 'fk_bpei_debit_acc');
      table.dropForeign(['credit_account_id'], 'fk_bpei_credit_acc');
      table.dropForeign(['cash_account_id'], 'fk_bpei_cash_acc');
      table.dropColumn(['debit_account_id', 'credit_account_id', 'cash_account_id']);
    });
  }
};
