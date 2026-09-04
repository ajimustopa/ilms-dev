/**
 * Migration: alter_expenses_add_fund_source_fields
 * Modul Keuangan - Menambahkan field sumber dana (fund_source_type, fund_source_ref_id, fund_source_override_reason) pada expenses
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.table('expenses', (table) => {
    table.enum('fund_source_type', ['fee_type', 'transaction_category', 'opening_pool']).nullable().defaultTo('opening_pool');
    table.bigInteger('fund_source_ref_id').unsigned().nullable().defaultTo(0);
    table.text('fund_source_override_reason').nullable();

    table.index(['fund_source_type', 'fund_source_ref_id'], 'idx_expenses_fund_source');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  try {
    await knex.schema.table('expenses', (table) => {
      table.dropColumn('fund_source_override_reason');
      table.dropColumn('fund_source_ref_id');
      table.dropColumn('fund_source_type');
    });
  } catch (e) {}
};
