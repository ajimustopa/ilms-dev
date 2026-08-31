/**
 * Expenses (Pengeluaran) Service for Keuangan Module
 * Covers Features #23 & #24
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const { recordJournal } = require('../bookkeeping/journalEngine');

class ExpensesService {
  async listExpenses(schoolUnitId, filters = {}) {
    let query = db('expenses')
      .leftJoin('budget_plan_expense_items', 'expenses.budget_plan_expense_item_id', 'budget_plan_expense_items.id')
      .where('expenses.school_unit_id', schoolUnitId)
      .whereNull('expenses.deleted_at')
      .select(
        'expenses.*',
        'budget_plan_expense_items.name as budget_item_name'
      );

    if (filters.budget_plan_expense_item_id) {
      query = query.where('expenses.budget_plan_expense_item_id', filters.budget_plan_expense_item_id);
    }
    if (filters.date_from) {
      query = query.where('expenses.expense_date', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('expenses.expense_date', '<=', filters.date_to);
    }
    return query.orderBy('expenses.expense_date', 'desc');
  }

  async getExpenseById(schoolUnitId, id) {
    return db('expenses')
      .leftJoin('budget_plan_expense_items', 'expenses.budget_plan_expense_item_id', 'budget_plan_expense_items.id')
      .where({ 'expenses.id': id, 'expenses.school_unit_id': schoolUnitId })
      .select(
        'expenses.*',
        'budget_plan_expense_items.name as budget_item_name'
      )
      .first();
  }

  async createExpense(schoolUnitId, data, userId = null) {
    const unitPrice = parseFloat(data.unit_price || 0);
    const quantity = parseFloat(data.quantity || 1);
    const totalAmount = unitPrice * quantity;

    return db.transaction(async (trx) => {
      const [id] = await trx('expenses').insert({
        school_unit_id: schoolUnitId,
        budget_plan_expense_item_id: data.budget_plan_expense_item_id || null,
        item_name: data.item_name,
        unit: data.unit || null,
        unit_price: unitPrice,
        quantity: quantity,
        total_amount: totalAmount,
        vendor: data.vendor || null,
        expense_date: data.expense_date || new Date().toISOString().slice(0, 10),
        proof_number: data.proof_number || null,
        notes: data.notes || null
      });

      const actualId = id || (await trx('expenses').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

      // Buat jurnal otomatis via journalEngine
      try {
        await recordJournal({
          schoolUnitId,
          transactionCode: 'expense',
          amount: totalAmount,
          sourceType: 'expense',
          sourceId: actualId,
          description: `Pengeluaran: ${data.item_name} (${data.vendor || 'Vendor'})`,
          journalDate: data.expense_date || new Date(),
          trx
        });
      } catch (journalErr) {
        console.warn('Auto journal skipped or error:', journalErr.message);
      }

      const created = await trx('expenses').where({ id: actualId }).first();

      // Cek apakah melebihi pagu anggaran RAPBS (Fitur #24)
      let budgetWarning = null;
      if (data.budget_plan_expense_item_id) {
        const item = await trx('budget_plan_expense_items')
          .where({ id: data.budget_plan_expense_item_id })
          .first();
        if (item) {
          const realized = await trx('expenses')
            .where({ budget_plan_expense_item_id: item.id })
            .whereNull('deleted_at')
            .sum('total_amount as sum')
            .first();
          const currentTotal = parseFloat(realized?.sum || 0);
          const budgetPagu = parseFloat(item.planned_amount || item.total_price || 0);
          if (currentTotal > budgetPagu) {
            budgetWarning = `Peringatan: Total realisasi (Rp ${currentTotal.toLocaleString('id-ID')}) melebihi pagu anggaran RAPBS (Rp ${budgetPagu.toLocaleString('id-ID')}) sebesar Rp ${(currentTotal - budgetPagu).toLocaleString('id-ID')}`;
          }
        }
      }

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'CREATE_EXPENSE',
        entityType: 'expense',
        entityId: actualId,
        dataAfter: { ...created, budget_warning: budgetWarning },
        trx
      });

      return {
        ...created,
        budget_warning: budgetWarning,
        is_over_budget: Boolean(budgetWarning)
      };
    });
  }

  async updateExpense(schoolUnitId, id, data, userId = null) {
    const before = await this.getExpenseById(schoolUnitId, id);
    if (!before || before.deleted_at) return null;

    const unitPrice = data.unit_price !== undefined ? parseFloat(data.unit_price) : parseFloat(before.unit_price);
    const quantity = data.quantity !== undefined ? parseFloat(data.quantity) : parseFloat(before.quantity);
    const totalAmount = unitPrice * quantity;

    const previousSnapshot = {
      item_name: before.item_name,
      unit_price: before.unit_price,
      quantity: before.quantity,
      total_amount: before.total_amount,
      vendor: before.vendor,
      expense_date: before.expense_date
    };

    await db('expenses')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        budget_plan_expense_item_id: data.budget_plan_expense_item_id !== undefined ? data.budget_plan_expense_item_id : before.budget_plan_expense_item_id,
        item_name: data.item_name || before.item_name,
        unit: data.unit !== undefined ? data.unit : before.unit,
        unit_price: unitPrice,
        quantity: quantity,
        total_amount: totalAmount,
        vendor: data.vendor !== undefined ? data.vendor : before.vendor,
        expense_date: data.expense_date || before.expense_date,
        proof_number: data.proof_number !== undefined ? data.proof_number : before.proof_number,
        notes: data.notes !== undefined ? data.notes : before.notes,
        previous_data: JSON.stringify(previousSnapshot)
      });

    const updated = await this.getExpenseById(schoolUnitId, id);

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_EXPENSE',
      entityType: 'expense',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });

    return updated;
  }

  async softDeleteExpense(schoolUnitId, id, reason, userId = null) {
    const before = await this.getExpenseById(schoolUnitId, id);
    if (!before || before.deleted_at) return null;

    await db('expenses')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        deleted_reason: reason || 'Dihapus oleh user',
        deleted_at: db.fn.now()
      });

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'SOFT_DELETE_EXPENSE',
      entityType: 'expense',
      entityId: id,
      dataBefore: before,
      dataAfter: { deleted_reason: reason, deleted_at: new Date() }
    });

    return true;
  }
}

module.exports = new ExpensesService();
