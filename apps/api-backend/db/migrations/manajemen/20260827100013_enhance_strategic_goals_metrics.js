/**
 * Migration: enhance_strategic_goals_metrics
 * Adds baseline_year, baseline_value, target_value, unit, weight to strategic_goals
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasBaselineYear = await knex.schema.hasColumn('strategic_goals', 'baseline_year');
  if (!hasBaselineYear) {
    await knex.schema.alterTable('strategic_goals', (table) => {
      table.integer('baseline_year').nullable().after('target_description');
      table.decimal('baseline_value', 10, 2).nullable().after('baseline_year');
      table.decimal('target_value', 10, 2).nullable().after('baseline_value');
      table.string('unit', 50).nullable().after('target_value');
      table.decimal('weight', 5, 2).nullable().defaultTo(0.00).after('unit');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasBaselineYear = await knex.schema.hasColumn('strategic_goals', 'baseline_year');
  if (hasBaselineYear) {
    await knex.schema.alterTable('strategic_goals', (table) => {
      table.dropColumn('baseline_year');
      table.dropColumn('baseline_value');
      table.dropColumn('target_value');
      table.dropColumn('unit');
      table.dropColumn('weight');
    });
  }
};
