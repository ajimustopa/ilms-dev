/**
 * Migration: create_report_score_input_history_table
 * Modul Akademik - Riwayat Versi Penginputan Nilai Rapor & Deskripsi Capaian TP
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('report_score_input_history');
  if (!hasTable) {
    await knex.schema.createTable('report_score_input_history', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable().defaultTo(1);
      table.bigInteger('class_group_id').unsigned().notNullable();
      table.bigInteger('subject_id').unsigned().nullable();
      table.bigInteger('extracurricular_id').unsigned().nullable();
      table.bigInteger('semester_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().nullable();
      table.enum('method', ['manual', 'calculated_from_components']).notNullable().defaultTo('manual');
      table.string('version_label', 150).nullable();
      table.text('user_notes').nullable();
      table.json('scores_data').nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.string('recorded_by_name', 100).nullable();
      table.bigInteger('recorded_by_employee_id').unsigned().nullable();
      table.timestamps(true, true);

      table.index(['class_group_id', 'subject_id', 'semester_id'], 'idx_rsih_class_subj_sem');
      table.index(['academic_year_id'], 'idx_rsih_acad_year');
      table.index(['satuan_pendidikan_id'], 'idx_rsih_unit');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('report_score_input_history');
};
