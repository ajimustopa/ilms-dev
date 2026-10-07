/**
 * Test Runner for All Leave Module Test Suites
 * Modul Kepegawaian - Core Aldepos
 * Runs each test suite in an isolated process to prevent connection pool leaks
 */

const { spawnSync } = require('child_process');
const path = require('path');

const testFiles = [
  'tahap1_foundation.test.js',
  'tahap1_integration.test.js',
  'tahap2_holidays_foundation.test.js',
  'tahap2_holidays_integration.test.js',
  'tahap4_master_types_foundation.test.js',
  'tahap4_master_types_integration.test.js',
  'durationCalculator.test.js',
  'tahap6_duration_integration.test.js'
];

console.log('================================================================');
console.log('RUNNING ALL LEAVE MODULE AUTOMATED TEST SUITES (TAHAP 1 - 6)');
console.log('================================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const file of testFiles) {
  const filePath = path.join(__dirname, '..', file);
  console.log(`\n--- Running: ${file} ---`);

  const proc = spawnSync('node', ['--test', filePath], {
    stdio: 'inherit',
    env: process.env
  });

  if (proc.status === 0) {
    console.log(`[PASS] ${file}`);
    results.push({ file, status: 'PASS' });
    totalPassed++;
  } else {
    console.error(`[FAIL] ${file} (exit code ${proc.status})`);
    results.push({ file, status: 'FAIL' });
    totalFailed++;
  }
}

console.log('\n================================================================');
console.log('TEST SUMMARY');
console.log('================================================================');
results.forEach(r => {
  console.log(`${r.status === 'PASS' ? '✅' : '❌'} ${r.file}: ${r.status}`);
});
console.log(`\nTotal Suites Passed: ${totalPassed} / ${testFiles.length}`);

if (totalFailed > 0) {
  console.error(`❌ ${totalFailed} test suites failed!`);
  process.exit(1);
} else {
  console.log('🎉 ALL TEST SUITES PASSED CLEANLY (100%)!');
  process.exit(0);
}
