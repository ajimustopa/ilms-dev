/**
 * BlockBuilder
 * Mengubah daftar kontrak pembelajaran (lessons) menjadi blok-blok sesi individual
 * Mendukung ekspansi multi-sesi (misal 4 JP -> 2 blok @ 2 JP) dan penanganan Partial Regeneration / Locked
 */

class BlockBuilder {
  /**
   * @param {Array<Object>} lessons - Daftar lesson dari DB
   * @param {Object} options - { regenerate_mode: 'all' | 'partial', lockedEntries: Array }
   */
  static buildSessionBlocks(lessons = [], options = {}) {
    const blocks = [];
    const unassignedLessons = [];
    let blockCounter = 1;

    // 1. Kelompokkan mapel is_joined_class (1 guru, 1 mapel, multi-rombel belajar bersama)
    // dan is_elective (beberapa guru/mapel berbeda di slot sama per grup paralel)
    const joinedGroups = new Map(); // key: subjectId_teacherId_jointGroup -> lesson
    const normalLessons = [];

    for (const lesson of lessons) {
      if (lesson.is_active === false) continue;
      const isJoined = !!lesson.is_joined_class || (lesson.target_class_ids && lesson.target_class_ids.length > 1 && !lesson.is_elective);
      const isElective = !!lesson.is_elective || !!(lesson.constraints && lesson.constraints.is_elective);

      if (isJoined && !isElective) {
        const teacherKey = (lesson.teacher_ids || []).sort().join('_');
        const jointKey = `${lesson.subject_id}_${teacherKey}`;
        if (!joinedGroups.has(jointKey)) {
          joinedGroups.set(jointKey, {
            ...lesson,
            target_class_ids: [...(lesson.target_class_ids || [])],
            all_lesson_ids: [lesson.id],
            is_joined_class: true
          });
        } else {
          const grp = joinedGroups.get(jointKey);
          (lesson.target_class_ids || []).forEach(cid => {
            if (!grp.target_class_ids.includes(cid)) grp.target_class_ids.push(cid);
          });
          grp.all_lesson_ids.push(lesson.id);
        }
      } else {
        normalLessons.push(lesson);
      }
    }

    const consolidatedLessons = [...normalLessons, ...Array.from(joinedGroups.values())];

    for (const lesson of consolidatedLessons) {
      const totalHours = parseInt(lesson.total_hours_per_week, 10);
      if (isNaN(totalHours) || totalHours <= 0) continue;

      const duration = parseInt(lesson.duration_per_session, 10) || (totalHours >= 2 ? 2 : 1);
      const classIds = Array.isArray(lesson.target_class_ids)
        ? lesson.target_class_ids.map(Number)
        : [];
      const teacherIds = Array.isArray(lesson.teacher_ids)
        ? lesson.teacher_ids.map(Number).filter(Boolean)
        : [];

      const isElective = !!lesson.is_elective || !!(lesson.constraints && lesson.constraints.is_elective);
      const isJoined = !!lesson.is_joined_class;
      const electiveGroupKey = lesson.elective_group_key || lesson.constraints?.elective_group_key || (isElective ? classIds.sort().join('_') : null);

      // Validasi wajib: Lesson tanpa guru tidak dapat dialokasikan jadwalnya
      if (teacherIds.length === 0) {
        unassignedLessons.push({
          id: lesson.id,
          name: lesson.name,
          reason: 'Belum ada guru pengampu yang ditugaskan'
        });
        continue;
      }

      let remainingHours = totalHours;
      while (remainingHours > 0) {
        const currentDuration = Math.min(remainingHours, duration);
        const isElective = !!lesson.is_elective || !!(lesson.constraints && lesson.constraints.is_elective);

        blocks.push({
          block_id: `block_${lesson.id}_${blockCounter++}`,
          lesson_id: lesson.id,
          all_lesson_ids: lesson.all_lesson_ids || [lesson.id],
          subject_id: lesson.subject_id,
          extracurricular_id: lesson.extracurricular_id,
          lesson_name: lesson.name,
          duration: currentDuration,
          primary_class_id: classIds[0] || null,
          class_ids: classIds,
          primary_teacher_id: teacherIds[0] || null,
          teacher_ids: teacherIds,
          room_name: lesson.room_name || '',
          is_joined_class: isJoined || classIds.length > 1,
          is_elective: isElective,
          elective_group_key: electiveGroupKey,
          constraints: lesson.constraints || {},
          is_locked: false
        });

        remainingHours -= currentDuration;
      }
    }

    return {
      blocks,
      unassignedLessons
    };
  }

