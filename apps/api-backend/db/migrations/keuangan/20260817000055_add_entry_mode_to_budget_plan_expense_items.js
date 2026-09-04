/**
 * Migration 55: Add entry_mode and lump_sum_description to budget_plan_expense_items
 * Modul: Keuangan (RAPBS & Budgeting)
 */
exports.up = async function(knex) {
  const hasEntryMode = await knex.schema.hasColumn('budget_plan_expense_items', 'entry_mode');
  if (!hasEntryMode) {
    await knex.schema.table('budget_plan_expense_items', (table) => {
      table.enum('entry_mode', ['itemized', 'lump_sum']).notNullable().defaultTo('itemized').after('fund_source_fee_type_id');
      table.text('lump_sum_description').nullable().after('planned_amount');
    });
  }

  // Ubah quantity dan unit_price agar nullable untuk mendukung mode lump_sum
  await knex.schema.alterTable('budget_plan_expense_items', (table) => {
    table.decimal('quantity', 10, 2).nullable().alter();
    table.decimal('unit_price', 18, 2).nullable().alter();
    table.string('unit', 30).nullable().alter();
  });
};

exports.down = async function(knex) {
  const hasEntryMode = await knex.schema.hasColumn('budget_plan_expense_items', 'entry_mode');
  if (hasEntryMode) {
    await knex.schema.table('budget_plan_expense_items', (table) => {
      table.dropColumn('lump_sum_description');
      table.dropColumn('entry_mode');
    });
  }
};
