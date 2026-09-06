/**
 * Master Data Service for Keuangan Module
 * Covers Features #1 - #9
 */
const db = require('../../../config/db/keuangan');
const dbManajemen = require('../../../config/db/manajemen');
const dbAkademik = require('../../../config/db/akademik');
const { logFinanceAudit } = require('../common/auditLogService');
const { recordJournal } = require('../bookkeeping/journalEngine');
const fundBalanceEngine = require('../bookkeeping/fundBalanceEngine');

const isUnit = (id) => id && id !== 'all' && id !== 'foundation' && id !== 'null';

const DEBIT_GROUPS = ['harta', 'piutang', 'inventaris', 'biaya'];
const CREDIT_GROUPS = ['utang', 'modal', 'pendapatan'];

function getNormalBalance(group) {
  if (DEBIT_GROUPS.includes(group)) return 'debit';
  if (CREDIT_GROUPS.includes(group)) return 'credit';
  return 'debit';
}

class MasterDataService {
  // ============================================================
  // 1. CASH ACCOUNTS (Fitur #1 & Saldo Berjalan)
  // ============================================================

  async listCashAccounts(schoolUnitId, filters = {}) {
    let query = db('cash_accounts')
      .leftJoin('chart_of_accounts', 'cash_accounts.account_id', 'chart_of_accounts.id')
      .select(
        'cash_accounts.*',
        'chart_of_accounts.account_code',
        'chart_of_accounts.account_name',
        'chart_of_accounts.account_group'
      );

    if (isUnit(schoolUnitId)) {
      query = query.where(function() {
        this.where('cash_accounts.school_unit_id', schoolUnitId).orWhere('cash_accounts.school_unit_id', 0);
      });
    } else if (filters.school_unit_id && isUnit(filters.school_unit_id)) {
      query = query.where('cash_accounts.school_unit_id', Number(filters.school_unit_id));
    }
    if (filters.is_active !== undefined) {
      const isActive = filters.is_active === 'true' || filters.is_active === true;
      query = query.where('cash_accounts.is_active', isActive);
    }
    if (filters.account_kind) {
      query = query.where('cash_accounts.account_kind', filters.account_kind);
    }
    const accounts = await query.orderBy('cash_accounts.id', 'asc');

    return Promise.all(accounts.map(async (acc) => {
      const opening = await db('cash_account_opening_balances')
        .where({ cash_account_id: acc.id })
        .orderBy('id', 'desc')
        .first();

      const openingAmt = opening ? parseFloat(opening.opening_balance) : 0;

      // Hitung penerimaan & pengeluaran kas (termasuk transfer antar kas internal)
      const [billPayments, otherIncomes, payrollOut, expensesOut, transfersIn, transfersOut] = await Promise.all([
        db('bill_payments').where('cash_account_id', acc.id).sum('amount as total_in').first(),
        db('other_incomes').where('cash_account_id', acc.id).sum('amount as total_in').first(),
        db('payroll_disbursements').where({ cash_account_id: acc.id, status: 'disbursed' }).sum('amount as total_out').first(),
        db('expenses')
          .where(function () {
            this.where({ fund_source_type: 'cash_account', fund_source_ref_id: acc.id })
              .orWhere('fund_source_ref_id', acc.id);
          })
          .whereNull('deleted_at')
          .sum('total_amount as total_out')
          .first(),
        db('cash_transfers').where('to_cash_account_id', acc.id).sum('amount as total_in').first(),
        db('cash_transfers').where('from_cash_account_id', acc.id).sum('amount as total_out').first()
      ]);

      const totalIn = (billPayments?.total_in ? parseFloat(billPayments.total_in) : 0) +
                      (otherIncomes?.total_in ? parseFloat(otherIncomes.total_in) : 0) +
                      (transfersIn?.total_in ? parseFloat(transfersIn.total_in) : 0);
      const totalOut = (payrollOut?.total_out ? parseFloat(payrollOut.total_out) : 0) +
                       (expensesOut?.total_out ? parseFloat(expensesOut.total_out) : 0) +
                       (transfersOut?.total_out ? parseFloat(transfersOut.total_out) : 0);

      const currentBalance = openingAmt + totalIn - totalOut;

      return {
        ...acc,
        opening_balance: openingAmt,
        opening_date: opening?.opening_date ? (typeof opening.opening_date === 'string' ? opening.opening_date.slice(0, 10) : opening.opening_date.toISOString().slice(0, 10)) : null,
        opening_balance_id: opening?.id || null,
        total_in: totalIn,
        total_out: totalOut,
        current_balance: currentBalance
      };
    }));
  }

  async getCashAccountById(schoolUnitId, id) {
    let query = db('cash_accounts')
      .leftJoin('chart_of_accounts', 'cash_accounts.account_id', 'chart_of_accounts.id')
      .select(
        'cash_accounts.*',
        'chart_of_accounts.account_code',
        'chart_of_accounts.account_name',
        'chart_of_accounts.account_group'
      )
      .where({ 'cash_accounts.id': id });

    if (isUnit(schoolUnitId)) {
      query = query.where({ 'cash_accounts.school_unit_id': schoolUnitId });
    }
    const acc = await query.first();
    if (!acc) return null;

    const opening = await db('cash_account_opening_balances')
      .where({ cash_account_id: acc.id })
      .orderBy('id', 'desc')
      .first();

    const openingAmt = opening ? parseFloat(opening.opening_balance) : 0;

    const [billPayments, otherIncomes, payrollOut, expensesOut, transfersIn, transfersOut] = await Promise.all([
      db('bill_payments').where('cash_account_id', acc.id).sum('amount as total_in').first(),
      db('other_incomes').where('cash_account_id', acc.id).sum('amount as total_in').first(),
      db('payroll_disbursements').where({ cash_account_id: acc.id, status: 'disbursed' }).sum('amount as total_out').first(),
      db('expenses')
        .where(function () {
          this.where({ fund_source_type: 'cash_account', fund_source_ref_id: acc.id })
            .orWhere('fund_source_ref_id', acc.id);
        })
        .whereNull('deleted_at')
        .sum('total_amount as total_out')
        .first(),
      db('cash_transfers').where('to_cash_account_id', acc.id).sum('amount as total_in').first(),
      db('cash_transfers').where('from_cash_account_id', acc.id).sum('amount as total_out').first()
    ]);

    const totalIn = (billPayments?.total_in ? parseFloat(billPayments.total_in) : 0) +
                    (otherIncomes?.total_in ? parseFloat(otherIncomes.total_in) : 0) +
                    (transfersIn?.total_in ? parseFloat(transfersIn.total_in) : 0);
    const totalOut = (payrollOut?.total_out ? parseFloat(payrollOut.total_out) : 0) +
                     (expensesOut?.total_out ? parseFloat(expensesOut.total_out) : 0) +
                     (transfersOut?.total_out ? parseFloat(transfersOut.total_out) : 0);

    const currentBalance = openingAmt + totalIn - totalOut;

    return {
      ...acc,
      opening_balance: openingAmt,
      opening_date: opening?.opening_date ? (typeof opening.opening_date === 'string' ? opening.opening_date.slice(0, 10) : opening.opening_date.toISOString().slice(0, 10)) : null,
      opening_balance_id: opening?.id || null,
      total_in: totalIn,
      total_out: totalOut,
      current_balance: currentBalance
    };
  }

