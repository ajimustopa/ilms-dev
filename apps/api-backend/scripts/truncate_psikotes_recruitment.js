/**
 * Script untuk mengosongkan seluruh data transaksi psikotes dan rekrutmen
 */
const dbKepegawaian = require('../src/config/db/kepegawaian');

async function truncatePsikotesAndRecruitment() {
  console.log('--- Memulai pengosongan data Psikotes & Rekrutmen ---');

  try {
    await dbKepegawaian.raw('SET FOREIGN_KEY_CHECKS = 0;');

    // 1. Tabel-tabel transaksi Rekrutmen
    const recruitmentTables = [
      'recruitment_microteaching_evaluations',
      'recruitment_interview_evaluations',
      'recruitment_test_results',
      'recruitment_stage_histories',
      'recruitment_candidates'
    ];

    for (const table of recruitmentTables) {
      try {
        await dbKepegawaian(table).truncate();
        console.log(`[OK] Tabel ${table} berhasil dikosongkan.`);
      } catch (err) {
        try {
          await dbKepegawaian(table).del();
          console.log(`[OK] Tabel ${table} berhasil didelete.`);
        } catch (e) {
          console.warn(`[WARN] Gagal mengosongkan ${table}:`, e.message);
        }
      }
    }

    // 2. Tabel-tabel transaksi Psikotes
    const psychotestTables = [
      'psychotest_answers',
      'psychotest_results',
      'psychotest_sessions'
    ];

    for (const table of psychotestTables) {
      try {
        await dbKepegawaian(table).truncate();
        console.log(`[OK] Tabel ${table} berhasil dikosongkan.`);
      } catch (err) {
        try {
          await dbKepegawaian(table).del();
          console.log(`[OK] Tabel ${table} berhasil didelete.`);
        } catch (e) {
          console.warn(`[WARN] Gagal mengosongkan ${table}:`, e.message);
        }
      }
    }

    await dbKepegawaian.raw('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('--- Pengosongan data Psikotes & Rekrutmen SELESAI DENGAN SUKSES! ---');
  } catch (error) {
    console.error('[ERROR] Terjadi kesalahan saat mengosongkan data:', error);
  } finally {
    await dbKepegawaian.destroy();
    process.exit(0);
  }
}

truncatePsikotesAndRecruitment();
