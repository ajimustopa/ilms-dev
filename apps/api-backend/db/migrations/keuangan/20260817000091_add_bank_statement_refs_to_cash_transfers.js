/**
 * Migration 91: add_bank_statement_refs_to_cash_transfers
 * Module: Keuangan
 * Menambahkan referensi rekening koran bank asal (debet/kas keluar) dan tujuan (kredit/kas masuk) pada cash_transfers.
 */

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('cash_transfers');
  if (hasTable) {
    const hasFromBs = await knex.schema.hasColumn('cash_transfers', 'from_bank_statement_id');
    if (!hasFromBs) {
      await knex.schema.alterTable('cash_transfers', function(table) {
        table.bigInteger('from_bank_statement_id').unsigned().nullable().after('from_cash_account_id').index();
        table.bigInteger('to_bank_statement_id').unsigned().nullable().after('to_cash_account_id').index();
      });
    }
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('cash_transfers');
  if (hasTable) {
    const hasFromBs = await knex.schema.hasColumn('cash_transfers', 'from_bank_statement_id');
    if (hasFromBs) {
      await knex.schema.alterTable('cash_transfers', function(table) {
        table.dropColumn('to_bank_statement_id');
        table.dropColumn('from_bank_statement_id');
      });
    }
  }
};
