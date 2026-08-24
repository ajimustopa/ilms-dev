/**
 * Migration: create_student_attendances_table
 * Modul Akademik - Fitur: Presensi Harian Siswa (Student Attendances)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('student_attendances', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.bigInteger('class_group_id').unsigned().notNullable()
      .references('id').inTable('class_groups');
    table.date('attendance_date').notNullable();
    table.enum('status', ['hadir', 'izin', 'sakit', 'alpa']).notNullable();
    table.text('notes').nullable();
    table.bigInteger('recorded_by_employee_id').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['student_id', 'attendance_date'], 'uq_student_attendances_student_date');
    table.index(['satuan_pendidikan_id'], 'idx_student_attendances_satuan');
    table.index(['student_id'], 'idx_student_attendances_student');
    table.index(['class_group_id'], 'idx_student_attendances_class_group');
    table.index(['attendance_date'], 'idx_student_attendances_date');
    table.index(['status'], 'idx_student_attendances_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_attendances');
};
