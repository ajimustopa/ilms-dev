/**
 * Migration: create_subject_schedule_presets_and_logs
 * Modul Akademik:
 * 1. Opsi / Preset Jadwal Pelajaran per Tahun Ajaran (Multiple Schedule Sets / Variations & Activation)
 * 2. Audit Log Riwayat & Alasan Perubahan Jadwal Pelajaran
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabel Opsi / Preset Jadwal Pelajaran
  const hasPresets = await knex.schema.hasTable('subject_schedule_presets');
  if (!hasPresets) {
    await knex.schema.createTable('subject_schedule_presets', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().notNullable()
        .references('id').inTable('academic_years').onDelete('CASCADE');
      table.string('name', 150).notNullable(); // e.g. "Jadwal Reguler Semester Ganjil", "Jadwal Khusus Ramadhan"
      table.string('code', 50).nullable();
      table.text('description').nullable();
      table.boolean('is_active').notNullable().defaultTo(false);
      table.date('effective_start_date').nullable();
      table.date('effective_end_date').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['satuan_pendidikan_id'], 'idx_ssp_satuan');
      table.index(['academic_year_id'], 'idx_ssp_academic_year');
      table.index(['is_active'], 'idx_ssp_active');
    });
  }

  // 2. Tambahkan kolom preset_id pada subject_schedules
  const hasPresetId = await knex.schema.hasColumn('subject_schedules', 'preset_id');
  if (!hasPresetId) {
    await knex.schema.alterTable('subject_schedules', (table) => {
      table.bigInteger('preset_id').unsigned().nullable()
        .references('id').inTable('subject_schedule_presets').onDelete('CASCADE');
      table.index(['preset_id'], 'idx_ss_preset');
    });

    // Buat default preset untuk jadwal yang sudah ada jika ada data
    const existingPairs = await knex('subject_schedules')
      .distinct('satuan_pendidikan_id', 'academic_year_id')
      .select();

    for (const pair of existingPairs) {
      if (pair.satuan_pendidikan_id && pair.academic_year_id) {
        const [presetId] = await knex('subject_schedule_presets').insert({
          satuan_pendidikan_id: pair.satuan_pendidikan_id,
          academic_year_id: pair.academic_year_id,
          name: 'Jadwal Reguler Utama',
          code: 'REGULER-UTAMA',
          description: 'Preset jadwal reguler standar sekolah',
          is_active: true,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });

        await knex('subject_schedules')
          .where({
            satuan_pendidikan_id: pair.satuan_pendidikan_id,
            academic_year_id: pair.academic_year_id
          })
          .whereNull('preset_id')
          .update({ preset_id: presetId });
      }
    }
  }

  // 3. Tabel Log Riwayat & Alasan Perubahan Jadwal (Audit Logs)
  const hasScheduleLogs = await knex.schema.hasTable('subject_schedule_logs');
  if (!hasScheduleLogs) {
    await knex.schema.createTable('subject_schedule_logs', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable();
      table.bigInteger('academic_year_id').unsigned().notNullable();
      table.bigInteger('preset_id').unsigned().nullable();
      table.string('preset_name', 150).nullable();
      table.bigInteger('schedule_id').unsigned().nullable();
      table.string('action', 50).notNullable(); // 'tambah_jadwal' | 'ubah_jadwal' | 'hapus_jadwal' | 'status_jadwal' | 'tambah_preset' | 'aktivasi_preset' | 'duplikasi_preset' | 'hapus_preset'
      table.string('schedule_type', 20).nullable(); // 'mapel' | 'ekskul'
      table.string('subject_or_extra_name', 150).nullable();
      table.string('teacher_name', 150).nullable();
      table.string('class_group_names', 255).nullable();
      table.string('day_name', 50).nullable();
      table.string('time_range', 50).nullable();
      table.text('reason').notNullable(); // Wajib diisi alasan perubahan
      table.text('changes_summary').nullable();
      table.string('created_by', 100).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['satuan_pendidikan_id'], 'idx_ssl_satuan');
      table.index(['academic_year_id'], 'idx_ssl_academic_year');
      table.index(['preset_id'], 'idx_ssl_preset');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('subject_schedule_logs');
  const hasPresetId = await knex.schema.hasColumn('subject_schedules', 'preset_id');
  if (hasPresetId) {
    await knex.schema.alterTable('subject_schedules', (table) => {
      table.dropForeign(['preset_id']);
      table.dropColumn('preset_id');
    });
  }
  await knex.schema.dropTableIfExists('subject_schedule_presets');
};
