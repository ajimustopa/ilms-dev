const dbK = require('../src/config/db/kepegawaian');
const dbA = require('../src/config/db/akademik');

async function getFullReport() {
  const employees = await dbK('employees as e')
    .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
    .select('e.*', 'jp.name as position_name', 'jp.level as position_level');
  
  const edus = await dbK('employee_education_trainings')
    .where({ record_type: 'formal_education' })
    .orderBy('graduation_year', 'desc');

  let schoolUnits = [];
  try {
    schoolUnits = await dbA('school_units').select('id', 'name', 'level');
  } catch(e) {}

  console.log('TOTAL_STAFF:', employees.length);
  
  // Breakdown by Gender
  const genderStats = { Laki_Laki: 0, Perempuan: 0 };
  employees.forEach(e => {
    if (e.gender === 'female' || e.gender === 'P' || e.gender === 'Perempuan') genderStats.Perempuan++;
    else genderStats.Laki_Laki++;
  });
  console.log('GENDER_STATS:', genderStats);

  // Breakdown by Employment Status
  const statusStats = {};
  employees.forEach(e => {
    const s = e.employment_status || 'Tetap';
    statusStats[s] = (statusStats[s] || 0) + 1;
  });
  console.log('STATUS_STATS:', statusStats);

  // Breakdown by School Unit
  const unitStats = {};
  employees.forEach(e => {
    const u = schoolUnits.find(unit => unit.id === e.school_unit_id);
    const uName = u ? u.name : 'Tingkat Yayasan / Lintas Unit';
    unitStats[uName] = (unitStats[uName] || 0) + 1;
  });
  console.log('UNIT_STATS:', unitStats);

  // Breakdown by Highest Education Level
  const eduLevelStats = {};
  employees.forEach(e => {
    const empEdus = edus.filter(ed => ed.employee_id === e.id);
    let highestLevel = 'S1 (Sarjana)';
    if (empEdus.length > 0) {
      highestLevel = empEdus[0].education_level;
    } else if (e.academic_title) {
      const t = e.academic_title.toLowerCase();
      if (t.includes('m.') || t.includes('dr.') || t.includes('magister')) highestLevel = 'S2 (Magister)';
      else if (t.includes('s.') || t.includes('sarjana') || t.includes('lc') || t.includes('b.a')) highestLevel = 'S1 (Sarjana)';
      else if (t.includes('a.md') || t.includes('d3')) highestLevel = 'D3 (Diploma)';
    }
    eduLevelStats[highestLevel] = (eduLevelStats[highestLevel] || 0) + 1;
  });
  console.log('EDU_STATS:', eduLevelStats);

  // NUPTK & Sertifikasi
  const withNuptk = employees.filter(e => e.nuptk && e.nuptk !== '-' && e.nuptk.length > 5).length;
  console.log('NUPTK_STATS:', { withNuptk, withoutNuptk: employees.length - withNuptk });

  // List all employees
  const sampleList = employees.map((e, idx) => {
    const u = schoolUnits.find(unit => unit.id === e.school_unit_id);
    const empEdus = edus.filter(ed => ed.employee_id === e.id);
    return {
      no: idx + 1,
      nip: e.nip || e.employee_number || '-',
      nama: e.full_name + (e.academic_title ? ', ' + e.academic_title : ''),
      posisi: e.position_name || 'Guru / Tenaga Pendidik',
      unit: u ? u.name : 'Yayasan',
      status: e.employment_status || 'Tetap',
      nuptk: e.nuptk || '-',
      pendidikan: empEdus.length > 0 ? (empEdus[0].education_level + ' ' + (empEdus[0].major || '')) : (e.academic_title || 'S1')
    };
  });

  console.log('STAFF_LIST:', JSON.stringify(sampleList, null, 2));
  process.exit(0);
}

getFullReport().catch(e => { console.error(e); process.exit(1); });
