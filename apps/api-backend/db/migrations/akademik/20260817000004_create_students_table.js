/**
 * Migration: create_students_table
 * Modul Akademik - Fitur: Data Induk Siswa (Students)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('students', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.string('nis', 30).notNullable();
    table.string('nisn', 20).nullable().unique();
    table.string('full_name', 150).notNullable();
    table.enum('gender', ['L', 'P']).notNullable();
    table.string('birth_place', 100).nullable();
    table.date('birth_date').nullable();
    table.text('address').nullable();
    table.string('photo_url', 255).nullable();
    table.bigInteger('user_id').unsigned().nullable();
    table.enum('status', ['calon', 'aktif', 'lulus', 'pindah', 'keluar']).notNullable().defaultTo('calon');
    table.date('enrolled_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['satuan_pendidikan_id', 'nis'], 'uq_students_satuan_nis');
    table.index(['satuan_pendidikan_id'], 'idx_students_satuan_pendidikan');
    table.index(['status'], 'idx_students_status');
    table.index(['user_id'], 'idx_students_user_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('students');
};
