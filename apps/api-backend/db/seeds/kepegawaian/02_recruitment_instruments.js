/**
 * Seed: Recruitment Instruments (Bank Soal Psikotes & Rubrik Wawancara)
 */
exports.seed = async function(knex) {
  // Cek apakah sudah ada instrumen
  const count = await knex('recruitment_test_instruments').count('id as cnt').first();
  if (count && count.cnt > 0) return;

  await knex('recruitment_test_instruments').insert([
    {
      id: 1,
      school_unit_id: 1,
      title: 'Tes Psikotes: Logika, Penalaran & Kepribadian Kerja',
      test_type: 'psychological',
      description: 'Instrumen evaluasi psikotes standar untuk menguji ketelitian, logika verbal, pemecahan masalah, dan integritas kerja.',
      duration_minutes: 30,
      passing_score: 70.00,
      is_active: true,
      questions: JSON.stringify([
        {
          id: 1,
          question: 'Jika SEMUA GURU di Aldepos berdisiplin tinggi, dan USTADZ AHMAD adalah seorang guru di Aldepos, maka kesimpulannya adalah:',
          question_type: 'multiple_choice',
          options: [
            { key: 'A', text: 'Ustadz Ahmad mungkin berdisiplin tinggi' },
            { key: 'B', text: 'Ustadz Ahmad pasti berdisiplin tinggi' },
            { key: 'C', text: 'Ustadz Ahmad bukan guru yang berdisiplin' },
            { key: 'D', text: 'Tidak dapat ditarik kesimpulan' }
          ],
          correct_option: 'B',
          score_weight: 20
        },
        {
          id: 2,
          question: 'Pilihlah padanan kata (Analogi): SEKOLAH : SISWA = PESANTREN : ...',
          question_type: 'multiple_choice',
          options: [
            { key: 'A', text: 'Guru' },
            { key: 'B', text: 'Kiai' },
            { key: 'C', text: 'Santri' },
            { key: 'D', text: 'Asrama' }
          ],
          correct_option: 'C',
          score_weight: 20
        },
        {
          id: 3,
          question: 'Bagaimana sikap Anda saat menghadapi santri/siswa yang berulang kali terlambat masuk ke kelas?',
          question_type: 'multiple_choice',
          options: [
            { key: 'A', text: 'Langsung menghukum fisik di depan kelas' },
            { key: 'B', text: 'Mengabaikannya agar tidak mengganggu jalannya pelajaran' },
            { key: 'C', text: 'Melakukan pendekatan personal (tabayyun), menggali akar masalah, dan membimbing secara persuasif' },
            { key: 'D', text: 'Menyerahkan sepenuhnya ke bagian kesiswaan tanpa peduli' }
          ],
          correct_option: 'C',
          score_weight: 20
        },
        {
          id: 4,
          question: 'Kelanjutan dari deret angka berikut: 3, 6, 12, 24, 48, ...',
          question_type: 'multiple_choice',
          options: [
            { key: 'A', text: '72' },
            { key: 'B', text: '96' },
            { key: 'C', text: '84' },
            { key: 'D', text: '60' }
          ],
          correct_option: 'B',
          score_weight: 20
        },
        {
          id: 5,
          question: 'Ketika diberikan amanah tugas di luar jam kerja untuk kemaslahatan pesantren/sekolah, respon Anda adalah:',
          question_type: 'multiple_choice',
          options: [
            { key: 'A', text: 'Menolak tegas karena di luar jam kerja' },
            { key: 'B', text: 'Menerima dengan ikhlas, dedikasi tinggi, dan mengoordinasikan dengan tim secara profesional' },
            { key: 'C', text: 'Mengerjakannya asal selesai tanpa kualitas' },
            { key: 'D', text: 'Menuntut kompensasi berlipat terlebih dahulu' }
          ],
          correct_option: 'B',
          score_weight: 20
        }
      ]),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: 2,
      school_unit_id: 1,
      title: 'Rubrik Standar Wawancara Kompetensi & Budaya IBS',
      test_type: 'interview_rubric',
      description: 'Panduan dan daftar pertanyaan wawancara terstruktur mencakup visi pendidikan Islam, integritas, adaptabilitas, dan kompetensi teknis.',
      duration_minutes: 45,
      passing_score: 75.00,
      is_active: true,
      questions: JSON.stringify([
        {
          id: 1,
          question: 'Ceritakan motivasi terbesar Anda ingin mengabdi dan berkarier di lingkungan Pesantren & Sekolah Islam Aldepos IBS?',
          question_type: 'essay_rubric',
          score_weight: 25
        },
        {
          id: 2,
          question: 'Bagaimana strategi Anda dalam mengintegrasikan nilai-nilai adab Islami dan Al-Quran ke dalam mata pelajaran/pekerjaan Anda?',
          question_type: 'essay_rubric',
          score_weight: 25
        },
        {
          id: 3,
          question: 'Ceritakan pengalaman Anda saat menghadapi konflik kerja atau perbedaan pendapat dalam tim, dan bagaimana Anda menyelesaikannya?',
          question_type: 'essay_rubric',
          score_weight: 25
        },
        {
          id: 4,
          question: 'Sejauh mana kesiapan Anda berkomitmen terhadap jam kerja asrama/boarding school dan penugasan yayasan?',
          question_type: 'essay_rubric',
          score_weight: 25
        }
      ]),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
};
