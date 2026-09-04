/**
 * Other Incomes (Penerimaan Non-SPP) Service for Keuangan Module
 * Covers Feature #22
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const { recordJournal } = require('../bookkeeping/journalEngine');
const fundBalanceEngine = require('../bookkeeping/fundBalanceEngine');

class OtherIncomesService {
  async listOtherIncomes(schoolUnitId, filters = {}) {
    let query = db('other_incomes')
      .leftJoin('transaction_categories', 'other_incomes.transaction_category_id', 'transaction_categories.id')
      .leftJoin('cash_accounts', 'other_incomes.cash_account_id', 'cash_accounts.id')
      .leftJoin('budget_plan_income_items', 'other_incomes.budget_plan_income_item_id', 'budget_plan_income_items.id')
      .where('other_incomes.school_unit_id', schoolUnitId)
      .select(
        'other_incomes.*',
        'transaction_categories.name as category_name',
        'cash_accounts.name as cash_account_name',
        'budget_plan_income_items.name as budget_income_name',
        'budget_plan_income_items.planned_amount as budget_planned_amount'
      );

    if (filters.academic_year_id) {
      query = query.where('other_incomes.academic_year_id', filters.academic_year_id);
    }
    if (filters.budget_plan_income_item_id) {
      query = query.where('other_incomes.budget_plan_income_item_id', filters.budget_plan_income_item_id);
    }
    if (filters.transaction_category_id) {
      query = query.where('other_incomes.transaction_category_id', filters.transaction_category_id);
    }
    return query.orderBy('other_incomes.received_at', 'desc');
  }

  async getOtherIncomeById(schoolUnitId, id) {
    return db('other_incomes')
      .leftJoin('transaction_categories', 'other_incomes.transaction_category_id', 'transaction_categories.id')
      .leftJoin('cash_accounts', 'other_incomes.cash_account_id', 'cash_accounts.id')
      .leftJoin('budget_plan_income_items', 'other_incomes.budget_plan_income_item_id', 'budget_plan_income_items.id')
      .where({ 'other_incomes.id': id, 'other_incomes.school_unit_id': schoolUnitId })
      .select(
        'other_incomes.*',
        'transaction_categories.name as category_name',
        'cash_accounts.name as cash_account_name',
        'budget_plan_income_items.name as budget_income_name',
        'budget_plan_income_items.planned_amount as budget_planned_amount'
      )
      .first();
  }

  async getRapbsIncomeSources(schoolUnitId, academicYearId = null) {
    let query = db('budget_plan_income_items')
      .join('budget_plans', 'budget_plan_income_items.budget_plan_id', 'budget_plans.id')
      .where('budget_plans.school_unit_id', schoolUnitId);

    if (academicYearId) {
      query = query.where('budget_plans.academic_year_id', Number(academicYearId));
    }

    const items = await query.select(
      'budget_plan_income_items.id',
      'budget_plan_income_items.name',
      'budget_plan_income_items.planned_amount',
      'budget_plan_income_items.fee_type_id',
      'budget_plans.id as budget_plan_id',
      'budget_plans.title as budget_plan_title',
      'budget_plans.academic_year_id'
    );

    const results = await Promise.all(items.map(async (item) => {
      const real = await db('other_incomes')
        .where('budget_plan_income_item_id', item.id)
        .sum('amount as total_realized')
        .first();

      const totalRealized = real?.total_realized ? parseFloat(real.total_realized) : 0;
      const planned = parseFloat(item.planned_amount || 0);
      const remaining = Math.max(0, planned - totalRealized);
      const percent = planned > 0 ? Math.round((totalRealized / planned) * 10000) / 100 : 0;

      return {
        ...item,
        planned_amount: planned,
        total_realized: totalRealized,
        remaining_amount: remaining,
        realization_percentage: percent
      };
    }));

    return results;
  }

  async createOtherIncome(schoolUnitId, data, userId = null) {
    return db.transaction(async (trx) => {
      const amount = parseFloat(data.amount);
      const receivedAt = data.received_at || new Date().toISOString().slice(0, 10);
      const academicYearId = data.academic_year_id || 1;
      const cashAccountId = data.override_cash_account_id ? Number(data.override_cash_account_id) : data.cash_account_id;

      let budgetPlanIncomeItemId = data.budget_plan_income_item_id ? Number(data.budget_plan_income_item_id) : null;
      let transactionCategoryId = data.transaction_category_id ? Number(data.transaction_category_id) : null;
      let incomeSourceName = data.notes || 'Penerimaan Lain';

      if (budgetPlanIncomeItemId) {
        const bpItem = await trx('budget_plan_income_items')
          .join('budget_plans', 'budget_plan_income_items.budget_plan_id', 'budget_plans.id')
          .where({
            'budget_plan_income_items.id': budgetPlanIncomeItemId,
            'budget_plans.school_unit_id': schoolUnitId
          })
          .select('budget_plan_income_items.*')
          .first();

        if (!bpItem) {
          const err = new Error('Sumber Pendapatan RAPBS tidak ditemukan pada satuan pendidikan ini');
          err.statusCode = 404;
          throw err;
        }
        incomeSourceName = bpItem.name;

        // Auto assign category if not provided
        if (!transactionCategoryId) {
          const defaultCat = await trx('transaction_categories')
            .where({ school_unit_id: schoolUnitId, category_kind: 'special_income' })
            .first();
          if (defaultCat) transactionCategoryId = defaultCat.id;
          else {
            const anyCat = await trx('transaction_categories').where({ school_unit_id: schoolUnitId }).first();
            transactionCategoryId = anyCat ? anyCat.id : 1;
          }
        }
      }

      if (!transactionCategoryId) {
        const anyCat = await trx('transaction_categories').where({ school_unit_id: schoolUnitId }).first();
        transactionCategoryId = anyCat ? anyCat.id : 1;
      }

      const [id] = await trx('other_incomes').insert({
        school_unit_id: schoolUnitId,
        academic_year_id: academicYearId,
        transaction_category_id: transactionCategoryId,
        budget_plan_income_item_id: budgetPlanIncomeItemId,
        cash_account_id: cashAccountId,
        amount: amount,
        received_at: receivedAt,
        notes: data.notes || incomeSourceName
      });

      const actualId = id || (await trx('other_incomes').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

      // Auto journal via journalEngine
      try {
        await recordJournal({
          schoolUnitId,
          transactionCode: 'other_income_default',
          amount: amount,
          sourceType: 'other_income',
          sourceId: actualId,
          description: `Penerimaan Sumber Lain: ${incomeSourceName} #${actualId}`,
          journalDate: receivedAt,
          overrideDebitAccountId: data.override_debit_account_id || null,
          overrideCreditAccountId: data.override_credit_account_id || null,
          overrideCashAccountId: data.override_cash_account_id || null,
          overrideReason: data.override_reason || null,
          userId,
          trx
        });
      } catch (journalErr) {
        if (journalErr.statusCode === 422) throw journalErr;
        console.warn('Auto journal skipped or error:', journalErr.message);
      }

      // Mutasi kantong dana penerimaan non-SPP
      try {
        await fundBalanceEngine.applyFundMutation({
          schoolUnitId,
          fundType: budgetPlanIncomeItemId ? 'budget_income_item' : 'transaction_category',
          fundRefId: budgetPlanIncomeItemId || transactionCategoryId,
          academicYearId: Number(academicYearId),
          direction: 'in',
          amount: amount,
          sourceTable: 'other_incomes',
          sourceId: actualId,
          notes: `Penerimaan Sumber Lain: ${incomeSourceName} #${actualId}`,
          userId,
          trx
        });
      } catch (fbErr) {
        console.warn('Fund balance mutation for other income skipped or error:', fbErr.message);
      }

      const created = await trx('other_incomes').where({ id: actualId }).first();

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'CREATE_OTHER_INCOME',
        entityType: 'other_income',
        entityId: actualId,
        dataAfter: created,
        trx
      });

      return created;
    });
  }

  async updateOtherIncome(schoolUnitId, id, data, userId = null) {
    const before = await this.getOtherIncomeById(schoolUnitId, id);
    if (!before) return null;

    await db('other_incomes')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        transaction_category_id: data.transaction_category_id !== undefined ? data.transaction_category_id : before.transaction_category_id,
        cash_account_id: data.cash_account_id !== undefined ? data.cash_account_id : before.cash_account_id,
        amount: data.amount !== undefined ? parseFloat(data.amount) : before.amount,
        received_at: data.received_at || before.received_at,
        notes: data.notes !== undefined ? data.notes : before.notes
      });

    const updated = await this.getOtherIncomeById(schoolUnitId, id);

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_OTHER_INCOME',
      entityType: 'other_income',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });

    return updated;
  }

  async deleteOtherIncome(schoolUnitId, id, userId = null) {
    const before = await this.getOtherIncomeById(schoolUnitId, id);
    if (!before) return false;

    await db('other_incomes')
      .where({ id, school_unit_id: schoolUnitId })
      .delete();

    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'DELETE_OTHER_INCOME',
      entityType: 'other_income',
      entityId: id,
      dataBefore: before
    });

    return true;
  }
}

module.exports = new OtherIncomesService();
