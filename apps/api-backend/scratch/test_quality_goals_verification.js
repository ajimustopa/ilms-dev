const db = require('../src/config/db/manajemen');
const qualityService = require('../src/modules/manajemen/quality/service');
const planningService = require('../src/modules/manajemen/planning/service');

async function testQualityGoalsVerification() {
  console.log('--- TEST FITUR 8: SASARAN MUTU ---');

  try {
    // 1. Get or create Strategic Goal
    let sg = await db('strategic_goals').first();
    if (!sg) {
      sg = await planningService.createStrategicGoal({
        code: 'SG-TEST-01',
        name: 'Peningkatan Mutu Akademik & Karakter Santri',
        perspective: 'pembelajaran'
      });
    }
    console.log('1. Strategic Goal found/created:', sg.id, sg.code, sg.name);

    // 2. Create Indicator
    const kpi = await qualityService.createIndicator({
      code: `KPI-MUTU-${Date.now().toString().slice(-4)}`,
      name: 'Rata-rata Nilai Asesmen Standar Nasional',
      category: 'akademik',
      unit_of_measure: 'Skor',
      target_value: 85.00,
      direction: 'higher_is_better',
      strategic_goal_id: sg.id
    }, 1);
    console.log('2. Quality Indicator created:', kpi.id, kpi.code);

    // 3. Create Quality Goal
    const qgCode = `QM-GOAL-${Date.now().toString().slice(-4)}`;
    const qg = await qualityService.createQualityGoal({
      code: qgCode,
      name: 'Pencapaian Akreditasi Unggul Program Pembelajaran',
      description: 'Peningkatan skor asesmen pembelajaran seluruh santri',
      quality_standard: 'SNP - Standar Proses',
      strategic_goal_id: sg.id,
      quality_indicator_id: kpi.id,
      period: '2026/2027',
      target_value: 85.00
    }, 1);
    console.log('3. Quality Goal created:', qg.id, qg.code, qg.name, 'Status:', qg.status);

    // 4. Record Realization for Indicator & Check Auto-Sync to Quality Goal
    await qualityService.recordAchievement(kpi.id, {
      period: '2026/2027',
      target_value: 85.00,
      actual_value: 90.00,
      notes: 'Hasil asesmen melampaui standar'
    }, 1);

    const updatedQg = await qualityService.getQualityGoalById(qg.id);
    console.log('4. Auto-Sync Check -> QG Actual:', updatedQg.actual_value, 'Pct:', updatedQg.achievement_percentage, 'Status:', updatedQg.status);
    if (updatedQg.status !== 'achieved') throw new Error('Expected QG status achieved after sync');

    // 5. List Quality Goals
    const list = await qualityService.listQualityGoals(null, { period: '2026/2027' });
    console.log('5. List Quality Goals count:', list.length);

    console.log('--- ALL FITUR 8 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 8 TEST ERROR:', err);
    process.exit(1);
  }
}

testQualityGoalsVerification();
