/**
 * Migration: kitab_kuning
 * Sesuai erd-alquran.md §2.4 & §3
 */
exports.up = function(knex) {
  return knex.schema.createTable('kitab_kuning', function(table) {
    table.bigIncrements('id').primary().unsigned();
    table.bigInteger('school_unit_id').unsigned().notNullable();
    table.string('book_name', 150).notNullable();
    table.string('author', 150).nullable();
    table.string('level', 50).nullable();
    table.bigInteger('teacher_ref_id').unsigned().nullable();
    table.boolean('status_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('school_unit_id', 'idx_kitab_kuning_school');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('kitab_kuning');
};
