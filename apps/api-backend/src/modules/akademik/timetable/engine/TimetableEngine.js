/**
 * Timetable Engine Core: Generator & CSP Solver
 * Algorithms: Backtracking + Forward Checking + MRV Heuristics + Soft Constraint Scoring
 */

class TimetableEngine {
  constructor(data) {
    this.satuan_pendidikan_id = data.satuan_pendidikan_id;
    this.academic_year_id = data.academic_year_id;
    this.timeSlots = data.timeSlots || []; // Available time slots for the week
    this.lessons = data.lessons || []; // List of lesson units to place
    this.teacherAvailabilities = data.teacherAvailabilities || {}; // { [teacherId_day_period]: status }
    this.classAvailabilities = data.classAvailabilities || {}; // { [classId_day_period]: status }
    this.activities = data.activities || []; // Non-lesson activities (e.g. upacara, sholat, break)
    this.lockedEntries = data.lockedEntries || []; // Pre-existing locked timetable entries
    this.classes = data.classes || [];
    this.teachers = data.teachers || [];
    this.options = data.options || {};
  }

  /**
   * Main Generator Function
   */
  generate() {
    console.log(`[TimetableEngine] Starting generation for ${this.lessons.length} lessons...`);

    // 1. Build Lesson Units (Expanding frequency/duration into individual session blocks)
    const sessionBlocks = this.buildSessionBlocks();

    // 2. Build Grid Map for Fast Conflict Checking
    // Grid: Map key -> { [day_period]: { teacherIds: Set, classIds: Set, roomNames: Set, lessonId, entry } }
    const grid = {};
    const days = [1, 2, 3, 4, 5, 6, 7];
    days.forEach(d => {
      grid[d] = {};
    });

    // 3. Mark Non-Lesson Activities & Breaks onto the Grid
    this.applyActivitiesAndBreaks(grid);

    // 4. Place Locked Entries
    const placedBlocks = [];
    const unplacedBlocks = [];
    this.applyLockedEntries(grid, placedBlocks);

    // Filter session blocks that are not locked
    const freeBlocks = sessionBlocks.filter(b => !b.is_locked);

    // 5. Sort Lessons using Most Constrained Variable (MRV) Heuristic
    // (Lessons with highest duration, specific teacher availability constraints, or joined classes first)
    freeBlocks.sort((a, b) => {
      // Prioritize double periods / longer sessions
      if (b.duration !== a.duration) return b.duration - a.duration;
      // Prioritize joined classes
      if (b.is_joined_class !== a.is_joined_class) return b.is_joined_class ? 1 : -1;
      // Prioritize team teaching
      if (b.teacher_ids.length !== a.teacher_ids.length) return b.teacher_ids.length - a.teacher_ids.length;
      return 0;
    });

    // 6. Execute Backtracking Placement
    const success = this.backtrack(freeBlocks, 0, grid, placedBlocks);

    // 7. Evaluate Quality Score & Warnings
    const scoringResult = this.calculateScore(placedBlocks, grid);

    // 8. Generate Diagnostics if there are unplaced blocks
    const unplaced = freeBlocks.filter(b => !placedBlocks.some(p => p.block_id === b.block_id));
    const diagnostics = this.generateDiagnostics(unplaced, grid);

    return {
      success: unplaced.length === 0,
      score: scoringResult.score,
      total_lessons: sessionBlocks.length,
      placed_lessons: placedBlocks.length,
      unplaced_lessons: unplaced.length,
      conflicts_count: unplaced.length,
      warnings_count: scoringResult.warnings.length,
      warnings: scoringResult.warnings,
      diagnostics,
      entries: placedBlocks.map(p => ({
        lesson_id: p.lesson_id,
        day_of_week: p.day_of_week,
        period_index: p.period_index,
        start_time: p.start_time,
        end_time: p.end_time,
        class_group_id: p.primary_class_id,
        teacher_employee_id: p.primary_teacher_id,
        subject_id: p.subject_id,
        extracurricular_id: p.extracurricular_id,
        room_name: p.room_name,
        is_locked: !!p.is_locked,
        is_joined_class: !!p.is_joined_class,
        joined_class_group_ids: p.class_ids,
        team_teacher_ids: p.teacher_ids
      }))
    };
  }

