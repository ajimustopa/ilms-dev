/**
 * Migration: kitchen_production_batch_materials
 * Modul Dapur: Kitting & Pencatatan Pemakaian Bahan Baku Aktual
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_production_batch_materials', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('production_batch_id').unsigned().notNullable();
    table.bigInteger('ingredient_id').unsigned().notNullable();
    table.decimal('planned_qty', 12, 3).notNullable();
    table.decimal('actual_qty', 12, 3).nullable();
    table.decimal('variance_qty', 12, 3).nullable();
    table.timestamps(true, true);

    table.foreign('production_batch_id').references('id').inTable('kitchen_production_batches').onDelete('CASCADE');
    table.foreign('ingredient_id').references('id').inTable('kitchen_ingredients').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_production_batch_materials');
};
