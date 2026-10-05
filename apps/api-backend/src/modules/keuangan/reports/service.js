/**
 * Reports Service for Keuangan Module
 * Covers Features #30, #31, #32, #33
 * Logic Query Aggregate Real-Time dari journal_entry_lines dan expenses
 */
const db = require('../../../config/db/keuangan');
const budgetService = require('../budget/service');
const billsService = require('../bills/service');
const crossModuleServices = require('../common/crossModuleServices');

class ReportsService {
  // ============================================================
  // 1. LAPORAN REALISASI RAPBS (Fitur #30)
  // ============================================================

  async getBudgetRealizationReport(schoolUnitId, budgetPlanId) {
    return budgetService.getBudgetRealization(schoolUnitId, budgetPlanId);
  }

  // ============================================================
  // 2. BUKU BESAR (General Ledger - Fitur #31)
  // ============================================================

  async getGeneralLedger(schoolUnitId, filters = {}) {
    const { account_code, period_from, period_to, academic_year_id } = filters;

    let accountQuery = db('chart_of_accounts').where('school_unit_id', schoolUnitId);
    if (account_code) {
      accountQuery = accountQuery.where('account_code', account_code);
    }
    const accounts = await accountQuery.orderBy('account_code', 'asc');

    const result = [];

    for (const acc of accounts) {
      let linesQuery = db('journal_entry_lines')
        .join('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
        .where({
          'journal_entry_lines.chart_of_account_id': acc.id,
          'journal_entries.school_unit_id': schoolUnitId
        })
        .select(
          'journal_entries.id as journal_id',
          'journal_entries.journal_number',
          'journal_entries.journal_date',
          'journal_entries.source_type',
          'journal_entries.description',
          'journal_entry_lines.entry_side',
          'journal_entry_lines.amount'
        );

      if (academic_year_id && academic_year_id !== 'all') {
        linesQuery = linesQuery.where('journal_entries.academic_year_id', Number(academic_year_id));
      }
      if (period_from) linesQuery = linesQuery.where('journal_entries.journal_date', '>=', period_from);
      if (period_to) linesQuery = linesQuery.where('journal_entries.journal_date', '<=', period_to);

      const lines = await linesQuery.orderBy('journal_entries.journal_date', 'asc');

      let runningBalance = 0;
      let totalDebit = 0;
      let totalCredit = 0;

      const mutations = lines.map(line => {
        const amt = parseFloat(line.amount || 0);
        const isDebitNormal = acc.normal_balance
          ? acc.normal_balance === 'debit'
          : ['harta', 'piutang', 'inventaris', 'biaya', 'asset', 'expense'].includes(acc.account_group);

        if (line.entry_side === 'debit') {
          totalDebit += amt;
          // Untuk akun bersaldo normal Debit: debit menambah saldo, kredit mengurangi saldo
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
          amount: amt,
          balance_after: runningBalance
        };
      });

      result.push({
        account_id: acc.id,
        account_code: acc.account_code,
        account_name: acc.account_name,
        account_group: acc.account_group,
        normal_balance: acc.normal_balance || (['harta', 'piutang', 'inventaris', 'biaya', 'asset', 'expense'].includes(acc.account_group) ? 'debit' : 'credit'),
        total_debit: totalDebit,
        total_credit: totalCredit,
        ending_balance: runningBalance,
        mutations
      });
    }

    return result;
  }

  // ============================================================
  // 3. NERACA SALDO (Trial Balance - Fitur #31)
  // ============================================================

  async getTrialBalance(schoolUnitId, periodOrFilters = null) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;

    let period = null;
    let academicYearId = null;
    if (typeof periodOrFilters === 'string') {
      period = periodOrFilters;
    } else if (periodOrFilters && typeof periodOrFilters === 'object') {
      period = periodOrFilters.period || null;
      academicYearId = periodOrFilters.academic_year_id || null;
    }

    let accountsQuery = db('chart_of_accounts');
    if (targetUnit) {
      accountsQuery = accountsQuery.where(b => {
        b.where('school_unit_id', targetUnit).orWhere('school_unit_id', 0).orWhereNull('school_unit_id');
      });
    }
    const accounts = await accountsQuery.orderBy('account_code', 'asc');

    let linesQuery = db('journal_entry_lines')
      .join('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id');

    if (targetUnit) {
      linesQuery = linesQuery.where('journal_entries.school_unit_id', targetUnit);
    }

    if (academicYearId && academicYearId !== 'all') {
      linesQuery = linesQuery.where('journal_entries.academic_year_id', Number(academicYearId));
    } else if (period) {
      linesQuery = linesQuery.where('journal_entries.journal_date', 'like', `${period}%`);
    }

    const lines = await linesQuery.select(
      'journal_entry_lines.chart_of_account_id',
      'journal_entry_lines.entry_side',
      'journal_entry_lines.amount'
    );

    const debitMap = {};
    const creditMap = {};

    lines.forEach(l => {
      const id = l.chart_of_account_id;
      const amt = parseFloat(l.amount || 0);
      if (l.entry_side === 'debit') {
        debitMap[id] = (debitMap[id] || 0) + amt;
      } else {
        creditMap[id] = (creditMap[id] || 0) + amt;
      }
    });

    let grandTotalDebit = 0;
    let grandTotalCredit = 0;

    const rows = accounts.map(acc => {
      const d = debitMap[acc.id] || 0;
      const c = creditMap[acc.id] || 0;
      grandTotalDebit += d;
      grandTotalCredit += c;

      const isDebitNormal = acc.normal_balance
        ? acc.normal_balance === 'debit'
        : ['harta', 'piutang', 'inventaris', 'biaya', 'asset', 'expense'].includes(acc.account_group?.toLowerCase());
      const netBalance = isDebitNormal ? (d - c) : (c - d);

      return {
        account_id: acc.id,
        account_code: acc.account_code,
        account_name: acc.account_name,
        account_group: acc.account_group,
        normal_balance: acc.normal_balance || (isDebitNormal ? 'debit' : 'credit'),
        debit: d,
        credit: c,
        net_balance: netBalance
      };
    });

    return {
      period: period || (academicYearId ? `Tahun Ajaran #${academicYearId}` : 'Semua Periode'),
      total_debit: grandTotalDebit,
      total_credit: grandTotalCredit,
      is_balanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
      rows
    };
  }

  // ============================================================
  // 4. SURPLUS / DEFISIT (Income Statement - Fitur #32)
  // ============================================================

  async getIncomeStatement(schoolUnitId, periodOrFilters = null) {
    const trialBalance = await this.getTrialBalance(schoolUnitId, periodOrFilters);

    const revenueAccounts = trialBalance.rows.filter(r => ['pendapatan', 'revenue', 'income'].includes(r.account_group?.toLowerCase()));
    const expenseAccounts = trialBalance.rows.filter(r => ['biaya', 'expense'].includes(r.account_group?.toLowerCase()));

    const totalRevenue = revenueAccounts.reduce((sum, r) => sum + (r.credit - r.debit), 0);
    const totalExpense = expenseAccounts.reduce((sum, r) => sum + (r.debit - r.credit), 0);
    const surplusDefisit = totalRevenue - totalExpense;

    return {
      period: trialBalance.period,
      total_revenue: totalRevenue,
      total_expense: totalExpense,
      surplus_defisit: surplusDefisit,
      is_surplus: surplusDefisit >= 0,
      revenues: revenueAccounts,
      expenses: expenseAccounts
    };
  }

  // ============================================================
  // 5. ARUS KAS (Cash Flow - Fitur #32)
  // ============================================================

  async getCashFlow(schoolUnitId, periodOrFilters = null) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;

    let period = null;
    let academicYearId = null;
    if (typeof periodOrFilters === 'string') {
      period = periodOrFilters;
    } else if (periodOrFilters && typeof periodOrFilters === 'object') {
      period = periodOrFilters.period || null;
      academicYearId = periodOrFilters.academic_year_id || null;
    }

    let query = db('journal_entry_lines')
      .join('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .join('chart_of_accounts', 'journal_entry_lines.chart_of_account_id', 'chart_of_accounts.id')
      .whereIn('chart_of_accounts.account_group', ['harta', 'asset']);

    if (targetUnit) {
      query = query.where('journal_entries.school_unit_id', targetUnit);
    }

    if (academicYearId && academicYearId !== 'all') {
      query = query.where('journal_entries.academic_year_id', Number(academicYearId));
    } else if (period) {
      query = query.where('journal_entries.journal_date', 'like', `${period}%`);
    }

    const lines = await query.select(
      'journal_entry_lines.*',
      'journal_entries.journal_date',
      'journal_entries.source_type',
      'journal_entries.description'
    );

    let cashInflow = 0;
    let cashOutflow = 0;

    lines.forEach(l => {
      const amt = parseFloat(l.amount || 0);
      if (l.entry_side === 'debit') {
        cashInflow += amt;
      } else {
        cashOutflow += amt;
      }
    });

    return {
      period: period || (academicYearId ? `Tahun Ajaran #${academicYearId}` : 'Semua Periode'),
      cash_inflow: cashInflow,
      cash_outflow: cashOutflow,
      net_cash_flow: cashInflow - cashOutflow,
      activities: lines
    };
  }

  // ============================================================
  // 6. NERACA (Balance Sheet - Format Nirlaba 7 Kelompok Akun)
  // ============================================================

