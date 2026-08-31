/**
 * TimetableEngine (Façade & Orchestrator)
 * Mengintegrasikan:
 * 1. BlockBuilder (Penyiapan sesi & locked entries)
 * 2. Phase 1: Feasibility Solver (CSP + MRV + LCV + Forward Checking)
 * 3. Phase 2: Quality Optimizer (Simulated Annealing + Soft Constraints Scoring)
 */

const BlockBuilder = require('./BlockBuilder');
const ConstraintChecker = require('./ConstraintChecker');
const Phase1FeasibilitySolver = require('./Phase1FeasibilitySolver');
const Phase2QualityOptimizer = require('./Phase2QualityOptimizer');
const Scorer = require('./Scorer');

class TimetableEngine {
  constructor(data = {}) {
    this.satuan_pendidikan_id = data.satuan_pendidikan_id;
    this.academic_year_id = data.academic_year_id;
    this.timeSlots = data.timeSlots || [];
    this.lessons = data.lessons || [];
    this.teacherAvailabilities = data.teacherAvailabilities || {};
    this.classAvailabilities = data.classAvailabilities || {};
    this.subjectConstraints = data.subjectConstraints || {};
    this.activities = data.activities || [];
    this.lockedEntries = data.lockedEntries || [];
    this.classes = data.classes || [];
    this.teachers = data.teachers || [];
    this.options = data.options || {};
  }

