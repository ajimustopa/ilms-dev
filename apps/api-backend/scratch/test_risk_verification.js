const db = require('../src/config/db/manajemen');
const qualityService = require('../src/modules/manajemen/quality/service');

async function testRiskVerification() {
  console.log('--- TEST FITUR 9: MANAJEMEN RISIKO (HEATMAP 5x5 & RESIDUAL) ---');

  try {
    // 1. Test Score Calculations (1x1, 5x5, Clamping)
    const calc1x1 = qualityService.calculateRiskScoreAndLevel(1, 1);
    console.log('1. Score 1x1 OK ->', calc1x1);
    if (calc1x1.score !== 1 || calc1x1.level !== 'low') throw new Error('Expected 1x1 = 1 (low)');

    const calc5x5 = qualityService.calculateRiskScoreAndLevel(5, 5);
    console.log('2. Score 5x5 OK ->', calc5x5);
    if (calc5x5.score !== 25 || calc5x5.level !== 'extreme') throw new Error('Expected 5x5 = 25 (extreme)');

    // Clamping test (e.g. 10 clamped to 5, -2 clamped to 1)
    const clampTest = qualityService.calculateRiskScoreAndLevel(10, -2);
    console.log('3. Clamping Out-of-bounds OK ->', clampTest);
    if (clampTest.probability !== 5 || clampTest.impact !== 1 || clampTest.score !== 5) throw new Error('Expected clamp 5x1 = 5');

    // 2. Create Risk with Inherent 4x5 = 20 (Extreme)
    const uniqueCode = `RSK-TEST-${Date.now().toString().slice(-4)}`;
    const risk = await qualityService.createRisk({
      code: uniqueCode,
      title: 'Keterlambatan Pengadaan Perangkat Lab Komputer Ujian CBT',
      category: 'Operasional & Sarpras',
      source: 'Vendor Pengadaan',
      root_cause: 'Keterlambatan pasokan komponen impor',
      impact_description: 'Potensi penundaan simulasi ujian asesmen santri',
      probability_val: 4,
      impact_val: 5,
      relation_type: 'program',
      relation_code: 'PROG-SAR-01',
      relation_name: 'Digitalisasi Sarana Ujian Santri'
    }, 1);

    console.log('4. Created Risk OK ->', risk.id, risk.code, 'Score:', risk.risk_score, 'Level:', risk.risk_level);
    if (risk.risk_score !== 20 || risk.risk_level !== 'extreme') throw new Error('Expected risk score 20, level extreme');

    // 3. Update Mitigation & Residual (e.g. residual 2x2 = 4, Low)
    const updatedMitigation = await qualityService.updateRiskMitigation(risk.id, {
      mitigation_action: 'Sewa darurat 50 PC lokal dan alokasi server cadangan',
      mitigation_deadline: '2026-10-15',
      mitigation_status: 'in_progress',
      residual_probability: 2,
      residual_impact: 2
    }, 1);

    console.log('5. Mitigation & Residual OK -> Status:', updatedMitigation.mitigation_status, 'Residual Score:', updatedMitigation.residual_score, 'Residual Level:', updatedMitigation.residual_level);
    if (updatedMitigation.residual_score !== 4 || updatedMitigation.residual_level !== 'low') throw new Error('Expected residual score 4, level low');

    // 4. Test 5x5 Heatmap Matrix Data
    const heatmap = await qualityService.getRiskHeatmapData(null);
    console.log('6. Heatmap 5x5 Stats OK -> Total:', heatmap.stats.total, 'Extreme:', heatmap.stats.extreme);
    const cell45 = heatmap.matrix[4][5];
    console.log('7. Matrix Cell [Prob=4][Impact=5] Count:', cell45.count, 'Cell Score:', cell45.score);
    if (cell45.count < 1) throw new Error('Expected cell [4][5] to contain created risk');

    console.log('--- ALL FITUR 9 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 9 TEST ERROR:', err);
    process.exit(1);
  }
}

testRiskVerification();
