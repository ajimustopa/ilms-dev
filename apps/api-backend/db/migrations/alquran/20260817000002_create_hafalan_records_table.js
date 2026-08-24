/**
 * Migration: hafalan_records
 * Sesuai erd-alquran.md §2.2 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('hafalan_records', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('student_ref_id').unsigned().notNullable();
    table.tinyint('juz').unsigned().notNullable();
    table.smallint('page_start').unsigned().nullable();
    table.smallint('page_end').unsigned().nullable();
    table.date('record_date').notNullable();
    table.decimal('tajwid_score', 5, 2).nullable();
    table.enu('verification_status', ['pending', 'verified', 'rejected']).notNullable().defaultTo('pending');
    table.bigInteger('recorded_by_teacher_ref_id').unsigned().notNullable();
    table.bigInteger('verified_by_teacher_ref_id').unsigned().nullable();
    table.timestamp('verified_at').nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['student_ref_id', 'record_date'], 'idx_hafalan_records_student_date');
    table.index('school_unit_id', 'idx_hafalan_records_school');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('hafalan_records');
};
