/**
 * Reports Service for Keuangan Module
 * Covers Features #30, #31, #32, #33
 * Logic Query Aggregate Real-Time dari journal_entry_lines dan expenses
 */
const db = require('../../../config/db/keuangan');
const budgetService = require('../budget/service');

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
    const { account_code, period_from, period_to } = filters;

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

      if (period_from) linesQuery = linesQuery.where('journal_entries.journal_date', '>=', period_from);
      if (period_to) linesQuery = linesQuery.where('journal_entries.journal_date', '<=', period_to);

      const lines = await linesQuery.orderBy('journal_entries.journal_date', 'asc');

      let runningBalance = 0;
      let totalDebit = 0;
      let totalCredit = 0;

      const mutations = lines.map(line => {
        const amt = parseFloat(line.amount || 0);
        if (line.entry_side === 'debit') {
          totalDebit += amt;
          // Untuk aset/beban: debit menambah saldo, kredit mengurangi saldo
          if (acc.account_group === 'asset' || acc.account_group === 'expense') {
            runningBalance += amt;
          } else {
            runningBalance -= amt;
          }
        } else {
          totalCredit += amt;
          if (acc.account_group === 'asset' || acc.account_group === 'expense') {
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

  async getTrialBalance(schoolUnitId, period = null) {
    const accounts = await db('chart_of_accounts')
      .where('school_unit_id', schoolUnitId)
      .orderBy('account_code', 'asc');

    let linesQuery = db('journal_entry_lines')
      .join('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .where('journal_entries.school_unit_id', schoolUnitId);

    if (period) {
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

      return {
        account_id: acc.id,
        account_code: acc.account_code,
        account_name: acc.account_name,
        account_group: acc.account_group,
        debit: d,
        credit: c,
        net_balance: d - c
      };
    });

    return {
      period: period || 'Semua Periode',
      total_debit: grandTotalDebit,
      total_credit: grandTotalCredit,
      is_balanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
      rows
    };
  }

  // ============================================================
  // 4. SURPLUS / DEFISIT (Income Statement - Fitur #32)
  // ============================================================

  async getIncomeStatement(schoolUnitId, period = null) {
    const trialBalance = await this.getTrialBalance(schoolUnitId, period);

    const revenueAccounts = trialBalance.rows.filter(r => r.account_group === 'revenue');
    const expenseAccounts = trialBalance.rows.filter(r => r.account_group === 'expense');

    const totalRevenue = revenueAccounts.reduce((sum, r) => sum + (r.credit - r.debit), 0);
    const totalExpense = expenseAccounts.reduce((sum, r) => sum + (r.debit - r.credit), 0);
    const surplusDefisit = totalRevenue - totalExpense;

    return {
      period: period || 'Semua Periode',
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

  async getCashFlow(schoolUnitId, period = null) {
    let query = db('journal_entry_lines')
      .join('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
      .join('chart_of_accounts', 'journal_entry_lines.chart_of_account_id', 'chart_of_accounts.id')
      .where('journal_entries.school_unit_id', schoolUnitId)
      .where('chart_of_accounts.account_group', 'asset');

    if (period) {
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
      period: period || 'Semua Periode',
      cash_inflow: cashInflow,
      cash_outflow: cashOutflow,
      net_cash_flow: cashInflow - cashOutflow,
      activities: lines
    };
  }

  // ============================================================
  // 6. NERACA (Balance Sheet - Fitur #33)
  // ============================================================

  async getBalanceSheet(schoolUnitId, period = null) {
    const trialBalance = await this.getTrialBalance(schoolUnitId, period);

    const assetAccounts = trialBalance.rows.filter(r => r.account_group === 'asset');
    const liabilityAccounts = trialBalance.rows.filter(r => r.account_group === 'liability');
    const equityAccounts = trialBalance.rows.filter(r => r.account_group === 'equity');

    const totalAssets = assetAccounts.reduce((sum, r) => sum + (r.debit - r.credit), 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, r) => sum + (r.credit - r.debit), 0);
    const totalEquity = equityAccounts.reduce((sum, r) => sum + (r.credit - r.debit), 0);

    return {
      period: period || 'Semua Periode',
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
      is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      assets: assetAccounts,
      liabilities: liabilityAccounts,
      equity: equityAccounts
    };
  }
}

module.exports = new ReportsService();
