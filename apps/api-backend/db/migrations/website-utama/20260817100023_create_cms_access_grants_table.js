/**
 * Migration: create_cms_access_grants_table
 * Modul Website Utama - Fitur #34: Hak Akses CMS Website
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('cms_access_grants', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('user_id').unsigned().notNullable();
    table.string('role_code', 50).notNullable();
    table.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['school_unit_id', 'user_id'], 'uq_cms_access');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('cms_access_grants');
};
