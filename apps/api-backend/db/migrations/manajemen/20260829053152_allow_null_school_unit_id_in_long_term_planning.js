/**
 * Migration: 20260829053152_allow_null_school_unit_id_in_long_term_planning
 * Mengizinkan school_unit_id NULL (tingkat Yayasan / Gabungan) pada tabel long_term_work_plans dan annual_program_targets
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. long_term_work_plans
  await knex.raw('ALTER TABLE long_term_work_plans MODIFY school_unit_id BIGINT(20) UNSIGNED NULL');

  // 2. annual_program_targets
  // MySQL unique constraint uq_apt_program_unit_year: (rips_program_id, school_unit_id, academic_year)
  await knex.raw('ALTER TABLE annual_program_targets MODIFY school_unit_id BIGINT(20) UNSIGNED NULL');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw('ALTER TABLE annual_program_targets MODIFY school_unit_id BIGINT(20) UNSIGNED NOT NULL');
  await knex.raw('ALTER TABLE long_term_work_plans MODIFY school_unit_id BIGINT(20) UNSIGNED NOT NULL');
};
