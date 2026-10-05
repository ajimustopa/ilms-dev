/**
 * Migration 92: Create ppdb_scholarship_quotas if missing
 * Modul: Keuangan (ppdb-billing)
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('ppdb_scholarship_quotas');
  if (!hasTable) {
    await knex.schema.createTable('ppdb_scholarship_quotas', function(table) {
      table.bigIncrements('id').primary();
      table.bigInteger('school_unit_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().notNullable();
      table.string('quota_category', 100).notNullable();
      table.smallint('max_quota').unsigned().notNullable().defaultTo(5);
      table.smallint('used_quota').unsigned().notNullable().defaultTo(0);
      table.string('description', 255).nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);

      table.index(['school_unit_id', 'academic_year_id'], 'idx_ppdb_quota_unit_ay');
    });

    // Seed default categories
    const units = [1, 2];
    for (const unitId of units) {
      await knex('ppdb_scholarship_quotas').insert([
        {
          school_unit_id: unitId,
          academic_year_id: 1,
          quota_category: 'Tahfidz 30 Juz',
          max_quota: 5,
          used_quota: 0,
          description: 'Beasiswa Penuh 100% Calon Santri Tahfidz 30 Juz',
          is_active: true
        },
        {
          school_unit_id: unitId,
          academic_year_id: 1,
          quota_category: 'Dhuafa & Yatim',
          max_quota: 10,
          used_quota: 0,
          description: 'Subsidi Keringanan Calon Santri Yatim / Dhuafa Berprestasi',
          is_active: true
        },
        {
          school_unit_id: unitId,
          academic_year_id: 1,
          quota_category: 'Anak Guru & Pegawai',
          max_quota: 5,
          used_quota: 0,
          description: 'Potongan Khusus Anak Guru dan Karyawan Yayasan Aldepos',
          is_active: true
        }
      ]);
    }
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('ppdb_scholarship_quotas');
};
