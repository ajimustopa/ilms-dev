/**
 * Migration: enhance_operational_expenses_and_incomes
 * Modul Kantin - Menambahkan kolom type (income/expense), category, akun kas kantin, akun COA, dan nomor bukti kas (BKM/BKK)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('operational_expenses');
  if (hasTable) {
    await knex.schema.alterTable('operational_expenses', function (table) {
      table.string('type', 20).notNullable().defaultTo('expense'); // 'income' | 'expense'
      table.string('category', 50).nullable(); // 'operasional', 'listrik_air', 'kebersihan', 'sewa_stand', 'insentif', 'jasa', 'lainnya'
      table.string('receipt_number', 50).nullable().index();
      table.bigInteger('cash_account_id').unsigned().nullable().index();
      table.string('cash_account_name', 150).nullable();
      table.bigInteger('coa_account_id').unsigned().nullable();
      table.string('coa_account_code', 50).nullable();
      table.string('coa_account_name', 150).nullable();
      table.bigInteger('bank_statement_id').unsigned().nullable().index();
      table.bigInteger('finance_transaction_id').unsigned().nullable();
      table.bigInteger('journal_entry_id').unsigned().nullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable('operational_expenses');
  if (hasTable) {
    await knex.schema.alterTable('operational_expenses', function (table) {
      table.dropColumn('type');
      table.dropColumn('category');
      table.dropColumn('receipt_number');
      table.dropColumn('cash_account_id');
      table.dropColumn('cash_account_name');
      table.dropColumn('coa_account_id');
      table.dropColumn('coa_account_code');
      table.dropColumn('coa_account_name');
      table.dropColumn('bank_statement_id');
      table.dropColumn('finance_transaction_id');
      table.dropColumn('journal_entry_id');
    });
  }
};
