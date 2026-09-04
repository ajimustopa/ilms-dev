/**
 * Database Seed: Keuangan Roles & Permissions (Core Service Database)
 * 
 * Rujukan: roles-keuangan.md (§2 & §4.2)
 * 
 * Menambahkan:
 * 1. Role baru: `admin_keuangan` ke tabel `roles` milik Core Service.
 * 2. Seluruh 25 kode izin `keuangan.*` ke tabel `permissions` milik Core Service.
 * 3. Pemetaan izin operasional untuk `admin_keuangan` ke tabel `role_permissions`.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // 1. Seed Role: admin_keuangan
  let adminKeuanganRole = await knex('roles').where({ name: 'admin_keuangan' }).first();
  if (!adminKeuanganRole) {
    const [insertedId] = await knex('roles').insert({
      name: 'admin_keuangan',
      description: 'Staf tata usaha keuangan / bendahara sekolah — operasional harian: tagihan, pembayaran, pengeluaran, pembukuan',
      is_system_role: false
    });
    adminKeuanganRole = { id: insertedId || (await knex('roles').where({ name: 'admin_keuangan' }).first()).id };
  } else {
    await knex('roles').where({ id: adminKeuanganRole.id }).update({
      description: 'Staf tata usaha keuangan / bendahara sekolah — operasional harian: tagihan, pembayaran, pengeluaran, pembukuan',
      is_system_role: false
    });
  }

  // 2. Daftar 25 Kode Izin Keuangan (roles-keuangan.md §4.2)
  const permissionsData = [
    // Modul: keuangan.master
    {
      module: 'keuangan.master',
      code: 'keuangan.master.cash_accounts.manage',
      description: 'Kelola jenis kas & saldo awal'
    },
    {
      module: 'keuangan.master',
      code: 'keuangan.master.coa.manage',
      description: 'Kelola Chart of Account & mapping akun'
    },
    {
      module: 'keuangan.master',
      code: 'keuangan.master.fees.manage',
      description: 'Kelola jenis biaya, kelompok biaya, nominal acuan'
    },
    {
      module: 'keuangan.master',
      code: 'keuangan.master.categories.manage',
      description: 'Kelola jenis pengeluaran/pemasukan khusus, program kegiatan, katalog item'
    },
    {
      module: 'keuangan.master',
      code: 'keuangan.master.fee_adjustments.submit',
      description: 'Mengajukan penetapan biaya individual/keringanan'
    },
    {
      module: 'keuangan.master',
      code: 'keuangan.master.fee_adjustments.approve',
      description: 'Menyetujui/menolak pengajuan keringanan biaya'
    },
    {
      module: 'keuangan.master',
      code: 'keuangan.transaction_rules.manage_system',
      description: 'Override struktural aturan transaksi sistem (Super Admin / Admin Yayasan)'
    },
    {
      module: 'keuangan.master',
      code: 'keuangan.cash_transfers.manage',
      description: 'Kelola transfer antar akun kas'
    },

    // Modul: keuangan.budget
    {
      module: 'keuangan.budget',
      code: 'keuangan.budget.view',
      description: 'Melihat RAPBS & realisasi'
    },
    {
      module: 'keuangan.budget',
      code: 'keuangan.budget.manage',
      description: 'Menyusun draft & revisi RAPBS'
    },
    {
      module: 'keuangan.budget',
      code: 'keuangan.budget.publish',
      description: 'Menerbitkan RAPBS'
    },

    // Modul: keuangan.bills
    {
      module: 'keuangan.bills',
      code: 'keuangan.bills.view',
      description: 'Melihat daftar & detail tagihan'
    },
    {
      module: 'keuangan.bills',
      code: 'keuangan.bills.generate',
      description: 'Generate tagihan massal'
    },
    {
      module: 'keuangan.bills',
      code: 'keuangan.bills.cancel',
      description: 'Membatalkan tagihan'
    },
    {
      module: 'keuangan.bills',
      code: 'keuangan.bills.write_off',
      description: 'Penghapusan piutang macet tagihan siswa (Write-off)'
    },

    // Modul: keuangan.payments
    {
      module: 'keuangan.payments',
      code: 'keuangan.payments.record',
      description: 'Mencatat pembayaran tagihan'
    },
    {
      module: 'keuangan.payments',
      code: 'keuangan.payments.correct',
      description: 'Mengoreksi pembayaran'
    },
    {
      module: 'keuangan.payments',
      code: 'keuangan.payments.refund',
      description: 'Pengembalian kelebihan bayar siswa (Refund)'
    },
    {
      module: 'keuangan.payments',
      code: 'keuangan.payments.reconcile',
      description: 'Melakukan rekonsiliasi PPDB/Kantin'
    },

    // Modul: keuangan.expenses
    {
      module: 'keuangan.expenses',
      code: 'keuangan.expenses.manage',
      description: 'Mencatat, mengedit, menghapus pengeluaran'
    },

    // Modul: keuangan.income
    {
      module: 'keuangan.income',
      code: 'keuangan.income.manage',
      description: 'Mencatat penerimaan non-SPP'
    },

    // Modul: keuangan.payroll
    {
      module: 'keuangan.payroll',
      code: 'keuangan.payroll.disburse',
      description: 'Mencairkan gaji pegawai'
    },

    // Modul: keuangan.bookkeeping
    {
      module: 'keuangan.bookkeeping',
      code: 'keuangan.bookkeeping.view',
      description: 'Melihat jurnal, buku besar, neraca saldo'
    },
    {
      module: 'keuangan.bookkeeping',
      code: 'keuangan.bookkeeping.manual_entry',
      description: 'Membuat jurnal koreksi manual'
    },
    {
      module: 'keuangan.bookkeeping',
      code: 'keuangan.bookkeeping.close_year',
      description: 'Mengajukan/melakukan tutup buku tahunan'
    },

    // Modul: keuangan.savings
    {
      module: 'keuangan.savings',
      code: 'keuangan.savings.manage',
      description: 'Kelola tabungan siswa/pegawai (setor/tarik)'
    },

    // Modul: keuangan.reports
    {
      module: 'keuangan.reports',
      code: 'keuangan.reports.view',
      description: 'Melihat & mengekspor seluruh laporan keuangan'
    },

    // Modul: keuangan.security
    {
      module: 'keuangan.security',
      code: 'keuangan.security.audit_logs.view',
      description: 'Melihat audit trail transaksi keuangan'
    },

    // Modul: keuangan.parent
    {
      module: 'keuangan.parent',
      code: 'keuangan.parent.self_service',
      description: 'Akses self-service orangtua/siswa (fitur #35)'
    }
  ];

  // Insert or update permission records
  const permissionIdMap = {};
  for (const perm of permissionsData) {
    const existing = await knex('permissions').where({ code: perm.code }).first();
    if (!existing) {
      const [newId] = await knex('permissions').insert({
        module: perm.module,
        code: perm.code,
        description: perm.description
      });
      permissionIdMap[perm.code] = newId || (await knex('permissions').where({ code: perm.code }).first()).id;
    } else {
      await knex('permissions').where({ id: existing.id }).update({
        module: perm.module,
        description: perm.description
      });
      permissionIdMap[perm.code] = existing.id;
    }
  }

  // 3. Izin Operasional untuk Role admin_keuangan (roles-keuangan.md §3)
  const adminKeuanganPermCodes = [
    'keuangan.master.cash_accounts.manage',
    'keuangan.master.coa.manage',
    'keuangan.master.fees.manage',
    'keuangan.master.categories.manage',
    'keuangan.master.fee_adjustments.submit',
    'keuangan.budget.view',
    'keuangan.budget.manage',
    'keuangan.bills.view',
    'keuangan.bills.generate',
    'keuangan.bills.cancel',
    'keuangan.payments.record',
    'keuangan.payments.correct',
    'keuangan.payments.reconcile',
    'keuangan.expenses.manage',
    'keuangan.income.manage',
    'keuangan.payroll.disburse',
    'keuangan.bookkeeping.view',
    'keuangan.bookkeeping.manual_entry',
    'keuangan.bookkeeping.close_year',
    'keuangan.savings.manage',
    'keuangan.reports.view',
    'keuangan.security.audit_logs.view'
  ];

  if (adminKeuanganRole && adminKeuanganRole.id) {
    for (const code of adminKeuanganPermCodes) {
      const permId = permissionIdMap[code];
      if (permId) {
        const existingRel = await knex('role_permissions')
          .where({ role_id: adminKeuanganRole.id, permission_id: permId })
          .first();
        if (!existingRel) {
          await knex('role_permissions').insert({
            role_id: adminKeuanganRole.id,
            permission_id: permId
          });
        }
      }
    }
  }
};
