/**
 * Migration: munaqasyah_exams
 * Sesuai erd-alquran.md §2.3 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('munaqasyah_exams', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('student_ref_id').unsigned().notNullable();
    table.tinyint('juz_examined').unsigned().notNullable();
    table.date('exam_date').notNullable();
    table.bigInteger('examiner_teacher_ref_id').unsigned().notNullable();
    table.decimal('score', 5, 2).nullable();
    table.enu('status', ['scheduled', 'completed', 'cancelled']).notNullable().defaultTo('scheduled');
    table.text('notes').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['student_ref_id', 'exam_date'], 'idx_munaqasyah_exams_student_date');
    table.index('school_unit_id', 'idx_munaqasyah_exams_school');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('munaqasyah_exams');
};