  async createCashAccount(schoolUnitId, data, userId = null) {
    const finalUnitId = isUnit(schoolUnitId) ? schoolUnitId : (data.school_unit_id || 1);
    const [id] = await db('cash_accounts').insert({
      school_unit_id: finalUnitId,
      name: data.name,
      account_kind: data.account_kind,
      bank_account_number: data.bank_account_number || null,
      bank_name: data.bank_name || null,
      account_id: data.account_id ? Number(data.account_id) : null,
      is_active: data.is_active !== undefined ? data.is_active : true
    });
    
    // Simpan saldo awal jika diisi pada form pembuatan akun kas
    if (data.opening_balance !== undefined && data.opening_balance !== null && data.opening_balance !== '') {
      await this.createOpeningBalance(schoolUnitId, {
        cash_account_id: id,
        academic_year_id: data.academic_year_id || 1,
        opening_balance: parseFloat(data.opening_balance || 0),
        opening_date: data.opening_date || null
      }, userId);
    }

    const created = await this.getCashAccountById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId: finalUnitId,
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

    let query = db('cash_accounts').where({ id });
    if (isUnit(schoolUnitId)) {
      query = query.where({ school_unit_id: schoolUnitId });
    }

    await query.update({
      name: data.name !== undefined ? data.name : before.name,
      account_kind: data.account_kind !== undefined ? data.account_kind : before.account_kind,
      bank_account_number: data.bank_account_number !== undefined ? data.bank_account_number : before.bank_account_number,
      bank_name: data.bank_name !== undefined ? data.bank_name : before.bank_name,
      account_id: data.account_id !== undefined ? (data.account_id ? Number(data.account_id) : null) : before.account_id,
      is_active: data.is_active !== undefined ? data.is_active : before.is_active
    });

    // Update / Create saldo awal jika diubah pada form
    if (data.opening_balance !== undefined && data.opening_balance !== null && data.opening_balance !== '') {
      const existingOpening = await db('cash_account_opening_balances').where({ cash_account_id: id }).first();
      if (existingOpening) {
        await this.updateOpeningBalance(schoolUnitId, existingOpening.id, {
          opening_balance: parseFloat(data.opening_balance || 0),
          opening_date: data.opening_date || existingOpening.opening_date || null,
          edit_reason: data.edit_reason || 'Penyesuaian saldo awal kas'
        }, userId);
      } else {
        await this.createOpeningBalance(schoolUnitId, {
          cash_account_id: id,
          academic_year_id: data.academic_year_id || 1,
          opening_balance: parseFloat(data.opening_balance || 0),
          opening_date: data.opening_date || null
        }, userId);
      }
    }

    const updated = await this.getCashAccountById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId: before.school_unit_id || schoolUnitId,
      userId,
      action: 'UPDATE_CASH_ACCOUNT',
      entityType: 'cash_account',
      entityId: id,
      dataBefore: before,
      dataAfter: { ...updated, edit_reason: data.edit_reason || data.notes || null }
    });
    return updated;
  }

  async updateCashAccountStatus(schoolUnitId, id, isActive, userId = null) {
    const before = await this.getCashAccountById(schoolUnitId, id);
    if (!before) return null;

    let query = db('cash_accounts').where({ id });
    if (isUnit(schoolUnitId)) {
      query = query.where({ school_unit_id: schoolUnitId });
    }

    await query.update({ is_active: isActive });

    const updated = await this.getCashAccountById(schoolUnitId, id);
    await logFinanceAudit({
      schoolUnitId: before.school_unit_id || schoolUnitId,
      userId,
      action: isActive ? 'ACTIVATE_CASH_ACCOUNT' : 'DEACTIVATE_CASH_ACCOUNT',
      entityType: 'cash_account',
      entityId: id,
      dataBefore: before,
      dataAfter: { ...updated, edit_reason: isActive ? 'Pengaktifan akun kas' : 'Penonaktifan akun kas' }
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
    const openingAmt = parseFloat(data.opening_balance || 0);
    const openingDate = data.opening_date || null;
    const [id] = await db('cash_account_opening_balances').insert({
      cash_account_id: data.cash_account_id,
      academic_year_id: data.academic_year_id,
      opening_balance: openingAmt,
      opening_date: openingDate
    });
    const created = await db('cash_account_opening_balances').where({ id }).first();

    // Auto-journal dan mutasi kantong dana untuk saldo awal kas jika nominal > 0
    if (openingAmt > 0) {
      const cashAcc = await db('cash_accounts').where({ id: data.cash_account_id }).first();
      const targetUnitId = isUnit(schoolUnitId) ? schoolUnitId : (cashAcc?.school_unit_id || 1);

      try {
        await recordJournal({
          schoolUnitId: targetUnitId,
          transactionCode: 'opening_balance_entry',
          amount: openingAmt,
          sourceType: 'manual',
          sourceId: id,
          overrideDebitAccountId: cashAcc?.account_id || null,
          overrideCashAccountId: data.cash_account_id,
          journalDate: openingDate ? new Date(openingDate) : new Date(),
          description: `Pencatatan Saldo Awal ${cashAcc ? cashAcc.name : 'Kas/Bank'} (Tahun Ajaran #${data.academic_year_id})`
        });
      } catch (journalErr) {
        console.warn('Auto journal for opening balance skipped or error:', journalErr.message);
      }

      try {
        await fundBalanceEngine.applyFundMutation({
          schoolUnitId: targetUnitId,
          fundType: 'opening_pool',
          fundRefId: 0,
          academicYearId: Number(data.academic_year_id || 2),
          direction: 'in',
          amount: openingAmt,
          sourceTable: 'cash_account_opening_balances',
          sourceId: id,
          notes: `Saldo awal kas ${cashAcc ? cashAcc.name : 'Kas/Bank'} masuk ke kantong opening pool TA #${data.academic_year_id}`,
          userId
        });
      } catch (fbErr) {
        console.warn('Fund balance mutation for opening balance skipped or error:', fbErr.message);
      }
    }

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

    const newOpeningAmt = data.opening_balance !== undefined ? parseFloat(data.opening_balance) : parseFloat(before.opening_balance);
    const newOpeningDate = data.opening_date !== undefined ? data.opening_date : before.opening_date;

    await db('cash_account_opening_balances').where({ id }).update({
      opening_balance: newOpeningAmt,
      opening_date: newOpeningDate,
      academic_year_id: data.academic_year_id !== undefined ? data.academic_year_id : before.academic_year_id
    });

    const updated = await db('cash_account_opening_balances').where({ id }).first();

    // Catat auto-journal penyesuaian jika saldo awal berubah
    const diff = newOpeningAmt - parseFloat(before.opening_balance);
    if (Math.abs(diff) >= 0.01) {
      try {
        const cashAcc = await db('cash_accounts').where({ id: updated.cash_account_id }).first();
        const targetUnitId = isUnit(schoolUnitId) ? schoolUnitId : (cashAcc?.school_unit_id || 1);
        if (diff > 0) {
          await recordJournal({
            schoolUnitId: targetUnitId,
            transactionCode: 'opening_balance_entry',
            amount: diff,
            sourceType: 'manual',
            sourceId: id,
            overrideDebitAccountId: cashAcc?.account_id || null,
            overrideCashAccountId: updated.cash_account_id,
            journalDate: newOpeningDate ? new Date(newOpeningDate) : new Date(),
            description: `Penyesuaian Tambah Saldo Awal ${cashAcc ? cashAcc.name : 'Kas/Bank'} (Ref #${id})`
          });
        }
      } catch (journalErr) {
        console.warn('Auto journal adjustment for opening balance skipped or error:', journalErr.message);
      }
    }

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
    let query = db('chart_of_accounts');
    if (isUnit(schoolUnitId)) {
      query = query.where(function () {
        this.where('school_unit_id', schoolUnitId)
          .orWhere('school_unit_id', 0)
          .orWhereNull('school_unit_id');
      });
    }
    const accounts = await query.orderBy('account_code', 'asc');

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

    const group = data.account_group || 'harta';
    const expectedNormal = getNormalBalance(group);
    const normalBalance = data.normal_balance ? data.normal_balance : expectedNormal;

    if (normalBalance !== expectedNormal) {
      const err = new Error(`Kelompok akun '${group}' wajib memiliki saldo normal '${expectedNormal}' (diterima: '${normalBalance}')`);
      err.statusCode = 422;
      throw err;
    }

    const [id] = await db('chart_of_accounts').insert({
      school_unit_id: schoolUnitId,
      account_code: data.account_code,
      account_name: data.account_name,
      account_group: group,
      normal_balance: normalBalance,
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

    const targetGroup = data.account_group || before.account_group;
    const expectedNormal = getNormalBalance(targetGroup);
    const targetNormalBalance = data.normal_balance ? data.normal_balance : expectedNormal;

    if (targetNormalBalance !== expectedNormal) {
      const err = new Error(`Kelompok akun '${targetGroup}' wajib memiliki saldo normal '${expectedNormal}' (diterima: '${targetNormalBalance}')`);
      err.statusCode = 422;
      throw err;
    }

    await db('chart_of_accounts')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        account_code: data.account_code || before.account_code,
        account_name: data.account_name || before.account_name,
        account_group: targetGroup,
        normal_balance: targetNormalBalance,
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
      dataAfter: { ...updated, edit_reason: data.edit_reason || data.notes || null }
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
      action: isActive ? 'ACTIVATE_COA' : 'DEACTIVATE_COA',
      entityType: 'chart_of_account',
      entityId: id,
      dataBefore: before,
      dataAfter: { ...updated, edit_reason: isActive ? 'Pengaktifan akun COA' : 'Penonaktifan akun COA' }
    });
    return updated;
  }

  // ============================================================
  // 4. TRANSACTION ACCOUNT MAPPINGS (Fitur #4)
  // ============================================================

  async listAccountMappings(schoolUnitId, filters = {}) {
    let query = db('transaction_account_mappings')
      .leftJoin('chart_of_accounts as debit_acc', 'transaction_account_mappings.debit_account_id', 'debit_acc.id')
      .leftJoin('chart_of_accounts as credit_acc', 'transaction_account_mappings.credit_account_id', 'credit_acc.id')
      .leftJoin('cash_accounts as cash_acc', 'transaction_account_mappings.default_cash_account_id', 'cash_acc.id')
      .leftJoin('fee_types', 'transaction_account_mappings.related_fee_type_id', 'fee_types.id')
      .leftJoin('transaction_categories', 'transaction_account_mappings.related_transaction_category_id', 'transaction_categories.id')
      .select(
        'transaction_account_mappings.*',
        'debit_acc.account_code as debit_account_code',
        'debit_acc.account_name as debit_account_name',
        'debit_acc.account_group as debit_account_group',
        'credit_acc.account_code as credit_account_code',
        'credit_acc.account_name as credit_account_name',
        'credit_acc.account_group as credit_account_group',
        'cash_acc.name as default_cash_account_name',
        'fee_types.name as related_fee_type_name',
        'transaction_categories.name as related_category_name'
      );

    if (isUnit(schoolUnitId)) {
      query = query.where('transaction_account_mappings.school_unit_id', schoolUnitId);
    }
    if (filters.transaction_type) {
      query = query.where('transaction_account_mappings.transaction_type', filters.transaction_type);
    }
    if (filters.is_active !== undefined) {
      const isActive = filters.is_active === 'true' || filters.is_active === true;
      query = query.where('transaction_account_mappings.is_active', isActive);
    }
    if (filters.is_system !== undefined) {
      const isSystem = filters.is_system === 'true' || filters.is_system === true;
      query = query.where('transaction_account_mappings.is_system', isSystem);
    }

    return query.orderBy('transaction_account_mappings.id', 'asc');
  }

  async getAccountMappingById(schoolUnitId, id) {
    let query = db('transaction_account_mappings')
      .leftJoin('chart_of_accounts as debit_acc', 'transaction_account_mappings.debit_account_id', 'debit_acc.id')
      .leftJoin('chart_of_accounts as credit_acc', 'transaction_account_mappings.credit_account_id', 'credit_acc.id')
      .leftJoin('cash_accounts as cash_acc', 'transaction_account_mappings.default_cash_account_id', 'cash_acc.id')
      .leftJoin('fee_types', 'transaction_account_mappings.related_fee_type_id', 'fee_types.id')
      .leftJoin('transaction_categories', 'transaction_account_mappings.related_transaction_category_id', 'transaction_categories.id')
      .where('transaction_account_mappings.id', id)
      .select(
        'transaction_account_mappings.*',
        'debit_acc.account_code as debit_account_code',
        'debit_acc.account_name as debit_account_name',
        'debit_acc.account_group as debit_account_group',
        'credit_acc.account_code as credit_account_code',
        'credit_acc.account_name as credit_account_name',
        'credit_acc.account_group as credit_account_group',
        'cash_acc.name as default_cash_account_name',
        'fee_types.name as related_fee_type_name',
        'transaction_categories.name as related_category_name'
      );

    if (isUnit(schoolUnitId)) {
      query = query.where('transaction_account_mappings.school_unit_id', schoolUnitId);
    }

    return query.first();
  }

  async createAccountMapping(schoolUnitId, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : (data.school_unit_id || 1);
    const code = data.transaction_code ? data.transaction_code.trim().toLowerCase() : '';

    const existing = await db('transaction_account_mappings')
      .where({ school_unit_id: targetUnit, transaction_code: code })
      .first();

    if (existing) {
      const err = new Error(`Kode aturan transaksi '${code}' sudah terdaftar untuk unit ini`);
      err.statusCode = 409;
      throw err;
    }

    const tType = data.transaction_type || 'non_kas';
    let defaultCash = data.default_cash_account_id ? Number(data.default_cash_account_id) : null;
    let relatedFee = data.related_fee_type_id ? Number(data.related_fee_type_id) : null;
    let relatedCat = data.related_transaction_category_id ? Number(data.related_transaction_category_id) : null;

    if (tType === 'non_kas') {
      defaultCash = null;
      relatedFee = null;
      relatedCat = null;
    } else if (tType === 'penambahan_kas') {
      relatedCat = null;
    } else if (tType === 'pemindahan_kas') {
      relatedFee = null;
      relatedCat = null;
    }

    const [id] = await db('transaction_account_mappings').insert({
      school_unit_id: targetUnit,
      transaction_code: code,
      transaction_label: data.transaction_label.trim(),
      transaction_type: tType,
      debit_account_id: data.debit_account_id,
      credit_account_id: data.credit_account_id,
      is_system: false,
      default_cash_account_id: defaultCash,
      related_fee_type_id: relatedFee,
      related_transaction_category_id: relatedCat,
      is_active: true
    });

    const created = await this.getAccountMappingById(targetUnit, id);
    await logFinanceAudit({
      schoolUnitId: targetUnit,
      userId,
      action: 'CREATE_ACCOUNT_MAPPING',
      entityType: 'transaction_account_mapping',
      entityId: id,
      dataAfter: created
    });
    return created;
  }

  async updateAccountMapping(schoolUnitId, id, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;
    const before = await this.getAccountMappingById(targetUnit, id);
    if (!before) return null;

    const tType = data.transaction_type !== undefined ? data.transaction_type : (before.transaction_type || 'non_kas');
    let defaultCash = data.default_cash_account_id !== undefined ? (data.default_cash_account_id ? Number(data.default_cash_account_id) : null) : before.default_cash_account_id;
    let relatedFee = data.related_fee_type_id !== undefined ? (data.related_fee_type_id ? Number(data.related_fee_type_id) : null) : before.related_fee_type_id;
    let relatedCat = data.related_transaction_category_id !== undefined ? (data.related_transaction_category_id ? Number(data.related_transaction_category_id) : null) : before.related_transaction_category_id;

    if (tType === 'non_kas') {
      defaultCash = null;
      relatedFee = null;
      relatedCat = null;
    } else if (tType === 'penambahan_kas') {
      relatedCat = null;
    } else if (tType === 'pemindahan_kas') {
      relatedFee = null;
      relatedCat = null;
    }

    // Proteksi tegas: jika is_system=true, hanya boleh ubah is_active dan default_cash_account_id
    if (before.is_system) {
      const hasStructuralChange = (
        (data.debit_account_id !== undefined && data.debit_account_id !== before.debit_account_id) ||
        (data.credit_account_id !== undefined && data.credit_account_id !== before.credit_account_id) ||
        (data.transaction_code !== undefined && data.transaction_code !== before.transaction_code) ||
        (data.transaction_type !== undefined && data.transaction_type !== before.transaction_type)
      );

      if (hasStructuralChange) {
        const err = new Error('Aturan bawaan sistem, hubungi Super Admin untuk perubahan struktural');
        err.statusCode = 400;
        throw err;
      }

      await db('transaction_account_mappings')
        .where({ id })
        .update({
          default_cash_account_id: defaultCash,
          is_active: data.is_active !== undefined ? Boolean(data.is_active) : before.is_active
        });
    } else {
      await db('transaction_account_mappings')
        .where({ id })
        .update({
          transaction_code: data.transaction_code || before.transaction_code,
          transaction_label: data.transaction_label || before.transaction_label,
          transaction_type: tType,
          debit_account_id: data.debit_account_id !== undefined ? data.debit_account_id : before.debit_account_id,
          credit_account_id: data.credit_account_id !== undefined ? data.credit_account_id : before.credit_account_id,
          default_cash_account_id: defaultCash,
          related_fee_type_id: relatedFee,
          related_transaction_category_id: relatedCat,
          is_active: data.is_active !== undefined ? Boolean(data.is_active) : before.is_active
        });
    }

    const updated = await this.getAccountMappingById(targetUnit, id);
    await logFinanceAudit({
      schoolUnitId: targetUnit,
      userId,
      action: 'UPDATE_ACCOUNT_MAPPING',
      entityType: 'transaction_account_mapping',
      entityId: id,
      dataBefore: before,
      dataAfter: { ...updated, edit_reason: data.edit_reason || data.reason || null }
    });
    return updated;
  }

  async overrideSystemTransactionRule(schoolUnitId, id, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;
    const before = await this.getAccountMappingById(targetUnit, id);
    if (!before) {
      const err = new Error('Aturan transaksi tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const reason = data.reason || data.override_reason;
    if (!reason || !reason.trim()) {
      const err = new Error('Alasan override struktural aturan sistem (reason) wajib diisi');
      err.statusCode = 400;
      throw err;
    }

    await db('transaction_account_mappings')
      .where({ id })
      .update({
        transaction_label: data.transaction_label !== undefined ? data.transaction_label : before.transaction_label,
        debit_account_id: data.debit_account_id !== undefined ? data.debit_account_id : before.debit_account_id,
        credit_account_id: data.credit_account_id !== undefined ? data.credit_account_id : before.credit_account_id,
        default_cash_account_id: data.default_cash_account_id !== undefined ? data.default_cash_account_id : before.default_cash_account_id,
        is_dynamic_account: data.is_dynamic_account !== undefined ? data.is_dynamic_account : before.is_dynamic_account,
        is_active: data.is_active !== undefined ? Boolean(data.is_active) : before.is_active
      });

    const updated = await this.getAccountMappingById(targetUnit, id);
    await logFinanceAudit({
      schoolUnitId: targetUnit,
      userId,
      action: 'OVERRIDE_SYSTEM_TRANSACTION_RULE',
      entityType: 'transaction_account_mapping',
      entityId: id,
      dataBefore: before,
      dataAfter: { ...updated, reason: reason.trim() }
    });
    return updated;
  }

  async updateAccountMappingStatus(schoolUnitId, id, isActive, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;
    const before = await this.getAccountMappingById(targetUnit, id);
    if (!before) return null;

    await db('transaction_account_mappings')
      .where({ id })
      .update({ is_active: Boolean(isActive) });

    const updated = await this.getAccountMappingById(targetUnit, id);
    await logFinanceAudit({
      schoolUnitId: targetUnit,
      userId,
      action: isActive ? 'ACTIVATE_ACCOUNT_MAPPING' : 'DEACTIVATE_ACCOUNT_MAPPING',
      entityType: 'transaction_account_mapping',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });
    return updated;
  }

  async deleteAccountMapping(schoolUnitId, id, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;
    const before = await this.getAccountMappingById(targetUnit, id);
    if (!before) return null;

    // Kebijakan non-delete: ubah menjadi soft-toggle is_active = false
    await db('transaction_account_mappings').where({ id }).update({ is_active: false });
    const updated = await this.getAccountMappingById(targetUnit, id);

    await logFinanceAudit({
      schoolUnitId: targetUnit,
      userId,
      action: 'DEACTIVATE_ACCOUNT_MAPPING',
      entityType: 'transaction_account_mapping',
      entityId: id,
      dataBefore: before,
      dataAfter: { ...updated, note: 'Dinonaktifkan via permintaan penghapusan (non-delete policy)' }
    });

    return updated;
  }

  // ============================================================
  // 5. FEE TYPES (Fitur #5)
  // ============================================================

  async listFeeTypes(schoolUnitId, filters = {}) {
    let query = db('fee_types')
      .leftJoin('fee_groups', 'fee_types.fee_group_id', 'fee_groups.id')
      .leftJoin('chart_of_accounts as rev_acc', 'fee_types.related_revenue_account_id', 'rev_acc.id')
      .leftJoin('transaction_account_mappings as billing_tam', 'fee_types.billing_account_mapping_id', 'billing_tam.id')
      .leftJoin('transaction_account_mappings as payment_tam', 'fee_types.payment_account_mapping_id', 'payment_tam.id')
      .leftJoin('transaction_account_mappings as bill_disc_tam', 'fee_types.billing_discount_account_mapping_id', 'bill_disc_tam.id')
      .leftJoin('transaction_account_mappings as pay_disc_tam', 'fee_types.payment_discount_account_mapping_id', 'pay_disc_tam.id')
      .select(
        'fee_types.*',
        'fee_groups.name as fee_group_name',
        'rev_acc.account_code as revenue_account_code',
        'rev_acc.account_name as revenue_account_name',
        'billing_tam.transaction_code as billing_mapping_code',
        'billing_tam.transaction_label as billing_mapping_label',
        'payment_tam.transaction_code as payment_mapping_code',
        'payment_tam.transaction_label as payment_mapping_label',
        'bill_disc_tam.transaction_code as billing_discount_mapping_code',
        'bill_disc_tam.transaction_label as billing_discount_mapping_label',
        'pay_disc_tam.transaction_code as payment_discount_mapping_code',
        'pay_disc_tam.transaction_label as payment_discount_mapping_label'
      );

    if (isUnit(schoolUnitId)) {
      const unitSpecificCount = await db('fee_types').where('school_unit_id', schoolUnitId).count('* as total').first();
      if (unitSpecificCount && Number(unitSpecificCount.total) > 0) {
        query = query.where(function () {
          this.where('fee_types.school_unit_id', schoolUnitId)
            .orWhere('fee_types.school_unit_id', 0);
        });
      } else {
        // Fallback: Jika unit belum memiliki fee_types tersendiri (mis. unit 2), sertakan fee_types default (unit 1 / global 0)
        query = query.where(function () {
          this.where('fee_types.school_unit_id', schoolUnitId)
            .orWhere('fee_types.school_unit_id', 0)
            .orWhere('fee_types.school_unit_id', 1);
        });
      }
    }

    if (filters.is_active !== undefined) {
      query = query.where('fee_types.is_active', filters.is_active === 'true' || filters.is_active === true);
    }
    return query.orderByRaw('fee_types.is_system DESC, fee_types.id ASC');
  }

  async createFeeType(schoolUnitId, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : (data.school_unit_id || 1);
    const [id] = await db('fee_types').insert({
      school_unit_id: targetUnit,
      fee_group_id: data.fee_group_id || null,
      code: data.code || null,
      name: data.name,
      billing_pattern: data.billing_pattern,
      description: data.description || null,
      related_revenue_account_id: data.related_revenue_account_id ? Number(data.related_revenue_account_id) : null,
      billing_account_mapping_id: data.billing_account_mapping_id ? Number(data.billing_account_mapping_id) : null,
      billing_discount_account_mapping_id: data.billing_discount_account_mapping_id ? Number(data.billing_discount_account_mapping_id) : null,
      payment_account_mapping_id: data.payment_account_mapping_id ? Number(data.payment_account_mapping_id) : null,
      payment_discount_account_mapping_id: data.payment_discount_account_mapping_id ? Number(data.payment_discount_account_mapping_id) : null,
      is_active: data.is_active !== undefined ? data.is_active : true,
      is_system: data.is_system !== undefined ? Boolean(data.is_system) : false
    });
    const created = await db('fee_types')
      .leftJoin('chart_of_accounts as rev_acc', 'fee_types.related_revenue_account_id', 'rev_acc.id')
      .leftJoin('transaction_account_mappings as billing_tam', 'fee_types.billing_account_mapping_id', 'billing_tam.id')
      .leftJoin('transaction_account_mappings as payment_tam', 'fee_types.payment_account_mapping_id', 'payment_tam.id')
      .leftJoin('transaction_account_mappings as bill_disc_tam', 'fee_types.billing_discount_account_mapping_id', 'bill_disc_tam.id')
      .leftJoin('transaction_account_mappings as pay_disc_tam', 'fee_types.payment_discount_account_mapping_id', 'pay_disc_tam.id')
      .where('fee_types.id', id)
      .select(
        'fee_types.*',
        'rev_acc.account_code as revenue_account_code',
        'rev_acc.account_name as revenue_account_name',
        'billing_tam.transaction_code as billing_mapping_code',
        'billing_tam.transaction_label as billing_mapping_label',
        'payment_tam.transaction_code as payment_mapping_code',
        'payment_tam.transaction_label as payment_mapping_label',
        'bill_disc_tam.transaction_code as billing_discount_mapping_code',
        'bill_disc_tam.transaction_label as billing_discount_mapping_label',
        'pay_disc_tam.transaction_code as payment_discount_mapping_code',
        'pay_disc_tam.transaction_label as payment_discount_mapping_label'
      )
      .first();
    await logFinanceAudit({
      schoolUnitId: targetUnit,
      userId,
      action: 'CREATE_FEE_TYPE',
      entityType: 'fee_type',
      entityId: id,
      dataAfter: created
    });
    return created;
  }

  async updateFeeType(schoolUnitId, id, data, userId = null) {
    let query = db('fee_types').where({ id });
    if (isUnit(schoolUnitId)) {
      query = query.where(function () {
        this.where({ school_unit_id: schoolUnitId }).orWhere({ school_unit_id: 0 });
      });
    }
    const before = await query.first();
    if (!before) return null;

    // Proteksi sistem: Jika is_system, nama dan pola penagihan dikunci
    if (before.is_system) {
      const isNameChanged = data.name !== undefined && data.name.trim() !== before.name;
      const isPatternChanged = data.billing_pattern !== undefined && data.billing_pattern !== before.billing_pattern;
      if (isNameChanged || isPatternChanged) {
        const err = new Error('Jenis biaya ini dikunci oleh sistem sebagai variabel default modul layanan. Nama dan pola penagihan tidak dapat diubah.');
        err.statusCode = 400;
        throw err;
      }
    }

    const updatePayload = {
      name: before.is_system ? before.name : (data.name || before.name),
      billing_pattern: before.is_system ? before.billing_pattern : (data.billing_pattern || before.billing_pattern)
    };
    if (data.fee_group_id !== undefined) updatePayload.fee_group_id = data.fee_group_id;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.related_revenue_account_id !== undefined) {
      updatePayload.related_revenue_account_id = data.related_revenue_account_id ? Number(data.related_revenue_account_id) : null;
    }
    if (data.billing_account_mapping_id !== undefined) {
      updatePayload.billing_account_mapping_id = data.billing_account_mapping_id ? Number(data.billing_account_mapping_id) : null;
    }
    if (data.billing_discount_account_mapping_id !== undefined) {
      updatePayload.billing_discount_account_mapping_id = data.billing_discount_account_mapping_id ? Number(data.billing_discount_account_mapping_id) : null;
    }
    if (data.payment_account_mapping_id !== undefined) {
      updatePayload.payment_account_mapping_id = data.payment_account_mapping_id ? Number(data.payment_account_mapping_id) : null;
    }
    if (data.payment_discount_account_mapping_id !== undefined) {
      updatePayload.payment_discount_account_mapping_id = data.payment_discount_account_mapping_id ? Number(data.payment_discount_account_mapping_id) : null;
    }
    if (data.is_active !== undefined) {
      // Jika sistem, tidak boleh dinonaktifkan
      if (before.is_system && !data.is_active) {
        const err = new Error('Jenis biaya bawaan sistem tidak dapat dinonaktifkan.');
        err.statusCode = 400;
        throw err;
      }
      updatePayload.is_active = data.is_active;
    }

    await db('fee_types').where({ id: before.id }).update(updatePayload);

    const updated = await db('fee_types')
      .leftJoin('chart_of_accounts as rev_acc', 'fee_types.related_revenue_account_id', 'rev_acc.id')
      .leftJoin('transaction_account_mappings as billing_tam', 'fee_types.billing_account_mapping_id', 'billing_tam.id')
      .leftJoin('transaction_account_mappings as payment_tam', 'fee_types.payment_account_mapping_id', 'payment_tam.id')
      .leftJoin('transaction_account_mappings as bill_disc_tam', 'fee_types.billing_discount_account_mapping_id', 'bill_disc_tam.id')
      .leftJoin('transaction_account_mappings as pay_disc_tam', 'fee_types.payment_discount_account_mapping_id', 'pay_disc_tam.id')
      .where('fee_types.id', before.id)
      .select(
        'fee_types.*',
        'rev_acc.account_code as revenue_account_code',
        'rev_acc.account_name as revenue_account_name',
        'billing_tam.transaction_code as billing_mapping_code',
        'billing_tam.transaction_label as billing_mapping_label',
        'payment_tam.transaction_code as payment_mapping_code',
        'payment_tam.transaction_label as payment_mapping_label',
        'bill_disc_tam.transaction_code as billing_discount_mapping_code',
        'bill_disc_tam.transaction_label as billing_discount_mapping_label',
        'pay_disc_tam.transaction_code as payment_discount_mapping_code',
        'pay_disc_tam.transaction_label as payment_discount_mapping_label'
      )
      .first();

    await logFinanceAudit({
      schoolUnitId: before.school_unit_id || schoolUnitId || 1,
      userId,
      action: 'UPDATE_FEE_TYPE',
      entityType: 'fee_type',
      entityId: id,
      dataBefore: before,
      dataAfter: { ...updated, edit_reason: data.edit_reason || data.notes || null }
    });
    return updated;
  }

  async updateFeeTypeStatus(schoolUnitId, id, isActive, userId = null) {
    let query = db('fee_types').where({ id });
    if (isUnit(schoolUnitId)) {
      query = query.where(function () {
        this.where({ school_unit_id: schoolUnitId }).orWhere({ school_unit_id: 0 });
      });
    }
    const before = await query.first();
    if (!before) return null;

    if (before.is_system && !isActive) {
      const err = new Error('Jenis biaya bawaan sistem tidak dapat dinonaktifkan karena dibutuhkan untuk variabel perhitungan modul layanan.');
      err.statusCode = 400;
      throw err;
    }

    await db('fee_types').where({ id: before.id }).update({ is_active: isActive });
    const updated = await db('fee_types')
      .leftJoin('chart_of_accounts as rev_acc', 'fee_types.related_revenue_account_id', 'rev_acc.id')
      .where('fee_types.id', before.id)
      .select('fee_types.*', 'rev_acc.account_code as revenue_account_code', 'rev_acc.account_name as revenue_account_name')
      .first();

    await logFinanceAudit({
      schoolUnitId: before.school_unit_id || schoolUnitId || 1,
      userId,
      action: isActive ? 'ACTIVATE_FEE_TYPE' : 'DEACTIVATE_FEE_TYPE',
      entityType: 'fee_type',
      entityId: id,
      dataBefore: before,
      dataAfter: { ...updated, edit_reason: isActive ? 'Pengaktifan jenis biaya tagihan' : 'Penonaktifan jenis biaya tagihan' }
    });
    return updated;
  }

  // ============================================================
  // 6. FEE GROUPS & REFERENCE AMOUNTS (Fitur #6)
  // ============================================================

  async listFeeGroups(schoolUnitId) {
    let query = db('fee_groups');
    if (isUnit(schoolUnitId)) {
      query = query.where('school_unit_id', schoolUnitId);
    }
    return query;
  }

  async createFeeGroup(schoolUnitId, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : (data.school_unit_id || 1);
    const [id] = await db('fee_groups').insert({
      school_unit_id: targetUnit,
      name: data.name
    });
    return db('fee_groups').where({ id }).first();
  }

  async updateFeeGroup(schoolUnitId, id, data, userId = null) {
    let query = db('fee_groups').where({ id });
    if (isUnit(schoolUnitId)) {
      query = query.where({ school_unit_id: schoolUnitId });
    }
    const before = await query.first();
    if (!before) return null;

    await db('fee_groups').where({ id: before.id }).update({
      name: data.name
    });
    return db('fee_groups').where({ id: before.id }).first();
  }

  async listFeeReferenceAmounts(schoolUnitId, filters = {}) {
    let query = db('fee_reference_amounts')
      .join('fee_types', 'fee_reference_amounts.fee_type_id', 'fee_types.id')
      .select('fee_reference_amounts.*', 'fee_types.name as fee_type_name');

    if (isUnit(schoolUnitId)) {
      query = query.where('fee_reference_amounts.school_unit_id', schoolUnitId);
    }
    if (filters.fee_type_id) {
      query = query.where('fee_reference_amounts.fee_type_id', filters.fee_type_id);
    }
    if (filters.grade_level_id) {
      query = query.where('fee_reference_amounts.grade_level_id', filters.grade_level_id);
    }
    return query;
  }

  async createFeeReferenceAmount(schoolUnitId, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : (data.school_unit_id || 1);
    const [id] = await db('fee_reference_amounts').insert({
      fee_type_id: data.fee_type_id,
      school_unit_id: targetUnit,
      grade_level_id: data.grade_level_id,
      reference_amount: data.reference_amount
    });
    return db('fee_reference_amounts').where({ id }).first();
  }

  async updateFeeReferenceAmount(schoolUnitId, id, data, userId = null) {
    let query = db('fee_reference_amounts').where({ id });
    if (isUnit(schoolUnitId)) {
      query = query.where({ school_unit_id: schoolUnitId });
    }
    const before = await query.first();
    if (!before) return null;

    await db('fee_reference_amounts')
      .where({ id: before.id })
      .update({
        reference_amount: data.reference_amount
      });
    return db('fee_reference_amounts').where({ id: before.id }).first();
  }

  // ============================================================
  // 7. TRANSACTION CATEGORIES (Fitur #7)
  // ============================================================

  async listTransactionCategories(schoolUnitId, categoryKind = null) {
    let query = db('transaction_categories')
      .leftJoin('chart_of_accounts', 'transaction_categories.related_account_id', 'chart_of_accounts.id')
      .select(
        'transaction_categories.*',
        'chart_of_accounts.account_code as related_account_code',
        'chart_of_accounts.account_name as related_account_name'
      );

    if (isUnit(schoolUnitId)) {
      query = query.where(function () {
        this.where('transaction_categories.school_unit_id', schoolUnitId)
          .orWhere('transaction_categories.school_unit_id', 0)
          .orWhereNull('transaction_categories.school_unit_id');
      });
    }

    if (categoryKind) {
      query = query.where('transaction_categories.category_kind', categoryKind);
    }

    const results = await query.orderBy('transaction_categories.name', 'asc');

    // Deduplikasi kategori berdasarkan nama & category_kind untuk mencegah kemunculan berulang (misal unit 0, 1, 2)
    const seen = new Set();
    const unique = [];
    for (const item of results) {
      const key = `${(item.name || '').trim().toLowerCase()}_${item.category_kind}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    return unique;
  }

  async createTransactionCategory(schoolUnitId, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : (data.school_unit_id || 1);
    const [id] = await db('transaction_categories').insert({
      school_unit_id: targetUnit,
      category_kind: data.category_kind,
      name: data.name,
      related_account_id: data.related_account_id || null
    });
    return db('transaction_categories').where({ id }).first();
  }

  async updateTransactionCategory(schoolUnitId, id, data, userId = null) {
    let query = db('transaction_categories').where({ id });
    if (isUnit(schoolUnitId)) {
      query = query.where({ school_unit_id: schoolUnitId });
    }
    const before = await query.first();
    if (!before) return null;

    await db('transaction_categories')
      .where({ id: before.id })
      .update({
        name: data.name,
        category_kind: data.category_kind,
        related_account_id: data.related_account_id !== undefined ? data.related_account_id : null
      });
    return db('transaction_categories').where({ id: before.id }).first();
  }

  // ============================================================
  // 8. BUDGET PROGRAMS & CATALOG ITEMS (Fitur #8)
  // ============================================================

  async listBudgetPrograms(schoolUnitId, academicYearId = null) {
    const targetUnit = isUnit(schoolUnitId) ? Number(schoolUnitId) : null;

    // 1. Dapatkan nama tahun ajaran dari modul Akademik jika academicYearId diberikan
    let academicYearName = null;
    if (academicYearId) {
      try {
        const ay = await dbAkademik('academic_years').where({ id: academicYearId }).first();
        if (ay) academicYearName = ay.name;
      } catch (e) {}
    }

    // 2. Ambil master domain & subdomain dari Modul Manajemen
    let domainMap = new Map();
    let subdomainMap = new Map();
    try {
      const allDomains = await dbManajemen('rips_domains').select('*').orderBy('order_index', 'asc').orderBy('id', 'asc');
      const allSubdomains = await dbManajemen('rips_subdomains').select('*').orderBy('order_index', 'asc').orderBy('id', 'asc');

      allDomains.forEach((d, dIdx) => {
        const order = d.order_index ?? (dIdx + 1);
        const code = d.code || `BID-${String(order).padStart(2, '0')}`;
        domainMap.set(Number(d.id), {
          ...d,
          order_index: order,
          code,
        });
      });

      const subsByDomain = new Map();
      allSubdomains.forEach(s => {
        const dId = Number(s.domain_id);
        if (!subsByDomain.has(dId)) subsByDomain.set(dId, []);
        subsByDomain.get(dId).push(s);
      });

      subsByDomain.forEach((subs, dId) => {
        subs.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        subs.forEach((s, sIdx) => {
          const order = s.order_index ?? (sIdx + 1);
          const code = s.code || `SUB-${String(sIdx + 1).padStart(2, '0')}`;
          subdomainMap.set(Number(s.id), {
            ...s,
            order_index: order,
            code,
          });
        });
      });
    } catch (e) {
      console.warn('[Keuangan] Gagal mengambil master domains & subdomains:', e.message);
    }

    // 3. Ambil target RKT aktif untuk tahun ajaran terkait (jika ada)
    let rktTargetMap = new Map();
    if (academicYearName) {
      try {
        let rktQuery = dbManajemen('annual_program_targets')
          .where('academic_year', academicYearName);
        if (targetUnit) {
          rktQuery = rktQuery.where((q) => {
            q.where('school_unit_id', targetUnit).orWhereNull('school_unit_id');
          });
        }
        const rktTargets = await rktQuery.select('*');
        rktTargets.forEach(t => {
          if (t.rips_program_id) {
            rktTargetMap.set(Number(t.rips_program_id), t);
          }
        });
      } catch (e) {
        console.warn('[Keuangan] Gagal mengambil target RKT:', e.message);
      }
    }

    // 4. Ambil seluruh master program RIPS dari Modul Manajemen sesuai satuan pendidikan / dokumen aktif
    let allRipsPrograms = [];
    try {
      let targetDocId = null;
      if (targetUnit) {
        const unitDoc = await dbManajemen('rips_documents')
          .where({ school_unit_id: targetUnit })
          .orderBy('id', 'desc')
          .first();
        if (unitDoc) targetDocId = unitDoc.id;
      }
      if (!targetDocId) {
        const defaultDoc = await dbManajemen('rips_documents')
          .whereNull('school_unit_id')
          .orderBy('id', 'asc')
          .first() || await dbManajemen('rips_documents').orderBy('id', 'asc').first();
        if (defaultDoc) targetDocId = defaultDoc.id;
      }

      let ripsQuery = dbManajemen('rips_programs')
        .leftJoin('rips_program_categories as pc', 'rips_programs.category_id', 'pc.id');

      if (targetDocId) {
        ripsQuery = ripsQuery.where('rips_programs.rips_document_id', targetDocId);
      }

      allRipsPrograms = await ripsQuery
        .select(
          'rips_programs.id as rips_program_id',
          'rips_programs.code as program_code',
          'rips_programs.name as program_name',
          'rips_programs.description as program_description',
          'rips_programs.is_flagship',
          'rips_programs.domain_id',
          'rips_programs.subdomain_id',
          'rips_programs.order_index',
          'pc.name as category_name'
        )
        .orderBy('rips_programs.is_flagship', 'desc')
        .orderBy('rips_programs.order_index', 'asc')
        .orderBy('rips_programs.id', 'asc');
    } catch (e) {
      console.warn('[Keuangan] Gagal mengambil rips_programs:', e.message);
    }

    // 5. Ambil fallback link domain/subdomain dari sasaran strategis RIPS (goal links)
    let goalLinksMap = new Map();
    try {
      const allRipsIds = allRipsPrograms.map((r) => r.rips_program_id).filter(Boolean);
      if (allRipsIds.length > 0) {
        const goalLinks = await dbManajemen('rips_program_goal_links as pgl')
          .join('rips_goals as g', 'pgl.rips_goal_id', 'g.id')
          .select('pgl.rips_program_id', 'g.domain_id', 'g.subdomain_id')
          .whereIn('pgl.rips_program_id', allRipsIds);

        goalLinks.forEach((gl) => {
          if (!goalLinksMap.has(gl.rips_program_id)) {
            goalLinksMap.set(gl.rips_program_id, gl);
          }
        });
      }
    } catch (e) {
      console.warn('[Keuangan] Gagal mengambil goal links RIPS:', e.message);
    }

    // 6. Ambil existing budget_programs di DB Keuangan
    let bpQuery = db('budget_programs');
    if (targetUnit) {
      bpQuery = bpQuery.where((q) => {
        q.where('school_unit_id', targetUnit).orWhereNull('school_unit_id');
      });
    }
    const existingBp = await bpQuery;
    const existingMapByRef = new Map();
    const existingMapByName = new Map();
    existingBp.forEach(bp => {
      if (bp.rks_reference_id) existingMapByRef.set(Number(bp.rks_reference_id), bp);
      if (bp.name) existingMapByName.set(bp.name.trim().toLowerCase(), bp);
    });

    // 7. Sinkronisasi / pastikan program RKT/RIPS terdaftar dalam budget_programs
    const resultPrograms = [];
    const processedKeys = new Set();
    const processedNames = new Set();

    for (const prog of allRipsPrograms) {
      const refId = Number(prog.rips_program_id);
      const formattedName = prog.program_code ? `[${prog.program_code}] ${prog.program_name}` : prog.program_name;
      const key = `${refId}_${prog.program_name}`;
      const nameKey = (formattedName || prog.program_name).trim().toLowerCase();

      if (processedKeys.has(key) || processedNames.has(nameKey)) continue;
      processedKeys.add(key);
      processedNames.add(nameKey);

      let bpRecord = existingMapByRef.get(refId) || existingMapByName.get(formattedName.toLowerCase()) || existingMapByName.get(prog.program_name.toLowerCase());

      if (!bpRecord) {
        try {
          const [newId] = await db('budget_programs').insert({
            school_unit_id: targetUnit || 1,
            academic_year_id: academicYearId ? Number(academicYearId) : 0,
            name: formattedName,
            rks_reference_id: refId,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });
          bpRecord = {
            id: newId,
            school_unit_id: targetUnit || 1,
            academic_year_id: academicYearId || 0,
            name: formattedName,
            rks_reference_id: refId,
          };
          existingMapByRef.set(refId, bpRecord);
        } catch (err) {
          bpRecord = {
            id: refId,
            name: formattedName,
            rks_reference_id: refId,
          };
        }
      } else {
        // Jika nama atau kode di RIPS/RKT telah diperbarui, otomatis update tabel budget_programs di Keuangan
        if (bpRecord.id && (bpRecord.name !== formattedName || bpRecord.rks_reference_id !== refId)) {
          try {
            await db('budget_programs').where({ id: bpRecord.id }).update({
              name: formattedName,
              rks_reference_id: refId,
              updated_at: db.fn.now()
            });
            bpRecord.name = formattedName;
            bpRecord.rks_reference_id = refId;
          } catch (updErr) {
            console.warn('[Keuangan] Gagal auto-update nama budget_programs:', updErr.message);
          }
        }
      }

      // Resolve Domain & Subdomain (Direct on program OR via Goal Link)
      const goalLink = goalLinksMap.get(refId);
      const resolvedDomainId = prog.domain_id ? Number(prog.domain_id) : (goalLink?.domain_id ? Number(goalLink.domain_id) : null);
      const resolvedSubdomainId = prog.subdomain_id ? Number(prog.subdomain_id) : (goalLink?.subdomain_id ? Number(goalLink.subdomain_id) : null);

      const dObj = resolvedDomainId ? domainMap.get(resolvedDomainId) : null;
      const sObj = resolvedSubdomainId ? subdomainMap.get(resolvedSubdomainId) : null;

      const rktTarget = rktTargetMap.get(refId);

      resultPrograms.push({
        id: bpRecord.id,
        name: formattedName || bpRecord.name,
        code: prog.program_code || null,
        raw_name: prog.program_name,
        category_name: prog.category_name || null,
        is_flagship: Boolean(prog.is_flagship),
        rks_reference_id: refId,
        academic_year: rktTarget?.academic_year || academicYearName,
        is_active_rkt: Boolean(rktTarget),
        domain_id: resolvedDomainId,
        domain_name: dObj ? dObj.name : null,
        domain_code: dObj ? dObj.code : null,
        domain_order_index: dObj ? (dObj.order_index ?? 999) : 999,
        subdomain_id: resolvedSubdomainId,
        subdomain_name: sObj ? sObj.name : null,
        subdomain_code: sObj ? sObj.code : null,
        subdomain_order_index: sObj ? (sObj.order_index ?? 999) : 999,
        order_index: prog.order_index ?? 999,
      });
    }

    // 8. Tambahkan program manual non-RKT jika ada
    existingBp.forEach(bp => {
      const nameKey = (bp.name || '').trim().toLowerCase();
      if (!bp.rks_reference_id && !processedKeys.has(`manual_${bp.id}`) && !processedNames.has(nameKey)) {
        processedNames.add(nameKey);
        resultPrograms.push({
          id: bp.id,
          name: bp.name,
          code: null,
          raw_name: bp.name,
          category_name: 'Manual / Umum',
          is_flagship: false,
          rks_reference_id: null,
          academic_year: null,
          is_active_rkt: false,
          domain_id: null,
          domain_name: null,
          domain_code: null,
          subdomain_id: null,
          subdomain_name: null,
          subdomain_code: null,
        });
      }
    });

    return resultPrograms;
  }

  async createBudgetProgram(schoolUnitId, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : (data.school_unit_id || 1);
    const [id] = await db('budget_programs').insert({
      school_unit_id: targetUnit,
      academic_year_id: data.academic_year_id,
      name: data.name,
      rks_reference_id: data.rks_reference_id || null
    });
    return db('budget_programs').where({ id }).first();
  }

  async updateBudgetProgram(schoolUnitId, id, data, userId = null) {
    let query = db('budget_programs').where({ id });
    if (isUnit(schoolUnitId)) {
      query = query.where({ school_unit_id: schoolUnitId });
    }
    const before = await query.first();
    if (!before) return null;

    await db('budget_programs').where({ id: before.id }).update({
      name: data.name,
      academic_year_id: data.academic_year_id,
      rks_reference_id: data.rks_reference_id !== undefined ? data.rks_reference_id : null
    });
    return db('budget_programs').where({ id: before.id }).first();
  }

  async listCatalogItems(schoolUnitId, filters = {}) {
    let query = db('catalog_items')
      .leftJoin('transaction_categories', 'catalog_items.expense_category_id', 'transaction_categories.id')
      .select(
        'catalog_items.*',
        'transaction_categories.name as expense_category_name'
      );

    if (isUnit(schoolUnitId)) {
      query = query.where('catalog_items.school_unit_id', schoolUnitId);
    }
    if (filters.academic_year_id) {
      query = query.where('catalog_items.academic_year_id', filters.academic_year_id);
    }
    if (filters.expense_category_id) {
      query = query.where('catalog_items.expense_category_id', filters.expense_category_id);
    }
    if (filters.is_active !== undefined) {
      const isActive = filters.is_active === 'true' || filters.is_active === true;
      query = query.where('catalog_items.is_active', isActive);
    }
    return query.orderBy('catalog_items.name', 'asc');
  }

  async getCatalogItemById(schoolUnitId, id) {
    let query = db('catalog_items')
      .leftJoin('transaction_categories', 'catalog_items.expense_category_id', 'transaction_categories.id')
      .where('catalog_items.id', id)
      .select(
        'catalog_items.*',
        'transaction_categories.name as expense_category_name'
      );

    if (isUnit(schoolUnitId)) {
      query = query.where('catalog_items.school_unit_id', schoolUnitId);
    }
    return query.first();
  }

  async createCatalogItem(schoolUnitId, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : (data.school_unit_id || 1);
    const refPrice = parseFloat(data.reference_price || 0);
    const acadYearId = data.academic_year_id || 1;

    let validExpenseCatId = null;
    if (data.expense_category_id) {
      const catCheck = await db('transaction_categories').where({ id: data.expense_category_id }).first();
      if (catCheck) {
        validExpenseCatId = catCheck.id;
      }
    }

    const [id] = await db('catalog_items').insert({
      school_unit_id: targetUnit,
      expense_category_id: validExpenseCatId,
      academic_year_id: acadYearId,
      name: data.name.trim(),
      unit: data.unit.trim(),
      reference_price: refPrice,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true
    });

    // Catat riwayat harga acuan awal
    await db('catalog_item_price_history').insert({
      catalog_item_id: id,
      academic_year_id: acadYearId,
      old_price: refPrice,
      new_price: refPrice,
      changed_by: userId,
      reason: data.reason || data.edit_reason || 'Inisialisasi harga acuan katalog'
    });

    const created = await this.getCatalogItemById(targetUnit, id);
    await logFinanceAudit({
      schoolUnitId: targetUnit,
      userId,
      action: 'CREATE_CATALOG_ITEM',
      entityType: 'catalog_item',
      entityId: id,
      dataAfter: created
    });
    return created;
  }

  async updateCatalogItem(schoolUnitId, id, data, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;
    const before = await this.getCatalogItemById(targetUnit, id);
    if (!before) return null;

    const newRefPrice = data.reference_price !== undefined ? parseFloat(data.reference_price) : parseFloat(before.reference_price);
    const oldRefPrice = parseFloat(before.reference_price);
    const acadYearId = data.academic_year_id || before.academic_year_id;

    let validExpenseCatId = before.expense_category_id;
    if (data.expense_category_id !== undefined) {
      if (data.expense_category_id) {
        const catCheck = await db('transaction_categories').where({ id: data.expense_category_id }).first();
        validExpenseCatId = catCheck ? catCheck.id : null;
      } else {
        validExpenseCatId = null;
      }
    }

    await db('catalog_items')
      .where({ id })
      .update({
        expense_category_id: validExpenseCatId,
        academic_year_id: acadYearId,
        name: data.name !== undefined ? data.name.trim() : before.name,
        unit: data.unit !== undefined ? data.unit.trim() : before.unit,
        reference_price: newRefPrice
      });

    // Jika harga berubah, catat riwayat harga
    if (Math.abs(newRefPrice - oldRefPrice) > 0.001) {
      await db('catalog_item_price_history').insert({
        catalog_item_id: id,
        academic_year_id: acadYearId,
        old_price: oldRefPrice,
        new_price: newRefPrice,
        changed_by: userId,
        reason: data.reason || data.edit_reason || 'Penyesuaian harga acuan katalog'
      });
    }

    const updated = await this.getCatalogItemById(targetUnit, id);
    await logFinanceAudit({
      schoolUnitId: targetUnit,
      userId,
      action: 'UPDATE_CATALOG_ITEM',
      entityType: 'catalog_item',
      entityId: id,
      dataBefore: before,
      dataAfter: { ...updated, edit_reason: data.reason || data.edit_reason || null }
    });
    return updated;
  }

  async updateCatalogItemStatus(schoolUnitId, id, isActive, userId = null) {
    const targetUnit = isUnit(schoolUnitId) ? schoolUnitId : 1;
    const before = await this.getCatalogItemById(targetUnit, id);
    if (!before) return null;

    await db('catalog_items')
      .where({ id })
      .update({ is_active: Boolean(isActive) });

    const updated = await this.getCatalogItemById(targetUnit, id);
    await logFinanceAudit({
      schoolUnitId: targetUnit,
      userId,
      action: isActive ? 'ACTIVATE_CATALOG_ITEM' : 'DEACTIVATE_CATALOG_ITEM',
      entityType: 'catalog_item',
      entityId: id,
      dataBefore: before,
      dataAfter: updated
    });
    return updated;
  }

  async getCatalogItemPriceHistory(catalogItemId) {
    return db('catalog_item_price_history')
      .where({ catalog_item_id: catalogItemId })
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc');
  }

  // ============================================================
  // 9. STUDENT FEE ADJUSTMENTS & WAIVERS (Fitur #9)
  // ============================================================

  async listStudentFeeAdjustments(schoolUnitId, filters = {}) {
    let query = db('student_fee_adjustments')
      .join('fee_types', 'student_fee_adjustments.fee_type_id', 'fee_types.id')
      .select('student_fee_adjustments.*', 'fee_types.name as fee_type_name');

    if (isUnit(schoolUnitId)) {
      query = query.where('student_fee_adjustments.school_unit_id', schoolUnitId);
    }

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
