/**
 * Initial Seed for Website Utama & PPDB Module
 * Sesuai erd-website-utama.md Bagian 4
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // 1. Bersihkan tabel anak sebelum tabel induk (menghormati dependency FK)
  await knex('gallery_items').del();
  await knex('galleries').del();
  await knex('ppdb_status_logs').del();
  await knex('ppdb_payments').del();
  await knex('ppdb_registrant_documents').del();
  await knex('ppdb_registrants').del();
  await knex('ppdb_selection_schedules').del();
  await knex('consultation_ticket_replies').del();
  await knex('consultation_tickets').del();
  await knex('consultation_bookings').del();
  await knex('article_comments').del();
  await knex('articles').del();
  await knex('news_posts').del();
  await knex('school_life_items').del();
  await knex('staff_profiles').del();
  await knex('home_highlights').del();
  await knex('home_hero_settings').del();
  await knex('faqs').del();
  await knex('testimonials').del();
  await knex('events').del();
  await knex('accreditations').del();
  await knex('theme_settings').del();
  await knex('cms_access_grants').del();
  await knex('site_settings').del();

  // 2. Seed home_hero_settings (school_unit_id: 1)
  await knex('home_hero_settings').insert([
    {
      school_unit_id: 1,
      school_name_display: 'SD Contoh 1',
      headline: 'Selamat Datang di SD Contoh 1',
      subheadline: 'Membentuk generasi unggul & berakhlak',
      keywords: 'sekolah islam, sd terbaik, ppdb online',
      cta_button_label: 'Daftar Sekarang',
      cta_button_url: '/ppdb'
    }
  ]);

  // 3. Seed home_highlights (2 baris)
  await knex('home_highlights').insert([
    {
      school_unit_id: 1,
      title: 'Kurikulum Terpadu',
      icon: 'BookOpen',
      description: 'Perpaduan kurikulum nasional & keagamaan',
      detail_link_url: '/kurikulum',
      display_order: 1
    },
    {
      school_unit_id: 1,
      title: 'Guru Berpengalaman',
      icon: 'Users',
      description: 'Diampu oleh tenaga pendidik profesional',
      detail_link_url: '/profil-pengajar',
      display_order: 2
    }
  ]);

  // 4. Seed news_posts (1 berita published)
  await knex('news_posts').insert([
    {
      school_unit_id: 1,
      title: 'Penerimaan Siswa Baru Dibuka',
      slug: 'ppdb-dibuka-2027',
      content: '<p>Penerimaan Peserta Didik Baru (PPDB) Tahun Ajaran 2027/2028 telah resmi dibuka secara online. Silakan akses menu pendaftaran untuk mengisi formulir dan mengunggah berkas persyaratan.</p>',
      category: 'Pengumuman',
      cover_image_url: '/images/news/ppdb-2027.jpg',
      status: 'published',
      published_at: knex.fn.now(),
      created_by: 1
    }
  ]);

  // 5. Seed ppdb_selection_schedules (1 jadwal seleksi)
  await knex('ppdb_selection_schedules').insert([
    {
      school_unit_id: 1,
      wave_name: 'Gelombang 1',
      test_date: '2027-01-15',
      location_or_link: 'Aula Sekolah',
      test_type: 'Wawancara & Pemetaan Bakat'
    }
  ]);

  // 6. Seed ppdb_registrants (1 pendaftar status submitted)
  await knex('ppdb_registrants').insert([
    {
      school_unit_id: 1,
      school_year: '2027/2028',
      registration_path: 'reguler',
      candidate_full_name: 'Contoh Nama Calon Siswa',
      candidate_birth_place: 'Sukabumi',
      candidate_birth_date: '2020-03-15',
      candidate_gender: 'L',
      candidate_address: 'Jl. Merdeka No. 123, Sukabumi',
      father_name: 'Bapak Contoh',
      mother_name: 'Ibu Contoh',
      parent_contact: '081234567890',
      status: 'submitted',
      academic_ref_id: null
    }
  ]);

  // 7. Seed site_settings (2 baris: 1 global NULL, 1 spesifik school_unit_id 1)
  await knex('site_settings').insert([
    {
      school_unit_id: null,
      setting_key: 'meta_title_default',
      setting_value: 'Sekolah Contoh - PPDB Online',
      description: 'Judul meta default seluruh halaman'
    },
    {
      school_unit_id: 1,
      setting_key: 'meta_description',
      setting_value: 'SD Contoh 1 - sekolah unggulan berbasis karakter',
      description: 'Deskripsi SEO beranda'
    }
  ]);

  console.log('[Seed Website Utama] Initial seed data inserted successfully!');
};
