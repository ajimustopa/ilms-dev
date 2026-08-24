/**
 * Migration: create_report_cards_table
 * Modul Akademik - Fitur: Rapor Siswa & Catatan Wali Kelas (Report Cards)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('report_cards', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.bigInteger('semester_id').unsigned().notNullable()
      .references('id').inTable('semesters');
    table.text('homeroom_note').nullable();
    table.string('file_url', 255).nullable();
    table.timestamp('generated_at').nullable();
    table.bigInteger('generated_by_employee_id').unsigned().nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['student_id', 'semester_id'], 'uq_report_cards_student_semester');
    table.index(['student_id'], 'idx_report_cards_student');
    table.index(['semester_id'], 'idx_report_cards_semester');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('report_cards');
};
