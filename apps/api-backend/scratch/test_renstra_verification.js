const db = require('../src/config/db/manajemen');
const planningService = require('../src/modules/manajemen/planning/service');

async function testRenstraAndGoals() {
  console.log('--- TEST FITUR 1: RENSTRA & SASARAN STRATEGIS ---');

  try {
    // 1. Create Renstra Lembaga (Mode Terintegrasi Yayasan: school_unit_id null)
    const newRenstra = await planningService.createRips({
      title: 'Renstra Pengembangan Yayasan Al-Depok 2026-2030',
      code: 'RENSTRA-2026-2030',
      period_start_year: 2026,
      period_end_year: 2030,
      vision: 'Menjadi Pesantren Digital Sains Terkemuka 2030',
      mission: '1. Pendidikan Berkarakter Qurani\n2. Penguasaan Sains & Teknologi',
      description: 'Dokumen Renstra Induk 5-Tahun',
      school_unit_id: null,
      status: 'draft'
    }, 1);

    console.log('1. Created Renstra OK:', newRenstra.id, newRenstra.code, newRenstra.title);

    // 2. Create Strategic Goals
    const sg1 = await planningService.createStrategicGoal({
      institution_development_plan_id: newRenstra.id,
      code: 'SS-01',
      name: 'Peningkatan Kualitas Lulusan & Karakter Santri Mumtaz',
      perspective: 'Pengembangan Santri & Pembelajaran',
      description: 'Lulusan menguasai tahfidz minimal 5 juz dan nilai asesmen standar unggul',
      target_description: '95% Lulusan Mumtaz',
      order_index: 1
    }, 1);

    const sg2 = await planningService.createStrategicGoal({
      institution_development_plan_id: newRenstra.id,
      code: 'SS-02',
      name: 'SDM Pendidik Profesional & Tersertifikasi',
      perspective: 'SDM & Kapasitas Organisasi',
      description: 'Peningkatan kompetensi pedagogik dan bahasa asing',
      target_description: '85% Guru Bersertifikasi',
      order_index: 2
    }, 1);

    console.log('2. Created Strategic Goals OK:', sg1.code, sg2.code);

    // 3. Test getRipsById including strategic_goals
    const detail = await planningService.getRipsById(newRenstra.id);
    console.log('3. Detail Renstra with Goals count:', detail.strategic_goals.length);
    if (detail.strategic_goals.length !== 2) throw new Error('Expected 2 strategic goals');

    // 4. Test List Renstra with goals count
    const list = await planningService.listRips(null, {});
    console.log('4. List Renstra Count:', list.length, 'First Renstra Goals Count:', list[0].goals_count);

    // 5. Test List Strategic Goals filtered by renstra
    const goalsList = await planningService.listStrategicGoals(null, { renstra_id: newRenstra.id });
    console.log('5. List Strategic Goals by Renstra:', goalsList.length);
    if (goalsList.length !== 2) throw new Error('Expected 2 goals in list');

    // 6. Test Update Goal
    const updatedSg1 = await planningService.updateStrategicGoal(sg1.id, {
      name: 'Peningkatan Kualitas Lulusan & Karakter Santri Mumtaz (Updated)',
      target_description: '98% Lulusan Mumtaz'
    }, 1);
    console.log('6. Updated Goal OK:', updatedSg1.name, updatedSg1.target_description);

    console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  }
}

testRenstraAndGoals();
