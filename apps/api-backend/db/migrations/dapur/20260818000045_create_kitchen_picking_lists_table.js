/**
 * Migration: kitchen_picking_lists
 * Modul Dapur: Picking List Pengambilan Bahan dari Gudang untuk Produksi
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_picking_lists', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('production_batch_id').unsigned().nullable();
    table.date('picking_date').notNullable();
    table.enum('status', ['open', 'picked']).defaultTo('open');
    table.text('notes').nullable();
    table.timestamps(true, true);

    table.foreign('production_batch_id').references('id').inTable('kitchen_production_batches').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_picking_lists');
};
