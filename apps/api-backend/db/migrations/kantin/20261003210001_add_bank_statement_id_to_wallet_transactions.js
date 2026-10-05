/**
 * Migration: add_bank_statement_id_to_wallet_transactions
 * Modul Kantin - Menambahkan referensi rekening koran (bank_statement_id) untuk auto-fill & rekonsiliasi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('wallet_transactions', 'bank_statement_id');
  if (!hasCol) {
    await knex.schema.alterTable('wallet_transactions', function(table) {
      table.bigInteger('bank_statement_id').unsigned().nullable().after('cash_account_id');
      table.index('bank_statement_id', 'idx_wt_bank_statement');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasCol = await knex.schema.hasColumn('wallet_transactions', 'bank_statement_id');
  if (hasCol) {
    await knex.schema.alterTable('wallet_transactions', function(table) {
      table.dropIndex('bank_statement_id', 'idx_wt_bank_statement');
      table.dropColumn('bank_statement_id');
    });
  }
};