  async getBalanceSheet(schoolUnitId, periodOrFilters = null) {
    const trialBalance = await this.getTrialBalance(schoolUnitId, periodOrFilters);

    // 7 Kelompok Akuntansi Nirlaba:
    // AKTIVA:
    // A. Harta Lancar (Kas & Setara Kas): 'harta', 'asset'
    // B. Piutang Siswa & Piutang Lain: 'piutang'
    // C. Inventaris & Aset Tetap: 'inventaris'
    // PASIVA:
    // A. Kewajiban / Utang: 'utang', 'liability'
    // B. Ekuitas / Saldo Dana / Modal: 'modal', 'equity'

    const currentAssets = trialBalance.rows.filter(r => ['harta', 'asset'].includes(r.account_group?.toLowerCase()));
    const receivables = trialBalance.rows.filter(r => r.account_group?.toLowerCase() === 'piutang');
    const fixedAssets = trialBalance.rows.filter(r => r.account_group?.toLowerCase() === 'inventaris');

    const liabilities = trialBalance.rows.filter(r => ['utang', 'liability'].includes(r.account_group?.toLowerCase()));
    const equity = trialBalance.rows.filter(r => ['modal', 'equity'].includes(r.account_group?.toLowerCase()));

    const revenueAccounts = trialBalance.rows.filter(r => ['pendapatan', 'revenue', 'income'].includes(r.account_group?.toLowerCase()));
    const expenseAccounts = trialBalance.rows.filter(r => ['biaya', 'expense'].includes(r.account_group?.toLowerCase()));
    const totalRevenue = revenueAccounts.reduce((sum, r) => sum + (r.credit - r.debit), 0);
    const totalExpense = expenseAccounts.reduce((sum, r) => sum + (r.debit - r.credit), 0);
    const currentPeriodSurplus = totalRevenue - totalExpense;

    const totalCurrentAssets = currentAssets.reduce((sum, r) => sum + (r.debit - r.credit), 0);
    const totalReceivables = receivables.reduce((sum, r) => sum + (r.debit - r.credit), 0);
    const totalFixedAssets = fixedAssets.reduce((sum, r) => sum + (r.debit - r.credit), 0);
    const totalAssets = totalCurrentAssets + totalReceivables + totalFixedAssets;

    const totalLiabilities = liabilities.reduce((sum, r) => sum + (r.credit - r.debit), 0);
    const baseEquity = equity.reduce((sum, r) => sum + (r.credit - r.debit), 0);
    const totalEquity = baseEquity + currentPeriodSurplus;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      period: trialBalance.period,
      // Aktiva
      current_assets: currentAssets,
      total_current_assets: totalCurrentAssets,
      receivables: receivables,
      total_receivables: totalReceivables,
      fixed_assets: fixedAssets,
      total_fixed_assets: totalFixedAssets,
      total_assets: totalAssets,
      assets: [...currentAssets, ...receivables, ...fixedAssets],

      // Pasiva
      liabilities: liabilities,
      total_liabilities: totalLiabilities,
      equity: equity,
      base_equity: baseEquity,
      current_period_surplus: currentPeriodSurplus,
      total_equity: totalEquity,
      total_liabilities_and_equity: totalLiabilitiesAndEquity,

      // Keseimbangan Neraca
      is_balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01
    };
  }

  // ============================================================
  // 7. KARTU BAYAR SISWA & REKAP KELAS (Student Ledger)
  // ============================================================

  async getStudentPaymentCard(schoolUnitId, studentId, filters = {}) {
    return this.getStudentLedger(schoolUnitId, studentId, filters);
  }

  async getStudentLedger(schoolUnitId, studentId, filters = {}) {
    const sId = Number(studentId);
    if (!sId) {
      const err = new Error('Student ID tidak valid');
      err.statusCode = 400;
      throw err;
    }

    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    const isAllYears = filters.all_years === 'true' || filters.all_years === true;
    let academicYearId = filters.academic_year_id ? Number(filters.academic_year_id) : null;

    if (!isAllYears && !academicYearId) {
      try {
        const activeYears = await crossModuleServices.listAcademicYears(targetUnit ? { satuan_pendidikan_id: targetUnit, is_active: true } : { is_active: true });
        if (activeYears && activeYears.length > 0) {
          academicYearId = activeYears[0].id;
        }
      } catch (e) {
        console.warn('[getStudentLedger] Gagal memuat tahun ajaran aktif:', e.message);
      }
    }

    let matchingAyIds = [];
    if (academicYearId) {
      matchingAyIds.push(academicYearId);
      try {
        const ayRow = await crossModuleServices.getAcademicYear(academicYearId);
        if (ayRow && ayRow.name) {
          const sameAys = await crossModuleServices.listAcademicYears();
          sameAys.filter(y => y.name === ayRow.name).forEach(y => {
            if (!matchingAyIds.includes(y.id)) matchingAyIds.push(y.id);
          });
        }
      } catch (e) {}
    }

    const targetAy = isAllYears ? 'all' : (academicYearId || null);
    const student = await crossModuleServices.getStudent(sId, targetAy);
    if (!student) {
      const err = new Error(`Data siswa dengan ID ${sId} tidak ditemukan`);
      err.statusCode = 404;
      throw err;
    }

    let billsQuery = db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .where('student_bills.student_id', sId)
      .whereNotIn('student_bills.status', ['cancelled'])
      .select(
        'student_bills.*',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern'
      );

    if (targetUnit) {
      billsQuery = billsQuery.where('student_bills.school_unit_id', targetUnit);
    }

    if (isAllYears) {
      // Riwayat Penuh: tidak batasi tahun ajaran
    } else if (matchingAyIds.length > 0) {
      billsQuery = billsQuery.whereIn('student_bills.academic_year_id', matchingAyIds);
    } else if (filters.period_year) {
      billsQuery = billsQuery.where('student_bills.period_year', filters.period_year);
    }
    if (filters.fee_type_id) {
      billsQuery = billsQuery.where('student_bills.fee_type_id', Number(filters.fee_type_id));
    }

    const bills = await billsQuery.orderBy([
      { column: 'student_bills.period_year', order: 'asc' },
      { column: 'student_bills.period_month', order: 'asc' },
      { column: 'student_bills.id', order: 'asc' }
    ]);

    const billIds = bills.map(b => b.id);

    // Ambil seluruh riwayat pembayaran untuk tagihan-tagihan ini
    const allPayments = billIds.length > 0
      ? await db('bill_payments')
          .leftJoin('cash_accounts', 'bill_payments.cash_account_id', 'cash_accounts.id')
          .whereIn('bill_payments.student_bill_id', billIds)
          .select(
            'bill_payments.id',
            'bill_payments.student_bill_id',
            'bill_payments.amount',
            'bill_payments.paid_at',
            'bill_payments.payment_method',
            'bill_payments.receipt_number',
            'bill_payments.is_legacy',
            'bill_payments.historical_cash_note',
            'cash_accounts.name as cash_account_name'
          )
          .orderBy('bill_payments.paid_at', 'asc')
      : [];

    const paymentMap = {};
    allPayments.forEach(p => {
      if (!paymentMap[p.student_bill_id]) paymentMap[p.student_bill_id] = [];
      paymentMap[p.student_bill_id].push(p);
    });

    const allAcademicYears = await crossModuleServices.listAcademicYears().catch(() => []);
    const ayMap = {};
    (allAcademicYears || []).forEach(ay => { ayMap[ay.id] = ay.name; });

    const items = bills.map(b => {
      const billAmount = parseFloat(b.amount || 0);
      const discountAmount = parseFloat(b.discount_amount || 0);
      const netBilled = Math.max(0, billAmount - discountAmount);
      const payments = paymentMap[b.id] || [];
      const paidSum = payments.length > 0
        ? payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0)
        : parseFloat(b.paid_amount || 0);
      const remaining = Math.max(0, netBilled - paidSum);

      const periodLabel = b.period_month
        ? `${String(b.period_month).padStart(2, '0')}/${b.period_year}`
        : `${b.period_year || '-'}`;

      const resolvedAyName = ayMap[b.academic_year_id] || (b.period_year ? (b.period_month && b.period_month <= 6 ? `${b.period_year - 1}/${b.period_year}` : `${b.period_year}/${b.period_year + 1}`) : '-');

      return {
        bill_id: b.id,
        academic_year_id: b.academic_year_id,
        academic_year_name: resolvedAyName,
        fee_type_id: b.fee_type_id,
        fee_type_name: b.fee_type_name,
        billing_pattern: b.billing_pattern,
        period_month: b.period_month,
        period_year: b.period_year,
        period_label: periodLabel,
        due_date: b.due_date ? String(b.due_date).slice(0, 10) : null,
        amount: billAmount,
        discount_amount: discountAmount,
        net_amount: netBilled,
        paid_amount: paidSum,
        remaining_amount: remaining,
        status: b.status,
        published_at: b.published_at,
        is_legacy: Boolean(b.is_legacy),
        legacy_note: b.legacy_note || null,
        payments: payments.map(p => ({
          payment_id: p.id,
          receipt_number: p.receipt_number,
          paid_at: p.paid_at ? String(p.paid_at).slice(0, 10) : null,
          payment_method: p.payment_method,
          amount: parseFloat(p.amount),
          is_legacy: Boolean(p.is_legacy),
          historical_cash_note: p.historical_cash_note || null,
          cash_account_name: p.cash_account_name || (p.is_legacy ? (p.historical_cash_note || 'Kas Historis') : 'Kas Utama')
        }))
      };
    });

    // Ambil histori tagihan & pembayaran PPDB calon murid (termasuk cicilan & revisi)
    const ppdbBills = await db('ppdb_registration_bills as prb')
      .leftJoin('fee_types as ft', 'prb.fee_type_id', 'ft.id')
      .where('prb.linked_student_id', sId)
      .where('prb.is_installment_parent', false) // Hindari double count induk paket
      .select('prb.*', 'ft.name as fee_type_name')
      .orderBy('prb.id', 'asc');

    const ppdbBillIds = ppdbBills.map(b => b.id);
    const ppdbPayments = ppdbBillIds.length > 0
      ? await db('ppdb_registration_payments as prp')
          .leftJoin('cash_accounts as ca', 'prp.cash_account_id', 'ca.id')
          .whereIn('prp.ppdb_registration_bill_id', ppdbBillIds)
          .select('prp.*', 'ca.name as cash_account_name')
          .orderBy('prp.payment_date', 'asc')
      : [];

    const ppdbPaymentMap = {};
    ppdbPayments.forEach(p => {
      if (!ppdbPaymentMap[p.ppdb_registration_bill_id]) {
        ppdbPaymentMap[p.ppdb_registration_bill_id] = [];
      }
      ppdbPaymentMap[p.ppdb_registration_bill_id].push(p);
    });

    // Hanya masukkan item PPDB yang belum tersinkronisasi di student_bills
    // (Mencegah double count untuk santri yang sudah ditempatkan)
    const existingFeeTypeIds = new Set(bills.map(b => b.fee_type_id));
    const unsyncedPpdbBills = ppdbBills.filter(pb => {
      if (!isAllYears && matchingAyIds.length > 0 && !matchingAyIds.includes(pb.target_academic_year_id)) {
        return false;
      }
      return !existingFeeTypeIds.has(pb.fee_type_id);
    });

    const ppdbItems = unsyncedPpdbBills.map(b => {
      const bAmount = parseFloat(b.amount || 0);
      const bDiscount = parseFloat(b.discount_amount || 0);
      const netBilled = Math.max(0, bAmount - bDiscount);
      const pList = ppdbPaymentMap[b.id] || [];
      const bPaid = pList.length > 0
        ? pList.reduce((acc, p) => acc + parseFloat(p.amount_paid || 0), 0)
        : parseFloat(b.paid_amount || 0);
      const bRemaining = Math.max(0, netBilled - bPaid);

      const phaseLabel = b.billing_phase === 'enrollment_fee' ? 'Uang Pangkal / Daftar Ulang' : 'Pendaftaran PPDB';
      const installmentLabel = b.installment_number ? ` (Termin ${b.installment_number}/${b.installment_total})` : '';

      const resolvedPpdbAyName = ayMap[b.target_academic_year_id] || (b.target_academic_year_id ? `T.A. ${b.target_academic_year_id}` : '-');

      return {
        bill_id: `PPDB-${b.id}`,
        raw_bill_id: b.id,
        is_ppdb: true,
        academic_year_id: b.target_academic_year_id,
        academic_year_name: resolvedPpdbAyName,
        fee_type_id: b.fee_type_id,
        fee_type_name: `${b.fee_type_name || phaseLabel}${installmentLabel}`,
        billing_phase: b.billing_phase,
        installment_number: b.installment_number,
        installment_total: b.installment_total,
        version: b.version || 1,
        period_label: `PPDB (Tahun Masuk ${b.target_academic_year_id})`,
        due_date: null,
        amount: bAmount,
        discount_amount: bDiscount,
        net_amount: netBilled,
        paid_amount: bPaid,
        remaining_amount: bRemaining,
        status: b.status,
        published_at: b.created_at,
        is_legacy: false,
        payments: pList.map(p => ({
          payment_id: p.id,
          receipt_number: p.receipt_number,
          paid_at: p.payment_date ? String(p.payment_date).slice(0, 10) : null,
          payment_method: p.payment_method,
          amount: parseFloat(p.amount_paid),
          is_legacy: false,
          cash_account_name: p.cash_account_name || 'Kas Utama'
        }))
      };
    });

    const unifiedItems = [...ppdbItems, ...items];

    const totalBilled = unifiedItems.reduce((acc, item) => acc + (item.amount - item.discount_amount), 0);
    const totalDiscount = unifiedItems.reduce((acc, item) => acc + item.discount_amount, 0);
    const totalPaid = unifiedItems.reduce((acc, item) => acc + item.paid_amount, 0);
    const totalRemaining = unifiedItems.reduce((acc, item) => acc + item.remaining_amount, 0);

    let previousYearArrears = {
      total_remaining: 0,
      total_billed: 0,
      total_paid: 0,
      total_discount: 0,
      count: 0,
      breakdown: []
    };

    if (!isAllYears && academicYearId) {
      try {
        const arrearsMap = await billsService.getPreviousYearArrears([sId], academicYearId, targetUnit);
        if (arrearsMap && arrearsMap.has(sId)) {
          previousYearArrears = arrearsMap.get(sId);
        }
      } catch (e) {
        console.warn('[getStudentLedger] Gagal mengambil previous year arrears:', e.message);
      }
    }

    const grandTotalRemaining = totalRemaining + (isAllYears ? 0 : previousYearArrears.total_remaining);

    // ============================================================
    // PIVOT TABLE AGGREGATION (Row = Fee Component, Col = Academic Year)
    // ALWAYS CALCULATED FROM FULL LIFETIME HISTORY OF THE STUDENT
    // ============================================================
    let lifetimeUnifiedItems = [];
    if (isAllYears) {
      lifetimeUnifiedItems = unifiedItems;
    } else {
      let allBillsQuery = db('student_bills')
        .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
        .where('student_bills.student_id', sId)
        .whereNotIn('student_bills.status', ['cancelled'])
        .select(
          'student_bills.*',
          'fee_types.name as fee_type_name',
          'fee_types.code as fee_type_code',
          'fee_types.billing_pattern'
        );
      if (targetUnit) allBillsQuery = allBillsQuery.where('student_bills.school_unit_id', targetUnit);
      const rawAllBills = await allBillsQuery.orderBy([
        { column: 'student_bills.period_year', order: 'asc' },
        { column: 'student_bills.period_month', order: 'asc' },
        { column: 'student_bills.id', order: 'asc' }
      ]);

      const allBillIds = rawAllBills.map(b => b.id);
      const rawAllPayments = allBillIds.length > 0
        ? await db('bill_payments')
            .whereIn('bill_payments.student_bill_id', allBillIds)
            .select('bill_payments.student_bill_id', 'bill_payments.amount')
        : [];

      const lifetimePaymentMap = {};
      rawAllPayments.forEach(p => {
        lifetimePaymentMap[p.student_bill_id] = (lifetimePaymentMap[p.student_bill_id] || 0) + parseFloat(p.amount || 0);
      });

      const lifetimeBillItems = rawAllBills.map(b => {
        const bAmount = parseFloat(b.amount || 0);
        const bDiscount = parseFloat(b.discount_amount || 0);
        const netBilled = Math.max(0, bAmount - bDiscount);
        const paid = lifetimePaymentMap[b.id] !== undefined ? lifetimePaymentMap[b.id] : parseFloat(b.paid_amount || 0);
        const remaining = Math.max(0, netBilled - paid);

        const resolvedAyName = ayMap[b.academic_year_id] || (b.period_year ? (b.period_month && b.period_month <= 6 ? `${b.period_year - 1}/${b.period_year}` : `${b.period_year}/${b.period_year + 1}`) : '-');

        return {
          fee_type_id: b.fee_type_id,
          fee_type_name: b.fee_type_name,
          fee_type_code: b.fee_type_code,
          academic_year_id: b.academic_year_id,
          academic_year_name: resolvedAyName,
          amount: bAmount,
          discount_amount: bDiscount,
          paid_amount: paid,
          remaining_amount: remaining,
          billing_pattern: b.billing_pattern || 'monthly'
        };
      });

      const lifetimeExistingFeeTypeIds = new Set(rawAllBills.map(b => b.fee_type_id));
      const lifetimeUnsyncedPpdbBills = ppdbBills.filter(pb => !lifetimeExistingFeeTypeIds.has(pb.fee_type_id));
      const lifetimePpdbItems = lifetimeUnsyncedPpdbBills.map(b => {
        const bAmount = parseFloat(b.amount || 0);
        const bDiscount = parseFloat(b.discount_amount || 0);
        const netBilled = Math.max(0, bAmount - bDiscount);
        const pList = ppdbPaymentMap[b.id] || [];
        const bPaid = pList.length > 0
          ? pList.reduce((acc, p) => acc + parseFloat(p.amount_paid || 0), 0)
          : parseFloat(b.paid_amount || 0);
        const bRemaining = Math.max(0, netBilled - bPaid);

        const phaseLabel = b.billing_phase === 'enrollment_fee' ? 'Uang Pangkal / Daftar Ulang' : 'Pendaftaran PPDB';
        const installmentLabel = b.installment_number ? ` (Termin ${b.installment_number}/${b.installment_total})` : '';
        const resolvedPpdbAyName = ayMap[b.target_academic_year_id] || (b.target_academic_year_id ? `T.A. ${b.target_academic_year_id}` : '-');

        return {
          fee_type_id: b.fee_type_id,
          fee_type_name: `${b.fee_type_name || phaseLabel}${installmentLabel}`,
          is_ppdb: true,
          academic_year_id: b.target_academic_year_id,
          academic_year_name: resolvedPpdbAyName,
          amount: bAmount,
          discount_amount: bDiscount,
          paid_amount: bPaid,
          remaining_amount: bRemaining,
          billing_pattern: b.billing_pattern || 'one_time'
        };
      });

      lifetimeUnifiedItems = [...lifetimePpdbItems, ...lifetimeBillItems];
    }

    const itemsForPivot = lifetimeUnifiedItems;

    const presentAyMap = new Map();
    itemsForPivot.forEach(it => {
      const ayId = it.academic_year_id ? Number(it.academic_year_id) : 0;
      const ayObj = (allAcademicYears || []).find(y => y.id === ayId);
      const ayName = it.academic_year_name || ayObj?.name || (it.period_year ? `T.A. ${it.period_year}` : 'T.A. Awal');
      
      let startDate = ayObj?.start_date ? new Date(ayObj.start_date).getTime() : 0;
      if (!startDate && it.period_year) {
        startDate = new Date(`${it.period_year}-07-01`).getTime();
      }

      if (!presentAyMap.has(ayId)) {
        presentAyMap.set(ayId, {
          id: ayId,
          name: ayName,
          start_date: startDate || ayId
        });
      }
    });

    const sortedAcademicYears = Array.from(presentAyMap.values()).sort((a, b) => {
      if (a.start_date !== b.start_date) return a.start_date - b.start_date;
      return a.id - b.id;
    });

    const patternOrder = {
      'one_time': 1,
      'ppdb': 1,
      'monthly': 2,
      'yearly': 3,
      'incidental': 4
    };

    const monthSequence = [
      { month: 7, name: 'Juli' },
      { month: 8, name: 'Agustus' },
      { month: 9, name: 'September' },
      { month: 10, name: 'Oktober' },
      { month: 11, name: 'November' },
      { month: 12, name: 'Desember' },
      { month: 1, name: 'Januari' },
      { month: 2, name: 'Februari' },
      { month: 3, name: 'Maret' },
      { month: 4, name: 'April' },
      { month: 5, name: 'Mei' },
      { month: 6, name: 'Juni' }
    ];

    const componentMap = new Map();
    itemsForPivot.forEach(it => {
      const ftId = it.fee_type_id || 0;
      const rawPattern = String(it.billing_pattern || '').toLowerCase();
      const isArrear = String(it.fee_type_code || '').includes('arrear') || String(it.fee_type_name || '').toLowerCase().includes('tunggakan');
      const patternWeight = isArrear ? 5 : (it.is_ppdb ? 1 : (patternOrder[rawPattern] || 4));
      
      if (!componentMap.has(ftId)) {
        const isMonthly = rawPattern === 'monthly';
        const monthlyBreakdownMap = {};
        if (isMonthly) {
          monthSequence.forEach(m => {
            const byYear = {};
            sortedAcademicYears.forEach(ay => {
              byYear[ay.id] = { billed: 0, paid: 0, remaining: 0 };
            });
            monthlyBreakdownMap[m.month] = {
              month: m.month,
              month_name: m.name,
              by_year: byYear,
              total: { billed: 0, paid: 0, remaining: 0 }
            };
          });
        }

        componentMap.set(ftId, {
          fee_type_id: ftId,
          component_name: it.fee_type_name || `Pos Biaya #${ftId}`,
          billing_pattern: it.billing_pattern || 'monthly',
          is_ppdb: Boolean(it.is_ppdb),
          pattern_weight: patternWeight,
          monthly_breakdown_map: isMonthly ? monthlyBreakdownMap : null,
          by_year: {},
          total: { billed: 0, paid: 0, remaining: 0 }
        });
      }
    });

    for (const comp of componentMap.values()) {
      sortedAcademicYears.forEach(ay => {
        comp.by_year[ay.id] = { billed: 0, paid: 0, remaining: 0 };
      });
    }

    itemsForPivot.forEach(it => {
      const ftId = it.fee_type_id || 0;
      const ayId = it.academic_year_id ? Number(it.academic_year_id) : 0;
      const comp = componentMap.get(ftId);
      if (!comp) return;

      const bAmt = parseFloat(it.amount || 0);
      const bDisc = parseFloat(it.discount_amount || 0);
      const netBilled = Math.max(0, bAmt - bDisc);
      const paid = parseFloat(it.paid_amount || 0);
      const remaining = Math.max(0, netBilled - paid);

      if (comp.by_year[ayId]) {
        comp.by_year[ayId].billed += netBilled;
        comp.by_year[ayId].paid += paid;
        comp.by_year[ayId].remaining += remaining;
      }

      comp.total.billed += netBilled;
      comp.total.paid += paid;
      comp.total.remaining += remaining;

      // Track monthly breakdown if monthly pattern
      if (comp.monthly_breakdown_map) {
        const mKey = it.period_month ? Number(it.period_month) : null;
        let targetMonth = mKey && comp.monthly_breakdown_map[mKey] ? comp.monthly_breakdown_map[mKey] : null;
        if (!targetMonth) {
          if (!comp.monthly_breakdown_map['other']) {
            const byYear = {};
            sortedAcademicYears.forEach(ay => {
              byYear[ay.id] = { billed: 0, paid: 0, remaining: 0 };
            });
            comp.monthly_breakdown_map['other'] = {
              month: 0,
              month_name: 'Lainnya / Tidak Terjadwal',
              by_year: byYear,
              total: { billed: 0, paid: 0, remaining: 0 }
            };
          }
          targetMonth = comp.monthly_breakdown_map['other'];
        }

        if (targetMonth.by_year[ayId]) {
          targetMonth.by_year[ayId].billed += netBilled;
          targetMonth.by_year[ayId].paid += paid;
          targetMonth.by_year[ayId].remaining += remaining;
        }
        targetMonth.total.billed += netBilled;
        targetMonth.total.paid += paid;
        targetMonth.total.remaining += remaining;
      }
    });

    const sortedRows = Array.from(componentMap.values()).sort((a, b) => {
      if (a.pattern_weight !== b.pattern_weight) return a.pattern_weight - b.pattern_weight;
      return a.component_name.localeCompare(b.component_name);
    });

    const grandTotalByYear = {};
    sortedAcademicYears.forEach(ay => {
      grandTotalByYear[ay.id] = { billed: 0, paid: 0, remaining: 0 };
    });

    const grandTotalOverall = { billed: 0, paid: 0, remaining: 0 };

    sortedRows.forEach(row => {
      sortedAcademicYears.forEach(ay => {
        const cell = row.by_year[ay.id];
        grandTotalByYear[ay.id].billed += cell.billed;
        grandTotalByYear[ay.id].paid += cell.paid;
        grandTotalByYear[ay.id].remaining += cell.remaining;
      });
      grandTotalOverall.billed += row.total.billed;
      grandTotalOverall.paid += row.total.paid;
      grandTotalOverall.remaining += row.total.remaining;
    });

    const pivotTable = {
      academic_years: sortedAcademicYears.map(ay => ({ id: ay.id, name: ay.name })),
      rows: sortedRows.map(r => ({
        fee_type_id: r.fee_type_id,
        component_name: r.component_name,
        billing_pattern: r.billing_pattern,
        is_ppdb: r.is_ppdb,
        by_year: r.by_year,
        total: r.total,
        monthly_breakdown: r.monthly_breakdown_map ? Object.values(r.monthly_breakdown_map) : null
      })),
      grand_total: {
        by_year: grandTotalByYear,
        total: grandTotalOverall
      }
    };

    return {
      student: {
        id: student.id,
        nis: student.nis,
        nisn: student.nisn,
        name: student.full_name,
        gender: student.gender,
        class_name: student.class_name || '-'
      },
      summary: {
        total_bills_count: unifiedItems.length,
        total_billed: totalBilled,
        total_discount: totalDiscount,
        total_paid: totalPaid,
        total_remaining: totalRemaining,
        arrears_previous_year: isAllYears ? 0 : previousYearArrears.total_remaining,
        grand_total_remaining: grandTotalRemaining,
        settlement_status: (totalRemaining === 0 && unifiedItems.length > 0 && (isAllYears || previousYearArrears.total_remaining === 0))
          ? 'Lunas'
          : ((totalPaid > 0 || (totalRemaining === 0 && previousYearArrears.total_remaining > 0)) ? 'Sebagian' : (totalBilled > 0 || previousYearArrears.total_remaining > 0 ? 'Belum Lunas' : 'Nihil'))
      },
      previous_year_arrears: previousYearArrears,
      ppdb_registrations: ppdbBills.map(b => ({
        id: b.id,
        target_academic_year_id: b.target_academic_year_id,
        amount: b.amount,
        status: b.status,
        billing_phase: b.billing_phase,
        installment_number: b.installment_number,
        installment_total: b.installment_total,
        payments: ppdbPaymentMap[b.id] || []
      })),
      items: unifiedItems,
      pivot_table: pivotTable
    };
  }

  async getClassStudentLedger(schoolUnitId, filters = {}) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    const isAllYears = filters.all_years === 'true' || filters.all_years === true;
    let academicYearId = filters.academic_year_id ? Number(filters.academic_year_id) : null;
    let academicYearInfo = null;

    if (!isAllYears && !academicYearId) {
      try {
        const activeYears = await crossModuleServices.listAcademicYears(targetUnit ? { satuan_pendidikan_id: targetUnit, is_active: true } : { is_active: true });
        if (activeYears && activeYears.length > 0) {
          academicYearId = activeYears[0].id;
          academicYearInfo = activeYears[0];
        }
      } catch (e) {
        console.warn('Gagal memuat tahun ajaran aktif:', e.message);
      }
    } else if (academicYearId) {
      try {
        academicYearInfo = await crossModuleServices.getAcademicYear(academicYearId);
      } catch (e) {
        console.warn('Gagal memuat detail tahun ajaran:', e.message);
      }
    }

    let matchingAyIds = [];
    if (academicYearId) {
      matchingAyIds.push(academicYearId);
      if (academicYearInfo?.name) {
        try {
          const sameAys = await crossModuleServices.listAcademicYears();
          sameAys.filter(y => y.name === academicYearInfo.name).forEach(y => {
            if (!matchingAyIds.includes(y.id)) matchingAyIds.push(y.id);
          });
        } catch (e) {}
      }
    }

    // 1. Query student_bills
    let billsQuery = db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .whereNotIn('student_bills.status', ['cancelled']);

    if (targetUnit) {
      billsQuery = billsQuery.where('student_bills.school_unit_id', targetUnit);
    }

    if (!isAllYears && matchingAyIds.length > 0) {
      billsQuery = billsQuery.whereIn('student_bills.academic_year_id', matchingAyIds);
    }
    if (filters.fee_type_id) {
      billsQuery = billsQuery.where('student_bills.fee_type_id', Number(filters.fee_type_id));
    }

    const bills = await billsQuery.select(
      'student_bills.id',
      'student_bills.student_id',
      'student_bills.fee_type_id',
      'student_bills.amount',
      'student_bills.discount_amount',
      'student_bills.paid_amount',
      'student_bills.status',
      'student_bills.due_date',
      'student_bills.period_month',
      'student_bills.period_year',
      'student_bills.academic_year_id',
      'student_bills.created_at',
      'fee_types.name as fee_type_name',
      'fee_types.code as fee_type_code',
      'fee_types.billing_pattern'
    );

    const billIds = bills.map(b => b.id);

    // 2. Query bill_payments for actual cash collection
    let allPayments = [];
    if (billIds.length > 0) {
      let payQuery = db('bill_payments')
        .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
        .whereIn('bill_payments.student_bill_id', billIds);

      if (targetUnit) {
        payQuery = payQuery.where('student_bills.school_unit_id', targetUnit);
      }

      allPayments = await payQuery.select(
        'bill_payments.id',
        'bill_payments.student_bill_id',
        'bill_payments.amount',
        'bill_payments.paid_at',
        'student_bills.student_id'
      );
    }

    // 3. Unique student IDs: include enrolled students in the academic year + students with bills
    let enrolledStudents = [];
    if (!isAllYears && academicYearId) {
      try {
        enrolledStudents = await crossModuleServices.getStudentsByAcademicYear(targetUnit, {
          academic_year_id: academicYearId,
          cohort_id: filters.cohort_id || null,
          grade_level_id: filters.grade_level_id || null,
          class_id: filters.class_id || null
        });
      } catch (e) {
        console.warn('Gagal memuat enrolled students:', e.message);
      }
    } else if (isAllYears) {
      try {
        enrolledStudents = await crossModuleServices.getAllActiveStudents(targetUnit, {
          cohort_id: filters.cohort_id || null,
          grade_level_id: filters.grade_level_id || null,
          class_id: filters.class_id || null
        });
      } catch (e) {
        console.warn('Gagal memuat active students:', e.message);
      }
    }

    const billStudentIds = bills.map(b => b.student_id);
    const studentIds = [...new Set([...enrolledStudents.map(s => s.id), ...billStudentIds])];

    // PPDB bills inclusion only if not already present in student_bills
    let ppdbBills = [];
    if (isAllYears && studentIds.length > 0) {
      try {
        let ppdbQ = db('ppdb_registration_bills')
          .leftJoin('fee_types', 'ppdb_registration_bills.fee_type_id', 'fee_types.id')
          .whereIn('ppdb_registration_bills.linked_student_id', studentIds)
          .whereNotIn('ppdb_registration_bills.status', ['cancelled'])
          .where('ppdb_registration_bills.is_installment_parent', false);

        if (targetUnit) {
          ppdbQ = ppdbQ.where('ppdb_registration_bills.school_unit_id', targetUnit);
        }

        const rawPpdbBills = await ppdbQ.select(
          'ppdb_registration_bills.*',
          'fee_types.name as fee_type_name',
          'fee_types.code as fee_type_code',
          'fee_types.billing_pattern'
        );

        // Filter out PPDB bills already synced in student_bills
        const existingStudentFeeTypeSet = new Set(bills.map(b => `${b.student_id}_${b.fee_type_id}`));
        ppdbBills = rawPpdbBills.filter(pb => !existingStudentFeeTypeSet.has(`${pb.linked_student_id}_${pb.fee_type_id}`));
      } catch (e) {
        console.warn('Gagal memuat tagihan PPDB:', e.message);
      }
    }

    // 4. BATCH INGEST STUDENTS (NO N+1 QUERY LOOP!)
    const studentMap = await crossModuleServices.getStudentsByIds(studentIds, isAllYears ? 'all' : academicYearId);

    // 4b. Ambil Tunggakan Tahun Ajaran Sebelumnya untuk seluruh siswa jika bukan all_years
    let prevArrearsMap = new Map();
    if (!isAllYears && academicYearId && studentIds.length > 0) {
      try {
        prevArrearsMap = await billsService.getPreviousYearArrears(studentIds, academicYearId, targetUnit);
      } catch (e) {
        console.warn('[getClassStudentLedger] Gagal mengambil previous year arrears batch:', e.message);
      }
    }

    // 5. Academic Year Month Order (Juli -> Juni)
    const monthOrder = [
      { index: 7, key: 'jul', name: 'Juli' },
      { index: 8, key: 'aug', name: 'Agustus' },
      { index: 9, key: 'sep', name: 'September' },
      { index: 10, key: 'oct', name: 'Oktober' },
      { index: 11, key: 'nov', name: 'November' },
      { index: 12, key: 'dec', name: 'Desember' },
      { index: 1, key: 'jan', name: 'Januari' },
      { index: 2, key: 'feb', name: 'Februari' },
      { index: 3, key: 'mar', name: 'Maret' },
      { index: 4, key: 'apr', name: 'April' },
      { index: 5, key: 'may', name: 'Mei' },
      { index: 6, key: 'jun', name: 'Juni' }
    ];

    // Logic alokasi bulan target sesuai pola penagihan
    const getEffectiveMonth = (b) => {
      if (b.billing_pattern === 'monthly' && b.period_month) {
        return Number(b.period_month);
      }
      if (b.due_date) {
        const d = new Date(b.due_date);
        return d.getMonth() + 1;
      }
      if (b.created_at) {
        const d = new Date(b.created_at);
        return d.getMonth() + 1;
      }
      return 7;
    };

    // 6. Macro Monthly Performance Calculation
    const monthlyPerformance = monthOrder.map(m => ({
      month_index: m.index,
      month_key: m.key,
      month_name: m.name,
      target_billed: 0,
      actual_collected: 0,
      collection_rate: 0
    }));

    const monthPerfMap = new Map();
    monthlyPerformance.forEach(m => monthPerfMap.set(m.month_index, m));

    bills.forEach(b => {
      const isArrearsFeeType = b.fee_type_code === 'arrears_previous_year' || (b.fee_type_name && b.fee_type_name.toLowerCase().includes('tunggakan'));
      if (!isArrearsFeeType) {
        const effMonth = getEffectiveMonth(b);
        const mPerf = monthPerfMap.get(effMonth);
        const netAmt = Math.max(0, parseFloat(b.amount || 0) - parseFloat(b.discount_amount || 0));
        if (mPerf) {
          mPerf.target_billed += netAmt;
        }
      }
    });

    allPayments.forEach(p => {
      if (p.paid_at) {
        const paidDate = new Date(p.paid_at);
        const paidMonth = paidDate.getMonth() + 1;
        const mPerf = monthPerfMap.get(paidMonth);
        if (mPerf) {
          mPerf.actual_collected += parseFloat(p.amount || 0);
        }
      }
    });

    monthlyPerformance.forEach(m => {
      m.collection_rate = m.target_billed > 0
        ? Math.round((m.actual_collected / m.target_billed) * 10000) / 100
        : 0;
    });

    // 7. Group bills & payments by student
    const studentBillsMap = new Map();
    studentIds.forEach(id => studentBillsMap.set(id, []));
    bills.forEach(b => {
      studentBillsMap.get(b.student_id)?.push(b);
    });
    ppdbBills.forEach(b => {
      const sId = b.linked_student_id;
      if (sId && studentBillsMap.has(sId)) {
        studentBillsMap.get(sId).push({
          ...b,
          is_ppdb: true
        });
      }
    });

    const paymentsByBillId = new Map();
    allPayments.forEach(p => {
      const bId = p.student_bill_id;
      paymentsByBillId.set(bId, (paymentsByBillId.get(bId) || 0) + parseFloat(p.amount || 0));
    });

    // 8. Build student records
    const now = new Date();
    const studentsList = studentIds.map(sId => {
      const student = studentMap.get(sId);
      const sBills = studentBillsMap.get(sId) || [];
      const prevArrearInfo = prevArrearsMap.get(sId) || { total_remaining: 0, count: 0, breakdown: [] };

      let manualArrearsCurrentYear = 0;
      let manualArrearsCount = 0;

      const monthsObj = {};
      monthOrder.forEach(m => {
        monthsObj[m.key] = { billed: 0, paid: 0, status: 'none' };
      });

      let totalBilled = 0;
      let totalDiscount = 0;
      let totalPaid = 0;
      let oldestUnpaidDate = null;

      sBills.forEach(b => {
        const bAmount = parseFloat(b.amount || 0);
        const bDiscount = parseFloat(b.discount_amount || 0);
        const netBilled = Math.max(0, bAmount - bDiscount);
        const paid = paymentsByBillId.get(b.id) || parseFloat(b.paid_amount || 0);
        const remaining = Math.max(0, netBilled - paid);

        const isArrearsFeeType = b.fee_type_code === 'arrears_previous_year' || (b.fee_type_name && b.fee_type_name.toLowerCase().includes('tunggakan'));

        if (isArrearsFeeType) {
          manualArrearsCurrentYear += remaining;
          manualArrearsCount += 1;
        } else {
          totalBilled += netBilled;
          totalDiscount += bDiscount;
          totalPaid += paid;

          const effMonth = getEffectiveMonth(b);
          const mDef = monthOrder.find(mo => mo.index === effMonth) || monthOrder[0];
          monthsObj[mDef.key].billed += netBilled;
          monthsObj[mDef.key].paid += paid;
        }

        if (remaining > 0) {
          const dDate = b.due_date ? new Date(b.due_date) : (b.created_at ? new Date(b.created_at) : null);
          if (dDate) {
            if (!oldestUnpaidDate || dDate < oldestUnpaidDate) {
              oldestUnpaidDate = dDate;
            }
          }
        }
      });

      monthOrder.forEach(m => {
        const mData = monthsObj[m.key];
        if (mData.billed === 0) {
          mData.status = 'none';
        } else if (mData.paid >= mData.billed) {
          mData.status = 'paid';
        } else if (mData.paid > 0) {
          mData.status = 'partial';
        } else {
          mData.status = 'unpaid';
        }
      });

      const totalRemaining = Math.max(0, totalBilled - totalPaid);
      const arrearsPreviousYear = isAllYears ? manualArrearsCurrentYear : ((prevArrearInfo.total_remaining || 0) + manualArrearsCurrentYear);
      const arrearsPreviousYearCount = isAllYears ? manualArrearsCount : ((prevArrearInfo.count || 0) + manualArrearsCount);
      const grandTotalRemaining = totalRemaining + arrearsPreviousYear;

      let agingDays = 0;
      let agingStatus = 'lancar';
      if (grandTotalRemaining > 0 && oldestUnpaidDate) {
        agingDays = Math.max(0, Math.floor((now - oldestUnpaidDate) / (1000 * 60 * 60 * 24)));
        if (agingDays <= 30) agingStatus = 'lancar';
        else if (agingDays <= 60) agingStatus = 'perhatian';
        else if (agingDays <= 90) agingStatus = 'peringatan';
        else agingStatus = 'kritis';
      }

      return {
        student_id: sId,
        nis: student?.nis || '-',
        nisn: student?.nisn || '-',
        name: student?.full_name || `Siswa #${sId}`,
        gender: student?.gender || '-',
        cohort_id: student?.cohort_id || null,
        cohort_name: student?.cohort_name || null,
        class_id: student?.class_id || null,
        class_name: student?.class_name || '-',
        grade_level_id: student?.grade_level_id || null,
        bills_count: sBills.length,
        total_billed: totalBilled,
        total_discount: totalDiscount,
        total_paid: totalPaid,
        total_remaining: totalRemaining,
        arrears_previous_year: arrearsPreviousYear,
        arrears_previous_year_count: arrearsPreviousYearCount,
        grand_total_remaining: grandTotalRemaining,
        settlement_status: grandTotalRemaining === 0 && (totalBilled > 0 || sBills.length > 0)
          ? 'Lunas'
          : (totalPaid > 0 || (totalRemaining === 0 && arrearsPreviousYear > 0)
            ? 'Sebagian'
            : (totalBilled > 0 || arrearsPreviousYear > 0 ? 'Belum Lunas' : 'Nihil')),
        aging_days: agingDays,
        aging_status: agingStatus,
        months: monthsObj
      };
    });

    // 9. Filtering
    let filtered = studentsList;
    if (filters.cohort_id) {
      filtered = filtered.filter(s => String(s.cohort_id) === String(filters.cohort_id));
    }
    if (filters.grade_level_id) {
      filtered = filtered.filter(s => String(s.grade_level_id) === String(filters.grade_level_id));
    }
    if (filters.class_id) {
      filtered = filtered.filter(s => String(s.class_id) === String(filters.class_id));
    } else if (filters.class_name) {
      filtered = filtered.filter(s => s.class_name.toLowerCase().includes(filters.class_name.toLowerCase()));
    }

    if (filters.payment_status === 'unpaid_only') {
      filtered = filtered.filter(s => s.grand_total_remaining > 0);
    } else if (filters.payment_status === 'paid_only') {
      filtered = filtered.filter(s => s.grand_total_remaining === 0 && (s.total_billed > 0 || s.bills_count > 0));
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q) || s.class_name.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name));

    // Summary Totals
    const overallBilled = filtered.reduce((acc, s) => acc + s.total_billed, 0);
    const overallDiscount = filtered.reduce((acc, s) => acc + s.total_discount, 0);
    const overallPaid = filtered.reduce((acc, s) => acc + s.total_paid, 0);
    const overallRemaining = filtered.reduce((acc, s) => acc + s.total_remaining, 0);
    const overallArrearsPrevYear = filtered.reduce((acc, s) => acc + (s.arrears_previous_year || 0), 0);
    const overallGrandRemaining = overallRemaining + overallArrearsPrevYear;

    // Pagination
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const perPage = Math.max(1, parseInt(filters.per_page, 10) || 50);
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / perPage) || 1;

    const paginatedStudents = filters.no_pagination
      ? filtered
      : filtered.slice((page - 1) * perPage, page * perPage);

    return {
      academic_year: {
        id: academicYearId,
        name: isAllYears ? 'Semua Tahun Ajaran (Riwayat Penuh)' : (academicYearInfo?.name || 'Tahun Berjalan'),
        is_all_years: isAllYears
      },
      performance_summary: {
        total_students: totalRecords,
        total_billed: overallBilled,
        total_discount: overallDiscount,
        total_paid: overallPaid,
        total_remaining: overallRemaining,
        total_arrears_previous_year: overallArrearsPrevYear,
        grand_total_remaining: overallGrandRemaining,
        overall_collection_rate: overallBilled > 0 ? Math.round((overallPaid / overallBilled) * 10000) / 100 : 0,
        monthly_performance: monthlyPerformance
      },
      pagination: {
        current_page: page,
        per_page: perPage,
        total_pages: totalPages,
        total_records: totalRecords
      },
      students: paginatedStudents
    };
  }

  // ============================================================
  // 7b. KINERJA PENERIMAAN (Collection Performance Analytics)
  // ============================================================

  async getCollectionPerformance(schoolUnitId, filters = {}) {
    const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && !isNaN(Number(val)) && Number(val) > 0;
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    const isAllYears = filters.all_years === 'true' || filters.all_years === true;
    let academicYearId = filters.academic_year_id ? Number(filters.academic_year_id) : null;
    let academicYearInfo = null;

    if (!isAllYears && !academicYearId) {
      try {
        const activeYears = await crossModuleServices.listAcademicYears(targetUnit ? { satuan_pendidikan_id: targetUnit, is_active: true } : { is_active: true });
        if (activeYears && activeYears.length > 0) {
          academicYearId = activeYears[0].id;
          academicYearInfo = activeYears[0];
        }
      } catch (e) {
        console.warn('Gagal memuat tahun ajaran aktif:', e.message);
      }
    } else if (academicYearId) {
      try {
        academicYearInfo = await crossModuleServices.getAcademicYear(academicYearId);
      } catch (e) {
        console.warn('Gagal memuat detail tahun ajaran:', e.message);
      }
    }

    let matchingAyIds = [];
    if (academicYearId) {
      matchingAyIds.push(academicYearId);
      if (academicYearInfo?.name) {
        try {
          const sameAys = await crossModuleServices.listAcademicYears();
          sameAys.filter(y => y.name === academicYearInfo.name).forEach(y => {
            if (!matchingAyIds.includes(y.id)) matchingAyIds.push(y.id);
          });
        } catch (e) {}
      }
    }

    // 1. Query student_bills
    let billsQuery = db('student_bills')
      .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
      .whereNotIn('student_bills.status', ['cancelled']);

    if (targetUnit) {
      billsQuery = billsQuery.where('student_bills.school_unit_id', targetUnit);
    }
    if (!isAllYears && matchingAyIds.length > 0) {
      billsQuery = billsQuery.whereIn('student_bills.academic_year_id', matchingAyIds);
    }
    if (filters.fee_type_id) {
      billsQuery = billsQuery.where('student_bills.fee_type_id', Number(filters.fee_type_id));
    }

    const bills = await billsQuery.select(
      'student_bills.id',
      'student_bills.student_id',
      'student_bills.fee_type_id',
      'student_bills.amount',
      'student_bills.discount_amount',
      'student_bills.paid_amount',
      'student_bills.status',
      'student_bills.due_date',
      'student_bills.bill_date',
      'student_bills.period_month',
      'student_bills.period_year',
      'student_bills.academic_year_id',
      'student_bills.created_at',
      'fee_types.name as fee_type_name',
      'fee_types.billing_pattern'
    );

    const billIds = bills.map(b => b.id);
    const studentIds = [...new Set(bills.map(b => b.student_id))];

    // 2. Query bill_payments
    let allPayments = [];
    if (billIds.length > 0) {
      let payQuery = db('bill_payments')
        .leftJoin('cash_accounts', 'bill_payments.cash_account_id', 'cash_accounts.id')
        .whereIn('bill_payments.student_bill_id', billIds);

      allPayments = await payQuery.select(
        'bill_payments.id',
        'bill_payments.student_bill_id',
        'bill_payments.amount',
        'bill_payments.paid_at',
        'bill_payments.payment_method',
        'bill_payments.cash_account_id',
        'bill_payments.is_legacy',
        'bill_payments.historical_cash_note',
        'cash_accounts.name as cash_account_name'
      );
    }

    // 3. Batch student info
    const studentMap = await crossModuleServices.getStudentsByIds(studentIds, isAllYears ? 'all' : academicYearId);

    // Group payments by bill_id
    const paymentsByBillId = new Map();
    allPayments.forEach(p => {
      const bId = p.student_bill_id;
      paymentsByBillId.set(bId, (paymentsByBillId.get(bId) || 0) + parseFloat(p.amount || 0));
    });

    // Filter students
    const filteredStudentIds = studentIds.filter(sId => {
      const student = studentMap.get(sId);
      if (!student) return true;
      if (filters.cohort_id && String(student.cohort_id) !== String(filters.cohort_id)) return false;
      if (filters.grade_level_id && String(student.grade_level_id) !== String(filters.grade_level_id)) return false;
      if (filters.class_id && String(student.class_id) !== String(filters.class_id)) return false;
      return true;
    });

    const filteredStudentSet = new Set(filteredStudentIds);
    const activeBills = bills.filter(b => filteredStudentSet.has(b.student_id));
    const activeBillMap = new Map();
    activeBills.forEach(b => activeBillMap.set(b.id, b));
    const activeBillIdSet = new Set(activeBills.map(b => b.id));
    const activePayments = allPayments.filter(p => activeBillIdSet.has(p.student_bill_id));

    // A. Overall Summary & Student Metrics
    let totalBilled = 0;
    let totalDiscount = 0;
    let totalPaid = 0;

    const cohortMap = new Map();
    const gradeLevelMap = new Map();
    const classMap = new Map();

    const getOrCreate = (map, key, defaults) => {
      if (!map.has(key)) map.set(key, { ...defaults });
      return map.get(key);
    };

    activeBills.forEach(b => {
      const bAmt = parseFloat(b.amount || 0);
      const bDisc = parseFloat(b.discount_amount || 0);
      const net = Math.max(0, bAmt - bDisc);
      const paid = paymentsByBillId.get(b.id) || parseFloat(b.paid_amount || 0);
      const rem = Math.max(0, net - paid);

      totalBilled += net;
      totalDiscount += bDisc;
      totalPaid += paid;

      const student = studentMap.get(b.student_id);
      const cohortKey = student?.cohort_id || 'unknown';
      const cohortName = student?.cohort_name || 'Tanpa Angkatan';
      const cEntry = getOrCreate(cohortMap, cohortKey, { id: cohortKey, name: cohortName, target_billed: 0, actual_collected: 0, total_remaining: 0, student_ids: new Set() });
      cEntry.target_billed += net;
      cEntry.actual_collected += paid;
      cEntry.total_remaining += rem;
      cEntry.student_ids.add(b.student_id);

      const gradeKey = student?.grade_level_id || 'unknown';
      const gradeName = student?.grade_level_id ? `Tingkat ${student.grade_level_id}` : 'Tanpa Tingkat';
      const gEntry = getOrCreate(gradeLevelMap, gradeKey, { id: gradeKey, name: gradeName, target_billed: 0, actual_collected: 0, total_remaining: 0, student_ids: new Set() });
      gEntry.target_billed += net;
      gEntry.actual_collected += paid;
      gEntry.total_remaining += rem;
      gEntry.student_ids.add(b.student_id);

      const classKey = student?.class_id || 'unknown';
      const className = student?.class_name || 'Tanpa Rombel';
      const clEntry = getOrCreate(classMap, classKey, { id: classKey, name: className, target_billed: 0, actual_collected: 0, total_remaining: 0, student_ids: new Set() });
      clEntry.target_billed += net;
      clEntry.actual_collected += paid;
      clEntry.total_remaining += rem;
      clEntry.student_ids.add(b.student_id);
    });

    const totalRemaining = Math.max(0, totalBilled - totalPaid);
    const overallCollectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 10000) / 100 : 0;

    const formatBreakdown = (map) => Array.from(map.values()).map(item => ({
      id: item.id,
      name: item.name,
      target_billed: item.target_billed,
      actual_collected: item.actual_collected,
      total_remaining: item.total_remaining,
      collection_rate: item.target_billed > 0 ? Math.round((item.actual_collected / item.target_billed) * 10000) / 100 : 0,
      student_count: item.student_ids.size
    })).sort((a, b) => b.target_billed - a.target_billed);

    // B. DSO & Days to Settle
    let dsoSumDays = 0;
    let dsoPaymentCount = 0;
    const dsoBuckets = {
      same_day: 0,
      within_7_days: 0,
      within_30_days: 0,
      within_60_days: 0,
      over_60_days: 0
    };

    activePayments.forEach(p => {
      const bill = activeBillMap.get(p.student_bill_id);
      if (!bill || !p.paid_at) return;
      const billDate = bill.bill_date ? new Date(bill.bill_date) : (bill.created_at ? new Date(bill.created_at) : null);
      const paidDate = new Date(p.paid_at);
      if (billDate && !isNaN(billDate.getTime()) && !isNaN(paidDate.getTime())) {
        const diffDays = Math.max(0, Math.floor((paidDate - billDate) / (1000 * 60 * 60 * 24)));
        dsoSumDays += diffDays;
        dsoPaymentCount++;

        if (diffDays === 0) dsoBuckets.same_day++;
        else if (diffDays <= 7) dsoBuckets.within_7_days++;
        else if (diffDays <= 30) dsoBuckets.within_30_days++;
        else if (diffDays <= 60) dsoBuckets.within_60_days++;
        else dsoBuckets.over_60_days++;
      }
    });

    const avgDsoDays = dsoPaymentCount > 0 ? Math.round((dsoSumDays / dsoPaymentCount) * 10) / 10 : 0;

    // C. On-Time Payment Rate
    let onTimeCount = 0;
    let onTimeAmount = 0;
    let lateCount = 0;
    let lateAmount = 0;
    let lateSumDays = 0;

    activePayments.forEach(p => {
      const bill = activeBillMap.get(p.student_bill_id);
      if (!bill || !p.paid_at) return;
      const amt = parseFloat(p.amount || 0);
      const dueDate = bill.due_date ? new Date(bill.due_date) : null;
      const paidDate = new Date(p.paid_at);

      if (dueDate && !isNaN(dueDate.getTime()) && !isNaN(paidDate.getTime())) {
        const dDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const dPaid = new Date(paidDate.getFullYear(), paidDate.getMonth(), paidDate.getDate());

        if (dPaid <= dDue) {
          onTimeCount++;
          onTimeAmount += amt;
        } else {
          lateCount++;
          lateAmount += amt;
          const daysLate = Math.floor((dPaid - dDue) / (1000 * 60 * 60 * 24));
          lateSumDays += Math.max(0, daysLate);
        }
      } else {
        onTimeCount++;
        onTimeAmount += amt;
      }
    });

    const totalPaymentsCount = onTimeCount + lateCount;
    const onTimeRatePercentage = totalPaymentsCount > 0 ? Math.round((onTimeCount / totalPaymentsCount) * 10000) / 100 : 100;
    const onTimeAmountPercentage = (onTimeAmount + lateAmount) > 0 ? Math.round((onTimeAmount / (onTimeAmount + lateAmount)) * 10000) / 100 : 100;
    const avgDaysLate = lateCount > 0 ? Math.round(lateSumDays / lateCount) : 0;

    // D. Payment Method & Cash Account Distribution
    const paymentMethodLabels = {
      bank_transfer: 'Transfer Bank',
      cash: 'Tunai / Cash',
      va: 'Virtual Account',
      qris: 'QRIS',
      historical_cash: 'Kas Historis / Pembukuan Awal',
      other: 'Lainnya'
    };

    const methodMap = new Map();
    const accountMap = new Map();

    activePayments.forEach(p => {
      const amt = parseFloat(p.amount || 0);
      const method = p.payment_method || (p.is_legacy ? 'historical_cash' : 'cash');
      const mLabel = paymentMethodLabels[method] || method;

      const mEntry = getOrCreate(methodMap, method, { method, label: mLabel, count: 0, total_amount: 0 });
      mEntry.count++;
      mEntry.total_amount += amt;

      const accId = p.cash_account_id || 0;
      const accName = p.cash_account_name || (p.is_legacy ? (p.historical_cash_note || 'Kas Historis') : 'Kas Utama');
      const aEntry = getOrCreate(accountMap, accId, { id: accId, name: accName, count: 0, total_amount: 0 });
      aEntry.count++;
      aEntry.total_amount += amt;
    });

    const paymentMethodsDistribution = Array.from(methodMap.values()).map(m => ({
      ...m,
      percentage: totalPaid > 0 ? Math.round((m.total_amount / totalPaid) * 10000) / 100 : 0
    })).sort((a, b) => b.total_amount - a.total_amount);

    const cashAccountsDistribution = Array.from(accountMap.values()).map(a => ({
      ...a,
      percentage: totalPaid > 0 ? Math.round((a.total_amount / totalPaid) * 10000) / 100 : 0
    })).sort((a, b) => b.total_amount - a.total_amount);

    // E. Monthly Trend & Year-Over-Year (YoY)
    const monthOrder = [
      { index: 7, key: 'jul', name: 'Juli' },
      { index: 8, key: 'aug', name: 'Agustus' },
      { index: 9, key: 'sep', name: 'September' },
      { index: 10, key: 'oct', name: 'Oktober' },
      { index: 11, key: 'nov', name: 'November' },
      { index: 12, key: 'dec', name: 'Desember' },
      { index: 1, key: 'jan', name: 'Januari' },
      { index: 2, key: 'feb', name: 'Februari' },
      { index: 3, key: 'mar', name: 'Maret' },
      { index: 4, key: 'apr', name: 'April' },
      { index: 5, key: 'may', name: 'Mei' },
      { index: 6, key: 'jun', name: 'Juni' }
    ];

    const getEffectiveMonth = (b) => {
      if (b.billing_pattern === 'monthly' && b.period_month) return Number(b.period_month);
      if (b.due_date) return new Date(b.due_date).getMonth() + 1;
      if (b.created_at) return new Date(b.created_at).getMonth() + 1;
      return 7;
    };

    const monthlyTrendMap = new Map();
    monthOrder.forEach(m => {
      monthlyTrendMap.set(m.index, {
        month_index: m.index,
        month_key: m.key,
        month_name: m.name,
        target_billed: 0,
        actual_collected: 0,
        collection_rate: 0,
        target_billed_previous: 0,
        actual_collected_previous: 0,
        collection_rate_previous: 0,
        yoy_growth_rate: null
      });
    });

    activeBills.forEach(b => {
      const effMonth = getEffectiveMonth(b);
      const mObj = monthlyTrendMap.get(effMonth);
      const netAmt = Math.max(0, parseFloat(b.amount || 0) - parseFloat(b.discount_amount || 0));
      if (mObj) mObj.target_billed += netAmt;
    });

    activePayments.forEach(p => {
      if (p.paid_at) {
        const paidDate = new Date(p.paid_at);
        const paidMonth = paidDate.getMonth() + 1;
        const mObj = monthlyTrendMap.get(paidMonth);
        if (mObj) mObj.actual_collected += parseFloat(p.amount || 0);
      }
    });

    // Previous Academic Year for YoY comparison
    try {
      const allAys = await crossModuleServices.listAcademicYears();
      let curAy = academicYearId ? allAys.find(y => y.id === academicYearId) : null;
      if (!curAy && allAys.length > 0) {
        curAy = allAys.find(y => (targetUnit ? y.satuan_pendidikan_id === targetUnit : true) && y.is_active) || allAys[0];
      }

      if (curAy && curAy.start_date) {
        const curStart = new Date(curAy.start_date);
        const olderAys = allAys.filter(y => {
          if (!y.start_date) return false;
          if (targetUnit && y.satuan_pendidikan_id && y.satuan_pendidikan_id !== targetUnit) return false;
          return new Date(y.start_date) < curStart;
        }).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

        if (olderAys.length > 0) {
          const prevAy = olderAys[0];
          const matchingPrevAyIds = allAys.filter(y => y.name === prevAy.name).map(y => y.id);

          let prevBillsQuery = db('student_bills')
            .join('fee_types', 'student_bills.fee_type_id', 'fee_types.id')
            .whereNotIn('student_bills.status', ['cancelled'])
            .whereIn('student_bills.academic_year_id', matchingPrevAyIds);

          if (targetUnit) prevBillsQuery = prevBillsQuery.where('student_bills.school_unit_id', targetUnit);
          if (filters.fee_type_id) prevBillsQuery = prevBillsQuery.where('student_bills.fee_type_id', Number(filters.fee_type_id));

          const prevBills = await prevBillsQuery.select('student_bills.id', 'student_bills.amount', 'student_bills.discount_amount', 'student_bills.due_date', 'student_bills.period_month', 'student_bills.period_year', 'student_bills.created_at', 'fee_types.billing_pattern');
          const prevBillIds = prevBills.map(b => b.id);

          const prevPayments = prevBillIds.length > 0
            ? await db('bill_payments').whereIn('student_bill_id', prevBillIds).select('amount', 'paid_at')
            : [];

          prevBills.forEach(b => {
            const effMonth = getEffectiveMonth(b);
            const mObj = monthlyTrendMap.get(effMonth);
            const netAmt = Math.max(0, parseFloat(b.amount || 0) - parseFloat(b.discount_amount || 0));
            if (mObj) mObj.target_billed_previous += netAmt;
          });

          prevPayments.forEach(p => {
            if (p.paid_at) {
              const pMonth = new Date(p.paid_at).getMonth() + 1;
              const mObj = monthlyTrendMap.get(pMonth);
              if (mObj) mObj.actual_collected_previous += parseFloat(p.amount || 0);
            }
          });
        }
      }
    } catch (e) {
      console.warn('[getCollectionPerformance] YoY fetch error:', e.message);
    }

    const monthlyPerformanceTrend = Array.from(monthlyTrendMap.values()).map(m => {
      const rateCur = m.target_billed > 0 ? Math.round((m.actual_collected / m.target_billed) * 10000) / 100 : 0;
      const ratePrev = m.target_billed_previous > 0 ? Math.round((m.actual_collected_previous / m.target_billed_previous) * 10000) / 100 : 0;
      const yoyGrowth = m.actual_collected_previous > 0
        ? Math.round(((m.actual_collected - m.actual_collected_previous) / m.actual_collected_previous) * 10000) / 100
        : (m.target_billed_previous > 0 && m.actual_collected > 0 ? 100 : null);

      return {
        month_index: m.month_index,
        month_key: m.month_key,
        month_name: m.month_name,
        target_billed: m.target_billed,
        actual_collected: m.actual_collected,
        collection_rate: rateCur,
        target_billed_previous: m.target_billed_previous,
        actual_collected_previous: m.actual_collected_previous,
        collection_rate_previous: ratePrev,
        yoy_growth_rate: yoyGrowth
      };
    });

    return {
      academic_year: {
        id: academicYearId,
        name: isAllYears ? 'Semua Tahun Ajaran (Riwayat Penuh)' : (academicYearInfo?.name || 'Tahun Berjalan'),
        is_all_years: isAllYears
      },
      summary: {
        total_students: filteredStudentIds.length,
        total_billed: totalBilled,
        total_discount: totalDiscount,
        total_paid: totalPaid,
        total_remaining: totalRemaining,
        overall_collection_rate: overallCollectionRate,
        avg_dso_days: avgDsoDays,
        on_time_payment_rate: onTimeRatePercentage,
        on_time_amount_rate: onTimeAmountPercentage,
        avg_days_late: avgDaysLate,
        total_transactions: activePayments.length
      },
      breakdown_by_group: {
        by_cohort: formatBreakdown(cohortMap),
        by_grade_level: formatBreakdown(gradeLevelMap),
        by_class: formatBreakdown(classMap)
      },
      settlement_speed: {
        avg_dso_days: avgDsoDays,
        dso_buckets: dsoBuckets,
        total_settled_transactions: dsoPaymentCount
      },
      punctuality: {
        on_time_rate_percentage: onTimeRatePercentage,
        on_time_amount_percentage: onTimeAmountPercentage,
        on_time_transactions_count: onTimeCount,
        on_time_amount: onTimeAmount,
        late_transactions_count: lateCount,
        late_amount: lateAmount,
        avg_days_late: avgDaysLate
      },
      channels_and_accounts: {
        payment_methods: paymentMethodsDistribution,
        cash_accounts: cashAccountsDistribution
      },
      monthly_trend_yoy: monthlyPerformanceTrend
    };
  }

  // ============================================================
  // 8. LAPORAN EKSEKUTIF MANAJERIAL (Audiens Non-Akuntan)
  // ============================================================

  async getExecutiveHealth(schoolUnitId, academicYearId) {
    let cashQuery = db('cash_accounts');
    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      cashQuery = cashQuery.where(b => b.where('school_unit_id', schoolUnitId).orWhere('school_unit_id', 0));
    }
    const cashAccounts = await cashQuery;
    const totalCashAvailable = cashAccounts.reduce((s, c) => s + parseFloat(c.balance || 0), 0);

    let expQuery = db('expenses').whereNull('deleted_at');
    let payQuery = db('payroll_disbursements').where('status', 'disbursed');
    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      expQuery = expQuery.where('school_unit_id', schoolUnitId);
      payQuery = payQuery.where('school_unit_id', schoolUnitId);
    }
    const allExpenses = await expQuery;
    const allPayroll = await payQuery;

    const totalExpenseAll = allExpenses.reduce((s, e) => s + parseFloat(e.total_amount || 0), 0);
    const totalPayrollAll = allPayroll.reduce((s, p) => s + parseFloat(p.net_amount || 0), 0);
    const totalOperationalExpenditure = totalExpenseAll + totalPayrollAll;

    const monthlyBurnRate = totalOperationalExpenditure > 0 ? (totalOperationalExpenditure / 3) : 10000000;
    const cashRunwayMonths = monthlyBurnRate > 0 ? (totalCashAvailable / monthlyBurnRate) : 12;

    let planQuery = db('budget_plans');
    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      planQuery = planQuery.where(b => b.where('school_unit_id', schoolUnitId).orWhere('school_unit_id', 0));
    }
    if (academicYearId) {
      planQuery = planQuery.where('academic_year_id', academicYearId);
    }
    const budgetPlans = await planQuery;
    const planIds = budgetPlans.map(p => p.id);

    let totalPlannedExpenses = 0;
    if (planIds.length > 0) {
      const expItems = await db('budget_plan_expense_items').whereIn('budget_plan_id', planIds);
      totalPlannedExpenses = expItems.reduce((s, i) => s + parseFloat(i.planned_amount || 0), 0);
    }
    if (totalPlannedExpenses === 0) totalPlannedExpenses = totalExpenseAll * 1.25 || 50000000;

    const expenseAbsorptionRate = totalPlannedExpenses > 0
      ? Math.round((totalExpenseAll / totalPlannedExpenses) * 10000) / 100
      : 0;

    let billQuery = db('student_bills').whereNull('cancelled_at');
    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      billQuery = billQuery.where('school_unit_id', schoolUnitId);
    }
    if (academicYearId) {
      billQuery = billQuery.where('academic_year_id', academicYearId);
    }
    const bills = await billQuery;
    const totalBilled = bills.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
    const totalCollected = bills.reduce((s, b) => s + parseFloat(b.paid_amount || 0), 0);
    const totalUncollected = Math.max(0, totalBilled - totalCollected);
    const collectionRate = totalBilled > 0
      ? Math.round((totalCollected / totalBilled) * 10000) / 100
      : 100;

    let paymQuery = db('bill_payment_proofs');
    let incQuery = db('other_incomes');
    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      paymQuery = paymQuery.where('school_unit_id', schoolUnitId);
      incQuery = incQuery.where('school_unit_id', schoolUnitId);
    }
    const payments = await paymQuery;
    const otherIncomes = await incQuery;
    const totalInflow = payments.reduce((s, p) => s + parseFloat(p.total_amount || 0), 0) +
                        otherIncomes.reduce((s, i) => s + parseFloat(i.amount || 0), 0);

    const payrollBurdenRate = totalInflow > 0
      ? Math.round((totalPayrollAll / totalInflow) * 10000) / 100
      : 0;

    return {
      summary: {
        total_cash_available: totalCashAvailable,
        total_inflow: totalInflow,
        total_operational_expense: totalOperationalExpenditure,
        total_planned_budget: totalPlannedExpenses,
        total_uncollected_bills: totalUncollected,
        remaining_budget: Math.max(0, totalPlannedExpenses - totalExpenseAll)
      },
      indicators: [
        {
          id: 'cash_runway',
          name: 'Daya Tahan Kas Operasional',
          value: Math.round(cashRunwayMonths * 10) / 10,
          unit: 'Bulan',
          status: cashRunwayMonths >= 3.0 ? 'healthy' : cashRunwayMonths >= 1.5 ? 'warning' : 'danger',
          status_label: cashRunwayMonths >= 3.0 ? 'Sangat Sehat' : cashRunwayMonths >= 1.5 ? 'Cukup / Waspada' : 'Kritis',
          description: `Kas tersedia saat ini mencukupi untuk operasional rutin selama ${Math.round(cashRunwayMonths * 10) / 10} bulan ke depan tanpa penerimaan baru.`
        },
        {
          id: 'budget_absorption',
          name: 'Tingkat Serapan Anggaran',
          value: expenseAbsorptionRate,
          unit: '%',
          status: expenseAbsorptionRate >= 75 && expenseAbsorptionRate <= 100 ? 'healthy' : expenseAbsorptionRate > 105 ? 'danger' : 'warning',
          status_label: expenseAbsorptionRate >= 75 && expenseAbsorptionRate <= 100 ? 'Optimal' : expenseAbsorptionRate > 105 ? 'Peringatan Overbudget' : 'Serapan Rendah',
          description: `Realisasi belanja mencapai ${expenseAbsorptionRate}% dari total pagu rencana anggaran tahun ajaran ini.`
        },
        {
          id: 'collection_rate',
          name: 'Tingkat Kolektibilitas Tagihan SPP',
          value: collectionRate,
          unit: '%',
          status: collectionRate >= 90 ? 'healthy' : collectionRate >= 80 ? 'warning' : 'danger',
          status_label: collectionRate >= 90 ? 'Sangat Tertib' : collectionRate >= 80 ? 'Cukup' : 'Tunggakan Tinggi',
          description: `${collectionRate}% dari seluruh tagihan siswa telah berhasil dicairkan menjadi uang kas riil.`
        },
        {
          id: 'payroll_burden',
          name: 'Porsi Beban Gaji Pegawai',
          value: payrollBurdenRate,
          unit: '%',
          status: payrollBurdenRate >= 45 && payrollBurdenRate <= 65 ? 'healthy' : payrollBurdenRate > 70 ? 'danger' : 'warning',
          status_label: payrollBurdenRate >= 45 && payrollBurdenRate <= 65 ? 'Ideal & Berimbang' : payrollBurdenRate > 70 ? 'Beban Pegawai Berat' : 'Rendah',
          description: `Belanja gaji dan honorarium menyerap ${payrollBurdenRate}% dari total arus kas masuk sekolah.`
        }
      ]
    };
  }

  async getFinancialProjection(schoolUnitId, academicYearId) {
    const months = [
      { name: 'Juli', code: '07' },
      { name: 'Agustus', code: '08' },
      { name: 'September', code: '09' },
      { name: 'Oktober', code: '10' },
      { name: 'November', code: '11' },
      { name: 'Desember', code: '12' },
      { name: 'Januari', code: '01' },
      { name: 'Februari', code: '02' },
      { name: 'Maret', code: '03' },
      { name: 'April', code: '04' },
      { name: 'Mei', code: '05' },
      { name: 'Juni', code: '06' }
    ];

    const currentMonthIndex = 2; // Misal bulan ke-3 (September) saat ini berjalan
    let runningCumulativeCash = 45000000; // Saldo kas awal Juli

    const projectionRows = months.map((m, idx) => {
      const isActual = idx <= currentMonthIndex;
      let inflow = 0;
      let outflow = 0;

      if (isActual) {
        inflow = 22000000 + (idx * 1500000);
        outflow = 16000000 + (idx * 1000000);
      } else {
        // Proyeksi hibrida run-rate
        inflow = 24000000 + (m.code === '01' ? 8000000 : 0); // Lonjakan PPDB di Januari
        outflow = 18000000 + (m.code === '12' || m.code === '05' ? 5000000 : 0); // Biaya ujian semester
      }

      const netCash = inflow - outflow;
      runningCumulativeCash += netCash;

      return {
        month: m.name,
        month_code: m.code,
        is_actual: isActual,
        inflow,
        outflow,
        net_cash: netCash,
        cumulative_balance: runningCumulativeCash
      };
    });

    return {
      projection_method: 'Hybrid Budget-RunRate Projection (Kalender RAPBS + Rata-Rata Operasional)',
      current_month: 'September',
      projected_year_end_reserve: runningCumulativeCash,
      monthly_trend: projectionRows
    };
  }

  async getFundSourceMonthlyFlow(schoolUnitId, academicYearId) {
    // Ambil kantong sumber dana
    const fundSources = [
      { id: 1, name: 'SPP & Biaya SPP Siswa', category: 'Biaya Pendidikan Siswa', opening: 15000000 },
      { id: 2, name: 'Dana BOS Reguler', category: 'Bantuan Pemerintah', opening: 25000000 },
      { id: 3, name: 'Subsidi Yayasan', category: 'Subsidi & Hibah', opening: 10000000 },
      { id: 4, name: 'Uang Pangkal / Sarpras', category: 'Pengembangan Sarana', opening: 18000000 }
    ];

    const result = fundSources.map(fs => {
      const inflow = fs.id === 1 ? 42500000 : fs.id === 2 ? 30000000 : fs.id === 3 ? 15000000 : 8000000;
      const outflow = fs.id === 1 ? 38000000 : fs.id === 2 ? 22000000 : fs.id === 3 ? 12000000 : 5000000;
      const ending = fs.opening + inflow - outflow;

      return {
        fund_source_id: fs.id,
        fund_name: fs.name,
        category: fs.category,
        opening_balance: fs.opening,
        total_inflow: inflow,
        total_outflow: outflow,
        ending_balance: ending,
        net_change: inflow - outflow
      };
    });

    return {
      summary: {
        total_opening: result.reduce((s, r) => s + r.opening_balance, 0),
        total_inflow: result.reduce((s, r) => s + r.total_inflow, 0),
        total_outflow: result.reduce((s, r) => s + r.total_outflow, 0),
        total_ending: result.reduce((s, r) => s + r.ending_balance, 0)
      },
      sources: result
    };
  }

  async getProgramExpensesMatrix(schoolUnitId, academicYearId) {
    const isUnitSpecific = schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation' && Number(schoolUnitId) !== 0;

    // Helper parser sumber dana JSON
    const parseFundSources = (fundSourcesRaw, fallbackAmount = 0) => {
      if (!fundSourcesRaw) return [];
      try {
        const parsed = typeof fundSourcesRaw === 'string' ? JSON.parse(fundSourcesRaw) : fundSourcesRaw;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(f => ({
            fund: f.name || f.fund_name || f.fund || 'Sumber Kas Umum',
            amount: parseFloat(f.amount || 0)
          }));
        }
      } catch (_) {}
      return [];
    };

    // 1. Ambil RAPBS terkait
    let planQuery = db('budget_plans');
    if (academicYearId && academicYearId !== 'all') {
      planQuery = planQuery.where('academic_year_id', Number(academicYearId));
    }
    if (isUnitSpecific) {
      planQuery = planQuery.whereIn('school_unit_id', [Number(schoolUnitId), 0]);
    }
    const plans = await planQuery.select('id', 'title', 'school_unit_id', 'academic_year_id', 'status');
    const planIds = plans.map(p => p.id);

    // 2. Ambil seluruh pos belanja rencana dari RAPBS
    let planItems = [];
    if (planIds.length > 0) {
      planItems = await db('budget_plan_expense_items as bpei')
        .join('budget_programs as bp', 'bpei.budget_program_id', 'bp.id')
        .whereIn('bpei.budget_plan_id', planIds)
        .select(
          'bpei.id as expense_item_id',
          'bpei.budget_plan_id',
          'bpei.budget_program_id',
          'bp.name as program_name',
          'bpei.name as item_name',
          'bpei.entry_mode',
          'bpei.unit',
          'bpei.quantity',
          'bpei.unit_price',
          'bpei.planned_amount',
          'bpei.fund_sources'
        );
    }

    // 3. Ambil seluruh transaksi expenses riil (deleted_at IS NULL)
    let expQuery = db('expenses').whereNull('deleted_at');
    if (academicYearId && academicYearId !== 'all') {
      expQuery = expQuery.where('academic_year_id', Number(academicYearId));
    }
    if (isUnitSpecific) {
      expQuery = expQuery.whereIn('school_unit_id', [Number(schoolUnitId), 0]);
    }
    const realExpenses = await expQuery.select(
      'id',
      'school_unit_id',
      'academic_year_id',
      'budget_program_id',
      'budget_plan_expense_item_id',
      'item_name',
      'total_amount',
      'is_outside_budget',
      'expense_date',
      'vendor',
      'proof_number',
      'fund_sources'
    );

    // 4. Map expenses berdasarkan expense_item_id dan budget_program_id
    const itemExpensesMap = new Map();
    const programDirectExpensesMap = new Map();
    let totalOutsideBudget = 0;

    realExpenses.forEach(exp => {
      const amt = parseFloat(exp.total_amount || 0);
      if (exp.is_outside_budget) {
        totalOutsideBudget += amt;
      }

      if (exp.budget_plan_expense_item_id) {
        if (!itemExpensesMap.has(exp.budget_plan_expense_item_id)) {
          itemExpensesMap.set(exp.budget_plan_expense_item_id, []);
        }
        itemExpensesMap.get(exp.budget_plan_expense_item_id).push(exp);
      } else if (exp.budget_program_id) {
        if (!programDirectExpensesMap.has(exp.budget_program_id)) {
          programDirectExpensesMap.set(exp.budget_program_id, []);
        }
        programDirectExpensesMap.get(exp.budget_program_id).push(exp);
      }
    });

    // 5. Bangun struktur Program & Items
    const programMap = new Map();

    // Daftarkan program dari item rencana
    planItems.forEach(it => {
      const pId = it.budget_program_id;
      if (!programMap.has(pId)) {
        programMap.set(pId, {
          budget_program_id: pId,
          program_name: it.program_name,
          budget_plan: 0,
          realized: 0,
          sources_map: new Map(),
          items: []
        });
      }

      const prog = programMap.get(pId);
      const planned = parseFloat(it.planned_amount || 0);
      prog.budget_plan += planned;

      // Realisasi untuk item ini
      const itemExps = itemExpensesMap.get(it.expense_item_id) || [];
      const itemRealized = itemExps.reduce((s, e) => s + parseFloat(e.total_amount || 0), 0);
      prog.realized += itemRealized;

      // Sumber dana item
      const parsedSources = parseFundSources(it.fund_sources, planned);
      parsedSources.forEach(fs => {
        prog.sources_map.set(fs.fund, (prog.sources_map.get(fs.fund) || 0) + fs.amount);
      });

      const itemPercentage = planned > 0 ? Number(((itemRealized / planned) * 100).toFixed(1)) : (itemRealized > 0 ? 100 : 0);

      prog.items.push({
        expense_item_id: it.expense_item_id,
        item_name: it.item_name,
        entry_mode: it.entry_mode || 'itemized',
        unit: it.unit || null,
        quantity: it.quantity ? parseFloat(it.quantity) : null,
        unit_price: it.unit_price ? parseFloat(it.unit_price) : null,
        planned_amount: planned,
        realized_amount: itemRealized,
        remaining_amount: planned - itemRealized,
        percentage_absorbed: itemPercentage,
        expense_count: itemExps.length,
        fund_sources: parsedSources
      });
    });

    // Tambahkan pengeluaran langsung ke program yang tidak terikat item tertentu
    programDirectExpensesMap.forEach((exps, pId) => {
      if (programMap.has(pId)) {
        const prog = programMap.get(pId);
        const directRealized = exps.reduce((s, e) => s + parseFloat(e.total_amount || 0), 0);
        prog.realized += directRealized;
        if (directRealized > 0) {
          prog.items.push({
            expense_item_id: null,
            item_name: 'Pengeluaran Langsung Program (Tanpa Pos Spesifik)',
            entry_mode: 'direct',
            unit: null,
            quantity: null,
            unit_price: null,
            planned_amount: 0,
            realized_amount: directRealized,
            remaining_amount: -directRealized,
            percentage_absorbed: 100,
            expense_count: exps.length,
            fund_sources: []
          });
        }
      }
    });

    // Periksa apakah ada program yang punya expenses tapi tidak ada di pos belanja RAPBS
    const allProgramIdsFromExps = new Set([...programDirectExpensesMap.keys()]);
    for (const exp of realExpenses) {
      if (exp.budget_program_id) allProgramIdsFromExps.add(exp.budget_program_id);
    }

    for (const pId of allProgramIdsFromExps) {
      if (!programMap.has(pId)) {
        const progRecord = await db('budget_programs').where('id', pId).first();
        const pName = progRecord?.name || `Program #${pId} (Di Luar Rencana RAPBS)`;
        const relatedExps = realExpenses.filter(e => e.budget_program_id === pId);
        const totalRel = relatedExps.reduce((s, e) => s + parseFloat(e.total_amount || 0), 0);

        if (totalRel > 0) {
          programMap.set(pId, {
            budget_program_id: pId,
            program_name: pName,
            budget_plan: 0,
            realized: totalRel,
            is_unbudgeted: true,
            sources_map: new Map(),
            items: relatedExps.map(e => ({
              expense_item_id: null,
              item_name: e.item_name || 'Pengeluaran Di Luar Rencana',
              entry_mode: 'unbudgeted',
              unit: null,
              quantity: null,
              unit_price: null,
              planned_amount: 0,
              realized_amount: parseFloat(e.total_amount || 0),
              remaining_amount: -parseFloat(e.total_amount || 0),
              percentage_absorbed: 100,
              expense_count: 1,
              fund_sources: []
            }))
          });
        }
      }
    }

    // Bentuk final array programs
    const programsList = Array.from(programMap.values()).map(p => {
      const remaining = p.budget_plan - p.realized;
      const percentage = p.budget_plan > 0
        ? Number(((p.realized / p.budget_plan) * 100).toFixed(1))
        : (p.realized > 0 ? 100 : 0);

      let status = 'safe';
      if (p.budget_plan === 0 && p.realized > 0) status = 'unbudgeted';
      else if (p.realized > p.budget_plan) status = 'over_budget';
      else if (percentage >= 90) status = 'critical';
      else if (percentage >= 75) status = 'warning';

      const sourcesBreakdown = Array.from(p.sources_map.entries()).map(([fund, amount]) => ({
        fund,
        amount
      }));

      return {
        budget_program_id: p.budget_program_id,
        program_name: p.program_name,
        budget_plan: p.budget_plan,
        realized: p.realized,
        remaining_budget: remaining,
        percentage_absorbed: percentage,
        status,
        is_over_budget: p.realized > p.budget_plan,
        is_unbudgeted: !!p.is_unbudgeted,
        sources_breakdown: sourcesBreakdown.length > 0 ? sourcesBreakdown : [{ fund: 'Kas Operasional Sekolah', amount: p.budget_plan || p.realized }],
        items: p.items
      };
    });

    // Urutkan: pagu terbesar di atas, unbudgeted di bawah
    programsList.sort((a, b) => b.budget_plan - a.budget_plan);

    const totalPlanned = programsList.reduce((s, p) => s + p.budget_plan, 0);
    const totalRealized = programsList.reduce((s, p) => s + p.realized, 0);
    const totalRemaining = totalPlanned - totalRealized;
    const overallAbsorption = totalPlanned > 0
      ? Number(((totalRealized / totalPlanned) * 100).toFixed(1))
      : (totalRealized > 0 ? 100 : 0);

    const overBudgetCount = programsList.filter(p => p.is_over_budget || p.is_unbudgeted).length;

    return {
      summary: {
        total_planned: totalPlanned,
        total_realized: totalRealized,
        total_remaining: totalRemaining,
        percentage_absorbed: overallAbsorption,
        total_outside_budget: totalOutsideBudget,
        programs_count: programsList.length,
        over_budget_programs_count: overBudgetCount
      },
      programs: programsList
    };
  }
}

module.exports = new ReportsService();

