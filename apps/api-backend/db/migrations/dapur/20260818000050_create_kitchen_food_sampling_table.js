/**
 * Migration: kitchen_food_sampling
 * Modul Dapur: Penyimpanan & Pengujian Sampel Makanan per Batch Masak
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_food_sampling', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('production_batch_id').unsigned().notNullable();
    table.date('sample_date').notNullable();
    table.text('result').nullable();
    table.enum('status', ['kept', 'disposed']).defaultTo('kept');
    table.timestamps(true, true);

    table.foreign('production_batch_id').references('id').inTable('kitchen_production_batches').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_food_sampling');
};
