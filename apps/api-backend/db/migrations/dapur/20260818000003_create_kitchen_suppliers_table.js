/**
 * Migration: kitchen_suppliers
 * Modul Dapur: Master Supplier
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('kitchen_suppliers', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().nullable();
    table.string('code', 30).notNullable().unique();
    table.string('name', 150).notNullable();
    table.string('contact_person', 100).nullable();
    table.string('phone', 30).nullable();
    table.text('address').nullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('kitchen_suppliers');
};
