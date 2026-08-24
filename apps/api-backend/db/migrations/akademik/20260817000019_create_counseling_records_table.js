/**
 * Migration: create_counseling_records_table
 * Modul Akademik - Fitur: Bimbingan Konseling (Counseling Records)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('counseling_records', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.date('session_date').notNullable();
    table.string('service_type', 100).nullable();
    table.text('notes').notNullable();
    table.enum('visibility_level', ['bk_only', 'bk_and_homeroom', 'all_staff']).notNullable().defaultTo('bk_only');
    table.bigInteger('counselor_employee_id').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id'], 'idx_counseling_student');
    table.index(['session_date'], 'idx_counseling_session_date');
    table.index(['visibility_level'], 'idx_counseling_visibility');
    table.index(['counselor_employee_id'], 'idx_counseling_counselor');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('counseling_records');
};
