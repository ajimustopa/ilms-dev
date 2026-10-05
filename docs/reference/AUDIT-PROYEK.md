Ran command: `Get-ChildItem -Path . -Depth 3 | Select-Object FullName, Mode, Length | Select-Object -First 100`
Ran command: `Get-ChildItem -Directory -Path .`
Ran command: `Get-ChildItem -Directory -Path .\apps`
Viewed package.json:1-24
Viewed package.json:1-70
Viewed package.json:1-32
Viewed package.json:1-27
Ran command: `Get-ChildItem -Path "apps\api-backend\src" -Recurse -Directory | Select-Object FullName`
Ran command: `Get-ChildItem -Path "apps\api-backend\src\modules" -Directory | Select-Object Name`
Ran command: `Get-ChildItem -Path "apps\core-portal\src" -Directory | Select-Object Name`
Ran command: `Get-ChildItem -Path "apps\core-portal\src\apps" -Directory | Select-Object Name`
Ran command: `Get-ChildItem -Path "apps\website-utama" -Recurse -Depth 3 | Select-Object FullName`
Ran command: `Get-ChildItem -Path "apps\website-utama" -Exclude "node_modules", ".next" | Select-Object FullName, Mode`
Ran command: `Get-ChildItem -Path "apps\website-utama\app", "apps\website-utama\lib" -Recurse | Select-Object FullName, Mode`
Viewed server.js:1-5
Viewed server.js:1-42
Viewed app.js:1-339
Viewed auth.js:1-27
Viewed verifyJwt.js:1-52
Viewed requirePermission.js:1-141
Ran command: `Get-ChildItem -Path "apps\api-backend\db\migrations" -Directory | Select-Object Name`
Ran command: `node -e "
const fs = require('fs');
const path = require('path');
const migDir = path.join('apps', 'api-backend', 'db', 'migrations');
const modules = fs.readdirSync(migDir);
const result = {};
for (const m of modules) {
  const p = path.join(migDir, m);
  if (fs.statSync(p).isDirectory()) {
    result[m] = fs.readdirSync(p);
  }
}
console.log(JSON.stringify(result, null, 2));
"`
Ran command: `node -e "
const fs = require('fs');
const path = require('path');

const migDir = path.join('apps', 'api-backend', 'db', 'migrations');
const modules = fs.readdirSync(migDir);

console.log('=== MODULES IN MIGRATIONS ===');
modules.forEach(m => {
  const p = path.join(migDir, m);
  if (fs.statSync(p).isDirectory()) {
    const files = fs.readdirSync(p);
    console.log(m + ': ' + files.length + ' migration files');
  }
});
"`
Ran command: `node -e "
const fs = require('fs');
const path = require('path');

const migDir = path.join('apps', 'api-backend', 'db', 'migrations');
const modules = fs.readdirSync(migDir).filter(m => fs.statSync(path.join(migDir, m)).isDirectory());

const moduleData = {};

modules.forEach(mod => {
  const p = path.join(migDir, mod);
  const files = fs.readdirSync(p).sort();
  const tables = {};
  
  files.forEach(f => {
    const content = fs.readFileSync(path.join(p, f), 'utf8');
    // Match createTable
    const createMatches = content.matchAll(/table\(|createTable\(['\"]([^'\"]+)['\"]/g);
    // Find all createTable('tableName'
    const ctRegex = /(?:schema\.)?createTable\(\s*['\"]([^'\"]+)['\"]\s*,\s*(?:function\s*)?\(([^)]+)\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g;
    let match;
    while ((match = ctRegex.exec(content)) !== null) {
      const tableName = match[1];
      const tableParam = match[2].trim();
      const body = match[3];
      if (!tables[tableName]) {
        tables[tableName] = { columns: [], fks: [], indexes: [], uniques: [] };
      }
      
      // parse lines in body
      const lines = body.split('\n');
      lines.forEach(l => {
        const trimmed = l.trim();
        // check fks
        const fkMatch = trimmed.match(/\.foreign\(\s*['\"]([^'\"]+)['\"]\s*\)\.references\(\s*['\"]([^'\"]+)['\"]\s*\)\.inTable\(\s*['\"]([^'\"]+)['\"]\s*\)/) ||
                        trimmed.match(/foreign\(\s*['\"]([^'\"]+)['\"]\s*\)/);
        if (fkMatch) {
          tables[tableName].fks.push(trimmed);
        }
        // check indexes
        if (trimmed.includes('.index(')) {
          tables[tableName].indexes.push(trimmed);
        }
        // check unique
        if (trimmed.includes('.unique(')) {
          tables[tableName].uniques.push(trimmed);
        }
      });
    }
  });
  
  moduleData[mod] = {
    migrationCount: files.length,
    tables: Object.keys(tables),
    tableDetails: tables
  };
});

console.log(JSON.stringify(Object.keys(moduleData).map(m => ({ module: m, tableCount: moduleData[m].tables.length, tables: moduleData[m].tables })), null, 2));
"`
Ran command: `node -e "const fs = require('fs'), path = require('path'); const migDir = path.join('apps', 'api-backend', 'db', 'migrations'); const mods = fs.readdirSync(migDir); mods.forEach(m => { const p = path.join(migDir, m); if (fs.statSync(p).isDirectory()) { const files = fs.readdirSync(p); const tbls = new Set(); files.forEach(f => { const c = fs.readFileSync(path.join(p, f), 'utf8'); const r = /createTable\(\s*['\x22]([^'\x22]+)['\x22]/g; let match; while((match = r.exec(c)) !== null) { tbls.add(match[1]); } }); console.log(m + ' (' + tbls.size + ' tables): ' + Array.from(tbls).join(', ')); } });"`
Ran command: `Get-ChildItem -Path "apps\api-backend\src\config\db" | Select-Object Name`
Viewed core.js:1-58
Ran command: `node -e "
const fs = require('fs');
const path = require('path');
const seedsDir = path.join('apps', 'api-backend', 'db', 'seeds');
if (fs.existsSync(seedsDir)) {
  const files = fs.readdirSync(seedsDir);
  console.log('Seeds:', files);
  files.forEach(f => {
    const c = fs.readFileSync(path.join(seedsDir, f), 'utf8');
    if (c.includes('roles') || c.includes('role_name') || c.includes('permissions')) {
      console.log('Found role/permission in ' + f);
    }
  });
}
"`
Ran command: `Get-ChildItem -Path "apps\api-backend\db\seeds\core" | Select-Object Name`
Ran command: `node -e "
const fs = require('fs');
const path = require('path');
const coreSeedsDir = path.join('apps', 'api-backend', 'db', 'seeds', 'core');
fs.readdirSync(coreSeedsDir).forEach(f => {
  console.log('=== ' + f + ' ===');
  console.log(fs.readFileSync(path.join(coreSeedsDir, f), 'utf8').substring(0, 1500));
});
"`
Ran command: `node -e "
const fs = require('fs');
const path = require('path');
const seedsDir = path.join('apps', 'api-backend', 'db', 'seeds');

function scanDir(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(item => {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      scanDir(full);
    } else if (item.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const matches = content.matchAll(/name:\s*['\x22]([a-zA-Z0-9_\-]+)['\x22]/g);
      for (const m of matches) {
        if (content.includes('roles') && !m[1].includes('Yayasan') && !m[1].includes('SD') && !m[1].includes('SMP')) {
          console.log(full + ' -> role: ' + m[1]);
        }
      }
    }
  });
}
scanDir(seedsDir);
"`
Ran command: `node -e "
const fs = require('fs');
const path = require('path');

function searchKeyword(dir, ext, kw) {
  let res = [];
  const list = fs.readdirSync(dir);
  list.forEach(item => {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== '.git') res = res.concat(searchKeyword(full, ext, kw));
    } else if (ext.some(e => item.endsWith(e))) {
      const c = fs.readFileSync(full, 'utf8');
      if (kw.test(c)) res.push(full);
    }
  });
  return res;
}

console.log('--- requirePermission usage in backend ---');
const permFiles = searchKeyword('apps/api-backend/src', ['.js'], /requirePermission/);
permFiles.forEach(f => console.log(f));
"`
Viewed App.jsx:1-17
Viewed router.jsx:1-800
Viewed router.jsx:800-1235
Viewed router.jsx:800-1235
Ran command: `node -e "
const fs = require('fs');
const path = require('path');

function getRouteFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getRouteFiles(full));
    } else if (file.endsWith('routes.js') || file.endsWith('routes.ts')) {
      results.push(full);
    }
  });
  return results;
}

const routeFiles = getRouteFiles('apps/api-backend/src');
console.log('Total route files:', routeFiles.length);

const endpoints = [];
routeFiles.forEach(rf => {
  const content = fs.readFileSync(rf, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const m = line.match(/router\.(get|post|put|patch|delete)\s*\(\s*['\x22]([^'\x22]+)['\x22]/i);
    if (m) {
      endpoints.push({
        file: rf,
        line: idx + 1,
        method: m[1].toUpperCase(),
        subpath: m[2]
      });
    }
  });
});
console.log('Total route endpoints found:', endpoints.length);
console.log('Sample endpoints:', endpoints.slice(0, 15));
"`
Ran command: `node -e "
const fs = require('fs');
const path = require('path');

function getFiles(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(full, ext));
    } else if (ext.some(e => file.endsWith(e))) {
      results.push(full);
    }
  });
  return results;
}

const controllers = getFiles('apps/api-backend/src', ['.js']);
let standardCount = 0;
let nonStandard = [];

controllers.forEach(cf => {
  const content = fs.readFileSync(cf, 'utf8');
  // check res.json(...)
  const matches = content.matchAll(/res\.(?:status\(\d+\)\.)?json\(([\s\S]*?)\)/g);
  for (const m of matches) {
    const body = m[1].trim();
    if (body.includes('success: true') || body.includes('success: false') || body.includes('success:')) {
      standardCount++;
    } else {
      // Check if it's returning raw object/array or custom
      if (!body.startsWith('{') && !body.startsWith('[')) {
        // variable returned
      } else {
        nonStandard.push({ file: cf, snippet: body.substring(0, 100).replace(/\n/g, ' ') });
      }
    }
  }
});

console.log('Standard response count matches:', standardCount);
console.log('Non-standard samples:', nonStandard.slice(0, 20));
"`
Viewed errorHandler.js:1-56
Ran command: `Get-ChildItem -Path "apps\core-portal\src\shared" -Recurse | Select-Object FullName`
Viewed tailwind.config.js:1-29
Ran command: `Get-ChildItem -Path "apps\core-portal\src" -Filter "*.css" -Recurse | Select-Object FullName`
Viewed index.css:1-207
Ran command: `node -e "
const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let res = [];
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res = res.concat(getFiles(p));
    else if (f.endsWith('.jsx') || f.endsWith('.tsx')) res.push(p);
  });
  return res;
}

const files = getFiles('apps/core-portal/src/apps');
console.log('Total portal page/component files:', files.length);

const missingLoading = [];
const missingEmpty = [];
const missingError = [];

files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  // if file fetches data (has useEffect or axios/api call or fetch)
  if (c.includes('useEffect') || c.includes('api.') || c.includes('fetch')) {
    const hasSkeleton = c.includes('LoadingSkeleton') || c.includes('Loader2') || c.includes('loading') || c.includes('isLoading') || c.includes('Spinner');
    const hasEmpty = c.includes('EmptyState') || c.includes('Tidak ada data') || c.includes('Belum ada data') || c.includes('length === 0') || c.includes('length === 0 ?');
    const hasError = c.includes('ErrorState') || c.includes('isError') || c.includes('error') || c.includes('catch(') || c.includes('catch (');
    
    if (!hasSkeleton) missingLoading.push(f);
    if (!hasEmpty && !f.includes('Login') && !f.includes('Modal') && !f.includes('Form')) missingEmpty.push(f);
    if (!hasError && !f.includes('Login') && !f.includes('Modal')) missingError.push(f);
  }
});

console.log('Missing loading states count:', missingLoading.length, missingLoading.slice(0, 5));
console.log('Missing empty states count:', missingEmpty.length, missingEmpty.slice(0, 5));
console.log('Missing error states count:', missingError.length, missingError.slice(0, 5));
"`
Ran command: `node -e "
const fs = require('fs');
const path = require('path');

function getFiles(dir, ext) {
  let res = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      if (f === 'node_modules' || f === '.git' || f === 'dist' || f === '.next') return;
      if (fs.statSync(p).isDirectory()) res = res.concat(getFiles(p, ext));
      else if (ext.some(e => f.endsWith(e))) res.push(p);
    });
  } catch (e) {}
  return res;
}

const allFiles = getFiles('.', ['.js', '.jsx', '.ts', '.tsx', '.json']);

// 1. Files > 300 lines
const largeFiles = [];
// 2. TODO / FIXME
const todos = [];
// 3. console.log
const consoleLogs = [];
// 4. Empty catch
const emptyCatches = [];
// 5. Hardcoded secrets / fallback secrets
const secretFallbacks = [];

allFiles.forEach(f => {
  // skip scratch/
  if (f.includes('scratch\\') || f.includes('scratch/')) return;
  
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  
  if (lines.length > 300) {
    largeFiles.push({ file: f, lines: lines.length });
  }
  
  lines.forEach((l, idx) => {
    const lineNum = idx + 1;
    if (l.includes('TODO') || l.includes('FIXME')) {
      todos.push({ file: f, line: lineNum, text: l.trim() });
    }
    if (l.includes('console.log(') && !f.includes('server.js') && !f.includes('test_')) {
      consoleLogs.push({ file: f, line: lineNum });
    }
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(l) || /catch\s*\{\s*\}/.test(l)) {
      emptyCatches.push({ file: f, line: lineNum, text: l.trim() });
    }
    if ((l.includes('|| \'default_') || l.includes('|| "default_') || l.includes('|| \'secret') || l.includes('|| "secret')) && (l.includes('SECRET') || l.includes('KEY') || l.includes('PASSWORD') || l.includes('TOKEN'))) {
      secretFallbacks.push({ file: f, line: lineNum, text: l.trim() });
    }
  });
});

console.log('=== LARGE FILES (>300 lines) ===');
console.log('Total:', largeFiles.length);
console.log('Top 10 largest:', largeFiles.sort((a,b) => b.lines - a.lines).slice(0, 10));

console.log('=== TODO / FIXME ===');
console.log('Total:', todos.length);
console.log('Sample todos:', todos.slice(0, 10));

console.log('=== CONSOLE.LOGS ===');
console.log('Total:', consoleLogs.length);
console.log('Sample files with console.log:', consoleLogs.slice(0, 10));

console.log('=== EMPTY CATCH BLOCKS ===');
console.log('Total:', emptyCatches.length);
console.log('Empty catch entries:', emptyCatches);

console.log('=== HARDCODED SECRET FALLBACKS ===');
console.log('Total:', secretFallbacks.length);
console.log('Secret fallbacks:', secretFallbacks);
"`
Ran command: `powershell -Command @"
$js = @'
const fs = require('fs');
const path = require('path');

function getFiles(dir, ext) {
  let res = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      if (f === 'node_modules' || f === '.git' || f === 'dist' || f === '.next') return;
      if (fs.statSync(p).isDirectory()) res = res.concat(getFiles(p, ext));
      else if (ext.some(e => f.endsWith(e))) res.push(p);
    });
  } catch (e) {}
  return res;
}

const allFiles = getFiles('.', ['.js', '.jsx', '.ts', '.tsx']);
const largeFiles = [];
const todos = [];
const consoleLogs = [];
const emptyCatches = [];
const secretFallbacks = [];

allFiles.forEach(f => {
  if (f.includes('scratch\\') || f.includes('scratch/')) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  if (lines.length > 300) {
    largeFiles.push({ file: f, lines: lines.length });
  }
  lines.forEach((l, idx) => {
    const lineNum = idx + 1;
    if (l.includes('TODO') || l.includes('FIXME')) {
      todos.push({ file: f, line: lineNum, text: l.trim() });
    }
    if (l.includes('console.log(') && !f.includes('server.js') && !f.includes('test_')) {
      consoleLogs.push({ file: f, line: lineNum, text: l.trim() });
    }
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(l) || /catch\s*\{\s*\}/.test(l)) {
      emptyCatches.push({ file: f, line: lineNum, text: l.trim() });
    }
    if (l.includes('||') && (l.includes('SECRET') || l.includes('JWT') || l.includes('API_KEY')) && (l.includes('default') || l.includes('secret') || l.includes('key'))) {
      secretFallbacks.push({ file: f, line: lineNum, text: l.trim() });
    }
  });
});

console.log('=== LARGE FILES (>300 lines) === (' + largeFiles.length + ')');
largeFiles.sort((a,b) => b.lines - a.lines).slice(0, 15).forEach(x => console.log(x.lines + ' lines: ' + x.file));

console.log('\n=== TODO / FIXME === (' + todos.length + ')');
todos.slice(0, 15).forEach(x => console.log(x.file + ':' + x.line + ' ' + x.text));

console.log('\n=== CONSOLE.LOGS === (' + consoleLogs.length + ')');
console.log('Total console.log occurrences:', consoleLogs.length);

console.log('\n=== EMPTY CATCH BLOCKS === (' + emptyCatches.length + ')');
emptyCatches.forEach(x => console.log(x.file + ':' + x.line + ' ' + x.text));

console.log('\n=== HARDCODED SECRET FALLBACKS === (' + secretFallbacks.length + ')');
secretFallbacks.forEach(x => console.log(x.file + ':' + x.line));
'@
node -e $js
"@`
Ran command: `Get-ChildItem -Path ".\scratch" | Select-Object Name`
Ran command: `Get-ChildItem -Path . -Recurse -Include *.js, *.jsx, *.ts, *.tsx -Exclude node_modules, dist, .next, scratch | Where-Object { $_.FullName -notmatch '\\(node_modules|\.git|dist|\.next|scratch)\\' } | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; if ($lines -gt 300) { [PSCustomObject]@{ Path = $_.FullName.Replace((Get-Location).Path + '\', ''); Lines = $lines } } } | Sort-Object -Descending Lines | Select-Object -First 30`
Used tool: manage_task
Ran command: `Get-ChildItem -Path . -Force -Include .github, .eslintrc*, .prettierrc*, vitest.config*, jest.config*, tsconfig*`
Ran command: `Test-Path .github, .eslintrc.json, .eslintrc.js, .prettierrc, jest.config.js`
Used tool: manage_task
Ran command: `Get-ChildItem -Path . -Recurse -Include *.js, *.jsx, *.ts, *.tsx -Exclude node_modules, dist, .next, scratch | Where-Object { $_.FullName -notmatch '\\(node_modules|\.git|dist|\.next|scratch)\\' } | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; if ($lines -gt 300) { $_.FullName } } | Measure-Object`
Used tool: manage_task
Used tool: manage_task
Ran command: `Get-ChildItem -Path "apps" -Recurse -Include *.js, *.jsx, *.ts, *.tsx -Exclude node_modules, dist, .next | Select-String -Pattern "TODO|FIXME" | Measure-Object`
Used tool: manage_task
Used tool: manage_task
Ran command: `Get-ChildItem -Path "apps" -Recurse -Include *.js, *.ts -Exclude node_modules, dist, .next | Select-String -Pattern "JWT_SECRET|API_KEY|DB_PASSWORD" | Where-Object { $_.Line -match "\|\|" } | Select-Object Path, LineNumber, Line`
Used tool: manage_task
Used tool: manage_task
Used tool: manage_task
Used tool: manage_task
Used tool: manage_task
Searched for "TODO|FIXME"
Searched for "TODO|FIXME"
Searched for "TODO|FIXME"
Searched for "console.log("
Searched for "console.log("
Created AUDIT-PROYEK.md
Searched for "—"

