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
 * 
 * @param {Object} params
 * @param {number|string} params.schoolUnitId - ID Satuan Pendidikan aktif
 * @param {string} params.transactionCode - Kode transaksi pada transaction_account_mappings (misal: 'student_bill_payment', 'expense', 'other_income', 'payroll_disbursement')
 * @param {number|string} params.amount - Nominal transaksi
 * @param {string} params.sourceType - 'student_bill_payment' | 'other_income' | 'expense' | 'payroll_disbursement' | 'manual'
 * @param {number|string|null} [params.sourceId] - ID baris sumber transaksi (mis. bill_payments.id, expenses.id)
 * @param {string|null} [params.description] - Keterangan jurnal
 * @param {Date|string|null} [params.journalDate] - Tanggal jurnal (default: hari ini)
 * @param {Object|null} [params.trx] - Knex transaction instance yang sedang berjalan (opsional)
 * @returns {Promise<Object>} Data jurnal yang tersimpan
 */
async function recordJournal({
  schoolUnitId,
  transactionCode,
  amount,
  sourceType,
  sourceId = null,
  description = null,
  journalDate = new Date(),
  trx = null
}) {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error(`Nominal transaksi untuk jurnal harus lebih besar dari 0 (diterima: ${amount})`);
  }

  const executeInTransaction = async (activeTrx) => {
    // 1. Ambil pemetaan akun debit dan kredit dari transaction_account_mappings
    const mapping = await activeTrx('transaction_account_mappings')
      .where({
        school_unit_id: schoolUnitId,
        transaction_code: transactionCode
      })
      .first();

    if (!mapping) {
      throw new Error(
        `Pemetaan akun untuk kode transaksi '${transactionCode}' pada Satuan Pendidikan ID ${schoolUnitId} tidak ditemukan di transaction_account_mappings.`
      );
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
      is_manual_correction: false
    });

    const actualJournalId = journalId || (
      await activeTrx('journal_entries').where({ journal_number: journalNumber }).first()
    ).id;

    // 3. Buat 2 baris debit dan kredit (journal_entry_lines) dalam transaksi yang sama
    await activeTrx('journal_entry_lines').insert([
      {
        journal_entry_id: actualJournalId,
        chart_of_account_id: mapping.debit_account_id,
        entry_side: 'debit',
        amount: numericAmount
      },
      {
        journal_entry_id: actualJournalId,
        chart_of_account_id: mapping.credit_account_id,
        entry_side: 'credit',
        amount: numericAmount
      }
    ]);

    return {
      id: actualJournalId,
      journal_number: journalNumber,
      journal_date: formattedDate,
      source_type: sourceType,
      source_id: sourceId,
      description: journalDescription,
      debit_account_id: mapping.debit_account_id,
      credit_account_id: mapping.credit_account_id,
      amount: numericAmount
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
