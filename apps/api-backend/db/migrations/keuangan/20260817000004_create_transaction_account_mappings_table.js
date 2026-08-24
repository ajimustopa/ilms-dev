/**
 * Migration: create_transaction_account_mappings_table
 * Modul Keuangan - Fitur #4: Mapping Akun Transaksi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('transaction_account_mappings', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('transaction_code', 50).notNullable();
    table.string('transaction_label', 150).notNullable();
    table.bigInteger('debit_account_id').unsigned().notNullable()
      .references('id').inTable('chart_of_accounts')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('credit_account_id').unsigned().notNullable()
      .references('id').inTable('chart_of_accounts')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'transaction_code'], 'uq_tam_code');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('transaction_account_mappings');
};
