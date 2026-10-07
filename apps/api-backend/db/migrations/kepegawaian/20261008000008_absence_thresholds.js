/**
 * Migration M-H: Absence Thresholds
 * Modul Kepegawaian - Core Aldepos
 * Tables:
 * - absence_thresholds
 */

exports.up = async function(knex) {
  const hasThresholds = await knex.schema.hasTable('absence_thresholds');
  if (!hasThresholds) {
    await knex.schema.createTable('absence_thresholds', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().nullable();
      table.enum('group_type', ['unit', 'work_schedule']).notNullable().defaultTo('unit');
      table.bigInteger('group_ref_id').unsigned().nullable();
      table.smallint('max_absent_count').nullable();
      table.decimal('max_absent_percent', 5, 2).nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);

      table.index(['school_unit_id', 'group_type', 'group_ref_id'], 'idx_absence_thresholds_lookup');
    });

    // Seed default threshold for unit 1: max 5 teachers/staff absent simultaneously
    await knex('absence_thresholds').insert({
      school_unit_id: null,
      group_type: 'unit',
      group_ref_id: null,
      max_absent_count: 5,
      max_absent_percent: 20.00,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
};

exports.down = async function(knex) {
  if (await knex.schema.hasTable('absence_thresholds')) {
    await knex.schema.dropTableIfExists('absence_thresholds');
  }
};
