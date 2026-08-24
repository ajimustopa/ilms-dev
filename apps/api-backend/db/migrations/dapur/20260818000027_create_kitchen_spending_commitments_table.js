/**
 * Migration: kitchen_spending_commitments
 * Modul Dapur: Komitmen Belanja & Pengendalian Anggaran
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_spending_commitments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('purchase_order_id').unsigned().nullable();
    table.decimal('committed_amount', 14, 2).notNullable();
    table.enum('status', ['open', 'closed']).defaultTo('open');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_spending_commitments');
};
