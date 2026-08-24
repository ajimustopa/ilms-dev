/**
 * Budget (RAPBS) Service for Keuangan Module
 * Covers Features #10, #11, #12
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');

class BudgetService {
  // ============================================================
  // 1. BUDGET PLANS (Fitur #10 & #11)
  // ============================================================

  async listBudgetPlans(schoolUnitId, filters = {}) {
    let query = db('budget_plans').where('school_unit_id', schoolUnitId);
    if (filters.academic_year_id) {
      query = query.where('academic_year_id', filters.academic_year_id);
    }
    if (filters.status) {
      query = query.where('status', filters.status);
    }
    return query.orderBy('version', 'desc');
  }

  async getBudgetPlanById(schoolUnitId, id) {
    const plan = await db('budget_plans')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!plan) return null;

    const incomeItems = await db('budget_plan_income_items')
      .where('budget_plan_id', id);

    const expenseItems = await db('budget_plan_expense_items')
      .leftJoin('budget_programs', 'budget_plan_expense_items.budget_program_id', 'budget_programs.id')
      .where('budget_plan_expense_items.budget_plan_id', id)
      .select(
        'budget_plan_expense_items.*',
        'budget_programs.name as budget_program_name'
      );

    const totalIncome = incomeItems.reduce((acc, item) => acc + parseFloat(item.planned_amount || 0), 0);
    const totalExpense = expenseItems.reduce((acc, item) => acc + parseFloat(item.planned_amount || 0), 0);

    return {
      ...plan,
      total_planned_income: totalIncome,
      total_planned_expense: totalExpense,
      income_items: incomeItems,
      expense_items: expenseItems
    };
  }

  async createBudgetPlanDraft(schoolUnitId, data, userId = null) {
    // Cari versi terakhir untuk academic_year_id tersebut
    const lastPlan = await db('budget_plans')
      .where({
        school_unit_id: schoolUnitId,
        academic_year_id: data.academic_year_id
      })
      .orderBy('version', 'desc')
      .first();

    const newVersion = lastPlan ? lastPlan.version + 1 : 1;

    const [id] = await db('budget_plans').insert({
      school_unit_id: schoolUnitId,
      academic_year_id: data.academic_year_id,
      version: newVersion,
      status: 'draft'
    });

    const created = await this.getBudgetPlanById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'CREATE_BUDGET_PLAN_DRAFT',
      entityType: 'budget_plan',
      entityId: id,
      dataAfter: created
    });
    return created;
  }

  async createNewVersionFromPublished(schoolUnitId, planId, revisionReason, userId = null) {
    const existing = await this.getBudgetPlanById(schoolUnitId, planId);
    if (!existing) return null;

    const newVersion = existing.version + 1;

    const [newPlanId] = await db('budget_plans').insert({
      school_unit_id: schoolUnitId,
      academic_year_id: existing.academic_year_id,
      version: newVersion,
      status: 'draft',
      revision_reason: revisionReason
    });

    // Duplikasi income items
    if (existing.income_items && existing.income_items.length > 0) {
      const incomesToInsert = existing.income_items.map(item => ({
        budget_plan_id: newPlanId,
        name: item.name,
        planned_amount: item.planned_amount
      }));
      await db('budget_plan_income_items').insert(incomesToInsert);
    }

    // Duplikasi expense items
    if (existing.expense_items && existing.expense_items.length > 0) {
      const expensesToInsert = existing.expense_items.map(item => ({
        budget_plan_id: newPlanId,
        budget_program_id: item.budget_program_id,
        name: item.name,
        planned_amount: item.planned_amount
      }));
      await db('budget_plan_expense_items').insert(expensesToInsert);
    }

    const created = await this.getBudgetPlanById(schoolUnitId, newPlanId);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'REVISE_BUDGET_PLAN_VERSION',
      entityType: 'budget_plan',
      entityId: newPlanId,
      dataAfter: created
    });
    return created;
  }

  async publishBudgetPlan(schoolUnitId, id, userId = null) {
    const plan = await db('budget_plans')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!plan) return null;

    await db('budget_plans')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'published',
        published_at: db.fn.now()
      });

    const updated = await this.getBudgetPlanById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'PUBLISH_BUDGET_PLAN',
      entityType: 'budget_plan',
      entityId: id,
      dataBefore: plan,
      dataAfter: updated
    });
    return updated;
  }

  // ============================================================
  // 2. INCOME & EXPENSE ITEMS
  // ============================================================

  async addIncomeItem(schoolUnitId, planId, data, userId = null) {
    const plan = await db('budget_plans').where({ id: planId, school_unit_id: schoolUnitId }).first();
    if (!plan || plan.status !== 'draft') return null;

    const [id] = await db('budget_plan_income_items').insert({
      budget_plan_id: planId,
      name: data.name,
      planned_amount: data.planned_amount
    });
    return db('budget_plan_income_items').where({ id }).first();
  }

  async updateIncomeItem(schoolUnitId, planId, itemId, data, userId = null) {
    const plan = await db('budget_plans').where({ id: planId, school_unit_id: schoolUnitId }).first();
    if (!plan || plan.status !== 'draft') return null;

    await db('budget_plan_income_items')
      .where({ id: itemId, budget_plan_id: planId })
      .update({
        name: data.name,
        planned_amount: data.planned_amount
      });
    return db('budget_plan_income_items').where({ id: itemId }).first();
  }

  async deleteIncomeItem(schoolUnitId, planId, itemId, userId = null) {
    const plan = await db('budget_plans').where({ id: planId, school_unit_id: schoolUnitId }).first();
    if (!plan || plan.status !== 'draft') return false;

    await db('budget_plan_income_items')
      .where({ id: itemId, budget_plan_id: planId })
      .delete();
    return true;
  }

  async addExpenseItem(schoolUnitId, planId, data, userId = null) {
    const plan = await db('budget_plans').where({ id: planId, school_unit_id: schoolUnitId }).first();
    if (!plan || plan.status !== 'draft') return null;

    const [id] = await db('budget_plan_expense_items').insert({
      budget_plan_id: planId,
      budget_program_id: data.budget_program_id,
      name: data.name,
      planned_amount: data.planned_amount
    });
    return db('budget_plan_expense_items').where({ id }).first();
  }

  async updateExpenseItem(schoolUnitId, planId, itemId, data, userId = null) {
    const plan = await db('budget_plans').where({ id: planId, school_unit_id: schoolUnitId }).first();
    if (!plan || plan.status !== 'draft') return null;

    await db('budget_plan_expense_items')
      .where({ id: itemId, budget_plan_id: planId })
      .update({
        budget_program_id: data.budget_program_id,
        name: data.name,
        planned_amount: data.planned_amount
      });
    return db('budget_plan_expense_items').where({ id: itemId }).first();
  }

  async deleteExpenseItem(schoolUnitId, planId, itemId, userId = null) {
    const plan = await db('budget_plans').where({ id: planId, school_unit_id: schoolUnitId }).first();
    if (!plan || plan.status !== 'draft') return false;

    await db('budget_plan_expense_items')
      .where({ id: itemId, budget_plan_id: planId })
      .delete();
    return true;
  }

  // ============================================================
  // 3. REALISASI VS RENCANA ANGGARAN (Fitur #12 - Real-Time Agregat)
  // ============================================================

  async getBudgetRealization(schoolUnitId, budgetPlanId) {
    const plan = await db('budget_plans')
      .where({ id: budgetPlanId, school_unit_id: schoolUnitId })
      .first();

    if (!plan) return null;

    // Ambil seluruh expense items dan agregat pengeluaran riil per item & program
    const items = await db('budget_plan_expense_items')
      .join('budget_programs', 'budget_plan_expense_items.budget_program_id', 'budget_programs.id')
      .leftJoin('expenses', function() {
        this.on('expenses.budget_plan_expense_item_id', '=', 'budget_plan_expense_items.id')
            .andOnNull('expenses.deleted_at');
      })
      .where('budget_plan_expense_items.budget_plan_id', budgetPlanId)
      .groupBy(
        'budget_programs.id',
        'budget_programs.name',
        'budget_plan_expense_items.id',
        'budget_plan_expense_items.name',
        'budget_plan_expense_items.planned_amount'
      )
      .select(
        'budget_programs.id as budget_program_id',
        'budget_programs.name as program_name',
        'budget_plan_expense_items.id as expense_item_id',
        'budget_plan_expense_items.name as item_name',
        'budget_plan_expense_items.planned_amount',
        db.raw('COALESCE(SUM(expenses.total_amount), 0) as realized_amount')
      );

    // Grouping by budget_program_id
    const programMap = {};
    let grandPlanned = 0;
    let grandRealized = 0;

    items.forEach(it => {
      const pId = it.budget_program_id;
      const planned = parseFloat(it.planned_amount || 0);
      const realized = parseFloat(it.realized_amount || 0);

      grandPlanned += planned;
      grandRealized += realized;

      if (!programMap[pId]) {
        programMap[pId] = {
          budget_program_id: pId,
          program_name: it.program_name,
          planned_amount: 0,
          realized_amount: 0,
          items: []
        };
      }

      programMap[pId].planned_amount += planned;
      programMap[pId].realized_amount += realized;
      programMap[pId].items.push({
        expense_item_id: it.expense_item_id,
        item_name: it.item_name,
        planned_amount: planned,
        realized_amount: realized,
        absorption_percentage: planned > 0 ? Number(((realized / planned) * 100).toFixed(2)) : 0
      });
    });

    const programs = Object.values(programMap).map(p => {
      const absorption = p.planned_amount > 0 ? Number(((p.realized_amount / p.planned_amount) * 100).toFixed(2)) : 0;
      return {
        ...p,
        absorption_percentage: absorption,
        is_over_budget: p.realized_amount > p.planned_amount
      };
    });

    const overallAbsorption = grandPlanned > 0 ? Number(((grandRealized / grandPlanned) * 100).toFixed(2)) : 0;

    return {
      budget_plan_id: Number(budgetPlanId),
      academic_year_id: plan.academic_year_id,
      version: plan.version,
      status: plan.status,
      total_planned_amount: grandPlanned,
      total_realized_amount: grandRealized,
      overall_absorption_percentage: overallAbsorption,
      programs
    };
  }
}

module.exports = new BudgetService();
