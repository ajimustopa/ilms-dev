/**
 * Migration: 20260828160001_create_evadir_tables
 * Modul Manajemen - Fitur Evaluasi Diri (EVADIR) Berbasis Sasaran RIPS & BSC
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. evadir_reports
  const hasReports = await knex.schema.hasTable('evadir_reports');
  if (!hasReports) {
    await knex.schema.createTable('evadir_reports', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('school_unit_id').unsigned().nullable(); // NULL = EVADIR tingkat yayasan
      table.bigInteger('rips_document_id').unsigned().notNullable();
      table.string('period_label', 100).notNullable(); // mis. "Semester 1 2026/2027"
      table.date('evaluation_date').notNullable();
      table.enum('status', ['draft', 'published']).notNullable().defaultTo('draft');
      table.integer('current_version').unsigned().notNullable().defaultTo(1);
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('rips_document_id', 'fk_evadir_rips')
        .references('id')
        .inTable('rips_documents')
        .onDelete('CASCADE');

      table.index(['school_unit_id'], 'idx_evadir_unit');
      table.index(['rips_document_id'], 'idx_evadir_rips');
      table.index(['status'], 'idx_evadir_status');
    });
  }

  // 2. evadir_goal_results
  const hasResults = await knex.schema.hasTable('evadir_goal_results');
  if (!hasResults) {
    await knex.schema.createTable('evadir_goal_results', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('evadir_report_id').unsigned().notNullable();
      table.bigInteger('rips_goal_id').unsigned().notNullable();
      table.enum('input_mode', ['percent', 'unit_ratio']).notNullable().defaultTo('percent');
      table.decimal('achieved_percent', 6, 2).nullable();
      table.decimal('achieved_numerator', 10, 2).nullable();
      table.decimal('achieved_denominator', 10, 2).nullable();
      table.text('analysis_notes').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('evadir_report_id', 'fk_egr_report')
        .references('id')
        .inTable('evadir_reports')
        .onDelete('CASCADE');

      table.foreign('rips_goal_id', 'fk_egr_goal')
        .references('id')
        .inTable('rips_goals')
        .onDelete('CASCADE');

      table.unique(['evadir_report_id', 'rips_goal_id'], 'uq_egr_report_goal');
      table.index(['evadir_report_id'], 'idx_egr_report');
      table.index(['rips_goal_id'], 'idx_egr_goal');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('evadir_goal_results');
  await knex.schema.dropTableIfExists('evadir_reports');
};
