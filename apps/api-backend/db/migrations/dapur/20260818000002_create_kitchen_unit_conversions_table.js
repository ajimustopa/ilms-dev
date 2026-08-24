/**
 * Migration: kitchen_unit_conversions
 * Modul Dapur: Master Konversi Antar Satuan
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_unit_conversions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.bigInteger('from_unit_id').unsigned().notNullable();
    table.bigInteger('to_unit_id').unsigned().notNullable();
    table.decimal('factor', 12, 6).notNullable();
    table.timestamps(true, true);

    table.unique(['from_unit_id', 'to_unit_id']);
    table.foreign('from_unit_id').references('id').inTable('kitchen_units').onDelete('CASCADE');
    table.foreign('to_unit_id').references('id').inTable('kitchen_units').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_unit_conversions');
};
