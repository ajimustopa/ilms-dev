/**
 * Migration: create_evaluation_follow_ups_table
 * Modul Manajemen - Fitur 12: Monitoring, Evaluasi & Rencana Tindak Lanjut (RTL)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasFollowUps = await knex.schema.hasTable('evaluation_follow_ups');
  if (!hasFollowUps) {
    await knex.schema.createTable('evaluation_follow_ups', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.enum('source_type', ['kpi', 'program', 'activity', 'quality_goal', 'supervision', 'evadir', 'risk', 'general']).notNullable().defaultTo('general');
      table.bigInteger('source_id').unsigned().nullable();
      table.string('source_code', 50).nullable();
      table.string('source_name', 255).nullable();
      table.text('issue').notNullable();
      table.text('deviation_analysis').nullable();
      table.text('action_plan').notNullable();
      table.bigInteger('pic_employee_id').unsigned().nullable();
      table.date('deadline').nullable();
      table.enum('status', ['draft', 'in_progress', 'completed', 'verified', 'delayed']).notNullable().defaultTo('draft');
      table.integer('progress_percent').notNullable().defaultTo(0);
      table.text('completion_notes').nullable();
      table.timestamp('completed_at').nullable();
      table.string('evidence_url', 500).nullable();
      table.bigInteger('verified_by_employee_id').unsigned().nullable();
      table.timestamp('verified_at').nullable();
      table.bigInteger('created_by').unsigned().notNullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['school_unit_id'], 'idx_efu_school_unit');
      table.index(['source_type', 'source_id'], 'idx_efu_source');
      table.index(['status'], 'idx_efu_status');
      table.index(['pic_employee_id'], 'idx_efu_pic');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('evaluation_follow_ups');
};
