const path = require('path');
process.env.NODE_ENV = 'development';

async function test() {
  const reportsService = require(path.join(__dirname, 'apps/api-backend/src/modules/keuangan/reports/service'));

  // Test Student #147 (Alumni with bills in 2024/2025)
  console.log('=== Test Student #147 with academic_year_id = 2 (2026/2027) ===');
  const res147_active = await reportsService.getStudentLedger(1, 147, { academic_year_id: 2 });
  console.log('Student 147 AYs in pivot:', res147_active.pivot_table?.academic_years);
  console.log('Student 147 pivot grand_total:', res147_active.pivot_table?.grand_total);
  console.log('Student 147 summary arrears_previous_year:', res147_active.summary?.arrears_previous_year);

  console.log('\n=== Test Student #147 with all_years = true ===');
  const res147_all = await reportsService.getStudentLedger(1, 147, { all_years: true });
  console.log('Student 147 AYs in pivot:', res147_all.pivot_table?.academic_years);
  console.log('Student 147 pivot grand_total:', res147_all.pivot_table?.grand_total);

  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
