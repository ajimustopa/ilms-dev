/**
 * Journal Engine for Keuangan Module
 * apps/api-backend/src/modules/keuangan/bookkeeping/journalEngine.js
 * 
 * Mesin pencatat jurnal otomatis (double-entry bookkeeping) yang dipanggil
 * saat terjadi transaksi keuangan (bill payments, other incomes, expenses, payroll disbursements).
 * 
 * Menjamin integritas data: 1 baris journal_entries + 2 baris journal_entry_lines (debit & credit)
 * selalu dieksekusi dalam 1 database transaction (Knex transaction).
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');

/**
 * Generate nomor jurnal otomatis berformat:
 * JRN-{YYYYMMDD}-{urutan 5 digit per hari}
 * Contoh: JRN-20260817-00001
 * 
 * @param {Object} trx - Knex transaction instance
 * @param {Date|string|null} [journalDate] - Tanggal transaksi
 * @returns {Promise<string>}
 */
async function generateJournalNumber(trx, journalDate = null) {
  const dateObj = journalDate ? new Date(journalDate) : new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `JRN-${dateStr}-`;

  // Cari nomor jurnal terakhir pada tanggal yang sama
  const lastEntry = await trx('journal_entries')
    .where('journal_number', 'like', `${prefix}%`)
    .orderBy('id', 'desc')
    .first();

  let counter = 1;
  if (lastEntry && lastEntry.journal_number) {
    const parts = lastEntry.journal_number.split('-');
    const lastCounter = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastCounter)) {
      counter = lastCounter + 1;
    }
  }

  return `${prefix}${String(counter).padStart(5, '0')}`;
}

/**
 * Membuat jurnal otomatis berpasangan (debit & credit) berdasarkan transaction_code
 * dengan dukungan override manual akun/kas transaksi.
 * 
 * @param {Object} params
 * @param {number|string} params.schoolUnitId - ID Satuan Pendidikan aktif
 * @param {string} params.transactionCode - Kode transaksi pada transaction_account_mappings
 * @param {number|string} params.amount - Nominal transaksi
 * @param {string} params.sourceType - 'student_bill_payment' | 'other_income' | 'expense' | 'payroll_disbursement' | 'manual'
 * @param {number|string|null} [params.sourceId] - ID baris sumber transaksi
 * @param {string|null} [params.description] - Keterangan jurnal
 * @param {Date|string|null} [params.journalDate] - Tanggal jurnal (default: hari ini)
 * @param {number|string|null} [params.overrideDebitAccountId] - Override akun debit
 * @param {number|string|null} [params.overrideCreditAccountId] - Override akun kredit
 * @param {number|string|null} [params.overrideCashAccountId] - Override akun kas/bank
 * @param {string|null} [params.overrideReason] - Alasan override (Wajib jika salah satu override ada)
 * @param {number|string|null} [params.userId] - User yang melakukan transaksi
 * @param {Object|null} [params.trx] - Knex transaction instance yang sedang berjalan
 * @returns {Promise<Object>} Data jurnal yang tersimpan
 */
