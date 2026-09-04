/**
 * Test Excel and PDF generation for Class Student Ledger
 */
const reportsService = require('../src/modules/keuangan/reports/service');
const classStudentLedgerExport = require('../src/modules/keuangan/reports/classStudentLedgerExport');
const crossModuleServices = require('../src/modules/keuangan/common/crossModuleServices');
const fs = require('fs');
const path = require('path');

async function testExports() {
  console.log('--- TESTING EXCEL AND PDF EXPORTS FOR STUDENT LEDGER ---');
  const schoolUnitId = 1;

  const data = await reportsService.getClassStudentLedger(schoolUnitId, { all_years: true, no_pagination: true });
  const schoolUnit = await crossModuleServices.getSchoolUnit(schoolUnitId);

  // 1. Test Excel
  console.log('\n[TEST 1] Generating Excel (.xlsx) with Native Formula SUM...');
  const excelBuf = classStudentLedgerExport.generateExcel(data, schoolUnit);
  console.log(`-> Excel Buffer generated, size: ${excelBuf.length} bytes`);
  if (!excelBuf || excelBuf.length < 1000) throw new Error('Excel buffer is empty or too small');

  // 2. Test PDF
  console.log('\n[TEST 2] Generating PDF Landscape with Signatures & Monthly Performance...');
  const pdfDoc = classStudentLedgerExport.generatePdf(data, schoolUnit, { name: 'Bendahara Sekolah' });
  const pdfChunks = [];
  pdfDoc.on('data', chunk => pdfChunks.push(chunk));

  await new Promise((resolve, reject) => {
    pdfDoc.on('end', () => {
      const pdfBuf = Buffer.concat(pdfChunks);
      console.log(`-> PDF Document generated, size: ${pdfBuf.length} bytes`);
      resolve();
    });
    pdfDoc.on('error', reject);
  });

  console.log('\n=== BOTH EXPORTS TESTED SUCCESSFULLY! ===\n');
  process.exit(0);
}

testExports().catch(err => {
  console.error('EXPORT TEST FAILED:', err);
  process.exit(1);
});
