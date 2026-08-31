import { mapDataToSvarFormat, normalizeTaskStatus, getTaskCategory } from '../src/apps/manajemen/components/gantt/adapters/mapDataToSvarFormat.js';
import { DataTree } from '../../../node_modules/@svar-ui/lib-state/dist/index.js';

console.log('================================================================');
console.log('🧪 VERIFIKASI ADAPTER SVAR GANTT (FLAT ARRAY + TREE INTEGRITY)');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
  }
}

// 1. Test Dataset Sample
const dbSample = [
  { id: 2, item_type: 'activity', title: 'Draf Program', tag: 'dokumentasi', start_date: '2026-07-20', end_date: '2026-08-15', bidang_name: 'AKADEMIK', sub_bidang_name: 'Bahasa', program_name: 'Language Camp', program_code: 'PRG-115' },
  { id: 3, item_type: 'activity', title: 'Survei Online', tag: 'dokumentasi', start_date: '2026-08-01', end_date: '2026-08-10', bidang_name: 'AKADEMIK', sub_bidang_name: 'Bahasa', program_name: 'Language Camp', program_code: 'PRG-115' },
  { id: 4, item_type: 'activity', title: 'Survei Langsung', tag: 'koordinasi', start_date: '2026-08-10', end_date: '2026-08-20', bidang_name: 'AKADEMIK', sub_bidang_name: 'Bahasa', program_name: 'Language Camp', program_code: 'PRG-115' },
  { id: 5, item_type: 'activity', title: 'Rapat penyusunan program', tag: 'rapat', start_date: '2026-08-15', end_date: '2026-08-18', bidang_name: 'AKADEMIK', sub_bidang_name: 'Bahasa', program_name: 'Language Camp', program_code: 'PRG-115' },
  { id: 6, item_type: 'activity', title: 'Rundown Acara', tag: 'dokumen', start_date: '2026-08-20', end_date: '2026-08-25', bidang_name: 'AKADEMIK', sub_bidang_name: 'Bahasa', program_name: 'Language Camp', program_code: 'PRG-115' },
  { id: 7, item_type: 'task', title: 'Instalasi Jaringan Server', start_date: '2026-08-01', end_date: '2026-08-30', project_name: 'Modernisasi Lab' },
];

const { tasks, links, categories } = mapDataToSvarFormat(dbSample);

console.log('--- 1. Testing Flat Array Structure ---');
assert(Array.isArray(tasks), 'Tasks is an array');
assert(tasks.length >= 6 + 3, `Tasks contains leaf items + summary groups (count: ${tasks.length})`);

// 2. Test Hierarchy Parent Pointers
console.log('\n--- 2. Testing Parent Linkage Hierarchy ---');
const bidangTasks = tasks.filter((t) => t.group_level === 'bidang');
const subBidangTasks = tasks.filter((t) => t.group_level === 'sub_bidang');
const progTasks = tasks.filter((t) => t.group_level === 'program');
const leafTasks = tasks.filter((t) => !t.is_group);

assert(bidangTasks.length > 0 && bidangTasks.every((b) => b.parent === 0), 'Bidang summary parent is 0');
assert(subBidangTasks.length > 0 && subBidangTasks.every((sb) => typeof sb.parent === 'string' && sb.parent.startsWith('grp-bidang-')), 'Sub Bidang links to Bidang');
assert(progTasks.length > 0 && progTasks.every((p) => typeof p.parent === 'string' && p.parent.startsWith('grp-subbidang-')), 'Program links to Sub Bidang');
assert(leafTasks.length === 6 && leafTasks.every((l) => typeof l.parent === 'string' && l.parent.startsWith('grp-prog-')), 'Leaf tasks link to Program');

// 3. Test No Manual Nested data
console.log('\n--- 3. Testing Absence of Conflicting Nested data Field ---');
assert(tasks.every((t) => t.data === undefined), 'No task has manual data property');

// 4. Test Svar DataTree Parser Compatibility (The exact point of crash)
console.log('\n--- 4. Testing @svar-ui/lib-state DataTree Parsing ---');
let parsedArray = [];
let parseError = null;
try {
  const tree = new DataTree(tasks);
  parsedArray = tree.toArray();
} catch (e) {
  parseError = e;
}

assert(parseError === null, 'DataTree parsed tasks without throwing any error');
assert(parsedArray.length === tasks.length, `DataTree.toArray() traversed all ${tasks.length} items successfully`);

// 5. Test Link Validation
console.log('\n--- 5. Testing Link Validation ---');
const sampleWithBadLink = [
  ...dbSample,
  { id: 99, item_type: 'activity', title: 'Item With Missing Dep', parent_activity_id: 999999 },
];
const resWithLink = mapDataToSvarFormat(sampleWithBadLink);
const badLinks = resWithLink.links.filter((l) => l.source === 'act-999999');
assert(badLinks.length === 0, 'Invalid links with non-existent source/target are filtered out');

console.log('\n================================================================');
console.log(`🎉 ALL ADAPTER & SVAR DATATREE INTEGRITY TESTS PASSED: ${passed}/${total} assertions!`);
console.log('================================================================\n');

process.exit(passed === total ? 0 : 1);
