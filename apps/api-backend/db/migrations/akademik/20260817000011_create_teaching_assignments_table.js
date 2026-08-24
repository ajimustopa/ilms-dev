/**
 * Migration: create_teaching_assignments_table
 * Modul Akademik - Fitur: Penugasan Guru & Jadwal Ajar (Teaching Assignments)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('teaching_assignments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.bigInteger('teacher_employee_id').unsigned().notNullable();
    table.bigInteger('subject_id').unsigned().notNullable()
      .references('id').inTable('subjects');
    table.bigInteger('class_group_id').unsigned().notNullable()
      .references('id').inTable('class_groups');
    table.tinyint('day_of_week').nullable();
    table.string('period', 20).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['satuan_pendidikan_id'], 'idx_teaching_assignments_satuan');
    table.index(['teacher_employee_id'], 'idx_teaching_assignments_teacher');
    table.index(['subject_id'], 'idx_teaching_assignments_subject');
    table.index(['class_group_id'], 'idx_teaching_assignments_class_group');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('teaching_assignments');
};
