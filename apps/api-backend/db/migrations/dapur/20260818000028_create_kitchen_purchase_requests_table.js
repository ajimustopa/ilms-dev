/**
 * Migration: kitchen_purchase_requests
 * Modul Dapur: Permintaan Pembelian Bahan
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_purchase_requests', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('requested_by').unsigned().notNullable(); // ref user/pegawai
    table.date('request_date').notNullable();
    table.string('notes', 255).nullable();
    table.enum('status', ['draft', 'submitted', 'approved', 'rejected']).defaultTo('draft');
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_purchase_requests');
};
