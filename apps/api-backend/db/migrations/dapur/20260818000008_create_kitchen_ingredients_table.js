/**
 * Migration: kitchen_ingredients
 * Modul Dapur: Master Bahan Baku
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_ingredients', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('code', 30).notNullable().unique();
    table.string('name', 150).notNullable();
    table.bigInteger('category_id').unsigned().notNullable();
    table.bigInteger('base_unit_id').unsigned().notNullable();
    table.decimal('min_stock', 12, 2).nullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.text('description').nullable();
    table.timestamps(true, true);

    table.foreign('category_id').references('id').inTable('kitchen_master_data').onDelete('RESTRICT');
    table.foreign('base_unit_id').references('id').inTable('kitchen_units').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_ingredients');
};
