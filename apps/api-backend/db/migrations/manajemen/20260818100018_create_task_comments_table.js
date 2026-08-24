/**
 * Migration: create_task_comments_table
 * Modul Manajemen - Fitur #198: Komentar & Log Progres Tugas (Append-Only)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('task_comments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('task_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.text('comment').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('task_id', 'fk_tc_task')
      .references('id')
      .inTable('tasks')
      .onDelete('CASCADE');

    table.index(['task_id'], 'idx_tc_task');
    table.index(['employee_id'], 'idx_tc_employee');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('task_comments');
};
