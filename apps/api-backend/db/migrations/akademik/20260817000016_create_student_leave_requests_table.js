/**
 * Migration: create_student_leave_requests_table
 * Modul Akademik - Fitur: Pengajuan Izin / Sakit Siswa (Student Leave Requests)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('student_leave_requests', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.date('leave_date').notNullable();
    table.enum('leave_type', ['izin', 'sakit']).notNullable();
    table.text('reason').nullable();
    table.string('attachment_url', 255).nullable();
    table.bigInteger('requested_by_guardian_id').unsigned().nullable()
      .references('id').inTable('guardians');
    table.enum('approval_status', ['menunggu', 'disetujui', 'ditolak']).notNullable().defaultTo('menunggu');
    table.bigInteger('approved_by_employee_id').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id'], 'idx_leave_requests_student');
    table.index(['requested_by_guardian_id'], 'idx_leave_requests_guardian');
    table.index(['leave_date'], 'idx_leave_requests_date');
    table.index(['approval_status'], 'idx_leave_requests_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_leave_requests');
};
