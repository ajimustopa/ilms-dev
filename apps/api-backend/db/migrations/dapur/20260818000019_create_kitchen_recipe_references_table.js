/**
 * Migration: kitchen_recipe_references
 * Modul Dapur: Foto Referensi & Panduan Visual Resep
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_recipe_references', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('recipe_id').unsigned().notNullable();
    table.string('photo_url', 255).notNullable();
    table.string('caption', 255).nullable();
    table.timestamps(true, true);

    table.foreign('recipe_id').references('id').inTable('kitchen_recipes').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_recipe_references');
};
