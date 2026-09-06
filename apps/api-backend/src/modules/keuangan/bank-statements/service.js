/**
 * Bank Statements (Rekening Koran) Service for Keuangan Module
 * 
 * Strict Accounting Principle:
 * Rekening Koran is a ONE-WAY REFERENCE (shadow statement) for bank reconciliation.
 * It NEVER triggers recordJournal() and NEVER mutates fund_balances or live cash accounts.
 */
const db = require('../../../config/db/keuangan');
const dbAkademik = require('../../../config/db/akademik');
const XLSX = require('xlsx');
const { logFinanceAudit } = require('../common/auditLogService');

function formatDateOnly(d) {
  if (!d) return null;
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(d).slice(0, 10);
}

function formatTimeOnly(d) {
  if (!d) return null;
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt.getTime())) return null;
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  if (hh === '00' && mm === '00' && ss === '00') return null;
  return `${hh}:${mm}:${ss}`;
}

function parseMoney(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.abs(val);
  let str = String(val).trim().replace(/^Rp\.?\s*/i, '');
  if (!str) return 0;
  
  // Indonesian format with decimals: e.g. "15.300.000,50"
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(str)) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  // English format with decimals: e.g. "15,300,000.50"
  else if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(str)) {
    str = str.replace(/,/g, '');
  }
  // Indonesian dot thousands: e.g. "15.300.000"
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  }
  // English comma thousands: e.g. "15,300,000"
  else if (/^\d{1,3}(?:,\d{3})+$/.test(str)) {
    str = str.replace(/,/g, '');
  } else {
    if (str.includes(',') && !str.includes('.')) {
      str = str.replace(',', '.');
    }
    str = str.replace(/[^0-9.-]+/g, '');
  }
  const res = parseFloat(str);
  return isNaN(res) ? 0 : Math.abs(res);
}

const INDO_MONTH_MAP = {
  jan: 0, januari: 0, january: 0,
  feb: 1, februari: 1, february: 1,
  mar: 2, maret: 2, march: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5, june: 5,
  jul: 6, juli: 6, july: 6,
  ags: 7, agu: 7, agustus: 7, aug: 7, august: 7,
  sep: 8, september: 8,
  okt: 9, oktober: 9, oct: 9, october: 9,
  nov: 10, november: 10,
  des: 11, desember: 11, dec: 11, december: 11
};

function parseStatementDate(rawDate) {
  if (!rawDate) return null;
  if (typeof rawDate === 'number') {
    return new Date(Math.round((rawDate - 25569) * 86400 * 1000));
  }
  if (rawDate instanceof Date) {
    return isNaN(rawDate.getTime()) ? null : rawDate;
  }
  let str = String(rawDate).trim();
  if (!str) return null;

  // Numeric serial e.g. "45498.74"
  if (/^\d{5}(?:\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (!isNaN(num)) {
      return new Date(Math.round((num - 25569) * 86400 * 1000));
    }
  }

  // Format DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (supports 2-digit or 4-digit years)
  // e.g. "29/07/2024 17.49.54", "01/07/24 6:01:48", "29-07-2024", "29.07.24"
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    return new Date(year, month, day, hours, minutes, seconds);
  }

  // Format YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hours = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const minutes = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const seconds = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    return new Date(year, month, day, hours, minutes, seconds);
  }

  // Format with text month e.g. "29 Juli 2024 17:49:54", "29-Jul-2024", "29-Jul-24"
  const textMonthMatch = str.match(/^(\d{1,2})[\s\-_/]+([a-zA-Z]+)[\s\-_/]+(\d{2,4})(?:\s+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?/);
  if (textMonthMatch) {
    const day = parseInt(textMonthMatch[1], 10);
    const mStr = textMonthMatch[2].toLowerCase();
    const month = INDO_MONTH_MAP[mStr] !== undefined ? INDO_MONTH_MAP[mStr] : (new Date(`${mStr} 1, 2000`).getMonth());
    let year = parseInt(textMonthMatch[3], 10);
    if (year < 100) year += 2000;
    const hours = textMonthMatch[4] ? parseInt(textMonthMatch[4], 10) : 0;
    const minutes = textMonthMatch[5] ? parseInt(textMonthMatch[5], 10) : 0;
    const seconds = textMonthMatch[6] ? parseInt(textMonthMatch[6], 10) : 0;
    return new Date(year, month, day, hours, minutes, seconds);
  }

  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    if (dt.getFullYear() < 100) dt.setFullYear(dt.getFullYear() + 2000);
    return dt;
  }
  return null;
}

const isUnit = (val) => val && val !== 'all' && val !== 'foundation' && val !== 'null' && !isNaN(Number(val)) && Number(val) > 0;

