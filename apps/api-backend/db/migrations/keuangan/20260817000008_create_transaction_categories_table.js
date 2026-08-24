/**
 * Migration: create_transaction_categories_table
 * Modul Keuangan - Fitur #7: Jenis Pengeluaran & Pemasukan Khusus
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('transaction_categories', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.enum('category_kind', ['expense', 'special_income']).notNullable();
    table.string('name', 150).notNullable();
    table.bigInteger('related_account_id').unsigned().nullable()
      .references('id').inTable('chart_of_accounts')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['school_unit_id'], 'idx_transaction_categories_school_unit');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('transaction_categories');
};
