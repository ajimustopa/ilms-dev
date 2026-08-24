/**
 * Migration: create_student_disciplinary_records_table
 * Modul Akademik - Fitur: Pencatatan Pelanggaran & Poin Disiplin (Disciplinary Records)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('student_disciplinary_records', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('student_id').unsigned().notNullable()
      .references('id').inTable('students');
    table.string('violation_type', 150).notNullable();
    table.smallint('points').notNullable();
    table.date('incident_date').notNullable();
    table.bigInteger('handled_by_employee_id').unsigned().nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['student_id'], 'idx_disciplinary_student');
    table.index(['incident_date'], 'idx_disciplinary_incident_date');
    table.index(['handled_by_employee_id'], 'idx_disciplinary_handled_by');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_disciplinary_records');
};
