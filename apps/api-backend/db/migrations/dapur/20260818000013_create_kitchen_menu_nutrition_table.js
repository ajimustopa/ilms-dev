/**
 * Migration: kitchen_menu_nutrition
 * Modul Dapur: Standar Nutrisi/Gizi Komponen Menu
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_menu_nutrition', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('menu_item_id').unsigned().notNullable();
    table.string('nutrient_type', 50).notNullable(); // kalori, protein, karbohidrat, lemak, dsb.
    table.decimal('value', 10, 2).notNullable();
    table.string('unit', 20).notNullable(); // kkal, gram, mg
    table.timestamps(true, true);

    table.foreign('menu_item_id').references('id').inTable('kitchen_menu_items').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_menu_nutrition');
};
