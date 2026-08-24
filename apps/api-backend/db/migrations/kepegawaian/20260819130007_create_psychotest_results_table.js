/**
 * Migration: create_psychotest_results_table
 * Modul Kepegawaian - Fitur: Hasil Evaluasi, Skor Akhir & Laporan HRD Psikotes
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('psychotest_results', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('session_id').unsigned().notNullable().unique()
      .references('id').inTable('psychotest_sessions').onDelete('CASCADE');
    table.bigInteger('test_type_id').unsigned().notNullable()
      .references('id').inTable('psychotest_types').onDelete('CASCADE');
    table.bigInteger('candidate_id').unsigned().nullable()
      .references('id').inTable('recruitment_candidates').onDelete('SET NULL');
    table.bigInteger('employee_id').unsigned().nullable()
      .references('id').inTable('employees').onDelete('SET NULL');
    table.string('result_code', 50).notNullable(); // mis. 'INTJ', 'OCEAN_HIGH_C'
    table.string('result_label', 150).notNullable();
    table.json('dimension_scores').notNullable(); // Objek skor per dimensi & persentase
    table.text('profile_summary').notNullable();
    table.text('strengths_summary').nullable();
    table.text('development_areas').nullable();
    table.text('hrd_recommendation').notNullable();
    table.json('radar_chart_data').nullable(); // Data koordinat visualisasi radar / bar chart
    table.string('assessor_name', 150).nullable();
    table.text('assessor_evaluation').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['test_type_id'], 'idx_psychotest_results_type');
    table.index(['candidate_id'], 'idx_psychotest_results_candidate');
    table.index(['employee_id'], 'idx_psychotest_results_employee');
    table.index(['result_code'], 'idx_psychotest_results_code');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('psychotest_results');
};
