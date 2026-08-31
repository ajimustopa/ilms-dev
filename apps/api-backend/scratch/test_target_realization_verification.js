const db = require('../src/config/db/manajemen');
const qualityService = require('../src/modules/manajemen/quality/service');

async function testTargetRealizationVerification() {
  console.log('--- TEST FITUR 7: TARGET, REALISASI & CAPAIAN KPI ---');

  try {
    // 1. Create Higher Is Better KPI (Kelulusan Mumtaz)
    const kpiHigher = await qualityService.createIndicator({
      code: `KPI-HIGH-${Date.now().toString().slice(-4)}`,
      name: 'Tingkat Kelulusan Mumtaz',
      direction: 'higher_is_better',
      target_value: 90.00,
      unit_of_measure: '%',
      category: 'akademik'
    }, 1);

    // Record Achievement for Higher: target 90, actual 95 -> achieved 105.56%
    const achHigher = await qualityService.recordAchievement(kpiHigher.id, {
      period: '2026/2027',
      target_value: 90.00,
      actual_value: 95.00,
      evidence_url: 'https://storage.aldepos.id/evidences/kelulusan_2026.pdf',
      notes: 'Kelulusan melampaui target nasional'
    }, 1);

    console.log('1. Higher is Better Achievement OK -> Pct:', achHigher.achievement_percentage, 'Status:', achHigher.status);
    if (achHigher.status !== 'achieved') throw new Error('Expected status achieved for higher_is_better 95/90');

    // 2. Create Lower Is Better KPI (Tingkat Komplain Wali Santri)
    const kpiLower = await qualityService.createIndicator({
      code: `KPI-LOW-${Date.now().toString().slice(-4)}`,
      name: 'Angka Komplain Pelayanan Santri',
      direction: 'lower_is_better',
      target_value: 5.00,
      unit_of_measure: 'Kasus',
      category: 'lainnya'
    }, 1);

    // Record Achievement for Lower: target 5, actual 2 -> achieved (2 - 2/5)*100 = 160%
    const achLower = await qualityService.recordAchievement(kpiLower.id, {
      period: '2026/2027',
      target_value: 5.00,
      actual_value: 2.00,
      notes: 'Penurunan komplain signifikan'
    }, 1);

    console.log('2. Lower is Better Achievement OK -> Pct:', achLower.achievement_percentage, 'Status:', achLower.status);
    if (achLower.status !== 'achieved') throw new Error('Expected status achieved for lower_is_better 2/5');

    // 3. Test Zero Division Safety
    const zeroCalc = qualityService.calculateAchievementRate('higher_is_better', 0, 0);
    console.log('3. Zero Division Target=0 Actual=0 OK ->', zeroCalc);
    if (zeroCalc.percentage !== 100) throw new Error('Expected 100% for 0/0');

    // 4. Test Verification Status Update
    const verified = await qualityService.verifyAchievement(achHigher.id, 'verified', 1);
    console.log('4. Verify Achievement OK -> Status:', verified.verification_status, 'Verified By:', verified.verified_by);

    // 5. Test KPI Dashboard
    const dashboard = await qualityService.getKpiDashboard(null, '2026/2027');
    console.log('5. KPI Dashboard Stats OK ->', dashboard.stats);

    console.log('--- ALL FITUR 7 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 7 TEST ERROR:', err);
    process.exit(1);
  }
}

testTargetRealizationVerification();