  /**
   * Inisialisasi Matriks Grid Bersih
   */
  static initGrid() {
    const grid = {};
    for (let d = 1; d <= 7; d++) {
      grid[d] = {};
    }
    return grid;
  }

  /**
   * Menempelkan kegiatan non-KBM (Upacara, Sholat, Istirahat) ke dalam grid
   */
  static applyActivitiesAndBreaks(grid, timeSlots = [], activities = []) {
    // 1. Time slots yang tipenya bukan 'lesson' (misal: 'break', 'activity')
    timeSlots.forEach(slot => {
      if (!slot.is_generator_usable || slot.type === 'break' || slot.type === 'activity') {
        if (!grid[slot.day_of_week][slot.period_index]) {
          grid[slot.day_of_week][slot.period_index] = {
            is_break: slot.type === 'break',
            is_activity: slot.type === 'activity',
            label: slot.label,
            teacherIds: new Set(),
            classIds: new Set(),
            roomNames: new Set()
          };
        }
      }
    });

    // 2. Activities custom yang terdaftar di DB
    activities.forEach(act => {
      if (!act.day_of_week || !act.period_index) return;
      const classIds = Array.isArray(act.target_class_ids) ? act.target_class_ids.map(Number) : [];
      const teacherIds = Array.isArray(act.target_teacher_ids) ? act.target_teacher_ids.map(Number) : [];

      if (!grid[act.day_of_week][act.period_index]) {
        grid[act.day_of_week][act.period_index] = {
          is_activity: true,
          label: act.name,
          teacherIds: new Set(teacherIds.map(String)),
          classIds: new Set(classIds.map(String)),
          roomNames: new Set()
        };
      } else {
        teacherIds.forEach(tid => grid[act.day_of_week][act.period_index].teacherIds.add(String(tid)));
        classIds.forEach(cid => grid[act.day_of_week][act.period_index].classIds.add(String(cid)));
      }
    });
  }

  /**
   * Menempelkan entri yang berstatus is_locked ke dalam grid & placedBlocks
   */
  static applyLockedEntries(grid, lockedEntries = [], placedBlocks = []) {
    lockedEntries.forEach(entry => {
      const day = entry.day_of_week;
      const period = entry.period_index;
      if (!grid[day]) grid[day] = {};

      const teacherIds = Array.isArray(entry.team_teacher_ids)
        ? entry.team_teacher_ids.map(Number)
        : (entry.teacher_employee_id ? [Number(entry.teacher_employee_id)] : []);
      const classIds = Array.isArray(entry.joined_class_group_ids)
        ? entry.joined_class_group_ids.map(Number)
        : (entry.class_group_id ? [Number(entry.class_group_id)] : []);

      grid[day][period] = {
        is_locked: true,
        lessonId: entry.lesson_id,
        teacherIds: new Set(teacherIds.map(String)),
        classIds: new Set(classIds.map(String)),
        roomNames: new Set(entry.room_name ? [entry.room_name] : []),
        is_elective: !!entry.is_elective
      };

      placedBlocks.push({
        block_id: `locked_${entry.id || Math.random()}`,
        lesson_id: entry.lesson_id,
        day_of_week: day,
        period_index: period,
        start_time: entry.start_time,
        end_time: entry.end_time,
        duration: 1,
        primary_class_id: classIds[0] || null,
        class_ids: classIds,
        primary_teacher_id: teacherIds[0] || null,
        teacher_ids: teacherIds,
        room_name: entry.room_name || '',
        is_locked: true
      });
    });
  }
}

module.exports = BlockBuilder;
