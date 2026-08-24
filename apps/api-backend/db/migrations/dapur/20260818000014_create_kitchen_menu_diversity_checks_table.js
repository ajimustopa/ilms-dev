/**
 * Migration: kitchen_menu_diversity_checks
 * Modul Dapur: Pengecekan Keberagaman Menu & Penandaan Menu Favorit
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_menu_diversity_checks', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('menu_id').unsigned().notNullable();
    table.enum('check_type', ['diversity', 'favorite_tag']).notNullable();
    table.text('result').nullable();
    table.bigInteger('checked_by').unsigned().nullable();
    table.timestamp('checked_at').nullable();
    table.timestamps(true, true);

    table.foreign('menu_id').references('id').inTable('kitchen_menus').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_menu_diversity_checks');
};
