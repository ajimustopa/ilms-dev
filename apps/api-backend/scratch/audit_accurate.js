const db = require('../src/config/db/akademik');
const employeesService = require('../src/modules/kepegawaian/employees/service');

async function runAccurateAudit() {
  try {
    console.log('========================================================================');
    console.log('    AUDIT KESELARASAN MATRIKS JADWAL KBM SMP DENGAN DATA KURIKULUM      ');
    console.log('========================================================================\n');

    // 1. Identifikasi Preset Jadwal yang Aktif
    const activePreset = await db('subject_schedule_presets')
      .where({ satuan_pendidikan_id: 1, is_active: true })
      .first();

    console.log(`📌 1. PRESET AKTIF SMP: ID ${activePreset?.id || '-'} ("${activePreset?.name || 'Default'}")`);

    // 2. Ambil seluruh data jadwal pada preset yang aktif
    const schedules = await db('subject_schedules as s')
      .leftJoin('subjects as sub', 's.subject_id', 'sub.id')
      .leftJoin('extracurriculars as ex', 's.extracurricular_id', 'ex.id')
      .select(
        's.id', 's.satuan_pendidikan_id', 's.academic_year_id', 's.preset_id', 's.day_of_week',
        's.start_time', 's.end_time', 's.period_label', 's.subject_id', 's.teacher_employee_id',
        's.is_combined_class', 's.is_active',
        'sub.name as subject_name', 'sub.code as subject_code', 'sub.is_elective', 'sub.elective_group_name',
        'ex.name as extra_name'
      )
      .where('s.satuan_pendidikan_id', 1)
      .andWhere(builder => {
        if (activePreset) {
          builder.where('s.preset_id', activePreset.id);
        }
      })
      .orderBy(['s.day_of_week', 's.start_time']);

    console.log(`📌 2. TOTAL SESI PADA PRESET AKTIF: ${schedules.length} Sesi Terjadwal`);

    // Mapping kelas per jadwal
    const scheduleClassRel = await db('subject_schedule_class_groups as sc')
      .join('class_groups as cg', 'sc.class_group_id', 'cg.id')
      .select('sc.schedule_id', 'sc.class_group_id', 'cg.name as class_name');

    const scheduleWithClasses = schedules.map(s => {
      const matched = scheduleClassRel.filter(r => r.schedule_id === s.id);
      return {
        ...s,
        class_ids: matched.map(m => m.class_group_id),
        class_names: matched.map(m => m.class_name).join(', '),
        class_count: matched.length
      };
    });

    // Ambil data guru dari kepegawaian
    const empRes = await employeesService.listEmployees({ per_page: 500 }).catch(() => ({ data: [] }));
    const teacherMap = {};
    (empRes.data || []).forEach(e => {
      teacherMap[e.id] = e.full_name;
    });

    const DAYS = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    // 3. AUDIT BENTROK GURU PADA PRESET AKTIF
    console.log('\n📌 3. AUDIT BENTROK GURU (TEACHER OVERLAP CONFLICTS):');
    const teacherConflicts = [];
    for (let i = 0; i < scheduleWithClasses.length; i++) {
      for (let j = i + 1; j < scheduleWithClasses.length; j++) {
        const a = scheduleWithClasses[i];
        const b = scheduleWithClasses[j];
        if (a.day_of_week === b.day_of_week && a.teacher_employee_id && b.teacher_employee_id && String(a.teacher_employee_id) === String(b.teacher_employee_id)) {
          if (a.start_time < b.end_time && a.end_time > b.start_time) {
            teacherConflicts.push({
              Hari: DAYS[a.day_of_week] || a.day_of_week,
              Guru: teacherMap[a.teacher_employee_id] || `Guru ID ${a.teacher_employee_id}`,
              Sesi_A: `${a.subject_name || a.extra_name} (${a.class_names}) [${a.start_time}-${a.end_time}]`,
              Sesi_B: `${b.subject_name || b.extra_name} (${b.class_names}) [${b.start_time}-${b.end_time}]`
            });
          }
        }
      }
    }
    if (teacherConflicts.length > 0) {
      console.log(`⚠️ Ditemukan ${teacherConflicts.length} Bentrok Guru:`);
      console.table(teacherConflicts);
    } else {
      console.log('✅ 100% BEBAS BENTROK GURU: Tidak ada guru yang dijadwalkan ganda di kelas berbeda pada waktu yang sama.');
    }

    // 4. AUDIT BENTROK KELAS / ROMBEL PADA PRESET AKTIF
    console.log('\n📌 4. AUDIT BENTROK ROMBEL KELAS (CLASS OVERLAP CONFLICTS):');
    const flatClassSlots = [];
    scheduleWithClasses.forEach(s => {
      s.class_ids.forEach(cid => {
        const cname = scheduleClassRel.find(r => r.class_group_id === cid)?.class_name || `Rombel ${cid}`;
        flatClassSlots.push({
          schedule_id: s.id,
          class_id: cid,
          class_name: cname,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          subject_name: s.subject_name || s.extra_name,
          is_elective: s.is_elective,
          elective_group_name: s.elective_group_name
        });
      });
    });

    const classConflicts = [];
    for (let i = 0; i < flatClassSlots.length; i++) {
      for (let j = i + 1; j < flatClassSlots.length; j++) {
        const a = flatClassSlots[i];
        const b = flatClassSlots[j];
        if (a.schedule_id !== b.schedule_id && a.class_id === b.class_id && a.day_of_week === b.day_of_week) {
          if (a.start_time < b.end_time && a.end_time > b.start_time) {
            const isBothElectiveBlock = a.is_elective && b.is_elective && a.elective_group_name && a.elective_group_name === b.elective_group_name;
            if (!isBothElectiveBlock) {
              classConflicts.push({
                Rombel: a.class_name,
                Hari: DAYS[a.day_of_week] || a.day_of_week,
                Sesi_A: `${a.subject_name} [${a.start_time}-${a.end_time}]`,
                Sesi_B: `${b.subject_name} [${b.start_time}-${b.end_time}]`
              });
            }
          }
        }
      }
    }
    if (classConflicts.length > 0) {
      console.log(`⚠️ Ditemukan ${classConflicts.length} Bentrok Rombel:`);
      console.table(classConflicts);
    } else {
      console.log('✅ 100% BEBAS BENTROK ROMBEL: Semua rombel memiliki slot belajar teratur tanpa tumpang tindih waktu.');
    }

    // 5. AUDIT SINKRONISASI DENGAN SK PEMBAGIAN TUGAS MENGAJAR (TAB 6 KURIKULUM)
    console.log('\n📌 5. AUDIT SINKRONISASI DENGAN SK PEMBAGIAN TUGAS MENGAJAR (TAB 6 KURIKULUM):');
    const assignments = await db('subject_teacher_assignments as sta')
      .leftJoin('subjects as sub', 'sta.subject_id', 'sub.id')
      .leftJoin('class_groups as cg', 'sta.class_group_id', 'cg.id')
      .select(
        'sta.id', 'sta.satuan_pendidikan_id', 'sta.subject_id', 'sta.class_group_id',
        'sta.teacher_employee_id', 'sta.allocated_hours', 'sta.joint_group_id',
        'sub.name as subject_name', 'sub.is_elective', 'sub.elective_group_name',
        'cg.name as class_name'
      )
      .where('sta.satuan_pendidikan_id', 1);

    const assignmentSyncReport = assignments.map(a => {
      const teacherName = teacherMap[a.teacher_employee_id] || 'Belum Ditentukan';
      const matched = scheduleWithClasses.filter(s => 
        s.class_ids.includes(a.class_group_id) &&
        (s.subject_id === a.subject_id || (s.is_elective && s.elective_group_name === a.elective_group_name)) &&
        String(s.teacher_employee_id) === String(a.teacher_employee_id)
      );

      let totalMins = 0;
      matched.forEach(m => {
        const [sh, sm] = m.start_time.split(':').map(Number);
        const [eh, em] = m.end_time.split(':').map(Number);
        totalMins += (eh * 60 + em) - (sh * 60 + sm);
      });

      const actualJp = Math.round(totalMins / 45);
      const targetJp = a.allocated_hours || 0;

      return {
        Rombel: a.class_name,
        Mata_Pelajaran: a.is_elective && a.elective_group_name ? `${a.elective_group_name} (${a.subject_name})` : a.subject_name,
        Guru_Pengampu: teacherName,
        Target_SK_JP: targetJp,
        Realisasi_Jadwal_JP: actualJp,
        Status: actualJp === targetJp ? '✅ SINKRON' : (actualJp > targetJp ? `⚠️ Lebih (+${actualJp - targetJp})` : (actualJp === 0 ? '❌ Belum Terjadwal' : `⚠️ Kurang (${actualJp}/${targetJp})`))
      };
    });

    console.table(assignmentSyncReport);

    // 6. REKAP TOTAL JP PER ROMBEL SMP (7A s/d 9B)
    console.log('\n📌 6. REKAP BEBAN JP KBM PER ROMBEL KELAS SMP:');
    const classes = await db('class_groups')
      .where('satuan_pendidikan_id', 1)
      .andWhere(builder => {
        builder.whereNull('type').orWhere('type', 'reguler');
      })
      .orderBy('id');

    const classRecap = classes.map(c => {
      const slots = flatClassSlots.filter(s => s.class_id === c.id);
      let totalMins = 0;
      const subNames = new Set();
      slots.forEach(sl => {
        const [sh, sm] = sl.start_time.split(':').map(Number);
        const [eh, em] = sl.end_time.split(':').map(Number);
        totalMins += (eh * 60 + em) - (sh * 60 + sm);
        subNames.add(sl.subject_name);
      });

      return {
        Rombel_Kelas: c.name,
        Total_Sesi_KBM: slots.length,
        Total_Beban_JP: Math.round(totalMins / 45),
        Jumlah_Mapel_Aktif: subNames.size,
        Status: Math.round(totalMins / 45) > 0 ? '🟢 Terisi Lengkap' : '⚪ Kosong'
      };
    });

    console.table(classRecap);

  } catch(e) {
    console.error('Audit Error:', e);
  } finally {
    process.exit(0);
  }
}

runAccurateAudit();