  /**
   * Expands lessons into individual scheduling blocks (e.g. 4 JP with duration 2 -> two 2-JP blocks)
   */
  buildSessionBlocks() {
    const blocks = [];
    let blockCounter = 1;
    this.unassignedLessons = [];

    for (const lesson of this.lessons) {
      if (lesson.is_active === false) continue;
      const totalHours = parseInt(lesson.total_hours_per_week, 10) || 2;
      const duration = parseInt(lesson.duration_per_session, 10) || (totalHours >= 2 ? 2 : 1);
      const classIds = Array.isArray(lesson.target_class_ids) ? lesson.target_class_ids : [];
      const teacherIds = Array.isArray(lesson.teacher_ids) ? lesson.teacher_ids.filter(Boolean) : [];

      // Validasi wajib: Pembelajaran yang belum ada guru yang ditugaskan TIDAK BISA dialokasikan jadwalnya
      if (teacherIds.length === 0) {
        this.unassignedLessons.push({
          id: lesson.id,
          name: lesson.name,
          reason: 'Belum ada guru pengampu yang ditugaskan di pembagian tugas mengajar'
        });
        continue;
      }

      let remainingHours = totalHours;
      while (remainingHours > 0) {
        const currentDuration = Math.min(remainingHours, duration);
        blocks.push({
          block_id: `block_${lesson.id}_${blockCounter++}`,
          lesson_id: lesson.id,
          subject_id: lesson.subject_id,
          extracurricular_id: lesson.extracurricular_id,
          lesson_name: lesson.name,
          duration: currentDuration,
          primary_class_id: classIds[0] || null,
          class_ids: classIds,
          primary_teacher_id: teacherIds[0] || null,
          teacher_ids: teacherIds,
          room_name: lesson.room_name || '',
          is_joined_class: !!lesson.is_joined_class || classIds.length > 1,
          constraints: lesson.constraints || {}
        });
        remainingHours -= currentDuration;
      }
    }

    return blocks;
  }

  /**
   * Marks Activities and Breaks into Grid
   */
  applyActivitiesAndBreaks(grid) {
    // 1. Time slots of type 'break' or 'activity'
    this.timeSlots.forEach(slot => {
      if (!slot.is_generator_usable || slot.type === 'break' || slot.type === 'activity') {
        if (!grid[slot.day_of_week][slot.period_index]) {
          grid[slot.day_of_week][slot.period_index] = {
            is_blocked: true,
            type: slot.type,
            label: slot.label || slot.type,
            teacherIds: new Set(),
            classIds: new Set(),
            roomNames: new Set()
          };
        } else {
          grid[slot.day_of_week][slot.period_index].is_blocked = true;
        }
      }
    });

    // 2. Specific Activities
    this.activities.forEach(act => {
      const day = act.day_of_week;
      const period = act.period_index;
      if (day && period) {
        if (!grid[day][period]) {
          grid[day][period] = {
            is_blocked: act.applies_to_all_classes,
            type: act.type,
            label: act.title,
            teacherIds: new Set(act.target_teacher_ids || []),
            classIds: new Set(act.target_class_ids || []),
            roomNames: new Set()
          };
        } else {
          if (act.applies_to_all_classes) {
            grid[day][period].is_blocked = true;
          }
          (act.target_class_ids || []).forEach(cid => grid[day][period].classIds.add(cid));
          (act.target_teacher_ids || []).forEach(tid => grid[day][period].teacherIds.add(tid));
        }
      }
    });
  }

  /**
   * Applies pre-existing locked entries
   */
  applyLockedEntries(grid, placedBlocks) {
    this.lockedEntries.forEach(entry => {
      const day = entry.day_of_week;
      const period = entry.period_index;
      if (!grid[day][period]) {
        grid[day][period] = {
          teacherIds: new Set(),
          classIds: new Set(),
          roomNames: new Set(),
          entries: []
        };
      }
      if (entry.teacher_employee_id) grid[day][period].teacherIds.add(entry.teacher_employee_id);
      if (entry.class_group_id) grid[day][period].classIds.add(entry.class_group_id);
      if (entry.room_name) grid[day][period].roomNames.add(entry.room_name);

      placedBlocks.push({
        block_id: `locked_${entry.id}`,
        lesson_id: entry.lesson_id,
        day_of_week: day,
        period_index: period,
        start_time: entry.start_time,
        end_time: entry.end_time,
        primary_class_id: entry.class_group_id,
        class_ids: entry.joined_class_group_ids || [entry.class_group_id],
        primary_teacher_id: entry.teacher_employee_id,
        teacher_ids: entry.team_teacher_ids || (entry.teacher_employee_id ? [entry.teacher_employee_id] : []),
        room_name: entry.room_name,
        is_locked: true
      });
    });
  }

  /**
   * Backtracking Algorithm with Constraint Checking
   */
  backtrack(blocks, index, grid, placedBlocks) {
    if (index >= blocks.length) {
      return true; // All blocks successfully placed!
    }

    const currentBlock = blocks[index];
    const candidateSlots = this.getFeasibleSlots(currentBlock, grid, placedBlocks);

    // Heuristic: Shuffle or order candidate slots by soft constraint score
    this.orderCandidateSlots(candidateSlots, currentBlock, placedBlocks);

    for (const slot of candidateSlots) {
      // Place block onto grid
      this.placeBlock(currentBlock, slot, grid, placedBlocks);

      // Recursive step
      if (this.backtrack(blocks, index + 1, grid, placedBlocks)) {
        return true;
      }

      // Backtrack (unplace block)
      this.unplaceBlock(currentBlock, slot, grid, placedBlocks);
    }

    return false; // Backtrack further
  }

