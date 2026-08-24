/**
 * Migration: create_approval_requests_table
 * Modul Manajemen - Fitur #200: Pengajuan Persetujuan (Approval Requests)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('approval_requests', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('approval_workflow_id').unsigned().notNullable();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('reference_type', 50).notNullable();
    table.bigInteger('reference_id').unsigned().notNullable();
    table.bigInteger('requested_by_employee_id').unsigned().notNullable();
    table.specificType('current_step', 'SMALLINT UNSIGNED').notNullable().defaultTo(1);
    table.enum('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table
      .foreign('approval_workflow_id', 'fk_ar_workflow')
      .references('id')
      .inTable('approval_workflows')
      .onDelete('CASCADE');

    table.index(['approval_workflow_id'], 'idx_ar_workflow');
    table.index(['school_unit_id'], 'idx_ar_school_unit');
    table.index(['requested_by_employee_id'], 'idx_ar_requester');
    table.index(['status'], 'idx_ar_status');
    table.index(['reference_type', 'reference_id'], 'idx_ar_ref');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('approval_requests');
};
