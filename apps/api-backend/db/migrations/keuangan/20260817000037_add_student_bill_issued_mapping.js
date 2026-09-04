/**
 * Migration: add_student_bill_issued_mapping
 * Modul Keuangan - Menambahkan aturan transaksi sistem untuk Penerbitan Tagihan Siswa (Piutang)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Ambil seluruh school_units yang sudah ada
  const units = await knex('transaction_account_mappings')
    .distinct('school_unit_id')
    .select('school_unit_id');

  const unitIds = units.length > 0 ? units.map(u => u.school_unit_id) : [1];

  for (const schoolUnitId of unitIds) {
    const existing = await knex('transaction_account_mappings')
      .where({
        school_unit_id: schoolUnitId,
        transaction_code: 'student_bill_issued'
      })
      .first();

    if (!existing) {
      // Cari akun Piutang Siswa
      let piutangAccount = await knex('chart_of_accounts')
        .where({ school_unit_id: schoolUnitId, account_group: 'piutang' })
        .first();

      if (!piutangAccount) {
        piutangAccount = await knex('chart_of_accounts')
          .where({ school_unit_id: schoolUnitId })
          .where('account_code', 'like', '1-1%')
          .first();
      }

      // Cari akun Pendapatan SPP / Pendidikan
      let pendapatanAccount = await knex('chart_of_accounts')
        .where({ school_unit_id: schoolUnitId, account_group: 'pendapatan' })
        .first();

      if (!pendapatanAccount) {
        pendapatanAccount = await knex('chart_of_accounts')
          .where({ school_unit_id: schoolUnitId })
          .where('account_code', 'like', '4-%')
          .first();
      }

      const debitId = piutangAccount ? piutangAccount.id : 1;
      const creditId = pendapatanAccount ? pendapatanAccount.id : 2;

      await knex('transaction_account_mappings').insert({
        school_unit_id: schoolUnitId,
        transaction_code: 'student_bill_issued',
        transaction_label: 'Penerbitan Tagihan Siswa (Piutang)',
        debit_account_id: debitId,
        credit_account_id: creditId,
        is_system: true,
        is_active: true
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex('transaction_account_mappings')
    .where({ transaction_code: 'student_bill_issued' })
    .delete();
};
