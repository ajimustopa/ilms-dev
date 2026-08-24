/**
 * Initial Seed for Perpustakaan Module
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Disable FK checks to allow clean truncate/insert
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

  await knex('loan_reminders').truncate();
  await knex('lost_damaged_reports').truncate();
  await knex('book_reservations').truncate();
  await knex('book_loans').truncate();
  await knex('library_members').truncate();
  await knex('book_copies').truncate();
  await knex('books').truncate();
  await knex('book_categories').truncate();

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 1. book_categories (3 Kategori)
  const [catFiksiId, catPelajaranId, catReferensiId] = await knex('book_categories').insert([
    {
      id: 1,
      category_name: 'Fiksi',
      category_code: 'FIC',
      description: 'Novel dan cerita fiksi',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      category_name: 'Pelajaran',
      category_code: 'PEL',
      description: 'Buku pendamping mata pelajaran',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 3,
      category_name: 'Referensi',
      category_code: 'REF',
      description: 'Ensiklopedia, kamus, dan buku referensi',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  // 2. books (2 Judul Buku - satuan_pendidikan_id = 1)
  await knex('books').insert([
    {
      id: 1,
      satuan_pendidikan_id: 1,
      material_type: 'book',
      title: 'Laskar Pelangi',
      author: 'Andrea Hirata',
      publisher: 'Bentang Pustaka',
      publish_year: 2005,
      isbn: '9789793062792',
      category_id: 1,
      shelf_location: 'A1-01',
      total_copies: 3,
      source_type: 'purchase',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      satuan_pendidikan_id: 1,
      material_type: 'book',
      title: 'Matematika Kelas 6',
      author: 'Tim Penulis',
      publisher: 'Erlangga',
      publish_year: 2022,
      isbn: '9786020000000',
      category_id: 2,
      shelf_location: 'B2-04',
      total_copies: 5,
      source_type: 'purchase',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  // 3. book_copies (4 Eksemplar Fisik)
  await knex('book_copies').insert([
    {
      id: 1,
      book_id: 1,
      copy_code: 'LP-001',
      condition_status: 'good',
      circulation_status: 'available',
      shelf_location: 'A1-01',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      book_id: 1,
      copy_code: 'LP-002',
      condition_status: 'good',
      circulation_status: 'available',
      shelf_location: 'A1-01',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 3,
      book_id: 1,
      copy_code: 'LP-003',
      condition_status: 'good',
      circulation_status: 'available',
      shelf_location: 'A1-01',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 4,
      book_id: 2,
      copy_code: 'MTK6-001',
      condition_status: 'good',
      circulation_status: 'available',
      shelf_location: 'B2-04',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  // 4. library_members (2 Anggota: 1 Siswa & 1 Pegawai)
  // CATATAN: ref_id merujuk ke database Akademik (students.id) atau Kepegawaian (employees.id).
  // Saat ini menggunakan ref_id = 1 sebagai placeholder dummy, sesuaikan dengan ID sungguhan
  // setelah database akademik_local / kepegawaian_local di-seed di lingkungan lokal.
  await knex('library_members').insert([
    {
      id: 1,
      satuan_pendidikan_id: 1,
      ref_type: 'student',
      ref_id: 1, // Placeholder: merujuk ke students.id di akademik_local
      member_card_number: 'ANG-0001',
      max_loan_limit: 3,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      satuan_pendidikan_id: 1,
      ref_type: 'employee',
      ref_id: 1, // Placeholder: merujuk ke employees.id di kepegawaian_local
      member_card_number: 'ANG-0002',
      max_loan_limit: 5,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  console.log('Perpustakaan initial seed completed successfully!');
};
