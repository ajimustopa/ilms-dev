/**
 * Core Migration: Seed Leave, Balance & Overtime Permissions
 * Core Aldepos - Modul Core
 * Conforms to SPEC-CUTI-LEMBUR.md §9.5
 */

exports.up = async function(knex) {
  const newPermissions = [
    { code: 'kepegawaian.leave_requests.read', module: 'kepegawaian', description: 'Melihat daftar dan rekap pengajuan cuti/izin pegawai' },
    { code: 'kepegawaian.leave_requests.override', module: 'kepegawaian', description: 'Melakukan bypass, reklasifikasi, pembatalan dan recalculate pengajuan cuti' },
    { code: 'kepegawaian.leave_types.manage', module: 'kepegawaian', description: 'Mengelola master jenis cuti, profil approval, dan pengaturan modul cuti' },
    { code: 'kepegawaian.holidays.manage', module: 'kepegawaian', description: 'Mengelola kalender libur nasional, libur sekolah, dan cuti bersama' },
    { code: 'kepegawaian.leave_balances.read', module: 'kepegawaian', description: 'Melihat saldo dan mutasi ledger hak cuti pegawai' },
    { code: 'kepegawaian.leave_balances.manage', module: 'kepegawaian', description: 'Melakukan penyesuaian (adjust), bulk-assign, dan tutup periode saldo cuti' },
    { code: 'kepegawaian.overtime_settings.manage', module: 'kepegawaian', description: 'Mengelola kebijakan dan tarif lembur pegawai' },
    { code: 'kepegawaian.leave_reports.read', module: 'kepegawaian', description: 'Melihat dan mengekspor laporan analitik cuti dan lembur' }
  ];

  for (const perm of newPermissions) {
    const existing = await knex('permissions').where({ code: perm.code }).first();
    if (!existing) {
      await knex('permissions').insert({
        code: perm.code,
        module: perm.module,
        description: perm.description,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    } else {
      await knex('permissions').where({ id: existing.id }).update({
        module: perm.module,
        description: perm.description,
        updated_at: knex.fn.now()
      });
    }
  }

  // Fetch all permission IDs
  const allPerms = await knex('permissions').whereIn('code', newPermissions.map(p => p.code));
  const permMap = {};
  allPerms.forEach(p => { permMap[p.code] = p.id; });

  // Helper to link permission to role
  async function assignPermissionsToRole(roleName, permCodes) {
    const role = await knex('roles').where({ name: roleName }).first();
    if (!role) return;

    for (const pCode of permCodes) {
      const pId = permMap[pCode];
      if (!pId) continue;
      const existing = await knex('role_permissions').where({ role_id: role.id, permission_id: pId }).first();
      if (!existing) {
        await knex('role_permissions').insert({
          role_id: role.id,
          permission_id: pId
        });
      }
    }
  }

  const allPermCodes = newPermissions.map(p => p.code);
  const unitAdminPermCodes = [
    'kepegawaian.leave_requests.read',
    'kepegawaian.leave_requests.override',
    'kepegawaian.holidays.manage',
    'kepegawaian.leave_balances.read',
    'kepegawaian.leave_reports.read'
  ];

  await assignPermissionsToRole('super_admin', allPermCodes);
  await assignPermissionsToRole('admin_yayasan', allPermCodes);
  await assignPermissionsToRole('hrd', allPermCodes);
  await assignPermissionsToRole('admin_satuan_pendidikan', unitAdminPermCodes);
};

exports.down = async function(knex) {
  const permCodes = [
    'kepegawaian.leave_requests.read',
    'kepegawaian.leave_requests.override',
    'kepegawaian.leave_types.manage',
    'kepegawaian.holidays.manage',
    'kepegawaian.leave_balances.read',
    'kepegawaian.leave_balances.manage',
    'kepegawaian.overtime_settings.manage',
    'kepegawaian.leave_reports.read'
  ];

  const perms = await knex('permissions').whereIn('code', permCodes);
  const permIds = perms.map(p => p.id);

  if (permIds.length > 0) {
    await knex('role_permissions').whereIn('permission_id', permIds).del();
    await knex('permissions').whereIn('id', permIds).del();
  }
};