class BankStatementsService {
  /**
   * 1. List Bank Statements with filtering, search, pagination, and macro statistics
   */
  async listBankStatements(schoolUnitId, filters = {}) {
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;

    const allocSub = db('bank_statement_references')
      .select('bank_statement_id')
      .sum('amount as total_allocated')
      .count('id as reference_count')
      .groupBy('bank_statement_id')
      .as('alloc');

    let query = db('bank_statements')
      .join('cash_accounts', 'bank_statements.cash_account_id', 'cash_accounts.id')
      .leftJoin(allocSub, 'bank_statements.id', 'alloc.bank_statement_id');

    if (targetUnit) {
      query = query.where('bank_statements.school_unit_id', targetUnit);
    } else if (filters.school_unit_id && isUnit(filters.school_unit_id)) {
      query = query.where('bank_statements.school_unit_id', Number(filters.school_unit_id));
    }

    if (filters.cash_account_id) {
      query = query.where('bank_statements.cash_account_id', Number(filters.cash_account_id));
    }
    let ayRow = null;
    if (filters.academic_year_id && filters.academic_year_id !== 'all' && filters.academic_year_id !== '') {
      try {
        ayRow = await dbAkademik('academic_years').where('id', Number(filters.academic_year_id)).first();
      } catch (err) {
        console.error('Error finding academic year in dbAkademik:', err);
      }
    }

    if (ayRow) {
      let startYear, endYear;
      if (ayRow.name && ayRow.name.includes('/')) {
        const parts = ayRow.name.split('/');
        startYear = parseInt(parts[0], 10);
        endYear = parseInt(parts[1], 10);
      } else if (ayRow.start_date) {
        const dt = new Date(ayRow.start_date);
        startYear = dt.getFullYear();
        endYear = startYear + 1;
      } else {
        startYear = 2025;
        endYear = 2026;
      }

      const ayStartDate = `${startYear}-07-01 00:00:00`;
      const ayEndDate = `${endYear}-06-30 23:59:59`;

      if (filters.month && filters.month !== 'all' && filters.month !== '') {
        const m = parseInt(filters.month, 10);
        if (!isNaN(m) && m >= 1 && m <= 12) {
          const targetYear = m >= 7 ? startYear : endYear;
          const mStr = String(m).padStart(2, '0');
          const lastDay = new Date(targetYear, m, 0).getDate();
          query = query.where('bank_statements.transaction_date', '>=', `${targetYear}-${mStr}-01 00:00:00`)
                       .where('bank_statements.transaction_date', '<=', `${targetYear}-${mStr}-${lastDay} 23:59:59`);
        }
      } else {
        query = query.where(function() {
          this.where('bank_statements.academic_year_id', ayRow.id)
            .orWhere(function() {
              this.where('bank_statements.transaction_date', '>=', ayStartDate)
                  .where('bank_statements.transaction_date', '<=', ayEndDate);
            });
        });
      }
    } else {
      if (filters.year && filters.year !== 'all') {
        const y = parseInt(filters.year, 10);
        if (!isNaN(y)) {
          if (filters.month && filters.month !== 'all') {
            const m = parseInt(filters.month, 10);
            if (!isNaN(m) && m >= 1 && m <= 12) {
              const mStr = String(m).padStart(2, '0');
              const lastDay = new Date(y, m, 0).getDate();
              query = query.where('bank_statements.transaction_date', '>=', `${y}-${mStr}-01 00:00:00`)
                           .where('bank_statements.transaction_date', '<=', `${y}-${mStr}-${lastDay} 23:59:59`);
            }
          } else {
            query = query.where('bank_statements.transaction_date', '>=', `${y}-01-01 00:00:00`)
                         .where('bank_statements.transaction_date', '<=', `${y}-12-31 23:59:59`);
          }
        }
      } else if (filters.month && filters.month !== 'all') {
        const m = parseInt(filters.month, 10);
        if (!isNaN(m) && m >= 1 && m <= 12) {
          query = query.whereRaw('MONTH(bank_statements.transaction_date) = ?', [m]);
        }
      }
    }

    if (filters.start_date) {
      query = query.where('bank_statements.transaction_date', '>=', `${filters.start_date} 00:00:00`);
    }
    if (filters.end_date) {
      query = query.where('bank_statements.transaction_date', '<=', `${filters.end_date} 23:59:59`);
    }
    if (filters.dc_type) {
      const dcVal = String(filters.dc_type).toLowerCase();
      if (dcVal === 'cr' || dcVal === 'credit') {
        query = query.whereIn('bank_statements.dc_type', ['credit', 'CR', 'cr']);
      } else if (dcVal === 'db' || dcVal === 'debit') {
        query = query.whereIn('bank_statements.dc_type', ['debit', 'DB', 'db']);
      } else {
        query = query.where('bank_statements.dc_type', filters.dc_type);
      }
    }

    // Filter status rekonsiliasi:
    // is_reconciled = true -> sudah habis teralokasi / lunas cocok
    // is_reconciled = false -> belum teralokasi ATAU masih memiliki sisa saldo mutasi
    // is_reconciled = partial -> sudah terpakai sebagian tapi masih ada sisa
    if (filters.is_reconciled !== undefined && filters.is_reconciled !== '' && filters.is_reconciled !== 'all') {
      const isReconciled = filters.is_reconciled === 'true' || filters.is_reconciled === true || filters.is_reconciled === '1' || filters.is_reconciled === 1;
      const isPartial = filters.is_reconciled === 'partial';

      if (isPartial) {
        query = query.whereRaw('COALESCE(alloc.total_allocated, 0) > 0.01 AND (bank_statements.amount - COALESCE(alloc.total_allocated, 0)) > 0.01');
      } else if (isReconciled) {
        query = query.where(function() {
          this.where('bank_statements.is_reconciled', true)
            .orWhere('bank_statements.is_reconciled', 1)
            .orWhereRaw('(bank_statements.amount - COALESCE(alloc.total_allocated, 0)) <= 0.01');
        });
      } else {
        query = query.where(function() {
          this.where(function() {
            this.where('bank_statements.is_reconciled', false)
              .orWhere('bank_statements.is_reconciled', 0)
              .orWhereNull('bank_statements.is_reconciled');
          }).whereRaw('(bank_statements.amount - COALESCE(alloc.total_allocated, 0)) > 0.01');
        });
      }
    }

    if (filters.search) {
      const rawSearch = String(filters.search).trim();
      if (rawSearch) {
        const q = `%${rawSearch}%`;
        const cleanDigits = rawSearch.replace(/[^0-9]/g, '');
        const searchAmount = cleanDigits ? parseFloat(cleanDigits) : null;

        // Check matching student IDs from Academic DB if any
        let matchedStudentIds = [];
        try {
          const matchedStudents = await dbAkademik('students')
            .where('name', 'like', q)
            .orWhere('nisn', 'like', q)
            .orWhere('nis', 'like', q)
            .select('id')
            .limit(100);
          matchedStudentIds = matchedStudents.map(s => s.id);
        } catch (_) {}

        query = query.where(function() {
          this.where('bank_statements.description', 'like', q)
            .orWhere('bank_statements.journal_number', 'like', q)
            .orWhere('bank_statements.reconciliation_notes', 'like', q)
            .orWhere('cash_accounts.name', 'like', q)
            .orWhere('cash_accounts.bank_name', 'like', q)
            .orWhere('cash_accounts.bank_account_number', 'like', q)
            // Reference notes
            .orWhereExists(function() {
              this.select('*')
                .from('bank_statement_references')
                .whereRaw('bank_statement_references.bank_statement_id = bank_statements.id')
                .andWhere('bank_statement_references.notes', 'like', q);
            })
            // Bill payments (receipt_number)
            .orWhereExists(function() {
              this.select('*')
                .from('bank_statement_references')
                .join('bill_payments', 'bank_statement_references.reference_id', 'bill_payments.id')
                .whereRaw('bank_statement_references.bank_statement_id = bank_statements.id')
                .andWhere('bank_statement_references.reference_type', 'student_bill_payment')
                .andWhere('bill_payments.receipt_number', 'like', q);
            })
            // Expenses (proof_number, item_name)
            .orWhereExists(function() {
              this.select('*')
                .from('bank_statement_references')
                .join('expenses', 'bank_statement_references.reference_id', 'expenses.id')
                .whereRaw('bank_statement_references.bank_statement_id = bank_statements.id')
                .andWhere('bank_statement_references.reference_type', 'expense')
                .andWhere(function() {
                  this.where('expenses.proof_number', 'like', q)
                    .orWhere('expenses.item_name', 'like', q);
                });
            })
            // Cash transfers (transfer_number)
            .orWhereExists(function() {
              this.select('*')
                .from('bank_statement_references')
                .join('cash_transfers', 'bank_statement_references.reference_id', 'cash_transfers.id')
                .whereRaw('bank_statement_references.bank_statement_id = bank_statements.id')
                .andWhere('bank_statement_references.reference_type', 'cash_transfer')
                .andWhere('cash_transfers.transfer_number', 'like', q);
            })
            // Other incomes (notes)
            .orWhereExists(function() {
              this.select('*')
                .from('bank_statement_references')
                .join('other_incomes', 'bank_statement_references.reference_id', 'other_incomes.id')
                .whereRaw('bank_statement_references.bank_statement_id = bank_statements.id')
                .andWhere('bank_statement_references.reference_type', 'other_income')
                .andWhere('other_incomes.notes', 'like', q);
            })
            // Payroll (period_month, period_year)
            .orWhereExists(function() {
              this.select('*')
                .from('bank_statement_references')
                .join('payroll_disbursements', 'bank_statement_references.reference_id', 'payroll_disbursements.id')
                .whereRaw('bank_statement_references.bank_statement_id = bank_statements.id')
                .andWhere('bank_statement_references.reference_type', 'payroll')
                .andWhere(function() {
                  this.where('payroll_disbursements.period_year', 'like', q)
                    .orWhere('payroll_disbursements.period_month', 'like', q);
                });
            });

          // If matched students found, also match bank statements linked to bill payments of these students
          if (matchedStudentIds.length > 0) {
            this.orWhereExists(function() {
              this.select('*')
                .from('bank_statement_references')
                .join('bill_payments', 'bank_statement_references.reference_id', 'bill_payments.id')
                .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
                .whereRaw('bank_statement_references.bank_statement_id = bank_statements.id')
                .andWhere('bank_statement_references.reference_type', 'student_bill_payment')
                .whereIn('student_bills.student_id', matchedStudentIds);
            });
          }

          // Search by amount / balance
          if (searchAmount && !isNaN(searchAmount) && searchAmount > 0) {
            this.orWhere('bank_statements.amount', searchAmount)
              .orWhere('bank_statements.running_balance', searchAmount);
          }
        });
      }
    }

    // Clone query for summary calculation before pagination
    const allRecords = await query.clone().select(
      'bank_statements.id',
      'bank_statements.amount',
      'bank_statements.dc_type',
      'bank_statements.is_reconciled',
      'bank_statements.running_balance',
      db.raw('COALESCE(alloc.total_allocated, 0) as allocated_amount')
    );

    const totalRows = allRecords.length;
    let totalCredit = 0; // Uang Masuk
    let totalDebit = 0;  // Uang Keluar
    let reconciledCount = 0;
    let totalAllocatedSum = 0;

    allRecords.forEach(r => {
      const amt = parseFloat(r.amount || 0);
      const allocAmt = parseFloat(r.allocated_amount || 0);
      totalAllocatedSum += allocAmt;
      if (r.dc_type === 'credit') {
        totalCredit += amt;
      } else if (r.dc_type === 'debit') {
        totalDebit += amt;
      }
      const isFullyAllocated = Boolean(r.is_reconciled) || (allocAmt >= amt - 0.01 && amt > 0);
      if (isFullyAllocated) {
        reconciledCount += 1;
      }
    });

    const unreconciledCount = totalRows - reconciledCount;
    const reconciliationRate = totalRows > 0 ? Math.round((reconciledCount / totalRows) * 10000) / 100 : 0;
    const netMutation = totalCredit - totalDebit;

    // Available distinct years from bank_statements
    let yearsQuery = db('bank_statements');
    if (targetUnit) {
      yearsQuery = yearsQuery.where('school_unit_id', targetUnit);
    }
    const yearsResult = await yearsQuery
      .select(db.raw('DISTINCT YEAR(transaction_date) as yr'))
      .orderBy('yr', 'desc');
    const availableYears = yearsResult.map(r => r.yr).filter(Boolean);

    // Sorting
    const allowedSortFields = {
      cash_account_name: 'cash_accounts.name',
      transaction_date: 'bank_statements.transaction_date',
      journal_number: 'bank_statements.journal_number',
      description: 'bank_statements.description',
      dc_type: 'bank_statements.dc_type',
      amount: 'bank_statements.amount',
      running_balance: 'bank_statements.running_balance',
      is_reconciled: 'bank_statements.is_reconciled'
    };

    const sortBy = allowedSortFields[filters.sort_by] || 'bank_statements.transaction_date';
    const sortDir = String(filters.sort_dir).toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Pagination
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const perPage = Math.max(1, parseInt(filters.per_page, 10) || 25);
    const totalPages = Math.ceil(totalRows / perPage) || 1;

    let paginatedQuery = query.clone()
      .select(
        'bank_statements.*',
        'cash_accounts.name as cash_account_name',
        'cash_accounts.bank_name',
        'cash_accounts.bank_account_number',
        db.raw('COALESCE(alloc.total_allocated, 0) as allocated_amount'),
        db.raw('COALESCE(alloc.reference_count, 0) as reference_count')
      )
      .orderBy(sortBy, sortDir)
      .orderBy('bank_statements.id', sortDir);

    if (!filters.no_pagination) {
      paginatedQuery = paginatedQuery.offset((page - 1) * perPage).limit(perPage);
    }

    const rows = await paginatedQuery;

    // Enrich references in batch
    const stmtIds = rows.map(r => r.id);
    let allRefs = [];
    if (stmtIds.length > 0) {
      allRefs = await db('bank_statement_references')
        .whereIn('bank_statement_id', stmtIds)
        .orderBy('id', 'asc');
    }

    const paymentIds = allRefs.filter(r => r.reference_type === 'student_bill_payment').map(r => r.reference_id);
    const incomeIds = allRefs.filter(r => r.reference_type === 'other_income').map(r => r.reference_id);
    const expenseIds = allRefs.filter(r => r.reference_type === 'expense').map(r => r.reference_id);
    const transferIds = allRefs.filter(r => r.reference_type === 'cash_transfer').map(r => r.reference_id);
    const payrollIds = allRefs.filter(r => r.reference_type === 'payroll').map(r => r.reference_id);

    const [paymentRows, incomeRows, expenseRows, transferRows, payrollRows] = await Promise.all([
      paymentIds.length > 0
        ? db('bill_payments')
            .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
            .whereIn('bill_payments.id', paymentIds)
            .select('bill_payments.id', 'bill_payments.receipt_number', 'bill_payments.amount', 'bill_payments.paid_at', 'student_bills.student_id')
        : [],
      incomeIds.length > 0
        ? db('other_incomes').whereIn('id', incomeIds).select('id', 'notes', 'amount', 'received_at')
        : [],
      expenseIds.length > 0
        ? db('expenses').whereIn('id', expenseIds).select('id', 'proof_number', 'item_name', 'total_amount', 'expense_date')
        : [],
      transferIds.length > 0
        ? db('cash_transfers').whereIn('id', transferIds).select('id', 'transfer_number', 'amount', 'transfer_date')
        : [],
      payrollIds.length > 0
        ? db('payroll_disbursements').whereIn('id', payrollIds).select('id', 'period_month', 'period_year', 'amount as total_amount', 'disbursed_at')
        : []
    ]);

    const paymentMap = new Map(paymentRows.map(p => [p.id, p]));
    const incomeMap = new Map(incomeRows.map(i => [i.id, i]));
    const expenseMap = new Map(expenseRows.map(e => [e.id, e]));
    const transferMap = new Map(transferRows.map(t => [t.id, t]));
    const payrollMap = new Map(payrollRows.map(pr => [pr.id, pr]));

    // Student names lookup
    let studentMap = new Map();
    const studentIds = paymentRows.map(p => p.student_id).filter(Boolean);
    if (studentIds.length > 0) {
      try {
        const students = await dbAkademik('students').whereIn('id', studentIds).select('id', 'name', 'nisn', 'nis');
        studentMap = new Map(students.map(s => [s.id, s]));
      } catch (e) {
        // ignore
      }
    }

    const refsByStmtId = {};
    allRefs.forEach(ref => {
      let label = `Ref #${ref.reference_id}`;
      let date = formatDateOnly(ref.created_at);
      let refAmt = parseFloat(ref.amount || 0);

      if (ref.reference_type === 'student_bill_payment') {
        const p = paymentMap.get(ref.reference_id);
        const stu = p ? studentMap.get(p.student_id) : null;
        const stuLabel = stu ? ` (${stu.name})` : '';
        label = p ? `Kwitansi #${p.receipt_number}${stuLabel}` : `Pembayaran Siswa #${ref.reference_id}`;
        if (p?.paid_at) date = formatDateOnly(p.paid_at);
      } else if (ref.reference_type === 'other_income') {
        const inc = incomeMap.get(ref.reference_id);
        label = inc ? `Penerimaan #${inc.id} (${inc.notes || 'Non-SPP'})` : `Penerimaan #${ref.reference_id}`;
        if (inc?.received_at) date = formatDateOnly(inc.received_at);
      } else if (ref.reference_type === 'expense') {
        const exp = expenseMap.get(ref.reference_id);
        label = exp ? `Pengeluaran #${exp.proof_number || exp.id} (${exp.item_name || 'Belanja'})` : `Pengeluaran #${ref.reference_id}`;
        if (exp?.expense_date) date = formatDateOnly(exp.expense_date);
      } else if (ref.reference_type === 'cash_transfer') {
        const ct = transferMap.get(ref.reference_id);
        label = ct ? `Transfer Kas #${ct.transfer_number || ct.id}` : `Transfer Kas #${ref.reference_id}`;
        if (ct?.transfer_date) date = formatDateOnly(ct.transfer_date);
      } else if (ref.reference_type === 'payroll') {
        const pr = payrollMap.get(ref.reference_id);
        label = pr ? `Pencairan Gaji #${pr.id} (${pr.period_name || 'Payroll'})` : `Payroll #${ref.reference_id}`;
        if (pr?.disbursed_at) date = formatDateOnly(pr.disbursed_at);
      }

      if (!refsByStmtId[ref.bank_statement_id]) {
        refsByStmtId[ref.bank_statement_id] = [];
      }
      refsByStmtId[ref.bank_statement_id].push({
        id: ref.id,
        bank_statement_id: ref.bank_statement_id,
        reference_type: ref.reference_type,
        reference_id: ref.reference_id,
        amount: refAmt,
        label,
        date,
        notes: ref.notes,
        created_at: ref.created_at
      });
    });

    const enrichedRows = rows.map((row) => {
      const amt = parseFloat(row.amount || 0);
      const allocAmt = parseFloat(row.allocated_amount || 0);
      const remAmt = Math.max(0, amt - allocAmt);
      const isReconciled = Boolean(row.is_reconciled) || (allocAmt >= amt - 0.01 && amt > 0);
      const isPartiallyReconciled = allocAmt > 0 && remAmt > 0.01;
      const statementRefs = refsByStmtId[row.id] || [];

      // Fallback single reference display for backwards compatibility
      let referenceDisplay = null;
      if (statementRefs.length > 0) {
        const first = statementRefs[0];
        referenceDisplay = {
          type: first.reference_type,
          label: statementRefs.length === 1 ? first.label : `${first.label} (+${statementRefs.length - 1} rujukan lain)`,
          amount: allocAmt,
          date: first.date
        };
      }

      return {
        ...row,
        is_reconciled: isReconciled,
        is_partially_reconciled: isPartiallyReconciled,
        amount: amt,
        allocated_amount: allocAmt,
        remaining_amount: remAmt,
        reference_count: statementRefs.length || parseInt(row.reference_count || 0, 10),
        references: statementRefs,
        running_balance: row.running_balance !== null ? parseFloat(row.running_balance) : null,
        transaction_date_formatted: formatDateOnly(row.transaction_date),
        transaction_time_formatted: formatTimeOnly(row.transaction_date),
        reference_display: referenceDisplay
      };
    });

    // Opening balance calculation based on filtered cash account or sum of all bank accounts
    let openingBalance = 0;
    if (filters.cash_account_id) {
      const openingRow = await db('cash_account_opening_balances')
        .where('cash_account_id', filters.cash_account_id)
        .orderBy('id', 'desc')
        .first();
      openingBalance = openingRow ? parseFloat(openingRow.opening_balance || 0) : 0;
    } else {
      let openingSumQuery = db('cash_account_opening_balances')
        .join('cash_accounts', 'cash_account_opening_balances.cash_account_id', 'cash_accounts.id')
        .where('cash_accounts.account_kind', 'bank');
      if (targetUnit) {
        openingSumQuery = openingSumQuery.where('cash_accounts.school_unit_id', targetUnit);
      }
      const openingSum = await openingSumQuery
        .sum('cash_account_opening_balances.opening_balance as total_opening')
        .first();
      openingBalance = openingSum?.total_opening ? parseFloat(openingSum.total_opening) : 0;
    }

    const finalBalance = openingBalance + netMutation;

    return {
      summary: {
        total_rows: totalRows,
        total_credit: totalCredit,
        total_debit: totalDebit,
        net_mutation: netMutation,
        opening_balance: openingBalance,
        final_balance: finalBalance,
        reconciled_count: reconciledCount,
        unreconciled_count: unreconciledCount,
        total_allocated_amount: totalAllocatedSum,
        reconciliation_rate: reconciliationRate,
        available_years: availableYears
      },
      pagination: {
        current_page: page,
        per_page: perPage,
        total_pages: totalPages,
        total_records: totalRows
      },
      statements: enrichedRows
    };
  }

