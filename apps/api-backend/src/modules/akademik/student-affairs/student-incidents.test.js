/**
 * Test Suite: Student Incidents & Visibility Rules
 * Modul Akademik - Tahap 12: Implementasi Kejadian Siswa
 */
const studentAffairsService = require('./service');
const db = require('../../../config/db/akademik');

async function runTests() {
  console.log('=== MEMULAI TEST KEJADIAN SISWA & SERVER-SIDE VISIBILITY ===\n');
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
    // 1. Ambil 1 siswa sampel dari database
    const student = await db('students').where({ satuan_pendidikan_id: 1 }).first() || await db('students').first();
    assert(!!student, `Siswa sampel ditemukan (ID: ${student?.id}, Nama: ${student?.full_name})`);

    // 2. Test Master Kategori Kejadian
    const categories = await studentAffairsService.listIncidentCategories({ satuan_pendidikan_id: 1 });
    assert(Array.isArray(categories) && categories.length > 0, `Master kategori kejadian berhasil dimuat (${categories.length} kategori)`);

    const sampleCatNegative = categories.find(c => c.type === 'negative') || categories[0];
    const sampleCatPositive = categories.find(c => c.type === 'positive') || categories[1];

    // 3. User Mocks
    const adminUser = {
      account_type: 'super_admin',
      roles: ['super_admin'],
      school_roles: [{ role_name: 'super_admin' }]
    };

    const kesiswaanUser = {
      account_type: 'staff',
      ref_type: 'staff',
      ref_id: 10,
      roles: ['kesiswaan'],
      school_roles: [{ role_name: 'kesiswaan' }]
    };

    const bkUser = {
      account_type: 'staff',
      ref_type: 'staff',
      ref_id: 20,
      roles: ['guru_bk'],
      school_roles: [{ role_name: 'guru_bk' }]
    };

    const teacherUser = {
      account_type: 'teacher',
      ref_type: 'staff',
      ref_id: 30,
      roles: ['guru_mapel'],
      school_roles: [{ role_name: 'guru_mapel' }]
    };

    // 4. Test Create Incident: Negatif (Pelanggaran)
    const incNeg = await studentAffairsService.createIncident({
      satuan_pendidikan_id: 1,
      student_id: student.id,
      category_id: sampleCatNegative.id,
      type: 'negative',
      title: 'Terlambat Masuk Kelas Pagi',
      description: 'Siswa datang pukul 07.35 WIB saat bel apel sudah berbunyi.',
      points: 5,
      incident_date: '2026-10-06',
      incident_time: '07:35:00',
      location: 'Gerbang Utama',
      visibility_level: 'teachers_only'
    }, teacherUser);

    assert(incNeg && incNeg.id && incNeg.type === 'negative', `Catatan insiden negatif berhasil dibuat (ID: ${incNeg.id}, Points: ${incNeg.points})`);

    // 5. Test Create Incident: Positif (Prestasi / Apresiasi)
    const incPos = await studentAffairsService.createIncident({
      satuan_pendidikan_id: 1,
      student_id: student.id,
      category_id: sampleCatPositive.id,
      type: 'positive',
      title: 'Juara 1 Lomba Tahfidz Al-Qur\'an',
      description: 'Meraih juara 1 pada Musabaqah Hifdzil Qur\'an tingkat kabupaten.',
      points: 25,
      incident_date: '2026-10-06',
      visibility_level: 'public_school'
    }, kesiswaanUser);

    assert(incPos && incPos.id && incPos.type === 'positive', `Catatan insiden positif berhasil dibuat (ID: ${incPos.id}, Points: ${incPos.points})`);

    // 6. Test Create Incident: Kasus Sensitif BK (bk_only)
    const incBkOnly = await studentAffairsService.createIncident({
      satuan_pendidikan_id: 1,
      student_id: student.id,
      type: 'negative',
      title: 'Kasus Masalah Pribadi / Perilaku Khusus',
      description: 'Siswa memerlukan pendampingan psikososial khusus bersama orang tua.',
      points: 0,
      incident_date: '2026-10-06',
      visibility_level: 'bk_only'
    }, bkUser);

    assert(incBkOnly && incBkOnly.id && incBkOnly.visibility_level === 'bk_only', `Catatan insiden sensitif BK berhasil dibuat (ID: ${incBkOnly.id})`);

    // 7. Test Server-Side Visibility Rules
    // a. Guru biasa melihat daftar insiden -> tidak boleh melihat incBkOnly
    const teacherList = await studentAffairsService.listIncidents({ student_id: student.id }, teacherUser);
    const teacherCanSeeBkOnly = teacherList.some(i => i.id === incBkOnly.id);
    assert(!teacherCanSeeBkOnly, 'Server menegakkan visibilitas: Guru biasa TIDAK BISA melihat insiden level bk_only di list');

    // b. Guru BK / Admin melihat daftar insiden -> dapat melihat incBkOnly
    const bkList = await studentAffairsService.listIncidents({ student_id: student.id }, bkUser);
    const bkCanSeeBkOnly = bkList.some(i => i.id === incBkOnly.id);
    assert(bkCanSeeBkOnly, 'Guru BK / Admin BISA melihat seluruh catatan insiden termasuk level bk_only');

    // c. Guru biasa mengakses getIncidentById pada kasus bk_only -> harus ditolak (403 Forbidden)
    let errorCaught = false;
    try {
      await studentAffairsService.getIncidentById(incBkOnly.id, teacherUser);
    } catch (err) {
      errorCaught = true;
      assert(err.statusCode === 403, `Akses detail langsung ditolak dengan status 403 Forbidden: ${err.message}`);
    }
    assert(errorCaught, 'Guru biasa terblokir saat mencoba query langsung ID insiden privat bk_only');

    // 8. Test Update Handling Status (Alur Penanganan)
    const updatedStatus = await studentAffairsService.updateHandlingStatus(incNeg.id, {
      handling_status: 'in_progress',
      handling_action: 'Diberikan teguran lisan dan pembinaan oleh wali kelas.'
    }, teacherUser);
    assert(updatedStatus.handling_status === 'in_progress' && updatedStatus.handling_action !== null, `Status penanganan berhasil diubah ke in_progress dengan catatan pembinaan`);

    const resolvedStatus = await studentAffairsService.updateHandlingStatus(incNeg.id, {
      handling_status: 'resolved',
      resolution_date: '2026-10-06'
    }, kesiswaanUser);
    assert(resolvedStatus.handling_status === 'resolved' && resolvedStatus.resolution_date !== null, `Status penanganan berhasil diselesaikan (resolved)`);

    // 9. Test Verifikasi Poin oleh Kesiswaan
    const verified = await studentAffairsService.verifyIncidentPoints(incPos.id, {
      points: 30 // Update poin apresiasi final
    }, kesiswaanUser);
    assert(verified.verified_at !== null && verified.points === 30, `Verifikasi poin oleh kesiswaan berhasil (Poin final: ${verified.points}, Verified at: ${verified.verified_at})`);

    // 10. Test Rekap / Summary Kejadian Siswa
    const summary = await studentAffairsService.getStudentIncidentSummary(student.id);
    assert(
      summary &&
      summary.total_incidents >= 2 &&
      summary.total_positive_points >= 30 &&
      summary.total_negative_points >= 5,
      `Rekap rekam jejak siswa valid: Total Positif: ${summary.total_positive_points}, Total Negatif: ${summary.total_negative_points}, Skor Bersih: ${summary.net_score}`
    );

    // 11. Test Kompatibilitas Legacy Endpoint Disiplin & Prestasi
    const legacyDisc = await studentAffairsService.createDisciplinaryRecord({
      student_id: student.id,
      violation_type: 'Atribut Seragam Tidak Lengkap',
      points: 5,
      incident_date: '2026-10-06',
      notes: 'Lupa memakai ikat pinggang'
    }, teacherUser);
    assert(legacyDisc && legacyDisc.id, `Legacy createDisciplinaryRecord tetap berjalan normal (ID: ${legacyDisc.id})`);

    const legacyAchieve = await studentAffairsService.createAchievement({
      student_id: student.id,
      achievement_type: 'Lomba Catur Antar Kelas',
      level: 'sekolah',
      achieved_at: '2026-10-06',
      notes: 'Juara 2'
    });
    assert(legacyAchieve && legacyAchieve.id, `Legacy createAchievement tetap berjalan normal (ID: ${legacyAchieve.id})`);

    console.log(`\n=== SEMUA TEST BERHASIL: ${passed} PASSED, ${failed} FAILED ===\n`);
  } catch (err) {
    console.error('ERROR PADA TEST:', err);
    failed++;
  } finally {
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
