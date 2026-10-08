/**
 * Migration: seed_attendance_management_permissions
 * Mendaftarkan permissions manajemen presensi & absensi kepegawaian di Core DB
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const permissions = [
    { code: 'kepegawaian.attendances.manage', module: 'kepegawaian', description: 'Pengelolaan Presensi & Absensi Pegawai (Koreksi, Tutup Periode, Input Manual)' },
    { code: 'kepegawaian.attendances.read', module: 'kepegawaian', description: 'Melihat Data & Rekapitulasi Presensi Pegawai' },
    { code: 'kepegawaian.work_schedules.manage', module: 'kepegawaian', description: 'Pengelolaan Master Jadwal Kerja & Toleransi Shift' },
    { code: 'kepegawaian.work_schedules.read', module: 'kepegawaian', description: 'Melihat Daftar Jadwal Kerja Pegawai' },
    { code: 'kepegawaian.leave_requests.manage', module: 'kepegawaian', description: 'Persetujuan & Pengelolaan Permohonan Cuti/Izin' },
    { code: 'kepegawaian.overtimes.manage', module: 'kepegawaian', description: 'Persetujuan & Pengelolaan Pengajuan Lembur' }
  ];

  for (const p of permissions) {
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

  // Hubungkan permission ke role target: super_admin, admin_yayasan, admin_satuan_pendidikan, hrd
  const targetRoles = ['super_admin', 'admin_yayasan', 'admin_satuan_pendidikan', 'hrd'];
  for (const roleName of targetRoles) {
    const role = await knex('roles').where({ name: roleName }).first();
    if (role) {
      for (const p of permissions) {
        const perm = await knex('permissions').where({ code: p.code }).first();
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
  const codes = [
    'kepegawaian.attendances.manage',
    'kepegawaian.attendances.read',
    'kepegawaian.work_schedules.manage',
    'kepegawaian.work_schedules.read',
    'kepegawaian.leave_requests.manage',
    'kepegawaian.overtimes.manage'
  ];
  const perms = await knex('permissions').whereIn('code', codes);
  for (const p of perms) {
    await knex('role_permissions').where({ permission_id: p.id }).del();
  }
  await knex('permissions').whereIn('code', codes).del();
};
