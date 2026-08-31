const db = require('../src/config/db/manajemen');
const planningService = require('../src/modules/manajemen/planning/service');

async function testRktVerification() {
  console.log('--- TEST FITUR 3: RKT & PROGRAM KERJA TAHUNAN ---');

  try {
    // 1. Get references
    const refs = await planningService.getPlanningReferences(1);
    console.log('1. References OK -> Employees count:', refs.employees.length, 'Academic years count:', refs.academic_years.length);

    // 2. Get or create RJM parent
    let rjmList = await planningService.listRks(null, { plan_type: 'rjm' });
    let rjmId = rjmList[0]?.id || null;

    // 3. Create RKT (Rencana Kerja Tahunan)
    const rkt = await planningService.createRks({
      plan_type: 'rkt',
      code: 'RKT-2026/2027',
      title: 'Rencana Kerja Tahunan Tahun Ajaran 2026/2027',
      parent_plan_id: rjmId,
      period_start_year: 2026,
      period_end_year: 2027,
      program_focus: 'Fokus Peningkatan Literasi & Digital Smart Class',
      budget_ceiling_reference: 'Rp 500.000.000',
      description: 'Dokumen RKT panduan operasional tahunan satuan pendidikan',
      target_initial: '70% Terintegrasi',
      target_final: '100% Terintegrasi',
      progress_percent: 45.00
    }, 1);
    console.log('2. Created RKT OK:', rkt.id, rkt.code, rkt.title);

    // 4. Create Program Tahunan under RKT
    const prog1 = await planningService.createProgram({
      school_work_plan_id: rkt.id,
      code: 'PRG-2026-01',
      unit_name: 'Bidang Kurikulum & Akademik',
      title: 'Workshop Modul Ajar Berdiferensiasi & Smart Tools',
      target: '35 Dokumen Modul Ajar Tervalidasi',
      indicator: '100% Guru Mapel Menyusun Modul Tepat Waktu',
      budget_estimate_reference: 'Rp 25.000.000',
      progress_percent: 75.00,
      status: 'ongoing',
      start_date: '2026-09-01',
      end_date: '2026-09-15',
      pic_employee_id: refs.employees[0]?.id || 1
    });

    const prog2 = await planningService.createProgram({
      school_work_plan_id: rkt.id,
      code: 'PRG-2026-02',
      unit_name: 'Bidang Sarana & Prasarana',
      title: 'Pengadaan Lab Komputer & Server CBT Ujian',
      target: '50 Unit PC Komputer Baru',
      indicator: 'Kesiapan 100% CBT Concurrent 500 Santri',
      budget_estimate_reference: 'Rp 150.000.000',
      progress_percent: 60.00,
      status: 'ongoing',
      start_date: '2026-10-01',
      end_date: '2026-11-30',
      pic_employee_id: refs.employees[0]?.id || 1
    });

    console.log('3. Created Annual Programs OK:', prog1.code, prog2.code);

    // 5. Query RKT by id including programs
    const rktDetail = await planningService.getRksById(rkt.id);
    console.log('4. RKT detail programs count:', rktDetail.programs.length);
    if (rktDetail.programs.length !== 2) throw new Error('Expected 2 programs in RKT');

    // 6. Test listPrograms
    const allPrograms = await planningService.listPrograms(null, { school_work_plan_id: rkt.id });
    console.log('5. List Programs count:', allPrograms.length, 'PIC Name:', allPrograms[0].pic_name);

    console.log('--- ALL FITUR 3 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 3 TEST ERROR:', err);
    process.exit(1);
  }
}

testRktVerification();
