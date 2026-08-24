/**
 * Migration: kitchen_report_schedules
 * Modul Dapur: Jadwal Ekspor Laporan Otomatis Dapur
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_report_schedules', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('report_type', 100).notNullable();
    table.string('schedule_cron', 50).nullable();
    table.timestamp('last_exported_at').nullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_report_schedules');
};
