const db = require('../src/config/db/manajemen');
const planningService = require('../src/modules/manajemen/planning/service');

async function testLongTermHierarchy() {
  console.log('--- TEST FITUR 2: RPS, RJJP & RJM ---');

  try {
    // 1. Get or create Renstra parent
    let renstraList = await planningService.listRips(null, {});
    let renstraId = renstraList[0]?.id;
    if (!renstraId) {
      const newR = await planningService.createRips({
        title: 'Renstra Induk 2026-2030',
        period_start_year: 2026,
        period_end_year: 2030
      }, 1);
      renstraId = newR.id;
    }

    // 2. Get or create a Strategic Goal
    let goalsList = await planningService.listStrategicGoals(null, { renstra_id: renstraId });
    let goalId = goalsList[0]?.id;
    if (!goalId) {
      const newG = await planningService.createStrategicGoal({
        institution_development_plan_id: renstraId,
        code: 'SS-01',
        name: 'Pengembangan Mutu Santri'
      }, 1);
      goalId = newG.id;
    }

    // 3. Create RPS (Rencana Pengembangan Sekolah - 8 SNP)
    const rps = await planningService.createRks({
      plan_type: 'rps',
      code: 'RPS-SNP-01',
      title: 'Pengembangan Standar Kompetensi Kelulusan & Tahfidz Unggul',
      institution_development_plan_id: renstraId,
      strategic_goal_id: goalId,
      period_start_year: 2026,
      period_end_year: 2030,
      program_focus: 'Pilar 1: Standar Kompetensi Lulusan (SKL)',
      target_initial: '70% Santri Mumtaz',
      target_final: '100% Santri Mumtaz Standar Nasional',
      current_achievement: '85% Tercapai',
      progress_percent: 85.00,
      description: 'Program peningkatan mutu lulusan 5 tahunan'
    }, 1);
    console.log('1. Created RPS OK:', rps.id, rps.code, rps.title);

    // 4. Create RJJP (Rencana Jangka Panjang 10-Tahun) with parent RPS
    const rjjp = await planningService.createRks({
      plan_type: 'rjjp',
      code: 'RJJP-FASE-1',
      title: 'Fase Fondasi & Konsolidasi Digital Pesantren (2026–2030)',
      institution_development_plan_id: renstraId,
      parent_plan_id: rps.id,
      strategic_goal_id: goalId,
      period_start_year: 2026,
      period_end_year: 2035,
      target_initial: 'Sistem Terfragmentasi',
      target_final: '100% Smart Islamic Boarding Campus',
      current_achievement: '60% Integrasi Selesai',
      progress_percent: 60.00,
      description: 'Milestone 10 tahunan institusi'
    }, 1);
    console.log('2. Created RJJP OK:', rjjp.id, rjjp.code, rjjp.title, 'Parent:', rjjp.parent_plan_id);

    // 5. Create RJM (Rencana Jangka Menengah 4-Tahun) with parent RJJP
    const rjm = await planningService.createRks({
      plan_type: 'rjm',
      code: 'RJM-2026-2029',
      title: 'Rencana Menengah Penguatan Infrastruktur CBT & E-Learning',
      institution_development_plan_id: renstraId,
      parent_plan_id: rjjp.id,
      period_start_year: 2026,
      period_end_year: 2029,
      target_initial: '1 Server Standalone',
      target_final: 'High Availability Multi-Node Cluster',
      current_achievement: '1 Node Backup Active',
      progress_percent: 50.00,
      description: 'Evaluasi paruh waktu 4 tahunan'
    }, 1);
    console.log('3. Created RJM OK:', rjm.id, rjm.code, rjm.title, 'Parent:', rjm.parent_plan_id);

    // 6. Test listRks by plan_type
    const rpsList = await planningService.listRks(null, { plan_type: 'rps' });
    const rjjpList = await planningService.listRks(null, { plan_type: 'rjjp' });
    const rjmList = await planningService.listRks(null, { plan_type: 'rjm' });
    console.log('4. Query by plan_type counts -> RPS:', rpsList.length, 'RJJP:', rjjpList.length, 'RJM:', rjmList.length);

    // 7. Test getRksById with children_plans
    const rpsDetail = await planningService.getRksById(rps.id);
    console.log('5. RPS detail children count:', rpsDetail.children_plans.length);

    console.log('--- ALL FITUR 2 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 2 TEST ERROR:', err);
    process.exit(1);
  }
}

testLongTermHierarchy();
