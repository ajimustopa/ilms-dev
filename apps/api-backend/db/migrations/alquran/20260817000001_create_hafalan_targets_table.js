/**
 * Migration: hafalan_targets
 * Sesuai erd-alquran.md §2.1 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('hafalan_targets', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.bigInteger('class_ref_id').unsigned().notNullable();
    table.bigInteger('academic_period_ref_id').unsigned().nullable();
    table.string('period_label', 100).nullable();
    table.enu('target_type', ['juz', 'halaman']).notNullable();
    table.integer('target_value').unsigned().notNullable();
    table.text('notes').nullable();
    table.bigInteger('created_by_ref_id').unsigned().nullable();
    table.timestamps(true, true);

    // Indexes
    table.index('class_ref_id', 'idx_hafalan_targets_class');
    table.index('school_unit_id', 'idx_hafalan_targets_school');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('hafalan_targets');
};
