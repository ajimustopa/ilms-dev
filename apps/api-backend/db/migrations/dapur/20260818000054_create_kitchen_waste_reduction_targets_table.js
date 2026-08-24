/**
 * Migration: kitchen_waste_reduction_targets
 * Modul Dapur: Target & Monitoring Pengurangan Sampah Dapur
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_waste_reduction_targets', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.decimal('target_value', 12, 2).notNullable(); // target persentase atau kg
    table.decimal('actual_value', 12, 2).nullable();
    table.text('action_taken').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_waste_reduction_targets');
};
