/**
 * Migration: kitchen_menu_evaluations
 * Modul Dapur: Evaluasi & Feedback Menu
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_menu_evaluations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('menu_id').unsigned().notNullable();
    table.bigInteger('evaluated_by').unsigned().nullable();
    table.smallint('rating').nullable(); // 1 - 5
    table.text('feedback').nullable();
    table.timestamp('evaluated_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.foreign('menu_id').references('id').inTable('kitchen_menus').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_menu_evaluations');
};
