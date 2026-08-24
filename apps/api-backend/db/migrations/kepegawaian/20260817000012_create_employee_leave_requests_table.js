/**
 * Migration: create_employee_leave_requests_table
 * Modul Kepegawaian - Fitur: Cuti & Izin Pegawai
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('employee_leave_requests', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees');
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('leave_type', 100).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.text('reason').nullable();
    table.enum('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    table.bigInteger('approved_by').unsigned().nullable()
      .references('id').inTable('employees');
    table.timestamp('approved_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('employee_leave_requests');
};
