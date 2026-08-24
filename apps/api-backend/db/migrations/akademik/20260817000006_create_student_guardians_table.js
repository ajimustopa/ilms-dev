/**
 * Migration: create_student_guardians_table
 * Modul Akademik - Fitur: Relasi Siswa & Orang Tua / Wali (Pivot)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('student_guardians', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.bigInteger('guardian_id').unsigned().notNullable()
      .references('id').inTable('guardians');
    table.enum('relationship', ['ayah', 'ibu', 'wali_lain']).notNullable();
    table.boolean('is_primary_contact').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['student_id', 'guardian_id'], 'uq_student_guardians_student_guardian');
    table.index(['student_id'], 'idx_student_guardians_student');
    table.index(['guardian_id'], 'idx_student_guardians_guardian');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_guardians');
};
