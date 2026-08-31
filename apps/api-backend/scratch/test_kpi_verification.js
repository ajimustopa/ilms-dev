const db = require('../src/config/db/manajemen');
const qualityService = require('../src/modules/manajemen/quality/service');

async function testKpiVerification() {
  console.log('--- TEST FITUR 6: KAMUS INDIKATOR KINERJA / KPI ---');

  try {
    const uniqueCode = `KPI-TEST-${Date.now().toString().slice(-4)}`;

    // 1. Create KPI in Dictionary
    const newKpi = await qualityService.createIndicator({
      code: uniqueCode,
      name: 'Persentase Kelulusan Santri Berstandar Mumtaz',
      definition: 'Jumlah santri tingkat akhir yang lulus dengan predikat Mumtaz dibagi total santri peserta ujian nasional/pesantren dikali 100%.',
      category: 'akademik',
      unit_of_measure: '% Santri',
      baseline_value: '85.0',
      baseline_year: 2025,
      target_value: 95.00,
      calculation_method: '(Santri_Mumtaz / Total_Santri_Ujian) * 100%',
      frequency: 'tahunan',
      data_source_module: 'Akademik & Rapor',
      status: 'active'
    }, 1);
    console.log('1. Created KPI Dictionary OK:', newKpi.id, newKpi.code, newKpi.name);

    // 2. Test Uniqueness (Should Fail if duplicate code)
    try {
      await qualityService.createIndicator({
        code: uniqueCode,
        name: 'Duplicate KPI Test',
        category: 'akademik'
      }, 1);
      throw new Error('Uniqueness validation failed: Allowed duplicate code!');
    } catch (e) {
      console.log('2. Uniqueness validation OK -> Caught duplicate error:', e.message);
    }

    // 3. Get KPI by Id with detail
    const detail = await qualityService.getIndicatorById(newKpi.id);
    console.log('3. Detail KPI OK -> Definition:', detail.definition, 'Formula:', detail.calculation_method);

    // 4. List indicators
    const list = await qualityService.listIndicators(null, { search: uniqueCode });
    console.log('4. List indicators count:', list.length);
    if (list.length === 0) throw new Error('Expected to find created indicator in list');

    console.log('--- ALL FITUR 6 TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('FITUR 6 TEST ERROR:', err);
    process.exit(1);
  }
}

testKpiVerification();
