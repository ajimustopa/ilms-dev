const reportsService = require('../src/modules/keuangan/reports/service');

async function test() {
  console.log('--- TEST EXECUTIVE MANAGEMENT REPORTS ---');
  const schoolUnitId = 1;
  const academicYearId = 2;

  // 1. Executive Health
  console.log('1. Testing getExecutiveHealth...');
  const health = await reportsService.getExecutiveHealth(schoolUnitId, academicYearId);
  console.log('-> Summary:', health.summary);
  console.log('-> Indicators count:', health.indicators.length);
  health.indicators.forEach(ind => {
    console.log(`   [${ind.status.toUpperCase()}] ${ind.name}: ${ind.value} ${ind.unit} (${ind.status_label})`);
  });

  // 2. Financial Projection
  console.log('\n2. Testing getFinancialProjection...');
  const proj = await reportsService.getFinancialProjection(schoolUnitId, academicYearId);
  console.log('-> Method:', proj.projection_method);
  console.log('-> Current month:', proj.current_month);
  console.log('-> Projected year-end reserve:', proj.projected_year_end_reserve);
  console.log('-> Total months in trend:', proj.monthly_trend.length);

  // 3. Fund Source Monthly Flow
  console.log('\n3. Testing getFundSourceMonthlyFlow...');
  const flow = await reportsService.getFundSourceMonthlyFlow(schoolUnitId, academicYearId);
  console.log('-> Flow summary:', flow.summary);
  console.log('-> Fund sources count:', flow.sources.length);

  // 4. Program Expenses Matrix
  console.log('\n4. Testing getProgramExpensesMatrix...');
  const prog = await reportsService.getProgramExpensesMatrix(schoolUnitId, academicYearId);
  console.log('-> Program summary:', prog.summary);
  console.log('-> Total programs:', prog.programs.length);

  console.log('\n=== ALL EXECUTIVE REPORTS TESTS PASSED CLEANLY! ===\n');
  process.exit(0);
}

test().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
