/**
 * Migration: seed_kantin_dapur_website_permissions_and_roles
 * Menambahkan Permissions dan Role Standar untuk Modul Kantin, Dapur, dan Website Utama CMS
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Daftar Permissions Modul Baru
  const newPermissions = [
    { code: 'kantin.view', module: 'kantin', description: 'Hanya Tampil / View Only Modul Kantin & e-Wallet Santri' },
    { code: 'kantin.manage', module: 'kantin', description: 'Akses Penuh / Admin Modul Kantin & e-Wallet Santri' },
    { code: 'dapur.view', module: 'dapur', description: 'Hanya Tampil / View Only Modul Dapur & Logistik Konsumsi' },
    { code: 'dapur.manage', module: 'dapur', description: 'Akses Penuh / Admin Modul Dapur & Logistik Konsumsi' },
    { code: 'website_utama.view', module: 'website_utama', description: 'Hanya Tampil / View Only Modul Website Utama CMS' },
    { code: 'website_utama.manage', module: 'website_utama', description: 'Akses Penuh / Admin Modul Website Utama CMS' }
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

  // 2. Daftar Role Standar Baru
  const newRoles = [
    { name: 'pengelola_kantin', description: 'Pengelola Kantin, Kasir POS & Dompet Santri', is_system_role: true, permissions: ['kantin.view', 'kantin.manage'] },
    { name: 'staf_dapur', description: 'Pengelola Dapur, Menu Makanan & Logistik Konsumsi Santri', is_system_role: true, permissions: ['dapur.view', 'dapur.manage'] },
    { name: 'admin_website', description: 'Pengelola Website Utama CMS & Publikasi Informasi', is_system_role: true, permissions: ['website_utama.view', 'website_utama.manage'] }
  ];

  for (const r of newRoles) {
    let role = await knex('roles').where({ name: r.name }).first();
    if (!role) {
      const [newId] = await knex('roles').insert({
        name: r.name,
        description: r.description,
        is_system_role: r.is_system_role ? 1 : 0,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
      role = { id: newId || (await knex('roles').where({ name: r.name }).first()).id };
    }

    // Hubungkan permissions ke role
    for (const code of r.permissions) {
      const perm = await knex('permissions').where({ code }).first();
      if (perm && role) {
        const existingRel = await knex('role_permissions')
          .where({ role_id: role.id, permission_id: perm.id })
          .first();
        if (!existingRel) {
          await knex('role_permissions').insert({
            role_id: role.id,
            permission_id: perm.id,
            created_at: knex.fn.now()
          });
        }
      }
    }
  }
};

exports.down = async function (knex) {
  const codes = [
    'kantin.view',
    'kantin.manage',
    'dapur.view',
    'dapur.manage',
    'website_utama.view',
    'website_utama.manage'
  ];
  const roleNames = ['pengelola_kantin', 'staf_dapur', 'admin_website'];

  const roles = await knex('roles').whereIn('name', roleNames);
  for (const r of roles) {
    await knex('role_permissions').where({ role_id: r.id }).del();
  }
  await knex('roles').whereIn('name', roleNames).del();

  const perms = await knex('permissions').whereIn('code', codes);
  for (const p of perms) {
    await knex('role_permissions').where({ permission_id: p.id }).del();
  }
  await knex('permissions').whereIn('code', codes).del();
};
