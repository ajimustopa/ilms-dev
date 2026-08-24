/**
 * Migration: kitchen_recipes
 * Modul Dapur: Master Resep & Standar Masakan
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_recipes', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('code', 30).nullable().unique();
    table.string('name', 150).notNullable();
    table.decimal('base_portion_qty', 10, 2).defaultTo(1.0);
    table.bigInteger('parent_recipe_id').unsigned().nullable();
    table.smallint('version').defaultTo(1);
    table.enum('status', ['draft', 'approved']).defaultTo('draft');
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approved_at').nullable();
    table.timestamps(true, true);

    table.foreign('parent_recipe_id').references('id').inTable('kitchen_recipes').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_recipes');
};
