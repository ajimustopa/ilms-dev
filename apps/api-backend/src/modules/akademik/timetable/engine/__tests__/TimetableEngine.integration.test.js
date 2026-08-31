/**
 * Integration Test: TimetableEngine End-to-End
 * Menjalankan engine penuh pada dataset KBM terisolasi,
 * menguji Phase 1, Phase 2, asserts:
 * 1. conflicts_count === 0
 * 2. total_lessons === placed_lessons
 * 3. skor akhir (setelah Fase 2) >= skor awal (setelah Fase 1)
 */

const TimetableEngine = require('../TimetableEngine');
const Scorer = require('../Scorer');
const BlockBuilder = require('../BlockBuilder');
const Phase1Solver = require('../Phase1FeasibilitySolver');

function runIntegrationTest() {
  console.log('=== MENJALANKAN INTEGRATION TEST: TIMETABLE ENGINE E2E ===');
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName) {
    totalCount++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // 1. Dataset Mini: 3 Hari, 4 JP/hari, 2 Kelas, 4 Guru, 6 Mata Pelajaran
  const timeSlots = [];
  for (let day = 1; day <= 3; day++) {
    for (let p = 1; p <= 4; p++) {
      timeSlots.push({
        id: day * 10 + p,
        day_of_week: day,
        period_index: p,
        start_time: `${String(7 + p).padStart(2, '0')}:00`,
        end_time: `${String(7 + p).padStart(2, '0')}:40`,
        type: 'lesson',
        is_generator_usable: true
      });
    }
  }

  const mockLessons = [
    { id: 1, name: 'Matematika 7-A', total_hours_per_week: 4, duration_per_session: 2, target_class_ids: [10], teacher_ids: [101] },
    { id: 2, name: 'Bahasa Indonesia 7-A', total_hours_per_week: 4, duration_per_session: 2, target_class_ids: [10], teacher_ids: [102] },
    { id: 3, name: 'IPA 7-A', total_hours_per_week: 4, duration_per_session: 2, target_class_ids: [10], teacher_ids: [103] },
    { id: 4, name: 'Matematika 7-B', total_hours_per_week: 4, duration_per_session: 2, target_class_ids: [11], teacher_ids: [101] },
    { id: 5, name: 'Bahasa Indonesia 7-B', total_hours_per_week: 4, duration_per_session: 2, target_class_ids: [11], teacher_ids: [102] },
    { id: 6, name: 'PJOK 7-B', total_hours_per_week: 4, duration_per_session: 2, target_class_ids: [11], teacher_ids: [104] }
  ];

  // 2. Jalankan Engine Penuh
  const engine = new TimetableEngine({
    satuan_pendidikan_id: 1,
    academic_year_id: 1,
    timeSlots,
    lessons: mockLessons,
    teacherAvailabilities: {},
    classAvailabilities: {},
    activities: [],
    classes: [{ id: 10, name: '7-A' }, { id: 11, name: '7-B' }],
    teachers: [{ id: 101 }, { id: 102 }, { id: 103 }, { id: 104 }],
    options: { max_time_ms: 2000 }
  });

  // Ukur skor Fase 1 saja secara terpisah untuk pembanding
  const { blocks } = BlockBuilder.buildSessionBlocks(mockLessons);
  const p1Solver = new Phase1Solver({ timeSlots });
  const grid = BlockBuilder.initGrid();
  const p1Res = p1Solver.solve(blocks, grid);
  const scorer = new Scorer();
  const phase1Score = scorer.evaluate(p1Res.placedBlocks, { timeSlots }).score;

  const result = engine.generate();

  console.log(`Phase 1 Raw Score: ${phase1Score}/100`);
  console.log(`Phase 2 Final Score: ${result.score}/100`);
  console.log(`Total Placed: ${result.placed_lessons}/${result.total_lessons}`);
  console.log(`Conflicts Count: ${result.conflicts_count}`);

  assert(result.success === true, 'Engine menghasilkan status success: true');
  assert(result.conflicts_count === 0, 'Zero Hard Constraint conflicts (conflicts_count === 0)');
  assert(result.placed_lessons === result.total_lessons, 'Seluruh 12 sesi blok berhasil dialokasikan 100%');
  assert(result.entries.length === 12, 'Jumlah entri final tepat sesuai jumlah sesi');
  assert(result.score >= phase1Score, `Skor Fase 2 (${result.score}) >= Skor Fase 1 (${phase1Score})`);

  console.log(`\nHASIL: ${passedCount}/${totalCount} Integration Tests BERHASIL LOLOS.`);
  return passedCount === totalCount;
}

if (require.main === module) {
  const success = runIntegrationTest();
  process.exit(success ? 0 : 1);
}

module.exports = runIntegrationTest;
