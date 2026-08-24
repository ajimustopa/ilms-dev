/**
 * Migration: kitchen_production_schedules
 * Modul Dapur: Jadwal Produksi Masak
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_production_schedules', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.date('schedule_date').notNullable();
    table.bigInteger('menu_id').unsigned().notNullable();
    table.enum('status', ['planned', 'in_progress', 'done']).defaultTo('planned');
    table.text('notes').nullable();
    table.timestamps(true, true);

    table.foreign('menu_id').references('id').inTable('kitchen_menus').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_production_schedules');
};
