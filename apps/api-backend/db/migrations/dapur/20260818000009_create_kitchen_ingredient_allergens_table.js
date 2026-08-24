/**
 * Migration: kitchen_ingredient_allergens
 * Modul Dapur: Pivot Alergen pada Bahan Baku
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_ingredient_allergens', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('ingredient_id').unsigned().notNullable();
    table.bigInteger('allergen_id').unsigned().notNullable();
    table.timestamps(true, true);

    table.unique(['ingredient_id', 'allergen_id']);
    table.foreign('ingredient_id').references('id').inTable('kitchen_ingredients').onDelete('CASCADE');
    table.foreign('allergen_id').references('id').inTable('kitchen_master_data').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_ingredient_allergens');
};
