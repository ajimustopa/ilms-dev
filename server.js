/**
 * Root Server Entry Point for Hostinger Deployment
 */
const path = require('path');

const extraPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, 'apps/api-backend/node_modules'),
  path.resolve(__dirname, '../node_modules'),
  path.resolve(process.cwd(), 'node_modules'),
];

for (const p of extraPaths) {
  if (!module.paths.includes(p)) {
    module.paths.push(p);
  }
}

require('./apps/api-backend/src/server.js');
