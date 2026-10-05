const Module = require('module');
const path = require('path');

const candidateDirs = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
  path.resolve(__dirname, '../../node_modules'),
  path.resolve(__dirname, '../../../node_modules'),
  path.resolve(process.cwd(), 'node_modules'),
  path.resolve(process.cwd(), '../node_modules'),
  path.resolve(process.cwd(), '../../node_modules'),
  '/home/u622997391/domains/api-ilms.aldeposibs.com/public_html/node_modules',
  '/home/u622997391/domains/api-ilms.aldeposibs.com/public_html/apps/api-backend/node_modules',
  '/home/u622997391/domains/api-ilms.aldeposibs.com/node_modules',
  '/home/u622997391/node_modules',
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
