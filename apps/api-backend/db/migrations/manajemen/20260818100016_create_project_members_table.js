/**
 * Migration: create_project_members_table
 * Modul Manajemen - Fitur #199: Anggota Tim Proyek
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('project_members', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('project_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.string('role_in_project', 100).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table
      .foreign('project_id', 'fk_pm_project')
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE');

    table.unique(['project_id', 'employee_id'], 'uq_pm');
    table.index(['employee_id'], 'idx_pm_employee');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('project_members');
};