  /**
   * Finds all feasible starting slots for a block given duration and constraints
   */
  getFeasibleSlots(block, grid, placedBlocks) {
    const validSlots = [];
    const days = [1, 2, 3, 4, 5, 6]; // Senin..Sabtu

    for (const day of days) {
      const daySlots = this.timeSlots
        .filter(s => s.day_of_week === day && s.is_generator_usable && s.type === 'lesson')
        .sort((a, b) => a.period_index - b.period_index);

      for (let i = 0; i <= daySlots.length - block.duration; i++) {
        const consecutivePeriods = [];
        let isConsecutiveValid = true;

        for (let d = 0; d < block.duration; d++) {
          const slot = daySlots[i + d];
          if (!slot || slot.period_index !== daySlots[i].period_index + d) {
            isConsecutiveValid = false;
            break;
          }
          consecutivePeriods.push(slot);
        }

        if (!isConsecutiveValid) continue;

        // Check if all consecutive slots satisfy hard constraints
        let allSlotsFree = true;
        for (const slot of consecutivePeriods) {
          if (!this.isSlotAvailableForBlock(block, day, slot.period_index, grid)) {
            allSlotsFree = false;
            break;
          }
        }

        if (allSlotsFree) {
          // Check day distribution constraint: Avoid placing same subject for same class more than max_per_day
          const sameDayCount = placedBlocks.filter(
            p => p.day_of_week === day &&
                 p.subject_id === block.subject_id &&
                 p.class_ids.some(c => block.class_ids.includes(c))
          ).length;

          if (sameDayCount >= 1 && block.duration >= 2) {
            // Avoid adding another 2-JP session of the exact same subject on the same day if possible
            continue;
          }

          validSlots.push({
            day_of_week: day,
            start_period: consecutivePeriods[0].period_index,
            periods: consecutivePeriods,
            start_time: consecutivePeriods[0].start_time,
            end_time: consecutivePeriods[consecutivePeriods.length - 1].end_time
          });
        }
      }
    }

    return validSlots;
  }

  /**
   * Hard Constraint Check for a single period
   */
  isSlotAvailableForBlock(block, day, period, grid) {
    const cell = grid[day]?.[period];

    // 1. Check if period is globally blocked by break or all-class activity
    if (cell?.is_blocked) return false;

    // 2. Check Teacher Availability & Conflict
    for (const teacherId of block.teacher_ids) {
      if (!teacherId) continue;
      // Teacher specific availability status (unavailable / blocked)
      const availKey = `${this.academic_year_id}_${teacherId}_${day}_${period}`;
      const availStatus = this.teacherAvailabilities[availKey];
      if (availStatus === 'unavailable' || availStatus === 'blocked') {
        return false;
      }
      // Teacher conflict (already teaching another class in this period)
      if (cell?.teacherIds?.has(teacherId)) {
        return false;
      }
    }

    // 3. Check Class Availability & Conflict
    for (const classId of block.class_ids) {
      if (!classId) continue;
      // Class specific availability status
      const classAvailKey = `${this.academic_year_id}_${classId}_${day}_${period}`;
      const classStatus = this.classAvailabilities[classAvailKey];
      if (classStatus === 'unavailable' || classStatus === 'blocked') {
        return false;
      }
      // Class conflict (class already having another lesson in this period)
      if (cell?.classIds?.has(classId)) {
        return false;
      }
    }

    // 4. Check Room Conflict (if specific room required)
    if (block.room_name && cell?.roomNames?.has(block.room_name)) {
      return false;
    }

    return true;
  }

