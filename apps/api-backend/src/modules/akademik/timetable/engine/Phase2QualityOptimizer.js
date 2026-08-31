/**
 * Phase2QualityOptimizer
 * Modul Optimasi Kualitas Jadwal menggunakan Algoritma Simulated Annealing (SA)
 * Menerima jadwal feasible dari Fase 1 dan memaksimalkan skor soft constraints (0-100)
 */

const ConstraintChecker = require('./ConstraintChecker');
const Scorer = require('./Scorer');
const { DEFAULT_SA_OPTIONS } = require('./config/defaultWeights');

class Phase2QualityOptimizer {
  constructor(data = {}) {
    this.timeSlots = data.timeSlots || [];
    this.teacherAvailabilities = data.teacherAvailabilities || {};
    this.classAvailabilities = data.classAvailabilities || {};
    this.subjectConstraints = data.subjectConstraints || {};
    this.options = { ...DEFAULT_SA_OPTIONS, ...(data.options || {}) };
    this.scorer = new Scorer({ weights: data.options?.weights });
  }

  /**
   * Menjalankan Optimasi Simulated Annealing
   * @param {Array<Object>} initialPlacedBlocks - Jadwal feasible 100% dari Fase 1
   * @param {Object} baseGrid - Grid state dasar (locked entries, activities)
   * @returns {{ optimizedBlocks: Array<Object>, score: number, breakdown: Object, warnings: Array }}
   */
  optimize(initialPlacedBlocks = [], baseGrid = {}) {
    // Clone penempatan awal
    let currentBlocks = JSON.parse(JSON.stringify(initialPlacedBlocks));
    let currentGrid = this.rebuildGrid(currentBlocks, baseGrid);

    let currentEval = this.scorer.evaluate(currentBlocks, {
      teacherAvailabilities: this.teacherAvailabilities,
      subjectConstraints: this.subjectConstraints,
      timeSlots: this.timeSlots
    });

    let bestBlocks = JSON.parse(JSON.stringify(currentBlocks));
    let bestScore = currentEval.score;
    let bestBreakdown = currentEval.breakdown;
    let bestWarnings = currentEval.warnings;

    // Jika sudah sempurna (100) atau tidak ada blok yang bisa di-move
    const movableBlocks = currentBlocks.filter(b => !b.is_locked);
    if (bestScore >= 98 || movableBlocks.length <= 1) {
      return {
        optimizedBlocks: bestBlocks,
        score: bestScore,
        breakdown: bestBreakdown,
        warnings: bestWarnings
      };
    }

    let temperature = this.options.initial_temperature;
    const coolingRate = this.options.cooling_rate;
    const startTime = Date.now();
    const maxTimeMs = this.options.max_time_ms;
    let iterations = 0;

    while (
      temperature > this.options.min_temperature &&
      iterations < this.options.max_iterations &&
      Date.now() - startTime < maxTimeMs
    ) {
      for (let i = 0; i < this.options.iterations_per_temp; i++) {
        iterations++;

        // Pilih tipe neighbor move: 60% Swap (Tukar 2 Sesi), 40% Relocate (Pindah 1 Sesi ke Slot Kosong)
        const moveType = Math.random() < 0.6 ? 'swap' : 'relocate';
        let moveCandidate = null;

        if (moveType === 'swap') {
          moveCandidate = this.generateSwapMove(currentBlocks, currentGrid);
        } else {
          moveCandidate = this.generateRelocateMove(currentBlocks, currentGrid);
        }

        if (!moveCandidate) continue;

        // Evaluasi skor tetangga baru
        const nextEval = this.scorer.evaluate(moveCandidate.blocks, {
          teacherAvailabilities: this.teacherAvailabilities,
          subjectConstraints: this.subjectConstraints,
          timeSlots: this.timeSlots
        });

        const delta = nextEval.score - currentEval.score;

        // Metropolis Acceptance Criterion
        // Terima jika skor lebih baik (delta > 0), atau terima dengan probabilitas exp(delta / T)
        if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
          currentBlocks = moveCandidate.blocks;
          currentGrid = moveCandidate.grid;
          currentEval = nextEval;

          // Simpan solusi terbaik global yang pernah dicapai
          if (currentEval.score > bestScore) {
            bestScore = currentEval.score;
            bestBreakdown = currentEval.breakdown;
            bestWarnings = currentEval.warnings;
            bestBlocks = JSON.parse(JSON.stringify(currentBlocks));
          }
        }
      }

      // Cooling step
      temperature *= coolingRate;
    }

