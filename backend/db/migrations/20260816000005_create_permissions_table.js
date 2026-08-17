/**
 * Migration: create_permissions_table
 * Fitur #4: Master Izin / Permissions
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('permissions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('code', 100).notNullable().unique();
    table.string('module', 100).notNullable();
    table.string('description', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('permissions');
};
