/**
 * Migration: kitchen_recipe_ingredients
 * Modul Dapur: Komposisi Bahan & Bumbu per Resep Masakan
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_recipe_ingredients', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('recipe_id').unsigned().notNullable();
    table.bigInteger('ingredient_id').unsigned().notNullable();
    table.decimal('qty', 12, 3).notNullable();
    table.bigInteger('unit_id').unsigned().notNullable();
    table.decimal('yield_percentage', 5, 2).nullable(); // misal 85.00%
    table.boolean('is_seasoning').defaultTo(false); // bumbu/penyedap
    table.timestamps(true, true);

    table.foreign('recipe_id').references('id').inTable('kitchen_recipes').onDelete('CASCADE');
    table.foreign('ingredient_id').references('id').inTable('kitchen_ingredients').onDelete('RESTRICT');
    table.foreign('unit_id').references('id').inTable('kitchen_units').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_recipe_ingredients');
};
