/**
 * Migration: kitchen_cost_estimates
 * Modul Dapur: Estimasi & Simulasi Biaya Masak / Pekanan
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_cost_estimates', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.string('item_name', 150).notNullable();
    table.decimal('qty', 12, 3).notNullable();
    table.decimal('unit_cost', 12, 2).notNullable();
    table.decimal('total_cost', 14, 2).notNullable();
    table.string('price_source', 100).nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_cost_estimates');
};
