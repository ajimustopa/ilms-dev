/**
 * Migration: add_bank_statement_id_to_other_incomes
 * Modul Keuangan:
 * Menambahkan kolom bank_statement_id ke tabel other_incomes untuk integrasi rekening koran nontunai
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('other_incomes');
  if (hasTable) {
    const hasColumn = await knex.schema.hasColumn('other_incomes', 'bank_statement_id');
    if (!hasColumn) {
      await knex.schema.alterTable('other_incomes', (table) => {
        table.bigInteger('bank_statement_id').unsigned().nullable().after('cash_account_id').index();
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable('other_incomes');
  if (hasTable) {
    const hasColumn = await knex.schema.hasColumn('other_incomes', 'bank_statement_id');
    if (hasColumn) {
      await knex.schema.alterTable('other_incomes', (table) => {
        table.dropColumn('bank_statement_id');
      });
    }
  }
};
