/**
 * Migration: add_finance_ref_to_canteen_fee_payments
 * Modul Kantin
 */
exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('canteen_fee_payments', 'journal_entry_id');
  if (!hasCol) {
    await knex.schema.alterTable('canteen_fee_payments', function(table) {
      table.bigInteger('journal_entry_id').unsigned().nullable();
      table.string('journal_number', 50).nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasCol = await knex.schema.hasColumn('canteen_fee_payments', 'journal_entry_id');
  if (hasCol) {
    await knex.schema.alterTable('canteen_fee_payments', function(table) {
      table.dropColumn('journal_number');
      table.dropColumn('journal_entry_id');
    });
  }
};
