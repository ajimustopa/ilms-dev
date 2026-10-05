const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const Module = require('module');

// 1. Periksa apakah node_modules ada di direktori kerja atau direktori aplikasi
const targetDir = path.resolve(__dirname, '..');
const nodeModulesDir = path.join(targetDir, 'node_modules');
const cwdNodeModules = path.join(process.cwd(), 'node_modules');

if (!fs.existsSync(nodeModulesDir) && !fs.existsSync(cwdNodeModules)) {
  console.log('[ALDEPOS BOOTSTRAP] Folder node_modules belum ada di direktori rilis. Menjalankan auto install...');
  try {
    execSync('npm install --omit=dev --no-audit --no-fund', {
      cwd: targetDir,
      stdio: 'inherit',
      timeout: 60000
    });
    console.log('[ALDEPOS BOOTSTRAP] Instalasi dependensi selesai dengan sukses!');
  } catch (err) {
    console.warn('[ALDEPOS BOOTSTRAP] Percobaan install targetDir gagal, mencoba di process.cwd()...', err.message);
    try {
      execSync('npm install --omit=dev --no-audit --no-fund', {
        cwd: process.cwd(),
        stdio: 'inherit',
        timeout: 60000
      });
      console.log('[ALDEPOS BOOTSTRAP] Instalasi dependensi di process.cwd() berhasil!');
    } catch (e) {
      console.error('[ALDEPOS BOOTSTRAP GAGAL]', e.message);
    }
  }
}

// 2. Daftarkan seluruh candidate search paths untuk Module resolution
const candidateDirs = [
  nodeModulesDir,
  cwdNodeModules,
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
  path.resolve(__dirname, '../../../node_modules'),
  '/home/u622997391/domains/api-ilms.aldeposibs.com/public_html/node_modules',
  '/home/u622997391/domains/api-ilms.aldeposibs.com/node_modules',
  '/home/u622997391/node_modules'
];

if (!global.__ALDEPOS_RESOLVER_INSTALLED__) {
  global.__ALDEPOS_RESOLVER_INSTALLED__ = true;
  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    try {
      return origResolve.call(this, request, parent, isMain, options);
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND' && !request.startsWith('.') && !request.startsWith('/')) {
        for (const dir of candidateDirs) {
          try {
            const resolved = origResolve.call(this, request, parent, isMain, {
              paths: [dir]
            });
            if (resolved) return resolved;
          } catch (e) {}
          try {
            const direct = path.join(dir, request);
            const resolved = origResolve.call(this, direct, parent, isMain, options);
            if (resolved) return resolved;
          } catch (e) {}
        }
      }
      throw err;
    }
  };
}

module.exports = candidateDirs;
