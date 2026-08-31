/**
 * Migration: enhance_work_plan_programs_for_rkt
 * Modul Manajemen - Fitur 3: Rencana Kerja Tahunan (RKT) & Program Tahunan
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasCode = await knex.schema.hasColumn('work_plan_programs', 'code');
  if (!hasCode) {
    await knex.schema.alterTable('work_plan_programs', (table) => {
      table.string('code', 50).nullable().after('id');
      table.bigInteger('strategic_goal_id').unsigned().nullable().after('school_work_plan_id');
      table.text('indicator').nullable().after('target');
      table.decimal('progress_percent', 5, 2).notNullable().defaultTo(0.00).after('budget_estimate_reference');
      table.bigInteger('school_unit_id').unsigned().nullable().alter();
      table.bigInteger('pic_employee_id').unsigned().nullable().alter();

      table.foreign('strategic_goal_id', 'fk_wpp_sg')
        .references('id')
        .inTable('strategic_goals')
        .onDelete('SET NULL');

      table.index(['strategic_goal_id'], 'idx_wpp_goal');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasCode = await knex.schema.hasColumn('work_plan_programs', 'code');
  if (hasCode) {
    await knex.schema.alterTable('work_plan_programs', (table) => {
      table.dropForeign('strategic_goal_id', 'fk_wpp_sg');
      table.dropColumn('code');
      table.dropColumn('strategic_goal_id');
      table.dropColumn('indicator');
      table.dropColumn('progress_percent');
    });
  }
};
