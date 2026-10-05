const fs = require('fs');
const path = require('path');

const rootModules = path.resolve(__dirname, '../node_modules');
const backendModules = path.resolve(__dirname, '../apps/api-backend/node_modules');

if (fs.existsSync(rootModules)) {
  try {
    if (!fs.existsSync(backendModules)) {
      console.log('[SYNC-MODULES] Menyalin node_modules ke apps/api-backend/node_modules...');
      fs.cpSync(rootModules, backendModules, { recursive: true });
      console.log('[SYNC-MODULES] Berhasil!');
    }
  } catch (err) {
    console.warn('[SYNC-MODULES WARNING]', err.message);
  }
}
