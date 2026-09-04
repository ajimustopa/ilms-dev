/**
 * Database Seed: Kepegawaian Granular Payroll Permissions (Core Service Database)
 * 
 * Menambahkan:
 * 1. Role baru: `staff_payroll` (hanya kalkulasi & edit manual tanpa hak kunci/kirim)
 * 2. Tiga kode izin granular `kepegawaian.payroll.*` ke tabel `permissions`
 * 3. Pemetaan izin untuk role `hrd` (ketiganya) dan `staff_payroll` (calculate + edit_items)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // 1. Seed Role: staff_payroll
  let staffPayrollRole = await knex('roles').where({ name: 'staff_payroll' }).first();
  if (!staffPayrollRole) {
    const [insertedId] = await knex('roles').insert({
      name: 'staff_payroll',
      description: 'Staf pengelola data payroll / penggajian (kalkulasi & edit draft tanpa wewenang kunci/kirim)',
      is_system_role: false
    });
    staffPayrollRole = { id: insertedId || (await knex('roles').where({ name: 'staff_payroll' }).first()).id };
  }

  // Ambil role hrd jika ada
  const hrdRole = await knex('roles').where({ name: 'hrd' }).first();

  // 2. Daftar 3 Kode Izin Granular Payroll Kepegawaian
  const permissionsData = [
    {
      module: 'kepegawaian.payroll',
      code: 'kepegawaian.payroll.calculate',
      description: 'Membuat periode payroll dan menjalankan kalkulasi otomatis'
    },
    {
      module: 'kepegawaian.payroll',
      code: 'kepegawaian.payroll.edit_items',
      description: 'Mengedit manual rincian komponen gaji dan potongan per pegawai'
    },
    {
      module: 'kepegawaian.payroll',
      code: 'kepegawaian.payroll.lock_and_send',
      description: 'Memverifikasi final, mengunci periode payroll (lock), dan mengirim ke Keuangan'
    },
    // Tetap pertahankan legacy manage jika ada
    {
      module: 'kepegawaian.payroll',
      code: 'kepegawaian.payroll.manage',
      description: 'Pengelolaan penuh siklus payroll kepegawaian (legacy all-in-one)'
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

  // 3. Mapping ke Role HRD (diberi semua)
  if (hrdRole) {
    for (const p of permissionsData) {
      const perm = await knex('permissions').where({ code: p.code }).first();
      if (perm) {
        const existingRp = await knex('role_permissions')
          .where({ role_id: hrdRole.id, permission_id: perm.id })
          .first();
        if (!existingRp) {
          await knex('role_permissions').insert({
            role_id: hrdRole.id,
            permission_id: perm.id
          });
        }
      }
    }
  }

  // 4. Mapping ke Role staff_payroll (hanya calculate & edit_items)
  if (staffPayrollRole) {
    const staffCodes = ['kepegawaian.payroll.calculate', 'kepegawaian.payroll.edit_items'];
    for (const code of staffCodes) {
      const perm = await knex('permissions').where({ code }).first();
      if (perm) {
        const existingRp = await knex('role_permissions')
          .where({ role_id: staffPayrollRole.id, permission_id: perm.id })
          .first();
        if (!existingRp) {
          await knex('role_permissions').insert({
            role_id: staffPayrollRole.id,
            permission_id: perm.id
          });
        }
      }
    }
  }
};
