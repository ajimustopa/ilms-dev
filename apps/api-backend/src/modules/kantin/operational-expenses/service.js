/**
 * Operational Expenses Service
 * Sesuai api-contract-kantin.md Modul 7 & erd-kantin.md §2.16
 */
const db = require('../../../config/db/kantin');

class OperationalExpensesService {
  async listExpenses(schoolUnitId, query = {}) {
    let q = db('operational_expenses').where('school_unit_id', schoolUnitId);

    if (query.date_from) {
      q = q.where('expense_date', '>=', query.date_from);
    }
    if (query.date_to) {
      q = q.where('expense_date', '<=', query.date_to);
    }
    if (query.search) {
      q = q.where('expense_name', 'like', `%${query.search}%`);
    }

    return q.orderBy('expense_date', 'desc').orderBy('id', 'desc');
  }

  async createExpense(schoolUnitId, payload, userId) {
    const { expense_name, amount, expense_date, note = null } = payload;
    const expenseAmount = parseFloat(amount);

    if (expenseAmount <= 0) {
      const err = new Error('Nominal pengeluaran operasional harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    const [id] = await db('operational_expenses').insert({
      school_unit_id: schoolUnitId,
      expense_name,
      amount: expenseAmount,
      expense_date: expense_date || new Date().toISOString().slice(0, 10),
      note,
      recorded_by: userId
    });

    return db('operational_expenses').where({ id }).first();
  }
}

module.exports = new OperationalExpensesService();
