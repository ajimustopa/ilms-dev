/**
 * Migration: add_account_id_to_cash_accounts
 * Menambahkan foreign key account_id ke tabel cash_accounts yang merujuk ke chart_of_accounts(id)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasAccountId = await knex.schema.hasColumn('cash_accounts', 'account_id');
  if (!hasAccountId) {
    await knex.schema.alterTable('cash_accounts', (table) => {
      table.bigInteger('account_id').unsigned().nullable().after('bank_name');
      table.foreign('account_id', 'fk_cash_accounts_coa').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasAccountId = await knex.schema.hasColumn('cash_accounts', 'account_id');
  if (hasAccountId) {
    await knex.schema.alterTable('cash_accounts', (table) => {
      table.dropForeign(['account_id'], 'fk_cash_accounts_coa');
      table.dropColumn('account_id');
    });
  }
};
