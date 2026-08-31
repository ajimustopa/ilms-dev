/**
 * Migration: enhance_quality_indicators_dictionary
 * Modul Manajemen - Fitur 6: Kamus Indikator Kinerja / KPI
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasDef = await knex.schema.hasColumn('quality_indicators', 'definition');
  if (!hasDef) {
    await knex.schema.alterTable('quality_indicators', (table) => {
      table.text('definition').nullable().after('name');
      table.string('baseline_value', 100).nullable().after('unit_of_measure');
      table.integer('baseline_year').nullable().after('baseline_value');
      table.text('calculation_method').nullable().after('target_value');
      table.enum('frequency', ['bulanan', 'triwulan', 'semester', 'tahunan']).notNullable().defaultTo('tahunan').after('calculation_method');
      table.bigInteger('pic_employee_id').unsigned().nullable().after('frequency');
      table.bigInteger('strategic_goal_id').unsigned().nullable().after('pic_employee_id');
      table.enum('status', ['active', 'inactive']).notNullable().defaultTo('active').after('data_source_module');
      table.bigInteger('created_by').unsigned().nullable().after('status');
      table.bigInteger('updated_by').unsigned().nullable().after('created_by');

      table.foreign('strategic_goal_id', 'fk_qi_sg')
        .references('id')
        .inTable('strategic_goals')
        .onDelete('SET NULL');

      table.index(['frequency'], 'idx_qi_frequency');
      table.index(['status'], 'idx_qi_status');
      table.index(['strategic_goal_id'], 'idx_qi_strategic_goal');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasDef = await knex.schema.hasColumn('quality_indicators', 'definition');
  if (hasDef) {
    await knex.schema.alterTable('quality_indicators', (table) => {
      table.dropForeign('strategic_goal_id', 'fk_qi_sg');
      table.dropColumn('definition');
      table.dropColumn('baseline_value');
      table.dropColumn('baseline_year');
      table.dropColumn('calculation_method');
      table.dropColumn('frequency');
      table.dropColumn('pic_employee_id');
      table.dropColumn('strategic_goal_id');
      table.dropColumn('status');
      table.dropColumn('created_by');
      table.dropColumn('updated_by');
    });
  }
};