  /**
   * 2. Get Single Bank Statement
   */
  async getBankStatementById(schoolUnitId, id) {
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    let query = db('bank_statements')
      .join('cash_accounts', 'bank_statements.cash_account_id', 'cash_accounts.id')
      .where('bank_statements.id', id);

    if (targetUnit) {
      query = query.where('bank_statements.school_unit_id', targetUnit);
    }

    const row = await query
      .select(
        'bank_statements.*',
        'cash_accounts.name as cash_account_name',
        'cash_accounts.bank_name',
        'cash_accounts.bank_account_number'
      )
      .first();

    if (!row) return null;

    const refs = await db('bank_statement_references')
      .where({ bank_statement_id: id })
      .orderBy('id', 'asc');

    const amt = parseFloat(row.amount || 0);
    const allocAmt = refs.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0);
    const remAmt = Math.max(0, amt - allocAmt);
    const isReconciled = Boolean(row.is_reconciled) || (allocAmt >= amt - 0.01 && amt > 0);

    return {
      ...row,
      is_reconciled: isReconciled,
      is_partially_reconciled: allocAmt > 0 && remAmt > 0.01,
      amount: amt,
      allocated_amount: allocAmt,
      remaining_amount: remAmt,
      reference_count: refs.length,
      references: refs.map(r => ({
        ...r,
        amount: parseFloat(r.amount || 0)
      })),
      running_balance: row.running_balance !== null ? parseFloat(row.running_balance) : null,
      transaction_date_formatted: formatDateOnly(row.transaction_date),
      transaction_time_formatted: formatTimeOnly(row.transaction_date)
    };
  }

  /**
   * 3. Create Manual Bank Statement Row
   */
  async createBankStatement(schoolUnitId, data, userId = null) {
    const targetUnitId = isUnit(schoolUnitId) ? Number(schoolUnitId) : 0;
    const {
      cash_account_id,
      academic_year_id,
      transaction_date,
      journal_number,
      description,
      amount,
      dc_type,
      running_balance
    } = data;

    if (!cash_account_id || !transaction_date || !description || amount === undefined || !dc_type) {
      const err = new Error('Field cash_account_id, transaction_date, description, amount, dan dc_type wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    if (!['debit', 'credit'].includes(dc_type)) {
      const err = new Error("dc_type harus 'debit' (keluar) atau 'credit' (masuk)");
      err.statusCode = 422;
      throw err;
    }

    const numAmount = Math.abs(parseFloat(amount));
    if (numAmount <= 0) {
      const err = new Error('Nominal mutasi harus lebih besar dari 0');
      err.statusCode = 422;
      throw err;
    }

    // Verify cash_account belongs to unit/foundation and is of type 'bank'
    let accQuery = db('cash_accounts').where('id', cash_account_id);
    if (isUnit(schoolUnitId)) {
      accQuery = accQuery.where(function() {
        this.where('school_unit_id', targetUnitId).orWhere('school_unit_id', 0);
      });
    }
    const account = await accQuery.first();

    if (!account) {
      const err = new Error('Rekening kas/bank tidak ditemukan atau bukan milik unit sekolah ini');
      err.statusCode = 404;
      throw err;
    }

    if (account.account_kind !== 'bank') {
      const err = new Error("Rekening koran hanya dapat dicatat untuk rekening kas bertipe Bank (account_kind = 'bank'). Rekening tunai/kas kecil tidak memiliki rekening koran.");
      err.statusCode = 422;
      throw err;
    }

    const [newId] = await db('bank_statements').insert({
      school_unit_id: targetUnitId,
      academic_year_id: academic_year_id || null,
      cash_account_id,
      transaction_date: new Date(transaction_date),
      journal_number: journal_number || null,
      description: String(description).trim(),
      amount: numAmount,
      dc_type,
      running_balance: running_balance !== undefined && running_balance !== '' ? parseFloat(running_balance) : null,
      is_reconciled: false
    });

    const actualId = newId || (await db('bank_statements').where({ school_unit_id: targetUnitId }).orderBy('id', 'desc').first()).id;

    await logFinanceAudit({
      schoolUnitId: targetUnitId,
      userId,
      action: 'CREATE_BANK_STATEMENT',
      entityType: 'bank_statement',
      entityId: actualId,
      dataAfter: { cash_account_id, transaction_date, amount: numAmount, dc_type }
    });

    return this.getBankStatementById(schoolUnitId, actualId);
  }

  /**
   * 4. Update Bank Statement Row
   */
  async updateBankStatement(schoolUnitId, id, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    let query = db('bank_statements').where({ id });
    if (targetUnit) {
      query = query.where('school_unit_id', targetUnit);
    }
    const existing = await query.first();

    if (!existing) {
      const err = new Error('Baris mutasi rekening koran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const refCount = await db('bank_statement_references').where({ bank_statement_id: id }).count('id as cnt').first();
    if (existing.is_reconciled || (refCount?.cnt && refCount.cnt > 0)) {
      const err = new Error('Baris rekening koran yang telah memiliki rujukan transaksi tidak dapat diedit langsung. Silakan lepas rujukan terlebih dahulu.');
      err.statusCode = 422;
      throw err;
    }

    const updates = {};
    if (data.cash_account_id) {
      let accQuery = db('cash_accounts').where('id', data.cash_account_id);
      if (targetUnit) {
        accQuery = accQuery.where(function() {
          this.where('school_unit_id', targetUnit).orWhere('school_unit_id', 0);
        });
      }
      const account = await accQuery.first();
      if (!account) {
        const err = new Error('Rekening kas/bank tidak ditemukan atau bukan milik unit sekolah ini');
        err.statusCode = 404;
        throw err;
      }
      if (account.account_kind !== 'bank') {
        const err = new Error("Rekening koran hanya dapat dicatat untuk rekening kas bertipe Bank (account_kind = 'bank').");
        err.statusCode = 422;
        throw err;
      }
      updates.cash_account_id = data.cash_account_id;
    }
    if (data.academic_year_id !== undefined) updates.academic_year_id = data.academic_year_id || null;
    if (data.transaction_date) updates.transaction_date = new Date(data.transaction_date);
    if (data.journal_number !== undefined) updates.journal_number = data.journal_number || null;
    if (data.description !== undefined) updates.description = String(data.description).trim();
    if (data.amount !== undefined) updates.amount = Math.abs(parseFloat(data.amount));
    if (data.dc_type && ['debit', 'credit'].includes(data.dc_type)) updates.dc_type = data.dc_type;
    if (data.running_balance !== undefined) updates.running_balance = (data.running_balance !== '' && data.running_balance !== null) ? parseFloat(data.running_balance) : null;
    updates.updated_at = db.fn.now();

    await db('bank_statements')
      .where({ id })
      .update(updates);

    await logFinanceAudit({
      schoolUnitId: existing.school_unit_id,
      userId,
      action: 'UPDATE_BANK_STATEMENT',
      entityType: 'bank_statement',
      entityId: id,
      dataBefore: existing,
      dataAfter: updates
    });

    return this.getBankStatementById(schoolUnitId, id);
  }

  /**
   * 5. Delete Bank Statement Row
   */
  async deleteBankStatement(schoolUnitId, id, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    let query = db('bank_statements').where({ id });
    if (targetUnit) {
      query = query.where('school_unit_id', targetUnit);
    }
    const existing = await query.first();

    if (!existing) {
      const err = new Error('Baris mutasi rekening koran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const refCount = await db('bank_statement_references').where({ bank_statement_id: id }).count('id as cnt').first();
    if (existing.is_reconciled || (refCount?.cnt && refCount.cnt > 0)) {
      const err = new Error('Baris rekening koran yang telah memiliki rujukan transaksi tidak dapat dihapus langsung. Silakan lepas rujukan terlebih dahulu.');
      err.statusCode = 422;
      throw err;
    }

    await db('bank_statements')
      .where({ id })
      .delete();

    await logFinanceAudit({
      schoolUnitId: existing.school_unit_id,
      userId,
      action: 'DELETE_BANK_STATEMENT',
      entityType: 'bank_statement',
      entityId: id,
      dataBefore: existing
    });

    return { id, deleted: true };
  }

  /**
   * 5b. Bulk Delete Bank Statements
   */
  async bulkDeleteBankStatements(schoolUnitId, ids = [], userId = null) {
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error('Daftar ID mutasi rekening koran yang akan dihapus tidak boleh kosong');
      err.statusCode = 422;
      throw err;
    }

    const numIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    if (numIds.length === 0) {
      const err = new Error('Tidak ada ID valid yang dipilih');
      err.statusCode = 422;
      throw err;
    }

    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    let query = db('bank_statements').whereIn('id', numIds);
    if (targetUnit) {
      query = query.where('school_unit_id', targetUnit);
    }

    const existingRows = await query.select('id', 'is_reconciled', 'amount', 'dc_type', 'description', 'school_unit_id');

    if (existingRows.length === 0) {
      return { deleted_count: 0, reconciled_count: 0, unreconciled_count: 0 };
    }

    const reconciledCount = existingRows.filter(r => r.is_reconciled).length;
    const unreconciledCount = existingRows.length - reconciledCount;
    const idsToDelete = existingRows.map(r => r.id);

    await db('bank_statements')
      .whereIn('id', idsToDelete)
      .delete();

    await logFinanceAudit({
      schoolUnitId: targetUnit || 0,
      userId,
      action: 'BULK_DELETE_BANK_STATEMENTS',
      entityType: 'bank_statement',
      entityId: null,
      dataBefore: {
        ids: idsToDelete,
        total_deleted: idsToDelete.length,
        reconciled_count: reconciledCount,
        unreconciled_count: unreconciledCount
      }
    });

    return {
      deleted_count: idsToDelete.length,
      reconciled_count: reconciledCount,
      unreconciled_count: unreconciledCount
    };
  }

  /**
   * 6. Reconcile Statement (Tautkan Rujukan Transaksi Internal)
   * Mendukung alokasi parsial / multi-referensi ke plafon mutasi rekening koran.
   */
  async reconcileStatement(schoolUnitId, id, data, userId = null) {
    const { reference_type, reference_id, amount, notes } = data;

    if (!reference_type || !reference_id) {
      const err = new Error('Field reference_type dan reference_id wajib diisi untuk rekonsiliasi');
      err.statusCode = 422;
      throw err;
    }

    const validTypes = ['student_bill_payment', 'other_income', 'expense', 'payroll', 'cash_transfer', 'other'];
    if (!validTypes.includes(reference_type)) {
      const err = new Error(`reference_type tidak valid. Pilihan: ${validTypes.join(', ')}`);
      err.statusCode = 422;
      throw err;
    }

    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    let query = db('bank_statements').where({ id });
    if (targetUnit) {
      query = query.where('school_unit_id', targetUnit);
    }
    const statement = await query.first();

    if (!statement) {
      const err = new Error('Baris mutasi rekening koran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const allocSum = await db('bank_statement_references')
      .where('bank_statement_id', statement.id)
      .sum('amount as total_allocated')
      .first();
    const currentAllocated = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
    const stmtTotal = parseFloat(statement.amount || 0);
    const remainingPlafon = Math.max(0, stmtTotal - currentAllocated);

    if (remainingPlafon <= 0.01) {
      const err = new Error(`Plafon mutasi rekening koran ini (${formatDateOnly(statement.transaction_date)} - Rp ${stmtTotal.toLocaleString('id-ID')}) sudah habis tereferensikan ke transaksi internal.`);
      err.statusCode = 422;
      throw err;
    }

    const allocAmount = amount !== undefined && amount !== null && amount !== ''
      ? Math.min(Math.abs(parseFloat(amount)), remainingPlafon)
      : remainingPlafon;

    if (allocAmount <= 0) {
      const err = new Error('Nominal alokasi rujukan harus lebih besar dari 0');
      err.statusCode = 422;
      throw err;
    }

    const [refId] = await db('bank_statement_references').insert({
      bank_statement_id: statement.id,
      school_unit_id: statement.school_unit_id,
      reference_type,
      reference_id,
      amount: allocAmount,
      notes: notes || null,
      created_by: userId
    });

    const newAllocated = currentAllocated + allocAmount;
    const isFullyReconciled = newAllocated >= stmtTotal - 0.01;
    const now = new Date();

    await db('bank_statements')
      .where({ id })
      .update({
        is_reconciled: isFullyReconciled,
        reconciled_reference_type: reference_type,
        reconciled_reference_id: reference_id,
        reconciled_at: isFullyReconciled ? now : statement.reconciled_at,
        reconciled_by: userId,
        reconciliation_notes: isFullyReconciled
          ? (notes || 'Penuh teralokasi ke transaksi internal')
          : `Teralokasi Rp ${newAllocated.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`,
        updated_at: now
      });

    await logFinanceAudit({
      schoolUnitId: statement.school_unit_id,
      userId,
      action: 'RECONCILE_BANK_STATEMENT',
      entityType: 'bank_statement',
      entityId: id,
      dataAfter: {
        reference_record_id: refId,
        reference_type,
        reference_id,
        allocated_amount: allocAmount,
        total_allocated: newAllocated,
        is_reconciled: isFullyReconciled,
        notes
      }
    });

    return this.getBankStatementById(schoolUnitId, id);
  }

  /**
   * 7. Unreconcile Statement (Lepas Tautan Rekonsiliasi)
   * Jika referenceSubId diberikan, hanya menghapus 1 rujukan tersebut.
   * Jika tidak, menghapus seluruh rujukan pada rekening koran ini.
   */
  async unreconcileStatement(schoolUnitId, id, userId = null, referenceSubId = null) {
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    let query = db('bank_statements').where({ id });
    if (targetUnit) {
      query = query.where('school_unit_id', targetUnit);
    }
    const statement = await query.first();

    if (!statement) {
      const err = new Error('Baris mutasi rekening koran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (referenceSubId) {
      await db('bank_statement_references')
        .where({ id: Number(referenceSubId), bank_statement_id: id })
        .delete();
    } else {
      await db('bank_statement_references')
        .where({ bank_statement_id: id })
        .delete();
    }

    const allocSum = await db('bank_statement_references')
      .where('bank_statement_id', statement.id)
      .sum('amount as total_allocated')
      .first();
    const currentAllocated = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
    const stmtTotal = parseFloat(statement.amount || 0);
    const isFullyReconciled = currentAllocated >= stmtTotal - 0.01 && stmtTotal > 0;
    const now = new Date();

    const lastRef = await db('bank_statement_references')
      .where({ bank_statement_id: id })
      .orderBy('id', 'desc')
      .first();

    await db('bank_statements')
      .where({ id })
      .update({
        is_reconciled: isFullyReconciled,
        reconciled_reference_type: lastRef ? lastRef.reference_type : null,
        reconciled_reference_id: lastRef ? lastRef.reference_id : null,
        reconciled_at: isFullyReconciled ? statement.reconciled_at : null,
        reconciled_by: isFullyReconciled ? statement.reconciled_by : null,
        reconciliation_notes: currentAllocated > 0
          ? `Teralokasi Rp ${currentAllocated.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`
          : null,
        updated_at: now
      });

    await logFinanceAudit({
      schoolUnitId: statement.school_unit_id,
      userId,
      action: 'UNRECONCILE_BANK_STATEMENT',
      entityType: 'bank_statement',
      entityId: id,
      dataAfter: {
        removed_reference_id: referenceSubId,
        remaining_allocated: currentAllocated,
        is_reconciled: isFullyReconciled
      }
    });

    return this.getBankStatementById(schoolUnitId, id);
  }

  /**
   * 8. Get Candidates for Reconciliation (Pencocokan Cerdas Transaksi Internal)
   */
  async getReconcileCandidates(schoolUnitId, id) {
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;
    let query = db('bank_statements').where({ id });
    if (targetUnit) {
      query = query.where('school_unit_id', targetUnit);
    }
    const statement = await query.first();

    if (!statement) {
      const err = new Error('Baris mutasi rekening koran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const allocSum = await db('bank_statement_references')
      .where('bank_statement_id', statement.id)
      .sum('amount as total_allocated')
      .first();
    const currentAllocated = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
    const stmtTotal = parseFloat(statement.amount || 0);
    const remainingPlafon = Math.max(0, stmtTotal - currentAllocated);

    const stmtDate = new Date(statement.transaction_date);
    const startDate = new Date(stmtDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDate = new Date(stmtDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const candidates = [];

    // If Credit (Uang Masuk di Bank): search bill_payments & other_incomes
    if (statement.dc_type === 'credit') {
      // 1. Bill Payments
      let pQuery = db('bill_payments')
        .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
        .where('bill_payments.paid_at', '>=', `${startDate} 00:00:00`)
        .where('bill_payments.paid_at', '<=', `${endDate} 23:59:59`);

      if (targetUnit) {
        pQuery = pQuery.where('student_bills.school_unit_id', targetUnit);
      }

      const payments = await pQuery.select(
        'bill_payments.id',
        'bill_payments.receipt_number',
        'bill_payments.amount',
        'bill_payments.paid_at',
        'bill_payments.notes',
        'student_bills.student_id'
      );

      // Fetch student details
      let stuMap = new Map();
      const sIds = payments.map(p => p.student_id).filter(Boolean);
      if (sIds.length > 0) {
        try {
          const stus = await dbAkademik('students').whereIn('id', sIds).select('id', 'name', 'nisn');
          stuMap = new Map(stus.map(s => [s.id, s]));
        } catch (e) {}
      }

      payments.forEach(p => {
        const pAmt = parseFloat(p.amount);
        const diffDays = Math.abs(Math.floor((new Date(p.paid_at) - stmtDate) / (1000 * 60 * 60 * 24)));
        const isExactAmount = Math.abs(pAmt - remainingPlafon) < 0.01 || Math.abs(pAmt - stmtTotal) < 0.01;
        const fitsRemaining = pAmt <= remainingPlafon + 0.01;

        if (fitsRemaining || isExactAmount || Math.abs(pAmt - remainingPlafon) <= 1000) {
          const student = stuMap.get(p.student_id);
          const studentLabel = student ? ` - ${student.name}` : '';
          candidates.push({
            reference_type: 'student_bill_payment',
            reference_id: p.id,
            title: `Pembayaran Tagihan Siswa (${p.receipt_number}${studentLabel})`,
            amount: pAmt,
            date: formatDateOnly(p.paid_at),
            diff_days: diffDays,
            confidence: isExactAmount && diffDays === 0 ? 'high' : (isExactAmount ? 'medium' : 'low'),
            notes: p.notes
          });
        }
      });

      // 2. Other Incomes
      let incQuery = db('other_incomes')
        .where('received_at', '>=', `${startDate} 00:00:00`)
        .where('received_at', '<=', `${endDate} 23:59:59`);

      if (targetUnit) {
        incQuery = incQuery.where('school_unit_id', targetUnit);
      }

      const otherIncomes = await incQuery.select('id', 'notes', 'amount', 'received_at');

      otherIncomes.forEach(inc => {
        const incAmt = parseFloat(inc.amount);
        const diffDays = Math.abs(Math.floor((new Date(inc.received_at) - stmtDate) / (1000 * 60 * 60 * 24)));
        const isExactAmount = Math.abs(incAmt - remainingPlafon) < 0.01 || Math.abs(incAmt - stmtTotal) < 0.01;
        const fitsRemaining = incAmt <= remainingPlafon + 0.01;

        if (fitsRemaining || isExactAmount || Math.abs(incAmt - remainingPlafon) <= 1000) {
          candidates.push({
            reference_type: 'other_income',
            reference_id: inc.id,
            title: `Penerimaan Non-SPP #${inc.id} (${inc.notes || 'Penerimaan'})`,
            amount: incAmt,
            date: formatDateOnly(inc.received_at),
            diff_days: diffDays,
            confidence: isExactAmount && diffDays === 0 ? 'high' : (isExactAmount ? 'medium' : 'low')
          });
        }
      });
    }

    // If Debit (Uang Keluar di Bank): search expenses & payroll & cash transfers
    if (statement.dc_type === 'debit') {
      // 1. Expenses
      let expQuery = db('expenses')
        .where('expense_date', '>=', startDate)
        .where('expense_date', '<=', endDate);

      if (targetUnit) {
        expQuery = expQuery.where('school_unit_id', targetUnit);
      }

      const expenses = await expQuery.select('id', 'proof_number', 'item_name', 'total_amount', 'expense_date');

      expenses.forEach(exp => {
        const expAmt = parseFloat(exp.total_amount);
        const diffDays = Math.abs(Math.floor((new Date(exp.expense_date) - stmtDate) / (1000 * 60 * 60 * 24)));
        const isExactAmount = Math.abs(expAmt - remainingPlafon) < 0.01 || Math.abs(expAmt - stmtTotal) < 0.01;
        const fitsRemaining = expAmt <= remainingPlafon + 0.01;

        if (fitsRemaining || isExactAmount || Math.abs(expAmt - remainingPlafon) <= 1000) {
          candidates.push({
            reference_type: 'expense',
            reference_id: exp.id,
            title: `Pengeluaran: ${exp.item_name} (${exp.proof_number || exp.id})`,
            amount: expAmt,
            date: formatDateOnly(exp.expense_date),
            diff_days: diffDays,
            confidence: isExactAmount && diffDays === 0 ? 'high' : (isExactAmount ? 'medium' : 'low')
          });
        }
      });

      // 2. Cash Transfers
      let trQuery = db('cash_transfers')
        .where('transfer_date', '>=', startDate)
        .where('transfer_date', '<=', endDate);

      if (targetUnit) {
        trQuery = trQuery.where('school_unit_id', targetUnit);
      }

      const transfers = await trQuery.select('id', 'transfer_number', 'amount', 'transfer_date', 'notes');

      transfers.forEach(tr => {
        const trAmt = parseFloat(tr.amount);
        const diffDays = Math.abs(Math.floor((new Date(tr.transfer_date) - stmtDate) / (1000 * 60 * 60 * 24)));
        const isExactAmount = Math.abs(trAmt - remainingPlafon) < 0.01 || Math.abs(trAmt - stmtTotal) < 0.01;
        const fitsRemaining = trAmt <= remainingPlafon + 0.01;

        if (fitsRemaining || isExactAmount || Math.abs(trAmt - remainingPlafon) <= 1000) {
          candidates.push({
            reference_type: 'cash_transfer',
            reference_id: tr.id,
            title: `Transfer Kas: ${tr.transfer_number || tr.id}`,
            amount: trAmt,
            date: formatDateOnly(tr.transfer_date),
            diff_days: diffDays,
            confidence: isExactAmount && diffDays === 0 ? 'high' : (isExactAmount ? 'medium' : 'low'),
            notes: tr.notes
          });
        }
      });
    }

    // Sort by confidence ('high' first) and diff_days (closest first)
    candidates.sort((a, b) => {
      const confScore = { high: 3, medium: 2, low: 1 };
      if (confScore[b.confidence] !== confScore[a.confidence]) {
        return confScore[b.confidence] - confScore[a.confidence];
      }
      return a.diff_days - b.diff_days;
    });

    return {
      statement_id: Number(id),
      statement_amount: stmtTotal,
      allocated_amount: currentAllocated,
      remaining_amount: remainingPlafon,
      statement_date: formatDateOnly(stmtDate),
      statement_dc: statement.dc_type,
      candidates
    };
  }

  /**
   * 9. Import Bank Statements Batch from Parsed Rows or Base64 Excel
   */
  async importBankStatements(schoolUnitId, data, userId = null) {
    const targetUnitId = isUnit(schoolUnitId) ? Number(schoolUnitId) : 0;
    const { cash_account_id, academic_year_id, rows = [], file_base64, column_mapping = {} } = data;

    if (!cash_account_id) {
      const err = new Error('Rekening Bank tujuan (cash_account_id) wajib dipilih');
      err.statusCode = 422;
      throw err;
    }

    let accQuery = db('cash_accounts').where('id', cash_account_id);
    if (isUnit(schoolUnitId)) {
      accQuery = accQuery.where(function() {
        this.where('school_unit_id', targetUnitId).orWhere('school_unit_id', 0);
      });
    }
    const account = await accQuery.first();

    if (!account) {
      const err = new Error('Rekening kas/bank tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (account.account_kind !== 'bank') {
      const err = new Error("Import rekening koran hanya diperbolehkan untuk rekening bertipe Bank (account_kind = 'bank').");
      err.statusCode = 422;
      throw err;
    }

    let parsedRows = rows;

    // Parse Excel from Base64 if rows not provided directly
    if ((!parsedRows || parsedRows.length === 0) && file_base64) {
      const buffer = Buffer.from(file_base64, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      parsedRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    }

    if (!parsedRows || parsedRows.length === 0) {
      const err = new Error('File Excel tidak memiliki data baris mutasi untuk diimpor');
      err.statusCode = 422;
      throw err;
    }

    const batchId = `BATCH-${targetUnitId}-${Date.now().toString().slice(-6)}`;
    const recordsToInsert = [];
    const errors = [];

    parsedRows.forEach((row, idx) => {
      const rowNum = idx + 2; // considering 1 header row

      // Read columns using mapping or common auto-detect keys
      const rawDate = (column_mapping.date_key ? row[column_mapping.date_key] : null) || row['Tanggal & Waktu'] || row['Tanggal'] || row['tanggal'] || row['Date'] || row['date'] || row['Tgl'];
      const rawDesc = (column_mapping.desc_key ? row[column_mapping.desc_key] : null) || row['Uraian Mutasi'] || row['Uraian'] || row['uraian'] || row['Keterangan'] || row['keterangan'] || row['Description'] || row['desc'];
      const rawRef = (column_mapping.ref_key ? row[column_mapping.ref_key] : null) || row['No Referensi'] || row['No. Referensi'] || row['no_referensi'] || row['No. Jurnal'] || row['Reff'] || row['Ref'] || '';

      // Amount detection (could be separate Debit/Credit columns or Amount + DC column)
      // Guard: do not read amount from description column if mis-mapped!
      let amountKey = column_mapping.amount_key;
      if (amountKey && (amountKey === column_mapping.desc_key || /uraian|keterangan|deskripsi/i.test(amountKey))) {
        amountKey = null;
      }
      let rawDebit = (column_mapping.debit_key ? row[column_mapping.debit_key] : null) || row['Debit'] || row['debit'] || row['DB'] || row['Keluar'] || 0;
      let rawCredit = (column_mapping.credit_key ? row[column_mapping.credit_key] : null) || row['Kredit'] || row['kredit'] || row['CR'] || row['Masuk'] || 0;
      let rawAmount = (amountKey ? row[amountKey] : null) || row['Nominal Mutasi'] || row['Nominal'] || row['nominal'] || row['Amount'] || row['Jumlah'] || 0;
      let rawDcType = (column_mapping.dc_key ? row[column_mapping.dc_key] : null) || row['Arus Mutasi (DB/CR)'] || row['Arus Mutasi'] || row['Tipe'] || row['tipe'] || row['D/C'] || row['DC'] || '';
      let rawBalance = (column_mapping.balance_key ? row[column_mapping.balance_key] : null) || row['Saldo Berjalan Bank'] || row['Saldo Berjalan'] || row['Saldo'] || row['saldo'] || row['Balance'] || null;

      if (!rawDate) {
        errors.push(`Baris ${rowNum}: Tanggal transaksi kosong`);
        return;
      }
      if (!rawDesc) {
        errors.push(`Baris ${rowNum}: Uraian transaksi kosong`);
        return;
      }

      // Normalize date using robust parser
      const parsedDate = parseStatementDate(rawDate);

      if (!parsedDate || isNaN(parsedDate.getTime())) {
        errors.push(`Baris ${rowNum}: Format tanggal (${rawDate}) tidak valid`);
        return;
      }

      // Determine dc_type and amount using robust money parser
      let dc = 'credit';
      let finalAmt = 0;

      const dVal = parseMoney(rawDebit);
      const cVal = parseMoney(rawCredit);
      const aVal = parseMoney(rawAmount);

      if (cVal > 0) {
        dc = 'credit';
        finalAmt = cVal;
      } else if (dVal > 0) {
        dc = 'debit';
        finalAmt = dVal;
      } else if (aVal > 0) {
        finalAmt = aVal;
        const dcStr = String(rawDcType).trim().toUpperCase();
        if (['D', 'DB', 'DEBIT', 'KELUAR', '-'].includes(dcStr)) {
          dc = 'debit';
        } else {
          dc = 'credit';
        }
      }

      if (finalAmt <= 0) {
        errors.push(`Baris ${rowNum}: Nominal mutasi harus lebih besar dari 0`);
        return;
      }

      const balanceNum = rawBalance !== null && rawBalance !== ''
        ? parseMoney(rawBalance)
        : null;

      recordsToInsert.push({
        school_unit_id: targetUnitId,
        academic_year_id: academic_year_id || null,
        cash_account_id,
        transaction_date: parsedDate,
        journal_number: rawRef ? String(rawRef).trim() : null,
        description: String(rawDesc).trim(),
        amount: finalAmt,
        dc_type: dc,
        running_balance: balanceNum !== null && !isNaN(balanceNum) ? balanceNum : null,
        is_reconciled: false,
        import_batch_id: batchId
      });
    });

    if (recordsToInsert.length === 0) {
      const err = new Error(`Tidak ada baris data valid yang dapat diimpor. Ditemukan ${errors.length} kesalahan format.`);
      err.statusCode = 422;
      err.errors = errors;
      throw err;
    }

    // Chunked insert
    const chunkSize = 100;
    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
      await db('bank_statements').insert(recordsToInsert.slice(i, i + chunkSize));
    }

    await logFinanceAudit({
      schoolUnitId: targetUnitId,
      userId,
      action: 'IMPORT_BANK_STATEMENTS',
      entityType: 'bank_statement',
      entityId: 0,
      dataAfter: {
        batch_id: batchId,
        cash_account_id,
        imported_count: recordsToInsert.length,
        skipped_count: errors.length
      }
    });

    return {
      batch_id: batchId,
      imported_count: recordsToInsert.length,
      skipped_count: errors.length,
      errors: errors.slice(0, 10)
    };
  }

  /**
   * 10. Export Statements to Excel (.xlsx)
   */
  async exportBankStatementsExcel(schoolUnitId, filters = {}) {
    const data = await this.listBankStatements(schoolUnitId, { ...filters, no_pagination: true });
    const statements = data.statements || [];

    const wb = XLSX.utils.book_new();

    const headers = [
      'No',
      'Tanggal Transaksi',
      'No. Referensi / Mutasi',
      'Uraian Mutasi Bank',
      'Tipe (D/C)',
      'Nominal Masuk (Kredit)',
      'Nominal Keluar (Debit)',
      'Saldo Berjalan',
      'Status Rekonsiliasi',
      'Kategori Transaksi Sistem',
      'Referensi Sistem',
      'Catatan Rekonsiliasi'
    ];

    const rows = [
      ['LAPORAN MUTASI REKENING KORAN & REKONSILIASI BANK'],
      [`Satuan Pendidikan ID: ${schoolUnitId}`],
      [`Tanggal Ekspor: ${new Date().toLocaleString('id-ID')}`],
      [],
      headers
    ];

    statements.forEach((s, idx) => {
      rows.push([
        idx + 1,
        s.transaction_date_formatted,
        s.journal_number || '-',
        s.description,
        s.dc_type === 'credit' ? 'CR (Masuk)' : 'DB (Keluar)',
        s.dc_type === 'credit' ? s.amount : 0,
        s.dc_type === 'debit' ? s.amount : 0,
        s.running_balance !== null ? s.running_balance : '-',
        s.is_reconciled ? 'Sudah Direkonsiliasi' : 'Belum Cocok',
        s.reconciled_reference_type || '-',
        s.reference_display?.label || (s.reconciled_reference_id ? `#${s.reconciled_reference_id}` : '-'),
        s.reconciliation_notes || '-'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 18 }, // Tanggal
      { wch: 20 }, // No Ref
      { wch: 35 }, // Uraian
      { wch: 12 }, // D/C
      { wch: 18 }, // Kredit
      { wch: 18 }, // Debit
      { wch: 18 }, // Saldo
      { wch: 20 }, // Status
      { wch: 22 }, // Kategori
      { wch: 30 }, // Ref Sistem
      { wch: 25 }  // Catatan
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Rekening Koran');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * 11. Generate Sample Excel Template for Import
   */
  getTemplateExcel() {
    const wb = XLSX.utils.book_new();

    const headers = [
      'Tanggal & Waktu',
      'No Referensi',
      'Uraian Mutasi',
      'Arus Mutasi (DB/CR)',
      'Nominal Mutasi',
      'Saldo Berjalan Bank'
    ];

    const sampleRows = [
      headers,
      ['29/07/2024 17.49.54', 'TRF-102938', 'Setoran SPP Siswa Ahmad Fauzi', 'CR', 1500000, 54500000],
      ['01/07/2024 6:01:48', 'BIFAST-9831', 'Pembayaran Uang Pangkal Santri', 'CR', 3500000, 58000000],
      ['29-07-2024 17:49', 'ADM-JUL24', 'Biaya Administrasi Bank Bulanan', 'DB', 25000, 57975000],
      ['15/07/2024 10:15:00', 'EXP-20240715', 'Transfer Belanja Pengadaan ATK & Modul', 'DB', 450000, 57525000]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    ws['!cols'] = [
      { wch: 22 }, // Tanggal & Waktu
      { wch: 20 }, // No Referensi
      { wch: 42 }, // Uraian Mutasi
      { wch: 20 }, // Arus Mutasi (DB/CR)
      { wch: 18 }, // Nominal Mutasi
      { wch: 22 }  // Saldo Berjalan Bank
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Template Rekening Koran');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = new BankStatementsService();
