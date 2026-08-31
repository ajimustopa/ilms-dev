/**
 * Migration: enhance_kpi_targets_and_achievements
 * Modul Manajemen - Fitur 7: Target, Realisasi & Capaian KPI Multi-Arah
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasDirection = await knex.schema.hasColumn('quality_indicators', 'direction');
  if (!hasDirection) {
    await knex.schema.alterTable('quality_indicators', (table) => {
      table.enum('direction', ['higher_is_better', 'lower_is_better', 'range_ideal']).notNullable().defaultTo('higher_is_better').after('calculation_method');
      table.decimal('tolerance_min', 12, 2).nullable().after('direction');
      table.decimal('tolerance_max', 12, 2).nullable().after('tolerance_min');
    });
  }

  const hasAchievementStatus = await knex.schema.hasColumn('quality_indicator_achievements', 'status');
  if (!hasAchievementStatus) {
    await knex.schema.alterTable('quality_indicator_achievements', (table) => {
      table.decimal('target_value', 12, 2).nullable().after('period');
      table.decimal('achievement_percentage', 6, 2).nullable().after('actual_value');
      table.enum('status', ['achieved', 'on_track', 'warning', 'critical']).notNullable().defaultTo('on_track').after('achievement_percentage');
      table.string('evidence_url', 255).nullable().after('status');
      table.text('notes').nullable().after('evidence_url');
      table.enum('verification_status', ['draft', 'verified', 'rejected']).notNullable().defaultTo('draft').after('notes');
      table.bigInteger('verified_by').unsigned().nullable().after('verification_status');
      table.timestamp('verified_at').nullable().after('verified_by');

      table.index(['status'], 'idx_qia_status');
      table.index(['verification_status'], 'idx_qia_verif_status');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasDirection = await knex.schema.hasColumn('quality_indicators', 'direction');
  if (hasDirection) {
    await knex.schema.alterTable('quality_indicators', (table) => {
      table.dropColumn('direction');
      table.dropColumn('tolerance_min');
      table.dropColumn('tolerance_max');
    });
  }

  const hasAchievementStatus = await knex.schema.hasColumn('quality_indicator_achievements', 'status');
  if (hasAchievementStatus) {
    await knex.schema.alterTable('quality_indicator_achievements', (table) => {
      table.dropColumn('target_value');
      table.dropColumn('achievement_percentage');
      table.dropColumn('status');
      table.dropColumn('evidence_url');
      table.dropColumn('notes');
      table.dropColumn('verification_status');
      table.dropColumn('verified_by');
      table.dropColumn('verified_at');
    });
  }
};
