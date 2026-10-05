/**
 * Server Entry Point for apps/api-backend
 */
const path = require('path');

// Daftarkan seluruh kemungkinan lokasi node_modules di lingkungan Hostinger LiteSpeed
const extraPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
  path.resolve(__dirname, '../../node_modules'),
  path.resolve(__dirname, '../../../node_modules'),
  path.resolve(process.cwd(), 'node_modules'),
  path.resolve(process.cwd(), '../node_modules'),
];

for (const p of extraPaths) {
  if (!module.paths.includes(p)) {
    module.paths.push(p);
  }
}

require('./src/server.js');
