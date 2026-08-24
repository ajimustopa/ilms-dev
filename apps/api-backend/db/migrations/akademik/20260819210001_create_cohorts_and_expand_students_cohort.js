/**
 * Migration: create_cohorts_and_expand_students_cohort
 * Menambahkan tabel master cohorts (Angkatan) dan relasi cohort pada tabel students
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Buat tabel master cohorts (Angkatan)
  const hasCohorts = await knex.schema.hasTable('cohorts');
  if (!hasCohorts) {
    await knex.schema.createTable('cohorts', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
      table.string('year', 10).notNullable();
      table.string('name', 50).notNullable();
      table.text('description').nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['satuan_pendidikan_id'], 'idx_cohorts_satuan');
      table.index(['year'], 'idx_cohorts_year');
    });
  }

  // 2. Tambah kolom cohort pada tabel students
  const hasCohortId = await knex.schema.hasColumn('students', 'cohort_id');
  if (!hasCohortId) {
    await knex.schema.alterTable('students', (table) => {
      table.bigInteger('cohort_id').unsigned().nullable().after('satuan_pendidikan_id');
      table.string('cohort_name', 50).nullable().after('cohort_id');
      table.index(['cohort_id'], 'idx_students_cohort_id');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasCohortId = await knex.schema.hasColumn('students', 'cohort_id');
  if (hasCohortId) {
    await knex.schema.alterTable('students', (table) => {
      table.dropIndex(['cohort_id'], 'idx_students_cohort_id');
      table.dropColumn('cohort_name');
      table.dropColumn('cohort_id');
    });
  }

  await knex.schema.dropTableIfExists('cohorts');
};
