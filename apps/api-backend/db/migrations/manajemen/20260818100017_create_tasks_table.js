/**
 * Migration: create_tasks_table
 * Modul Manajemen - Fitur #198: Pelacakan Tugas & Pekerjaan (Tasks)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('tasks', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('project_id').unsigned().nullable();
    table.string('reference_type', 50).nullable();
    table.bigInteger('reference_id').unsigned().nullable();
    table.string('title', 200).notNullable();
    table.text('description').nullable();
    table.bigInteger('assignee_employee_id').unsigned().notNullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.enum('priority', ['low', 'medium', 'high']).notNullable().defaultTo('medium');
    table.enum('status', ['todo', 'in_progress', 'done', 'cancelled']).notNullable().defaultTo('todo');
    table.date('due_date').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table
      .foreign('project_id', 'fk_tasks_project')
      .references('id')
      .inTable('projects')
      .onDelete('SET NULL');

    table.index(['school_unit_id'], 'idx_tasks_school_unit');
    table.index(['project_id'], 'idx_tasks_project');
    table.index(['assignee_employee_id'], 'idx_tasks_assignee');
    table.index(['status'], 'idx_tasks_status');
    table.index(['reference_type', 'reference_id'], 'idx_tasks_ref');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('tasks');
};
