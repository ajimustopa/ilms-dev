/**
 * Migration: kitchen_data_validations
 * Modul Dapur: Log Validasi & Pengecekan Integritas Data Dapur
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_data_validations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('validation_type', 100).notNullable();
    table.string('entity_type', 100).notNullable();
    table.bigInteger('entity_id').unsigned().nullable();
    table.enum('result', ['valid', 'invalid']).notNullable();
    table.text('notes').nullable();
    table.timestamp('validated_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_data_validations');
};
