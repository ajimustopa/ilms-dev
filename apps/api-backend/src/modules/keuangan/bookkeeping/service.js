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
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;

    let query = db('journal_entries');
    if (targetUnit) {
      query = query.where('school_unit_id', targetUnit);
    }

    if (filters.academic_year_id && filters.academic_year_id !== 'all') {
      query = query.where('journal_entries.academic_year_id', Number(filters.academic_year_id));
    }

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

    const entryIds = entries.map(e => e.id);
    let allLines = [];
    if (entryIds.length > 0) {
      allLines = await db('journal_entry_lines')
        .join('chart_of_accounts', 'journal_entry_lines.chart_of_account_id', 'chart_of_accounts.id')
        .whereIn('journal_entry_lines.journal_entry_id', entryIds)
        .select(
          'journal_entry_lines.*',
          'chart_of_accounts.account_code',
          'chart_of_accounts.account_name',
          'chart_of_accounts.account_group'
        )
        .orderBy('journal_entry_lines.entry_side', 'desc')
        .orderBy('journal_entry_lines.id', 'asc');
    }
    const linesByJournalId = {};
    allLines.forEach(l => {
      if (!linesByJournalId[l.journal_entry_id]) linesByJournalId[l.journal_entry_id] = [];
      linesByJournalId[l.journal_entry_id].push(l);
    });

    return entries.map(e => {
      const lines = linesByJournalId[e.id] || [];
      const totalDebit = lines
        .filter(l => l.entry_side === 'debit')
        .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
      const totalCredit = lines
        .filter(l => l.entry_side === 'credit')
        .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);

      return {
        ...e,
        journal_date: e.journal_date ? (typeof e.journal_date === 'string' ? e.journal_date.slice(0, 10) : e.journal_date.toISOString().slice(0, 10)) : null,
        total_amount: totalDebit,
        is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
        lines
      };
    });
  }

  async getJournalEntryById(schoolUnitId, id) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    let query = db('journal_entries').where({ id });
    if (targetUnit) {
      query = query.where('school_unit_id', targetUnit);
    }
    const entry = await query.first();

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
      journal_date: entry.journal_date ? (typeof entry.journal_date === 'string' ? entry.journal_date.slice(0, 10) : entry.journal_date.toISOString().slice(0, 10)) : null,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      lines
    };
  }

  async createManualJournalEntry(schoolUnitId, data, userId = null) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : 1;
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
      const journalNumber = await generateJournalNumber(trx, targetUnit);
      const formattedDate = journal_date ? journal_date.slice(0, 10) : new Date().toISOString().slice(0, 10);

      const resolvedAcademicYearId = data.academic_year_id ? Number(data.academic_year_id) : 2;
      const [journalId] = await trx('journal_entries').insert({
        school_unit_id: targetUnit,
        academic_year_id: resolvedAcademicYearId,
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

      const created = await this.getJournalEntryById(targetUnit, actualId);

      await logFinanceAudit({
        schoolUnitId: targetUnit,
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
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;

    let query = db('savings_accounts');
    if (targetUnit) query = query.where('school_unit_id', targetUnit);

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
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : 1;

    let acc = await db('savings_accounts')
      .where({ school_unit_id: targetUnit, owner_type: ownerType, owner_id: ownerId })
      .first();

    if (!acc) {
      const [id] = await db('savings_accounts').insert({
        school_unit_id: targetUnit,
        owner_type: ownerType,
        owner_id: ownerId,
        balance: 0
      });
      acc = await db('savings_accounts').where({ id }).first();
    }
    return acc;
  }

  async depositSavings(schoolUnitId, accountId, amount, userId = null) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    const depositAmount = parseFloat(amount);
    if (depositAmount <= 0) return { error: 'VALIDATION', message: 'Nominal setoran harus lebih besar dari 0' };

    return db.transaction(async (trx) => {
      let q = trx('savings_accounts').where({ id: accountId });
      if (targetUnit) q = q.where('school_unit_id', targetUnit);
      const acc = await q.first();

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
        schoolUnitId: acc.school_unit_id,
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
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount <= 0) return { error: 'VALIDATION', message: 'Nominal penarikan harus lebih besar dari 0' };

    return db.transaction(async (trx) => {
      let q = trx('savings_accounts').where({ id: accountId });
      if (targetUnit) q = q.where('school_unit_id', targetUnit);
      const acc = await q.first();

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
        schoolUnitId: acc.school_unit_id,
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
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;

    let query = db('savings_transactions')
      .join('savings_accounts', 'savings_transactions.savings_account_id', 'savings_accounts.id')
      .where('savings_transactions.savings_account_id', accountId);

    if (targetUnit) {
      query = query.where('savings_accounts.school_unit_id', targetUnit);
    }

    return query
      .select('savings_transactions.*')
      .orderBy('savings_transactions.transacted_at', 'desc');
  }

  // ============================================================
  // 3. TUTUP BUKU TAHUNAN (Fitur #28)
  // ============================================================

  async listFiscalYearClosings(schoolUnitId, academicYearId = null) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;

    let query = db('fiscal_year_closings');
    if (targetUnit) query = query.where('school_unit_id', targetUnit);
    if (academicYearId) query = query.where('academic_year_id', academicYearId);
    return query.orderBy('created_at', 'desc');
  }

  async closeFiscalYear(schoolUnitId, academicYearId, userId = null) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : 1;

    // Validasi: Cek apakah masih ada tagihan unpaid
    let billsQ = db('student_bills')
      .where({ academic_year_id: academicYearId, status: 'unpaid' });
    if (targetUnit) billsQ = billsQ.where('school_unit_id', targetUnit);

    const unpaidBillsCount = await billsQ.count('id as count').first();
    const unpaidCount = unpaidBillsCount?.count ? parseInt(unpaidBillsCount.count, 10) : 0;
    if (unpaidCount > 0) {
      return {
        error: 'UNPROCESSABLE',
        message: `Tutup buku tidak dapat diproses: Masih terdapat ${unpaidCount} tagihan berstatus belum lunas (unpaid) pada tahun ajaran ini`
      };
    }

    const existing = await db('fiscal_year_closings')
      .where({ school_unit_id: targetUnit, academic_year_id: academicYearId })
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
      school_unit_id: targetUnit,
      academic_year_id: academicYearId,
      status: 'closed',
      closed_at: db.fn.now(),
      closed_by: userId
    });

    const created = await db('fiscal_year_closings').where({ id }).first();

    await logFinanceAudit({
      schoolUnitId: targetUnit,
      userId,
      action: 'CLOSE_FISCAL_YEAR',
      entityType: 'fiscal_year_closing',
      entityId: id,
      dataAfter: created
    });

    return { data: created };
  }

  async reopenFiscalYear(schoolUnitId, id, userId = null) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;

    let q = db('fiscal_year_closings').where({ id });
    if (targetUnit) q = q.where('school_unit_id', targetUnit);

    const closing = await q.first();
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
      schoolUnitId: closing.school_unit_id,
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
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    if (targetUnit) {
      query = query.where(builder => {
        builder.where('school_unit_id', targetUnit).orWhereNull('school_unit_id');
      });
    }
    if (filters.entity_type) query = query.where('entity_type', filters.entity_type);
    if (filters.entity_id) query = query.where('entity_id', filters.entity_id);
    if (filters.action) query = query.where('action', filters.action);
    if (filters.user_id) query = query.where('user_id', filters.user_id);
    if (filters.date_from) query = query.where('occurred_at', '>=', filters.date_from);
    if (filters.date_to) query = query.where('occurred_at', '<=', filters.date_to);

    return query.orderBy('occurred_at', 'desc').limit(200);
  }

  // ============================================================
  // 5. BUKU BESAR (General Ledger)
  // ============================================================

  async getGeneralLedger(schoolUnitId, filters = {}) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    let { account_id, account_code, period_from, period_to, academic_year_id } = filters;

    if (academic_year_id && !period_from && !period_to) {
      const ay = await crossModuleServices.getAcademicYear(academic_year_id);
      if (ay?.start_date && ay?.end_date) {
        period_from = ay.start_date.slice(0, 7) + '-01';
        period_to = ay.end_date;
      }
    }

    let accountQuery = db('chart_of_accounts');
    if (targetUnit) {
      accountQuery = accountQuery.where(b => {
        b.where('school_unit_id', targetUnit).orWhere('school_unit_id', 0).orWhereNull('school_unit_id');
      });
    }
    if (account_id) {
      accountQuery = accountQuery.where('id', account_id);
    } else if (account_code) {
      accountQuery = accountQuery.where('account_code', account_code);
    }
    const accounts = await accountQuery.orderBy('account_code', 'asc');

    const result = [];

    for (const acc of accounts) {
      let linesQuery = db('journal_entry_lines')
        .join('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
        .where('journal_entry_lines.chart_of_account_id', acc.id);

      if (targetUnit) {
        linesQuery = linesQuery.where('journal_entries.school_unit_id', targetUnit);
      }
      if (period_from) linesQuery = linesQuery.where('journal_entries.journal_date', '>=', period_from);
      if (period_to) linesQuery = linesQuery.where('journal_entries.journal_date', '<=', period_to);

      const lines = await linesQuery
        .select(
          'journal_entries.id as journal_id',
          'journal_entries.journal_number',
          'journal_entries.journal_date',
          'journal_entries.source_type',
          'journal_entries.description',
          'journal_entry_lines.entry_side',
          'journal_entry_lines.amount'
        )
        .orderBy('journal_entries.journal_date', 'asc')
        .orderBy('journal_entries.id', 'asc');

      let runningBalance = 0;
      let totalDebit = 0;
      let totalCredit = 0;

      const isDebitNormal = acc.normal_balance
        ? acc.normal_balance === 'debit'
        : ['harta', 'piutang', 'inventaris', 'biaya', 'asset', 'expense'].includes(acc.account_group?.toLowerCase());

      const mutations = lines.map(line => {
        const amt = parseFloat(line.amount || 0);

        if (line.entry_side === 'debit') {
          totalDebit += amt;
          if (isDebitNormal) {
            runningBalance += amt;
          } else {
            runningBalance -= amt;
          }
        } else {
          totalCredit += amt;
          if (isDebitNormal) {
            runningBalance -= amt;
          } else {
            runningBalance += amt;
          }
        }

        return {
          ...line,
          journal_date: line.journal_date ? (typeof line.journal_date === 'string' ? line.journal_date.slice(0, 10) : line.journal_date.toISOString().slice(0, 10)) : null,
          amount: amt,
          balance_after: runningBalance
        };
      });

      result.push({
        account_id: acc.id,
        account_code: acc.account_code,
        account_name: acc.account_name,
        account_group: acc.account_group,
        normal_balance: isDebitNormal ? 'debit' : 'credit',
        total_debit: totalDebit,
        total_credit: totalCredit,
        ending_balance: runningBalance,
        mutations
      });
    }

    return result;
  }

  // ============================================================
  // 6. LEMBAR KERJA (Worksheet / Neraca Lajur 10 Kolom)
  // ============================================================

  async getWorksheet(schoolUnitId, filters = {}) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    let { period_from, period_to, academic_year_id } = filters;

    // Filter peruntukan tahun ajaran langsung ke kolom academic_year_id
    if (academic_year_id && academic_year_id !== 'all') {
      // jika ada academic_year_id, gunakan langsung
    }

    let accountQuery = db('chart_of_accounts');
    if (targetUnit) {
      accountQuery = accountQuery.where(b => {
        b.where('school_unit_id', targetUnit).orWhere('school_unit_id', 0).orWhereNull('school_unit_id');
      });
    }
    const accounts = await accountQuery.orderBy('account_code', 'asc');

    let linesQuery = db('journal_entry_lines')
      .join('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id');

    if (targetUnit) {
      linesQuery = linesQuery.where('journal_entries.school_unit_id', targetUnit);
    }
    if (academic_year_id && academic_year_id !== 'all') {
      linesQuery = linesQuery.where('journal_entries.academic_year_id', Number(academic_year_id));
    }
    if (period_from) linesQuery = linesQuery.where('journal_entries.journal_date', '>=', period_from);
    if (period_to) linesQuery = linesQuery.where('journal_entries.journal_date', '<=', period_to);

    const lines = await linesQuery.select(
      'journal_entry_lines.*',
      'journal_entries.source_type',
      'journal_entries.is_manual_correction'
    );

    let totals = {
      unadjusted_debit: 0,
      unadjusted_credit: 0,
      adjustment_debit: 0,
      adjustment_credit: 0,
      adjusted_debit: 0,
      adjusted_credit: 0,
      activity_debit: 0,
      activity_credit: 0,
      balance_sheet_debit: 0,
      balance_sheet_credit: 0
    };

    const worksheet = accounts.map(acc => {
      const isDebitNormal = acc.normal_balance
        ? acc.normal_balance === 'debit'
        : ['harta', 'piutang', 'inventaris', 'biaya', 'asset', 'expense'].includes(acc.account_group?.toLowerCase());

      const isActivityAccount = ['biaya', 'pendapatan', 'expense', 'income', 'revenue'].includes(acc.account_group?.toLowerCase());

      const accLines = lines.filter(l => l.chart_of_account_id === acc.id);

      let unadjDeb = 0;
      let unadjCred = 0;
      let adjDeb = 0;
      let adjCred = 0;

      accLines.forEach(l => {
        const amt = parseFloat(l.amount || 0);
        const isAdj = l.is_manual_correction == 1 || l.source_type === 'adjustment' || l.source_type === 'correction';
        if (isAdj) {
          if (l.entry_side === 'debit') adjDeb += amt;
          else adjCred += amt;
        } else {
          if (l.entry_side === 'debit') unadjDeb += amt;
          else unadjCred += amt;
        }
      });

      // 1. Unadjusted
      let netUnadj = isDebitNormal ? (unadjDeb - unadjCred) : (unadjCred - unadjDeb);
      let unadjRowDeb = isDebitNormal ? Math.max(0, netUnadj) : (netUnadj < 0 ? Math.abs(netUnadj) : 0);
      let unadjRowCred = !isDebitNormal ? Math.max(0, netUnadj) : (netUnadj < 0 ? Math.abs(netUnadj) : 0);

      // 2. Adjustments
      let netAdj = isDebitNormal ? (unadjDeb + adjDeb - unadjCred - adjCred) : (unadjCred + adjCred - unadjDeb - adjDeb);

      // 3. Adjusted Balance
      let adjRowDeb = isDebitNormal ? Math.max(0, netAdj) : (netAdj < 0 ? Math.abs(netAdj) : 0);
      let adjRowCred = !isDebitNormal ? Math.max(0, netAdj) : (netAdj < 0 ? Math.abs(netAdj) : 0);

      // 4. Activity Statement (Laba Rugi) vs 5. Balance Sheet (Neraca)
      let actDeb = isActivityAccount ? adjRowDeb : 0;
      let actCred = isActivityAccount ? adjRowCred : 0;

      let bsDeb = !isActivityAccount ? adjRowDeb : 0;
      let bsCred = !isActivityAccount ? adjRowCred : 0;

      totals.unadjusted_debit += unadjRowDeb;
      totals.unadjusted_credit += unadjRowCred;
      totals.adjustment_debit += adjDeb;
      totals.adjustment_credit += adjCred;
      totals.adjusted_debit += adjRowDeb;
      totals.adjusted_credit += adjRowCred;
      totals.activity_debit += actDeb;
      totals.activity_credit += actCred;
      totals.balance_sheet_debit += bsDeb;
      totals.balance_sheet_credit += bsCred;

      return {
        account_id: acc.id,
        account_code: acc.account_code,
        account_name: acc.account_name,
        account_group: acc.account_group,
        normal_balance: isDebitNormal ? 'debit' : 'credit',
        unadjusted: { debit: unadjRowDeb, credit: unadjRowCred },
        adjustments: { debit: adjDeb, credit: adjCred },
        adjusted: { debit: adjRowDeb, credit: adjRowCred },
        activity_statement: { debit: actDeb, credit: actCred },
        balance_sheet: { debit: bsDeb, credit: bsCred }
      };
    });

    const netSurplusDeficit = totals.activity_credit - totals.activity_debit;

    return {
      worksheet,
      totals,
      surplus_deficit: {
        amount: Math.abs(netSurplusDeficit),
        status: netSurplusDeficit >= 0 ? 'surplus' : 'deficit'
      }
    };
  }
}

module.exports = new BookkeepingService();
