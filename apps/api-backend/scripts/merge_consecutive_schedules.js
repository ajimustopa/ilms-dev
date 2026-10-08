/**
 * Script untuk menggabungkan jadwal mapel beruntun (consecutive slots / 2 JP)
 * pada rombel, hari, dan guru yang sama menjadi 1 Sesi Blok KBM di subject_schedules.
 */
const db = require('../src/config/db/akademik');

async function run() {
  const trx = await db.transaction();
  try {
    const schedules = await trx('subject_schedules')
      .select('subject_schedules.*')
      .orderBy(['satuan_pendidikan_id', 'academic_year_id', 'preset_id', 'day_of_week', 'start_time']);

    const classGroups = await trx('subject_schedule_class_groups').select('*');
    const cgMap = {};
    for (const cg of classGroups) {
      if (!cgMap[cg.schedule_id]) cgMap[cg.schedule_id] = [];
      cgMap[cg.schedule_id].push(cg.class_group_id);
    }

    for (const s of schedules) {
      s.class_group_ids = (cgMap[s.id] || []).sort().join(',');
    }

    // Kelompokkan jadwal yang identik (hari, mapel/ekskul, guru, rombel, tahun ajaran, satuan)
    const groups = {};
    for (const s of schedules) {
      const key = [
        s.satuan_pendidikan_id,
        s.academic_year_id,
        s.preset_id || 'null',
        s.day_of_week,
        s.subject_id ? ('subj_' + s.subject_id) : ('extra_' + s.extracurricular_id),
        s.teacher_employee_id || 'null',
        s.class_group_ids
      ].join('__');

      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }

    let mergedCount = 0;
    const deletedScheduleIds = [];

    for (const k of Object.keys(groups)) {
      const list = groups[k];
      if (list.length > 1) {
        list.sort((a, b) => a.start_time.localeCompare(b.start_time));

        let i = 0;
        while (i < list.length - 1) {
          const current = list[i];
          const next = list[i + 1];

          // Cek apakah bersambung (current.end_time == next.start_time)
          if (current.end_time === next.start_time) {
            const getPeriodNum = (lbl) => {
              const m = String(lbl || '').match(/\d+/);
              return m ? m[0] : null;
            };
            const p1 = getPeriodNum(current.period_label);
            const p2 = getPeriodNum(next.period_label);
            let mergedLabel = `Jam Ke ${p1 || 1} - ${p2 || 2}`;
            if (!p1 && !p2) {
              mergedLabel = `${current.period_label || ''} & ${next.period_label || ''}`.trim();
            }

            // Update sesi pertama menjadi rentang blok 2 JP
            await trx('subject_schedules')
              .where({ id: current.id })
              .update({
                end_time: next.end_time,
                period_label: mergedLabel,
                updated_at: db.fn.now()
              });

            // Hapus relasi rombel pada sesi kedua yang dilebur
            await trx('subject_schedule_class_groups')
              .where({ schedule_id: next.id })
              .delete();

            // Hapus record sesi kedua
            await trx('subject_schedules')
              .where({ id: next.id })
              .delete();

            deletedScheduleIds.push(next.id);
            mergedCount++;

            // Update objek memory jika ada slot ke-3 yang bersambung lagi
            current.end_time = next.end_time;
            current.period_label = mergedLabel;
            list.splice(i + 1, 1);
          } else {
            i++;
          }
        }
      }
    }

    await trx.commit();
    console.log('✅ Penggabungan Berhasil!', {
      mergedPairs: mergedCount,
      deletedSchedules: deletedScheduleIds.length
    });

    const remaining = await db('subject_schedules').count('* as count');
    console.log('📊 Sisa Total Sesi Jadwal Aktif:', remaining[0].count);

    process.exit(0);
  } catch (err) {
    await trx.rollback();
    console.error('❌ Error saat penggabungan jadwal:', err);
    process.exit(1);
  }
}

run();
