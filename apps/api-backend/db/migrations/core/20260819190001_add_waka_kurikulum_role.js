/**
 * Migration: add_waka_kurikulum_role
 * Menambahkan role waka_kurikulum dan memetakan permission terkait akademik, kurikulum, kesiswaan, cbt, dan al_quran
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Cek / Insert Role waka_kurikulum
  let role = await knex('roles').where({ name: 'waka_kurikulum' }).first();
  if (!role) {
    const [id] = await knex('roles').insert({
      name: 'waka_kurikulum',
      description: 'Wakil Kepala Sekolah Bidang Kurikulum & Akademik',
      is_system_role: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
    role = { id: id || (await knex('roles').where({ name: 'waka_kurikulum' }).first()).id };
  }

  // 2. Daftar permission yang relevan untuk waka_kurikulum
  const targetPermissions = [
    'akademik.view',
    'akademik.manage',
    'akademik.academic_years.manage',
    'akademik.class_groups.manage',
    'akademik.subjects.manage',
    'akademik.scores.manage',
    'akademik.attendance.manage',
    'akademik.reports.manage',
    'akademik.students.manage',
    'cbt.view',
    'cbt.manage',
    'kesiswaan.view',
    'al_quran.view',
    'kepegawaian.view',
    'perpustakaan.view',
    'core.view'
  ];

  // 3. Pastikan permissions ini ada di tabel permissions
  for (const code of targetPermissions) {
    const mod = code.split('.')[0];
    const exists = await knex('permissions').where({ code }).first();
    if (!exists) {
      await knex('permissions').insert({
        code,
        module: mod,
        description: `Izin Operasional ${code}`,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }

  // 4. Hubungkan role waka_kurikulum dengan permission-permission tersebut
  for (const code of targetPermissions) {
    const perm = await knex('permissions').where({ code }).first();
    if (perm && role.id) {
      const existsRel = await knex('role_permissions')
        .where({ role_id: role.id, permission_id: perm.id })
        .first();

      if (!existsRel) {
        await knex('role_permissions').insert({
          role_id: role.id,
          permission_id: perm.id,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });
      }
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const role = await knex('roles').where({ name: 'waka_kurikulum' }).first();
  if (role) {
    await knex('role_permissions').where({ role_id: role.id }).del();
    await knex('roles').where({ id: role.id }).del();
  }
};
