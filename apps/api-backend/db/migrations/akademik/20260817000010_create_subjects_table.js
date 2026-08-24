/**
 * Migration: create_subjects_table
 * Modul Akademik - Fitur: Mata Pelajaran (Subjects)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('subjects', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.bigInteger('grade_level_id').unsigned().nullable()
      .references('id').inTable('grade_levels');
    table.string('name', 100).notNullable();
    table.string('code', 20).nullable();
    table.decimal('kkm', 5, 2).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['satuan_pendidikan_id'], 'idx_subjects_satuan');
    table.index(['grade_level_id'], 'idx_subjects_grade_level');
    table.index(['code'], 'idx_subjects_code');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('subjects');
};