Dokumen audit komprehensif telah selesai disusun dan disimpan di [AUDIT-PROYEK.md](file:///c:/PROYEK/Core%20Aldepos/AUDIT-PROYEK.md).

---

### Ringkasan 10 Baris Hasil Audit

1. **Arsitektur Sistem**: Berbasis monorepo npm workspaces dengan backend Express Modular Monolith (`apps/api-backend`), portal internal React/Vite (`apps/core-portal`), dan website publik Next.js 14 (`apps/website-utama`).
2. **Isolasi Database**: Mengelola 11 database MariaDB terpisah (total 346 tabel) dengan aturan isolasi ketat tanpa cross-database foreign key atau cross-database SQL JOIN.
3. **Cakupan Modul**: Seluruh 11 domain operasional (Core, Kepegawaian, Akademik, Keuangan, Alquran, Kantin, Sarpras, Dapur, Perpustakaan, Manajemen, Website Utama) telah terimplementasi penuh.
4. **Volume API**: Backend menyediakan 643 endpoint REST API pada 107 file router dengan format respons standar `{ success, data, message, errors }`.
5. **Otentikasi & Multi-Tenancy**: Menggunakan JWT SSO yang mengisolasi akses antar-satuan pendidikan pada level aplikasi melalui middleware [requirePermission.js](file:///c:/PROYEK/Core%20Aldepos/apps/api-backend/src/middlewares/requirePermission.js).
6. **Logika Bisnis Unggulan**: Terdapat Timetable Engine 2-Fase (Backtracking MRV + Simulated Annealing), state machine tagihan santri dengan akumulasi tunggakan, rekonsiliasi mutasi rekening koran, dan skoring psikotes MBTI/Big Five.
7. **Utang Teknis Komponen Frontend**: Terdapat 188 file berukuran > 300 baris, dengan beberapa halaman raksasa mencapai 5.000 hingga 6.300 baris (seperti `Payments.jsx`, `JadwalPelajaran.jsx`, `Kurikulum.jsx`).
8. **Temuan Keamanan**: Ditemukan fallback string nilai rahasia (`CORE_JWT_SECRET`) pada verifikasi JWT dan middleware `requireApiKey` yang belum memvalidasi hash ke tabel `api_clients`.
9. **Ketiadaan Test Runner & CI**: Skrip otomatisasi pengujian (`npm test`), linter (ESLint), dan konfigurasi CI/CD GitHub Actions belum terpasang di `package.json`.
10. **Design System & UI**: Desain konsisten berbasis Tailwind CSS, tipografi Inter dengan `tabular-nums`, sticky table header global, serta 16 komponen antarmuka reusable di `apps/core-portal/src/shared/components/`.

---

### Bagian yang Datanya Tidak Lengkap karena Keterbatasan Akses

1. **Database Runtime Profiling**: Detail metrik live database (eksekusi `EXPLAIN query`, ukuran data fisik tabel di disk, dan statistik index hit ratio) tidak dapat diukur langsung dari koneksi runtime server produksi/staging karena audit dilakukan secara statis read-only pada repositori lokal.
2. **Kredensial & Lingkungan Produksi**: Konfigurasi file `.env` produksi (seperti endpoint payment gateway riil, API key pihak ketiga, dan webhook secret produksi) tidak diakses sesuai aturan privasi dan keamanan repositori.
3. **Log Eksekusi Server Nyata**: Log kegagalan transaksi, query lambat (slow query logs), dan traffic audit log riil pengguna pada sistem produksi tidak tercatat di repositori kode sumber.