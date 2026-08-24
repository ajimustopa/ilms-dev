/**
 * Migration: kitchen_production_logs (Append-Only)
 * Modul Dapur: Log Proses Masak, Sisa Masakan, Rework, Downtime Alat, Serah Terima Shift & Kebersihan
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_production_logs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('log_type', [
      'cooking_process',
      'prep_checklist',
      'cooking_result',
      'leftover',
      'rework',
      'equipment_downtime',
      'shift_handover',
      'area_checkin',
      'cleaning_checklist'
    ]).notNullable();
    table.bigInteger('production_batch_id').unsigned().nullable();
    table.bigInteger('recorded_by').unsigned().nullable(); // ref pegawai/koki
    table.text('notes').nullable();
    table.timestamp('recorded_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now()); // append-only, no updated_at

    table.foreign('production_batch_id').references('id').inTable('kitchen_production_batches').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_production_logs');
};
