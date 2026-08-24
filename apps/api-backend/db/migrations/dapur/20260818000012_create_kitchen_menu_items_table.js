/**
 * Migration: kitchen_menu_items
 * Modul Dapur: Komponen Hidangan per Menu
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_menu_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('menu_id').unsigned().notNullable();
    table.string('dish_name', 150).notNullable();
    table.bigInteger('recipe_id').unsigned().nullable();
    table.decimal('portion_qty', 10, 2).defaultTo(1.0);
    table.bigInteger('portion_unit_id').unsigned().notNullable();
    table.timestamps(true, true);

    table.foreign('menu_id').references('id').inTable('kitchen_menus').onDelete('CASCADE');
    table.foreign('recipe_id').references('id').inTable('kitchen_recipes').onDelete('SET NULL');
    table.foreign('portion_unit_id').references('id').inTable('kitchen_units').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_menu_items');
};
