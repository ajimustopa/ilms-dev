/**
 * Migration: kitchen_operational_calendar
 * Modul Dapur: Kalender Hari Operasional Dapur
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_operational_calendar', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.date('calendar_date').notNullable().unique();
    table.boolean('is_operational').defaultTo(true);
    table.string('reason', 255).nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_operational_calendar');
};
