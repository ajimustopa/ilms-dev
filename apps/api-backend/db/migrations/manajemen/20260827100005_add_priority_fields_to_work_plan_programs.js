/**
 * Migration: add_priority_fields_to_work_plan_programs
 * Modul Manajemen - Fitur 5: Program Prioritas Kelembagaan
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasCol = await knex.schema.hasColumn('work_plan_programs', 'is_priority');
  if (!hasCol) {
    await knex.schema.alterTable('work_plan_programs', (table) => {
      table.boolean('is_priority').notNullable().defaultTo(false).after('status');
      table.enum('priority_level', ['high', 'medium', 'low']).notNullable().defaultTo('medium').after('is_priority');
      table.text('priority_reason').nullable().after('priority_level');

      table.index(['is_priority'], 'idx_wpp_is_priority');
      table.index(['priority_level'], 'idx_wpp_priority_lvl');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasCol = await knex.schema.hasColumn('work_plan_programs', 'is_priority');
  if (hasCol) {
    await knex.schema.alterTable('work_plan_programs', (table) => {
      table.dropColumn('is_priority');
      table.dropColumn('priority_level');
      table.dropColumn('priority_reason');
    });
  }
};
