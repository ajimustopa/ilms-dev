/**
 * Master Data Service for Keuangan Module
 * Covers Features #1 - #9
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');

class MasterDataService {
  // ============================================================
  // 1. CASH ACCOUNTS (Fitur #1 & Saldo Berjalan)
  // ============================================================

  async listCashAccounts(schoolUnitId, filters = {}) {
    let query = db('cash_accounts').where('school_unit_id', schoolUnitId);
    if (filters.is_active !== undefined) {
      const isActive = filters.is_active === 'true' || filters.is_active === true;
      query = query.where('is_active', isActive);
    }
    if (filters.account_kind) {
      query = query.where('account_kind', filters.account_kind);
    }
    return query.orderBy('id', 'asc');
  }

  async getCashAccountById(schoolUnitId, id) {
    return db('cash_accounts')
      .where({ id, school_unit_id: schoolUnitId })
      .first();
  }

  async createCashAccount(schoolUnitId, data, userId = null) {
    const [id] = await db('cash_accounts').insert({
      school_unit_id: schoolUnitId,
      name: data.name,
      account_kind: data.account_kind,
      bank_account_number: data.bank_account_number || null,
      bank_name: data.bank_name || null,
      is_active: data.is_active !== undefined ? data.is_active : true
    });
    const created = await this.getCashAccountById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'CREATE_CASH_ACCOUNT',
      entityType: 'cash_account',
      entityId: id,
      dataAfter: created
    });
    return created;
  }

  async updateCashAccount(schoolUnitId, id, data, userId = null) {
    const before = await this.getCashAccountById(schoolUnitId, id);
    if (!before) return null;

    await db('cash_accounts')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        name: data.name !== undefined ? data.name : before.name,
        account_kind: data.account_kind !== undefined ? data.account_kind : before.account_kind,
        bank_account_number: data.bank_account_number !== undefined ? data.bank_account_number : before.bank_account_number,
        bank_name: data.bank_name !== undefined ? data.bank_name : before.bank_name,
        is_active: data.is_active !== undefined ? data.is_active : before.is_active
      });

    const updated = await this.getCashAccountById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_CASH_ACCOUNT',
      entityType: 'cash_account',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });
    return updated;
  }

  async updateCashAccountStatus(schoolUnitId, id, isActive, userId = null) {
    const before = await this.getCashAccountById(schoolUnitId, id);
    if (!before) return null;

    await db('cash_accounts')
      .where({ id, school_unit_id: schoolUnitId })
      .update({ is_active: isActive });

    const updated = await this.getCashAccountById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_CASH_ACCOUNT_STATUS',
      entityType: 'cash_account',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });
    return updated;
  }

  async getCashAccountBalance(schoolUnitId, id, academicYearId = null) {
    const account = await this.getCashAccountById(schoolUnitId, id);
    if (!account) return null;

    // 1. Ambil saldo awal (opening balance)
    let openingQuery = db('cash_account_opening_balances')
      .where('cash_account_id', id);
    if (academicYearId) {
      openingQuery = openingQuery.where('academic_year_id', academicYearId);
    }
    const opening = await openingQuery.first();
    const openingBalance = opening ? parseFloat(opening.opening_balance) : 0;

    // 2. Hitung total pemasukan dari bill_payments
    const billPayments = await db('bill_payments')
      .where('cash_account_id', id)
      .sum('amount as total_in')
      .first();
    const totalPaymentsIn = billPayments?.total_in ? parseFloat(billPayments.total_in) : 0;

    // 3. Hitung total pemasukan dari other_incomes
    const otherIncomes = await db('other_incomes')
      .where({ cash_account_id: id, school_unit_id: schoolUnitId })
      .sum('amount as total_in')
      .first();
    const totalOtherIn = otherIncomes?.total_in ? parseFloat(otherIncomes.total_in) : 0;

    // 4. Hitung total pengeluaran dari payroll_disbursements
    const payrollOut = await db('payroll_disbursements')
      .where({ cash_account_id: id, school_unit_id: schoolUnitId, status: 'disbursed' })
      .sum('amount as total_out')
      .first();
    const totalPayrollOut = payrollOut?.total_out ? parseFloat(payrollOut.total_out) : 0;

    const currentBalance = openingBalance + totalPaymentsIn + totalOtherIn - totalPayrollOut;

    return {
      cash_account_id: account.id,
      name: account.name,
      account_kind: account.account_kind,
      opening_balance: openingBalance,
      total_in: totalPaymentsIn + totalOtherIn,
      total_out: totalPayrollOut,
      current_balance: currentBalance
    };
  }

  // ============================================================
  // 2. CASH ACCOUNT OPENING BALANCES (Fitur #2)
  // ============================================================

  async listOpeningBalances(schoolUnitId, filters = {}) {
    let query = db('cash_account_opening_balances')
      .join('cash_accounts', 'cash_account_opening_balances.cash_account_id', 'cash_accounts.id')
      .where('cash_accounts.school_unit_id', schoolUnitId)
      .select(
        'cash_account_opening_balances.*',
        'cash_accounts.name as cash_account_name'
      );

    if (filters.academic_year_id) {
      query = query.where('cash_account_opening_balances.academic_year_id', filters.academic_year_id);
    }
    if (filters.cash_account_id) {
      query = query.where('cash_account_opening_balances.cash_account_id', filters.cash_account_id);
    }
    return query;
  }

  async createOpeningBalance(schoolUnitId, data, userId = null) {
    const [id] = await db('cash_account_opening_balances').insert({
      cash_account_id: data.cash_account_id,
      academic_year_id: data.academic_year_id,
      opening_balance: data.opening_balance
    });
    const created = await db('cash_account_opening_balances').where({ id }).first();
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'CREATE_OPENING_BALANCE',
      entityType: 'cash_account_opening_balance',
      entityId: id,
      dataAfter: created
    });
    return created;
  }

  async updateOpeningBalance(schoolUnitId, id, data, userId = null) {
    const before = await db('cash_account_opening_balances').where({ id }).first();
    if (!before) return null;

    await db('cash_account_opening_balances').where({ id }).update({
      opening_balance: data.opening_balance !== undefined ? data.opening_balance : before.opening_balance,
      academic_year_id: data.academic_year_id !== undefined ? data.academic_year_id : before.academic_year_id
    });

    const updated = await db('cash_account_opening_balances').where({ id }).first();
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_OPENING_BALANCE',
      entityType: 'cash_account_opening_balance',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });
    return updated;
  }

  // ============================================================
  // 3. CHART OF ACCOUNTS (Fitur #3)
  // ============================================================

  async listChartOfAccounts(schoolUnitId, asTree = false) {
    const accounts = await db('chart_of_accounts')
      .where('school_unit_id', schoolUnitId)
      .orderBy('account_code', 'asc');

    if (!asTree) return accounts;

    // Convert flat list to hierarchical tree
    const map = {};
    const tree = [];
    accounts.forEach(acc => {
      map[acc.id] = { ...acc, children: [] };
    });
    accounts.forEach(acc => {
      if (acc.parent_account_id && map[acc.parent_account_id]) {
        map[acc.parent_account_id].children.push(map[acc.id]);
      } else {
        tree.push(map[acc.id]);
      }
    });
    return tree;
  }

  async getChartOfAccountById(schoolUnitId, id) {
    return db('chart_of_accounts')
      .where({ id, school_unit_id: schoolUnitId })
      .first();
  }

  async createChartOfAccount(schoolUnitId, data, userId = null) {
    let level = 1;
    if (data.parent_account_id) {
      const parent = await this.getChartOfAccountById(schoolUnitId, data.parent_account_id);
      if (parent) level = parent.level + 1;
    }

    const [id] = await db('chart_of_accounts').insert({
      school_unit_id: schoolUnitId,
      account_code: data.account_code,
      account_name: data.account_name,
      account_group: data.account_group,
      parent_account_id: data.parent_account_id || null,
      level: level,
      is_active: data.is_active !== undefined ? data.is_active : true
    });

    const created = await this.getChartOfAccountById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'CREATE_COA',
      entityType: 'chart_of_account',
      entityId: id,
      dataAfter: created
    });
    return created;
  }

  async updateChartOfAccount(schoolUnitId, id, data, userId = null) {
    const before = await this.getChartOfAccountById(schoolUnitId, id);
    if (!before) return null;

    let level = before.level;
    if (data.parent_account_id !== undefined && data.parent_account_id !== before.parent_account_id) {
      if (data.parent_account_id) {
        const parent = await this.getChartOfAccountById(schoolUnitId, data.parent_account_id);
        level = parent ? parent.level + 1 : 1;
      } else {
        level = 1;
      }
    }

    await db('chart_of_accounts')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        account_code: data.account_code || before.account_code,
        account_name: data.account_name || before.account_name,
        account_group: data.account_group || before.account_group,
        parent_account_id: data.parent_account_id !== undefined ? data.parent_account_id : before.parent_account_id,
        level: level,
        is_active: data.is_active !== undefined ? data.is_active : before.is_active
      });

    const updated = await this.getChartOfAccountById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_COA',
      entityType: 'chart_of_account',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });
    return updated;
  }

  async updateChartOfAccountStatus(schoolUnitId, id, isActive, userId = null) {
    const before = await this.getChartOfAccountById(schoolUnitId, id);
    if (!before) return null;

    await db('chart_of_accounts')
      .where({ id, school_unit_id: schoolUnitId })
      .update({ is_active: isActive });

    const updated = await this.getChartOfAccountById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_COA_STATUS',
      entityType: 'chart_of_account',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });
    return updated;
  }

  // ============================================================
  // 4. TRANSACTION ACCOUNT MAPPINGS (Fitur #4)
  // ============================================================

  async listAccountMappings(schoolUnitId) {
    return db('transaction_account_mappings')
      .leftJoin('chart_of_accounts as debit_acc', 'transaction_account_mappings.debit_account_id', 'debit_acc.id')
      .leftJoin('chart_of_accounts as credit_acc', 'transaction_account_mappings.credit_account_id', 'credit_acc.id')
      .where('transaction_account_mappings.school_unit_id', schoolUnitId)
      .select(
        'transaction_account_mappings.*',
        'debit_acc.account_code as debit_account_code',
        'debit_acc.account_name as debit_account_name',
        'credit_acc.account_code as credit_account_code',
        'credit_acc.account_name as credit_account_name'
      );
  }

  async createAccountMapping(schoolUnitId, data, userId = null) {
    const [id] = await db('transaction_account_mappings').insert({
      school_unit_id: schoolUnitId,
      transaction_code: data.transaction_code,
      transaction_label: data.transaction_label,
      debit_account_id: data.debit_account_id,
      credit_account_id: data.credit_account_id
    });
    const created = await db('transaction_account_mappings').where({ id }).first();
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'CREATE_ACCOUNT_MAPPING',
      entityType: 'transaction_account_mapping',
      entityId: id,
      dataAfter: created
    });
    return created;
  }

  async updateAccountMapping(schoolUnitId, id, data, userId = null) {
    const before = await db('transaction_account_mappings').where({ id, school_unit_id: schoolUnitId }).first();
    if (!before) return null;

    await db('transaction_account_mappings')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        transaction_label: data.transaction_label || before.transaction_label,
        debit_account_id: data.debit_account_id || before.debit_account_id,
        credit_account_id: data.credit_account_id || before.credit_account_id
      });

    const updated = await db('transaction_account_mappings').where({ id }).first();
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_ACCOUNT_MAPPING',
      entityType: 'transaction_account_mapping',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });
    return updated;
  }

  // ============================================================
  // 5. FEE TYPES (Fitur #5)
  // ============================================================

  async listFeeTypes(schoolUnitId, filters = {}) {
    let query = db('fee_types')
      .leftJoin('fee_groups', 'fee_types.fee_group_id', 'fee_groups.id')
      .where('fee_types.school_unit_id', schoolUnitId)
      .select('fee_types.*', 'fee_groups.name as fee_group_name');

    if (filters.is_active !== undefined) {
      query = query.where('fee_types.is_active', filters.is_active === 'true' || filters.is_active === true);
    }
    return query;
  }

  async createFeeType(schoolUnitId, data, userId = null) {
    const [id] = await db('fee_types').insert({
      school_unit_id: schoolUnitId,
      fee_group_id: data.fee_group_id || null,
      name: data.name,
      billing_pattern: data.billing_pattern,
      is_active: data.is_active !== undefined ? data.is_active : true
    });
    const created = await db('fee_types').where({ id }).first();
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'CREATE_FEE_TYPE',
      entityType: 'fee_type',
      entityId: id,
      dataAfter: created
    });
    return created;
  }

  async updateFeeType(schoolUnitId, id, data, userId = null) {
    const before = await db('fee_types').where({ id, school_unit_id: schoolUnitId }).first();
    if (!before) return null;

    await db('fee_types').where({ id, school_unit_id: schoolUnitId }).update({
      fee_group_id: data.fee_group_id !== undefined ? data.fee_group_id : before.fee_group_id,
      name: data.name || before.name,
      billing_pattern: data.billing_pattern || before.billing_pattern,
      is_active: data.is_active !== undefined ? data.is_active : before.is_active
    });

    const updated = await db('fee_types').where({ id }).first();
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_FEE_TYPE',
      entityType: 'fee_type',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });
    return updated;
  }

  async updateFeeTypeStatus(schoolUnitId, id, isActive, userId = null) {
    const before = await db('fee_types').where({ id, school_unit_id: schoolUnitId }).first();
    if (!before) return null;

    await db('fee_types').where({ id, school_unit_id: schoolUnitId }).update({ is_active: isActive });
    const updated = await db('fee_types').where({ id }).first();
    return updated;
  }

  // ============================================================
  // 6. FEE GROUPS & REFERENCE AMOUNTS (Fitur #6)
  // ============================================================

  async listFeeGroups(schoolUnitId) {
    return db('fee_groups').where('school_unit_id', schoolUnitId);
  }

  async createFeeGroup(schoolUnitId, data, userId = null) {
    const [id] = await db('fee_groups').insert({
      school_unit_id: schoolUnitId,
      name: data.name
    });
    return db('fee_groups').where({ id }).first();
  }

  async updateFeeGroup(schoolUnitId, id, data, userId = null) {
    await db('fee_groups').where({ id, school_unit_id: schoolUnitId }).update({
      name: data.name
    });
    return db('fee_groups').where({ id }).first();
  }

  async listFeeReferenceAmounts(schoolUnitId, filters = {}) {
    let query = db('fee_reference_amounts')
      .join('fee_types', 'fee_reference_amounts.fee_type_id', 'fee_types.id')
      .where('fee_reference_amounts.school_unit_id', schoolUnitId)
      .select('fee_reference_amounts.*', 'fee_types.name as fee_type_name');

    if (filters.fee_type_id) {
      query = query.where('fee_reference_amounts.fee_type_id', filters.fee_type_id);
    }
    if (filters.grade_level_id) {
      query = query.where('fee_reference_amounts.grade_level_id', filters.grade_level_id);
    }
    return query;
  }

  async createFeeReferenceAmount(schoolUnitId, data, userId = null) {
    const [id] = await db('fee_reference_amounts').insert({
      fee_type_id: data.fee_type_id,
      school_unit_id: schoolUnitId,
      grade_level_id: data.grade_level_id,
      reference_amount: data.reference_amount
    });
    return db('fee_reference_amounts').where({ id }).first();
  }

  async updateFeeReferenceAmount(schoolUnitId, id, data, userId = null) {
    await db('fee_reference_amounts')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        reference_amount: data.reference_amount
      });
    return db('fee_reference_amounts').where({ id }).first();
  }

  // ============================================================
  // 7. TRANSACTION CATEGORIES (Fitur #7)
  // ============================================================

  async listTransactionCategories(schoolUnitId, categoryKind = null) {
    let query = db('transaction_categories')
      .leftJoin('chart_of_accounts', 'transaction_categories.related_account_id', 'chart_of_accounts.id')
      .where('transaction_categories.school_unit_id', schoolUnitId)
      .select(
        'transaction_categories.*',
        'chart_of_accounts.account_code as related_account_code',
        'chart_of_accounts.account_name as related_account_name'
      );

    if (categoryKind) {
      query = query.where('transaction_categories.category_kind', categoryKind);
    }
    return query;
  }

  async createTransactionCategory(schoolUnitId, data, userId = null) {
    const [id] = await db('transaction_categories').insert({
      school_unit_id: schoolUnitId,
      category_kind: data.category_kind,
      name: data.name,
      related_account_id: data.related_account_id || null
    });
    return db('transaction_categories').where({ id }).first();
  }

  async updateTransactionCategory(schoolUnitId, id, data, userId = null) {
    await db('transaction_categories')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        name: data.name,
        category_kind: data.category_kind,
        related_account_id: data.related_account_id !== undefined ? data.related_account_id : null
      });
    return db('transaction_categories').where({ id }).first();
  }

  // ============================================================
  // 8. BUDGET PROGRAMS & CATALOG ITEMS (Fitur #8)
  // ============================================================

  async listBudgetPrograms(schoolUnitId, academicYearId = null) {
    let query = db('budget_programs').where('school_unit_id', schoolUnitId);
    if (academicYearId) {
      query = query.where('academic_year_id', academicYearId);
    }
    return query;
  }

  async createBudgetProgram(schoolUnitId, data, userId = null) {
    const [id] = await db('budget_programs').insert({
      school_unit_id: schoolUnitId,
      academic_year_id: data.academic_year_id,
      name: data.name,
      rks_reference_id: data.rks_reference_id || null
    });
    return db('budget_programs').where({ id }).first();
  }

  async updateBudgetProgram(schoolUnitId, id, data, userId = null) {
    await db('budget_programs').where({ id, school_unit_id: schoolUnitId }).update({
      name: data.name,
      academic_year_id: data.academic_year_id,
      rks_reference_id: data.rks_reference_id !== undefined ? data.rks_reference_id : null
    });
    return db('budget_programs').where({ id }).first();
  }

  async listCatalogItems(schoolUnitId) {
    return db('catalog_items').where('school_unit_id', schoolUnitId);
  }

  async createCatalogItem(schoolUnitId, data, userId = null) {
    const [id] = await db('catalog_items').insert({
      school_unit_id: schoolUnitId,
      name: data.name,
      unit: data.unit,
      reference_price: data.reference_price
    });
    return db('catalog_items').where({ id }).first();
  }

  async updateCatalogItem(schoolUnitId, id, data, userId = null) {
    await db('catalog_items').where({ id, school_unit_id: schoolUnitId }).update({
      name: data.name,
      unit: data.unit,
      reference_price: data.reference_price
    });
    return db('catalog_items').where({ id }).first();
  }

  // ============================================================
  // 9. STUDENT FEE ADJUSTMENTS & WAIVERS (Fitur #9)
  // ============================================================

  async listStudentFeeAdjustments(schoolUnitId, filters = {}) {
    let query = db('student_fee_adjustments')
      .join('fee_types', 'student_fee_adjustments.fee_type_id', 'fee_types.id')
      .where('student_fee_adjustments.school_unit_id', schoolUnitId)
      .select('student_fee_adjustments.*', 'fee_types.name as fee_type_name');

    if (filters.student_id) {
      query = query.where('student_fee_adjustments.student_id', filters.student_id);
    }
    if (filters.status) {
      query = query.where('student_fee_adjustments.status', filters.status);
    }
    return query;
  }

  async createStudentFeeAdjustment(schoolUnitId, data, userId = null) {
    const [id] = await db('student_fee_adjustments').insert({
      school_unit_id: schoolUnitId,
      student_id: data.student_id,
      fee_type_id: data.fee_type_id,
      adjustment_kind: data.adjustment_kind,
      override_amount: data.override_amount || null,
      waiver_type: data.waiver_type || null,
      waiver_percentage: data.waiver_percentage || null,
      waiver_amount: data.waiver_amount || null,
      reason: data.reason || null,
      status: 'draft'
    });
    const created = await db('student_fee_adjustments').where({ id }).first();
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'CREATE_STUDENT_FEE_ADJUSTMENT',
      entityType: 'student_fee_adjustment',
      entityId: id,
      dataAfter: created
    });
    return created;
  }

  async submitStudentFeeAdjustment(schoolUnitId, id, userId = null) {
    const adjustment = await db('student_fee_adjustments')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!adjustment) return null;

    await db('student_fee_adjustments')
      .where({ id, school_unit_id: schoolUnitId })
      .update({ status: 'submitted' });

    const updated = await db('student_fee_adjustments').where({ id }).first();
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'SUBMIT_STUDENT_FEE_ADJUSTMENT',
      entityType: 'student_fee_adjustment',
      entityId: id,
      dataBefore: adjustment,
      dataAfter: updated
    });
    return updated;
  }

  async approveStudentFeeAdjustment(schoolUnitId, id, userId = null) {
    const adjustment = await db('student_fee_adjustments')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!adjustment) return null;

    await db('student_fee_adjustments')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: db.fn.now()
      });

    const updated = await db('student_fee_adjustments').where({ id }).first();
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'APPROVE_STUDENT_FEE_ADJUSTMENT',
      entityType: 'student_fee_adjustment',
      entityId: id,
      dataBefore: adjustment,
      dataAfter: updated
    });
    return updated;
  }

  async rejectStudentFeeAdjustment(schoolUnitId, id, reason, userId = null) {
    const adjustment = await db('student_fee_adjustments')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!adjustment) return null;

    await db('student_fee_adjustments')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'rejected',
        reason: reason ? `${adjustment.reason || ''} [Penolakan: ${reason}]` : adjustment.reason
      });

    const updated = await db('student_fee_adjustments').where({ id }).first();
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'REJECT_STUDENT_FEE_ADJUSTMENT',
      entityType: 'student_fee_adjustment',
      entityId: id,
      dataBefore: adjustment,
      dataAfter: updated
    });
    return updated;
  }
}

module.exports = new MasterDataService();
