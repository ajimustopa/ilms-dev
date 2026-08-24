/**
 * Other Incomes (Penerimaan Non-SPP) Service for Keuangan Module
 * Covers Feature #22
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const { recordJournal } = require('../bookkeeping/journalEngine');

class OtherIncomesService {
  async listOtherIncomes(schoolUnitId, filters = {}) {
    let query = db('other_incomes')
      .join('transaction_categories', 'other_incomes.transaction_category_id', 'transaction_categories.id')
      .join('cash_accounts', 'other_incomes.cash_account_id', 'cash_accounts.id')
      .where('other_incomes.school_unit_id', schoolUnitId)
      .select(
        'other_incomes.*',
        'transaction_categories.name as category_name',
        'cash_accounts.name as cash_account_name'
      );

    if (filters.academic_year_id) {
      query = query.where('other_incomes.academic_year_id', filters.academic_year_id);
    }
    if (filters.transaction_category_id) {
      query = query.where('other_incomes.transaction_category_id', filters.transaction_category_id);
    }
    return query.orderBy('other_incomes.received_at', 'desc');
  }

  async getOtherIncomeById(schoolUnitId, id) {
    return db('other_incomes')
      .join('transaction_categories', 'other_incomes.transaction_category_id', 'transaction_categories.id')
      .join('cash_accounts', 'other_incomes.cash_account_id', 'cash_accounts.id')
      .where({ 'other_incomes.id': id, 'other_incomes.school_unit_id': schoolUnitId })
      .select(
        'other_incomes.*',
        'transaction_categories.name as category_name',
        'cash_accounts.name as cash_account_name'
      )
      .first();
  }

  async createOtherIncome(schoolUnitId, data, userId = null) {
    return db.transaction(async (trx) => {
      const amount = parseFloat(data.amount);
      const receivedAt = data.received_at || new Date().toISOString().slice(0, 10);
      const academicYearId = data.academic_year_id || 1;

      const [id] = await trx('other_incomes').insert({
        school_unit_id: schoolUnitId,
        academic_year_id: academicYearId,
        transaction_category_id: data.transaction_category_id,
        cash_account_id: data.cash_account_id,
        amount: amount,
        received_at: receivedAt,
        notes: data.notes || null
      });

      const actualId = id || (await trx('other_incomes').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

      // Auto journal via journalEngine
      try {
        await recordJournal({
          schoolUnitId,
          transactionCode: 'other_income',
          amount: amount,
          sourceType: 'other_income',
          sourceId: actualId,
          description: `Penerimaan Non-SPP #${actualId} (${data.notes || 'Pemasukan Lain'})`,
          journalDate: receivedAt,
          trx
        });
      } catch (journalErr) {
        console.warn('Auto journal skipped or error:', journalErr.message);
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
