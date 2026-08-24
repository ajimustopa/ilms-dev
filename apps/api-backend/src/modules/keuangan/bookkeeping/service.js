/**
 * Bookkeeping (Pembukuan) Service for Keuangan Module
 * Covers Features #26, #27, #28, #29
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const { generateJournalNumber } = require('../common/journalService');
const crossModuleServices = require('../common/crossModuleServices');

class BookkeepingService {
  // ============================================================
  // 1. JURNAL UMUM & MANUAL (Fitur #26)
  // ============================================================

  async listJournalEntries(schoolUnitId, filters = {}) {
    let query = db('journal_entries').where('school_unit_id', schoolUnitId);

    if (filters.source_type) {
      query = query.where('source_type', filters.source_type);
    }
    if (filters.date_from) {
      query = query.where('journal_date', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('journal_date', '<=', filters.date_to);
    }

    const entries = await query.orderBy('journal_date', 'desc').orderBy('id', 'desc');

    // Ambil total debit/kredit per jurnal
    return Promise.all(entries.map(async e => {
      const lines = await db('journal_entry_lines')
        .where('journal_entry_id', e.id);
      const totalDebit = lines
        .filter(l => l.entry_side === 'debit')
        .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
      const totalCredit = lines
        .filter(l => l.entry_side === 'credit')
        .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);

      return {
        ...e,
        total_amount: totalDebit,
        is_balanced: Math.abs(totalDebit - totalCredit) < 0.01
      };
    }));
  }

  async getJournalEntryById(schoolUnitId, id) {
    const entry = await db('journal_entries')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!entry) return null;

    const lines = await db('journal_entry_lines')
      .join('chart_of_accounts', 'journal_entry_lines.chart_of_account_id', 'chart_of_accounts.id')
      .where('journal_entry_lines.journal_entry_id', id)
      .select(
        'journal_entry_lines.*',
        'chart_of_accounts.account_code',
        'chart_of_accounts.account_name',
        'chart_of_accounts.account_group'
      );

    const totalDebit = lines
      .filter(l => l.entry_side === 'debit')
      .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
    const totalCredit = lines
      .filter(l => l.entry_side === 'credit')
      .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);

    return {
      ...entry,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      lines
    };
  }

  async createManualJournalEntry(schoolUnitId, data, userId = null) {
    const { journal_date, description, lines = [] } = data;

    if (!lines || lines.length < 2) {
      return { error: 'VALIDATION', message: 'Jurnal manual minimal harus memiliki 2 baris (debit dan kredit)' };
    }

    let sumDebit = 0;
    let sumCredit = 0;

    for (const line of lines) {
      const amt = parseFloat(line.amount || 0);
      if (line.entry_side === 'debit') sumDebit += amt;
      else if (line.entry_side === 'credit') sumCredit += amt;
    }

    if (Math.abs(sumDebit - sumCredit) >= 0.01) {
      return {
        error: 'UNPROCESSABLE',
        message: `Jurnal tidak balance: Total Debit (Rp ${sumDebit.toLocaleString()}) != Total Kredit (Rp ${sumCredit.toLocaleString()})`
      };
    }

    return db.transaction(async (trx) => {
      const journalNumber = await generateJournalNumber(trx, schoolUnitId);
      const formattedDate = journal_date ? journal_date.slice(0, 10) : new Date().toISOString().slice(0, 10);

      const [journalId] = await trx('journal_entries').insert({
        school_unit_id: schoolUnitId,
        journal_number: journalNumber,
        journal_date: formattedDate,
        source_type: 'manual',
        description: description || 'Jurnal Penyesuaian Manual',
        is_manual_correction: true
      });

      const actualId = journalId || (await trx('journal_entries').where({ journal_number: journalNumber }).first()).id;

      const linesToInsert = lines.map(l => ({
        journal_entry_id: actualId,
        chart_of_account_id: l.chart_of_account_id,
        entry_side: l.entry_side,
        amount: parseFloat(l.amount)
      }));

      await trx('journal_entry_lines').insert(linesToInsert);

      const created = await this.getJournalEntryById(schoolUnitId, actualId);

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'CREATE_MANUAL_JOURNAL',
        entityType: 'journal_entry',
        entityId: actualId,
        dataAfter: created,
        trx
      });

      return { data: created };
    });
  }

  // ============================================================
  // 2. TABUNGAN SISWA & PEGAWAI (Fitur #27)
  // ============================================================

  async listSavingsAccounts(schoolUnitId, filters = {}) {
    let query = db('savings_accounts').where('school_unit_id', schoolUnitId);
    if (filters.owner_type) {
      query = query.where('owner_type', filters.owner_type);
    }
    if (filters.owner_id) {
      query = query.where('owner_id', filters.owner_id);
    }
    const accounts = await query;

    return Promise.all(accounts.map(async acc => {
      let ownerName = `ID ${acc.owner_id}`;
      if (acc.owner_type === 'student') {
        const s = await crossModuleServices.getStudent(acc.owner_id);
        if (s) ownerName = s.full_name;
      } else if (acc.owner_type === 'employee') {
        const e = await crossModuleServices.getEmployee(acc.owner_id);
        if (e) ownerName = e.full_name;
      }
      return {
        ...acc,
        owner_name: ownerName
      };
    }));
  }

  async getOrCreateSavingsAccount(schoolUnitId, ownerType, ownerId, userId = null) {
    let acc = await db('savings_accounts')
      .where({ school_unit_id: schoolUnitId, owner_type: ownerType, owner_id: ownerId })
      .first();

    if (!acc) {
      const [id] = await db('savings_accounts').insert({
        school_unit_id: schoolUnitId,
        owner_type: ownerType,
        owner_id: ownerId,
        balance: 0
      });
      acc = await db('savings_accounts').where({ id }).first();
    }
    return acc;
  }

  async depositSavings(schoolUnitId, accountId, amount, userId = null) {
    const depositAmount = parseFloat(amount);
    if (depositAmount <= 0) return { error: 'VALIDATION', message: 'Nominal setoran harus lebih besar dari 0' };

    return db.transaction(async (trx) => {
      const acc = await trx('savings_accounts')
        .where({ id: accountId, school_unit_id: schoolUnitId })
        .first();

      if (!acc) return { error: 'NOT_FOUND', message: 'Rekening tabungan tidak ditemukan' };

      const newBalance = parseFloat(acc.balance) + depositAmount;

      await trx('savings_transactions').insert({
        savings_account_id: accountId,
        transaction_type: 'deposit',
        amount: depositAmount
      });

      await trx('savings_accounts')
        .where({ id: accountId })
        .update({ balance: newBalance });

      const updated = await trx('savings_accounts').where({ id: accountId }).first();

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'DEPOSIT_SAVINGS',
        entityType: 'savings_account',
        entityId: accountId,
        dataAfter: { amount: depositAmount, new_balance: newBalance },
        trx
      });

      return { data: updated };
    });
  }

  async withdrawSavings(schoolUnitId, accountId, amount, userId = null) {
    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount <= 0) return { error: 'VALIDATION', message: 'Nominal penarikan harus lebih besar dari 0' };

    return db.transaction(async (trx) => {
      const acc = await trx('savings_accounts')
        .where({ id: accountId, school_unit_id: schoolUnitId })
        .first();

      if (!acc) return { error: 'NOT_FOUND', message: 'Rekening tabungan tidak ditemukan' };

      const currentBalance = parseFloat(acc.balance);
      if (withdrawAmount > currentBalance) {
        return {
          error: 'UNPROCESSABLE',
          message: `Saldo tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString()}, penarikan: Rp ${withdrawAmount.toLocaleString()}`
        };
      }

      const newBalance = currentBalance - withdrawAmount;

      await trx('savings_transactions').insert({
        savings_account_id: accountId,
        transaction_type: 'withdrawal',
        amount: withdrawAmount
      });

      await trx('savings_accounts')
        .where({ id: accountId })
        .update({ balance: newBalance });

      const updated = await trx('savings_accounts').where({ id: accountId }).first();

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'WITHDRAW_SAVINGS',
        entityType: 'savings_account',
        entityId: accountId,
        dataAfter: { amount: withdrawAmount, new_balance: newBalance },
        trx
      });

      return { data: updated };
    });
  }

  async listSavingsTransactions(schoolUnitId, accountId) {
    return db('savings_transactions')
      .join('savings_accounts', 'savings_transactions.savings_account_id', 'savings_accounts.id')
      .where({ 'savings_transactions.savings_account_id': accountId, 'savings_accounts.school_unit_id': schoolUnitId })
      .select('savings_transactions.*')
      .orderBy('savings_transactions.transacted_at', 'desc');
  }

  // ============================================================
  // 3. TUTUP BUKU TAHUNAN (Fitur #28)
  // ============================================================

  async listFiscalYearClosings(schoolUnitId, academicYearId = null) {
    let query = db('fiscal_year_closings').where('school_unit_id', schoolUnitId);
    if (academicYearId) query = query.where('academic_year_id', academicYearId);
    return query.orderBy('created_at', 'desc');
  }

  async closeFiscalYear(schoolUnitId, academicYearId, userId = null) {
    // Validasi: Cek apakah masih ada tagihan unpaid
    const unpaidBillsCount = await db('student_bills')
      .where({ school_unit_id: schoolUnitId, status: 'unpaid' })
      .count('id as count')
      .first();

    const unpaidCount = unpaidBillsCount?.count ? parseInt(unpaidBillsCount.count, 10) : 0;
    if (unpaidCount > 0) {
      return {
        error: 'UNPROCESSABLE',
        message: `Tutup buku tidak dapat diproses: Masih terdapat ${unpaidCount} tagihan berstatus belum lunas (unpaid)`
      };
    }

    const existing = await db('fiscal_year_closings')
      .where({ school_unit_id: schoolUnitId, academic_year_id: academicYearId })
      .first();

    if (existing && existing.status === 'closed') {
      return { error: 'CONFLICT', message: 'Tahun ajaran ini sudah ditutup bukunya' };
    }

    if (existing) {
      await db('fiscal_year_closings')
        .where({ id: existing.id })
        .update({
          status: 'closed',
          closed_at: db.fn.now(),
          closed_by: userId
        });
      const updated = await db('fiscal_year_closings').where({ id: existing.id }).first();
      return { data: updated };
    }

    const [id] = await db('fiscal_year_closings').insert({
      school_unit_id: schoolUnitId,
      academic_year_id: academicYearId,
      status: 'closed',
      closed_at: db.fn.now(),
      closed_by: userId
    });

    const created = await db('fiscal_year_closings').where({ id }).first();

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'CLOSE_FISCAL_YEAR',
      entityType: 'fiscal_year_closing',
      entityId: id,
      dataAfter: created
    });

    return { data: created };
  }

  async reopenFiscalYear(schoolUnitId, id, userId = null) {
    const closing = await db('fiscal_year_closings')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!closing) return { error: 'NOT_FOUND', message: 'Data tutup buku tidak ditemukan' };

    await db('fiscal_year_closings')
      .where({ id })
      .update({
        status: 'open',
        closed_at: null,
        closed_by: null
      });

    const updated = await db('fiscal_year_closings').where({ id }).first();

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'REOPEN_FISCAL_YEAR',
      entityType: 'fiscal_year_closing',
      entityId: id,
      dataBefore: closing,
      dataAfter: updated
    });

    return { data: updated };
  }

  // ============================================================
  // 4. AUDIT LOGS (Fitur #29)
  // ============================================================

  async listAuditLogs(schoolUnitId, filters = {}) {
    let query = db('finance_audit_logs');
    if (schoolUnitId) {
      query = query.where(builder => {
        builder.where('school_unit_id', schoolUnitId).orWhereNull('school_unit_id');
      });
    }
    if (filters.entity_type) query = query.where('entity_type', filters.entity_type);
    if (filters.user_id) query = query.where('user_id', filters.user_id);
    if (filters.date_from) query = query.where('occurred_at', '>=', filters.date_from);
    if (filters.date_to) query = query.where('occurred_at', '<=', filters.date_to);

    return query.orderBy('occurred_at', 'desc').limit(100);
  }
}

module.exports = new BookkeepingService();
