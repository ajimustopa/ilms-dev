/**
 * Migration: create_recruitment_candidates_table
 * Modul Kepegawaian - Fitur: Rekrutmen & Onboarding Pegawai Baru
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('recruitment_candidates', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.string('candidate_name', 150).notNullable();
    table.string('applied_position', 150).notNullable();
    table.enum('selection_stage', ['applied', 'screening', 'interview', 'accepted', 'rejected']).notNullable().defaultTo('applied');
    table.bigInteger('activated_employee_id').unsigned().nullable()
      .references('id').inTable('employees');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('recruitment_candidates');
};
