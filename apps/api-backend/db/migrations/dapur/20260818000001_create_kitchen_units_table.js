/**
 * Migration: kitchen_units
 * Modul Dapur: Master Satuan
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_units', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('code', 20).notNullable().unique();
    table.string('name', 50).notNullable();
    table.enum('unit_type', ['weight', 'volume', 'count']).notNullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_units');
};
