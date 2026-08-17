/**
 * Migration: create_role_permissions_table
 * Fitur #4: Pivot Role - Permission
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('role_permissions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('role_id').unsigned().notNullable()
      .references('id').inTable('roles')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('permission_id').unsigned().notNullable()
      .references('id').inTable('permissions')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['role_id', 'permission_id'], 'uq_role_permissions');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('role_permissions');
};
