/**
 * Migration: create_cash_account_opening_balances_table
 * Modul Keuangan - Fitur #2: Saldo Awal Kas per Tahun Ajaran
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('cash_account_opening_balances', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('cash_account_id').unsigned().notNullable()
      .references('id').inTable('cash_accounts')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('academic_year_id').unsigned().notNullable();
    table.decimal('opening_balance', 18, 2).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['cash_account_id', 'academic_year_id'], 'uq_caob');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('cash_account_opening_balances');
};
