/**
 * Migration: create_employment_statuses_table
 * Modul Kepegawaian - Master Data Status Kepegawaian Fleksibel & Kustomisasi Admin
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Buat tabel master employment_statuses
  await knex.schema.createTable('employment_statuses', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('code', 50).notNullable().unique();
    table.string('name', 100).notNullable();
    table.string('category', 50).nullable().defaultTo('umum'); // guru, tendik, umum
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('sort_order').unsigned().notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['is_active', 'sort_order'], 'idx_emp_statuses_active_sort');
  });

  // 2. Ubah kolom employment_status di tabel employees menjadi VARCHAR(50) agar dinamis
  await knex.schema.raw("ALTER TABLE employees MODIFY COLUMN employment_status VARCHAR(50) NOT NULL");

  // 3. Masukkan data master awal bawaan
  const initialStatuses = [
    { code: 'pns', name: 'PNS (Pegawai Negeri Sipil)', category: 'umum', description: 'Aparatur Sipil Negara berstatus Pegawai Negeri Sipil', is_active: true, sort_order: 1 },
    { code: 'p3k', name: 'PPPK (Pegawai Pemerintah dengan Perjanjian Kerja)', category: 'umum', description: 'Aparatur Sipil Negara berstatus PPPK', is_active: true, sort_order: 2 },
    { code: 'gty', name: 'GTY (Guru Tetap Yayasan)', category: 'guru', description: 'Pendidik tetap yang diangkat oleh yayasan', is_active: true, sort_order: 3 },
    { code: 'gtt', name: 'GTT (Guru Tidak Tetap)', category: 'guru', description: 'Pendidik tidak tetap / guru honorer sekolah', is_active: true, sort_order: 4 },
    { code: 'pty', name: 'PTY (Pegawai Tetap Yayasan)', category: 'tendik', description: 'Tenaga kependidikan tetap yayasan', is_active: true, sort_order: 5 },
    { code: 'ptt', name: 'PTT (Pegawai Tidak Tetap)', category: 'tendik', description: 'Tenaga kependidikan tidak tetap / honorer', is_active: true, sort_order: 6 },
    { code: 'kontrak', name: 'Pegawai Kontrak / PKWT', category: 'umum', description: 'Pegawai dengan Perjanjian Kerja Waktu Tertentu', is_active: true, sort_order: 7 },
    { code: 'honorer', name: 'Tenaga Honorer', category: 'umum', description: 'Tenaga honorer lepas/khusus', is_active: true, sort_order: 8 },
    { code: 'magang', name: 'Magang / Praktik Kerja', category: 'umum', description: 'Peserta magang institusi atau mitra', is_active: true, sort_order: 9 }
  ];

  await knex('employment_statuses').insert(initialStatuses.map(s => ({
    ...s,
    created_at: new Date(),
    updated_at: new Date()
  })));
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('employment_statuses');
  await knex.schema.raw("ALTER TABLE employees MODIFY COLUMN employment_status ENUM('pns','gtt','ptt') NOT NULL DEFAULT 'gtt'");
};
