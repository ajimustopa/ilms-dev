/**
 * Migration: create_approval_actions_table
 * Modul Manajemen - Fitur #200: Log Tindakan Persetujuan (Append-Only)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('approval_actions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('approval_request_id').unsigned().notNullable();
    table.bigInteger('approval_step_id').unsigned().notNullable();
    table.bigInteger('approver_employee_id').unsigned().notNullable();
    table.enum('action', ['approved', 'rejected', 'returned']).notNullable();
    table.text('notes').nullable();
    table.timestamp('acted_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('approval_request_id', 'fk_aa_request')
      .references('id')
      .inTable('approval_requests')
      .onDelete('CASCADE');

    table
      .foreign('approval_step_id', 'fk_aa_step')
      .references('id')
      .inTable('approval_steps')
      .onDelete('CASCADE');

    table.index(['approval_request_id'], 'idx_aa_request');
    table.index(['approval_step_id'], 'idx_aa_step');
    table.index(['approver_employee_id'], 'idx_aa_approver');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('approval_actions');
};
