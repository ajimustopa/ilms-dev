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

    // Batch enrich student bill payment details
    const billPaymentIds = entries
      .filter(e => (e.source_type === 'student_bill_payment' || e.source_type === 'student_bill_issued' || e.source_type === 'student_bill_discount') && e.source_id)
      .map(e => e.source_id);

    let bpMap = {};
    let studentMap = {};
    let ayMap = {};

    if (billPaymentIds.length > 0) {
      try {
        const bpList = await db('bill_payments as bp')
          .join('student_bills as sb', 'bp.student_bill_id', 'sb.id')
          .join('fee_types as ft', 'sb.fee_type_id', 'ft.id')
          .whereIn('bp.id', billPaymentIds)
          .select(
            'bp.id as bp_id',
            'bp.receipt_number',
            'sb.student_id',
            'sb.period_month',
            'sb.period_year',
            'sb.academic_year_id as bill_ay_id',
            'ft.name as fee_name'
          );

        bpList.forEach(bp => {
          bpMap[bp.bp_id] = bp;
        });

        const studentIds = [...new Set(bpList.map(b => b.student_id).filter(Boolean))];
        if (studentIds.length > 0) {
          const students = await crossModuleServices.getStudentsByIds(studentIds);
          (students || []).forEach(s => {
            studentMap[s.id] = s;
          });
        }

        const allAys = await crossModuleServices.listAcademicYears();
        (allAys || []).forEach(ay => {
          ayMap[ay.id] = ay.name;
        });
      } catch (err) {
        console.warn('[listJournalEntries] Error loading student bill payment details:', err.message);
      }
    }

    const MONTH_NAMES = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return entries.map(e => {
      const lines = linesByJournalId[e.id] || [];
      const totalDebit = lines
        .filter(l => l.entry_side === 'debit')
        .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
      const totalCredit = lines
        .filter(l => l.entry_side === 'credit')
        .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);

      let richDescription = e.description;
      if (e.source_id && bpMap[e.source_id]) {
        const bp = bpMap[e.source_id];
        const st = studentMap[bp.student_id];
        const studentNis = st?.nis || st?.student_no || '';
        const studentName = st?.full_name || 'Santri/Siswa';
        const monthLabel = bp.period_month ? `Bulan ${MONTH_NAMES[bp.period_month - 1]} ${bp.period_year || ''}`.trim() : '';
        const feeTitle = monthLabel ? `${bp.fee_name} ${monthLabel}` : bp.fee_name;
        const ayName = ayMap[bp.bill_ay_id] || (e.academic_year_id ? ayMap[e.academic_year_id] : '');
        const ayLabel = ayName ? ` (TA ${ayName})` : '';
        const receiptStr = bp.receipt_number ? ` [${bp.receipt_number}]` : '';

        richDescription = studentNis
          ? `[${studentNis}] ${studentName} | ${feeTitle}${ayLabel}${receiptStr}`
          : `${studentName} | ${feeTitle}${ayLabel}${receiptStr}`;
      }

      return {
        ...e,
        description: richDescription,
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

    let richDescription = entry.description;
    if (entry.source_id) {
      try {
        const bp = await db('bill_payments as bp')
          .join('student_bills as sb', 'bp.student_bill_id', 'sb.id')
          .join('fee_types as ft', 'sb.fee_type_id', 'ft.id')
          .where('bp.id', entry.source_id)
          .select(
            'bp.id as bp_id',
            'bp.receipt_number',
            'sb.student_id',
            'sb.period_month',
            'sb.period_year',
            'sb.academic_year_id as bill_ay_id',
            'ft.name as fee_name'
          )
          .first();

        if (bp) {
          const st = await crossModuleServices.getStudent(bp.student_id);
          const studentNis = st?.nis || st?.student_no || '';
          const studentName = st?.full_name || 'Santri/Siswa';
          const MONTH_NAMES = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];
          const monthLabel = bp.period_month ? `Bulan ${MONTH_NAMES[bp.period_month - 1]} ${bp.period_year || ''}`.trim() : '';
          const feeTitle = monthLabel ? `${bp.fee_name} ${monthLabel}` : bp.fee_name;
          let ayName = '';
          if (bp.bill_ay_id || entry.academic_year_id) {
            const ayObj = await crossModuleServices.getAcademicYear(bp.bill_ay_id || entry.academic_year_id);
            ayName = ayObj?.name || '';
          }
          const ayLabel = ayName ? ` (TA ${ayName})` : '';
          const receiptStr = bp.receipt_number ? ` [${bp.receipt_number}]` : '';

          richDescription = studentNis
            ? `[${studentNis}] ${studentName} | ${feeTitle}${ayLabel}${receiptStr}`
            : `${studentName} | ${feeTitle}${ayLabel}${receiptStr}`;
        }
      } catch (err) {
        console.warn('[getJournalEntryById] Error enriching student payment detail:', err.message);
      }
    }

    return {
      ...entry,
      description: richDescription,
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

  // ============================================================
  // BUKU KAS TERPADU / KAS HARIAN (Slim & Dense Cash Ledger)
  // ============================================================
  async getCashLedger(schoolUnitId, filters = {}) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;

    const {
      academic_year_id,
      cash_account_id,
      date_from,
      date_to,
      search
    } = filters;

    let selectedAy = null;
    if (academic_year_id && academic_year_id !== 'all') {
      try {
        selectedAy = await crossModuleServices.getAcademicYear(academic_year_id);
      } catch (e) {
        console.warn('[getCashLedger] Could not load academic year info:', e.message);
      }
    }

    const MONTH_NAMES = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const formatDateStr = (d) => {
      if (!d) return '';
      if (typeof d === 'string') return d.slice(0, 10);
      return d.toISOString().slice(0, 10);
    };

    const formatDmy = (isoStr) => {
      if (!isoStr) return '';
      const parts = isoStr.slice(0, 10).split('-');
      if (parts.length !== 3) return isoStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const getMonthYearLabel = (isoStr) => {
      if (!isoStr) return '';
      const parts = isoStr.slice(0, 10).split('-');
      if (parts.length < 2) return '';
      const monthIdx = parseInt(parts[1], 10) - 1;
      return `${(MONTH_NAMES[monthIdx] || '').toUpperCase()} ${parts[0]}`;
    };

    const cleanFundSourceName = (name) => {
      if (!name) return '';
      const raw = String(name)
        .replace(/\s*[:\-]\s*(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)[^,]*/gi, '')
        .replace(/\s*\((Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)[^)]*\)/gi, '')
        .trim();

      const rawLower = raw.toLowerCase();
      if (
        rawLower.includes('kas penampung') ||
        rawLower.includes('opening pool') ||
        rawLower.includes('saldo awal kas') ||
        rawLower.includes('saldo sebelumnya') ||
        rawLower === 'opening_pool'
      ) {
        return 'Saldo Awal Kas (Opening Pool)';
      }
      return raw;
    };

    const getDayMonthYearLabel = (isoStr) => {
      if (!isoStr) return '';
      const parts = isoStr.slice(0, 10).split('-');
      if (parts.length < 3) return '';
      const monthIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${MONTH_NAMES[monthIdx] || ''} ${parts[0]}`;
    };

    const formatCashLabel = (accName, accKind, bankName, accNumber) => {
      const cleanBank = (bankName || '').trim();
      const cleanNumber = (accNumber || '').trim();
      const cleanName = (accName || '').trim();

      // Extract short bank acronym if available, e.g. "BNI" from "Bank Nasional Indonesia (BNI)"
      let shortBank = cleanBank;
      const parenMatch = cleanBank.match(/\(([^)]+)\)/);
      if (parenMatch && parenMatch[1]) {
        shortBank = parenMatch[1].trim();
      } else if (/^Bank\s+/i.test(cleanBank)) {
        shortBank = cleanBank.replace(/^Bank\s+/i, '').trim();
      }

      // Format: "BNI - 1559456108 (Tahun Berjalan)"
      if (shortBank && cleanNumber && cleanName) {
        const nameWithoutNum = cleanName.replace(/\s*\((BSI|BNI|BCA|BRI|Mandiri)?\s*\d+\)/gi, '').trim();
        return `${shortBank} - ${cleanNumber} (${nameWithoutNum || cleanName})`;
      }
      if (shortBank && cleanNumber) {
        return `${shortBank} - ${cleanNumber}`;
      }
      if (shortBank && cleanName && shortBank.toLowerCase() !== cleanName.toLowerCase()) {
        return `${shortBank} (${cleanName})`;
      }
      if (cleanNumber && cleanName) {
        return `${cleanName} - ${cleanNumber}`;
      }
      return cleanName || shortBank || 'Kas Tunai';
    };

    const getBadgeInfo = (accName, accKind, bankName, accNumber) => {
      const name = (accName || '').toLowerCase();
      const bName = (bankName || '').toLowerCase();
      const kind = (accKind || '').toLowerCase();
      const formattedLabel = formatCashLabel(accName, accKind, bankName, accNumber);

      if (name.includes('tahun berjalan')) {
        return {
          code: 'tahun_berjalan',
          bg_class: 'bg-purple-50 text-purple-800 border-purple-300',
          label: formattedLabel
        };
      }
      if (name.includes('bsi penerimaan') || name.includes('5114411440') || (name.includes('penerimaan') && name.includes('bsi'))) {
        return {
          code: 'bsi_penerimaan',
          bg_class: 'bg-teal-50 text-teal-800 border-teal-300',
          label: formattedLabel
        };
      }
      if (name.includes('bsi operasional') || (name.includes('operasional') && name.includes('bsi'))) {
        return {
          code: 'bsi_operasional',
          bg_class: 'bg-indigo-50 text-indigo-800 border-indigo-300',
          label: formattedLabel
        };
      }
      if (name.includes('ppdb')) {
        return {
          code: 'ppdb',
          bg_class: 'bg-amber-50 text-amber-900 border-amber-300',
          label: formattedLabel
        };
      }
      if (name.includes('kantin')) {
        return {
          code: 'kantin',
          bg_class: 'bg-lime-50 text-lime-800 border-lime-300',
          label: formattedLabel
        };
      }
      if (name.includes('sport center') || name.includes('sport')) {
        return {
          code: 'sport_center',
          bg_class: 'bg-cyan-50 text-cyan-800 border-cyan-300',
          label: formattedLabel
        };
      }
      if (name.includes('kurban')) {
        return {
          code: 'kurban',
          bg_class: 'bg-orange-50 text-orange-800 border-orange-300',
          label: formattedLabel
        };
      }
      if (name.includes('tabungan thr') || name.includes('thr')) {
        return {
          code: 'thr',
          bg_class: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300',
          label: formattedLabel
        };
      }
      if (kind === 'cash' || name.includes('tunai') || name.includes('kas kecil') || name.includes('petty')) {
        return {
          code: 'tunai',
          bg_class: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          label: formattedLabel
        };
      }
      if (name.includes('operasional')) {
        return {
          code: 'operasional',
          bg_class: 'bg-blue-50 text-blue-800 border-blue-300',
          label: formattedLabel
        };
      }
      if (name.includes('bsi') || bName.includes('bsi') || bName.includes('syariah indonesia')) {
        return {
          code: 'bsi',
          bg_class: 'bg-teal-50 text-teal-800 border-teal-300',
          label: formattedLabel
        };
      }
      if (name.includes('bni') || bName.includes('bni') || bName.includes('negara indonesia')) {
        return {
          code: 'bni',
          bg_class: 'bg-amber-50 text-amber-900 border-amber-300',
          label: formattedLabel
        };
      }
      if (name.includes('bca') || bName.includes('bca') || bName.includes('central asia')) {
        return {
          code: 'bca',
          bg_class: 'bg-blue-50 text-blue-800 border-blue-300',
          label: formattedLabel
        };
      }
      if (name.includes('mandiri') || bName.includes('mandiri')) {
        return {
          code: 'mandiri',
          bg_class: 'bg-sky-50 text-sky-800 border-sky-300',
          label: formattedLabel
        };
      }
      if (name.includes('bri') || bName.includes('bri')) {
        return {
          code: 'bri',
          bg_class: 'bg-cyan-50 text-cyan-800 border-cyan-300',
          label: formattedLabel
        };
      }
      return {
        code: 'bank',
        bg_class: 'bg-slate-100 text-slate-800 border-slate-300',
        label: formattedLabel
      };
    };

    const rows = [];

    // 1. BILL PAYMENTS (Penerimaan Tagihan Siswa / SPP / dll)
    try {
      let bpQuery = db('bill_payments as bp')
        .join('student_bills as sb', 'bp.student_bill_id', 'sb.id')
        .join('fee_types as ft', 'sb.fee_type_id', 'ft.id')
        .leftJoin('cash_accounts as ca', 'bp.cash_account_id', 'ca.id');

      if (targetUnit) {
        bpQuery = bpQuery.where(function() {
          this.where('sb.school_unit_id', targetUnit)
              .orWhere('sb.school_unit_id', 0)
              .orWhereNull('sb.school_unit_id');
        });
      }
      if (cash_account_id && cash_account_id !== 'all') bpQuery = bpQuery.where('bp.cash_account_id', Number(cash_account_id));
      if (academic_year_id && academic_year_id !== 'all') bpQuery = bpQuery.where('sb.academic_year_id', Number(academic_year_id));
      if (date_from) bpQuery = bpQuery.where('bp.paid_at', '>=', date_from);
      if (date_to) bpQuery = bpQuery.where('bp.paid_at', '<=', `${date_to} 23:59:59`);

      const bpList = await bpQuery.select(
        'bp.id as bp_id',
        'bp.paid_at',
        'bp.amount',
        'bp.payment_method',
        'bp.receipt_number',
        'bp.notes as bp_notes',
        'bp.is_legacy',
        'bp.historical_cash_note',
        'sb.student_id',
        'sb.period_month',
        'sb.period_year',
        'sb.academic_year_id as bill_ay_id',
        'ft.name as fee_type_name',
        'ca.id as cash_account_id',
        'ca.name as cash_account_name',
        'ca.account_kind as cash_account_kind',
        'ca.bank_name as cash_bank_name',
        'ca.bank_account_number as cash_account_number'
      );

      // Batch load student info
      const studentIds = [...new Set(bpList.map(b => b.student_id).filter(Boolean))];
      let studentMap = {};
      if (studentIds.length > 0) {
        try {
          const students = await crossModuleServices.getStudentsByIds(studentIds);
          (students || []).forEach(s => {
            studentMap[s.id] = s;
          });
        } catch (e) {
          console.warn('[getCashLedger] Could not load student data in batch:', e.message);
        }
      }

      bpList.forEach(bp => {
        const dateStr = formatDateStr(bp.paid_at);
        const st = studentMap[bp.student_id];
        const studentNis = st?.nis || st?.student_no || '';
        const studentName = st?.full_name || 'Santri/Siswa';
        const billMonth = bp.period_month ? MONTH_NAMES[bp.period_month - 1] : '';
        const desc = studentNis
          ? `[${studentNis}] ${studentName} | ${billMonth ? `SPP : ${billMonth}` : bp.fee_type_name}`
          : `${studentName} | ${billMonth ? `SPP : ${billMonth}` : bp.fee_type_name}`;

        const isLegacyPayment = Boolean(
          bp.is_legacy === 1 || 
          bp.is_legacy === true || 
          bp.payment_method === 'historical' || 
          bp.payment_method === 'historical_cash' || 
          (!bp.cash_account_id && bp.historical_cash_note)
        );

        let cashLabel = '';
        let cashBadgeClass = '';
        if (isLegacyPayment) {
          cashLabel = bp.historical_cash_note || 'Pencatatan Riwayat Saja (Non-Kas)';
          cashBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
        } else {
          const badge = getBadgeInfo(bp.cash_account_name, bp.cash_account_kind, bp.cash_bank_name, bp.cash_account_number);
          cashLabel = badge.label;
          cashBadgeClass = badge.bg_class;
        }

        const amt = parseFloat(bp.amount || 0);

        rows.push({
          id: `bp-${bp.bp_id}`,
          raw_date: dateStr,
          transaction_date: formatDmy(dateStr),
          month_year_label: getMonthYearLabel(dateStr),
          day_month_year_label: getDayMonthYearLabel(dateStr),
          category_label: isLegacyPayment ? 'Riwayat Pembayaran (Non-Kas)' : 'Penerimaan Tagihan',
          category_code: isLegacyPayment ? 'history_non_cash' : 'income_bill',
          description: desc,
          income_amount: amt,
          expense_amount: 0,
          transfer_amount: amt,
          cash_account_id: bp.cash_account_id,
          cash_label: cashLabel,
          cash_badge_class: cashBadgeClass,
          bank_reference: bp.receipt_number || '-',
          budget_pos_name: `[Pemasukan] ${bp.fee_type_name}`,
          fund_source_name: cleanFundSourceName(bp.fee_type_name || 'SPP'),
          source_type: 'bill_payment',
          affects_cash: !isLegacyPayment,
          is_historical: isLegacyPayment,
          row_highlight: isLegacyPayment ? 'slate' : 'cyan'
        });
      });
    } catch (err) {
      console.warn('[getCashLedger] Error loading bill payments:', err.message);
    }

    // 2. OTHER INCOMES (Pemasukan Lain-Lain: BOS, Subsidi, Infaq, dll)
    try {
      let oiQuery = db('other_incomes as oi')
        .leftJoin('budget_plan_income_items as bpii', 'oi.budget_plan_income_item_id', 'bpii.id')
        .leftJoin('cash_accounts as ca', 'oi.cash_account_id', 'ca.id')
        .leftJoin('bank_statements as bs', 'oi.bank_statement_id', 'bs.id');

      if (targetUnit) {
        oiQuery = oiQuery.where(function() {
          this.where('oi.school_unit_id', targetUnit)
              .orWhere('oi.school_unit_id', 0)
              .orWhereNull('oi.school_unit_id');
        });
      }
      if (cash_account_id && cash_account_id !== 'all') oiQuery = oiQuery.where('oi.cash_account_id', Number(cash_account_id));
      if (academic_year_id && academic_year_id !== 'all') oiQuery = oiQuery.where('oi.academic_year_id', Number(academic_year_id));
      if (date_from) oiQuery = oiQuery.where('oi.received_at', '>=', date_from);
      if (date_to) oiQuery = oiQuery.where('oi.received_at', '<=', `${date_to} 23:59:59`);

      const oiList = await oiQuery.select(
        'oi.id as oi_id',
        'oi.received_at',
        'oi.payer_name',
        'oi.source_category',
        'oi.notes',
        'oi.amount',
        'oi.receipt_number',
        'bpii.name as budget_item_name',
        'ca.id as cash_account_id',
        'ca.name as cash_account_name',
        'ca.account_kind as cash_account_kind',
        'ca.bank_name as cash_bank_name',
        'ca.bank_account_number as cash_account_number',
        'bs.journal_number as bank_statement_ref'
      );

      oiList.forEach(oi => {
        const dateStr = formatDateStr(oi.received_at);
        const nameTitle = oi.notes ? oi.notes : (oi.payer_name ? `${oi.source_category || 'Pemasukan'} : ${oi.payer_name}` : (oi.budget_item_name || oi.source_category || 'Pemasukan Lain'));
        const desc = oi.notes && oi.payer_name ? `${nameTitle} (${oi.payer_name})` : nameTitle;
        const badge = getBadgeInfo(oi.cash_account_name, oi.cash_account_kind, oi.cash_bank_name, oi.cash_account_number);
        const amt = parseFloat(oi.amount || 0);

        rows.push({
          id: `oi-${oi.oi_id}`,
          raw_date: dateStr,
          transaction_date: formatDmy(dateStr),
          month_year_label: getMonthYearLabel(dateStr),
          day_month_year_label: getDayMonthYearLabel(dateStr),
          category_label: 'Pemasukan Lain',
          category_code: 'income_other',
          description: desc,
          income_amount: amt,
          expense_amount: 0,
          transfer_amount: amt,
          cash_account_id: oi.cash_account_id,
          cash_label: badge.label,
          cash_badge_class: badge.bg_class,
          bank_reference: oi.bank_statement_ref || oi.receipt_number || '-',
          budget_pos_name: oi.budget_item_name ? `[Pemasukan] ${oi.budget_item_name}` : `[Pemasukan] ${oi.notes || oi.source_category || 'Penerimaan'}`,
          fund_source_name: cleanFundSourceName(oi.budget_item_name || oi.notes || oi.source_category || 'Pemasukan Lainnya'),
          source_type: 'other_income',
          row_highlight: 'none'
        });
      });
    } catch (err) {
      console.warn('[getCashLedger] Error loading other incomes:', err.message);
    }

    // 3. EXPENSES (Pengeluaran RAPBS & Beban Operasional)
    try {
      let expQuery = db('expenses as exp')
        .leftJoin('budget_plan_expense_items as bpei', 'exp.budget_plan_expense_item_id', 'bpei.id')
        .leftJoin('cash_accounts as ca', 'exp.cash_account_id', 'ca.id')
        .leftJoin('bank_statements as bs', 'exp.bank_statement_id', 'bs.id')
        .leftJoin('fee_types as ft', function() {
          this.on('exp.fund_source_ref_id', '=', 'ft.id').andOn('exp.fund_source_type', '=', db.raw("'fee_type'"));
        })
        .leftJoin('transaction_categories as tc', function() {
          this.on('exp.fund_source_ref_id', '=', 'tc.id').andOn('exp.fund_source_type', '=', db.raw("'transaction_category'"));
        })
        .leftJoin('budget_plan_income_items as bpii', function() {
          this.on('exp.fund_source_ref_id', '=', 'bpii.id').andOn('exp.fund_source_type', '=', db.raw("'budget_income_item'"));
        })
        .whereNull('exp.deleted_at');

      if (targetUnit) {
        expQuery = expQuery.where(function() {
          this.where('exp.school_unit_id', targetUnit)
              .orWhere('exp.school_unit_id', 0)
              .orWhereNull('exp.school_unit_id');
        });
      }
      if (cash_account_id && cash_account_id !== 'all') expQuery = expQuery.where('exp.cash_account_id', Number(cash_account_id));
      if (academic_year_id && academic_year_id !== 'all') expQuery = expQuery.where('exp.academic_year_id', Number(academic_year_id));
      if (date_from) expQuery = expQuery.where('exp.expense_date', '>=', date_from);
      if (date_to) expQuery = expQuery.where('exp.expense_date', '<=', date_to);

      const expList = await expQuery.select(
        'exp.id as exp_id',
        'exp.expense_date',
        'exp.item_name',
        'exp.notes',
        'exp.total_amount',
        'exp.proof_number',
        'exp.fund_source_type',
        'exp.fund_sources',
        'bpei.name as budget_item_name',
        'ca.id as cash_account_id',
        'ca.name as cash_account_name',
        'ca.account_kind as cash_account_kind',
        'ca.bank_name as cash_bank_name',
        'ca.bank_account_number as cash_account_number',
        'bs.journal_number as bank_statement_ref',
        'ft.name as fund_fee_name',
        'tc.name as fund_cat_name',
        'bpii.name as fund_bpii_name'
      );

      expList.forEach(exp => {
        const dateStr = formatDateStr(exp.expense_date);
        let desc = exp.item_name;
        if (exp.notes && !desc.includes(exp.notes)) {
          desc = `${desc} | ${exp.notes}`;
        }

        let fundName = 'Saldo Awal Kas (Opening Pool)';
        if (exp.fund_sources) {
          try {
            const parsedSources = typeof exp.fund_sources === 'string' ? JSON.parse(exp.fund_sources) : exp.fund_sources;
            if (Array.isArray(parsedSources) && parsedSources.length > 0) {
              fundName = parsedSources.map(s => cleanFundSourceName(s.name || s.fund_name)).filter(Boolean).join(', ') || fundName;
            }
          } catch (e) {
            // fallback
          }
        }
        if (fundName === 'Saldo Awal Kas (Opening Pool)') {
          if (exp.fund_fee_name) fundName = exp.fund_fee_name;
          else if (exp.fund_cat_name) fundName = exp.fund_cat_name;
          else if (exp.fund_bpii_name) fundName = exp.fund_bpii_name;
          else if (exp.fund_source_type === 'opening_pool') fundName = 'Saldo Awal Kas (Opening Pool)';
        }

        const badge = getBadgeInfo(exp.cash_account_name, exp.cash_account_kind, exp.cash_bank_name, exp.cash_account_number);
        const amt = parseFloat(exp.total_amount || 0);

        const isPayrollOrCyan = (exp.item_name || '').toLowerCase().includes('gaji') || (exp.item_name || '').toLowerCase().includes('honor');

        rows.push({
          id: `exp-${exp.exp_id}`,
          raw_date: dateStr,
          transaction_date: formatDmy(dateStr),
          month_year_label: getMonthYearLabel(dateStr),
          day_month_year_label: getDayMonthYearLabel(dateStr),
          category_label: 'Pengeluaran Belanja',
          category_code: 'expense',
          description: desc,
          income_amount: 0,
          expense_amount: amt,
          transfer_amount: amt,
          cash_account_id: exp.cash_account_id,
          cash_label: badge.label,
          cash_badge_class: badge.bg_class,
          bank_reference: exp.bank_statement_ref || exp.proof_number || '-',
          budget_pos_name: exp.budget_item_name || 'Beban Operasional',
          fund_source_name: cleanFundSourceName(fundName),
          source_type: 'expense',
          row_highlight: isPayrollOrCyan ? 'cyan' : 'none'
        });
      });
    } catch (err) {
      console.warn('[getCashLedger] Error loading expenses:', err.message);
    }

    // 4. CASH TRANSFERS (Pemindahan Kas & Mutasi Internal Dua Sisi)
    try {
      let ctQuery = db('cash_transfers as ct')
        .leftJoin('cash_accounts as from_ca', 'ct.from_cash_account_id', 'from_ca.id')
        .leftJoin('cash_accounts as to_ca', 'ct.to_cash_account_id', 'to_ca.id')
        .leftJoin('bank_statements as from_bs', 'ct.from_bank_statement_id', 'from_bs.id')
        .leftJoin('bank_statements as to_bs', 'ct.to_bank_statement_id', 'to_bs.id');

      if (targetUnit) {
        ctQuery = ctQuery.where(function() {
          this.where('ct.school_unit_id', targetUnit)
              .orWhere('ct.school_unit_id', 0)
              .orWhereNull('ct.school_unit_id');
        });
      }
      const effectiveCtDateFrom = date_from || selectedAy?.start_date;
      const effectiveCtDateTo = date_to || selectedAy?.end_date;
      if (effectiveCtDateFrom) ctQuery = ctQuery.where('ct.transfer_date', '>=', effectiveCtDateFrom);
      if (effectiveCtDateTo) ctQuery = ctQuery.where('ct.transfer_date', '<=', effectiveCtDateTo);

      const ctList = await ctQuery.select(
        'ct.id as ct_id',
        'ct.transfer_date',
        'ct.transfer_number',
        'ct.amount',
        'ct.reference_number as transfer_ref',
        'ct.reason',
        'from_ca.id as from_cash_account_id',
        'from_ca.name as from_cash_account_name',
        'from_ca.account_kind as from_cash_account_kind',
        'from_ca.bank_name as from_cash_bank_name',
        'from_ca.bank_account_number as from_cash_account_number',
        'to_ca.id as to_cash_account_id',
        'to_ca.name as to_cash_account_name',
        'to_ca.account_kind as to_cash_account_kind',
        'to_ca.bank_name as to_cash_bank_name',
        'to_ca.bank_account_number as to_cash_account_number',
        'from_bs.journal_number as from_bs_ref',
        'to_bs.journal_number as to_bs_ref'
      );

      ctList.forEach(ct => {
        const dateStr = formatDateStr(ct.transfer_date);
        const amt = parseFloat(ct.amount || 0);

        // Baris Sisi Keluar (From Cash)
        if (!cash_account_id || cash_account_id === 'all' || Number(cash_account_id) === Number(ct.from_cash_account_id)) {
          const fromBadge = getBadgeInfo(ct.from_cash_account_name, ct.from_cash_account_kind, ct.from_cash_bank_name, ct.from_cash_account_number);
          const toName = ct.to_cash_account_number ? `${ct.to_cash_bank_name || ct.to_cash_account_name} - ${ct.to_cash_account_number}` : (ct.to_cash_account_name || 'Kas Tujuan');
          const reasonStr = ct.reason ? ` (${ct.reason})` : '';

          rows.push({
            id: `ct-out-${ct.ct_id}`,
            raw_date: dateStr,
            transaction_date: formatDmy(dateStr),
            month_year_label: getMonthYearLabel(dateStr),
            day_month_year_label: getDayMonthYearLabel(dateStr),
            category_label: 'Mutasi Kas Keluar',
            category_code: 'transfer_out',
            description: `Pemindahan ke ${toName}${reasonStr}`,
            income_amount: 0,
            expense_amount: amt,
            transfer_amount: amt,
            cash_account_id: ct.from_cash_account_id,
            cash_label: fromBadge.label,
            cash_badge_class: fromBadge.bg_class,
            bank_reference: ct.from_bs_ref || ct.transfer_ref || ct.transfer_number || '-',
            budget_pos_name: '',
            fund_source_name: '',
            source_type: 'cash_transfer_out',
            affects_cash: true,
            is_historical: false,
            row_highlight: 'none'
          });
        }

        // Baris Sisi Masuk (To Cash)
        if (!cash_account_id || cash_account_id === 'all' || Number(cash_account_id) === Number(ct.to_cash_account_id)) {
          const toBadge = getBadgeInfo(ct.to_cash_account_name, ct.to_cash_account_kind, ct.to_cash_bank_name, ct.to_cash_account_number);
          const fromName = ct.from_cash_account_number ? `${ct.from_cash_bank_name || ct.from_cash_account_name} - ${ct.from_cash_account_number}` : (ct.from_cash_account_name || 'Kas Asal');
          const reasonStr = ct.reason ? ` (${ct.reason})` : '';

          rows.push({
            id: `ct-in-${ct.ct_id}`,
            raw_date: dateStr,
            transaction_date: formatDmy(dateStr),
            month_year_label: getMonthYearLabel(dateStr),
            day_month_year_label: getDayMonthYearLabel(dateStr),
            category_label: 'Mutasi Kas Masuk',
            category_code: 'transfer_in',
            description: `Pemindahan dari ${fromName}${reasonStr} (Penerimaan)`,
            income_amount: amt,
            expense_amount: 0,
            transfer_amount: amt,
            cash_account_id: ct.to_cash_account_id,
            cash_label: toBadge.label,
            cash_badge_class: toBadge.bg_class,
            bank_reference: ct.to_bs_ref || ct.transfer_ref || ct.transfer_number || '-',
            budget_pos_name: '',
            fund_source_name: '',
            source_type: 'cash_transfer_in',
            row_highlight: 'none'
          });
        }
      });
    } catch (err) {
      console.warn('[getCashLedger] Error loading cash transfers:', err.message);
    }

    // 5. OPENING BALANCES (Saldo Awal Kas)
    try {
      let obQuery = db('cash_account_opening_balances as ob')
        .join('cash_accounts as ca', 'ob.cash_account_id', 'ca.id');

      if (targetUnit) {
        obQuery = obQuery.where(function() {
          this.where('ca.school_unit_id', targetUnit)
              .orWhere('ca.school_unit_id', 0)
              .orWhereNull('ca.school_unit_id');
        });
      }
      if (cash_account_id && cash_account_id !== 'all') obQuery = obQuery.where('ob.cash_account_id', Number(cash_account_id));
      if (academic_year_id && academic_year_id !== 'all') {
        obQuery = obQuery.where('ob.academic_year_id', Number(academic_year_id));
      }
      if (date_from) obQuery = obQuery.where('ob.opening_date', '>=', date_from);
      if (date_to) obQuery = obQuery.where('ob.opening_date', '<=', `${date_to} 23:59:59`);

      const obList = await obQuery.select(
        'ob.id as ob_id',
        'ob.opening_balance',
        'ob.opening_date',
        'ob.academic_year_id',
        'ca.id as cash_account_id',
        'ca.name as cash_account_name',
        'ca.account_kind as cash_account_kind',
        'ca.bank_name as cash_bank_name',
        'ca.bank_account_number as cash_account_number'
      );

      obList.forEach(ob => {
        const openingDate = ob.opening_date ? formatDateStr(ob.opening_date) : (selectedAy?.start_date || '2024-07-01');
        const badge = getBadgeInfo(ob.cash_account_name, ob.cash_account_kind, ob.cash_bank_name, ob.cash_account_number);
        const amt = parseFloat(ob.opening_balance || 0);

        rows.push({
          id: `ob-${ob.ob_id}`,
          raw_date: openingDate,
          transaction_date: formatDmy(openingDate),
          month_year_label: getMonthYearLabel(openingDate),
          day_month_year_label: getDayMonthYearLabel(openingDate),
          category_label: 'Saldo Awal Kas',
          category_code: 'opening_balance',
          description: `Saldo Awal Kas : ${ob.cash_account_name}`,
          income_amount: amt,
          expense_amount: 0,
          transfer_amount: amt,
          cash_account_id: ob.cash_account_id,
          cash_label: badge.label,
          cash_badge_class: badge.bg_class,
          bank_reference: '-',
          budget_pos_name: '[Pemasukan] Saldo Awal Kas',
          fund_source_name: 'Saldo Awal Kas (Opening Pool)',
          source_type: 'opening_balance',
          affects_cash: true,
          is_historical: false,
          row_highlight: 'none'
        });
      });
    } catch (err) {
      console.warn('[getCashLedger] Error loading opening balances:', err.message);
    }

    // 6. CANTEEN WALLET TRANSACTIONS (Top Up & Tarik Tunai Dompet Santri)
    try {
      let walletQuery = db('journal_entries as je')
        .join('journal_entry_lines as jel', 'je.id', 'jel.journal_entry_id')
        .join('chart_of_accounts as coa', 'jel.chart_of_account_id', 'coa.id')
        .join('cash_accounts as ca', 'coa.id', 'ca.account_id')
        .leftJoin('bank_statement_references as bsr', function() {
          this.on('bsr.reference_id', '=', 'je.id')
            .andOn('bsr.reference_type', '=', db.raw("'canteen_wallet_topup'"));
        })
        .leftJoin('bank_statements as bs', 'bsr.bank_statement_id', 'bs.id')
        .whereIn('je.source_type', ['canteen_wallet_topup', 'canteen_wallet_withdrawal', 'canteen_wallet_withdraw']);

      if (targetUnit) {
        walletQuery = walletQuery.where(function() {
          this.where('je.school_unit_id', targetUnit)
              .orWhere('je.school_unit_id', 0)
              .orWhereNull('je.school_unit_id');
        });
      }
      if (cash_account_id && cash_account_id !== 'all') walletQuery = walletQuery.where('ca.id', Number(cash_account_id));
      if (academic_year_id && academic_year_id !== 'all') walletQuery = walletQuery.where('je.academic_year_id', Number(academic_year_id));
      if (date_from) walletQuery = walletQuery.where('je.journal_date', '>=', date_from);
      if (date_to) walletQuery = walletQuery.where('je.journal_date', '<=', `${date_to} 23:59:59`);

      const walletList = await walletQuery.select(
        'je.id as journal_id',
        'je.journal_number',
        'je.journal_date',
        'je.source_type',
        'je.source_id as student_id',
        'je.description',
        'jel.entry_side',
        'jel.amount',
        'ca.id as cash_account_id',
        'ca.name as cash_account_name',
        'ca.account_kind as cash_account_kind',
        'ca.bank_name as cash_bank_name',
        'ca.bank_account_number as cash_account_number',
        'bs.journal_number as bank_statement_ref'
      );

      // Batch load student info for wallet
      const walletStudentIds = [...new Set(walletList.map(w => w.student_id).filter(Boolean))];
      let walletStudentMap = {};
      if (walletStudentIds.length > 0) {
        try {
          const students = await crossModuleServices.getStudentsByIds(walletStudentIds);
          (students || []).forEach(s => {
            walletStudentMap[s.id] = s;
          });
        } catch (e) {
          console.warn('[getCashLedger] Could not load wallet student data:', e.message);
        }
      }

      walletList.forEach(w => {
        const dateStr = formatDateStr(w.journal_date);
        const isTopUp = w.source_type === 'canteen_wallet_topup';
        const st = walletStudentMap[w.student_id];
        const studentNis = st?.nis || st?.student_no || '';
        const studentName = st?.full_name || '';
        
        let desc = w.description || (isTopUp ? 'Top Up Saldo Dompet Santri' : 'Penarikan Saldo Dompet Santri');
        if (studentName && !desc.includes(studentName)) {
          desc = studentNis ? `[${studentNis}] ${studentName} | ${desc}` : `${studentName} | ${desc}`;
        }

        const badge = getBadgeInfo(w.cash_account_name, w.cash_account_kind, w.cash_bank_name, w.cash_account_number);
        const amt = parseFloat(w.amount || 0);

        rows.push({
          id: `wlt-${w.journal_id}`,
          raw_date: dateStr,
          transaction_date: formatDmy(dateStr),
          month_year_label: getMonthYearLabel(dateStr),
          day_month_year_label: getDayMonthYearLabel(dateStr),
          category_label: isTopUp ? 'Top Up Dompet Santri' : 'Tarik Tunai Dompet Santri',
          category_code: isTopUp ? 'wallet_topup' : 'wallet_withdrawal',
          description: desc,
          income_amount: isTopUp ? amt : 0,
          expense_amount: !isTopUp ? amt : 0,
          transfer_amount: amt,
          cash_account_id: w.cash_account_id,
          cash_label: badge.label,
          cash_badge_class: badge.bg_class,
          bank_reference: w.bank_statement_ref || w.journal_number || '-',
          budget_pos_name: isTopUp ? '[Pemasukan] Titipan Dompet Santri' : '[Pengeluaran] Penarikan Dompet Santri',
          fund_source_name: 'Titipan Dompet Santri',
          source_type: w.source_type,
          affects_cash: true,
          is_historical: false,
          row_highlight: isTopUp ? 'emerald' : 'none'
        });
      });
    } catch (err) {
      console.warn('[getCashLedger] Error loading wallet transactions:', err.message);
    }

    // 7. OTHER GENERAL CASH JOURNALS (Jurnal Kas / Penyesuaian Kas Lainnya)
    try {
      let otherJournalsQuery = db('journal_entries as je')
        .join('journal_entry_lines as jel', 'je.id', 'jel.journal_entry_id')
        .join('chart_of_accounts as coa', 'jel.chart_of_account_id', 'coa.id')
        .join('cash_accounts as ca', 'coa.id', 'ca.account_id')
        .leftJoin('bank_statement_references as bsr', 'bsr.reference_id', 'je.id')
        .leftJoin('bank_statements as bs', 'bsr.bank_statement_id', 'bs.id')
        .whereNotIn('je.source_type', [
          'student_bill_payment',
          'student_bill_issued',
          'student_bill_discount',
          'other_income',
          'expense',
          'internal_cash_transfer',
          'canteen_wallet_topup',
          'canteen_wallet_withdrawal',
          'canteen_wallet_withdraw'
        ]);

      if (targetUnit) {
        otherJournalsQuery = otherJournalsQuery.where(function() {
          this.where('je.school_unit_id', targetUnit)
              .orWhere('je.school_unit_id', 0)
              .orWhereNull('je.school_unit_id');
        });
      }
      if (cash_account_id && cash_account_id !== 'all') otherJournalsQuery = otherJournalsQuery.where('ca.id', Number(cash_account_id));
      if (academic_year_id && academic_year_id !== 'all') otherJournalsQuery = otherJournalsQuery.where('je.academic_year_id', Number(academic_year_id));
      if (date_from) otherJournalsQuery = otherJournalsQuery.where('je.journal_date', '>=', date_from);
      if (date_to) otherJournalsQuery = otherJournalsQuery.where('je.journal_date', '<=', `${date_to} 23:59:59`);

      const otherList = await otherJournalsQuery.select(
        'je.id as journal_id',
        'je.journal_number',
        'je.journal_date',
        'je.source_type',
        'je.description',
        'jel.entry_side',
        'jel.amount',
        'ca.id as cash_account_id',
        'ca.name as cash_account_name',
        'ca.account_kind as cash_account_kind',
        'ca.bank_name as cash_bank_name',
        'ca.bank_account_number as cash_account_number',
        'bs.journal_number as bank_statement_ref'
      );

      otherList.forEach(oj => {
        const dateStr = formatDateStr(oj.journal_date);
        const isDebit = oj.entry_side === 'debit';
        const badge = getBadgeInfo(oj.cash_account_name, oj.cash_account_kind, oj.cash_bank_name, oj.cash_account_number);
        const amt = parseFloat(oj.amount || 0);

        rows.push({
          id: `jrn-${oj.journal_id}-${oj.entry_side}`,
          raw_date: dateStr,
          transaction_date: formatDmy(dateStr),
          month_year_label: getMonthYearLabel(dateStr),
          day_month_year_label: getDayMonthYearLabel(dateStr),
          category_label: isDebit ? 'Penerimaan / Jurnal Kas' : 'Pengeluaran / Jurnal Kas',
          category_code: isDebit ? 'income_journal' : 'expense_journal',
          description: oj.description || (isDebit ? 'Penerimaan Kas (Jurnal)' : 'Pengeluaran Kas (Jurnal)'),
          income_amount: isDebit ? amt : 0,
          expense_amount: !isDebit ? amt : 0,
          transfer_amount: amt,
          cash_account_id: oj.cash_account_id,
          cash_label: badge.label,
          cash_badge_class: badge.bg_class,
          bank_reference: oj.bank_statement_ref || oj.journal_number || '-',
          budget_pos_name: isDebit ? `[Pemasukan] ${oj.description || 'Penerimaan'}` : `[Pengeluaran] ${oj.description || 'Pengeluaran'}`,
          fund_source_name: 'Jurnal Umum Kas',
          source_type: oj.source_type || 'manual_journal',
          affects_cash: true,
          is_historical: false,
          row_highlight: 'none'
        });
      });
    } catch (err) {
      console.warn('[getCashLedger] Error loading general cash journals:', err.message);
    }

    const getSourceOrder = (row) => {
      if (row.source_type === 'opening_balance' || row.category_code === 'opening_balance') return 0;
      if (row.source_type === 'cash_transfer_in' || row.category_code === 'transfer_in') return 1;
      if (row.source_type === 'bill_payment' || row.category_code === 'income_bill') return 2;
      if (row.source_type === 'canteen_wallet_topup' || row.category_code === 'wallet_topup') return 3;
      if (row.source_type === 'other_income' || row.category_code === 'income_other') return 4;
      if (row.category_code === 'income_journal') return 5;
      if (row.source_type === 'cash_transfer_out' || row.category_code === 'transfer_out') return 6;
      if (row.source_type === 'canteen_wallet_withdrawal' || row.source_type === 'canteen_wallet_withdraw' || row.category_code === 'wallet_withdrawal') return 7;
      if (row.source_type === 'expense' || row.category_code === 'expense') return 8;
      if (row.category_code === 'expense_journal') return 9;
      return 10;
    };

    // Sort by raw_date ASC, then Opening Balance FIRST (priority 0), then id ASC
    rows.sort((a, b) => {
      if (a.raw_date < b.raw_date) return -1;
      if (a.raw_date > b.raw_date) return 1;

      const orderA = getSourceOrder(a);
      const orderB = getSourceOrder(b);
      if (orderA !== orderB) return orderA - orderB;

      return a.id.localeCompare(b.id);
    });

    // Calculate Running Balance and Apply Search Filter
    let runningBalance = 0;
    const computedRows = rows.map(r => {
      const affects = r.affects_cash !== false;
      if (affects) {
        runningBalance = runningBalance + (r.income_amount || 0) - (r.expense_amount || 0);
      }
      return {
        ...r,
        affects_cash: affects,
        running_balance: affects ? runningBalance : null
      };
    });

    let filteredRows = computedRows;
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filteredRows = computedRows.filter(r =>
        (r.description || '').toLowerCase().includes(q) ||
        (r.bank_reference || '').toLowerCase().includes(q) ||
        (r.budget_pos_name || '').toLowerCase().includes(q) ||
        (r.fund_source_name || '').toLowerCase().includes(q) ||
        (r.cash_label || '').toLowerCase().includes(q) ||
        (r.category_label || '').toLowerCase().includes(q) ||
        (r.transaction_date || '').toLowerCase().includes(q)
      );
    }

    // Grouping by Month Year and Day Date
    const grouped = {};
    let grandTotalIncome = 0;
    let grandTotalExpense = 0;
    let grandTotalTransfer = 0;
    let grandTotalHistorical = 0;

    filteredRows.forEach(row => {
      if (row.affects_cash !== false) {
        grandTotalIncome += row.income_amount || 0;
        grandTotalExpense += row.expense_amount || 0;
        grandTotalTransfer += row.transfer_amount || 0;
      } else {
        grandTotalHistorical += row.income_amount || 0;
      }

      const mKey = row.month_year_label || 'PERIODE AKTIF';
      const dKey = row.day_month_year_label || row.transaction_date;

      if (!grouped[mKey]) {
        grouped[mKey] = {
          month_label: mKey,
          total_income: 0,
          total_expense: 0,
          total_historical: 0,
          days: {}
        };
      }

      if (row.affects_cash !== false) {
        grouped[mKey].total_income += row.income_amount || 0;
        grouped[mKey].total_expense += row.expense_amount || 0;
      } else {
        grouped[mKey].total_historical += row.income_amount || 0;
      }

      if (!grouped[mKey].days[dKey]) {
        grouped[mKey].days[dKey] = {
          day_label: dKey,
          raw_date: row.raw_date,
          rows: []
        };
      }
      grouped[mKey].days[dKey].rows.push(row);
    });

    return {
      rows: filteredRows,
      grouped,
      summary: {
        total_income: grandTotalIncome,
        total_expense: grandTotalExpense,
        total_transfer: grandTotalTransfer,
        total_historical: grandTotalHistorical,
        net_balance: grandTotalIncome - grandTotalExpense,
        count: filteredRows.length
      }
    };
  }
}

module.exports = new BookkeepingService();
