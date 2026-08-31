/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('rips_program_categories');
  if (!hasTable) {
    await knex.schema.createTable('rips_program_categories', (table) => {
      table.bigIncrements('id').primary();
      table.string('name', 100).notNullable();
      table.string('color', 50).notNullable().defaultTo('#3B82F6'); // HEX or tailwind color
      table.string('bg_color', 50).notNullable().defaultTo('#EFF6FF'); // HEX or tailwind bg
      table.string('border_color', 50).notNullable().defaultTo('#BFDBFE');
      table.text('description').nullable();
      table.integer('order_index').notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Seed the initial categories requested by user with distinct colors
    await knex('rips_program_categories').insert([
      {
        name: 'Pengembangan Program',
        color: '#2563EB', // Blue-600
        bg_color: '#EFF6FF', // Blue-50
        border_color: '#93C5FD', // Blue-300
        description: 'Inisiatif pengembangan kurikulum, program baru, atau inovasi operasional',
        order_index: 1
      },
      {
        name: 'Penyusunan Dokumen',
        color: '#7C3AED', // Violet-600
        bg_color: '#F5F3FF', // Violet-50
        border_color: '#C4B5FD', // Violet-300
        description: 'Penyusunan regulasi, modul, panduan, silabus, atau kurikulum resmi',
        order_index: 2
      },
      {
        name: 'Pengadaan Sarpras',
        color: '#D97706', // Amber-600
        bg_color: '#FFFBEB', // Amber-50
        border_color: '#FCD34D', // Amber-300
        description: 'Pengadaan barang, perlengkapan, fasilitas, atau sarana fisik pendukung',
        order_index: 3
      },
      {
        name: 'Kegiatan Siswa',
        color: '#059669', // Emerald-600
        bg_color: '#ECFDF5', // Emerald-50
        border_color: '#6EE7B7', // Emerald-300
        description: 'Aktivitas ekstrakurikuler, pembinaan santri, lomba, atau perkemahan',
        order_index: 4
      },
      {
        name: 'Forum/Rapat',
        color: '#DC2626', // Red-600
        bg_color: '#FEF2F2', // Red-50
        border_color: '#FCA5A5', // Red-300
        description: 'Rapat koordinasi kerja, evaluasi pekanan, dan musyawarah pemangku kebijakan',
        order_index: 5
      },
      {
        name: 'Sosialisasi',
        color: '#0891B2', // Cyan-600
        bg_color: '#ECFEFF', // Cyan-50
        border_color: '#67E8F9', // Cyan-300
        description: 'Penyebaran informasi, sosialisasi program kepada santri/wali/GTK',
        order_index: 6
      }
    ]);
  }

  // Add category_id to rips_programs if not exists (for future assignment, nullable)
  const hasCol = await knex.schema.hasColumn('rips_programs', 'category_id');
  if (!hasCol) {
    await knex.schema.alterTable('rips_programs', (table) => {
      table.bigInteger('category_id').unsigned().nullable().after('is_flagship');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasCol = await knex.schema.hasColumn('rips_programs', 'category_id');
  if (hasCol) {
    await knex.schema.alterTable('rips_programs', (table) => {
      table.dropColumn('category_id');
    });
  }
  await knex.schema.dropTableIfExists('rips_program_categories');
};
