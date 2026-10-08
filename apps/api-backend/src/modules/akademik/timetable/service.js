/**
 * Timetable Service Implementation
 * Handles Timetable Structure (TimeSlots), Availabilities, Lessons, Activities, Runs, Conflict Check, and Publishing
 */
const db = require('../../../config/db/akademik');
const TimetableEngine = require('./engine/TimetableEngine');
const employeesService = require('../../kepegawaian/employees/service');

class TimetableService {
  // ==========================================
  // 1. Time Slots & Period Structure
  // ==========================================
  async listTimeSlots(query = {}) {
    const { satuan_pendidikan_id, academic_year_id, preset_id } = query;
    let baseQuery = db('timetable_time_slots');

    if (satuan_pendidikan_id) {
      baseQuery = baseQuery.where({ satuan_pendidikan_id });
    }

    if (academic_year_id) {
      if (!satuan_pendidikan_id) {
        // Mode Semua Unit: Ambil semua ID tahun ajaran dengan nama tahun ajaran yang sama
        const refYear = await db('academic_years').where({ id: academic_year_id }).first();
        if (refYear && refYear.name) {
          const matchingYears = await db('academic_years').where({ name: refYear.name });
          const matchingYearIds = matchingYears.map(y => y.id);
          baseQuery = baseQuery.whereIn('academic_year_id', matchingYearIds);
        } else {
          baseQuery = baseQuery.where({ academic_year_id });
        }
      } else {
        baseQuery = baseQuery.where({ academic_year_id });
      }
    }

    if (preset_id) {
      baseQuery = baseQuery.where({ preset_id });
    }

    const list = await baseQuery.orderBy([
      { column: 'day_of_week', order: 'asc' },
      { column: 'start_time', order: 'asc' },
      { column: 'period_index', order: 'asc' }
    ]);

    // Jika mode Semua Unit, satukan slot yang memiliki hari dan start_time yang sama agar grid matriks rapi
    if (!satuan_pendidikan_id) {
      const seen = new Set();
      const unifiedList = [];
      for (const slot of list) {
        const key = `${slot.day_of_week}_${(slot.start_time || '').substring(0, 5)}_${slot.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          unifiedList.push(slot);
        }
      }
      return unifiedList;
    }

    return list;
  }

  async initializeDefaultTimeSlots(satuan_pendidikan_id, academic_year_id) {
    const days = [1, 2, 3, 4, 5, 6]; // Senin..Sabtu
    const standardPeriods = [
      { period: 1, start: '07:30', end: '08:15', type: 'lesson', label: 'Jam Ke-1' },
      { period: 2, start: '08:15', end: '09:00', type: 'lesson', label: 'Jam Ke-2' },
      { period: 3, start: '09:00', end: '09:45', type: 'lesson', label: 'Jam Ke-3' },
      { period: 4, start: '09:45', end: '10:00', type: 'break', label: 'Istirahat Pagi', is_generator_usable: false },
      { period: 5, start: '10:00', end: '10:45', type: 'lesson', label: 'Jam Ke-4' },
      { period: 6, start: '10:45', end: '11:30', type: 'lesson', label: 'Jam Ke-5' },
      { period: 7, start: '11:30', end: '12:30', type: 'activity', label: 'Sholat Dzuhur & Makan', is_generator_usable: false },
      { period: 8, start: '12:30', end: '13:15', type: 'lesson', label: 'Jam Ke-6' },
      { period: 9, start: '13:15', end: '14:00', type: 'lesson', label: 'Jam Ke-7' }
    ];

    const inserts = [];
    for (const d of days) {
      const dayPeriods = d === 5 ? standardPeriods.slice(0, 6) : standardPeriods; // Jumat 5 JP
      for (const p of dayPeriods) {
        inserts.push({
          satuan_pendidikan_id,
          academic_year_id,
          day_of_week: d,
          period_index: p.period,
          start_time: p.start,
          end_time: p.end,
          type: p.type,
          label: p.label,
          is_generator_usable: p.is_generator_usable !== false,
          is_visible: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }

    await db('timetable_time_slots').insert(inserts);
    return this.listTimeSlots({ satuan_pendidikan_id, academic_year_id });
  }

  async saveTimeSlot(payload) {
    const { id, ...data } = payload;
    if (id) {
      await db('timetable_time_slots').where({ id }).update({ ...data, updated_at: db.fn.now() });
      return db('timetable_time_slots').where({ id }).first();
    }
    const [newId] = await db('timetable_time_slots').insert({ ...data, created_at: db.fn.now(), updated_at: db.fn.now() });
    return db('timetable_time_slots').where({ id: newId }).first();
  }

  async copyTimeSlots(payload) {
    const {
      source_satuan_pendidikan_id,
      source_academic_year_id,
      source_preset_id,
      target_satuan_pendidikan_id,
      target_academic_year_id,
      target_preset_id,
      replace_existing = true
    } = payload;

    if (!source_academic_year_id || !target_academic_year_id) {
      const error = new Error('Tahun ajaran sumber dan target wajib dipilih');
      error.statusCode = 422;
      throw error;
    }

    // 1. Ambil time slots dari sumber
    let srcQuery = db('timetable_time_slots')
      .where('academic_year_id', source_academic_year_id);
    
    if (source_satuan_pendidikan_id) {
      srcQuery = srcQuery.where('satuan_pendidikan_id', source_satuan_pendidikan_id);
    }

    if (source_preset_id) {
      srcQuery = srcQuery.where('preset_id', source_preset_id);
    }

    let sourceSlots = await srcQuery.orderBy([
      { column: 'day_of_week', order: 'asc' },
      { column: 'period_index', order: 'asc' }
    ]);

    // Fallback cerdas: jika tidak spesifik preset_id dan hasil kosong pada query awal, cari slot dari preset yang ada pada tahun & unit sumber
    if (sourceSlots.length === 0 && !source_preset_id) {
      let fallbackQuery = db('timetable_time_slots').where('academic_year_id', source_academic_year_id);
      if (source_satuan_pendidikan_id) fallbackQuery = fallbackQuery.where('satuan_pendidikan_id', source_satuan_pendidikan_id);
      sourceSlots = await fallbackQuery.orderBy([
        { column: 'day_of_week', order: 'asc' },
        { column: 'period_index', order: 'asc' }
      ]);
    }

    if (sourceSlots.length === 0) {
      const error = new Error('Tidak ada struktur rentang waktu yang ditemukan pada tahun ajaran / jadwal sumber yang dipilih.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Jika replace_existing = true, bersihkan struktur waktu target terlebih dahulu
    if (replace_existing) {
      let delQuery = db('timetable_time_slots')
        .where('academic_year_id', target_academic_year_id);
      
      if (target_satuan_pendidikan_id) {
        delQuery = delQuery.where('satuan_pendidikan_id', target_satuan_pendidikan_id);
      }
      if (target_preset_id) {
        delQuery = delQuery.where('preset_id', target_preset_id);
      } else {
        delQuery = delQuery.whereNull('preset_id');
      }
      await delQuery.del();
    }

    // 3. Masukkan hasil salinan ke target
    const inserts = sourceSlots.map(s => ({
      satuan_pendidikan_id: target_satuan_pendidikan_id || s.satuan_pendidikan_id,
      academic_year_id: target_academic_year_id,
      preset_id: target_preset_id || null,
      day_of_week: s.day_of_week,
      period_index: s.period_index,
      start_time: s.start_time,
      end_time: s.end_time,
      type: s.type,
      label: s.label,
      color: s.color || null,
      is_generator_usable: s.is_generator_usable,
      is_visible: s.is_visible,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }));

    await db('timetable_time_slots').insert(inserts);

    return {
      success: true,
      copied_count: inserts.length,
      message: `Berhasil menyalin ${inserts.length} rentang waktu struktur harian!`
    };
  }

  async deleteTimeSlot(id) {
    await db('timetable_time_slots').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 2. Teacher & Class Availabilities
  // ==========================================
  async getTeacherAvailabilities(academic_year_id, teacher_employee_id) {
    let q = db('timetable_teacher_availabilities').where({ academic_year_id });
    if (teacher_employee_id) q = q.where({ teacher_employee_id });
    return q;
  }

  async bulkSaveTeacherAvailabilities(payload) {
    const { academic_year_id, satuan_pendidikan_id, teacher_employee_id, items } = payload;
    // items: [ { day_of_week, period_index, status, notes } ]
    for (const item of items) {
      const existing = await db('timetable_teacher_availabilities').where({
        academic_year_id,
        teacher_employee_id,
        day_of_week: item.day_of_week,
        period_index: item.period_index
      }).first();

      if (existing) {
        await db('timetable_teacher_availabilities').where({ id: existing.id }).update({
          status: item.status,
          notes: item.notes || null,
          updated_at: db.fn.now()
        });
      } else {
        await db('timetable_teacher_availabilities').insert({
          satuan_pendidikan_id,
          academic_year_id,
          teacher_employee_id,
          day_of_week: item.day_of_week,
          period_index: item.period_index,
          status: item.status,
          notes: item.notes || null,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }
    return { success: true };
  }

  async getClassAvailabilities(academic_year_id, class_group_id) {
    let q = db('timetable_class_availabilities').where({ academic_year_id });
    if (class_group_id) q = q.where({ class_group_id });
    return q;
  }

  async bulkSaveClassAvailabilities(payload) {
    const { academic_year_id, satuan_pendidikan_id, class_group_id, items } = payload;
    for (const item of items) {
      const existing = await db('timetable_class_availabilities').where({
        academic_year_id,
        class_group_id,
        day_of_week: item.day_of_week,
        period_index: item.period_index
      }).first();

      if (existing) {
        await db('timetable_class_availabilities').where({ id: existing.id }).update({
          status: item.status,
          notes: item.notes || null,
          updated_at: db.fn.now()
        });
      } else {
        await db('timetable_class_availabilities').insert({
          satuan_pendidikan_id,
          academic_year_id,
          class_group_id,
          day_of_week: item.day_of_week,
          period_index: item.period_index,
          status: item.status,
          notes: item.notes || null,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }
    return { success: true };
  }

  // ==========================================
  // 3. Lessons / Workload Units
  // ==========================================
  async listLessons(query = {}) {
    const { satuan_pendidikan_id, academic_year_id } = query;
    let baseQuery = db('timetable_lessons')
      .leftJoin('subjects', 'timetable_lessons.subject_id', 'subjects.id')
      .leftJoin('extracurriculars', 'timetable_lessons.extracurricular_id', 'extracurriculars.id')
      .select(
        'timetable_lessons.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'subjects.is_elective as subject_is_elective',
        'extracurriculars.name as extra_name'
      );

    if (satuan_pendidikan_id) baseQuery = baseQuery.where('timetable_lessons.satuan_pendidikan_id', satuan_pendidikan_id);
    if (academic_year_id) baseQuery = baseQuery.where('timetable_lessons.academic_year_id', academic_year_id);
    baseQuery = baseQuery.where('timetable_lessons.total_hours_per_week', '>', 0);

    const lessons = await baseQuery.orderBy('timetable_lessons.id', 'desc');

    // Parse JSON fields
    return lessons.map(l => ({
      ...l,
      is_elective: Boolean(l.is_elective || l.subject_is_elective),
      target_class_ids: typeof l.target_class_ids === 'string' ? JSON.parse(l.target_class_ids) : l.target_class_ids,
      teacher_ids: typeof l.teacher_ids === 'string' ? JSON.parse(l.teacher_ids) : l.teacher_ids,
      constraints: typeof l.constraints === 'string' ? JSON.parse(l.constraints) : l.constraints
    }));
  }

  async saveLesson(payload) {
    const { id, target_class_ids, teacher_ids, constraints, ...rest } = payload;
    const jsonTargetClasses = JSON.stringify(target_class_ids || []);
    const jsonTeacherIds = JSON.stringify(teacher_ids || []);
    const jsonConstraints = constraints ? JSON.stringify(constraints) : null;

    if (id) {
      await db('timetable_lessons').where({ id }).update({
        ...rest,
        target_class_ids: jsonTargetClasses,
        teacher_ids: jsonTeacherIds,
        constraints: jsonConstraints,
        updated_at: db.fn.now()
      });
      return db('timetable_lessons').where({ id }).first();
    }

    const [newId] = await db('timetable_lessons').insert({
      ...rest,
      target_class_ids: jsonTargetClasses,
      teacher_ids: jsonTeacherIds,
      constraints: jsonConstraints,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('timetable_lessons').where({ id: newId }).first();
  }

  async deleteLesson(id) {
    await db('timetable_lessons').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  /**
   * Syncs workload automatically from curriculum_structures and subject_teacher_assignments
   * Mendukung alokasi JP dari Struktur Kurikulum dan validasi apakah guru sudah ditugaskan
   */
  async syncLessonsFromTeachingDuties(satuan_pendidikan_id, academic_year_id) {
    // 1. Ambil seluruh rombel reguler aktif di satuan pendidikan
    let cgQuery = db('class_groups').where({ satuan_pendidikan_id });
    if (academic_year_id) cgQuery = cgQuery.where(q => q.where({ academic_year_id }).orWhereNull('academic_year_id'));
    const classGroups = await cgQuery.whereNot('type', 'ekstrakurikuler');

    // 2. Ambil seluruh mata pelajaran aktif
    const subjects = await db('subjects')
      .where({ satuan_pendidikan_id, is_active: true });
    const subjectMap = {};
    subjects.forEach(s => { subjectMap[s.id] = s; });

    // 3. Ambil seluruh penugasan guru (tugas mengajar) aktif
    const duties = await db('subject_teacher_assignments')
      .where({
        satuan_pendidikan_id,
        academic_year_id,
        is_active: true
      });

    const dutyMap = {}; // `${class_group_id}_${subject_id}` -> [duty1, duty2, ...]
    const globalSubjectDutyMap = {}; // `${subject_id}` -> [duty1, duty2, ...] (Penugasan global/tanpa rombel spesifik/mapel pilihan)

    duties.forEach(d => {
      if (d.type === 'mapel' && d.subject_id) {
        if (d.class_group_id) {
          const key = `${d.class_group_id}_${d.subject_id}`;
          if (!dutyMap[key]) dutyMap[key] = [];
          dutyMap[key].push(d);
        } else {
          // Penugasan Global (misal: Mapel Pilihan yang ditugaskan ke guru untuk seluruh rombel sasaran)
          const gKey = `${d.subject_id}`;
          if (!globalSubjectDutyMap[gKey]) globalSubjectDutyMap[gKey] = [];
          globalSubjectDutyMap[gKey].push(d);
        }
      }
    });

    // 4. Ambil struktur kurikulum acuan JP per tingkat kelas
    const currStructures = await db('curriculum_structures')
      .where({ satuan_pendidikan_id, academic_year_id });

    const structMap = {};
    currStructures.forEach(cs => {
      structMap[`${cs.grade_level_id}_${cs.subject_id}`] = cs;
    });

    // 4b. Bersihkan lesson usang (stale lessons) di timetable_lessons yang subject_id-nya sudah tidak aktif/dihapus
    const activeSubjectIds = subjects.map(s => s.id);
    if (activeSubjectIds.length > 0) {
      await db('timetable_lessons')
        .where({ satuan_pendidikan_id, academic_year_id, type: 'mapel' })
        .whereNotIn('subject_id', activeSubjectIds)
        .del();
    }

    let syncedCount = 0;
    let readyCount = 0;
    let unassignedCount = 0;

    // 5. Group Rombel Gabungan duties
    const jointDutiesMap = {}; // joint_group_id -> [duties]
    const processedJointCgSubKeys = new Set(); // `${cgId}_${subId}`

    duties.forEach(d => {
      if (d.type === 'mapel' && (d.is_joined_class || d.joint_group_id) && d.joint_group_id) {
        if (!jointDutiesMap[d.joint_group_id]) jointDutiesMap[d.joint_group_id] = [];
        jointDutiesMap[d.joint_group_id].push(d);
      }
    });

    for (const [jointGroupId, jDuties] of Object.entries(jointDutiesMap)) {
      if (jDuties.length === 0) continue;
      const firstDuty = jDuties[0];
      const sub = subjectMap[firstDuty.subject_id];
      if (!sub) continue;

      const targetClassIds = Array.from(new Set(jDuties.map(d => d.class_group_id).filter(Boolean)));
      if (targetClassIds.length <= 1) continue;

      targetClassIds.forEach(cid => processedJointCgSubKeys.add(`${cid}_${sub.id}`));

      const teacherIds = Array.from(new Set(jDuties.map(d => d.teacher_employee_id).filter(Boolean)));
      const classNames = classGroups.filter(cg => targetClassIds.includes(cg.id)).map(cg => cg.name).join(', ');

      const firstCg = classGroups.find(cg => cg.id === targetClassIds[0]);
      const structKey = firstCg ? `${firstCg.grade_level_id}_${sub.id}` : null;
      const struct = structKey ? structMap[structKey] : null;
      const hoursPerWeek = struct?.hours_per_week !== undefined ? Number(struct.hours_per_week) : (firstDuty.allocated_hours || 2);
      const sessionDuration = struct?.session_duration || (hoursPerWeek >= 2 ? 2 : 1);

      const lessonName = `${sub.name} (Rombel Gabungan: ${classNames})`;

      const existingJoint = await db('timetable_lessons').where({
        satuan_pendidikan_id,
        academic_year_id,
        type: 'mapel',
        subject_id: sub.id,
        is_joined_class: true
      })
      .whereRaw(`JSON_CONTAINS(target_class_ids, '${JSON.stringify(targetClassIds)}')`)
      .first();

      if (!existingJoint) {
        await db('timetable_lessons').insert({
          satuan_pendidikan_id,
          academic_year_id,
          type: 'mapel',
          subject_id: sub.id,
          extracurricular_id: null,
          name: lessonName,
          total_hours_per_week: hoursPerWeek,
          duration_per_session: sessionDuration,
          target_class_ids: JSON.stringify(targetClassIds),
          teacher_ids: JSON.stringify(teacherIds),
          is_joined_class: true,
          is_active: teacherIds.length > 0,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      } else {
        await db('timetable_lessons').where({ id: existingJoint.id }).update({
          name: lessonName,
          total_hours_per_week: hoursPerWeek,
          duration_per_session: sessionDuration,
          target_class_ids: JSON.stringify(targetClassIds),
          teacher_ids: JSON.stringify(teacherIds),
          is_joined_class: true,
          is_active: teacherIds.length > 0,
          updated_at: db.fn.now()
        });
      }
      syncedCount++;
      if (teacherIds.length > 0) readyCount++;
      else unassignedCount++;
    }

    // A. Sinkronisasi Pembelajaran Mata Pelajaran (Per Rombel x Mapel yang memiliki JP di Struktur Kurikulum)
    for (const cg of classGroups) {
      for (const sub of subjects) {
        if (processedJointCgSubKeys.has(`${cg.id}_${sub.id}`)) {
          continue; // Ditangani oleh Rombel Gabungan
        }
        // Jika sub-mapel dengan mode JP inklud ke mapel induk, jangan buat timetable lesson terpisah
        if (sub.parent_subject_id && sub.jp_allocation_mode === 'included_in_parent') {
          continue;
        }

        const structKey = `${cg.grade_level_id}_${sub.id}`;
        const struct = structMap[structKey];
        const isElective = sub.is_elective == 1 || sub.is_elective === true || sub.is_elective === '1';

        // Untuk mapel pilihan, jika di struktur kurikulum belum diatur JP-nya secara eksplisit, gunakan alokasi default 2 JP
        let hoursPerWeek = struct?.hours_per_week !== undefined ? Number(struct.hours_per_week) : (isElective ? 2 : 0);

        if (hoursPerWeek <= 0) {
          // Hapus dari timetable_lessons jika sebelumnya terlanjur ada mapel dengan 0 JP
          await db('timetable_lessons').where({
            satuan_pendidikan_id,
            academic_year_id,
            type: 'mapel',
            subject_id: sub.id
          })
          .whereRaw(`JSON_CONTAINS(target_class_ids, '${JSON.stringify([cg.id])}')`)
          .del();
          continue;
        }

        const dutyKey = `${cg.id}_${sub.id}`;
        // Prioritaskan penugasan spesifik rombel, jika tidak ada fallback ke penugasan global subject (misal mapel pilihan)
        const matchingDuties = (dutyMap[dutyKey] && dutyMap[dutyKey].length > 0)
          ? dutyMap[dutyKey]
          : (globalSubjectDutyMap[String(sub.id)] || []);

        const targetClassIds = [cg.id];

        if (matchingDuties.length <= 1) {
          // 0 atau 1 Guru Pengampu Tunggal
          const duty = matchingDuties[0] || null;
          const hasTeacher = Boolean(duty && duty.teacher_employee_id);
          const teacherIds = hasTeacher ? [duty.teacher_employee_id] : [];
          const allocatedJp = (duty && duty.allocated_hours) ? duty.allocated_hours : hoursPerWeek;
          const sessionDuration = struct?.session_duration || (allocatedJp >= 2 ? 2 : 1);

          // Cek apakah sudah ada lesson di timetable_lessons
          const existing = await db('timetable_lessons').where({
            satuan_pendidikan_id,
            academic_year_id,
            type: 'mapel',
            subject_id: sub.id
          })
          .whereRaw(`JSON_CONTAINS(target_class_ids, '${JSON.stringify(targetClassIds)}')`)
          .first();

          if (!existing) {
            await db('timetable_lessons').insert({
              satuan_pendidikan_id,
              academic_year_id,
              type: 'mapel',
              subject_id: sub.id,
              extracurricular_id: null,
              name: `${sub.name} (${cg.name})`,
              total_hours_per_week: allocatedJp,
              duration_per_session: sessionDuration,
              target_class_ids: JSON.stringify(targetClassIds),
              teacher_ids: JSON.stringify(teacherIds),
              is_joined_class: false,
              is_active: hasTeacher,
              created_at: db.fn.now(),
              updated_at: db.fn.now()
            });
          } else {
            await db('timetable_lessons').where({ id: existing.id }).update({
              name: `${sub.name} (${cg.name})`,
              total_hours_per_week: allocatedJp,
              duration_per_session: sessionDuration,
              teacher_ids: JSON.stringify(teacherIds),
              is_active: hasTeacher,
              updated_at: db.fn.now()
            });
          }
          syncedCount++;
          if (hasTeacher) readyCount++;
          else unassignedCount++;
        } else {
          // 2 Guru atau Lebih (Pembagian JP / Team Teaching)
          // Hapus lesson single lama jika ada
          await db('timetable_lessons').where({
            satuan_pendidikan_id,
            academic_year_id,
            type: 'mapel',
            subject_id: sub.id,
            name: `${sub.name} (${cg.name})`
          })
          .whereRaw(`JSON_CONTAINS(target_class_ids, '${JSON.stringify(targetClassIds)}')`)
          .del();

          for (let idx = 0; idx < matchingDuties.length; idx++) {
            const duty = matchingDuties[idx];
            const teacherId = duty.teacher_employee_id;
            const teacherJp = duty.allocated_hours ? parseInt(duty.allocated_hours, 10) : Math.floor(hoursPerWeek / matchingDuties.length);
            const sessionDuration = Math.min(teacherJp, struct?.session_duration || 2);

            let teacherName = `Guru ${idx + 1}`;
            try {
              const emp = await employeesService.getEmployeeById(teacherId);
              if (emp?.full_name) teacherName = emp.full_name;
            } catch (e) {}

            const lessonName = `${sub.name} - ${teacherName} (${cg.name})`;
            const existingSplit = await db('timetable_lessons').where({
              satuan_pendidikan_id,
              academic_year_id,
              type: 'mapel',
              subject_id: sub.id,
              name: lessonName
            })
            .whereRaw(`JSON_CONTAINS(target_class_ids, '${JSON.stringify(targetClassIds)}')`)
            .first();

            if (!existingSplit) {
              await db('timetable_lessons').insert({
                satuan_pendidikan_id,
                academic_year_id,
                type: 'mapel',
                subject_id: sub.id,
                extracurricular_id: null,
                name: lessonName,
                total_hours_per_week: teacherJp,
                duration_per_session: sessionDuration,
                target_class_ids: JSON.stringify(targetClassIds),
                teacher_ids: JSON.stringify([teacherId]),
                is_joined_class: false,
                is_active: true,
                created_at: db.fn.now(),
                updated_at: db.fn.now()
              });
            } else {
              await db('timetable_lessons').where({ id: existingSplit.id }).update({
                total_hours_per_week: teacherJp,
                duration_per_session: sessionDuration,
                teacher_ids: JSON.stringify([teacherId]),
                is_active: true,
                updated_at: db.fn.now()
              });
            }
            syncedCount++;
            readyCount++;
          }
        }
      }
    }

    // B. Sinkronisasi Ekstrakurikuler dari Pembagian Tugas Mengajar
    const extraDuties = duties.filter(d => d.type === 'ekskul' && d.extracurricular_id);
    for (const ed of extraDuties) {
      const ex = await db('extracurriculars').where({ id: ed.extracurricular_id }).first();
      if (!ex) continue;
      const targetClassIds = ed.class_group_id ? [ed.class_group_id] : [];
      const teacherIds = ed.teacher_employee_id ? [ed.teacher_employee_id] : [];
      const hoursPerWeek = ed.allocated_hours || 2;

      const existing = await db('timetable_lessons').where({
        satuan_pendidikan_id,
        academic_year_id,
        type: 'ekskul',
        extracurricular_id: ed.extracurricular_id
      })
      .whereRaw(`JSON_CONTAINS(target_class_ids, '${JSON.stringify(targetClassIds)}')`)
      .first();

      if (!existing) {
        await db('timetable_lessons').insert({
          satuan_pendidikan_id,
          academic_year_id,
          type: 'ekskul',
          subject_id: null,
          extracurricular_id: ed.extracurricular_id,
          name: `${ex.name} ${ed.class_group_id ? `(Kelas #${ed.class_group_id})` : ''}`,
          total_hours_per_week: hoursPerWeek,
          duration_per_session: hoursPerWeek,
          target_class_ids: JSON.stringify(targetClassIds),
          teacher_ids: JSON.stringify(teacherIds),
          is_joined_class: false,
          is_active: teacherIds.length > 0,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        syncedCount++;
      } else {
        await db('timetable_lessons').where({ id: existing.id }).update({
          teacher_ids: JSON.stringify(teacherIds),
          total_hours_per_week: hoursPerWeek,
          is_active: teacherIds.length > 0,
          updated_at: db.fn.now()
        });
      }
    }

    return {
      synced_count: syncedCount,
      ready_count: readyCount,
      unassigned_count: unassignedCount
    };
  }

  // ==========================================
  // 4. Non-Lesson Activities
  // ==========================================
  async listActivities(query = {}) {
    const { satuan_pendidikan_id, academic_year_id } = query;
    let q = db('timetable_activities');
    if (satuan_pendidikan_id) q = q.where({ satuan_pendidikan_id });
    if (academic_year_id) q = q.where({ academic_year_id });
    const acts = await q.orderBy('day_of_week', 'asc');
    return acts.map(a => ({
      ...a,
      target_class_ids: typeof a.target_class_ids === 'string' ? JSON.parse(a.target_class_ids) : a.target_class_ids,
      target_teacher_ids: typeof a.target_teacher_ids === 'string' ? JSON.parse(a.target_teacher_ids) : a.target_teacher_ids
    }));
  }

  async saveActivity(payload) {
    const { id, target_class_ids, target_teacher_ids, ...rest } = payload;
    const jsonClasses = target_class_ids ? JSON.stringify(target_class_ids) : null;
    const jsonTeachers = target_teacher_ids ? JSON.stringify(target_teacher_ids) : null;

    if (id) {
      await db('timetable_activities').where({ id }).update({
        ...rest,
        target_class_ids: jsonClasses,
        target_teacher_ids: jsonTeachers,
        updated_at: db.fn.now()
      });
      return db('timetable_activities').where({ id }).first();
    }
    const [newId] = await db('timetable_activities').insert({
      ...rest,
      target_class_ids: jsonClasses,
      target_teacher_ids: jsonTeachers,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return db('timetable_activities').where({ id: newId }).first();
  }

  async deleteActivity(id) {
    await db('timetable_activities').where({ id }).del();
    return { id: Number(id), deleted: true };
  }

  // ==========================================
  // 5. Automated Timetable Generator Engine Run
  // ==========================================
  async runGenerator(payload, user = null) {
    const { satuan_pendidikan_id, academic_year_id, name, options = {} } = payload;

    // 1. Dapatkan seluruh academic_year_id yang bersesuaian (misal nama tahun ajaran '2026/2027' pada unit 1 & unit 2)
    const currentYear = await db('academic_years').where({ id: academic_year_id }).first();
    let targetYearIds = [academic_year_id];
    if (currentYear) {
      const matchedYears = await db('academic_years').where({ name: currentYear.name });
      targetYearIds = matchedYears.map(y => y.id);
    }

    // Gather all required datasets in memory (Termasuk seluruh unit SMP + SMA untuk single integrated grid)
    const [timeSlots, lessons, teacherAvails, classAvails, activities, classes, employees] = await Promise.all([
      this.listTimeSlots({ academic_year_id }),
      db('timetable_lessons').whereIn('academic_year_id', targetYearIds).where('total_hours_per_week', '>', 0),
      db('timetable_teacher_availabilities').whereIn('academic_year_id', targetYearIds),
      db('timetable_class_availabilities').whereIn('academic_year_id', targetYearIds),
      db('timetable_activities').whereIn('academic_year_id', targetYearIds),
      db('class_groups').whereIn('academic_year_id', targetYearIds),
      employeesService.listEmployees({ per_page: 500 }).catch(() => ({ data: [] }))
    ]);

    const regularClassIds = new Set(classes.filter(c => !c.type || c.type === 'reguler').map(c => c.id));
    const targetLessons = lessons.map(l => ({
      ...l,
      is_elective: Boolean(l.is_elective || (l.constraints && JSON.parse(typeof l.constraints === 'string' ? l.constraints : '{}')?.is_elective)),
      target_class_ids: typeof l.target_class_ids === 'string' ? JSON.parse(l.target_class_ids) : l.target_class_ids,
      teacher_ids: typeof l.teacher_ids === 'string' ? JSON.parse(l.teacher_ids) : l.teacher_ids,
      constraints: typeof l.constraints === 'string' ? JSON.parse(l.constraints) : l.constraints
    })).filter(l => {
      if (l.type === 'ekskul' || l.extracurricular_id) return false;
      const cids = Array.isArray(l.target_class_ids) ? l.target_class_ids : [];
      return cids.some(cid => regularClassIds.has(Number(cid)));
    });

    const teacherAvailMap = {};
    teacherAvails.forEach(a => {
      teacherAvailMap[`${a.teacher_employee_id}_${a.day_of_week}_${a.period_index}`] = a.status;
    });

    const classAvailMap = {};
    classAvails.forEach(a => {
      classAvailMap[`${a.class_group_id}_${a.day_of_week}_${a.period_index}`] = a.status;
    });

    const teachersList = employees?.data?.items || (Array.isArray(employees?.data) ? employees.data : []);

    // 2. Initialize and Run Engine
    const engine = new TimetableEngine({
      satuan_pendidikan_id,
      academic_year_id,
      timeSlots,
      lessons: targetLessons,
      teacherAvailabilities: teacherAvailMap,
      classAvailabilities: classAvailMap,
      activities,
      classes,
      teachers: teachersList,
      options
    });

    const result = engine.generate();

    // 3. Save Timetable Run Result
    const runName = name || `Generate Otomatis #${new Date().toLocaleTimeString('id-ID')}`;
    const [runId] = await db('timetable_runs').insert({
      satuan_pendidikan_id,
      academic_year_id,
      name: runName,
      status: result.success ? 'review' : 'draft',
      score: result.score,
      total_lessons_count: result.total_lessons,
      placed_lessons_count: result.placed_lessons,
      conflicts_count: result.conflicts_count,
      warnings_count: result.warnings_count,
      diagnostics: result.diagnostics ? JSON.stringify(result.diagnostics) : null,
      created_by: user?.username || user?.full_name || 'Admin',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // 4. Save Timetable Entries
    if (result.entries && result.entries.length > 0) {
      const entryInserts = result.entries.map(e => ({
        timetable_run_id: runId,
        lesson_id: e.lesson_id,
        day_of_week: e.day_of_week,
        period_index: e.period_index,
        start_time: e.start_time,
        end_time: e.end_time,
        class_group_id: e.class_group_id,
        teacher_employee_id: e.teacher_employee_id,
        subject_id: e.subject_id,
        extracurricular_id: e.extracurricular_id,
        room_name: e.room_name,
        is_locked: e.is_locked,
        is_joined_class: e.is_joined_class,
        joined_class_group_ids: e.joined_class_group_ids ? JSON.stringify(e.joined_class_group_ids) : null,
        team_teacher_ids: e.team_teacher_ids ? JSON.stringify(e.team_teacher_ids) : null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }));

      await db('timetable_entries').insert(entryInserts);
    }

    return {
      run_id: runId,
      ...result
    };
  }

  // ==========================================
  // 6. Timetable Runs & Entries Management
  // ==========================================
  async listRuns(query = {}) {
    const { satuan_pendidikan_id, academic_year_id } = query;
    let q = db('timetable_runs');
    if (satuan_pendidikan_id) q = q.where({ satuan_pendidikan_id });
    if (academic_year_id) q = q.where({ academic_year_id });
    const runs = await q.orderBy('id', 'desc');
    return runs.map(r => ({
      ...r,
      diagnostics: typeof r.diagnostics === 'string' ? JSON.parse(r.diagnostics) : r.diagnostics
    }));
  }

  async getRunById(runId) {
    const run = await db('timetable_runs').where({ id: runId }).first();
    if (!run) return null;

    const rawEntries = await db('timetable_entries')
      .leftJoin('subjects', 'timetable_entries.subject_id', 'subjects.id')
      .leftJoin('extracurriculars', 'timetable_entries.extracurricular_id', 'extracurriculars.id')
      .leftJoin('class_groups', 'timetable_entries.class_group_id', 'class_groups.id')
      .where({ timetable_run_id: runId })
      .select(
        'timetable_entries.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'extracurriculars.name as extra_name',
        'class_groups.name as class_group_name'
      );

    const entries = rawEntries.map(e => ({
      ...e,
      joined_class_group_ids: typeof e.joined_class_group_ids === 'string' ? JSON.parse(e.joined_class_group_ids) : e.joined_class_group_ids,
      team_teacher_ids: typeof e.team_teacher_ids === 'string' ? JSON.parse(e.team_teacher_ids) : e.team_teacher_ids
    }));

    return {
      ...run,
      diagnostics: typeof run.diagnostics === 'string' ? JSON.parse(run.diagnostics) : run.diagnostics,
      entries
    };
  }

  async swapEntries(payload, user = null) {
    const { entry_id_1, entry_id_2, reason } = payload;
    const e1 = await db('timetable_entries').where({ id: entry_id_1 }).first();
    const e2 = await db('timetable_entries').where({ id: entry_id_2 }).first();
    if (!e1 || !e2) throw new Error('Entri jadwal tidak ditemukan');

    await db('timetable_entries').where({ id: entry_id_1 }).update({
      day_of_week: e2.day_of_week,
      period_index: e2.period_index,
      start_time: e2.start_time,
      end_time: e2.end_time,
      updated_at: db.fn.now()
    });

    await db('timetable_entries').where({ id: entry_id_2 }).update({
      day_of_week: e1.day_of_week,
      period_index: e1.period_index,
      start_time: e1.start_time,
      end_time: e1.end_time,
      updated_at: db.fn.now()
    });

    return { success: true };
  }

  async updateEntry(id, payload, user = null) {
    await db('timetable_entries').where({ id }).update({
      ...payload,
      updated_at: db.fn.now()
    });
    return db('timetable_entries').where({ id }).first();
  }

  async publishRun(runId, user = null) {
    const run = await db('timetable_runs').where({ id: runId }).first();
    if (!run) throw new Error('Timetable run tidak ditemukan');

    // 1. Mark this run as 'published' and others as 'archived'
    await db('timetable_runs')
      .where({ satuan_pendidikan_id: run.satuan_pendidikan_id, academic_year_id: run.academic_year_id })
      .update({ status: 'archived', updated_at: db.fn.now() });

    await db('timetable_runs').where({ id: runId }).update({
      status: 'published',
      updated_at: db.fn.now()
    });

    // 2. Sync to active `subject_schedules` table for full backward-compatibility with portals!
    const entries = await db('timetable_entries').where({ timetable_run_id: runId });
    
    // Cari preset aktif
    const activePreset = await db('subject_schedule_presets')
      .where({ satuan_pendidikan_id: run.satuan_pendidikan_id, academic_year_id: run.academic_year_id, is_active: 1 })
      .first();

    const targetPresetId = activePreset?.id || null;

    // Clear old schedules for this unit, academic year, and active preset
    let clearQuery = db('subject_schedules').where({
      satuan_pendidikan_id: run.satuan_pendidikan_id,
      academic_year_id: run.academic_year_id
    });
    if (targetPresetId) {
      clearQuery = clearQuery.where({ preset_id: targetPresetId });
    }
    await clearQuery.del();

    // Urutkan dan gabungkan slot berurutan (consecutive slots / 2 JP+) menjadi 1 sesi blok KBM
    const rawEntries = [...entries];
    rawEntries.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return String(a.start_time || '').localeCompare(String(b.start_time || ''));
    });

    const mergedBlocks = [];
    for (const e of rawEntries) {
      const joinedClasses = e.joined_class_group_ids
        ? (typeof e.joined_class_group_ids === 'string' ? JSON.parse(e.joined_class_group_ids) : e.joined_class_group_ids)
        : [e.class_group_id];
      const classKey = (joinedClasses || []).filter(Boolean).sort().join(',');

      const last = mergedBlocks[mergedBlocks.length - 1];
      if (
        last &&
        last.day_of_week === e.day_of_week &&
        String(last.teacher_employee_id || '') === String(e.teacher_employee_id || '') &&
        String(last.subject_id || '') === String(e.subject_id || '') &&
        String(last.extracurricular_id || '') === String(e.extracurricular_id || '') &&
        last.classKey === classKey &&
        last.end_time === e.start_time
      ) {
        last.end_time = e.end_time;
        last.last_period_index = e.period_index;
        last.period_label = `Jam Ke ${last.first_period_index} - ${e.period_index}`;
      } else {
        mergedBlocks.push({
          day_of_week: e.day_of_week,
          start_time: e.start_time,
          end_time: e.end_time,
          first_period_index: e.period_index,
          last_period_index: e.period_index,
          period_label: `Jam Ke-${e.period_index}`,
          subject_id: e.subject_id || null,
          extracurricular_id: e.extracurricular_id || null,
          teacher_employee_id: e.teacher_employee_id || null,
          room_name: e.room_name,
          classKey,
          joinedClasses: (joinedClasses || []).filter(Boolean)
        });
      }
    }

    for (const block of mergedBlocks) {
      const [schId] = await db('subject_schedules').insert({
        satuan_pendidikan_id: run.satuan_pendidikan_id,
        academic_year_id: run.academic_year_id,
        preset_id: targetPresetId,
        schedule_type: block.subject_id ? 'mapel' : 'ekskul',
        subject_id: block.subject_id,
        extracurricular_id: block.extracurricular_id,
        teacher_employee_id: block.teacher_employee_id,
        day_of_week: block.day_of_week,
        start_time: block.start_time,
        end_time: block.end_time,
        period_label: block.period_label,
        room_name: block.room_name,
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      for (const cid of block.joinedClasses) {
        if (cid) {
          await db('subject_schedule_class_groups').insert({
            schedule_id: schId,
            class_group_id: cid
          });
        }
      }
    }

    return { success: true, published_run_id: Number(runId) };
  }
}

module.exports = new TimetableService();
