/**
 * Migration: create_class_groups_table
 * Modul Akademik - Fitur: Rombongan Belajar / Kelas (Class Groups)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('class_groups', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
    table.bigInteger('academic_year_id').unsigned().notNullable()
      .references('id').inTable('academic_years');
    table.bigInteger('grade_level_id').unsigned().notNullable()
      .references('id').inTable('grade_levels');
    table.string('name', 50).notNullable();
    table.bigInteger('homeroom_teacher_employee_id').unsigned().nullable();
    table.smallint('capacity').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['satuan_pendidikan_id'], 'idx_class_groups_satuan');
    table.index(['academic_year_id'], 'idx_class_groups_academic_year');
    table.index(['grade_level_id'], 'idx_class_groups_grade_level');
    table.index(['homeroom_teacher_employee_id'], 'idx_class_groups_homeroom_teacher');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('class_groups');
};
