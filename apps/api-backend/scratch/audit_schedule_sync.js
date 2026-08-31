const db = require('../src/config/db/akademik');

async function checkSync() {
  try {
    console.log('=== 1. CHECK UNITS & ACADEMIC YEAR ===');
    const units = await db('master_satuan_pendidikan').select('id', 'name', 'code');
    console.log('Units:', units);

    const years = await db('academic_years').select('id', 'academic_year_name', 'is_active');
    console.log('Years:', years);

    console.log('\n=== 2. TOTAL SCHEDULES IN DATABASE (SATUAN SMP ID: 1) ===');
    const schedules = await db('academic_schedules as s')
      .leftJoin('subjects as sub', 's.subject_id', 'sub.id')
      .leftJoin('teachers as t', 's.teacher_employee_id', 't.id')
      .select(
        's.id', 's.satuan_pendidikan_id', 's.academic_year_id', 's.day_of_week', 's.start_time', 's.end_time', 's.period_label', 
        's.subject_id', 'sub.name as subject_name', 'sub.is_elective', 'sub.elective_group_name',
        's.teacher_employee_id', 't.full_name as teacher_name',
        's.is_combined_class'
      )
      .where('s.satuan_pendidikan_id', 1)
      .orderBy(['s.day_of_week', 's.start_time']);
    
    console.log('Total academic_schedules rows for SMP:', schedules.length);

    // Ambil kelas per jadwal
    const scheduleClasses = await db('academic_schedule_classes as sc')
      .join('academic_schedules as s', 'sc.schedule_id', 's.id')
      .join('class_groups as cg', 'sc.class_group_id', 'cg.id')
      .leftJoin('subjects as sub', 's.subject_id', 'sub.id')
      .leftJoin('teachers as t', 's.teacher_employee_id', 't.id')
      .select(
        'sc.schedule_id', 'sc.class_group_id', 'cg.name as class_name',
        's.day_of_week', 's.start_time', 's.end_time', 's.subject_id', 'sub.name as subject_name', 'sub.is_elective', 'sub.elective_group_name',
        's.teacher_employee_id', 't.full_name as teacher_name'
      )
      .where('s.satuan_pendidikan_id', 1);

    console.log('\n=== 3. CEK BENTROK GURU (TEACHER OVERLAP CONFLICTS) ===');
    const teacherConflicts = [];
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const a = schedules[i];
        const b = schedules[j];
        if (a.day_of_week === b.day_of_week && a.teacher_employee_id && b.teacher_employee_id && a.teacher_employee_id === b.teacher_employee_id) {
          if (a.start_time < b.end_time && a.end_time > b.start_time) {
            teacherConflicts.push({ 
              day: a.day_of_week,
              teacher: a.teacher_name,
              sessionA: { id: a.id, sub: a.subject_name, time: `${a.start_time}-${a.end_time}` },
              sessionB: { id: b.id, sub: b.subject_name, time: `${b.start_time}-${b.end_time}` }
            });
          }
        }
      }
    }
    console.log('Teacher Conflicts Count:', teacherConflicts.length);
    if (teacherConflicts.length > 0) {
      console.log(JSON.stringify(teacherConflicts, null, 2));
    } else {
      console.log('✅ SEMPURNA: TIDAK ADA BENTROK GURU. Semua guru mengajar di jadwal yang sinkron.');
    }

    console.log('\n=== 4. CEK BENTROK KELAS / ROMBEL (CLASS OVERLAP CONFLICTS) ===');
    const classConflicts = [];
    for (let i = 0; i < scheduleClasses.length; i++) {
      for (let j = i + 1; j < scheduleClasses.length; j++) {
        const a = scheduleClasses[i];
        const b = scheduleClasses[j];
        if (a.schedule_id !== b.schedule_id && a.class_group_id === b.class_group_id && a.day_of_week === b.day_of_week) {
          if (a.start_time < b.end_time && a.end_time > b.start_time) {
            const isElectiveBlock = a.is_elective && b.is_elective && a.elective_group_name && a.elective_group_name === b.elective_group_name;
            if (!isElectiveBlock) {
              classConflicts.push({ 
                class: a.class_name,
                day: a.day_of_week,
                sessionA: { id: a.schedule_id, sub: a.subject_name, time: `${a.start_time}-${a.end_time}` },
                sessionB: { id: b.schedule_id, sub: b.subject_name, time: `${b.start_time}-${b.end_time}` }
              });
            }
          }
        }
      }
    }
    console.log('Class Conflicts Count:', classConflicts.length);
    if (classConflicts.length > 0) {
      console.log(JSON.stringify(classConflicts, null, 2));
    } else {
      console.log('✅ SEMPURNA: TIDAK ADA BENTROK KELAS. Semua rombel memiliki slot belajar yang valid & harmonis.');
    }

    console.log('\n=== 5. SINKRONISASI PEMBAGIAN TUGAS MENGAJAR (SK MENGAJAR vs JADWAL KBM) ===');
    const duties = await db('academic_teaching_duties as td')
      .leftJoin('subjects as sub', 'td.subject_id', 'sub.id')
      .leftJoin('class_groups as cg', 'td.class_group_id', 'cg.id')
      .leftJoin('teachers as t', 'td.teacher_employee_id', 't.id')
      .select(
        'td.id', 'td.satuan_pendidikan_id', 'td.subject_id', 'sub.name as subject_name', 'sub.is_elective', 'sub.elective_group_name',
        'td.class_group_id', 'cg.name as class_name',
        'td.teacher_employee_id', 't.full_name as teacher_name',
        'td.total_hours'
      )
      .where('td.satuan_pendidikan_id', 1);

    // Hitung total jam per SK Mengajar vs realisasi di Jadwal
    const dutyComparison = [];
    for (const d of duties) {
      const matchedSchedules = scheduleClasses.filter(sc => 
        sc.class_group_id === d.class_group_id && 
        sc.subject_id === d.subject_id &&
        sc.teacher_employee_id === d.teacher_employee_id
      );

      // Hitung total menit
      let totalMins = 0;
      matchedSchedules.forEach(ms => {
        const [sh, sm] = ms.start_time.split(':').map(Number);
        const [eh, em] = ms.end_time.split(':').map(Number);
        totalMins += (eh * 60 + em) - (sh * 60 + sm);
      });
      const actualJp = Math.round(totalMins / 45);

      dutyComparison.push({
        rombel: d.class_name,
        mapel: d.is_elective && d.elective_group_name ? d.elective_group_name : d.subject_name,
        guru: d.teacher_name || 'Tanpa Guru',
        targetJp: d.total_hours,
        jadwalAktifJp: actualJp,
        status: actualJp === d.total_hours ? '✅ Pas (Sinkron)' : (actualJp > d.total_hours ? '⚠️ Lebih' : (actualJp === 0 ? '❌ Belum Terjadwal' : '⚠️ Kurang'))
      });
    }

    console.table(dutyComparison.slice(0, 30));

    console.log('\n=== 6. RINGKASAN REKAP PER ROMBEL KELAS ===');
    const classSummary = await db('class_groups as cg')
      .where('cg.satuan_pendidikan_id', 1)
      .andWhere(builder => {
        builder.whereNull('cg.type').orWhere('cg.type', 'reguler');
      })
      .select('cg.id', 'cg.name');

    const summaryTable = classSummary.map(c => {
      const classesForThis = scheduleClasses.filter(sc => sc.class_group_id === c.id);
      let totalMins = 0;
      const subjectsCount = new Set();
      classesForThis.forEach(sc => {
        const [sh, sm] = sc.start_time.split(':').map(Number);
        const [eh, em] = sc.end_time.split(':').map(Number);
        totalMins += (eh * 60 + em) - (sh * 60 + sm);
        subjectsCount.add(sc.subject_id);
      });

      return {
        Rombel: c.name,
        Total_Sesi_KBM: classesForThis.length,
        Total_JP_Terjadwal: Math.round(totalMins / 45),
        Total_Mapel_Aktif: subjectsCount.size
      };
    });
    console.table(summaryTable);

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkSync();
