/**
 * Migration: create_approval_steps_table
 * Modul Manajemen - Fitur #200: Jenjang & Step Persetujuan
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('approval_steps', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('approval_workflow_id').unsigned().notNullable();
    table.specificType('step_order', 'SMALLINT UNSIGNED').notNullable();
    table.bigInteger('approver_job_position_id').unsigned().nullable();
    table.bigInteger('approver_employee_id').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table
      .foreign('approval_workflow_id', 'fk_as_workflow')
      .references('id')
      .inTable('approval_workflows')
      .onDelete('CASCADE');

    table.unique(['approval_workflow_id', 'step_order'], 'uq_as');
    table.index(['approver_job_position_id'], 'idx_as_position');
    table.index(['approver_employee_id'], 'idx_as_employee');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('approval_steps');
};
