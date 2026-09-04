/**
 * Test Unified All Inflows
 */
const service = require('../src/modules/keuangan/payments/service');

async function testAllInflows() {
  console.log('--- TESTING ALL INFLOWS AGGREGATE ---');
  const schoolUnitId = 1;

  const res = await service.getAllInflows(schoolUnitId, { per_page: 10 });
  console.log('-> Summary:', res.summary);
  console.log(`-> Returned ${res.inflows.length} rows`);
  if (res.inflows.length > 0) {
    console.log('   Sample row:', res.inflows[0]);
  }

  console.log('=== TEST ALL INFLOWS SUCCESSFUL! ===');
  process.exit(0);
}

testAllInflows().catch(err => {
  console.error(err);
  process.exit(1);
});
