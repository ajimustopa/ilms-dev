/**
 * Migration: add_cash_account_and_journal_to_wallet_transactions
 * Modul Kantin - Menambahkan referensi rekening kas/bank, nomor jurnal, dan catatan transaksi dompet
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasCashAccountId = await knex.schema.hasColumn('wallet_transactions', 'cash_account_id');
  if (!hasCashAccountId) {
    await knex.schema.alterTable('wallet_transactions', function(table) {
      table.bigInteger('cash_account_id').unsigned().nullable();
      table.bigInteger('journal_entry_id').unsigned().nullable();
      table.string('journal_number', 50).nullable();
      table.text('notes').nullable();

      table.index('cash_account_id', 'idx_wt_cash_account');
      table.index('journal_number', 'idx_wt_journal_number');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasCashAccountId = await knex.schema.hasColumn('wallet_transactions', 'cash_account_id');
  if (hasCashAccountId) {
    await knex.schema.alterTable('wallet_transactions', function(table) {
      table.dropIndex('journal_number', 'idx_wt_journal_number');
      table.dropIndex('cash_account_id', 'idx_wt_cash_account');
      table.dropColumn('notes');
      table.dropColumn('journal_number');
      table.dropColumn('journal_entry_id');
      table.dropColumn('cash_account_id');
    });
  }
};
