/**
 * Test Suite: News & Teacher Announcements Audience Isolation
 * Modul Website Utama - Tahap 13: Pemisahan Pengumuman Internal Guru vs Publik
 */
const publicService = require('./public/service');
const adminService = require('./admin/service');
const db = require('./db');

async function runTests() {
  console.log('=== MEMULAI TEST AUDIENCE ISOLATION BERITA & PENGUMUMAN ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const unitId = 1;

    // 1. Bersihkan data test lama jika ada
    await db('news_posts').where('slug', 'like', 'test-audience-%').del();

    // 2. Buat Berita Publik
    const publicPost = await adminService.createNews({
      school_unit_id: unitId,
      title: 'Test Berita Terbuka untuk Umum',
      slug: `test-audience-public-${Date.now()}`,
      content: 'Informasi prestasi santri terbuka untuk publik.',
      category: 'Prestasi',
      target_audience: 'public',
      status: 'published'
    }, 1);
    assert(publicPost && publicPost.id && publicPost.target_audience === 'public', `Berita publik dibuat (ID: ${publicPost.id})`);

    // 3. Buat Pengumuman Khusus Dewan Guru
    const teacherPost = await adminService.createNews({
      school_unit_id: unitId,
      title: 'Test Rapat Dewan Guru & Kurikulum Rahasia',
      slug: `test-audience-teacher-${Date.now()}`,
      content: 'Undangan rapat dinas internal dewan guru.',
      category: 'Rapat Dinas',
      target_audience: 'teachers',
      status: 'published'
    }, 1);
    assert(teacherPost && teacherPost.id && teacherPost.target_audience === 'teachers', `Pengumuman khusus guru dibuat (ID: ${teacherPost.id})`);

    // 4. Buat Pengumuman Seluruh Internal Yayasan
    const internalPost = await adminService.createNews({
      school_unit_id: unitId,
      title: 'Test Pengumuman Libur Hari Raya Internal Staf',
      slug: `test-audience-internal-${Date.now()}`,
      content: 'Instruksi piket jaga asrama dan staf yayasan.',
      category: 'Pengumuman',
      target_audience: 'all_internal',
      status: 'published'
    }, 1);
    assert(internalPost && internalPost.id && internalPost.target_audience === 'all_internal', `Pengumuman all_internal dibuat (ID: ${internalPost.id})`);

    // 5. Test Endpoint Publik: GET /public/news
    const publicNewsRes = await publicService.getNews({ school_unit_id: unitId });
    const publicItemIds = publicNewsRes.items.map(n => n.id);

    assert(publicItemIds.includes(publicPost.id), 'Endpoint publik mengembalikan berita publik');
    assert(!publicItemIds.includes(teacherPost.id), 'PENTING: Endpoint publik TIDAK MENGANDUNG pengumuman khusus dewan guru (aman dari kebocoran)');
    assert(!publicItemIds.includes(internalPost.id), 'PENTING: Endpoint publik TIDAK MENGANDUNG pengumuman internal yayasan (aman dari kebocoran)');

    // 6. Test Detail Publik by Slug
    // a. Slug publik berhasil diambil
    const fetchedPublic = await publicService.getNewsBySlug(publicPost.slug);
    assert(fetchedPublic && fetchedPublic.id === publicPost.id, 'getNewsBySlug publik berhasil mengambil konten publik');

    // b. Slug internal diakses publik -> harus 404
    let slug404 = false;
    try {
      await publicService.getNewsBySlug(teacherPost.slug);
    } catch (err) {
      slug404 = (err.statusCode === 404);
      assert(slug404, `Akses publik ke slug internal ditolak 404: ${err.message}`);
    }
    assert(slug404, 'Endpoint publik mengembalikan 404 saat mencoba akses langsung slug pengumuman guru');

    // 7. Test Endpoint Internal Guru: listTeacherAnnouncements
    const teacherRes = await adminService.listTeacherAnnouncements({ school_unit_id: unitId });
    const teacherItemIds = teacherRes.items.map(n => n.id);

    assert(teacherItemIds.includes(teacherPost.id), 'Portal Guru BISA mengambil pengumuman khusus teachers');
    assert(teacherItemIds.includes(internalPost.id), 'Portal Guru BISA mengambil pengumuman all_internal');
    assert(teacherItemIds.includes(publicPost.id), 'Portal Guru juga dapat melihat pengumuman status publik');

    // 8. Test Detail Pengumuman Guru by ID
    const detailTeacher = await adminService.getTeacherAnnouncementById(teacherPost.id);
    assert(detailTeacher && detailTeacher.id === teacherPost.id, 'getTeacherAnnouncementById berhasil mengambil rincian pengumuman guru');

    // 9. Bersihkan data test
    await db('news_posts').where('slug', 'like', 'test-audience-%').del();
    assert(true, 'Pembersihan data test selesai');

    console.log(`\n=== SEMUA TEST BERHASIL: ${passed} PASSED, ${failed} FAILED ===\n`);
  } catch (err) {
    console.error('ERROR TEST:', err);
    failed++;
  } finally {
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
