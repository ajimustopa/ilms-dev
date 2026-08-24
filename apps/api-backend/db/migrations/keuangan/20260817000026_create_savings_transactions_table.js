/**
 * Migration: create_savings_transactions_table
 * Modul Keuangan - Fitur #27: Transaksi Tabungan (Setor & Tarik)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('savings_transactions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('savings_account_id').unsigned().notNullable()
      .references('id').inTable('savings_accounts')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.enum('transaction_type', ['deposit', 'withdrawal']).notNullable();
    table.decimal('amount', 18, 2).notNullable();
    table.timestamp('transacted_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['savings_account_id', 'transacted_at'], 'idx_st_account_time');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('savings_transactions');
};
