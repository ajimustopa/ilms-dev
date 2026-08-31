/**
 * Migration: enhance_school_work_plans_for_long_term
 * Modul Manajemen - Fitur 2: RPS, RJJP & RJM
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasPlanType = await knex.schema.hasColumn('school_work_plans', 'plan_type');
  if (!hasPlanType) {
    await knex.schema.alterTable('school_work_plans', (table) => {
      table.enum('plan_type', ['rps', 'rjjp', 'rjm', 'rkt']).notNullable().defaultTo('rkt').after('id');
      table.string('code', 50).nullable().after('plan_type');
      table.bigInteger('parent_plan_id').unsigned().nullable().after('institution_development_plan_id');
      table.bigInteger('strategic_goal_id').unsigned().nullable().after('parent_plan_id');
      table.specificType('period_start_year', 'SMALLINT UNSIGNED').nullable().after('academic_year_id');
      table.specificType('period_end_year', 'SMALLINT UNSIGNED').nullable().after('period_start_year');
      table.text('description').nullable().after('program_focus');
      table.text('target_initial').nullable().after('description');
      table.text('target_final').nullable().after('target_initial');
      table.text('current_achievement').nullable().after('target_final');
      table.decimal('progress_percent', 5, 2).notNullable().defaultTo(0.00).after('current_achievement');
      table.string('document_url', 255).nullable().after('budget_ceiling_reference');
      table.bigInteger('school_unit_id').unsigned().nullable().alter();

      table.foreign('parent_plan_id', 'fk_swp_parent')
        .references('id')
        .inTable('school_work_plans')
        .onDelete('SET NULL');

      table.foreign('strategic_goal_id', 'fk_swp_sg')
        .references('id')
        .inTable('strategic_goals')
        .onDelete('SET NULL');

      table.index(['plan_type'], 'idx_swp_type');
      table.index(['parent_plan_id'], 'idx_swp_parent');
      table.index(['strategic_goal_id'], 'idx_swp_goal');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasPlanType = await knex.schema.hasColumn('school_work_plans', 'plan_type');
  if (hasPlanType) {
    await knex.schema.alterTable('school_work_plans', (table) => {
      table.dropForeign('parent_plan_id', 'fk_swp_parent');
      table.dropForeign('strategic_goal_id', 'fk_swp_sg');
      table.dropColumn('plan_type');
      table.dropColumn('code');
      table.dropColumn('parent_plan_id');
      table.dropColumn('strategic_goal_id');
      table.dropColumn('period_start_year');
      table.dropColumn('period_end_year');
      table.dropColumn('description');
      table.dropColumn('target_initial');
      table.dropColumn('target_final');
      table.dropColumn('current_achievement');
      table.dropColumn('progress_percent');
      table.dropColumn('document_url');
    });
  }
};
