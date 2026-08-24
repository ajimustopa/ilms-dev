/**
 * Dashboard Service for Keuangan Module
 * Covers Feature #34
 */
const db = require('../../../config/db/keuangan');
const masterDataService = require('../master-data/service');
const budgetService = require('../budget/service');

class DashboardService {
  async getDashboardSummary(schoolUnitId, academicYearId = null) {
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

    // 2. Ringkasan Status Tagihan
    const billCounts = await db('student_bills')
      .where('school_unit_id', schoolUnitId)
      .groupBy('status')
      .select('status', db.raw('COUNT(id) as total_count'));

    const billStatusSummary = { unpaid: 0, partially_paid: 0, paid: 0, cancelled: 0 };
    billCounts.forEach(b => {
      billStatusSummary[b.status] = parseInt(b.total_count, 10);
    });

    // 3. Chart Pemasukan Bulanan (dari bill_payments & other_incomes)
    const billPaymentsMonthly = await db('bill_payments')
      .join('student_bills', 'bill_payments.student_bill_id', 'student_bills.id')
      .where('student_bills.school_unit_id', schoolUnitId)
      .select(
        db.raw("DATE_FORMAT(bill_payments.paid_at, '%Y-%m') as month"),
        db.raw('SUM(bill_payments.amount) as total_amount')
      )
      .groupBy('month');

    const otherIncomesMonthly = await db('other_incomes')
      .where('school_unit_id', schoolUnitId)
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
    const expensesMonthly = await db('expenses')
      .where('school_unit_id', schoolUnitId)
      .whereNull('deleted_at')
      .select(
        db.raw("DATE_FORMAT(expense_date, '%Y-%m') as month"),
        db.raw('SUM(total_amount) as total_amount')
      )
      .groupBy('month');

    const payrollMonthly = await db('payroll_disbursements')
      .where({ school_unit_id: schoolUnitId, status: 'disbursed' })
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

    // 5. Realisasi Anggaran RAPBS
    let latestPlanQuery = db('budget_plans')
      .where({ school_unit_id: schoolUnitId, status: 'published' })
      .orderBy('version', 'desc');
    if (academicYearId) latestPlanQuery = latestPlanQuery.where('academic_year_id', academicYearId);

    const latestPlan = await latestPlanQuery.first();
    let budgetRealizationPercentage = 0;
    let overBudgetAlerts = [];

    if (latestPlan) {
      const realization = await budgetService.getBudgetRealization(schoolUnitId, latestPlan.id);
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
    }

    return {
      cash_balances: cashBalances,
      bill_status_summary: billStatusSummary,
      monthly_income_chart: monthlyIncomeChart,
      monthly_expense_chart: monthlyExpenseChart,
      budget_realization_percentage: budgetRealizationPercentage,
      over_budget_alerts: overBudgetAlerts
    };
  }
}

module.exports = new DashboardService();
