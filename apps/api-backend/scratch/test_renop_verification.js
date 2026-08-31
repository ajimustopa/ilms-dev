const db = require('../src/config/db/manajemen');
const planningService = require('../src/modules/manajemen/planning/service');

async function testRenopVerification() {
  console.log('--- TEST FITUR 4: RENOP (KEGIATAN & SUBKEGIATAN) ---');

  try {
    // 1. Get an existing program
    let progList = await planningService.listPrograms(null, {});
    let progId = progList[0]?.id;
    if (!progId) {
      const newP = await planningService.createProgram({
        title: 'Program Kurikulum 2026',
        unit_name: 'Bidang Kurikulum'
      });
      progId = newP.id;
    }

    // 2. Create Kegiatan Renop
    const act1 = await planningService.createActivity({
      work_plan_program_id: progId,
      code: 'ACT-01',
      name: 'Workshop Pembuatan Modul Ajar Berdiferensiasi',
      description: 'Pelatihan 3 hari untuk seluruh guru mapel',
      output: '35 Dokumen Modul Ajar Tervalidasi',
      target_output: '35',
      unit: 'Dokumen',
      start_date: '2026-09-10',
      end_date: '2026-09-12',
      unit_name: 'Bidang Kurikulum & Akademik',
      budget_reference: 'Rp 15.000.000',
      budget_account_code: '5.2.1.01 (BOP Kurikulum)',
      progress_percent: 65.00,
      status: 'in_progress'
    }, 1);
    console.log('1. Created Kegiatan Renop OK:', act1.id, act1.code, act1.name);

    // 3. Create Subkegiatan under Kegiatan act1
    const sub1 = await planningService.createActivity({
      work_plan_program_id: progId,
      parent_activity_id: act1.id,
      code: 'SUBACT-01.1',
      name: 'Penyusunan Draf & Rubrik Asesmen Awal',
      output: 'Draft Rubrik Asesmen Siap Pakai',
      target_output: '10',
      unit: 'Rubrik',
      start_date: '2026-09-10',
      end_date: '2026-09-10',
      progress_percent: 100.00,
      status: 'completed'
    }, 1);
    console.log('2. Created Subkegiatan OK:', sub1.id, sub1.code, sub1.name, 'Parent:', sub1.parent_activity_id);

    // 4. Test getActivityById with sub_activities
    const detail = await planningService.getActivityById(act1.id);
    console.log('3. Detail Kegiatan sub_activities count:', detail.sub_activities.length);
    if (detail.sub_activities.length !== 1) throw new Error('Expected 1 sub-activity');

    // 5. Test listActivities
    const actList = await planningService.listActivities(null, { work_plan_program_id: progId });
    console.log('4. List Activities count for program:', actList.length);

    console.log('--- ALL FITUR 4 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 4 TEST ERROR:', err);
    process.exit(1);
  }
}

testRenopVerification();
