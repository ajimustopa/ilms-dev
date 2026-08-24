/**
 * Seed: 002_psychotest_seed.js
 * Modul Kepegawaian - Fitur: Tes Psikologi (MBTI & Big Five OCEAN)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // 1. Bersihkan tabel psychotest secara aman (idempotent seed)
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  await knex('psychotest_results').truncate();
  await knex('psychotest_answers').truncate();
  await knex('psychotest_sessions').truncate();
  await knex('psychotest_type_profiles').truncate();
  await knex('psychotest_questions').truncate();
  await knex('psychotest_dimensions').truncate();
  await knex('psychotest_types').truncate();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 2. Insert Master psychotest_types
  await knex('psychotest_types').insert([
    {
      id: 1,
      school_unit_id: null,
      code: 'mbti',
      name: 'Myers-Briggs Type Indicator (MBTI)',
      scoring_method: 'dichotomy_4axis',
      description: 'Inventori kepribadian tipologi berbasis teori Carl Gustav Jung untuk memetakan preferensi psikologis individu dalam mengarahkan energi, menyerap informasi, mengambil keputusan, dan pola hidup.',
      instructions: 'Pilihlah salah satu dari dua pernyataan (Opsi A atau Opsi B) yang paling spontan dan jujur menggambarkan kebiasaan atau preferensi alamiah diri Anda.',
      duration_minutes: 30,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: 2,
      school_unit_id: null,
      code: 'big_five',
      name: 'Big Five Personality Traits (OCEAN)',
      scoring_method: 'trait_average',
      description: 'Model kepribadian kontinum lima dimensi utama (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism) untuk asesmen dinamika kerja, stabilitas emosi, dan performa tim.',
      instructions: 'Tentukan sejauh mana Anda setuju dengan setiap pernyataan menggunakan skala 1 (Sangat Tidak Setuju) hingga 5 (Sangat Setuju).',
      duration_minutes: 25,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);

  // 3. Insert psychotest_dimensions
  // MBTI: 4 Dimensi (id: 1..4), Big Five: 5 Dimensi (id: 5..9)
  await knex('psychotest_dimensions').insert([
    // MBTI Dimensions
    {
      id: 1,
      test_type_id: 1,
      code: 'EI',
      name: 'Extraversion (E) vs Introversion (I)',
      pole_positive_code: 'E',
      pole_positive_label: 'Ekstrovert (Extraversion)',
      pole_negative_code: 'I',
      pole_negative_label: 'Introvert (Introversion)',
      description: 'Orientasi pemulihan energi dan interaksi dengan lingkungan luar vs refleksi internal.',
      order_number: 1,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: 2,
      test_type_id: 1,
      code: 'SN',
      name: 'Sensing (S) vs Intuition (N)',
      pole_positive_code: 'S',
      pole_positive_label: 'Sensing (Faktual & Nyata)',
      pole_negative_code: 'N',
      pole_negative_label: 'Intuition (Konseptual & Visioner)',
      description: 'Cara menerima, mengolah fakta nyata vs menangkap pola abstrak dan kemungkinan masa depan.',
      order_number: 2,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: 3,
      test_type_id: 1,
      code: 'TF',
      name: 'Thinking (T) vs Feeling (F)',
      pole_positive_code: 'T',
      pole_positive_label: 'Thinking (Logis & Objektif)',
      pole_negative_code: 'F',
      pole_negative_label: 'Feeling (Empatik & Nilai Kemanusiaan)',
      description: 'Dasar pertimbangan dalam mengambil keputusan: prinsip rasionalitas vs dampak terhadap perasaan manusia.',
      order_number: 3,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: 4,
      test_type_id: 1,
      code: 'JP',
      name: 'Judging (J) vs Perceiving (P)',
      pole_positive_code: 'J',
      pole_positive_label: 'Judging (Terstruktur & Rencana)',
      pole_negative_code: 'P',
      pole_negative_label: 'Perceiving (Fleksibel & Spontan)',
      description: 'Pola orientasi terhadap dunia luar: gaya hidup teratur dan terjadwal vs luwes dan adaptif.',
      order_number: 4,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },

    // Big Five (OCEAN) Dimensions
    {
      id: 5,
      test_type_id: 2,
      code: 'O',
      name: 'Openness to Experience',
      pole_positive_code: 'O_high',
      pole_positive_label: 'Kreatif, Imajinatif & Terbuka',
      pole_negative_code: 'O_low',
      pole_negative_label: 'Praktis, Konvensional & Realistis',
      description: 'Tingkat keterbukaan intelektual, apresiasi ide baru, estetika, dan variasi cara kerja.',
      order_number: 1,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: 6,
      test_type_id: 2,
      code: 'C',
      name: 'Conscientiousness',
      pole_positive_code: 'C_high',
      pole_positive_label: 'Teliti, Disiplin & Terorganisir',
      pole_negative_code: 'C_low',
      pole_negative_label: 'Santai, Spontan & Fleksibel',
      description: 'Tingkat kehati-hatian, keteraturan, ketekunan mencapai target, dan tanggung jawab kerja.',
      order_number: 2,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: 7,
      test_type_id: 2,
      code: 'E',
      name: 'Extraversion',
      pole_positive_code: 'E_high',
      pole_positive_label: 'Antusias, Komunikatif & Ramah',
      pole_negative_code: 'E_low',
      pole_negative_label: 'Tenang, Mandiri & Terkendali',
      description: 'Kecenderungan bersosialisasi, antusiasme, ketegasan bicara, dan energi dalam kelompok.',
      order_number: 3,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: 8,
      test_type_id: 2,
      code: 'A',
      name: 'Agreeableness',
      pole_positive_code: 'A_high',
      pole_positive_label: 'Empatis, Kooperatif & Tulus',
      pole_negative_code: 'A_low',
      pole_negative_label: 'Kritis, Berpendirian Tegas & Kompetitif',
      description: 'Kecenderungan menaruh kepercayaan, peduli, tolong-menolong, dan menjaga keharmonisan.',
      order_number: 4,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: 9,
      test_type_id: 2,
      code: 'N',
      name: 'Neuroticism (Emotional Stability)',
      pole_positive_code: 'N_high',
      pole_positive_label: 'Rentan Terhadap Stres & Sensitif',
      pole_negative_code: 'N_low',
      pole_negative_label: 'Tenang, Tangguh & Stabil Secara Emosi',
      description: 'Tingkat kerentanan terhadap tekanan, kecemasan, perubahan suasana hati, dan kendali diri di bawah beban.',
      order_number: 5,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);

  // 4. Insert psychotest_questions
  const questions = [
    // -------------------------------------------------------------
    // MBTI - Dimensi 1: EI (Extraversion vs Introversion) - 10 Soal
    // -------------------------------------------------------------
    {
      test_type_id: 1,
      dimension_id: 1,
      question_code: 'MBTI_EI_01',
      question_text: 'Setelah melewati pekan kerja yang sangat padat dan melelahkan, Anda lebih merasa segar kembali dengan cara:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Berkumpul atau mengobrol santai bersama rekan kerja/teman dekat',
      option_a_pole: 'E',
      option_b_text: 'Menikmati waktu sendiri dengan tenang di rumah atau membaca',
      option_b_pole: 'I',
      order_number: 1,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 1,
      question_code: 'MBTI_EI_02',
      question_text: 'Ketika berada di forum atau pertemuan baru di mana Anda belum banyak mengenal orang, Anda cenderung:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Secara proaktif menyapa dan membuka obrolan terlebih dahulu',
      option_a_pole: 'E',
      option_b_text: 'Menunggu orang lain menyapa atau mengamati suasana terlebih dahulu',
      option_b_pole: 'I',
      order_number: 2,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 1,
      question_code: 'MBTI_EI_03',
      question_text: 'Dalam mematangkan gagasan baru, proses yang lebih alami bagi Anda adalah:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Mendiskusikan dan melontarkan ide secara lisan bersama rekan tim',
      option_a_pole: 'E',
      option_b_text: 'Memikirkan dan merenungkan konsep secara mendalam sebelum menyampaikannya',
      option_b_pole: 'I',
      order_number: 3,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 1,
      question_code: 'MBTI_EI_04',
      question_text: 'Lingkungan kerja yang paling memotivasi Anda sehari-hari adalah:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Ruang kerja kolaboratif yang dinamis dengan banyak interaksi tatap muka',
      option_a_pole: 'E',
      option_b_text: 'Ruang kerja hening yang minim gangguan agar dapat fokus penuh',
      option_b_pole: 'I',
      order_number: 4,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 1,
      question_code: 'MBTI_EI_05',
      question_text: 'Ketika ada topik hangat di lingkungan kerja, orang lain biasanya melihat Anda sebagai orang yang:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Cepat mengekspresikan opini dan tanggapan secara terbuka',
      option_a_pole: 'E',
      option_b_text: 'Menyimpan pandangan pribadi sampai diminta secara khusus',
      option_b_pole: 'I',
      order_number: 5,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 1,
      question_code: 'MBTI_EI_06',
      question_text: 'Bagi Anda, memiliki jaringan pertemanan yang luas di berbagai divisi adalah:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Hal yang sangat menyenangkan dan memberikan energi positif',
      option_a_pole: 'E',
      option_b_text: 'Hal yang baik, namun Anda lebih mengutamakan beberapa hubungan akrab yang mendalam',
      option_b_pole: 'I',
      order_number: 6,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 1,
      question_code: 'MBTI_EI_07',
      question_text: 'Saat sedang menyelesaikan tugas rumit, Anda merasa lebih lancar jika:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Bisa bolak-balik berdiskusi dan bertukar pikiran di sela-sela pengerjaan',
      option_a_pole: 'E',
      option_b_text: 'Bisa berkonsentrasi sendirian dari awal hingga akhir tanpa interupsi',
      option_b_pole: 'I',
      order_number: 7,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 1,
      question_code: 'MBTI_EI_08',
      question_text: 'Jika diminta berbicara di depan audiens tanpa persiapan panjang, reaksi alami Anda adalah:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Merasa tertantang dan antusias menyampaikan pesan',
      option_a_pole: 'E',
      option_b_text: 'Merasa kurang nyaman dan lebih suka menyiapkan poin tertulis dahulu',
      option_b_pole: 'I',
      order_number: 8,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 1,
      question_code: 'MBTI_EI_09',
      question_text: 'Dalam ritme komunikasi harian, Anda lebih menyukai media:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Panggilan telepon atau percakapan langsung untuk kecepatan koordinasi',
      option_a_pole: 'E',
      option_b_text: 'Pesan teks atau email agar lebih terstruktur dan terdokumentasi rapi',
      option_b_pole: 'I',
      order_number: 9,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 1,
      question_code: 'MBTI_EI_10',
      question_text: 'Orang-orang di sekitar Anda umumnya mendeskripsikan kepribadian Anda sebagai sosok yang:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Ekspresif, mudah didekati, dan cepat membaur',
      option_a_pole: 'E',
      option_b_text: 'Tenang, bijaksana, dan selektif dalam berbicara',
      option_b_pole: 'I',
      order_number: 10,
      is_active: true
    },

    // -------------------------------------------------------------
    // MBTI - Dimensi 2: SN (Sensing vs Intuition) - 10 Soal
    // -------------------------------------------------------------
    {
      test_type_id: 1,
      dimension_id: 2,
      question_code: 'MBTI_SN_01',
      question_text: 'Ketika mempelajari sebuah materi atau prosedur kerja baru, fokus awal Anda adalah:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Fakta nyata, contoh praktis, dan langkah-langkah kerja yang terbukti berhasil',
      option_a_pole: 'S',
      option_b_text: 'Gambaran besar, prinsip konseptual, dan potensi inovasi di masa depan',
      option_b_pole: 'N',
      order_number: 11,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 2,
      question_code: 'MBTI_SN_02',
      question_text: 'Dalam memecahkan masalah harian, Anda lebih mengandalkan:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Pengalaman masa lalu dan data konkret yang sudah teruji',
      option_a_pole: 'S',
      option_b_text: 'Firasat intuitif dan eksplorasi alternatif cara yang belum pernah dicoba',
      option_b_pole: 'N',
      order_number: 12,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 2,
      question_code: 'MBTI_SN_03',
      question_text: 'Anda lebih menikmati tugas yang menuntut:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Ketelitian tinggi pada rincian operasional dan ketepatan eksekusi',
      option_a_pole: 'S',
      option_b_text: 'Pengembangan strategi baru dan perumusan visi jangka panjang',
      option_b_pole: 'N',
      order_number: 13,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 2,
      question_code: 'MBTI_SN_04',
      question_text: 'Saat mendengar penjelasan orang lain, Anda lebih cepat menangkap maksudnya jika:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Disampaikan secara lugas dengan data, angka, dan bukti fisik',
      option_a_pole: 'S',
      option_b_text: 'Disampaikan menggunakan analogi, metafora, dan makna tersirat',
      option_b_pole: 'N',
      order_number: 14,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 2,
      question_code: 'MBTI_SN_05',
      question_text: 'Dalam memandang rutinitas kerja sehari-hari, Anda merasa:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Nyaman karena memberikan kepastian dan efisiensi yang stabil',
      option_a_pole: 'S',
      option_b_text: 'Cepat bosan dan terdorong untuk mencari variasi atau terobosan baru',
      option_b_pole: 'N',
      order_number: 15,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 2,
      question_code: 'MBTI_SN_06',
      question_text: 'Ketika membaca buku atau laporan, Anda lebih tertarik pada bagian:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Studi kasus nyata, rincian teknis, dan implementasi aplikatif',
      option_a_pole: 'S',
      option_b_text: 'Gagasan filosofis, tren masa depan, dan implikasi strategis',
      option_b_pole: 'N',
      order_number: 16,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 2,
      question_code: 'MBTI_SN_07',
      question_text: 'Jika Anda dihadapkan pada instruksi kerja yang belum lengkap, Anda cenderung:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Meminta kejelasan detail SOP yang pasti sebelum mulai bekerja',
      option_a_pole: 'S',
      option_b_text: 'Langsung berimprovisasi menghubungkan berbagai kemungkinan konsep',
      option_b_pole: 'N',
      order_number: 17,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 2,
      question_code: 'MBTI_SN_08',
      question_text: 'Dalam keseharian, Anda lebih bangga dikenal sebagai pribadi yang:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Pijak bumi, realistis, dan handal menyelesaikan tugas saat ini',
      option_a_pole: 'S',
      option_b_text: 'Inovatif, visioner, dan mampu melihat apa yang belum terlihat orang lain',
      option_b_pole: 'N',
      order_number: 18,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 2,
      question_code: 'MBTI_SN_09',
      question_text: 'Saat menyusun rencana kegiatan, hal yang pertama kali Anda amankan adalah:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Kesiapan logistik, anggaran riil, dan jadwal teknis',
      option_a_pole: 'S',
      option_b_text: 'Nilai dampak, tema inspiratif, dan visi perubahan yang ingin dicapai',
      option_b_pole: 'N',
      order_number: 19,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 2,
      question_code: 'MBTI_SN_10',
      question_text: 'Ketika menilai suatu keadaan, Anda lebih memprioritaskan:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Kenyataan apa adanya yang terjadi saat ini',
      option_a_pole: 'S',
      option_b_text: 'Potensi dan kemungkinan apa yang bisa terjadi kelak',
      option_b_pole: 'N',
      order_number: 20,
      is_active: true
    },

    // -------------------------------------------------------------
    // MBTI - Dimensi 3: TF (Thinking vs Feeling) - 10 Soal
    // -------------------------------------------------------------
    {
      test_type_id: 1,
      dimension_id: 3,
      question_code: 'MBTI_TF_01',
      question_text: 'Ketika harus mengambil keputusan sulit yang berdampak pada banyak orang, kompas utama Anda adalah:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Aturan, keadilan objektif, dan analisis konsekuensi yang logis',
      option_a_pole: 'T',
      option_b_text: 'Perasaan individu, empati, dan nilai-nilai kemanusiaan',
      option_b_pole: 'F',
      order_number: 21,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 3,
      question_code: 'MBTI_TF_02',
      question_text: 'Saat memberikan evaluasi atau masukan kepada rekan kerja, gaya alami Anda adalah:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Menyampaikan kebenaran fakta secara jujur, lugas, dan to-the-point',
      option_a_pole: 'T',
      option_b_text: 'Memilih kata dengan hati-hati agar menjaga motivasi dan perasaan rekan',
      option_b_pole: 'F',
      order_number: 22,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 3,
      question_code: 'MBTI_TF_03',
      question_text: 'Dalam menghadapi perselisihan antar rekan dalam tim, fokus Anda adalah:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Mencari akar permasalahan secara objektif dan menegakkan solusi rasional',
      option_a_pole: 'T',
      option_b_text: 'Memulihkan keharmonisan relasi dan memastikan semua pihak merasa didengar',
      option_b_pole: 'F',
      order_number: 23,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 3,
      question_code: 'MBTI_TF_04',
      question_text: 'Anda merasa lebih puas ketika berhasil:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Menyelesaikan persoalan sistemik dengan algoritma pemikiran yang presisi',
      option_a_pole: 'T',
      option_b_text: 'Membantu seseorang bertumbuh dan merasa didukung secara tulus',
      option_b_pole: 'F',
      order_number: 24,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 3,
      question_code: 'MBTI_TF_05',
      question_text: 'Kritik yang paling mengusik Anda adalah jika Anda dituduh:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Tidak kompeten atau pemikirannya tidak masuk akal',
      option_a_pole: 'T',
      option_b_text: 'Tidak punya kepedulian atau bersikap dingin terhadap orang lain',
      option_b_pole: 'F',
      order_number: 25,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 3,
      question_code: 'MBTI_TF_06',
      question_text: 'Dalam menilai keberhasilan sebuah program kerja, tolak ukur utama Anda:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Ketercapaian KPI terukur, efisiensi anggaran, dan target output',
      option_a_pole: 'T',
      option_b_text: 'Kepuasan penerima manfaat, moral tim, dan dampak sosial yang dirasakan',
      option_b_pole: 'F',
      order_number: 26,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 3,
      question_code: 'MBTI_TF_07',
      question_text: 'Jika ada aturan organisasi yang dirasa kurang pas bagi kasus personal seseorang, Anda condong:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Tetap konsisten menegakkan aturan demi keadilan bersama tanpa pengecualian',
      option_a_pole: 'T',
      option_b_text: 'Memberikan dispensasi atau kebijakan khusus demi kemaslahatan personal',
      option_b_pole: 'F',
      order_number: 27,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 3,
      question_code: 'MBTI_TF_08',
      question_text: 'Saat rekan kerja mencurahkan beban hatinya (curhat), respon pertama Anda:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Menganalisis sebab-akibat dan menawarkan opsi solusi praktis',
      option_a_pole: 'T',
      option_b_text: 'Mendengarkan dengan penuh empati dan memberikan dukungan emosional',
      option_b_pole: 'F',
      order_number: 28,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 3,
      question_code: 'MBTI_TF_09',
      question_text: 'Anda memandang sikap profesionalisme sebagai:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Kemampuan memisahkan emosi pribadi dari tanggung jawab pekerjaan',
      option_a_pole: 'T',
      option_b_text: 'Kemampuan merawat hubungan saling percaya dan iklim kerja yang hangat',
      option_b_pole: 'F',
      order_number: 29,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 3,
      question_code: 'MBTI_TF_10',
      question_text: 'Ketika memimpin rapat koordinasi, gaya kepemimpinan Anda:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Tegas pada agenda, fokus debat argumen sehat, dan ketetapan logis',
      option_a_pole: 'T',
      option_b_text: 'Membangun konsensus, merangkul semua aspirasi, dan menjaga kenyamanan forum',
      option_b_pole: 'F',
      order_number: 30,
      is_active: true
    },

    // -------------------------------------------------------------
    // MBTI - Dimensi 4: JP (Judging vs Perceiving) - 10 Soal
    // -------------------------------------------------------------
    {
      test_type_id: 1,
      dimension_id: 4,
      question_code: 'MBTI_JP_01',
      question_text: 'Dalam mengelola jadwal dan target pekerjaan pekanan, kebiasaan Anda adalah:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Membuat daftar to-do list terencana dan menyelesaikannya sesuai urutan waktu',
      option_a_pole: 'J',
      option_b_text: 'Bekerja secara fleksibel mengikuti momentum dan urgensi yang muncul tiba-tiba',
      option_b_pole: 'P',
      order_number: 31,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 4,
      question_code: 'MBTI_JP_02',
      question_text: 'Terkait tenggat waktu (deadline) sebuah proyek besar, Anda biasanya:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Menuntaskan pekerjaan jauh-jauh hari sebelum tenggat tiba demi ketenangan pikiran',
      option_a_pole: 'J',
      option_b_text: 'Memaksimalkan waktu hingga mendekati deadline karena ide terbaik sering muncul saat terdesak',
      option_b_pole: 'P',
      order_number: 32,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 4,
      question_code: 'MBTI_JP_03',
      question_text: 'Ketika bepergian atau mengadakan acara bersama keluarga/tim, Anda lebih suka:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Susunan itinerary yang jelas, reservasi rapi, dan estimasi waktu yang terjaga',
      option_a_pole: 'J',
      option_b_text: 'Rencana umum yang longgar sehingga bebas menjelajah secara spontan',
      option_b_pole: 'P',
      order_number: 33,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 4,
      question_code: 'MBTI_JP_04',
      question_text: 'Meja kerja dan berkas dokumen Anda umumnya berada dalam kondisi:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Tertata rapi di folder/tempatnya masing-masing secara sistematis',
      option_a_pole: 'J',
      option_b_text: 'Tampak agak berantakan bagi orang lain, namun Anda tahu pasti letak tiap benda',
      option_b_pole: 'P',
      order_number: 34,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 4,
      question_code: 'MBTI_JP_05',
      question_text: 'Ketika ada perubahan mendadak pada agenda yang sudah disepakati, perasaan Anda:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Cukup terganggu dan ingin segera merevisi jadwal resmi kembali rapi',
      option_a_pole: 'J',
      option_b_text: 'Mudah menyesuaikan diri dan menganggap perubahan sebagai hal biasa yang menarik',
      option_b_pole: 'P',
      order_number: 35,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 4,
      question_code: 'MBTI_JP_06',
      question_text: 'Dalam proses pengambilan keputusan, gaya kerja Anda lebih suka:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Cepat menetapkan kepastian (closure) agar bisa segera melangkah ke aksi',
      option_a_pole: 'J',
      option_b_text: 'Menjaga opsi tetap terbuka selama mungkin untuk menampung informasi tambahan',
      option_b_pole: 'P',
      order_number: 36,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 4,
      question_code: 'MBTI_JP_07',
      question_text: 'Sebelum memulai libur akhir pekan, Anda merasa lebih nyaman jika:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Semua tanggungan tugas pekan ini sudah tuntas terkirim tanpa sisa gantung',
      option_a_pole: 'J',
      option_b_text: 'Bisa langsung rehat dan membiarkan sisa detail dilanjutkan pekan depan',
      option_b_pole: 'P',
      order_number: 37,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 4,
      question_code: 'MBTI_JP_08',
      question_text: 'Dalam menjalankan aturan atau prosedur organisasi (SOP), pandangan Anda:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'SOP adalah standar baku yang wajib ditaati secara disiplin demi keteraturan',
      option_a_pole: 'J',
      option_b_text: 'SOP adalah panduan umum yang dapat dimodifikasi sesuai situasi di lapangan',
      option_b_pole: 'P',
      order_number: 38,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 4,
      question_code: 'MBTI_JP_09',
      question_text: 'Anda merasa paling produktif ketika ritme kerja berjalan dengan pola:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Ritme yang stabil, konsisten, dan terprediksi setiap hari',
      option_a_pole: 'J',
      option_b_text: 'Ritme dinamis dengan gelombang energi tinggi saat menghadapi tantangan baru',
      option_b_pole: 'P',
      order_number: 39,
      is_active: true
    },
    {
      test_type_id: 1,
      dimension_id: 4,
      question_code: 'MBTI_JP_10',
      question_text: 'Ketika memulai proyek yang memiliki banyak fase, langkah pertama Anda:',
      question_type: 'forced_choice',
      scoring_direction: 'normal',
      option_a_text: 'Menetapkan milestone, timeline detail, dan pembagian tugas per fase',
      option_a_pole: 'J',
      option_b_text: 'Langsung mulai mengerjakan bagian yang paling menarik dan menyusun alur sambil jalan',
      option_b_pole: 'P',
      order_number: 40,
      is_active: true
    },

    // -------------------------------------------------------------
    // BIG FIVE - Dimensi O (Openness to Experience) - 10 Soal Likert
    // -------------------------------------------------------------
    {
      test_type_id: 2,
      dimension_id: 5,
      question_code: 'BF_O_01',
      question_text: 'Saya sangat tertarik mempelajari konsep filosofis, teori baru, atau wawasan lintas bidang ilmu.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 41,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 5,
      question_code: 'BF_O_02',
      question_text: 'Saya menikmati menciptakan ide-ide orisinal dan mencari cara penyelesaian yang tidak lazim.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 42,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 5,
      question_code: 'BF_O_03',
      question_text: 'Saya lebih suka berpegang pada cara kerja tradisional yang sudah terbukti dibanding mencoba metode baru.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 43,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 5,
      question_code: 'BF_O_04',
      question_text: 'Saya memiliki apresiasi mendalam terhadap karya seni, sastra, arsitektur, atau keindahan alam.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 44,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 5,
      question_code: 'BF_O_05',
      question_text: 'Saya merasa tidak nyaman jika lingkungan kerja menuntut terlalu banyak diskusi konseptual abstrak.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 45,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 5,
      question_code: 'BF_O_06',
      question_text: 'Saya gemar menelusuri sudut pandang yang berbeda dengan keyakinan umum untuk memperluas cakrawala.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 46,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 5,
      question_code: 'BF_O_07',
      question_text: 'Saya memiliki imajinasi yang hidup dan sering memvisualisasikan kemungkinan-kemungkinan masa depan.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 47,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 5,
      question_code: 'BF_O_08',
      question_text: 'Bagi saya, hal-hal praktis dan rutinitas nyata jauh lebih bermakna daripada ide spekulatif.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 48,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 5,
      question_code: 'BF_O_09',
      question_text: 'Saya antusias mencoba makanan khas baru, mengunjungi tempat asing, atau mempelajari budaya berbeda.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 49,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 5,
      question_code: 'BF_O_10',
      question_text: 'Saya cepat terstimulasi oleh wacana inovasi dan pembaruan sistem di lingkungan sekolah/kerja.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 50,
      is_active: true
    },

    // -------------------------------------------------------------
    // BIG FIVE - Dimensi C (Conscientiousness) - 10 Soal Likert
    // -------------------------------------------------------------
    {
      test_type_id: 2,
      dimension_id: 6,
      question_code: 'BF_C_01',
      question_text: 'Saya selalu memeriksa kembali hasil pekerjaan saya dengan sangat teliti sebelum diserahkan.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 51,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 6,
      question_code: 'BF_C_02',
      question_text: 'Saya membuat rencana kerja yang terstruktur dan disiplin mematuhinya setiap hari.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 52,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 6,
      question_code: 'BF_C_03',
      question_text: 'Saya terkadang menunda-nunda pekerjaan sampai batas waktu hampir habis.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 53,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 6,
      question_code: 'BF_C_04',
      question_text: 'Saya menjaga barang-barang, dokumen, dan workspace saya selalu tertata rapi.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 54,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 6,
      question_code: 'BF_C_05',
      question_text: 'Ketika berkomitmen pada suatu tugas, saya berusaha keras menuntaskannya meskipun menghadapi kesulitan.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 55,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 6,
      question_code: 'BF_C_06',
      question_text: 'Saya sering bertindak secara spontan tanpa memikirkan rencana matang terlebih dahulu.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 56,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 6,
      question_code: 'BF_C_07',
      question_text: 'Saya memiliki standar kualitas pribadi yang tinggi terhadap setiap hasil kerja yang saya buat.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 57,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 6,
      question_code: 'BF_C_08',
      question_text: 'Saya mudah teralihkan konsentrasinya saat mengerjakan tugas-tugas administratif rutin.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 58,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 6,
      question_code: 'BF_C_09',
      question_text: 'Orang lain mengenal saya sebagai sosok yang tepat waktu dan dapat diandalkan.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 59,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 6,
      question_code: 'BF_C_10',
      question_text: 'Saya menyukai keteraturan jadwal dan merasa gelisah jika pekerjaan berjalan tanpa kejelasan alur.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 60,
      is_active: true
    },

    // -------------------------------------------------------------
    // BIG FIVE - Dimensi E (Extraversion) - 10 Soal Likert
    // -------------------------------------------------------------
    {
      test_type_id: 2,
      dimension_id: 7,
      question_code: 'BF_E_01',
      question_text: 'Saya merasa bersemangat dan energik saat berada di tengah keramaian atau acara kelompok besar.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 61,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 7,
      question_code: 'BF_E_02',
      question_text: 'Saya mudah memulai percakapan akrab dengan orang yang baru pertama kali saya temui.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 62,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 7,
      question_code: 'BF_E_03',
      question_text: 'Saya cenderung pendiam dan lebih suka menyendiri saat berada di lingkungan sosial yang ramai.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 63,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 7,
      question_code: 'BF_E_04',
      question_text: 'Dalam forum diskusi, saya tidak ragu untuk mengambil inisiatif dan memimpin jalannya obrolan.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 64,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 7,
      question_code: 'BF_E_05',
      question_text: 'Energi saya cepat terkuras jika harus berinteraksi sosial secara intensif tanpa jeda istirahat.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 65,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 7,
      question_code: 'BF_E_06',
      question_text: 'Saya menyukai atmosfer kerja yang penuh semangat, canda tawa, dan interaksi ceria.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 66,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 7,
      question_code: 'BF_E_07',
      question_text: 'Saya merasa percaya diri saat harus tampil berbicara atau presentasi di depan umum.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 67,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 7,
      question_code: 'BF_E_08',
      question_text: 'Saya lebih suka bekerja di balik layar daripada menjadi pusat perhatian orang banyak.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 68,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 7,
      question_code: 'BF_E_09',
      question_text: 'Saya cepat merasakan keakraban emosional dan suka berbagi cerita dengan rekan kerja.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 69,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 7,
      question_code: 'BF_E_10',
      question_text: 'Saya aktif mengekspresikan antusiasme positif saat tim mencapai keberhasilan bersama.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 70,
      is_active: true
    },

    // -------------------------------------------------------------
    // BIG FIVE - Dimensi A (Agreeableness) - 10 Soal Likert
    // -------------------------------------------------------------
    {
      test_type_id: 2,
      dimension_id: 8,
      question_code: 'BF_A_01',
      question_text: 'Saya tulus peduli terhadap perasaan, kesulitan, dan kesejahteraan rekan kerja di sekitar saya.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 71,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 8,
      question_code: 'BF_A_02',
      question_text: 'Saya mengutamakan kerja sama dan keharmonisan tim dibanding bersaing untuk menonjol sendiri.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 72,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 8,
      question_code: 'BF_A_03',
      question_text: 'Saya terkadang bersikap skeptis dan meragukan niat baik di balik tindakan orang lain.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 73,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 8,
      question_code: 'BF_A_04',
      question_text: 'Saya mudah memaafkan kesalahan orang lain dan berusaha tidak menyimpan rasa dendam.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 74,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 8,
      question_code: 'BF_A_05',
      question_text: 'Saya tidak segan mengkritik keras orang lain meskipun hal itu dapat melukai perasaannya.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 75,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 8,
      question_code: 'BF_A_06',
      question_text: 'Saya senang membantu orang lain tanpa mengharapkan imbalan atau pamrih materi.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 76,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 8,
      question_code: 'BF_A_07',
      question_text: 'Saya bersikap ramah, sopan, dan menghargai martabat setiap orang tanpa membedakan status.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 77,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 8,
      question_code: 'BF_A_08',
      question_text: 'Saya lebih mengutamakan kemenangan dalam perdebatan daripada menjaga kenyamanan suasana.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 78,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 8,
      question_code: 'BF_A_09',
      question_text: 'Saya mudah menaruh kepercayaan pada rekan kerja bahwa mereka akan menuntaskan tugasnya dengan baik.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 79,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 8,
      question_code: 'BF_A_10',
      question_text: 'Saya peka terhadap kebutuhan santri/siswa atau rekan kerja yang sedang mengalami masa-masa sulit.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 80,
      is_active: true
    },

    // -------------------------------------------------------------
    // BIG FIVE - Dimensi N (Neuroticism / Stabilitas Emosi) - 10 Soal
    // -------------------------------------------------------------
    {
      test_type_id: 2,
      dimension_id: 9,
      question_code: 'BF_N_01',
      question_text: 'Saya sering merasa cemas atau khawatir berlebihan terhadap hal-hal yang belum tentu terjadi.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 81,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 9,
      question_code: 'BF_N_02',
      question_text: 'Saya mampu tetap tenang, berpikir jernih, dan tidak panik ketika menghadapi situasi krisis darurat.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 82,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 9,
      question_code: 'BF_N_03',
      question_text: 'Suasana hati (mood) saya terkadang mudah berubah-ubah secara drastis dalam satu hari.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 83,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 9,
      question_code: 'BF_N_04',
      question_text: 'Saya merasa cepat pulih dan bangkit kembali setelah mengalami kegagalan atau teguran kerja.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 84,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 9,
      question_code: 'BF_N_05',
      question_text: 'Saya sering merasa tertekan (stress) ketika beban kerja menumpuk secara bersamaan.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 85,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 9,
      question_code: 'BF_N_06',
      question_text: 'Saya jarang merasa minder atau meragukan kemampuan diri sendiri dalam menyelesaikan tugas.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 86,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 9,
      question_code: 'BF_N_07',
      question_text: 'Saya mudah merasa tersinggung atau terganggu oleh komentar kritis dari orang lain.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 87,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 9,
      question_code: 'BF_N_08',
      question_text: 'Saya memiliki kestabilan emosi yang baik dan jarang meluapkan kemarahan secara impulsif.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 88,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 9,
      question_code: 'BF_N_09',
      question_text: 'Pikiran negatif atau rasa bersalah terkadang menghantui saya dalam waktu yang cukup lama.',
      question_type: 'likert_5',
      scoring_direction: 'normal',
      order_number: 89,
      is_active: true
    },
    {
      test_type_id: 2,
      dimension_id: 9,
      question_code: 'BF_N_10',
      question_text: 'Saya merasa aman, optimis, dan percaya diri dalam menyongsong masa depan karir saya.',
      question_type: 'likert_5',
      scoring_direction: 'reverse',
      order_number: 90,
      is_active: true
    }
  ];

  // Insert questions with timestamps
  await knex('psychotest_questions').insert(
    questions.map((q, idx) => ({
      id: idx + 1,
      ...q,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }))
  );

  // 5. Insert psychotest_type_profiles
  // A. 16 Profil MBTI
  const mbtiProfiles = [
    {
      test_type_id: 1,
      profile_code: 'INTJ',
      profile_label: 'The Architect / Mastermind (Ahli Strategi Visioner)',
      description_text: 'Pribadi mandiri, analitis, dan memiliki pandangan strategis jangka panjang. Mampu memetakan pola kompleks dan merumuskan sistem kerja yang efisien serta berorientasi pada inovasi struktural.',
      strengths_text: 'Berpikir strategis, mandiri, berstandar tinggi, rasional, dan solutif terhadap masalah rumit.',
      weaknesses_text: 'Bisa tampak kaku, kurang sabar terhadap inefisiensi, dan cenderung mengabaikan dinamika emosional.',
      hrd_recommendation_text: 'Sangat direkomendasikan untuk posisi perencana kurikulum, manajemen strategis, sistem informasi, atau penjaminan mutu. Berikan otonomi kerja dan ruang untuk merancang sistem baru.',
      suitable_roles: 'Kepala Bidang Kurikulum, Quality Assurance, System Analyst, Litbang Sekolah'
    },
    {
      test_type_id: 1,
      profile_code: 'INTP',
      profile_label: 'The Thinker / Logician (Analis Logika & Konseptor)',
      description_text: 'Pemikir mendalam yang mencintai eksplorasi teori, logika ilmiah, dan pemecahan teka-teki intelektual. Selalu terdorong untuk membongkar dan memahami cara kerja suatu fenomena dari akar permasalahannya.',
      strengths_text: 'Objektif, orisinal, cerdas dalam analisa, berwawasan luas, dan berpikiran terbuka.',
      weaknesses_text: 'Mudah bosan pada eksekusi teknis rutin, terkadang overthinking, dan kurang fokus pada tenggat praktis.',
      hrd_recommendation_text: 'Cocok untuk peran riset, pengembangan media edukasi sains/teknologi, atau konsultan konseptual. Perlu dipasangkan dengan eksekutor terstruktur agar idenya terwujud.',
      suitable_roles: 'Guru Sains/Matematika Lanjutan, Peneliti Pendidikan, Pengembang Kurikulum IT'
    },
    {
      test_type_id: 1,
      profile_code: 'ENTJ',
      profile_label: 'The Commander (Pemimpin Tegas & Eksekutor Strategis)',
      description_text: 'Pemimpin alami yang berani, percaya diri, dan berorientasi pada target tinggi. Mampu mengorganisir sumber daya manusia dan material secara efektif untuk mencapai tujuan besar organisasi.',
      strengths_text: 'Tegas, karismatik, berorientasi hasil, memiliki dorongan kuat untuk maju, dan efisien.',
      weaknesses_text: 'Bisa terlihat dominan atau tidak toleran terhadap keraguan rekan, serta cenderung menuntut kesempurnaan.',
      hrd_recommendation_text: 'Sangat tepat untuk posisi struktural manajerial, kepala unit, atau pimpinan proyek besar. Diberdayakan dalam restrukturisasi atau percepatan target lembaga.',
      suitable_roles: 'Kepala Sekolah, Direktur Operasional, Koordinator Proyek Strategis'
    },
    {
      test_type_id: 1,
      profile_code: 'ENTP',
      profile_label: 'The Debater / Visionary (Inovator Cekatan & Debat Konstruktif)',
      description_text: 'Pribadi yang lincah, inovatif, dan senang mengeksplorasi perdebatan ide konstruktif. Cepat melihat peluang baru dan mampu mematahkan kebuntuan tradisi lama dengan solusi segar.',
      strengths_text: 'Cepat berpikir, inovatif, komunikator yang memikat, adaptif, dan berjiwa pembaru.',
      weaknesses_text: 'Kurang tekun dalam pemeliharaan rutin pasca peluncuran ide, dan bisa memicu resistensi jika terlalu kritis.',
      hrd_recommendation_text: 'Sangat cocok untuk divisi inovasi, kehumasan, inkubator prestasi santri, atau pelatih debat/karya ilmiah. Libatkan dalam forum perumusan ide-ide terobosan.',
      suitable_roles: 'Kepala Humas & Kemitraan, Pembina Prestasi Akademik/Olimpiade, Inisiator Program'
    },
    {
      test_type_id: 1,
      profile_code: 'INFJ',
      profile_label: 'The Advocate / Counselor (Pemandu Nurani & Visioner Empatik)',
      description_text: 'Sosok berintegritas tinggi dengan visi idealis yang mendalam untuk membantu sesama. Berdedikasi membimbing orang lain mencapai potensi spiritual dan intelektual terbaik mereka dengan kehangatan bijaksana.',
      strengths_text: 'Empatik, berwawasan mendalam, berprinsip kokoh, menginspirasi, dan penuh dedikasi.',
      weaknesses_text: 'Rentan mengalami burnout emosional, terlalu perfeksionis terhadap nilai ideal, dan cenderung menutup diri saat stres.',
      hrd_recommendation_text: 'Sangat ideal untuk bimbingan konseling (BK), pengasuhan asrama (musyrif), pengembangan karakter santri, dan pembinaan rohani guru/pegawai.',
      suitable_roles: 'Guru BK/Psikolog Sekolah, Kepala Pengasuhan Karakter, Pembina Rohani/Tahfidz'
    },
    {
      test_type_id: 1,
      profile_code: 'INFP',
      profile_label: 'The Mediator / Idealist (Penjaga Harmoni & Nilai Kebaikan)',
      description_text: 'Pribadi yang lembut, setia pada nilai moral, dan memiliki empati mendalam. Menghargai keaslian diri (autentisitas) dan bersemangat membina hubungan interpersonal yang bermakna dan suportif.',
      strengths_text: 'Penuh belas kasih, kreatif, loyal pada nilai kebaikan, berpikiran terbuka, dan pendengar yang tulus.',
      weaknesses_text: 'Terlalu sensitif terhadap kritik, sulit bersikap tegas saat menghadapi konflik, dan mudah berkecil hati.',
      hrd_recommendation_text: 'Cocok untuk pembimbingan personal, pengajar bahasa/sastra, pendamping santri berkebutuhan khusus, atau divisi CSR/sosial lembaga.',
      suitable_roles: 'Guru Bahasa & Seni, Staf Bimbingan Santri, Konselor Asrama, Pegiat Sosial Yayasan'
    },
    {
      test_type_id: 1,
      profile_code: 'ENFJ',
      profile_label: 'The Protagonist (Pemimpin Pendidik & Inspirator Tim)',
      description_text: 'Komunikator ulung yang karismatik dan berorientasi membimbing kelompok menuju kemajuan bersama. Mahir menyatukan perbedaan, membaca potensi orang lain, dan menciptakan lingkungan belajar yang hangat.',
      strengths_text: 'Karismatik, suportif, komunikatif, mampu memotivasi tim, dan berorientasi pemberdayaan manusia.',
      weaknesses_text: 'Terkadang terlalu memikirkan persepsi orang lain, mudah terbawa perasaan, dan sulit berkata tidak.',
      hrd_recommendation_text: 'Sangat direkomendasikan sebagai Wakil Kepala Sekolah Bidang Kesiswaan, ketua panitia kegiatan akbar, atau fasilitator pelatihan guru.',
      suitable_roles: 'Wakil Kepala Sekolah Kesiswaan, Koordinator Ekstrakurikuler, Trainer Pendidik'
    },
    {
      test_type_id: 1,
      profile_code: 'ENFP',
      profile_label: 'The Campaigner (Pemberi Semangat & Jiwa Kreatif)',
      description_text: 'Sosok antusias, enerjik, dan penuh daya imajinasi sosial. Gemar menjalin koneksi dengan berbagai kalangan dan menyulut semangat optimisme serta kreativitas di manapun berada.',
      strengths_text: 'Sangat ramah, kreatif, pandai mencairkan suasana, bersemangat tinggi, dan penuh inisiatif segar.',
      weaknesses_text: 'Kurang teratur pada rincian administratif, mudah bosan pada rutinitas kaku, dan sulit fokus pada satu proyek panjang.',
      hrd_recommendation_text: 'Cocok untuk bidang kehumasan, media kreatif, event organizer sekolah, serta guru jenjang muda yang memerlukan interaktivitas tinggi.',
      suitable_roles: 'Guru Kreatif/Interaktif, Staf Publikasi & Media Sosial, Humas Lembaga'
    },
    {
      test_type_id: 1,
      profile_code: 'ISTJ',
      profile_label: 'The Inspector / Logistician (Pilar Tertib & Tanggung Jawab Nyata)',
      description_text: 'Pribadi yang sangat teratur, disiplin, menjunjung tinggi integritas fakta, dan taat asas. Menjadi tulang punggung operasional yang memastikan seluruh SOP dan kepatuhan hukum berjalan sempurna.',
      strengths_text: 'Sangat bertanggung jawab, teliti, setia pada aturan, tertib administrasi, dan beretika kerja kuat.',
      weaknesses_text: 'Cenderung resisten terhadap perubahan mendadak, kaku dalam prosedur, dan kurang ekspresif secara emosional.',
      hrd_recommendation_text: 'Sangat direkomendasikan untuk bagian keuangan, administrasi tata usaha, kepatuhan legal, dan logistik sarpras.',
      suitable_roles: 'Kepala Tata Usaha, Staf Keuangan/Akuntansi, Auditor Internal, Pengelola Aset'
    },
    {
      test_type_id: 1,
      profile_code: 'ISFJ',
      profile_label: 'The Defender / Protector (Pelayan Tulus & Pengasuh Teliti)',
      description_text: 'Pribadi yang teliti, sabar, berdedikasi tinggi, dan selalu siap mengulurkan tangan melayani sesama. Menjaga ketertiban lingkungan dan memastikan kenyamanan serta kebutuhan anggota tim terpenuhi.',
      strengths_text: 'Sangat suportif, teliti, setia, memiliki daya ingat tajam pada detail orang, dan dapat diandalkan.',
      weaknesses_text: 'Cenderung memendam beban sendiri, enggan meminta bantuan, dan sulit menolak permintaan berlebih.',
      hrd_recommendation_text: 'Sangat cocok untuk layanan kepegawaian, pengasuhan kesehatan (UKS), sekretariat pimpinan, atau guru wali kelas jenjang dasar.',
      suitable_roles: 'Wali Kelas, Staf Layanan SDM, Sekretaris Pimpinan, Pengelola Asrama/UKS'
    },
    {
      test_type_id: 1,
      profile_code: 'ESTJ',
      profile_label: 'The Executive (Pengatur Lapangan & Penegak Disiplin)',
      description_text: 'Pengorganisir ulung yang praktis, realistis, dan berorientasi ketegasan hasil. Sangat cakap dalam mengawal jalannya proyek, menegakkan tata tertib, dan memastikan target operasional tercapai tepat waktu.',
      strengths_text: 'Penyelenggara yang efektif, tegas, berpendirian kuat, disiplin tinggi, dan pekerja keras.',
      weaknesses_text: 'Bisa terdengar menuntut, kurang fleksibel pada pendekatan non-konvensional, dan kurang peka pada perasaan orang.',
      hrd_recommendation_text: 'Tepat untuk kepala kedisiplinan santri, manajer operasional sarana prasarana, atau koordinator ujian dan kegiatan resmi yayasan.',
      suitable_roles: 'Kepala Penegak Disiplin (Kamtib), Manajer Operasional, Koordinator Ujian Sekolah'
    },
    {
      test_type_id: 1,
      profile_code: 'ESFJ',
      profile_label: 'The Provider / Consul (Pembangun Komunitas & Keramahan Sosial)',
      description_text: 'Pribadi yang hangat, peka terhadap harmoni kelompok, dan mahir merangkul orang lain. Selalu aktif memastikan kebutuhan bersama terfasilitasi dan acara kebersamaan berlangsung meriah.',
      strengths_text: 'Hangat, loyal, pandai bersosialisasi, terorganisir dalam kegiatan sosial, dan berorientasi pelayanan.',
      weaknesses_text: 'Rentan cemas terhadap kritik sosial, mudah terluka jika kebaikannya tidak dihargai, dan enggan menghadapi konflik langsung.',
      hrd_recommendation_text: 'Sangat cocok untuk relasi orang tua santri (komite sekolah), layanan penerimaan santri baru (PSB), dan koordinator kesejahteraan pegawai.',
      suitable_roles: 'Panitia PSB, Staf Hubungan Masyarakat & Orang Tua, Koordinator Acara Yayasan'
    },
    {
      test_type_id: 1,
      profile_code: 'ISTP',
      profile_label: 'The Craftsman / Virtuoso (Pemecah Masalah Teknis & Taktis)',
      description_text: 'Pribadi yang tenang, observatif, pragmatis, dan memiliki ketangkasan tinggi dalam mengatasi masalah teknis seketika. Mampu berpikir jernih di bawah tekanan tanpa terhambat oleh beban emosional.',
      strengths_text: 'Tenang dalam krisis, lincah mengatasi kerusakan teknis, efisien, logis, dan mandiri.',
      weaknesses_text: 'Cenderung menyendiri, kurang berminat pada komitmen formal bertele-tele, dan sulit diprediksi.',
      hrd_recommendation_text: 'Sangat cocok untuk divisi IT infrastruktur, teknisi sarpras, instruktur robotik/praktikum, atau pengawas lapangan.',
      suitable_roles: 'Staf IT/Jaringan, Teknisi Laboratorium, Pemeliharaan Sarpras, Instruktur Keterampilan'
    },
    {
      test_type_id: 1,
      profile_code: 'ISFP',
      profile_label: 'The Artist / Adventurer (Pencipta Estetika & Kehangatan Personal)',
      description_text: 'Pribadi yang tenang, ramah, bersahaja, dan memiliki kepekaan estetika serta kepekaan rasa yang halus. Senang bekerja dalam kebebasan berekspresi dan menikmati momen hidup tanpa pretensi.',
      strengths_text: 'Sensitif terhadap keindahan, rendah hati, fleksibel, hangat, dan berorientasi tindakan nyata.',
      weaknesses_text: 'Mudah merasa tertekan oleh persaingan agresif, enggan merencanakan jangka panjang, dan kurang percaya diri tampil.',
      hrd_recommendation_text: 'Cocok untuk desainer grafis materi pembelajaran, pembina seni budaya/kaligrafi, penata lingkungan sekolah, atau konselor asrama.',
      suitable_roles: 'Guru Seni/Kaligrafi, Desainer Media Sekolah, Pembina Kreativitas Santri'
    },
    {
      test_type_id: 1,
      profile_code: 'ESTP',
      profile_label: 'The Dynamo / Entrepreneur (Aksi Cepat & Eksekutor Lapangan)',
      description_text: 'Pribadi yang energik, spontan, menyukai aksi langsung, dan piawai memanfaatkan momentum di lapangan. Sigap bertindak menghadapi dinamika darurat tanpa membuang waktu pada perdebatan teori.',
      strengths_text: 'Cepat bertindak, berani mengambil risiko terkalkulasi, persuasif, gesit, dan observatif.',
      weaknesses_text: 'Kurang sabar pada analisa panjang, cenderung melompati aturan formal jika dianggap memperlambat aksi.',
      hrd_recommendation_text: 'Cocok untuk koordinator lapangan, pelatih olahraga/bela diri, penanganan logistik darurat, dan penggerak kegiatan luar ruang (outbound).',
      suitable_roles: 'Guru PJOK/Olahraga, Koordinator Lapangan, Pembina Pramuka/PMR'
    },
    {
      test_type_id: 1,
      profile_code: 'ESFP',
      profile_label: 'The Entertainer (Pencair Suasana & Pembawa Keceriaan)',
      description_text: 'Sosok periang, spontan, ekspresif, dan penuh energi positif yang menular. Mampu mengubah suasana kaku menjadi hidup dan membuat proses belajar atau bekerja terasa menyenangkan.',
      strengths_text: 'Sangat antusias, pandai mencairkan suasana, menyenangkan, dermawan, dan cepat akrab.',
      weaknesses_text: 'Kurang teliti pada perencanaan keuangan/jadwal ketat, mudah teralihkan dari tugas fokus mendalam.',
      hrd_recommendation_text: 'Sangat pas untuk MC acara resmi, pembina kegiatan santri usia dini, humas lapangan, dan instruktur outbound/ice-breaking.',
      suitable_roles: 'Pendidik PAUD/SD Awal, Pembina Aktivitas Santri, MC & Fasilitator Gathering'
    }
  ];

  // B. 15 Profil Big Five (5 Trait x 3 Level) + 1 SUMMARY
  const bigFiveProfiles = [
    // Openness (O)
    {
      test_type_id: 2,
      profile_code: 'O_tinggi',
      profile_label: 'Openness Tinggi (Inovatif & Imajinatif)',
      description_text: 'Memiliki dorongan rasa ingin tahu intelektual yang kuat, kaya ide kreatif, dan sangat antusias terhadap pembaharuan kurikulum dan metode modern.',
      strengths_text: 'Sangat kreatif, berpikiran terbuka, apresiatif terhadap ilmu baru, adaptif terhadap perubahan.',
      weaknesses_text: 'Bisa terlalu sering mengubah pola kerja dan kurang sabar dengan rutinitas administrasi baku.',
      hrd_recommendation_text: 'Tempatkan di posisi perencanaan strategis, inovasi metode ajar, atau litbang program sekolah.',
      suitable_roles: 'Litbang, Perancang Kurikulum, Pengembang Media Edukasi'
    },
    {
      test_type_id: 2,
      profile_code: 'O_sedang',
      profile_label: 'Openness Sedang (Seimbang & Adaptif Terukur)',
      description_text: 'Mampu menyeimbangkan apresiasi terhadap ide baru dengan kepatuhan pada nilai tradisi dan kepraktisan metode yang sudah teruji.',
      strengths_text: 'Realistis, dapat menerima inovasi yang masuk akal, fleksibel tanpa kehilangan fokus operasional.',
      weaknesses_text: 'Memerlukan contoh bukti nyata sebelum menerapkan perubahan secara penuh.',
      hrd_recommendation_text: 'Dapat ditempatkan pada mayoritas posisi pengajaran dan koordinasi fungsional umum.',
      suitable_roles: 'Guru Bidang Studi, Wali Kelas, Staf Tata Usaha'
    },
    {
      test_type_id: 2,
      profile_code: 'O_rendah',
      profile_label: 'Openness Rendah (Konvensional & Praktis Pijak Bumi)',
      description_text: 'Lebih menyukai instruksi kerja pasti, fakta konkret, dan menjaga stabilitas pola kerja konvensional yang terbukti aman.',
      strengths_text: 'Pijak bumi, setia pada pakem standar, konsisten menjaga kestabilan rutinitas.',
      weaknesses_text: 'Rentan resisten terhadap perubahan sistem digital baru atau metode yang belum terbiasa.',
      hrd_recommendation_text: 'Sangat cocok untuk pekerjaan operasional rutin, pemeliharaan arsip fisik, atau kepatuhan baku.',
      suitable_roles: 'Arsiparis, Operator Data Rutin, Petugas Logistik'
    },

    // Conscientiousness (C)
    {
      test_type_id: 2,
      profile_code: 'C_tinggi',
      profile_label: 'Conscientiousness Tinggi (Disiplin Tinggi & Teliti)',
      description_text: 'Memiliki etos kerja kuat, ketelitian mendalam, komitmen tinggi pada tenggat waktu, dan dorongan berprestasi yang tinggi.',
      strengths_text: 'Sangat dapat diandalkan, terorganisir rapi, akurat, tepat waktu, dan berdedikasi tinggi.',
      weaknesses_text: 'Bisa cenderung kaku atau perfeksionis berlebih yang memperlambat pendelegasian tugas.',
      hrd_recommendation_text: 'Prioritas utama untuk posisi bendahara, akuntansi, pengelolaan nilai rapor, dan auditor internal.',
      suitable_roles: 'Staf Keuangan, Pengelola Nilai Rapor, Verifikator Berkas, Koordinator Ujian'
    },
    {
      test_type_id: 2,
      profile_code: 'C_sedang',
      profile_label: 'Conscientiousness Sedang (Fleksibel & Cukup Teratur)',
      description_text: 'Mampu menuntaskan tanggung jawab kerja secara wajar dengan keluwesan menyesuaikan ritme beban harian.',
      strengths_text: 'Cukup tertib, santai menghadapi kendala kerja, tidak mudah stres oleh target ketat.',
      weaknesses_text: 'Perlu pengawasan berkala agar rincian detail tidak terlewat pada proyek berskala besar.',
      hrd_recommendation_text: 'Cocok untuk posisi operasional umum dan guru kelas dengan pendampingan jadwal.',
      suitable_roles: 'Guru Pendamping, Pengasuh Asrama, Pelaksana Teknis'
    },
    {
      test_type_id: 2,
      profile_code: 'C_rendah',
      profile_label: 'Conscientiousness Rendah (Spontan & Kurang Teratur)',
      description_text: 'Cenderung bertindak spontan, kurang memperhatikan ketelitian detail berkas, dan mudah menunda penyelesaian tugas administratif.',
      strengths_text: 'Fleksibel dan tidak terbebani oleh prosedur yang kaku.',
      weaknesses_text: 'Sering melewatkan tenggat waktu atau melakukan kelalaian administrasi.',
      hrd_recommendation_text: 'Hindarkan dari tanggung jawab keuangan dan pembukuan resmi. Berikan checklist harian yang jelas.',
      suitable_roles: 'Pekerjaan Lapangan Non-Administratif'
    },

    // Extraversion (E)
    {
      test_type_id: 2,
      profile_code: 'E_tinggi',
      profile_label: 'Extraversion Tinggi (Sosial, Energik & Ekspresif)',
      description_text: 'Penuh energi sosial, ramah, percaya diri berbicara di hadapan publik, dan mahir membangun jejaring relasi luas.',
      strengths_text: 'Komunikatif, antusias, mudah mencairkan suasana, dan persuasif.',
      weaknesses_text: 'Bisa mendominasi forum dan kurang sabar saat harus bekerja sendirian dalam keheningan.',
      hrd_recommendation_text: 'Sangat cocok untuk perwakilan humas sekolah, promosi penerimaan santri, dan pembina kegiatan massal.',
      suitable_roles: 'Humas, Panitia PSB, Pembina Ekstrakurikuler, MC'
    },
    {
      test_type_id: 2,
      profile_code: 'E_sedang',
      profile_label: 'Extraversion Sedang (Ambivert Seimbang)',
      description_text: 'Luwes berinteraksi dalam forum sosial namun tetap menikmati waktu hening untuk fokus tugas personal.',
      strengths_text: 'Seimbang, mampu membaur saat dibutuhkan dan fokus mandiri saat diperlukan.',
      weaknesses_text: 'Tidak ada kelemahan dominan yang mencolok.',
      hrd_recommendation_text: 'Cocok untuk hampir semua posisi guru kelas dan tenaga kependidikan umum.',
      suitable_roles: 'Guru Bidang Studi, Wali Kelas, Staf Layanan'
    },
    {
      test_type_id: 2,
      profile_code: 'E_rendah',
      profile_label: 'Extraversion Rendah (Tenang, Mandiri & Introvert)',
      description_text: 'Sosok tenang, hemat bicara, lebih nyaman bekerja mandiri di balik layar, dan mendalam dalam pemikiran.',
      strengths_text: 'Fokus mendalam, pendengar yang baik, tidak terdistraksi hiruk-pikuk sosial.',
      weaknesses_text: 'Canggung jika mendadak diminta tampil di panggung atau memimpin forum massa.',
      hrd_recommendation_text: 'Tempatkan di posisi riset data, administrasi perpustakaan, IT, atau pengelolaan laboratorium.',
      suitable_roles: 'Pustakawan, Teknisi Lab, Operator IT, Staf Pengolah Data'
    },

    // Agreeableness (A)
    {
      test_type_id: 2,
      profile_code: 'A_tinggi',
      profile_label: 'Agreeableness Tinggi (Empatik, Kooperatif & Lembut)',
      description_text: 'Memiliki kepekaan rasa yang tulus, mudah menaruh empati, mengutamakan kebersamaan, dan menjaga keharmonisan tim.',
      strengths_text: 'Sangat kooperatif, disukai rekan kerja, pengasuh yang penyayang, dan pemaaf.',
      weaknesses_text: 'Sulit menolak permintaan rekan yang berlebihan dan enggan menegur kesalahan demi menghindari konflik.',
      hrd_recommendation_text: 'Sangat ideal untuk bimbingan konseling santri, layanan wali kelas, dan pembinaan pengasuhan asrama.',
      suitable_roles: 'Guru BK, Pembina Asrama, Wali Kelas, Customer Care PSB'
    },
    {
      test_type_id: 2,
      profile_code: 'A_sedang',
      profile_label: 'Agreeableness Sedang (Kooperatif & Rasional Terukur)',
      description_text: 'Menjaga hubungan baik dengan rekan namun tetap mampu bersikap tegas dan kritis jika prinsip dilanggar.',
      strengths_text: 'Seimbang antara keramahan sosial dan ketegasan bersikap objektif.',
      weaknesses_text: 'Perlu menjaga konsistensi pendekatan dalam situasi tensi tinggi.',
      hrd_recommendation_text: 'Sangat baik untuk posisi ketua tim kerja dan pengajar reguler.',
      suitable_roles: 'Kepala Unit Kerja, Guru, Staf Operasional'
    },
    {
      test_type_id: 2,
      profile_code: 'A_rendah',
      profile_label: 'Agreeableness Rendah (Kritis, Kompetitif & Keras Prinsip)',
      description_text: 'Cenderung skeptis, menuntut fakta, tidak segan berkonfrontasi langsung, dan sangat fokus pada pembuktian kompetensi.',
      strengths_text: 'Kritis menolak kesalahan, berani mengambil keputusan tidak populer, berpendirian teguh.',
      weaknesses_text: 'Bisa memicu friksi dalam kelompok dan dinilai kurang ramah oleh rekan.',
      hrd_recommendation_text: 'Gunakan dalam fungsi penegakan kepatuhan aturan, audit internal, atau negosiasi vendor.',
      suitable_roles: 'Auditor Disiplin, Pengawas Kepatuhan, Negosiator Pengadaan'
    },

    // Neuroticism (N)
    {
      test_type_id: 2,
      profile_code: 'N_tinggi',
      profile_label: 'Neuroticism Tinggi (Sensitif & Rentan Tekanan Stres)',
      description_text: 'Mudah merasa cemas terhadap potensi kegagalan, suasana hati fluktuatif, dan membutuhkan lingkungan kerja yang aman dan suportif.',
      strengths_text: 'Peka terhadap potensi bahaya atau kesalahan kecil yang luput dari orang lain.',
      weaknesses_text: 'Mudah panik saat krisis, rentan mengalami demotivasi jika mendapat teguran keras.',
      hrd_recommendation_text: 'Berikan pendampingan mentor yang suportif dan hindarkan dari posisi penuh tekanan deadline mendadak.',
      suitable_roles: 'Posisi dengan ritme stabil, minim konflik, dan beban kerja terprediksi'
    },
    {
      test_type_id: 2,
      profile_code: 'N_sedang',
      profile_label: 'Neuroticism Sedang (Tangguh Moderat)',
      description_text: 'Mampu merasakan tekanan secara wajar namun memiliki mekanisme pemulihan diri yang memadai dalam tempo singkat.',
      strengths_text: 'Cukup stabil, memiliki kendali emosi yang wajar dalam dinamika sekolah harian.',
      weaknesses_text: 'Perlu istirahat berkala saat menangani periode puncak beban kerja.',
      hrd_recommendation_text: 'Memenuhi syarat stabilitas emosional untuk posisi pengajaran dan staf reguler.',
      suitable_roles: 'Guru, Staf Administrasi, Pengasuh Asrama'
    },
    {
      test_type_id: 2,
      profile_code: 'N_rendah',
      profile_label: 'Neuroticism Rendah (Sangat Tenang & Stabil Secara Emosi)',
      description_text: 'Memiliki ketenangan batin yang luar biasa, tidak mudah panik di bawah tekanan berat, dan stabil memimpin di masa krisis.',
      strengths_text: 'Sangat tangguh (resilient), percaya diri tinggi, tenang di masa krisis, dan objektif.',
      weaknesses_text: 'Terkadang tampak kurang merasakan urgensi atau terkesan santai bagi orang lain.',
      hrd_recommendation_text: 'Sangat direkomendasikan untuk pimpinan struktural, penanggung jawab keamanan/kedisiplinan, dan pengambil keputusan krisis.',
      suitable_roles: 'Pimpinan Sekolah, Penanggung Jawab Krisis, Kepala Asrama, Manajer Operasional'
    },

    // SUMMARY Profile untuk Big Five
    {
      test_type_id: 2,
      profile_code: 'SUMMARY',
      profile_label: 'Rangkuman Komprehensif Profil Big Five (OCEAN)',
      description_text: 'Rangkuman pemetaan menyeluruh dari kelima trait kepribadian untuk melihat sinergi antara keterbukaan berpikir, etos disiplin, gaya komunikasi sosial, keramahan kerja sama, dan stabilitas emosional kandidat/pegawai.',
      strengths_text: 'Melihat keseimbangan holistik antara kompetensi intrapersonal dan interpersonal.',
      weaknesses_text: 'Evaluasi harus dipadukan dengan observasi wawancara dan rekam jejak nyata.',
      hrd_recommendation_text: 'Gunakan matriks OCEAN ini sebagai acuan penempatan formasi jabatan, desain pengembangan karir, dan bimbingan kepemimpinan yang tepat sasaran.',
      suitable_roles: 'Seluruh Formasi Guru & Tenaga Kependidikan IBS'
    }
  ];

  // Insert all profiles
  const allProfiles = [...mbtiProfiles, ...bigFiveProfiles];
  await knex('psychotest_type_profiles').insert(
    allProfiles.map((p, idx) => ({
      id: idx + 1,
      ...p,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }))
  );
};
