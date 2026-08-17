/**
 * Migration: create_users_table
 * Fitur #1, #3: Akun Pengguna & Login SSO
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('username', 100).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('full_name', 150).notNullable();
    table.enum('account_type', ['admin', 'teacher', 'staff', 'student', 'parent']).notNullable();
    table.string('ref_type', 50).nullable();
    table.bigInteger('ref_id').unsigned().nullable();
    table.enum('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.timestamp('last_login_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['ref_type', 'ref_id'], 'uq_users_ref');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