async function recordJournal({
  schoolUnitId,
  transactionCode,
  mappingId = null,
  amount,
  sourceType,
  sourceId = null,
  description = null,
  journalDate = new Date(),
  overrideDebitAccountId = null,
  overrideCreditAccountId = null,
  overrideCashAccountId = null,
  overrideReason = null,
  userId = null,
  trx = null
}) {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error(`Nominal transaksi untuk jurnal harus lebih besar dari 0 (diterima: ${amount})`);
  }

  // Validasi: Jika ada parameter override manual akun/kas, gunakan overrideReason atau description sebagai alasan audit
  let effectiveOverrideReason = overrideReason;
  if (!effectiveOverrideReason && description) {
    effectiveOverrideReason = description;
  }

  const isOverridden = Boolean(
    (overrideDebitAccountId && String(overrideDebitAccountId).trim() !== '') ||
    (overrideCreditAccountId && String(overrideCreditAccountId).trim() !== '') ||
    (overrideCashAccountId && String(overrideCashAccountId).trim() !== '')
  );

  if (isOverridden && (!effectiveOverrideReason || String(effectiveOverrideReason).trim() === '')) {
    effectiveOverrideReason = 'Penyesuaian akun/kas transaksi dinamis';
  }

  const executeInTransaction = async (activeTrx) => {
    // 1. Ambil pemetaan akun debit dan kredit dari transaction_account_mappings
    let mapping = null;
    if (mappingId) {
      mapping = await activeTrx('transaction_account_mappings').where({ id: mappingId }).first();
    }
    if (!mapping) {
      mapping = await activeTrx('transaction_account_mappings')
        .where({
          school_unit_id: schoolUnitId,
          transaction_code: transactionCode
        })
        .first();
    }
    if (!mapping) {
      mapping = await activeTrx('transaction_account_mappings')
        .where({ transaction_code: transactionCode })
        .first();
    }

    if (!mapping && !overrideDebitAccountId && !overrideCreditAccountId) {
      throw new Error(
        `Pemetaan akun untuk ${mappingId ? `ID Aturan ${mappingId}` : `kode transaksi '${transactionCode}'`} pada Satuan Pendidikan ID ${schoolUnitId} tidak ditemukan di transaction_account_mappings.`
      );
    }

    let appliedDebitAccountId = overrideDebitAccountId ? Number(overrideDebitAccountId) : (mapping ? mapping.debit_account_id : null);
    let appliedCreditAccountId = overrideCreditAccountId ? Number(overrideCreditAccountId) : (mapping ? mapping.credit_account_id : null);

    // Resolusi Dinamis jika akun Debit NULL
    if (!appliedDebitAccountId) {
      if (overrideCashAccountId || mapping?.default_cash_account_id) {
        const cashAccId = overrideCashAccountId || mapping?.default_cash_account_id;
        const cashAcc = await activeTrx('cash_accounts').where({ id: cashAccId }).first();
        if (cashAcc && cashAcc.account_id) {
          appliedDebitAccountId = Number(cashAcc.account_id);
        } else {
          // Ambil akun COA Kas/Bank default
          const cashCoa = await activeTrx('chart_of_accounts')
            .where({ account_group: 'harta', normal_balance: 'debit' })
            .orderBy('id', 'asc')
            .first();
          appliedDebitAccountId = cashCoa ? cashCoa.id : 1;
        }
      } else if (transactionCode === 'student_bill_issued') {
        const piutangCoa = await activeTrx('chart_of_accounts')
          .where({ account_group: 'piutang', normal_balance: 'debit' })
          .orderBy('id', 'asc')
          .first();
        appliedDebitAccountId = piutangCoa ? piutangCoa.id : 1;
      } else {
        const defaultDebit = await activeTrx('chart_of_accounts')
          .where({ normal_balance: 'debit' })
          .orderBy('id', 'asc')
          .first();
        appliedDebitAccountId = defaultDebit ? defaultDebit.id : 1;
      }
    }

    // Resolusi Dinamis jika akun Kredit NULL
    if (!appliedCreditAccountId) {
      if (overrideCashAccountId || mapping?.default_cash_account_id) {
        const cashAccId = overrideCashAccountId || mapping?.default_cash_account_id;
        const cashAcc = await activeTrx('cash_accounts').where({ id: cashAccId }).first();
        if (cashAcc && cashAcc.account_id) {
          appliedCreditAccountId = Number(cashAcc.account_id);
        } else {
          const cashCoa = await activeTrx('chart_of_accounts')
            .where({ account_group: 'harta' })
            .orderBy('id', 'asc')
            .first();
          appliedCreditAccountId = cashCoa ? cashCoa.id : 2;
        }
      } else if (transactionCode === 'student_bill_issued' || transactionCode === 'other_income_default') {
        const revCoa = await activeTrx('chart_of_accounts')
          .where({ account_group: 'pendapatan' })
          .orderBy('id', 'asc')
          .first();
        appliedCreditAccountId = revCoa ? revCoa.id : 2;
      } else {
        const defaultCredit = await activeTrx('chart_of_accounts')
          .where({ normal_balance: 'credit' })
          .orderBy('id', 'asc')
          .first();
        appliedCreditAccountId = defaultCredit ? defaultCredit.id : 2;
      }
    }

    const formattedDate = typeof journalDate === 'string'
      ? journalDate.slice(0, 10)
      : journalDate.toISOString().slice(0, 10);

    const journalNumber = await generateJournalNumber(activeTrx, formattedDate);
    const journalDescription = description || mapping.transaction_label;

    // 2. Buat header jurnal (journal_entries)
    const [journalId] = await activeTrx('journal_entries').insert({
      school_unit_id: schoolUnitId,
      journal_number: journalNumber,
      journal_date: formattedDate,
      source_type: sourceType,
      source_id: sourceId,
      description: journalDescription,
      is_manual_correction: isOverridden
    });

    const actualJournalId = journalId || (
      await activeTrx('journal_entries').where({ journal_number: journalNumber }).first()
    ).id;

    // 3. Buat 2 baris debit dan kredit (journal_entry_lines) dalam transaksi yang sama
    await activeTrx('journal_entry_lines').insert([
      {
        journal_entry_id: actualJournalId,
        chart_of_account_id: appliedDebitAccountId,
        entry_side: 'debit',
        amount: numericAmount
      },
      {
        journal_entry_id: actualJournalId,
        chart_of_account_id: appliedCreditAccountId,
        entry_side: 'credit',
        amount: numericAmount
      }
    ]);

    // 4. Jika ada override pemetaan akun/kas, catat ke finance_audit_logs
    if (isOverridden) {
      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'OVERRIDE_TRANSACTION_MAPPING',
        entityType: 'transaction_account_mapping',
        entityId: mapping.id,
        dataBefore: {
          transaction_code: transactionCode,
          default_debit_account_id: mapping.debit_account_id,
          default_credit_account_id: mapping.credit_account_id,
          default_cash_account_id: mapping.default_cash_account_id || null
        },
        dataAfter: {
          transaction_code: transactionCode,
          applied_debit_account_id: appliedDebitAccountId,
          applied_credit_account_id: appliedCreditAccountId,
          applied_cash_account_id: overrideCashAccountId ? Number(overrideCashAccountId) : null,
          journal_id: actualJournalId,
          journal_number: journalNumber,
          source_type: sourceType,
          source_id: sourceId,
          reason: overrideReason
        },
        trx: activeTrx
      });
    }

    return {
      id: actualJournalId,
      journal_number: journalNumber,
      journal_date: formattedDate,
      source_type: sourceType,
      source_id: sourceId,
      description: journalDescription,
      debit_account_id: appliedDebitAccountId,
      credit_account_id: appliedCreditAccountId,
      amount: numericAmount,
      is_overridden: isOverridden,
      override_reason: overrideReason
    };
  };

  // Jika caller sudah menyediakan transaksi Knex, gunakan itu
  if (trx) {
    return executeInTransaction(trx);
  }

  // Jika belum ada transaksi, buat transaksi database baru
  return db.transaction(async (newTrx) => {
    return executeInTransaction(newTrx);
  });
}

module.exports = {
  recordJournal,
  generateJournalNumber
};
