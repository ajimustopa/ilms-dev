/**
 * Unit Test: ConstraintChecker
 * Menguji 5 Hard Constraints secara mandiri
 */

const ConstraintChecker = require('../ConstraintChecker');

function runUnitTests() {
  console.log('--- MENJALANKAN UNIT TEST: CONSTRAINT CHECKER (5 HARD CONSTRAINTS) ---');
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

  const mockTimeSlots = [
    { day_of_week: 1, period_index: 1, start_time: '08:00', end_time: '08:40', type: 'lesson', is_generator_usable: true },
    { day_of_week: 1, period_index: 2, start_time: '08:40', end_time: '09:20', type: 'lesson', is_generator_usable: true },
    { day_of_week: 1, period_index: 3, start_time: '09:50', end_time: '10:30', type: 'lesson', is_generator_usable: true }
  ];

  const mockBlock = {
    block_id: 'block_test_1',
    lesson_name: 'Matematika 7-A',
    duration: 2,
    teacher_ids: [101],
    class_ids: [10],
    is_elective: false
  };

  // Test 1: Penolakan jika Guru Unavailable (Hard Constraint 1)
  {
    const grid = { 1: {} };
    const context = {
      teacherAvailabilities: { '101_1_1': 'unavailable' },
      classAvailabilities: {}
    };
    const periods = [mockTimeSlots[0], mockTimeSlots[1]];
    const result = ConstraintChecker.isPlacementFeasible(mockBlock, 1, periods, grid, context);
    assert(result.valid === false && result.constraint === 'teacher_unavailable', 'Test 1: Menolak penempatan saat status guru Unavailable');
  }

  // Test 2: Penolakan jika Rombel Blocked / Unavailable (Hard Constraint 2)
  {
    const grid = { 1: {} };
    const context = {
      teacherAvailabilities: {},
      classAvailabilities: { '10_1_2': 'blocked' }
    };
    const periods = [mockTimeSlots[0], mockTimeSlots[1]];
    const result = ConstraintChecker.isPlacementFeasible(mockBlock, 1, periods, grid, context);
    assert(result.valid === false && result.constraint === 'class_blocked', 'Test 2: Menolak penempatan saat rombel berstatus Blocked/Non-KBM');
  }

  // Test 3: Deteksi Bentrok Guru (Hard Constraint 3 - No Teacher Clashing)
  {
    const grid = {
      1: {
        1: {
          teacherIds: new Set(['101']), // Guru 101 sudah ada di kelas lain pada jam 1
          classIds: new Set(['11'])
        }
      }
    };
    const context = { teacherAvailabilities: {}, classAvailabilities: {} };
    const periods = [mockTimeSlots[0], mockTimeSlots[1]];
    const result = ConstraintChecker.isPlacementFeasible(mockBlock, 1, periods, grid, context);
    assert(result.valid === false && result.constraint === 'teacher_clash', 'Test 3: Menolak penempatan saat guru bentrok mengajar di kelas lain');
  }

  // Test 4: Deteksi Bentrok Rombel (Hard Constraint 4 - No Class Clashing)
  {
    const grid = {
      1: {
        2: {
          teacherIds: new Set(['105']),
          classIds: new Set(['10']) // Rombel 10 sudah ada mapel lain pada jam 2
        }
      }
    };
    const context = { teacherAvailabilities: {}, classAvailabilities: {} };
    const periods = [mockTimeSlots[0], mockTimeSlots[1]];
    const result = ConstraintChecker.isPlacementFeasible(mockBlock, 1, periods, grid, context);
    assert(result.valid === false && result.constraint === 'class_clash', 'Test 4: Menolak penempatan saat rombel sudah memiliki mapel lain');
  }

  // Test 5: Proteksi Entri Terkunci (Hard Constraint 5 - Locked Slot)
  {
    const grid = {
      1: {
        1: {
          is_locked: true,
          teacherIds: new Set(['999']),
          classIds: new Set(['999'])
        }
      }
    };
    const context = { teacherAvailabilities: {}, classAvailabilities: {} };
    const periods = [mockTimeSlots[0], mockTimeSlots[1]];
    const result = ConstraintChecker.isPlacementFeasible(mockBlock, 1, periods, grid, context);
    assert(result.valid === false && result.constraint === 'locked_slot', 'Test 5: Menolak penempatan pada slot yang sudah di-lock manual (is_locked)');
  }

  // Test 6: Sukses saat seluruh syarat terpenuhi
  {
    const grid = { 1: {} };
    const context = {
      teacherAvailabilities: { '101_1_1': 'available', '101_1_2': 'available' },
      classAvailabilities: { '10_1_1': 'available', '10_1_2': 'available' }
    };
    const periods = [mockTimeSlots[0], mockTimeSlots[1]];
    const result = ConstraintChecker.isPlacementFeasible(mockBlock, 1, periods, grid, context);
    assert(result.valid === true, 'Test 6: Penempatan berhasil valid 100% saat tidak ada pelanggaran constraint');
  }

  console.log(`\nHASIL: ${passedCount}/${totalCount} Unit Tests BERHASIL LOLOS.`);
  return passedCount === totalCount;
}

if (require.main === module) {
  const success = runUnitTests();
  process.exit(success ? 0 : 1);
}

module.exports = runUnitTests;
