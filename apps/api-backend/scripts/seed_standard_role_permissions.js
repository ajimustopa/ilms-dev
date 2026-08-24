/**
 * Seed role permissions for standard roles in Core DB
 */
const db = require('../src/config/db/core');

async function seedRolePermissions() {
  console.log('--- Memulai seeding permissions untuk standard roles ---');

  try {
    const roles = await db('roles').select('id', 'name');
    const permissions = await db('permissions').select('id', 'code', 'module');

    const roleMap = {};
    roles.forEach(r => { roleMap[r.name] = r.id; });

    const permMap = {};
    permissions.forEach(p => { permMap[p.code] = p.id; });

    const rolePermissionMapping = {
      super_admin: permissions.map(p => p.id), // All permissions
      admin_yayasan: permissions.map(p => p.id), // All permissions
      hrd: permissions.filter(p => p.module === 'kepegawaian' || p.code === 'core.view').map(p => p.id),
      keuangan: permissions.filter(p => p.module === 'keuangan' || p.code === 'core.view').map(p => p.id),
      tu: permissions.filter(p => ['akademik', 'kepegawaian', 'sarpras', 'perpustakaan'].includes(p.module)).map(p => p.id),
      guru: permissions.filter(p => p.code.startsWith('akademik.') || p.code === 'cbt.manage' || p.code === 'portal_siswa.view').map(p => p.id),
      wali_kelas: permissions.filter(p => p.code.startsWith('akademik.') || p.code === 'kesiswaan.view').map(p => p.id),
      guru_bk: permissions.filter(p => p.module === 'bk' || p.code.startsWith('akademik.')).map(p => p.id),
      sarpras_manager: permissions.filter(p => p.module === 'sarpras').map(p => p.id),
      pustakawan: permissions.filter(p => p.module === 'perpustakaan').map(p => p.id),
      panitia_ppdb: permissions.filter(p => p.module === 'ppdb').map(p => p.id),
      staf: permissions.filter(p => p.code.endsWith('.view')).map(p => p.id)
    };

    for (const [roleName, permIds] of Object.entries(rolePermissionMapping)) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;

      // Hapus yang lama
      await db('role_permissions').where({ role_id: roleId }).del();

      const inserts = permIds.map(pId => ({
        role_id: roleId,
        permission_id: pId,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }));

      if (inserts.length > 0) {
        await db('role_permissions').insert(inserts);
        console.log(`[OK] Role '${roleName}' dipasangkan ${inserts.length} permissions.`);
      }
    }

    console.log('--- Seeding role permissions SELESAI ---');
  } catch (error) {
    console.error('Error seeding role permissions:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

seedRolePermissions();
