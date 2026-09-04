/**
 * Dashboard Service for Keuangan Module
 * Covers Feature #34 & Enhanced Insights:
 * 1. Cash Balances
 * 2. Bill Status Summary (including Draft Bills awaiting publication)
 * 3. Monthly Incomes & Expenses Cashflow Charts
 * 4. RAPBS Budget Realization (Overall, per Program, & per Item)
 * 5. Outstanding Receivables by Fee Scheme
 */
const db = require('../../../config/db/keuangan');
const masterDataService = require('../master-data/service');
const budgetService = require('../budget/service');
const fundBalanceEngine = require('../bookkeeping/fundBalanceEngine');

class DashboardService {
  async getDashboardSummary(schoolUnitId, academicYearId = null) {
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';

    // 1. Saldo Kas & Bank
    const cashAccounts = await masterDataService.listCashAccounts(schoolUnitId, { is_active: true });
    const cashBalances = await Promise.all(cashAccounts.map(async acc => {
      const bal = await masterDataService.getCashAccountBalance(schoolUnitId, acc.id, academicYearId);
      return {
        cash_account_id: acc.id,
        name: acc.name,
        balance: bal?.current_balance || 0
      };
    }));

    // 2. Ringkasan Status Tagihan (Termasuk Draft Tagihan Menunggu Terbit)
    let billCountQuery = db('student_bills');
    if (!isAll) billCountQuery = billCountQuery.where('school_unit_id', schoolUnitId);
    const billCounts = await billCountQuery
      .groupBy('status')
      .select('status', db.raw('COUNT(id) as total_count'), db.raw('SUM(amount) as total_amount'));

    const billStatusSummary = { draft: 0, pending_approval: 0, unpaid: 0, partially_paid: 0, paid: 0, cancelled: 0 };
    const billAmountSummary = { draft: 0, pending_approval: 0, unpaid: 0, partially_paid: 0, paid: 0, cancelled: 0 };

    billCounts.forEach(b => {
      billStatusSummary[b.status] = parseInt(b.total_count, 10);
      billAmountSummary[b.status] = parseFloat(b.total_amount || 0);
    });

    const draftBillsCount = billStatusSummary.draft || 0;
    const draftBillsAmount = billAmountSummary.draft || 0;
    const pendingApprovalCount = billStatusSummary.pending_approval || 0;
    const pendingApprovalAmount = billAmountSummary.pending_approval || 0;

    // 3. Chart Pemasukan Bulanan (dari bill_payments & other_incomes - Exclude Legacy Payments)
    let billPaymentsMonthlyQuery = db('bill_payments')
      .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .where('bill_payments.is_legacy', false);
    if (!isAll) billPaymentsMonthlyQuery = billPaymentsMonthlyQuery.where('student_bills.school_unit_id', schoolUnitId);
    const billPaymentsMonthly = await billPaymentsMonthlyQuery
      .select(
        db.raw("DATE_FORMAT(bill_payments.paid_at, '%Y-%m') as month"),
        db.raw('SUM(bill_payments.amount) as total_amount')
      )
      .groupBy('month');

    let otherIncomesMonthlyQuery = db('other_incomes');
    if (!isAll) otherIncomesMonthlyQuery = otherIncomesMonthlyQuery.where('school_unit_id', schoolUnitId);
    const otherIncomesMonthly = await otherIncomesMonthlyQuery
      .select(
        db.raw("DATE_FORMAT(received_at, '%Y-%m') as month"),
        db.raw('SUM(amount) as total_amount')
      )
      .groupBy('month');

    const incomeMap = {};
    billPaymentsMonthly.forEach(bp => {
      incomeMap[bp.month] = (incomeMap[bp.month] || 0) + parseFloat(bp.total_amount || 0);
    });
    otherIncomesMonthly.forEach(oi => {
      incomeMap[oi.month] = (incomeMap[oi.month] || 0) + parseFloat(oi.total_amount || 0);
    });

    const monthlyIncomeChart = Object.keys(incomeMap).sort().map(m => ({
      month: m,
      amount: incomeMap[m]
    }));

    // 4. Chart Pengeluaran Bulanan (dari expenses & payroll_disbursements)
    let expensesMonthlyQuery = db('expenses').whereNull('deleted_at');
    if (!isAll) expensesMonthlyQuery = expensesMonthlyQuery.where('school_unit_id', schoolUnitId);
    const expensesMonthly = await expensesMonthlyQuery
      .select(
        db.raw("DATE_FORMAT(expense_date, '%Y-%m') as month"),
        db.raw('SUM(total_amount) as total_amount')
      )
      .groupBy('month');

    let payrollMonthlyQuery = db('payroll_disbursements').where('status', 'disbursed');
    if (!isAll) payrollMonthlyQuery = payrollMonthlyQuery.where('school_unit_id', schoolUnitId);
    const payrollMonthly = await payrollMonthlyQuery
      .select(
        db.raw("DATE_FORMAT(disbursed_at, '%Y-%m') as month"),
        db.raw('SUM(amount) as total_amount')
      )
      .groupBy('month');

    const expenseMap = {};
    expensesMonthly.forEach(ex => {
      expenseMap[ex.month] = (expenseMap[ex.month] || 0) + parseFloat(ex.total_amount || 0);
    });
    payrollMonthly.forEach(pr => {
      expenseMap[pr.month] = (expenseMap[pr.month] || 0) + parseFloat(pr.total_amount || 0);
    });

    const monthlyExpenseChart = Object.keys(expenseMap).sort().map(m => ({
      month: m,
      amount: expenseMap[m]
    }));

    // 5. Realisasi Anggaran RAPBS (Per Program & Per Item Belanja)
    let latestPlanQuery = db('budget_plans').where('status', 'published');
    if (!isAll) latestPlanQuery = latestPlanQuery.where('school_unit_id', schoolUnitId);
    latestPlanQuery = latestPlanQuery.orderBy('version', 'desc');
    if (academicYearId) latestPlanQuery = latestPlanQuery.where('academic_year_id', academicYearId);

    const latestPlan = await latestPlanQuery.first();
    let budgetRealizationPercentage = 0;
    let overBudgetAlerts = [];
    let budgetRealizationByItem = [];

    if (latestPlan) {
      const realization = await budgetService.getBudgetRealization(latestPlan.school_unit_id || schoolUnitId, latestPlan.id);
      if (realization) {
        budgetRealizationPercentage = realization.overall_absorption_percentage;
        overBudgetAlerts = realization.programs
          .filter(p => p.is_over_budget)
          .map(p => ({
            budget_program_id: p.budget_program_id,
            program_name: p.program_name,
            planned_amount: p.planned_amount,
            realized_amount: p.realized_amount,
            absorption_percentage: p.absorption_percentage
          }));
      }

      // Ambil rincian per item belanja RAPBS
      const expenseItems = await db('budget_plan_expense_items')
        .where('budget_plan_id', latestPlan.id)
        .select('id', 'name', 'planned_amount');

      budgetRealizationByItem = await Promise.all(expenseItems.map(async it => {
        const spent = await db('expenses')
          .where('budget_plan_expense_item_id', it.id)
          .whereNull('deleted_at')
          .sum('total_amount as sum')
          .first();

        const planned = parseFloat(it.planned_amount || 0);
        const realized = parseFloat(spent?.sum || 0);
        const remaining = Math.max(0, planned - realized);
        const pct = planned > 0 ? (realized / planned) * 100 : 0;

        return {
          item_id: it.id,
          item_name: it.name,
          planned_amount: planned,
          realized_amount: realized,
          remaining_amount: remaining,
          absorption_percentage: Math.round(pct * 10) / 10,
          is_over_budget: realized > planned
        };
      }));

      // Sort by realization or highest absorption
      budgetRealizationByItem.sort((a, b) => b.realized_amount - a.realized_amount);
    }

    // 6. Grafik / Tabel Piutang Tertunggak per Skema Biaya
    let outstandingBillsQuery = db('student_bills')
      .whereIn('student_bills.status', ['unpaid', 'partially_paid']);
    if (!isAll) outstandingBillsQuery = outstandingBillsQuery.where('student_bills.school_unit_id', schoolUnitId);

    const outstandingBills = await outstandingBillsQuery
      .select('student_bills.id', 'student_bills.student_id', 'student_bills.amount', 'student_bills.discount_amount');

    // Ambil pembayaran masing-masing
    const billIds = outstandingBills.map(b => b.id);
    const paidByBill = {};
    if (billIds.length > 0) {
      const pmts = await db('bill_payments')
        .whereIn('student_bill_id', billIds)
        .groupBy('student_bill_id')
        .select('student_bill_id', db.raw('SUM(amount) as paid_sum'));
      pmts.forEach(p => { paidByBill[p.student_bill_id] = parseFloat(p.paid_sum || 0); });
    }

    // Map student to fee scheme
    const studentIds = [...new Set(outstandingBills.map(b => b.student_id))];
    const schemeMapByStudent = {};
    if (studentIds.length > 0) {
      const assignments = await db('student_fee_scheme_assignments')
        .join('fee_schemes', 'student_fee_scheme_assignments.fee_scheme_id', 'fee_schemes.id')
        .whereIn('student_fee_scheme_assignments.student_id', studentIds)
        .select('student_fee_scheme_assignments.student_id', 'fee_schemes.name as scheme_name');

      assignments.forEach(a => {
        schemeMapByStudent[a.student_id] = a.scheme_name;
      });
    }

    const schemeAggMap = {};
    outstandingBills.forEach(b => {
      const schemeName = schemeMapByStudent[b.student_id] || 'Skema Standar / Reguler';
      if (!schemeAggMap[schemeName]) {
        schemeAggMap[schemeName] = {
          scheme_name: schemeName,
          outstanding_amount: 0,
          bills_count: 0,
          students_set: new Set()
        };
      }
      const paid = paidByBill[b.id] || 0;
      const rem = Math.max(0, parseFloat(b.amount || 0) - paid);
      schemeAggMap[schemeName].outstanding_amount += rem;
      schemeAggMap[schemeName].bills_count += 1;
      schemeAggMap[schemeName].students_set.add(b.student_id);
    });

    const outstandingByFeeScheme = Object.values(schemeAggMap).map(s => ({
      scheme_name: s.scheme_name,
      outstanding_amount: s.outstanding_amount,
      bills_count: s.bills_count,
      students_count: s.students_set.size
    })).sort((a, b) => b.outstanding_amount - a.outstanding_amount);

    // 6. Ringkasan Saldo Sumber Dana (Kantong Dana & Opening Pool)
    let fundBalancesData = { summary: { total_fund_in: 0, total_fund_out: 0, total_fund_balance: 0, opening_pool_balance: 0 }, funds: [] };
    try {
      fundBalancesData = await fundBalanceEngine.listFundBalances(isAll ? 1 : schoolUnitId);
    } catch (e) {}

    return {
      cash_balances: cashBalances,
      bill_status_summary: billStatusSummary,
      bill_amount_summary: billAmountSummary,
      draft_bills_count: draftBillsCount,
      draft_bills_amount: draftBillsAmount,
      pending_approval_bills_count: pendingApprovalCount,
      pending_approval_bills_amount: pendingApprovalAmount,
      monthly_income_chart: monthlyIncomeChart,
      monthly_expense_chart: monthlyExpenseChart,
      budget_realization_percentage: budgetRealizationPercentage,
      over_budget_alerts: overBudgetAlerts,
      budget_realization_by_item: budgetRealizationByItem,
      outstanding_by_fee_scheme: outstandingByFeeScheme,
      fund_balances_summary: fundBalancesData.summary,
      top_fund_balances: fundBalancesData.funds.slice(0, 5)
    };
  }
}

module.exports = new DashboardService();
