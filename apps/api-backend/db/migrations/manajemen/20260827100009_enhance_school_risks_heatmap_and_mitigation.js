/**
 * Migration: enhance_school_risks_heatmap_and_mitigation
 * Modul Manajemen - Fitur 9: Manajemen Risiko (Identifikasi, Penilaian 1-5, Heatmap 5x5, Mitigasi, Residual)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasCode = await knex.schema.hasColumn('school_risks', 'code');
  if (!hasCode) {
    await knex.schema.alterTable('school_risks', (table) => {
      table.string('code', 50).nullable().unique().after('school_unit_id');
      table.string('source', 100).nullable().after('category');
      table.text('root_cause').nullable().after('description');
      table.text('impact_description').nullable().after('root_cause');
      table.integer('probability_val').notNullable().defaultTo(3).after('impact_description');
      table.integer('impact_val').notNullable().defaultTo(3).after('probability_val');
      table.integer('risk_score').notNullable().defaultTo(9).after('impact_val');
      table.string('risk_level', 50).notNullable().defaultTo('medium').after('risk_score');
      
      table.text('mitigation_action').nullable().after('mitigation_plan');
      table.bigInteger('mitigation_pic_id').unsigned().nullable().after('mitigation_action');
      table.date('mitigation_deadline').nullable().after('mitigation_pic_id');
      table.enum('mitigation_status', ['planned', 'in_progress', 'completed', 'delayed']).notNullable().defaultTo('planned').after('mitigation_deadline');

      table.integer('residual_probability').nullable().after('mitigation_status');
      table.integer('residual_impact').nullable().after('residual_probability');
      table.integer('residual_score').nullable().after('residual_impact');
      table.string('residual_level', 50).nullable().after('residual_score');

      table.enum('relation_type', ['sasaran', 'program', 'kegiatan', 'kpi', 'none']).notNullable().defaultTo('none').after('residual_level');
      table.bigInteger('relation_id').unsigned().nullable().after('relation_type');
      table.string('relation_code', 50).nullable().after('relation_id');
      table.string('relation_name', 255).nullable().after('relation_code');

      table.bigInteger('created_by').unsigned().nullable().after('resolved_at');
      table.bigInteger('updated_by').unsigned().nullable().after('created_by');

      table.index(['risk_level'], 'idx_sr_risk_level');
      table.index(['mitigation_status'], 'idx_sr_mitigation_status');
      table.index(['relation_type', 'relation_id'], 'idx_sr_relation');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasCode = await knex.schema.hasColumn('school_risks', 'code');
  if (hasCode) {
    await knex.schema.alterTable('school_risks', (table) => {
      table.dropColumn('code');
      table.dropColumn('source');
      table.dropColumn('root_cause');
      table.dropColumn('impact_description');
      table.dropColumn('probability_val');
      table.dropColumn('impact_val');
      table.dropColumn('risk_score');
      table.dropColumn('risk_level');
      table.dropColumn('mitigation_action');
      table.dropColumn('mitigation_pic_id');
      table.dropColumn('mitigation_deadline');
      table.dropColumn('mitigation_status');
      table.dropColumn('residual_probability');
      table.dropColumn('residual_impact');
      table.dropColumn('residual_score');
      table.dropColumn('residual_level');
      table.dropColumn('relation_type');
      table.dropColumn('relation_id');
      table.dropColumn('relation_code');
      table.dropColumn('relation_name');
      table.dropColumn('created_by');
      table.dropColumn('updated_by');
    });
  }
};
