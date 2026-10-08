/**
 * Migration: seed_guru_calon_murid_permissions_and_roles
 * Menambahkan Permissions untuk Portal Guru dan Portal Calon Murid
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const newPermissions = [
    { code: 'guru.view', module: 'guru', description: 'Hanya Tampil / View Only Portal Guru' },
    { code: 'guru.manage', module: 'guru', description: 'Akses Penuh / Guru & Pendidik Modul Portal Guru' },
    { code: 'calon_murid.view', module: 'calon_murid', description: 'Hanya Tampil / View Only Portal Calon Murid' },
    { code: 'calon_murid.manage', module: 'calon_murid', description: 'Akses Penuh / Pengelolaan Portal Calon Murid' }
  ];

  for (const p of newPermissions) {
    const exists = await knex('permissions').where({ code: p.code }).first();
    if (!exists) {
      await knex('permissions').insert({
        code: p.code,
        module: p.module,
        description: p.description,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    } else {
      await knex('permissions').where({ id: exists.id }).update({
        module: p.module,
        description: p.description,
        updated_at: knex.fn.now()
      });
    }
  }

  // Hubungkan permission guru ke role 'guru' dan 'wali_kelas'
  const guruRoles = ['guru', 'wali_kelas', 'guru_bk', 'waka_kurikulum'];
  for (const roleName of guruRoles) {
    const role = await knex('roles').where({ name: roleName }).first();
    if (role) {
      for (const code of ['guru.view', 'guru.manage']) {
        const perm = await knex('permissions').where({ code }).first();
        if (perm) {
          const relExists = await knex('role_permissions')
            .where({ role_id: role.id, permission_id: perm.id })
            .first();
          if (!relExists) {
            await knex('role_permissions').insert({
              role_id: role.id,
              permission_id: perm.id,
              created_at: knex.fn.now()
            });
          }
        }
      }
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const codes = ['guru.view', 'guru.manage', 'calon_murid.view', 'calon_murid.manage'];
  const perms = await knex('permissions').whereIn('code', codes);
  for (const p of perms) {
    await knex('role_permissions').where({ permission_id: p.id }).del();
  }
  await knex('permissions').whereIn('code', codes).del();
};
