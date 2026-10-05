/**
 * Migration: enhance_psb_quotas_hybrid_grade_level
 * Modul PSB - Penyesuaian skema kuota model Hybrid:
 * Mendukung kuota tingkat kelas (Grade Level L/P) dan rencana jumlah rombel,
 * dengan relasi rombel fisik (class_group_id) bersifat opsional/fleksibel.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasClassQuotasTable = await knex.schema.hasTable('psb_process_class_quotas');
  if (hasClassQuotasTable) {
    // 1. Tambah kolom grade_level jika belum ada
    const hasGradeLevel = await knex.schema.hasColumn('psb_process_class_quotas', 'grade_level');
    if (!hasGradeLevel) {
      await knex.schema.alterTable('psb_process_class_quotas', (table) => {
        table.string('grade_level', 20).nullable().after('satuan_pendidikan_id');
        table.smallint('planned_classes_count').unsigned().nullable().defaultTo(2).after('grade_level');
      });
    }

    // 2. Modifikasi class_group_id agar nullable
    await knex.raw('ALTER TABLE psb_process_class_quotas MODIFY COLUMN class_group_id BIGINT UNSIGNED NULL');
  }

  // 3. Pastikan psb_process_units memiliki target kuota L/P
  const hasProcUnits = await knex.schema.hasTable('psb_process_units');
  if (hasProcUnits) {
    const hasMale = await knex.schema.hasColumn('psb_process_units', 'quota_male');
    if (!hasMale) {
      await knex.schema.alterTable('psb_process_units', (table) => {
        table.smallint('quota_male').unsigned().nullable().defaultTo(0);
        table.smallint('quota_female').unsigned().nullable().defaultTo(0);
      });
    }
  }
};

exports.down = async function (knex) {
  const hasClassQuotasTable = await knex.schema.hasTable('psb_process_class_quotas');
  if (hasClassQuotasTable) {
    const hasGradeLevel = await knex.schema.hasColumn('psb_process_class_quotas', 'grade_level');
    if (hasGradeLevel) {
      await knex.schema.alterTable('psb_process_class_quotas', (table) => {
        table.dropColumn('grade_level');
        table.dropColumn('planned_classes_count');
      });
    }
  }
};
