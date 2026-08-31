const db = require('../src/config/db/akademik');

(async () => {
  // 1. Bersihkan timetable_lessons lama untuk academic_year_id = 2
  await db('timetable_lessons').where({ academic_year_id: 2 }).del();
  console.log('Cleared old timetable_lessons for academic_year_id = 2');

  // Mapping ID Guru di DB
  const T = {
    AJI_MUSTOPA: 1,
    PUTRI_MAHARDHIKA: 2,
    AJI_AMIRUDIN: 4,
    ANDRIANSYAH: 7,
    ASRUL_HADI: 9,
    AZZARIA: 10,
    LAILA_KAMILIA: 18,
    MOH_GHOJALI: 23,
    NURUDZ_SALMI: 27,
    ROBBY_SETIAWAN: 30,
    HERI_SHOBIKAN: 32,
    SITI_HAZAMI: 33,
    SITI_MARDHIYAH: 34,
    SITI_NOVANIA: 35
  };

  // Mapping ID Rombel
  const C = {
    C7PA: 10,  // 7-A / 7 PA
    C7PI: 11,  // 7-B / 7 PI
    C8PA: 7,   // 8-A / 8 PA
    C8PI: 8,   // 8-B / 8 PI
    C9PAPI: 13,// 9 PA&PI
    C10PA: 12, // 10-A / 10 PA
    C11PA: 9   // 11-A / 11 PA
  };

  // Subject ID SMP (Unit 1) & SMA (Unit 2)
  const S_SMP = {
    ARABIC: 16, ENGLISH: 15, INDO: 8, IPA: 10, IPS: 11, MTK: 9, PAI: 17, PKN: 7, PJOK: 13,
    BAR_PIL: 94, BING_PIL: 95
  };
  const S_SMA = {
    ARABIC: 85, ENGLISH: 84, INDO: 77, IPA: 79, IPS: 80, MTK: 78, PAI: 86, PKN: 76, PJOK: 82,
    BAR_PIL: 96, BING_PIL: 93
  };

  const lessonsToInsert = [
    // === 7 PA (C7PA) ===
    { unit: 1, sub: S_SMP.ARABIC, name: 'Bahasa Arab (7 PA)', jp: 2, dur: 2, classes: [C.C7PA], teachers: [T.NURUDZ_SALMI] },
    { unit: 1, sub: S_SMP.ENGLISH, name: 'Bahasa Inggris (7 PA)', jp: 2, dur: 2, classes: [C.C7PA], teachers: [T.ASRUL_HADI] },
    { unit: 1, sub: S_SMP.INDO, name: 'Bahasa Indonesia (7 PA)', jp: 1, dur: 1, classes: [C.C7PA], teachers: [T.SITI_NOVANIA] },
    { unit: 1, sub: S_SMP.IPA, name: 'Ilmu Pengetahuan Alam (IPA) (7 PA)', jp: 2, dur: 2, classes: [C.C7PA], teachers: [T.ROBBY_SETIAWAN] },
    { unit: 1, sub: S_SMP.IPS, name: 'Ilmu Pengetahuan Sosial (IPS) (7 PA)', jp: 1, dur: 1, classes: [C.C7PA], teachers: [T.AJI_AMIRUDIN] },
    { unit: 1, sub: S_SMP.MTK, name: 'Matematika (7 PA)', jp: 2, dur: 2, classes: [C.C7PA], teachers: [T.SITI_MARDHIYAH] },
    { unit: 1, sub: S_SMP.PAI, name: 'Pendidikan Agama Islam (PAI) (7 PA)', jp: 2, dur: 2, classes: [C.C7PA], teachers: [T.MOH_GHOJALI] },
    { unit: 1, sub: S_SMP.PKN, name: 'Pancasila (7 PA)', jp: 1, dur: 1, classes: [C.C7PA], teachers: [T.PUTRI_MAHARDHIKA] },
    { unit: 1, sub: S_SMP.PJOK, name: 'Pendidikan Jasmani (PJOK) (7 PA)', jp: 1, dur: 1, classes: [C.C7PA], teachers: [T.ANDRIANSYAH] },

    // === 7 PI (C7PI) ===
    { unit: 1, sub: S_SMP.ARABIC, name: 'Bahasa Arab (7 PI)', jp: 2, dur: 2, classes: [C.C7PI], teachers: [T.LAILA_KAMILIA] },
    { unit: 1, sub: S_SMP.ENGLISH, name: 'Bahasa Inggris (7 PI)', jp: 2, dur: 2, classes: [C.C7PI], teachers: [T.SITI_HAZAMI] },
    { unit: 1, sub: S_SMP.INDO, name: 'Bahasa Indonesia (7 PI)', jp: 1, dur: 1, classes: [C.C7PI], teachers: [T.SITI_NOVANIA] },
    { unit: 1, sub: S_SMP.IPA, name: 'Ilmu Pengetahuan Alam (IPA) (7 PI)', jp: 2, dur: 2, classes: [C.C7PI], teachers: [T.ROBBY_SETIAWAN] },
    { unit: 1, sub: S_SMP.IPS, name: 'Ilmu Pengetahuan Sosial (IPS) (7 PI)', jp: 1, dur: 1, classes: [C.C7PI], teachers: [T.AZZARIA] },
    { unit: 1, sub: S_SMP.MTK, name: 'Matematika (7 PI)', jp: 2, dur: 2, classes: [C.C7PI], teachers: [T.SITI_MARDHIYAH] },
    { unit: 1, sub: S_SMP.PAI, name: 'Pendidikan Agama Islam (PAI) (7 PI)', jp: 2, dur: 2, classes: [C.C7PI], teachers: [T.AZZARIA] },
    { unit: 1, sub: S_SMP.PKN, name: 'Pancasila (7 PI)', jp: 1, dur: 1, classes: [C.C7PI], teachers: [T.PUTRI_MAHARDHIKA] },
    { unit: 1, sub: S_SMP.PJOK, name: 'Pendidikan Jasmani (PJOK) (7 PI)', jp: 1, dur: 1, classes: [C.C7PI], teachers: [T.AZZARIA] },

    // === 8 PA (C8PA) ===
    { unit: 1, sub: S_SMP.ARABIC, name: 'Bahasa Arab (8 PA)', jp: 2, dur: 2, classes: [C.C8PA], teachers: [T.NURUDZ_SALMI] },
    { unit: 1, sub: S_SMP.ENGLISH, name: 'Bahasa Inggris (8 PA)', jp: 2, dur: 2, classes: [C.C8PA], teachers: [T.ASRUL_HADI] },
    { unit: 1, sub: S_SMP.INDO, name: 'Bahasa Indonesia (8 PA)', jp: 1, dur: 1, classes: [C.C8PA], teachers: [T.SITI_NOVANIA] },
    { unit: 1, sub: S_SMP.IPA, name: 'Ilmu Pengetahuan Alam (IPA) (8 PA)', jp: 2, dur: 2, classes: [C.C8PA], teachers: [T.ROBBY_SETIAWAN] },
    { unit: 1, sub: S_SMP.IPS, name: 'Ilmu Pengetahuan Sosial (IPS) (8 PA)', jp: 1, dur: 1, classes: [C.C8PA], teachers: [T.AJI_AMIRUDIN] },
    { unit: 1, sub: S_SMP.MTK, name: 'Matematika (8 PA)', jp: 2, dur: 2, classes: [C.C8PA], teachers: [T.SITI_MARDHIYAH] },
    { unit: 1, sub: S_SMP.PAI, name: 'Pendidikan Agama Islam (PAI) (8 PA)', jp: 2, dur: 2, classes: [C.C8PA], teachers: [T.MOH_GHOJALI] },
    { unit: 1, sub: S_SMP.PKN, name: 'Pancasila (8 PA)', jp: 1, dur: 1, classes: [C.C8PA], teachers: [T.PUTRI_MAHARDHIKA] },
    { unit: 1, sub: S_SMP.PJOK, name: 'Pendidikan Jasmani (PJOK) (8 PA)', jp: 1, dur: 1, classes: [C.C8PA], teachers: [T.ANDRIANSYAH] },

    // === 8 PI (C8PI) ===
    { unit: 1, sub: S_SMP.ARABIC, name: 'Bahasa Arab (8 PI)', jp: 2, dur: 2, classes: [C.C8PI], teachers: [T.LAILA_KAMILIA] },
    { unit: 1, sub: S_SMP.ENGLISH, name: 'Bahasa Inggris (8 PI)', jp: 2, dur: 2, classes: [C.C8PI], teachers: [T.SITI_HAZAMI] },
    { unit: 1, sub: S_SMP.INDO, name: 'Bahasa Indonesia (8 PI)', jp: 1, dur: 1, classes: [C.C8PI], teachers: [T.SITI_NOVANIA] },
    { unit: 1, sub: S_SMP.IPA, name: 'Ilmu Pengetahuan Alam (IPA) (8 PI)', jp: 2, dur: 2, classes: [C.C8PI], teachers: [T.ROBBY_SETIAWAN] },
    { unit: 1, sub: S_SMP.IPS, name: 'Ilmu Pengetahuan Sosial (IPS) (8 PI)', jp: 1, dur: 1, classes: [C.C8PI], teachers: [T.AZZARIA] },
    { unit: 1, sub: S_SMP.MTK, name: 'Matematika (8 PI)', jp: 2, dur: 2, classes: [C.C8PI], teachers: [T.SITI_MARDHIYAH] },
    { unit: 1, sub: S_SMP.PAI, name: 'Pendidikan Agama Islam (PAI) (8 PI)', jp: 2, dur: 2, classes: [C.C8PI], teachers: [T.MOH_GHOJALI] },
    { unit: 1, sub: S_SMP.PKN, name: 'Pancasila (8 PI)', jp: 1, dur: 1, classes: [C.C8PI], teachers: [T.PUTRI_MAHARDHIKA] },

    // === 9 PA&PI (C9PAPI) ===
    { unit: 1, sub: S_SMP.ARABIC, name: 'Bahasa Arab (9 PA&PI)', jp: 2, dur: 2, classes: [C.C9PAPI], teachers: [T.LAILA_KAMILIA] },
    { unit: 1, sub: S_SMP.ENGLISH, name: 'Bahasa Inggris (9 PA&PI)', jp: 2, dur: 2, classes: [C.C9PAPI], teachers: [T.SITI_HAZAMI] },
    { unit: 1, sub: S_SMP.INDO, name: 'Bahasa Indonesia (9 PA&PI)', jp: 1, dur: 1, classes: [C.C9PAPI], teachers: [T.SITI_NOVANIA] },
    { unit: 1, sub: S_SMP.IPA, name: 'Ilmu Pengetahuan Alam (IPA) (9 PA&PI)', jp: 2, dur: 2, classes: [C.C9PAPI], teachers: [T.ROBBY_SETIAWAN] },
    { unit: 1, sub: S_SMP.IPS, name: 'Ilmu Pengetahuan Sosial (IPS) (9 PA&PI)', jp: 1, dur: 1, classes: [C.C9PAPI], teachers: [T.AJI_AMIRUDIN] },
    { unit: 1, sub: S_SMP.MTK, name: 'Matematika (9 PA&PI)', jp: 2, dur: 2, classes: [C.C9PAPI], teachers: [T.SITI_MARDHIYAH] },
    { unit: 1, sub: S_SMP.PAI, name: 'Pendidikan Agama Islam (PAI) (9 PA&PI)', jp: 1, dur: 1, classes: [C.C9PAPI], teachers: [T.AJI_MUSTOPA] },
    { unit: 1, sub: S_SMP.PAI, name: 'Pendidikan Agama Islam (PAI) - Lanjutan (9 PA&PI)', jp: 1, dur: 1, classes: [C.C9PAPI], teachers: [T.MOH_GHOJALI] },
    { unit: 1, sub: S_SMP.PKN, name: 'Pancasila (9 PA&PI)', jp: 1, dur: 1, classes: [C.C9PAPI], teachers: [T.PUTRI_MAHARDHIKA] },

    // === 10 PA (C10PA) ===
    { unit: 2, sub: S_SMA.ARABIC, name: 'Bahasa Arab (10 PA)', jp: 2, dur: 2, classes: [C.C10PA], teachers: [T.HERI_SHOBIKAN] },
    { unit: 2, sub: S_SMA.ENGLISH, name: 'Bahasa Inggris (10 PA)', jp: 2, dur: 2, classes: [C.C10PA], teachers: [T.ASRUL_HADI] },
    { unit: 2, sub: S_SMA.INDO, name: 'Bahasa Indonesia (10 PA)', jp: 1, dur: 1, classes: [C.C10PA], teachers: [T.SITI_NOVANIA] },
    { unit: 2, sub: S_SMA.IPA, name: 'Ilmu Pengetahuan Alam (IPA) (10 PA)', jp: 2, dur: 2, classes: [C.C10PA], teachers: [T.ROBBY_SETIAWAN] },
    { unit: 2, sub: S_SMA.IPS, name: 'Ilmu Pengetahuan Sosial (IPS) (10 PA)', jp: 1, dur: 1, classes: [C.C10PA], teachers: [T.AJI_MUSTOPA] },
    { unit: 2, sub: S_SMA.MTK, name: 'Matematika (10 PA)', jp: 2, dur: 2, classes: [C.C10PA], teachers: [T.SITI_MARDHIYAH] },
    { unit: 2, sub: S_SMA.PAI, name: 'Pendidikan Agama Islam (PAI) (10 PA)', jp: 2, dur: 2, classes: [C.C10PA], teachers: [T.MOH_GHOJALI] },
    { unit: 2, sub: S_SMA.PKN, name: 'Pancasila (10 PA)', jp: 1, dur: 1, classes: [C.C10PA], teachers: [T.AJI_AMIRUDIN] },
    { unit: 2, sub: S_SMA.PJOK, name: 'Pendidikan Jasmani (PJOK) (10 PA)', jp: 1, dur: 1, classes: [C.C10PA], teachers: [T.ANDRIANSYAH] },

    // === 11 PA (C11PA) ===
    { unit: 2, sub: S_SMA.ARABIC, name: 'Bahasa Arab (11 PA)', jp: 2, dur: 2, classes: [C.C11PA], teachers: [T.HERI_SHOBIKAN] },
    { unit: 2, sub: S_SMA.ENGLISH, name: 'Bahasa Inggris (11 PA)', jp: 2, dur: 2, classes: [C.C11PA], teachers: [T.ASRUL_HADI] },
    { unit: 2, sub: S_SMA.INDO, name: 'Bahasa Indonesia (11 PA)', jp: 1, dur: 1, classes: [C.C11PA], teachers: [T.SITI_NOVANIA] },
    { unit: 2, sub: S_SMA.IPA, name: 'Ilmu Pengetahuan Alam (IPA) (11 PA)', jp: 2, dur: 2, classes: [C.C11PA], teachers: [T.ROBBY_SETIAWAN] },
    { unit: 2, sub: S_SMA.IPS, name: 'Ilmu Pengetahuan Sosial (IPS) (11 PA)', jp: 1, dur: 1, classes: [C.C11PA], teachers: [T.AJI_MUSTOPA] },
    { unit: 2, sub: S_SMA.MTK, name: 'Matematika (11 PA)', jp: 2, dur: 2, classes: [C.C11PA], teachers: [T.SITI_MARDHIYAH] },
    { unit: 2, sub: S_SMA.PAI, name: 'Pendidikan Agama Islam (PAI) (11 PA)', jp: 2, dur: 2, classes: [C.C11PA], teachers: [T.MOH_GHOJALI] },
    { unit: 2, sub: S_SMA.PKN, name: 'Pancasila (11 PA)', jp: 1, dur: 1, classes: [C.C11PA], teachers: [T.AJI_AMIRUDIN] },
    { unit: 2, sub: S_SMA.PJOK, name: 'Pendidikan Jasmani (PJOK) (11 PA)', jp: 1, dur: 1, classes: [C.C11PA], teachers: [T.ANDRIANSYAH] },

    // === GABUNGAN (JOINED CLASS): PJOK 8 PI & 9 PA&PI (1 GURU: AZZARIA) ===
    {
      unit: 1,
      sub: S_SMP.PJOK,
      name: 'PJOK (Rombel Gabungan: 8 PI & 9 PA&PI)',
      jp: 1,
      dur: 1,
      classes: [C.C8PI, C.C9PAPI],
      teachers: [T.AZZARIA],
      is_joined: 1
    },

    // === BAHASA PILIHAN (ELECTIVE GROUP 1: SMP PA -> 7 PA & 8 PA) ===
    {
      unit: 1, sub: S_SMP.BING_PIL, name: 'Bahasa Inggris (Pilihan) - Asrul Hadi (7 PA & 8 PA)',
      jp: 2, dur: 2, classes: [C.C7PA, C.C8PA], teachers: [T.ASRUL_HADI], is_elective: 1, grp: 'GROUP_SMP_PA'
    },
    {
      unit: 1, sub: S_SMP.BAR_PIL, name: 'Bahasa Arab (Pilihan) - Nurudz Salmi (7 PA & 8 PA)',
      jp: 2, dur: 2, classes: [C.C7PA, C.C8PA], teachers: [T.NURUDZ_SALMI], is_elective: 1, grp: 'GROUP_SMP_PA'
    },
    {
      unit: 1, sub: S_SMP.BAR_PIL, name: 'Bahasa Arab (Pilihan) - Siti Hazami (7 PA & 8 PA)',
      jp: 2, dur: 2, classes: [C.C7PA, C.C8PA], teachers: [T.SITI_HAZAMI], is_elective: 1, grp: 'GROUP_SMP_PA'
    },

    // === BAHASA PILIHAN (ELECTIVE GROUP 2: SMP PI -> 9 PA&PI, 7 PI, 8 PI) ===
    {
      unit: 1, sub: S_SMP.BING_PIL, name: 'Bahasa Inggris (Pilihan) - Asrul Hadi (9 PA&PI / 7 PI / 8 PI)',
      jp: 2, dur: 2, classes: [C.C9PAPI, C.C7PI, C.C8PI], teachers: [T.ASRUL_HADI], is_elective: 1, grp: 'GROUP_SMP_PI'
    },
    {
      unit: 1, sub: S_SMP.BING_PIL, name: 'Bahasa Inggris (Pilihan) - Siti Hazami (9 PA&PI / 7 PI / 8 PI)',
      jp: 2, dur: 2, classes: [C.C9PAPI, C.C7PI, C.C8PI], teachers: [T.SITI_HAZAMI], is_elective: 1, grp: 'GROUP_SMP_PI'
    },
    {
      unit: 1, sub: S_SMP.BAR_PIL, name: 'Bahasa Arab (Pilihan) - Laila Kamiliya (9 PA&PI / 7 PI / 8 PI)',
      jp: 2, dur: 2, classes: [C.C9PAPI, C.C7PI, C.C8PI], teachers: [T.LAILA_KAMILIA], is_elective: 1, grp: 'GROUP_SMP_PI'
    },

    // === BAHASA PILIHAN (ELECTIVE GROUP 3: SMA PA -> 10 PA & 11 PA) ===
    {
      unit: 2, sub: S_SMA.BING_PIL, name: 'Bahasa Inggris (Pilihan) - Asrul Hadi (10 PA & 11 PA)',
      jp: 2, dur: 2, classes: [C.C10PA, C.C11PA], teachers: [T.ASRUL_HADI], is_elective: 1, grp: 'GROUP_SMA_PA'
    },
    {
      unit: 2, sub: S_SMA.BAR_PIL, name: 'Bahasa Arab (Pilihan) - Heri Shobikan (10 PA & 11 PA)',
      jp: 2, dur: 2, classes: [C.C10PA, C.C11PA], teachers: [T.HERI_SHOBIKAN], is_elective: 1, grp: 'GROUP_SMA_PA'
    }
  ];

  for (const item of lessonsToInsert) {
    await db('timetable_lessons').insert({
      satuan_pendidikan_id: item.unit,
      academic_year_id: 2,
      type: 'mapel',
      subject_id: item.sub,
      name: item.name,
      total_hours_per_week: item.jp,
      duration_per_session: item.dur,
      target_class_ids: JSON.stringify(item.classes),
      teacher_ids: JSON.stringify(item.teachers),
      is_joined_class: item.is_joined || 0,
      constraints: item.is_elective ? JSON.stringify({ is_elective: true, elective_group_key: item.grp }) : null,
      is_active: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
  }

  console.log(`Successfully populated ${lessonsToInsert.length} clean lesson contracts matching Ground Truth!`);
  process.exit(0);
})();
