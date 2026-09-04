const fs = require('fs');
const path = require('path');

const modulesDir = path.resolve(__dirname, '../src/modules/keuangan');
const subdirs = fs.readdirSync(modulesDir).filter(f => fs.statSync(path.join(modulesDir, f)).isDirectory() && f !== 'common');

const routes = [];

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

for (const sub of subdirs) {
  const routeFile = path.join(modulesDir, sub, 'routes.js');
  if (!fs.existsSync(routeFile)) continue;
  const content = fs.readFileSync(routeFile, 'utf8');
  const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const fullPath = (mounts[sub] || '') + match[2];
    routes.push({
      module: sub,
      method: match[1].toUpperCase(),
      subPath: match[2],
      fullPath
    });
  }
}

console.log('Total extracted routes from code:', routes.length);
const md = fs.readFileSync(path.resolve(__dirname, '../../../ai-ref-keuangan.md'), 'utf8');

const missingInDoc = [];
for (const r of routes) {
  // check if method and subPath or fullPath is in md
  const hasFullPath = md.includes(r.fullPath);
  const hasSubPath = md.includes(r.subPath);
  if (!hasFullPath && !hasSubPath) {
    missingInDoc.push(r);
  }
}

console.log('Routes in code but missing in doc (' + missingInDoc.length + '):');
console.log(JSON.stringify(missingInDoc, null, 2));
