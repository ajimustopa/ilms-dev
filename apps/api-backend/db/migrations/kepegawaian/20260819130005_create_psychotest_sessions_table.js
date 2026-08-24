/**
 * Migration: create_psychotest_sessions_table
 * Modul Kepegawaian - Fitur: Sesi Pelaksanaan Tes Psikologi
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('psychotest_sessions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('school_unit_id').unsigned().nullable();
    table.bigInteger('test_type_id').unsigned().notNullable()
      .references('id').inTable('psychotest_types').onDelete('CASCADE');
    table.bigInteger('candidate_id').unsigned().nullable()
      .references('id').inTable('recruitment_candidates').onDelete('SET NULL');
    table.bigInteger('employee_id').unsigned().nullable()
      .references('id').inTable('employees').onDelete('SET NULL');
    table.string('participant_name', 150).notNullable();
    table.string('participant_email', 150).nullable();
    table.string('session_code', 50).notNullable().unique(); // Token akses unik tes
    table.enum('status', ['scheduled', 'in_progress', 'completed', 'expired']).notNullable().defaultTo('scheduled');
    table.timestamp('scheduled_at').nullable();
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.integer('duration_minutes').notNullable().defaultTo(30);
    table.integer('time_spent_seconds').notNullable().defaultTo(0);
    table.text('assessor_notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['test_type_id'], 'idx_psychotest_sessions_type');
    table.index(['candidate_id'], 'idx_psychotest_sessions_candidate');
    table.index(['employee_id'], 'idx_psychotest_sessions_employee');
    table.index(['status'], 'idx_psychotest_sessions_status');
    table.index(['session_code'], 'idx_psychotest_sessions_code');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('psychotest_sessions');
};
