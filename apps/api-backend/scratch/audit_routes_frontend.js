const fs = require('fs');
const path = require('path');

function parseRoutes() {
  const backendBase = path.join(__dirname, '../src/modules/keuangan');
  const submodules = fs.readdirSync(backendBase);

  console.log('========================================================================');
  console.log('INVENTARISASI LENGKAP ENDPOINT BACKEND KEUANGAN (BERDASARKAN KODE AKTUAL)');
  console.log('========================================================================');

  let grandTotalEndpoints = 0;
  const submoduleList = [];

  submodules.forEach(sub => {
    const routeFile = path.join(backendBase, sub, 'routes.js');
    if (fs.existsSync(routeFile)) {
      const content = fs.readFileSync(routeFile, 'utf8');
      
      // Match router.(get|post|put|patch|delete)(...)
      const regex = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]([\s\S]*?)(controller\.[a-zA-Z0-9_]+|\(req,\s*res\))/g;
      let match;
      const endpoints = [];

      while ((match = regex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const urlPath = match[2];
        const middlewares = match[3];
        const handler = match[4];

        let permission = 'verifyJwt (auth)';
        const permMatch = middlewares.match(/requirePermission\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
        if (permMatch) {
          permission = permMatch[1];
        } else if (middlewares.includes('requireRole')) {
          const roleMatch = middlewares.match(/requireRole\s*\(\s*\[?([^\]\)]+)\]?\s*\)/);
          permission = `requireRole(${roleMatch ? roleMatch[1].replace(/['"`\s]/g, '') : ''})`;
        } else if (middlewares.includes('requireApiKey')) {
          permission = 'requireApiKey (Internal API)';
        }

        endpoints.push({ method, path: urlPath, permission, handler });
      }

      grandTotalEndpoints += endpoints.length;
      submoduleList.push({ sub, endpoints });
    }
  });

  submoduleList.forEach(({ sub, endpoints }) => {
    console.log(`\n### Submodul: \`${sub}\` (${endpoints.length} endpoint)`);
    endpoints.forEach((e, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(2)}. ${e.method.padEnd(6)} ${e.path.padEnd(45)} | Handler: ${e.handler.padEnd(35)} | Perm: ${e.permission}`);
    });
  });

  console.log(`\nGRAND TOTAL ENDPOINT KEUANGAN: ${grandTotalEndpoints}`);

  // Scan Frontend Pages and Tabs
  console.log('\n========================================================================');
  console.log('INVENTARISASI LENGKAP HALAMAN FRONTEND KEUANGAN (BERDASARKAN KODE AKTUAL)');
  console.log('========================================================================');

  const frontendPagesDir = path.join(__dirname, '../../core-portal/src/apps/keuangan/pages');
  const pageFiles = fs.readdirSync(frontendPagesDir);

  pageFiles.forEach(f => {
    const fPath = path.join(frontendPagesDir, f);
    const content = fs.readFileSync(fPath, 'utf8');

    // Extract title / header / purpose
    const titleMatch = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || content.match(/title\s*=\s*['"`]([^'"`]+)['"`]/i);
    
    // Extract Tab lists if any
    const tabList = [];
    const tabStateMatch = content.match(/(?:const|let)\s+\[(activeTab|tab|activeMainTab|currentTab),\s*set\w+\]\s*=\s*useState\(['"`]([^'"`]+)['"`]\)/);
    
    // Find tab buttons/values
    const allTabMatches = [...content.matchAll(/active(?:Main)?Tab\s*===?\s*['"`]([^'"`]+)['"`]/g)];
    const uniqueTabs = [...new Set(allTabMatches.map(m => m[1]))];

    console.log(`\n📄 **${f}**`);
    if (tabStateMatch) {
      console.log(`   - Default Tab: \`${tabStateMatch[2]}\``);
      console.log(`   - Daftar Tab/Section (${uniqueTabs.length}): ${uniqueTabs.map(t => `\`${t}\``).join(', ')}`);
    } else {
      console.log(`   - Single view / form page`);
    }
  });
}

parseRoutes();
