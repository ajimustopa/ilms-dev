/**
 * Migration: create_student_class_enrollments_table
 * Modul Akademik - Fitur: Penempatan Siswa ke Rombel (Class Enrollments)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('student_class_enrollments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.bigInteger('class_group_id').unsigned().notNullable()
      .references('id').inTable('class_groups');
    table.bigInteger('academic_year_id').unsigned().notNullable()
      .references('id').inTable('academic_years');
    table.enum('status', ['aktif', 'naik_kelas', 'tinggal_kelas', 'pindah', 'lulus']).notNullable().defaultTo('aktif');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['student_id', 'academic_year_id'], 'uq_enrollments_student_academic_year');
    table.index(['satuan_pendidikan_id'], 'idx_enrollments_satuan');
    table.index(['student_id'], 'idx_enrollments_student');
    table.index(['class_group_id'], 'idx_enrollments_class_group');
    table.index(['academic_year_id'], 'idx_enrollments_academic_year');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_class_enrollments');
};
