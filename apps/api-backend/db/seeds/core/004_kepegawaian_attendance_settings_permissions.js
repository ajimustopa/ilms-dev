/**
 * Database Seed: Kepegawaian Attendance Locations & Work Schedules Permissions (Core Service Database)
 * 
 * Menambahkan:
 * 1. Empat kode izin baru:
 *    - `kepegawaian.attendance_locations.manage`
 *    - `kepegawaian.attendance_locations.read`
 *    - `kepegawaian.work_schedules.manage`
 *    - `kepegawaian.work_schedules.read`
 * 2. Pemetaan izin ke role `hrd` dan `super_admin` / `admin_yayasan`
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  const permissionsData = [
    {
      module: 'kepegawaian.attendance',
      code: 'kepegawaian.attendance_locations.manage',
      description: 'Pengelolaan master lokasi absensi GPS (tambah, ubah, hapus titik koordinat & radius)'
    },
    {
      module: 'kepegawaian.attendance',
      code: 'kepegawaian.attendance_locations.read',
      description: 'Melihat daftar lokasi absensi GPS yang aktif'
    },
    {
      module: 'kepegawaian.attendance',
      code: 'kepegawaian.work_schedules.manage',
      description: 'Pengelolaan pengaturan jam kerja & toleransi keterlambatan shift'
    },
    {
      module: 'kepegawaian.attendance',
      code: 'kepegawaian.work_schedules.read',
      description: 'Melihat pengaturan jam kerja & shift aktif'
    }
  ];

  for (const p of permissionsData) {
    const existing = await knex('permissions').where({ code: p.code }).first();
    if (!existing) {
      await knex('permissions').insert(p);
    } else {
      await knex('permissions').where({ id: existing.id }).update({
        module: p.module,
        description: p.description
      });
    }
  }

  // Ambil roles target
  const targetRoles = await knex('roles').whereIn('name', ['hrd', 'super_admin', 'admin_yayasan']);
  
  for (const role of targetRoles) {
    for (const p of permissionsData) {
      const perm = await knex('permissions').where({ code: p.code }).first();
      if (perm) {
        const existingRp = await knex('role_permissions')
          .where({ role_id: role.id, permission_id: perm.id })
          .first();
        if (!existingRp) {
          await knex('role_permissions').insert({
            role_id: role.id,
            permission_id: perm.id
          });
        }
      }
    }
  }
};
