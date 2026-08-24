/**
 * Migration: create_student_mutations_table
 * Modul Akademik - Fitur: Riwayat Mutasi Siswa (Student Mutations)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('student_mutations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.enum('mutation_type', ['masuk', 'pindah_keluar', 'pindah_masuk', 'lulus', 'keluar']).notNullable();
    table.date('mutation_date').notNullable();
    table.string('origin_or_destination_school', 150).nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['satuan_pendidikan_id'], 'idx_student_mutations_satuan');
    table.index(['student_id'], 'idx_student_mutations_student');
    table.index(['mutation_type'], 'idx_student_mutations_type');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_mutations');
};