    return {
      optimizedBlocks: bestBlocks,
      score: bestScore,
      breakdown: bestBreakdown,
      warnings: bestWarnings
    };
  }

  /**
   * Neighbor Move A: Menukar posisi 2 sesi pelajaran yang sama durasinya atau valid
   */
  generateSwapMove(blocks, currentGrid) {
    const movableIndices = [];
    blocks.forEach((b, idx) => {
      if (!b.is_locked) movableIndices.push(idx);
    });

    if (movableIndices.length < 2) return null;

    // Pilih 2 blok acak
    const idxA = movableIndices[Math.floor(Math.random() * movableIndices.length)];
    let idxB = movableIndices[Math.floor(Math.random() * movableIndices.length)];
    while (idxA === idxB) {
      idxB = movableIndices[Math.floor(Math.random() * movableIndices.length)];
    }

    const blockA = blocks[idxA];
    const blockB = blocks[idxB];

    // Hanya tukar jika durasinya sama (misal sama-sama 2 JP atau 1 JP)
    if (blockA.duration !== blockB.duration) return null;

    // Clone grid sementara tanpa blockA dan blockB
    const tempGrid = this.rebuildGrid(blocks.filter((_, i) => i !== idxA && i !== idxB));

    // Periksa apakah slot B valid untuk block A
    const periodsForA = this.getConsecutivePeriodsForSlot(blockB.day_of_week, blockB.period_index, blockA.duration);
    if (!periodsForA) return null;
    const checkA = ConstraintChecker.isPlacementFeasible(blockA, blockB.day_of_week, periodsForA, tempGrid, {
      teacherAvailabilities: this.teacherAvailabilities,
      classAvailabilities: this.classAvailabilities
    });
    if (!checkA.valid) return null;

    // Tempatkan sementara A di slot B
    this.placeOnGrid(tempGrid, blockA, blockB.day_of_week, blockB.period_index, periodsForA);

    // Periksa apakah slot A valid untuk block B
    const periodsForB = this.getConsecutivePeriodsForSlot(blockA.day_of_week, blockA.period_index, blockB.duration);
    if (!periodsForB) return null;
    const checkB = ConstraintChecker.isPlacementFeasible(blockB, blockA.day_of_week, periodsForB, tempGrid, {
      teacherAvailabilities: this.teacherAvailabilities,
      classAvailabilities: this.classAvailabilities
    });
    if (!checkB.valid) return null;

    // Keduanya valid! Buat array blocks baru dengan slot tertukar
    const newBlocks = JSON.parse(JSON.stringify(blocks));
    newBlocks[idxA] = {
      ...blockA,
      day_of_week: blockB.day_of_week,
      period_index: blockB.period_index,
      start_time: blockB.start_time,
      end_time: blockB.end_time
    };
    newBlocks[idxB] = {
      ...blockB,
      day_of_week: blockA.day_of_week,
      period_index: blockA.period_index,
      start_time: blockA.start_time,
      end_time: blockA.end_time
    };

    return {
      blocks: newBlocks,
      grid: this.rebuildGrid(newBlocks)
    };
  }

  /**
   * Neighbor Move B: Memindahkan 1 sesi ke slot kosong lain yang valid
   */
  generateRelocateMove(blocks, currentGrid) {
    const movableIndices = [];
    blocks.forEach((b, idx) => {
      if (!b.is_locked) movableIndices.push(idx);
    });

    if (movableIndices.length === 0) return null;
    const idx = movableIndices[Math.floor(Math.random() * movableIndices.length)];
    const block = blocks[idx];

    // Grid sementara tanpa blok ini
    const tempGrid = this.rebuildGrid(blocks.filter((_, i) => i !== idx));

    // Cari slot acak yang valid
    const days = [1, 2, 3, 4, 5, 6, 7];
    const randomDay = days[Math.floor(Math.random() * days.length)];
    const daySlots = this.timeSlots
      .filter(s => s.day_of_week === randomDay && s.is_generator_usable && s.type === 'lesson')
      .sort((a, b) => a.period_index - b.period_index);

    if (daySlots.length < block.duration) return null;
    const maxStart = daySlots.length - block.duration;
    const randomStartIdx = Math.floor(Math.random() * (maxStart + 1));
    const consecutive = ConstraintChecker.getConsecutivePeriods(daySlots, randomStartIdx, block.duration);

    if (!consecutive) return null;

    const check = ConstraintChecker.isPlacementFeasible(block, randomDay, consecutive, tempGrid, {
      teacherAvailabilities: this.teacherAvailabilities,
      classAvailabilities: this.classAvailabilities
    });

    if (!check.valid) return null;

    // Valid! Pindahkan blok
    const newBlocks = JSON.parse(JSON.stringify(blocks));
    newBlocks[idx] = {
      ...block,
      day_of_week: randomDay,
      period_index: consecutive[0].period_index,
      start_time: consecutive[0].start_time,
      end_time: consecutive[consecutive.length - 1].end_time
    };

    return {
      blocks: newBlocks,
      grid: this.rebuildGrid(newBlocks)
    };
  }

  rebuildGrid(blocks = [], baseGrid = {}) {
    const grid = {};
    for (let d = 1; d <= 7; d++) {
      grid[d] = {};
    }

    blocks.forEach(b => {
      if (!b.day_of_week || !b.period_index) return;
      const teacherIds = b.teacher_ids || (b.primary_teacher_id ? [b.primary_teacher_id] : []);
      const classIds = b.class_ids || (b.primary_class_id ? [b.primary_class_id] : []);

      for (let p = 0; p < (b.duration || 1); p++) {
        const period = b.period_index + p;
        if (!grid[b.day_of_week][period]) {
          grid[b.day_of_week][period] = {
            teacherIds: new Set(),
            classIds: new Set(),
            roomNames: new Set(),
            is_locked: !!b.is_locked,
            is_elective: !!b.is_elective
          };
        }
        teacherIds.forEach(t => grid[b.day_of_week][period].teacherIds.add(String(t)));
        classIds.forEach(c => grid[b.day_of_week][period].classIds.add(String(c)));
        if (b.room_name) grid[b.day_of_week][period].roomNames.add(b.room_name);
      }
    });

    return grid;
  }

  placeOnGrid(grid, block, day, startPeriod, periods) {
    const teacherIds = block.teacher_ids || (block.primary_teacher_id ? [block.primary_teacher_id] : []);
    const classIds = block.class_ids || (block.primary_class_id ? [block.primary_class_id] : []);

    periods.forEach(p => {
      const periodIndex = p.period_index;
      if (!grid[day][periodIndex]) {
        grid[day][periodIndex] = {
          teacherIds: new Set(),
          classIds: new Set(),
          roomNames: new Set(),
          is_elective: block.is_elective
        };
      }
      teacherIds.forEach(t => grid[day][periodIndex].teacherIds.add(String(t)));
      classIds.forEach(c => grid[day][periodIndex].classIds.add(String(c)));
    });
  }

  getConsecutivePeriodsForSlot(day, startPeriod, duration) {
    const daySlots = this.timeSlots
      .filter(s => s.day_of_week === day && s.is_generator_usable && s.type === 'lesson')
      .sort((a, b) => a.period_index - b.period_index);

    const startIdx = daySlots.findIndex(s => s.period_index === startPeriod);
    if (startIdx === -1) return null;
    return ConstraintChecker.getConsecutivePeriods(daySlots, startIdx, duration);
  }
}

module.exports = Phase2QualityOptimizer;
