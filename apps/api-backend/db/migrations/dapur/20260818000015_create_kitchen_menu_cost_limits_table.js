/**
 * Migration: kitchen_menu_cost_limits
 * Modul Dapur: Batas Biaya per Porsi Menu
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_menu_cost_limits', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('menu_id').unsigned().nullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.decimal('max_cost_per_portion', 12, 2).notNullable();
    table.timestamps(true, true);

    table.foreign('menu_id').references('id').inTable('kitchen_menus').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_menu_cost_limits');
};
