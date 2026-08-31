const db = require('../src/config/db/akademik');
const dbKep = require('../src/config/db/kepegawaian');

(async () => {
  const lastRun = await db('timetable_runs').orderBy('id', 'desc').first();
  const entries = await db('timetable_entries').where({ timetable_run_id: lastRun.id });
  
  const emp = await dbKep('employees').select('id', 'full_name');
  const empMap = {};
  emp.forEach(e => empMap[e.id] = e.full_name);

  // Target Ground Truth (Disesuaikan dengan full_name persis di DB)
  const targetJP = {
    'Siti Mardhiyah S.Si.': 14,
    'Robby Setiawan Wibowo': 14,
    'Mohamad Gojali S.Pd.': 11,
    'Asrul Hadi S.Pd.': 11,
    'Siti Hazami Nur Firdaus': 8,
    'Laila Kamiliya S.Hum': 7,
    'Siti Novania Yumanti S.Pd.': 7,
    'Azaria Fabiola Zaini S.Pd.': 6,
    'Aji Amirudin M.Pd.': 5,
    'Putri Mahardhika Pertiwi': 5,
    'Nurudz Salmi S.Pd.': 5,
    'Heri Shobikan S.Sos': 5,
    'Andriansyah S.Pd.': 4,
    'Aji Mustopa S.Pd., M.E.': 3
  };

  const actualJP = {};
  entries.forEach(e => {
    const tid = e.teacher_employee_id;
    const name = empMap[tid] || `ID ${tid}`;
    
    // Hitung durasi JP
    const [sh, sm] = e.start_time.split(':').map(Number);
    const [eh, em] = e.end_time.split(':').map(Number);
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    const jpCount = diffMins > 50 ? 2 : 1;

    actualJP[name] = (actualJP[name] || 0) + jpCount;
  });

  console.log('===================================================================================');
  console.log('=== AUDIT LANGKAH 5: PERBANDINGAN JP PER GURU (REFERENSI VS GENERATE BERSIH) ===');
  console.log('===================================================================================');
  console.log('| Nama Guru                  | Target Referensi | Hasil Generate | Status         |');
  console.log('-----------------------------------------------------------------------------------');
  let matchCount = 0;
  let totalTarget = 0;
  let totalActual = 0;

  for (const [name, target] of Object.entries(targetJP)) {
    const actual = actualJP[name] || 0;
    const isMatch = (actual === target);
    if (isMatch) matchCount++;
    totalTarget += target;
    totalActual += actual;

    const namePad = name.padEnd(26, ' ');
    const targetPad = String(`${target} JP`).padStart(16, ' ');
    const actualPad = String(`${actual} JP`).padStart(14, ' ');
    const diff = actual - target;
    const status = isMatch ? '  MATCH [OK]     ' : `  SELISIH (${diff > 0 ? '+' : ''}${diff}) [FAIL]`;
    console.log(`| ${namePad} | ${targetPad} | ${actualPad} | ${status} |`);
  }
  console.log('-----------------------------------------------------------------------------------');
  console.log(`TOTAL BEBAN JP SEKOLAH: ${totalTarget} JP (Target) vs ${totalActual} JP (Hasil Generate)`);
  console.log(`TINGKAT KESESUAIAN: ${matchCount} / ${Object.keys(targetJP).length} GURU TEPAT 100% (${((matchCount / Object.keys(targetJP).length) * 100).toFixed(1)}%)`);
  console.log('===================================================================================');
  process.exit(0);
})();
