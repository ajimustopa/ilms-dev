/**
 * Migration: kitchen_batch_qc_results
 * Modul Dapur: Status Kelulusan / Rilis Mutu Batch Masakan
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_batch_qc_results', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('production_batch_id').unsigned().notNullable();
    table.enum('release_status', ['released', 'rejected', 'pending']).defaultTo('pending');
    table.bigInteger('reviewed_by').unsigned().nullable(); // ref QC Dapur
    table.timestamp('reviewed_at').nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);

    table.foreign('production_batch_id').references('id').inTable('kitchen_production_batches').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_batch_qc_results');
};