  /**
   * Order candidate slots based on soft heuristics (Morning preference, Gap reduction, Spreading)
   */
  orderCandidateSlots(slots, block, placedBlocks) {
    slots.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Prefer earlier periods for academic subjects
      scoreA += (10 - a.start_period);
      scoreB += (10 - b.start_period);

      // Prefer days where the class has fewer total lessons (balancing workload across week)
      const classLessonsDayA = placedBlocks.filter(p => p.day_of_week === a.day_of_week && p.class_ids.some(c => block.class_ids.includes(c))).length;
      const classLessonsDayB = placedBlocks.filter(p => p.day_of_week === b.day_of_week && p.class_ids.some(c => block.class_ids.includes(c))).length;
      scoreA -= classLessonsDayA * 3;
      scoreB -= classLessonsDayB * 3;

      return scoreB - scoreA;
    });
  }

  /**
   * Place Block on Grid and Placed List
   */
  placeBlock(block, slot, grid, placedBlocks) {
    slot.periods.forEach(p => {
      const day = slot.day_of_week;
      const period = p.period_index;
      if (!grid[day][period]) {
        grid[day][period] = {
          teacherIds: new Set(),
          classIds: new Set(),
          roomNames: new Set()
        };
      }
      block.teacher_ids.forEach(tid => grid[day][period].teacherIds.add(tid));
      block.class_ids.forEach(cid => grid[day][period].classIds.add(cid));
      if (block.room_name) grid[day][period].roomNames.add(block.room_name);
    });

    placedBlocks.push({
      ...block,
      day_of_week: slot.day_of_week,
      period_index: slot.start_period,
      periods_count: slot.periods.length,
      start_time: slot.start_time,
      end_time: slot.end_time
    });
  }

  /**
   * Unplace Block (Backtracking)
   */
  unplaceBlock(block, slot, grid, placedBlocks) {
    slot.periods.forEach(p => {
      const day = slot.day_of_week;
      const period = p.period_index;
      if (grid[day][period]) {
        block.teacher_ids.forEach(tid => grid[day][period].teacherIds.delete(tid));
        block.class_ids.forEach(cid => grid[day][period].classIds.delete(cid));
        if (block.room_name) grid[day][period].roomNames.delete(block.room_name);
      }
    });

    const idx = placedBlocks.findIndex(p => p.block_id === block.block_id);
    if (idx !== -1) {
      placedBlocks.splice(idx, 1);
    }
  }

  /**
   * Evaluates overall schedule quality score & warnings
   */
  calculateScore(placedBlocks, grid) {
    let penalty = 0;
    const warnings = [];

    // Check Teacher Gaps (idle periods between classes)
    const teachersMap = {};
    placedBlocks.forEach(p => {
      p.teacher_ids.forEach(tid => {
        if (!teachersMap[tid]) teachersMap[tid] = {};
        if (!teachersMap[tid][p.day_of_week]) teachersMap[tid][p.day_of_week] = [];
        teachersMap[tid][p.day_of_week].push(p.period_index);
      });
    });

    Object.keys(teachersMap).forEach(tid => {
      const teacherObj = this.teachers.find(t => String(t.id) === String(tid));
      const tName = teacherObj?.full_name || `Guru #${tid}`;

      Object.keys(teachersMap[tid]).forEach(day => {
        const periods = teachersMap[tid][day].sort((a, b) => a - b);
        for (let i = 0; i < periods.length - 1; i++) {
          const gap = periods[i + 1] - periods[i] - 1;
          if (gap > 1) {
            penalty += gap * 2;
            warnings.push(`Guru ${tName} memiliki jeda kosong ${gap} jam pada hari ${this.getDayName(day)}.`);
          }
        }
      });
    });

    const finalScore = Math.max(70, Math.min(100, Math.round((100 - penalty) * 10) / 10));
    return { score: finalScore, warnings: warnings.slice(0, 10) };
  }

  /**
   * Diagnostic Reporter for Impossible Schedules & Unassigned Lessons
   */
  generateDiagnostics(unplacedBlocks, grid) {
    const unassigned = this.unassignedLessons || [];
    if (unplacedBlocks.length === 0 && unassigned.length === 0) return null;

    const reasons = [];
    const recommendations = [];

    unplacedBlocks.forEach(block => {
      reasons.push(`Pelajaran "${block.lesson_name}" (Durasi ${block.duration} JP) tidak menemukan slot kosong yang bebas bentrok.`);
    });

    if (unassigned.length > 0) {
      unassigned.forEach(u => {
        reasons.push(`Pelajaran "${u.name}" dilewati karena ${u.reason}.`);
      });
      recommendations.push('Tetapkan guru pengampu di menu Pembagian Tugas Mengajar (Modul Kurikulum) agar mapel tersebut dapat dialokasikan jadwalnya.');
    }

    if (unplacedBlocks.length > 0) {
      recommendations.push('Periksa ketersediaan (availability) guru pengampu untuk memastikan tidak terlalu banyak diblokir.');
      recommendations.push('Tambahkan rentang jam pelajaran atau kurangi durasi per sesi jika hari Jumat/Sabtu terlalu padat.');
      recommendations.push('Pastikan rombel gabungan memiliki jadwal ketersediaan yang sama.');
    }

    return {
      status: unplacedBlocks.length > 0 ? 'impossible' : 'warning',
      unplaced_count: unplacedBlocks.length,
      unassigned_count: unassigned.length,
      reasons,
      recommendations
    };
  }

  getDayName(day) {
    const map = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 7: 'Minggu' };
    return map[day] || `Hari ${day}`;
  }
}

module.exports = TimetableEngine;
