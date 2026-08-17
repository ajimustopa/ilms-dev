/**
 * Migration: create_api_clients_table
 * Fitur #12: Pendaftaran Klien API & Autentikasi Gateway Internal
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('api_clients', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('client_name', 100).notNullable();
    table.string('api_key_hash', 255).notNullable().unique();
    table.enum('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('api_clients');
};
