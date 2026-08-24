/**
 * Migration: kitchen_cost_records
 * Modul Dapur: Realisasi Biaya Dapur Aktual (Bahan, Waste, Overhead, Alokasi Layanan)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_cost_records', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.enum('cost_type', [
      'ingredient_per_portion',
      'waste',
      'overhead',
      'per_service_allocation'
    ]).notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.decimal('amount', 14, 2).notNullable();
    table.string('source_ref', 100).nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_cost_records');
};
