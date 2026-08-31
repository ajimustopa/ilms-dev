const db = require('../src/config/db/akademik');

async function verifyAll() {
  try {
    const [schedules] = await db.raw(`
      SELECT s.id, s.day_of_week, s.start_time, s.end_time, sub.name as mapel, 
             GROUP_CONCAT(cg.name SEPARATOR ' + ') as rombel, s.teacher_employee_id
      FROM subject_schedules s
      JOIN subject_schedule_class_groups sc ON s.id = sc.schedule_id
      JOIN class_groups cg ON sc.class_group_id = cg.id
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE s.satuan_pendidikan_id = 1 AND s.preset_id = 3
      GROUP BY s.id
    `);
    console.log('TOTAL UNIQUE SESI JADWAL PRESET 3 SMP:', schedules.length);
    
    // Total jam per rombel
    const [rombelStats] = await db.raw(`
      SELECT cg.name as rombel, 
             COUNT(DISTINCT s.id) as total_sesi,
             SUM(TIMESTAMPDIFF(MINUTE, s.start_time, s.end_time) / 40) as total_jp
      FROM class_groups cg
      JOIN subject_schedule_class_groups sc ON cg.id = sc.class_group_id
      JOIN subject_schedules s ON sc.schedule_id = s.id
      WHERE cg.satuan_pendidikan_id = 1 AND s.preset_id = 3
      GROUP BY cg.id, cg.name
      ORDER BY cg.name
    `);
    console.table(rombelStats);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
verifyAll();
