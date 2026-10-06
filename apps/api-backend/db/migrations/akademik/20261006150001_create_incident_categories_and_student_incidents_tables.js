/**
 * Migrasi Knex: Pembuatan Tabel Master Kategori Kejadian (incident_categories),
 * Tabel Buku Catatan Kejadian Siswa Terpadu (student_incidents),
 * dan pembaruan relasi tabel counseling_records.
 * Modul: Akademik
 */

exports.up = async function(knex) {
  // 1. Buat Tabel incident_categories (Master Kategori Tata Tertib & Apresiasi)
  const hasCategories = await knex.schema.hasTable('incident_categories');
  if (!hasCategories) {
    await knex.schema.createTable('incident_categories', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable().index();
      table.string('code', 50).notNullable();
      table.string('name', 150).notNullable();
      table.enum('type', ['positive', 'negative', 'neutral']).notNullable();
      table.enum('severity_level', ['low', 'medium', 'high', 'critical']).notNullable().defaultTo('low');
      table.smallint('default_points').notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);

      table.unique(['satuan_pendidikan_id', 'code']);
    });
  }

  // 2. Buat Tabel student_incidents (Buku Catatan Kejadian Siswa Terpadu)
  const hasIncidents = await knex.schema.hasTable('student_incidents');
  if (!hasIncidents) {
    await knex.schema.createTable('student_incidents', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('satuan_pendidikan_id').unsigned().notNullable().index();
      table.bigInteger('student_id').unsigned().notNullable().index();
      table.bigInteger('academic_year_id').unsigned().nullable();
      table.bigInteger('category_id').unsigned().nullable().index();
      table.enum('type', ['positive', 'negative', 'neutral']).notNullable().index();
      table.string('title', 200).notNullable();
      table.text('description').notNullable();
      table.smallint('points').notNullable().defaultTo(0);
      table.date('incident_date').notNullable().index();
      table.time('incident_time').nullable();
      table.string('location', 150).nullable();
      table.bigInteger('reported_by_employee_id').unsigned().nullable().index();
      table.bigInteger('handled_by_employee_id').unsigned().nullable();
      table.enum('handling_status', ['reported', 'in_progress', 'resolved', 'cancelled']).notNullable().defaultTo('reported').index();
      table.text('handling_action').nullable();
      table.date('resolution_date').nullable();
      table.enum('visibility_level', ['public_school', 'teachers_only', 'homeroom_and_bk', 'bk_only']).notNullable().defaultTo('teachers_only');
      table.bigInteger('verified_by_employee_id').unsigned().nullable();
      table.dateTime('verified_at').nullable();
      table.timestamps(true, true);

      // Foreign keys
      table.foreign('student_id').references('id').inTable('students').onDelete('CASCADE');
      table.foreign('category_id').references('id').inTable('incident_categories').onDelete('SET NULL');
    });
  }

  // 3. Modifikasi counseling_records jika belum memiliki kolom satuan_pendidikan_id & incident_id
  const hasCounseling = await knex.schema.hasTable('counseling_records');
  if (hasCounseling) {
    const hasUnitId = await knex.schema.hasColumn('counseling_records', 'satuan_pendidikan_id');
    const hasIncidentId = await knex.schema.hasColumn('counseling_records', 'incident_id');
    const hasFollowUp = await knex.schema.hasColumn('counseling_records', 'follow_up_status');

    await knex.schema.alterTable('counseling_records', (table) => {
      if (!hasUnitId) table.bigInteger('satuan_pendidikan_id').unsigned().nullable().index();
      if (!hasIncidentId) {
        table.bigInteger('incident_id').unsigned().nullable().index();
        table.foreign('incident_id').references('id').inTable('student_incidents').onDelete('SET NULL');
      }
      if (!hasFollowUp) table.enum('follow_up_status', ['scheduled', 'in_progress', 'completed']).defaultTo('completed');
    });
  }

  // 4. Seed data awal kategori standar untuk satuan pendidikan 1 (SMP IT) dan 2 (SMA IT)
  const defaultCategories = [
    // Pelanggaran (Negative)
    { code: 'TATIB-01', name: 'Terlambat Masuk Kelas / Sholat Berjamaah', type: 'negative', severity_level: 'low', default_points: 5 },
    { code: 'TATIB-02', name: 'Atribut Seragam Tidak Lengkap / Tidak Rapi', type: 'negative', severity_level: 'low', default_points: 5 },
    { code: 'TATIB-03', name: 'Tidak Mengerjakan Tugas Pembelajaran', type: 'negative', severity_level: 'low', default_points: 5 },
    { code: 'TATIB-04', name: 'Keluar Lingkungan Sekolah / Asrama Tanpa Izin', type: 'negative', severity_level: 'medium', default_points: 15 },
    { code: 'TATIB-05', name: 'Membawa / Menggunakan Gadget Terlarang', type: 'negative', severity_level: 'medium', default_points: 15 },
    { code: 'TATIB-06', name: 'Perilaku Tidak Sopan / Merusak Fasilitas', type: 'negative', severity_level: 'high', default_points: 25 },
    { code: 'TATIB-07', name: 'Perkelahian / Bullying Fisik Maupun Verbal', type: 'negative', severity_level: 'critical', default_points: 50 },
    // Prestasi (Positive)
    { code: 'PRES-01', name: 'Juara 1 Lomba Akademik / Sains', type: 'positive', severity_level: 'high', default_points: 25 },
    { code: 'PRES-02', name: 'Juara 2/3 Lomba Akademik / Non-Akademik', type: 'positive', severity_level: 'medium', default_points: 15 },
    { code: 'PRES-03', name: 'Prestasi Hafalan Al-Qur\'an / Tahfidz Terbaik', type: 'positive', severity_level: 'high', default_points: 30 },
    { code: 'PRES-04', name: 'Santri Teladan / Disiplin Beribadah Terbaik', type: 'positive', severity_level: 'medium', default_points: 20 },
    // Karakter Positif / Netral
    { code: 'ADAB-01', name: 'Kejujuran Mengembalikan Barang / Uang Temukan', type: 'positive', severity_level: 'low', default_points: 10 },
    { code: 'ADAB-02', name: 'Inisiatif Membantu Kebersihan Lingkungan Masjid / Asrama', type: 'positive', severity_level: 'low', default_points: 10 },
    { code: 'INFO-01', name: 'Catatan Observasi Perilaku Harian / Home Visit', type: 'neutral', severity_level: 'low', default_points: 0 },
  ];

  for (const unitId of [1, 2]) {
    for (const cat of defaultCategories) {
      const exists = await knex('incident_categories')
        .where({ satuan_pendidikan_id: unitId, code: cat.code })
        .first();
      if (!exists) {
        await knex('incident_categories').insert({
          satuan_pendidikan_id: unitId,
          code: cat.code,
          name: cat.name,
          type: cat.type,
          severity_level: cat.severity_level,
          default_points: cat.default_points,
          is_active: true,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });
      }
    }
  }
};

exports.down = async function(knex) {
  const hasCounseling = await knex.schema.hasTable('counseling_records');
  if (hasCounseling) {
    await knex.schema.alterTable('counseling_records', (table) => {
      table.dropForeign(['incident_id']);
      table.dropColumn(['incident_id', 'satuan_pendidikan_id', 'follow_up_status']);
    });
  }

  await knex.schema.dropTableIfExists('student_incidents');
  await knex.schema.dropTableIfExists('incident_categories');
};