  /**
   * Main Generator Execution (2-Fase)
   */
  generate() {
    console.log(`[TimetableEngine] Memulai eksekusi 2-Fase untuk ${this.lessons.length} kontrak pelajaran...`);

    // 1. Ekstraksi Sesi Blok
    const { blocks, unassignedLessons } = BlockBuilder.buildSessionBlocks(this.lessons, this.options);

    // 2. Inisialisasi Matriks Grid & Pasang Kegiatan Non-KBM + Entri Terkunci
    const grid = BlockBuilder.initGrid();
    BlockBuilder.applyActivitiesAndBreaks(grid, this.timeSlots, this.activities);

    const placedBlocks = [];
    BlockBuilder.applyLockedEntries(grid, this.lockedEntries, placedBlocks);

    // -------------------------------------------------------------
    // FASE 1: FEASIBILITY SEARCH (CSP + MRV + LCV + Forward Checking)
    // -------------------------------------------------------------
    console.log(`[TimetableEngine] Menjalankan Fase 1: Feasibility Search (${blocks.length} blok sesi)...`);
    const phase1Solver = new Phase1FeasibilitySolver({
      timeSlots: this.timeSlots,
      teacherAvailabilities: this.teacherAvailabilities,
      classAvailabilities: this.classAvailabilities,
      options: this.options
    });

    const phase1Result = phase1Solver.solve(blocks, grid, placedBlocks);

    if (!phase1Result.success) {
      console.warn('[TimetableEngine] Fase 1 tidak menemukan solusi feasible 100%');
      const scorer = new Scorer({ weights: this.options?.weights });
      const initialEval = scorer.evaluate(phase1Result.placedBlocks, {
        teacherAvailabilities: this.teacherAvailabilities,
        subjectConstraints: this.subjectConstraints,
        timeSlots: this.timeSlots
      });

      return {
        success: false,
        phase: 'phase1_feasibility',
        score: initialEval.score,
        total_lessons: blocks.length,
        placed_lessons: phase1Result.placedBlocks.length,
        unplaced_lessons: blocks.length - phase1Result.placedBlocks.length,
        conflicts_count: blocks.length - phase1Result.placedBlocks.length,
        warnings_count: initialEval.warnings.length,
        warnings: initialEval.warnings,
        diagnostics: phase1Result.diagnostics,
        unassigned_lessons: unassignedLessons,
        entries: this.formatEntries(phase1Result.placedBlocks)
      };
    }

    console.log(`[TimetableEngine] Fase 1 Berhasil! Seluruh ${phase1Result.placedBlocks.length} sesi valid 100%.`);

    // -------------------------------------------------------------
    // FASE 2: QUALITY REFINEMENT (Simulated Annealing Optimization)
    // -------------------------------------------------------------
    console.log('[TimetableEngine] Menjalankan Fase 2: Quality Refinement (Simulated Annealing)...');
    const phase2Optimizer = new Phase2QualityOptimizer({
      timeSlots: this.timeSlots,
      teacherAvailabilities: this.teacherAvailabilities,
      classAvailabilities: this.classAvailabilities,
      subjectConstraints: this.subjectConstraints,
      options: this.options
    });

    const phase2Result = phase2Optimizer.optimize(phase1Result.placedBlocks, grid);
    console.log(`[TimetableEngine] Fase 2 Selesai! Skor Kualitas Akhir: ${phase2Result.score}/100`);

    // -------------------------------------------------------------
    // SAFETY NET: VALIDASI PENUH HARD CONSTRAINTS ATAS GRID FINAL
    // -------------------------------------------------------------
    const finalGrid = phase2Optimizer.rebuildGrid(phase2Result.optimizedBlocks);
    const finalValidationErrors = [];

    for (const block of phase2Result.optimizedBlocks) {
      const periods = phase2Optimizer.getConsecutivePeriodsForSlot(block.day_of_week, block.period_index, block.duration);
      if (!periods) {
        finalValidationErrors.push(`Slot waktu tidak valid untuk pelajaran "${block.lesson_name}"`);
        continue;
      }

      // Validasi terhadap grid tanpa blok saat ini
      const tempGrid = phase2Optimizer.rebuildGrid(
        phase2Result.optimizedBlocks.filter(b => b.block_id !== block.block_id)
      );

      const check = ConstraintChecker.isPlacementFeasible(block, block.day_of_week, periods, tempGrid, {
        teacherAvailabilities: this.teacherAvailabilities,
        classAvailabilities: this.classAvailabilities
      });

      if (!check.valid) {
        finalValidationErrors.push(`Pelanggaran Hard Constraint (${check.constraint}): ${check.reason}`);
      }
    }

    if (finalValidationErrors.length > 0) {
      console.warn(`[TimetableEngine] SAFETY NET AKTIF: Ditemukan ${finalValidationErrors.length} potensi anomali pada hasil Fase 2. Melakukan fallback aman ke jadwal Fase 1 (100% Feasible)...`);
      
      const scorer = new Scorer({ weights: this.options?.weights });
      const phase1Eval = scorer.evaluate(phase1Result.placedBlocks, {
        teacherAvailabilities: this.teacherAvailabilities,
        subjectConstraints: this.subjectConstraints,
        timeSlots: this.timeSlots
      });

      const fallbackWarnings = [
        'Fase 2 (Quality Optimization) dilewati karena terdeteksi potensi pelanggaran constraint pada langkah optimasi. Menggunakan jadwal aman Fase 1.',
        ...phase1Eval.warnings
      ];

      return {
        success: true,
        phase: 'complete_fallback_phase1',
        score: phase1Eval.score,
        score_breakdown: phase1Eval.breakdown,
        total_lessons: blocks.length,
        placed_lessons: phase1Result.placedBlocks.length,
        unplaced_lessons: 0,
        conflicts_count: 0,
        warnings_count: fallbackWarnings.length,
        warnings: fallbackWarnings,
        diagnostics: null,
        unassigned_lessons: unassignedLessons,
        entries: this.formatEntries(phase1Result.placedBlocks)
      };
    }

    return {
      success: true,
      phase: 'complete',
      score: phase2Result.score,
      score_breakdown: phase2Result.breakdown,
      total_lessons: blocks.length,
      placed_lessons: phase2Result.optimizedBlocks.length,
      unplaced_lessons: 0,
      conflicts_count: 0,
      warnings_count: phase2Result.warnings.length,
      warnings: phase2Result.warnings,
      diagnostics: null,
      unassigned_lessons: unassignedLessons,
      entries: this.formatEntries(phase2Result.optimizedBlocks)
    };
  }

  formatEntries(placedBlocks = []) {
    const entries = [];
    placedBlocks.forEach(p => {
      const lessonIds = p.all_lesson_ids || [p.lesson_id];
      lessonIds.forEach(lid => {
        entries.push({
          lesson_id: lid,
          day_of_week: p.day_of_week,
          period_index: p.period_index,
          start_time: p.start_time,
          end_time: p.end_time,
          class_group_id: p.primary_class_id,
          teacher_employee_id: p.primary_teacher_id,
          subject_id: p.subject_id,
          extracurricular_id: p.extracurricular_id,
          room_name: p.room_name || '',
          is_locked: !!p.is_locked,
          is_joined_class: !!p.is_joined_class,
          joined_class_group_ids: p.class_ids,
          team_teacher_ids: p.teacher_ids
        });
      });
    });
    return entries;
  }
}

module.exports = TimetableEngine;
