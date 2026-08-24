/**
 * Migration: kitchen_system_parameters
 * Modul Dapur: Parameter Sistem Dapur
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_system_parameters', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('param_key', 150).notNullable().unique();
    table.text('param_value').nullable();
    table.string('description', 255).nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_system_parameters');
};
