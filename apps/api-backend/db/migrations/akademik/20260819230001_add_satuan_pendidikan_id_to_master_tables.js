/**
 * Migration: add_satuan_pendidikan_id_to_master_tables
 * Menambahkan kolom satuan_pendidikan_id ke academic_years, semesters, dan grade_levels
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. academic_years
  const hasAyUnit = await knex.schema.hasColumn('academic_years', 'satuan_pendidikan_id');
  if (!hasAyUnit) {
    await knex.schema.alterTable('academic_years', (table) => {
      table.bigInteger('satuan_pendidikan_id').unsigned().nullable().after('id');
      table.index(['satuan_pendidikan_id'], 'idx_academic_years_satuan_pendidikan');
    });
    // Default data awal ke unit 1
    await knex('academic_years').update({ satuan_pendidikan_id: 1 });
  }

  // 2. semesters
  const hasSemUnit = await knex.schema.hasColumn('semesters', 'satuan_pendidikan_id');
  if (!hasSemUnit) {
    await knex.schema.alterTable('semesters', (table) => {
      table.bigInteger('satuan_pendidikan_id').unsigned().nullable().after('academic_year_id');
      table.index(['satuan_pendidikan_id'], 'idx_semesters_satuan_pendidikan');
    });
    // Update data semester existing sesuai tahun ajaran
    await knex.raw(`
      UPDATE semesters s
      JOIN academic_years a ON s.academic_year_id = a.id
      SET s.satuan_pendidikan_id = a.satuan_pendidikan_id
    `);
  }

  // 3. grade_levels
  const hasGlUnit = await knex.schema.hasColumn('grade_levels', 'satuan_pendidikan_id');
  if (!hasGlUnit) {
    await knex.schema.alterTable('grade_levels', (table) => {
      table.bigInteger('satuan_pendidikan_id').unsigned().nullable().after('id');
      table.index(['satuan_pendidikan_id'], 'idx_grade_levels_satuan_pendidikan');
    });
    // Default data awal ke unit 1
    await knex('grade_levels').update({ satuan_pendidikan_id: 1 });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasGlUnit = await knex.schema.hasColumn('grade_levels', 'satuan_pendidikan_id');
  if (hasGlUnit) {
    await knex.schema.alterTable('grade_levels', (table) => {
      table.dropColumn('satuan_pendidikan_id');
    });
  }

  const hasSemUnit = await knex.schema.hasColumn('semesters', 'satuan_pendidikan_id');
  if (hasSemUnit) {
    await knex.schema.alterTable('semesters', (table) => {
      table.dropColumn('satuan_pendidikan_id');
    });
  }

  const hasAyUnit = await knex.schema.hasColumn('academic_years', 'satuan_pendidikan_id');
  if (hasAyUnit) {
    await knex.schema.alterTable('academic_years', (table) => {
      table.dropColumn('satuan_pendidikan_id');
    });
  }
};
