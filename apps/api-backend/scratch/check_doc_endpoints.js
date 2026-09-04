const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.resolve(__dirname, '../../../ai-ref-keuangan.md'), 'utf8');

// Extract all endpoints from doc (e.g. `GET /api/v1/keuangan/...` or `POST /...`)
const endpointRegex = /`((GET|POST|PUT|PATCH|DELETE)\s+([\/a-zA-Z0-9_\-:\.]+))`|\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`?([\/a-zA-Z0-9_\-:\.]+)`?/g;

const docEndpoints = [];
let m;
while ((m = endpointRegex.exec(md)) !== null) {
  if (m[2] && m[3]) {
    docEndpoints.push({ method: m[2], path: m[3] });
  } else if (m[4] && m[5]) {
    docEndpoints.push({ method: m[4], path: m[5] });
  }
}

console.log('Doc endpoints extracted:', docEndpoints.length);

// Now load actual routes
const modulesDir = path.resolve(__dirname, '../src/modules/keuangan');
const subdirs = fs.readdirSync(modulesDir).filter(f => fs.statSync(path.join(modulesDir, f)).isDirectory() && f !== 'common');

const mounts = {
  'master-data': '/api/v1/keuangan/master-data',
  'budget': '/api/v1/keuangan/budget',
  'bills': '/api/v1/keuangan/bills',
  'payments': '/api/v1/keuangan/payments',
  'expenses': '/api/v1/keuangan/expenses',
  'other-incomes': '/api/v1/keuangan/other-incomes',
  'payroll': '/api/v1/keuangan/payroll',
  'bookkeeping': '/api/v1/keuangan/bookkeeping',
  'reports': '/api/v1/keuangan/reports',
  'dashboard': '/api/v1/keuangan/dashboard',
  'parent-facing': '/api/v1/keuangan/parent-facing',
  'schemes': '/api/v1/keuangan/schemes',
  'legacy-migration': '/api/v1/keuangan/legacy-migration',
  'cash-transfers': '/api/v1/keuangan/cash-transfers',
  'ppdb-billing': '/api/v1/keuangan/ppdb-billing'
};

const codeRoutes = [];
for (const sub of subdirs) {
  const routeFile = path.join(modulesDir, sub, 'routes.js');
  if (!fs.existsSync(routeFile)) continue;
  const content = fs.readFileSync(routeFile, 'utf8');
  const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const fullPath = (mounts[sub] || '') + match[2];
    codeRoutes.push({
      method: match[1].toUpperCase(),
      subPath: match[2],
      fullPath
    });
  }
}

const notInCode = [];
for (const de of docEndpoints) {
  const cleanPath = de.path.replace(/\/api\/v1\/keuangan\/?/, '/').replace(/\/+$/, '');
  const match = codeRoutes.find(cr => {
    if (cr.method !== de.method) return false;
    if (cr.fullPath === de.path) return true;
    const crClean = cr.fullPath.replace(/\/api\/v1\/keuangan\/?/, '/').replace(/\/+$/, '');
    return crClean === cleanPath || cr.subPath === de.path || cr.subPath === cleanPath;
  });
  if (!match) {
    notInCode.push(de);
  }
}

console.log('Doc endpoints NOT found in code (' + notInCode.length + '):');
console.log(JSON.stringify(notInCode, null, 2));
