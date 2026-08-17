/**
 * Migration: create_user_school_roles_table
 * Fitur #4: Penugasan Role User per Satuan Pendidikan (Multi-Tenancy RBAC)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_school_roles', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('school_unit_id').unsigned().notNullable()
      .references('id').inTable('school_units')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('role_id').unsigned().notNullable()
      .references('id').inTable('roles')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['user_id', 'school_unit_id', 'role_id'], 'uq_user_school_roles');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('user_school_roles');
};
