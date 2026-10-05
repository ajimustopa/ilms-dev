/**
 * Expenses Service for Keuangan Module
 * Enterprise Multi-School Integrated Edition
 * 
 * Mendukung:
 * 1. Pencatatan pengeluaran berbasis Pos RAPBS atau Di Luar RAPBS (Non-RAPBS / Darurat).
 * 2. Integrasi Standar Biaya / Katalog Barang / Jasa.
 * 3. Akomodasi pengadaan sifat Paket / Borongan / Lumpsum vs Satuan Barang (Qty x Harga Satuan).
 * 4. Integrasi & Rekonsiliasi Mutasi Rekening Koran Bank (Nontunai).
 * 5. Otomatisasi Jurnal Akuntansi (Debet Beban & Kredit Kas/Bank) dengan dukungan Override Manual.
 * 6. Pelacakan Sumber Dana / Kantong Dana (Fund Balances).
 * 7. Integrasi Program Anggaran RKS & GTK (Guru dan Tenaga Kependidikan) PIC Penerima Dana.
 * 8. Kartu Ringkasan Makro Pengeluaran & Filter Per Bulan.
 * 9. Void / Pembatalan Pengeluaran dengan Storno Jurnal & Audit Log.
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const { recordJournal } = require('../bookkeeping/journalEngine');
const fundBalanceEngine = require('../bookkeeping/fundBalanceEngine');

class ExpensesService {
  /**
   * Mengambil daftar transaksi pengeluaran dengan filter lengkap
   */
  async listExpenses(schoolUnitId, filters = {}) {
    const isAllUnits = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const unitId = isAllUnits ? null : Number(schoolUnitId);

    let query = db('expenses')
      .leftJoin('budget_plan_expense_items as bpei', 'expenses.budget_plan_expense_item_id', 'bpei.id')
      .leftJoin('budget_plans as bp', 'bpei.budget_plan_id', 'bp.id')
      .leftJoin('budget_programs as bprog', function() {
        this.on('expenses.budget_program_id', '=', 'bprog.id')
            .orOn('bpei.budget_program_id', '=', 'bprog.id');
      })
      .leftJoin('catalog_items as cat', function() {
        this.on('expenses.catalog_item_id', '=', 'cat.id')
            .orOn('bpei.catalog_item_id', '=', 'cat.id');
      })
      .leftJoin('transaction_categories as tr_cat', function() {
        this.on('expenses.transaction_category_id', '=', 'tr_cat.id')
            .orOn('cat.expense_category_id', '=', 'tr_cat.id');
      })
      .leftJoin('cash_accounts as ca', 'expenses.cash_account_id', 'ca.id')
      .leftJoin('bank_statements as bs', 'expenses.bank_statement_id', 'bs.id')
      .leftJoin('chart_of_accounts as debit_coa', 'expenses.override_debit_account_id', 'debit_coa.id')
      .leftJoin('chart_of_accounts as credit_coa', 'expenses.override_credit_account_id', 'credit_coa.id')
      .leftJoin('fee_types as default_fund_fee', 'bpei.fund_source_fee_type_id', 'default_fund_fee.id')
      .leftJoin('fee_types as actual_fund_fee', function () {
        this.on('expenses.fund_source_ref_id', '=', 'actual_fund_fee.id')
            .andOn('expenses.fund_source_type', '=', db.raw("'fee_type'"));
      })
      .leftJoin('transaction_categories as actual_fund_cat', function () {
        this.on('expenses.fund_source_ref_id', '=', 'actual_fund_cat.id')
            .andOn('expenses.fund_source_type', '=', db.raw("'transaction_category'"));
      })
      .leftJoin('budget_plan_income_items as actual_fund_income_item', function () {
        this.on('expenses.fund_source_ref_id', '=', 'actual_fund_income_item.id')
            .andOn('expenses.fund_source_type', '=', db.raw("'budget_income_item'"));
      })
      .select(
        'expenses.*',
        'bpei.name as budget_item_name',
        'bpei.planned_amount as budget_item_pagu',
        'bprog.id as program_id',
        'bprog.name as budget_program_name',
        'cat.id as catalog_item_id_ref',
        'cat.name as catalog_item_name',
        'cat.unit as catalog_unit',
        'cat.reference_price as catalog_reference_price',
        'tr_cat.name as category_name',
        'ca.name as cash_account_name',
        'ca.account_kind as cash_account_kind',
        'ca.bank_name as cash_bank_name',
        'ca.bank_account_number as cash_bank_account_number',
        'bs.description as bank_statement_desc',
        'bs.journal_number as bank_statement_ref',
        'bs.amount as bank_statement_amount',
        'bs.transaction_date as bank_statement_date',
        'debit_coa.account_code as debit_account_code',
        'debit_coa.account_name as debit_account_name',
        'credit_coa.account_code as credit_account_code',
        'credit_coa.account_name as credit_account_name',
        'default_fund_fee.name as default_fund_source_name',
        'actual_fund_fee.name as actual_fund_fee_name',
        'actual_fund_cat.name as actual_fund_cat_name',
        'actual_fund_income_item.name as actual_fund_income_item_name',
        'bp.title as budget_plan_title',
        'bp.version as budget_plan_version'
      );

    if (unitId) {
      query = query.where('expenses.school_unit_id', unitId);
    }

    if (filters.include_deleted === 'true' || filters.include_deleted === true || filters.include_deleted === '1') {
      // allow seeing deleted/cancelled expenses
    } else {
      query = query.whereNull('expenses.deleted_at');
    }

    if (filters.academic_year_id && filters.academic_year_id !== 'all') {
      query = query.where('expenses.academic_year_id', Number(filters.academic_year_id));
    }

    if (filters.month && filters.month !== 'all') {
      query = query.whereRaw('MONTH(expenses.expense_date) = ?', [Number(filters.month)]);
    }

    if (filters.is_outside_budget !== undefined && filters.is_outside_budget !== 'all') {
      const boolVal = filters.is_outside_budget === 'true' || filters.is_outside_budget === '1' || filters.is_outside_budget === true;
      query = query.where('expenses.is_outside_budget', boolVal ? 1 : 0);
    }

    if (filters.budget_plan_expense_item_id && filters.budget_plan_expense_item_id !== 'all') {
      if (filters.budget_plan_expense_item_id === 'unbudgeted') {
        query = query.where('expenses.is_outside_budget', 1);
      } else {
        query = query.where('expenses.budget_plan_expense_item_id', Number(filters.budget_plan_expense_item_id));
      }
    }

    if (filters.cash_account_id && filters.cash_account_id !== 'all') {
      query = query.where('expenses.cash_account_id', Number(filters.cash_account_id));
    }

    if (filters.budget_program_id && filters.budget_program_id !== 'all') {
      query = query.where(b => b.where('expenses.budget_program_id', Number(filters.budget_program_id)).orWhere('bpei.budget_program_id', Number(filters.budget_program_id)));
    }

    if (filters.payment_method && filters.payment_method !== 'all') {
      query = query.where('expenses.payment_method', filters.payment_method);
    }

    if (filters.staff_id && filters.staff_id !== 'all') {
      query = query.where('expenses.staff_id', Number(filters.staff_id));
    }

    if (filters.start_date) {
      query = query.where('expenses.expense_date', '>=', filters.start_date);
    }
    if (filters.end_date) {
      query = query.where('expenses.expense_date', '<=', filters.end_date);
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.where((q) => {
        q.where('expenses.item_name', 'like', term)
         .orWhere('expenses.vendor', 'like', term)
         .orWhere('expenses.proof_number', 'like', term)
         .orWhere('expenses.staff_name', 'like', term)
         .orWhere('expenses.notes', 'like', term)
         .orWhere('bpei.name', 'like', term)
         .orWhere('cat.name', 'like', term)
         .orWhere('ca.name', 'like', term)
         .orWhere('bprog.name', 'like', term);
      });
    }

    return query.orderBy('expenses.expense_date', 'desc').orderBy('expenses.id', 'desc');
  }

  /**
   * Mengambil Ringkasan Statistik Makro Pengeluaran
   */
  async getExpenseSummary(schoolUnitId, filters = {}) {
    const isAllUnits = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const unitId = isAllUnits ? null : Number(schoolUnitId);
    const ayId = filters.academic_year_id ? Number(filters.academic_year_id) : null;
    const month = filters.month && filters.month !== 'all' ? Number(filters.month) : null;

    // 1. Query Pengeluaran Aktif
    let expQuery = db('expenses').whereNull('deleted_at');
    if (unitId) expQuery = expQuery.where('school_unit_id', unitId);
    if (ayId) expQuery = expQuery.where('academic_year_id', ayId);
    if (month) expQuery = expQuery.whereRaw('MONTH(expense_date) = ?', [month]);

    const expRows = await expQuery.select(
      'total_amount',
      'is_outside_budget',
      'payment_method',
      'bank_statement_id'
    );

    let totalExpensesAmount = 0;
    let totalExpensesCount = expRows.length;
    let totalBudgetedAmount = 0;
    let budgetedCount = 0;
    let totalOutsideBudgetAmount = 0;
    let outsideBudgetCount = 0;
    let totalNonCashAmount = 0;
    let totalCashAmount = 0;
    let reconciledBankCount = 0;

    for (const row of expRows) {
      const amt = parseFloat(row.total_amount || 0);
      totalExpensesAmount += amt;

      if (row.is_outside_budget) {
        totalOutsideBudgetAmount += amt;
        outsideBudgetCount += 1;
      } else {
        totalBudgetedAmount += amt;
        budgetedCount += 1;
      }

      if (row.payment_method === 'bank_transfer' || row.bank_statement_id) {
        totalNonCashAmount += amt;
        if (row.bank_statement_id) reconciledBankCount += 1;
      } else {
        totalCashAmount += amt;
      }
    }

    // 2. Query Total Pagu Belanja RAPBS
    let rapbsQuery = db('budget_plan_expense_items')
      .join('budget_plans', 'budget_plan_expense_items.budget_plan_id', 'budget_plans.id');

    if (unitId) {
      rapbsQuery = rapbsQuery.where(b => b.where('budget_plans.school_unit_id', unitId).orWhere('budget_plans.school_unit_id', 0));
    }
    if (ayId) {
      rapbsQuery = rapbsQuery.where('budget_plans.academic_year_id', ayId);
    }

    const rapbsPaguRes = await rapbsQuery.sum('budget_plan_expense_items.planned_amount as total_pagu').first();
    const totalRapbsPagu = parseFloat(rapbsPaguRes?.total_pagu || 0);

    const rapbsRealizationPercentage = totalRapbsPagu > 0
      ? Math.round((totalBudgetedAmount / totalRapbsPagu) * 10000) / 100
      : (totalBudgetedAmount > 0 ? 100 : 0);

    return {
      total_expenses_amount: totalExpensesAmount,
      total_expenses_count: totalExpensesCount,
      total_budgeted_amount: totalBudgetedAmount,
      budgeted_count: budgetedCount,
      total_outside_budget_amount: totalOutsideBudgetAmount,
      outside_budget_count: outsideBudgetCount,
      total_non_cash_amount: totalNonCashAmount,
      total_cash_amount: totalCashAmount,
      reconciled_bank_count: reconciledBankCount,
      total_rapbs_pagu: totalRapbsPagu,
      rapbs_realization_percentage: rapbsRealizationPercentage,
      remaining_rapbs_pagu: Math.max(0, totalRapbsPagu - totalBudgetedAmount)
    };
  }

  /**
   * Mengambil Detail Pengeluaran Berdasarkan ID
   */
  async getExpenseById(schoolUnitId, id, trx = null) {
    const isAllUnits = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation' || Number(schoolUnitId) === 0;
    const activeDb = trx || db;

    let query = activeDb('expenses')
      .leftJoin('budget_plan_expense_items as bpei', 'expenses.budget_plan_expense_item_id', 'bpei.id')
      .leftJoin('budget_plans as bp', 'bpei.budget_plan_id', 'bp.id')
      .leftJoin('budget_programs as bprog', function() {
        this.on('expenses.budget_program_id', '=', 'bprog.id')
            .orOn('bpei.budget_program_id', '=', 'bprog.id');
      })
      .leftJoin('catalog_items as cat', function() {
        this.on('expenses.catalog_item_id', '=', 'cat.id')
            .orOn('bpei.catalog_item_id', '=', 'cat.id');
      })
      .leftJoin('transaction_categories as tr_cat', function() {
        this.on('expenses.transaction_category_id', '=', 'tr_cat.id')
            .orOn('cat.expense_category_id', '=', 'tr_cat.id');
      })
      .leftJoin('cash_accounts as ca', 'expenses.cash_account_id', 'ca.id')
      .leftJoin('bank_statements as bs', 'expenses.bank_statement_id', 'bs.id')
      .leftJoin('chart_of_accounts as debit_coa', 'expenses.override_debit_account_id', 'debit_coa.id')
      .leftJoin('chart_of_accounts as credit_coa', 'expenses.override_credit_account_id', 'credit_coa.id')
      .leftJoin('fee_types as default_fund_fee', 'bpei.fund_source_fee_type_id', 'default_fund_fee.id')
      .leftJoin('fee_types as actual_fund_fee', function () {
        this.on('expenses.fund_source_ref_id', '=', 'actual_fund_fee.id')
            .andOn('expenses.fund_source_type', '=', activeDb.raw("'fee_type'"));
      })
      .leftJoin('transaction_categories as actual_fund_cat', function () {
        this.on('expenses.fund_source_ref_id', '=', 'actual_fund_cat.id')
            .andOn('expenses.fund_source_type', '=', activeDb.raw("'transaction_category'"));
      })
      .leftJoin('budget_plan_income_items as actual_fund_income_item', function () {
        this.on('expenses.fund_source_ref_id', '=', 'actual_fund_income_item.id')
            .andOn('expenses.fund_source_type', '=', activeDb.raw("'budget_income_item'"));
      })
      .where('expenses.id', id)
      .select(
        'expenses.*',
        'bpei.name as budget_item_name',
        'bpei.planned_amount as budget_item_pagu',
        'bprog.id as program_id',
        'bprog.name as budget_program_name',
        'cat.id as catalog_item_id_ref',
        'cat.name as catalog_item_name',
        'cat.unit as catalog_unit',
        'cat.reference_price as catalog_reference_price',
        'tr_cat.name as category_name',
        'ca.name as cash_account_name',
        'ca.account_kind as cash_account_kind',
        'ca.bank_name as cash_bank_name',
        'ca.bank_account_number as cash_bank_account_number',
        'bs.description as bank_statement_desc',
        'bs.journal_number as bank_statement_ref',
        'bs.amount as bank_statement_amount',
        'bs.transaction_date as bank_statement_date',
        'debit_coa.account_code as debit_account_code',
        'debit_coa.account_name as debit_account_name',
        'credit_coa.account_code as credit_account_code',
        'credit_coa.account_name as credit_account_name',
        'default_fund_fee.name as default_fund_source_name',
        'actual_fund_fee.name as actual_fund_fee_name',
        'actual_fund_cat.name as actual_fund_cat_name',
        'actual_fund_income_item.name as actual_fund_income_item_name',
        'bp.title as budget_plan_title',
        'bp.version as budget_plan_version'
      );

    if (!isAllUnits && schoolUnitId) {
      query = query.where(q => q.where('expenses.school_unit_id', Number(schoolUnitId)).orWhere('expenses.school_unit_id', 0));
    }

    return query.first();
  }

  /**
   * Mencatat Transaksi Pengeluaran Baru
   */
  async createExpense(schoolUnitId, data, userId = null) {
    const isPackage = Boolean(data.is_package);
    let unitPrice = parseFloat(data.unit_price || 0);
    let quantity = parseFloat(data.quantity || 1);
    let totalAmount = 0;

    if (isPackage) {
      totalAmount = parseFloat(data.total_amount || unitPrice || 0);
      quantity = 1;
      unitPrice = totalAmount;
    } else {
      if (data.total_amount && (!unitPrice || unitPrice === 0)) {
        totalAmount = parseFloat(data.total_amount);
        unitPrice = quantity > 0 ? totalAmount / quantity : totalAmount;
      } else {
        totalAmount = unitPrice * quantity;
      }
    }

    if (isNaN(totalAmount) || totalAmount <= 0) {
      const err = new Error('Nominal pengeluaran harus lebih besar dari 0');
      err.statusCode = 422;
      throw err;
    }

    const isOutsideBudget = Boolean(data.is_outside_budget || !data.budget_plan_expense_item_id);
    const budgetPlanExpenseItemId = isOutsideBudget ? null : Number(data.budget_plan_expense_item_id);
    const paymentMethod = data.payment_method || (data.bank_statement_id ? 'bank_transfer' : 'cash');
    const bankStatementId = paymentMethod === 'bank_transfer' && data.bank_statement_id ? Number(data.bank_statement_id) : null;
    const expenseDate = data.expense_date || new Date().toISOString().slice(0, 10);
    const proposedToRapbs = isOutsideBudget ? Boolean(data.proposed_to_rapbs) : false;

    return db.transaction(async (trx) => {
      // 1. Tentukan Rekening Kas / Bank Penampung
      let cashAccountId = data.cash_account_id ? Number(data.cash_account_id) : null;
      if (!cashAccountId) {
        if (bankStatementId) {
          const stmt = await trx('bank_statements').where({ id: bankStatementId }).first();
          if (stmt && stmt.cash_account_id) cashAccountId = Number(stmt.cash_account_id);
        }
        if (!cashAccountId) {
          const defaultCash = await trx('cash_accounts')
            .where({ school_unit_id: schoolUnitId, is_active: 1 })
            .first()
            || await trx('cash_accounts').where({ is_active: 1 }).first();
          if (defaultCash) cashAccountId = defaultCash.id;
        }
      }

      // 2. Tentukan Sumber Dana & Resolusi Pos RAPBS
      let defaultFundType = 'opening_pool';
      let defaultFundRefId = 0;
      let rapbsItem = null;
      let resolvedAcademicYearId = data.academic_year_id ? Number(data.academic_year_id) : null;
      let fundSources = null;
      let catalogItemId = data.catalog_item_id ? Number(data.catalog_item_id) : null;
      let budgetProgramId = data.budget_program_id ? Number(data.budget_program_id) : null;
      let transactionCategoryId = data.transaction_category_id ? Number(data.transaction_category_id) : null;

      if (data.fund_sources) {
        try {
          const parsed = typeof data.fund_sources === 'string' ? JSON.parse(data.fund_sources) : data.fund_sources;
          if (Array.isArray(parsed) && parsed.length > 0) {
            fundSources = parsed;
          }
        } catch (_) {}
      }

      if (!isOutsideBudget && budgetPlanExpenseItemId) {
        rapbsItem = await trx('budget_plan_expense_items')
          .where({ id: budgetPlanExpenseItemId })
          .first();

        if (rapbsItem) {
          if (!catalogItemId && rapbsItem.catalog_item_id) catalogItemId = Number(rapbsItem.catalog_item_id);
          if (!budgetProgramId && rapbsItem.budget_program_id) budgetProgramId = Number(rapbsItem.budget_program_id);

          if (rapbsItem.fund_source_fee_type_id) {
            defaultFundType = 'fee_type';
            defaultFundRefId = Number(rapbsItem.fund_source_fee_type_id);
          } else if (rapbsItem.fund_source_income_item_id) {
            defaultFundType = 'budget_income_item';
            defaultFundRefId = Number(rapbsItem.fund_source_income_item_id);
          } else if (rapbsItem.fund_source_type) {
            defaultFundType = rapbsItem.fund_source_type;
            defaultFundRefId = Number(rapbsItem.fund_source_ref_id || 0);
          }

          // Hanya fallback ke rapbsItem.fund_sources jika client TIDAK mengirim fund_source_type DAN TIDAK mengirim fund_sources
          if (!data.fund_source_type && !data.fund_sources && rapbsItem.fund_sources) {
            try {
              const rfs = typeof rapbsItem.fund_sources === 'string'
                ? JSON.parse(rapbsItem.fund_sources)
                : rapbsItem.fund_sources;
              if (Array.isArray(rfs) && rfs.length > 0) {
                fundSources = rfs;
              }
            } catch (_) {}
          }
          if (!resolvedAcademicYearId && rapbsItem.budget_plan_id) {
            const plan = await trx('budget_plans').where({ id: rapbsItem.budget_plan_id }).first();
            if (plan) resolvedAcademicYearId = Number(plan.academic_year_id);
          }
        }
      }

      if (!resolvedAcademicYearId) {
        const activeAy = await trx('academic_years').where({ is_active: 1 }).first();
        resolvedAcademicYearId = activeAy ? Number(activeAy.id) : 2;
      }

      // 3. Sumber dana yang dipilih
      const chosenFundType = data.fund_source_type || defaultFundType;
      let chosenFundRefId = 0;
      if (chosenFundType !== 'opening_pool') {
        if (data.fund_source_ref_id !== undefined && data.fund_source_ref_id !== null && data.fund_source_ref_id !== '') {
          chosenFundRefId = Number(data.fund_source_ref_id);
        } else if (chosenFundType === defaultFundType) {
          chosenFundRefId = defaultFundRefId;
        }
      }

      // 4. Resolusi Akun Akuntansi (Debit Biaya/Aset & Kredit Kas/Bank)
      let resolvedDebitAccountId = data.override_debit_account_id ? Number(data.override_debit_account_id) : null;
      let resolvedCreditAccountId = data.override_credit_account_id ? Number(data.override_credit_account_id) : null;

      // Ambil akun debet dari RAPBS item jika ada
      if (!resolvedDebitAccountId && rapbsItem?.debit_account_id) {
        resolvedDebitAccountId = Number(rapbsItem.debit_account_id);
      }

      // Ambil akun debet dari catalog item jika ada
      if (!resolvedDebitAccountId && catalogItemId) {
        const catItem = await trx('catalog_items')
          .leftJoin('transaction_categories', 'catalog_items.expense_category_id', 'transaction_categories.id')
          .where('catalog_items.id', catalogItemId)
          .select('catalog_items.expense_category_id', 'catalog_items.debit_account_id', 'catalog_items.credit_account_id', 'transaction_categories.related_account_id')
          .first();
        if (catItem) {
          if (!transactionCategoryId && catItem.expense_category_id) transactionCategoryId = catItem.expense_category_id;
          if (catItem.debit_account_id) resolvedDebitAccountId = Number(catItem.debit_account_id);
          else if (catItem.related_account_id) resolvedDebitAccountId = Number(catItem.related_account_id);
          if (!resolvedCreditAccountId && catItem.credit_account_id) resolvedCreditAccountId = Number(catItem.credit_account_id);
        }
      }

      // Ambil akun kredit dari RAPBS item jika ada
      if (!resolvedCreditAccountId && rapbsItem?.credit_account_id) {
        resolvedCreditAccountId = Number(rapbsItem.credit_account_id);
      }

      // Ambil akun debet dari kategori pengeluaran
      if (!resolvedDebitAccountId && transactionCategoryId) {
        const trCat = await trx('transaction_categories').where({ id: transactionCategoryId }).first();
        if (trCat && trCat.related_account_id) resolvedDebitAccountId = Number(trCat.related_account_id);
      }

      // Fallback akun debit ke Beban Operasional / 50000
      if (!resolvedDebitAccountId) {
        const defaultBeban = await trx('chart_of_accounts')
          .where({ account_group: 'biaya', normal_balance: 'debit' })
          .orderBy('id', 'asc')
          .first();
        if (defaultBeban) resolvedDebitAccountId = defaultBeban.id;
      }

      // Resolusi Akun Kredit dari Rekening Kas / Bank
      if (!resolvedCreditAccountId && cashAccountId) {
        const cashAcc = await trx('cash_accounts').where({ id: cashAccountId }).first();
        if (cashAcc && cashAcc.account_id) resolvedCreditAccountId = Number(cashAcc.account_id);
      }
      if (!resolvedCreditAccountId) {
        const defaultCashCoa = await trx('chart_of_accounts')
          .where({ account_group: 'harta', normal_balance: 'debit' })
          .orderBy('id', 'asc')
          .first();
        if (defaultCashCoa) resolvedCreditAccountId = defaultCashCoa.id;
      }

      // 5. Insert Pengeluaran ke Tabel expenses
      const [id] = await trx('expenses').insert({
        school_unit_id: schoolUnitId,
        cash_account_id: cashAccountId,
        bank_statement_id: bankStatementId,
        academic_year_id: resolvedAcademicYearId,
        budget_plan_expense_item_id: budgetPlanExpenseItemId,
        budget_program_id: budgetProgramId,
        catalog_item_id: catalogItemId,
        transaction_category_id: transactionCategoryId,
        staff_id: data.staff_id ? Number(data.staff_id) : null,
        staff_name: data.staff_name ? String(data.staff_name).trim() : null,
        payment_method: paymentMethod,
        is_package: isPackage ? 1 : 0,
        is_outside_budget: isOutsideBudget ? 1 : 0,
        proposed_to_rapbs: proposedToRapbs ? 1 : 0,
        item_name: data.item_name || (rapbsItem?.name || 'Pengeluaran Operasional'),
        unit: isPackage ? 'Paket' : (data.unit || 'pcs'),
        unit_price: unitPrice,
        quantity: quantity,
        total_amount: totalAmount,
        vendor: data.vendor ? String(data.vendor).trim() : null,
        expense_date: expenseDate,
        proof_number: data.proof_number ? String(data.proof_number).trim() : null,
        notes: data.notes ? String(data.notes).trim() : null,
        fund_source_type: chosenFundType,
        fund_source_ref_id: chosenFundRefId,
        fund_source_override_reason: data.fund_source_override_reason || null,
        fund_sources: fundSources ? JSON.stringify(fundSources) : null,
        override_debit_account_id: resolvedDebitAccountId,
        override_credit_account_id: resolvedCreditAccountId,
        override_reason: data.override_reason || null
      });

      const actualId = id || (await trx('expenses').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

      // 6. Rekonsiliasi Mutasi Rekening Koran jika Nontunai
      if (bankStatementId) {
        try {
          const stmt = await trx('bank_statements').where({ id: bankStatementId }).first();
          if (stmt) {
            const allocSum = await trx('bank_statement_references')
              .where('bank_statement_id', stmt.id)
              .sum('amount as total_allocated')
              .first();
            const curAlloc = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
            const stmtTotal = parseFloat(stmt.amount || 0);
            const remainingPlafon = Math.max(0, stmtTotal - curAlloc);
            if (remainingPlafon <= 0) {
              const err = new Error('Mutasi rekening koran ini sudah dialokasikan penuh (sisa plafon Rp 0). Harap pilih mutasi lain.');
              err.statusCode = 422;
              throw err;
            }
            const thisAlloc = Math.min(totalAmount, remainingPlafon);

            await trx('bank_statement_references').insert({
              bank_statement_id: stmt.id,
              school_unit_id: schoolUnitId || 1,
              reference_type: 'expense',
              reference_id: actualId,
              amount: thisAlloc,
              notes: `BKK Pengeluaran #${actualId} (${data.item_name || 'Belanja'})`,
              created_by: userId
            });

            const newAlloc = curAlloc + thisAlloc;
            const isFullyReconciled = newAlloc >= stmtTotal - 0.01;

            await trx('bank_statements')
              .where({ id: stmt.id })
              .update({
                is_reconciled: isFullyReconciled,
                reconciled_reference_type: 'expense',
                reconciled_reference_id: actualId,
                reconciliation_notes: isFullyReconciled
                  ? `Lunas teralokasi ke belanja (BKK #${actualId})`
                  : `Teralokasi Rp ${newAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`,
                reconciled_at: isFullyReconciled ? trx.fn.now() : stmt.reconciled_at,
                updated_at: trx.fn.now()
              });
          }
        } catch (bsErr) {
          if (bsErr.statusCode === 422) throw bsErr;
          console.warn('Bank statement reconciliation for expense error:', bsErr.message);
        }
      }

      // 7. Auto Journal Entry via journalEngine
      try {
        await recordJournal({
          schoolUnitId,
          academicYearId: resolvedAcademicYearId,
          transactionCode: 'expense_default',
          amount: totalAmount,
          sourceType: 'expense',
          sourceId: actualId,
          description: `${isOutsideBudget ? '[Di Luar RAPBS] ' : ''}Pengeluaran: ${data.item_name} ${data.vendor ? `(${data.vendor})` : ''} ${data.proof_number ? `[${data.proof_number}]` : ''}`,
          journalDate: expenseDate,
          overrideDebitAccountId: resolvedDebitAccountId,
          overrideCreditAccountId: resolvedCreditAccountId,
          overrideCashAccountId: cashAccountId,
          overrideReason: data.override_reason || null,
          userId,
          trx
        });
      } catch (journalErr) {
        if (journalErr.statusCode === 422) throw journalErr;
        console.warn('Auto journal for expense skipped or error:', journalErr.message);
      }

      // 8. Terapkan Mutasi Pengurangan pada Kantong Dana
      try {
        if (Array.isArray(fundSources) && fundSources.length > 0) {
          for (const src of fundSources) {
            const sAmt = parseFloat(src.amount || 0);
            if (sAmt > 0) {
              const targetAy = src.target_academic_year_id || src.academic_year_id || resolvedAcademicYearId;
              const fundType = src.fund_type || (src.fee_type_id ? 'fee_type' : (src.income_item_id ? 'budget_income_item' : 'opening_pool'));
              const fundRefId = Number(src.fund_ref_id || src.fee_type_id || src.income_item_id || 0);
              await fundBalanceEngine.applyFundMutation({
                schoolUnitId,
                fundType,
                fundRefId,
                academicYearId: targetAy,
                direction: 'out',
                amount: sAmt,
                sourceTable: 'expenses',
                sourceId: actualId,
                notes: `Pengeluaran belanja #${actualId}: ${data.item_name} (Pos Dana ${src.name || (src.scope === 'prior' ? 'Saldo Bawaan' : 'T.A. Berjalan')})`,
                userId,
                trx
              });
            }
          }
        } else {
          const targetAy = data.fund_source_academic_year_id || (data.fund_source_scope === 'prior' ? data.target_academic_year_id : null) || resolvedAcademicYearId;
          await fundBalanceEngine.applyFundMutation({
            schoolUnitId,
            fundType: chosenFundType,
            fundRefId: chosenFundRefId,
            academicYearId: targetAy,
            direction: 'out',
            amount: totalAmount,
            sourceTable: 'expenses',
            sourceId: actualId,
            notes: `Pengeluaran belanja #${actualId}: ${data.item_name}`,
            userId,
            trx
          });
        }
      } catch (fbErr) {
        console.warn('Fund balance mutation for expense skipped or error:', fbErr.message);
      }

      const created = await this.getExpenseById(schoolUnitId, actualId, trx);

      // 9. Cek Pagu RAPBS Warning
      let budgetWarning = null;
      let itemRemainingBudget = null;

      if (!isOutsideBudget && budgetPlanExpenseItemId) {
        const item = await trx('budget_plan_expense_items')
          .where({ id: budgetPlanExpenseItemId })
          .first();

        if (item) {
          const realized = await trx('expenses')
            .where({ budget_plan_expense_item_id: item.id })
            .whereNull('deleted_at')
            .sum('total_amount as sum')
            .first();

          const currentTotal = parseFloat(realized?.sum || 0);
          const budgetPagu = parseFloat(item.total_price || item.planned_amount || 0);
          itemRemainingBudget = Math.max(0, budgetPagu - currentTotal);

          if (currentTotal > budgetPagu) {
            budgetWarning = `Peringatan: Total realisasi belanja untuk item RAPBS '${item.name || item.item_name}' (Rp ${currentTotal.toLocaleString('id-ID')}) melebihi pagu anggaran (Rp ${budgetPagu.toLocaleString('id-ID')}) sebesar Rp ${(currentTotal - budgetPagu).toLocaleString('id-ID')}`;
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
        is_over_budget: Boolean(budgetWarning),
        item_remaining_budget: itemRemainingBudget
      };
    });
  }

  /**
   * Memperbarui / Mengoreksi Data Pengeluaran
   */
  async updateExpense(schoolUnitId, id, data, userId = null) {
    const editReason = data.edit_reason || data.reason || 'Koreksi transaksi pengeluaran';

    return db.transaction(async (trx) => {
      const before = await this.getExpenseById(schoolUnitId, id, trx);
      if (!before || before.deleted_at) {
        const err = new Error('Data pengeluaran tidak ditemukan atau telah dibatalkan');
        err.statusCode = 404;
        throw err;
      }

      const isPackage = data.is_package !== undefined ? Boolean(data.is_package) : Boolean(before.is_package);
      let unitPrice = data.unit_price !== undefined ? parseFloat(data.unit_price) : parseFloat(before.unit_price);
      let quantity = data.quantity !== undefined ? parseFloat(data.quantity) : parseFloat(before.quantity);
      let totalAmount = 0;

      if (isPackage) {
        totalAmount = data.total_amount !== undefined ? parseFloat(data.total_amount) : (data.unit_price !== undefined ? parseFloat(data.unit_price) : parseFloat(before.total_amount));
        quantity = 1;
        unitPrice = totalAmount;
      } else {
        totalAmount = data.total_amount !== undefined ? parseFloat(data.total_amount) : (unitPrice * quantity);
      }

      const isOutsideBudget = data.is_outside_budget !== undefined
        ? Boolean(data.is_outside_budget || !data.budget_plan_expense_item_id)
        : Boolean(before.is_outside_budget);
      const budgetPlanExpenseItemId = isOutsideBudget
        ? null
        : (data.budget_plan_expense_item_id !== undefined ? (data.budget_plan_expense_item_id ? Number(data.budget_plan_expense_item_id) : null) : before.budget_plan_expense_item_id);
      const paymentMethod = data.payment_method || before.payment_method || 'cash';
      const newBsId = paymentMethod === 'bank_transfer'
        ? (data.bank_statement_id !== undefined ? (data.bank_statement_id ? Number(data.bank_statement_id) : null) : before.bank_statement_id)
        : null;
      const expenseDate = data.expense_date || before.expense_date;
      const academicYearId = data.academic_year_id ? Number(data.academic_year_id) : before.academic_year_id;
      const cashAccountId = data.cash_account_id ? Number(data.cash_account_id) : before.cash_account_id;

      // Handle fund source values & multi-sumber dana
      let incomingFundSources = null;
      if (Array.isArray(data.fund_sources) && data.fund_sources.length > 0) {
        incomingFundSources = data.fund_sources;
      }

      const chosenFundType = incomingFundSources
        ? (incomingFundSources[0].fund_type || (incomingFundSources[0].fee_type_id ? 'fee_type' : (incomingFundSources[0].income_item_id ? 'budget_income_item' : 'opening_pool')))
        : (data.fund_source_type || before.fund_source_type || 'opening_pool');

      const chosenFundRefId = incomingFundSources
        ? Number(incomingFundSources[0].fund_ref_id || incomingFundSources[0].fee_type_id || incomingFundSources[0].income_item_id || 0)
        : (data.fund_source_ref_id !== undefined ? Number(data.fund_source_ref_id || 0) : Number(before.fund_source_ref_id || 0));

      const fundSourcesToSave = (data.fund_sources !== undefined)
        ? (incomingFundSources ? JSON.stringify(incomingFundSources) : null)
        : before.fund_sources;

      // Update tabel expenses
      await trx('expenses')
        .where({ id, school_unit_id: schoolUnitId })
        .update({
          cash_account_id: cashAccountId,
          bank_statement_id: newBsId,
          academic_year_id: academicYearId,
          budget_plan_expense_item_id: budgetPlanExpenseItemId,
          budget_program_id: data.budget_program_id !== undefined ? (data.budget_program_id ? Number(data.budget_program_id) : null) : before.budget_program_id,
          catalog_item_id: data.catalog_item_id !== undefined ? (data.catalog_item_id ? Number(data.catalog_item_id) : null) : before.catalog_item_id,
          transaction_category_id: data.transaction_category_id !== undefined ? (data.transaction_category_id ? Number(data.transaction_category_id) : null) : before.transaction_category_id,
          staff_id: data.staff_id !== undefined ? (data.staff_id ? Number(data.staff_id) : null) : before.staff_id,
          staff_name: data.staff_name !== undefined ? (data.staff_name ? String(data.staff_name).trim() : null) : before.staff_name,
          payment_method: paymentMethod,
          is_package: isPackage ? 1 : 0,
          is_outside_budget: isOutsideBudget ? 1 : 0,
          proposed_to_rapbs: data.proposed_to_rapbs !== undefined ? (data.proposed_to_rapbs ? 1 : 0) : before.proposed_to_rapbs,
          item_name: data.item_name || before.item_name,
          unit: isPackage ? 'Paket' : (data.unit || before.unit || 'pcs'),
          unit_price: unitPrice,
          quantity: quantity,
          total_amount: totalAmount,
          vendor: data.vendor !== undefined ? (data.vendor ? String(data.vendor).trim() : null) : before.vendor,
          expense_date: expenseDate,
          proof_number: data.proof_number !== undefined ? (data.proof_number ? String(data.proof_number).trim() : null) : before.proof_number,
          notes: data.notes !== undefined ? (data.notes ? String(data.notes).trim() : null) : before.notes,
          fund_source_type: chosenFundType,
          fund_source_ref_id: chosenFundRefId,
          fund_source_override_reason: data.fund_source_override_reason !== undefined ? data.fund_source_override_reason : before.fund_source_override_reason,
          fund_sources: fundSourcesToSave,
          override_debit_account_id: data.override_debit_account_id ? Number(data.override_debit_account_id) : before.override_debit_account_id,
          override_credit_account_id: data.override_credit_account_id ? Number(data.override_credit_account_id) : before.override_credit_account_id,
          override_reason: data.override_reason !== undefined ? data.override_reason : before.override_reason,
          previous_data: JSON.stringify(before)
        });

      // Update rekonsiliasi rekening koran jika ada mutasi bank
      if (before.bank_statement_id || newBsId) {
        try {
          await trx('bank_statement_references')
            .where({ reference_type: 'expense', reference_id: id })
            .delete();

          if (before.bank_statement_id && before.bank_statement_id !== newBsId) {
            const oldStmt = await trx('bank_statements').where({ id: before.bank_statement_id }).first();
            if (oldStmt) {
              const oldSum = await trx('bank_statement_references')
                .where('bank_statement_id', oldStmt.id)
                .sum('amount as total_allocated')
                .first();
              const oldAlloc = oldSum?.total_allocated ? parseFloat(oldSum.total_allocated) : 0;
              const isOldReconciled = oldAlloc >= parseFloat(oldStmt.amount || 0) - 0.01;
              await trx('bank_statements')
                .where({ id: oldStmt.id })
                .update({
                  is_reconciled: isOldReconciled,
                  reconciliation_notes: isOldReconciled ? oldStmt.reconciliation_notes : `Teralokasi Rp ${oldAlloc.toLocaleString('id-ID')} / Rp ${parseFloat(oldStmt.amount || 0).toLocaleString('id-ID')}`,
                  reconciled_at: isOldReconciled ? oldStmt.reconciled_at : null,
                  updated_at: trx.fn.now()
                });
            }
          }

          if (newBsId) {
            const stmt = await trx('bank_statements').where({ id: newBsId }).first();
            if (stmt) {
              const allocSum = await trx('bank_statement_references')
                .where('bank_statement_id', stmt.id)
                .sum('amount as total_allocated')
                .first();
              const curAlloc = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
              const stmtTotal = parseFloat(stmt.amount || 0);
              const thisAlloc = Math.min(totalAmount, Math.max(0, stmtTotal - curAlloc));

              if (thisAlloc > 0) {
                await trx('bank_statement_references').insert({
                  bank_statement_id: stmt.id,
                  school_unit_id: schoolUnitId || 1,
                  reference_type: 'expense',
                  reference_id: id,
                  amount: thisAlloc,
                  notes: `BKK Pengeluaran #${id} (${data.item_name || before.item_name})`,
                  created_by: userId
                });
              }

              const finalSum = await trx('bank_statement_references')
                .where('bank_statement_id', stmt.id)
                .sum('amount as total_allocated')
                .first();
              const finalAlloc = finalSum?.total_allocated ? parseFloat(finalSum.total_allocated) : 0;
              const isFullyReconciled = finalAlloc >= stmtTotal - 0.01;

              await trx('bank_statements')
                .where({ id: stmt.id })
                .update({
                  is_reconciled: isFullyReconciled,
                  reconciled_reference_type: 'expense',
                  reconciled_reference_id: id,
                  reconciliation_notes: isFullyReconciled
                    ? `Lunas teralokasi ke belanja (BKK #${id})`
                    : `Teralokasi Rp ${finalAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`,
                  reconciled_at: isFullyReconciled ? trx.fn.now() : null,
                  updated_at: trx.fn.now()
                });
            }
          }
        } catch (bsErr) {
          console.warn('Updating bank statement reconciliation on expense edit error:', bsErr.message);
        }
      }

      // Update Journal Entry jika ada
      try {
        const journal = await trx('journal_entries')
          .where({ school_unit_id: schoolUnitId, source_type: 'expense', source_id: id })
          .first();

        if (journal) {
          await trx('journal_entries')
            .where({ id: journal.id })
            .update({
              academic_year_id: academicYearId,
              journal_date: expenseDate,
              description: `${isOutsideBudget ? '[Di Luar RAPBS] ' : ''}Pengeluaran: ${data.item_name || before.item_name} ${data.vendor ? `(${data.vendor})` : ''}`,
              updated_at: trx.fn.now()
            });

          const debitAccountId = data.override_debit_account_id ? Number(data.override_debit_account_id) : before.override_debit_account_id;
          const creditAccountId = data.override_credit_account_id ? Number(data.override_credit_account_id) : before.override_credit_account_id;

          if (debitAccountId) {
            await trx('journal_entry_lines')
              .where({ journal_entry_id: journal.id, entry_side: 'debit' })
              .update({ chart_of_account_id: debitAccountId, amount: totalAmount, updated_at: trx.fn.now() });
          } else {
            await trx('journal_entry_lines')
              .where({ journal_entry_id: journal.id, entry_side: 'debit' })
              .update({ amount: totalAmount, updated_at: trx.fn.now() });
          }

          if (creditAccountId) {
            await trx('journal_entry_lines')
              .where({ journal_entry_id: journal.id, entry_side: 'credit' })
              .update({ chart_of_account_id: creditAccountId, amount: totalAmount, updated_at: trx.fn.now() });
          } else {
            await trx('journal_entry_lines')
              .where({ journal_entry_id: journal.id, entry_side: 'credit' })
              .update({ amount: totalAmount, updated_at: trx.fn.now() });
          }
        }
      } catch (jErr) {
        console.warn('Update journal for expense failed:', jErr.message);
      }

      // Sesuaikan mutasi kantong dana (Fund Balance Engine)
      try {
        // A. Parse old sources from before
        let oldSources = [];
        if (before.fund_sources) {
          try {
            const rawOld = typeof before.fund_sources === 'string' ? JSON.parse(before.fund_sources) : before.fund_sources;
            if (Array.isArray(rawOld) && rawOld.length > 0) {
              oldSources = rawOld.map(s => ({
                fund_type: s.fund_type || (s.fee_type_id ? 'fee_type' : (s.income_item_id ? 'budget_income_item' : 'opening_pool')),
                fund_ref_id: Number(s.fund_ref_id || s.fee_type_id || s.income_item_id || 0),
                academic_year_id: Number(s.target_academic_year_id || s.academic_year_id || before.academic_year_id || 2),
                amount: parseFloat(s.amount || 0)
              })).filter(s => s.amount > 0);
            }
          } catch (_) {}
        }
        if (oldSources.length === 0) {
          oldSources = [{
            fund_type: before.fund_source_type || 'opening_pool',
            fund_ref_id: Number(before.fund_source_ref_id || 0),
            academic_year_id: Number(before.academic_year_id || 2),
            amount: parseFloat(before.total_amount || 0)
          }];
        }

        // B. Parse new sources from incoming data / updated values
        let newSources = [];
        if (incomingFundSources) {
          newSources = incomingFundSources.map(s => ({
            fund_type: s.fund_type || (s.fee_type_id ? 'fee_type' : (s.income_item_id ? 'budget_income_item' : 'opening_pool')),
            fund_ref_id: Number(s.fund_ref_id || s.fee_type_id || s.income_item_id || 0),
            academic_year_id: Number(s.target_academic_year_id || s.academic_year_id || academicYearId || 2),
            amount: parseFloat(s.amount || 0)
          })).filter(s => s.amount > 0);
        } else if (data.fund_sources === null || (data.fund_source_type !== undefined || data.fund_source_ref_id !== undefined || !before.fund_sources)) {
          newSources = [{
            fund_type: chosenFundType,
            fund_ref_id: chosenFundRefId,
            academic_year_id: Number(academicYearId || 2),
            amount: totalAmount
          }];
        } else if (before.fund_sources) {
          try {
            const rawOld = typeof before.fund_sources === 'string' ? JSON.parse(before.fund_sources) : before.fund_sources;
            if (Array.isArray(rawOld) && rawOld.length > 0) {
              newSources = rawOld.map(s => ({
                fund_type: s.fund_type || (s.fee_type_id ? 'fee_type' : (s.income_item_id ? 'budget_income_item' : 'opening_pool')),
                fund_ref_id: Number(s.fund_ref_id || s.fee_type_id || s.income_item_id || 0),
                academic_year_id: Number(s.target_academic_year_id || s.academic_year_id || academicYearId || 2),
                amount: parseFloat(s.amount || 0)
              })).filter(s => s.amount > 0);
            }
          } catch (_) {}
        }

        if (newSources.length === 0) {
          newSources = [{
            fund_type: chosenFundType,
            fund_ref_id: chosenFundRefId,
            academic_year_id: Number(academicYearId || 2),
            amount: totalAmount
          }];
        }

        // Compare if allocation changed
        const isSame = (listA, listB) => {
          if (listA.length !== listB.length) return false;
          for (let i = 0; i < listA.length; i++) {
            const a = listA[i];
            const b = listB[i];
            if (a.fund_type !== b.fund_type) return false;
            if (Number(a.fund_ref_id) !== Number(b.fund_ref_id)) return false;
            if (Number(a.academic_year_id) !== Number(b.academic_year_id)) return false;
            if (Math.abs(parseFloat(a.amount) - parseFloat(b.amount)) > 0.001) return false;
          }
          return true;
        };

        if (!isSame(oldSources, newSources)) {
          // 1. Revert Old Outflows (Reversal -> Inflow)
          for (const oldSrc of oldSources) {
            if (oldSrc.amount > 0) {
              await fundBalanceEngine.applyFundMutation({
                schoolUnitId,
                fundType: oldSrc.fund_type,
                fundRefId: oldSrc.fund_ref_id,
                academicYearId: oldSrc.academic_year_id,
                direction: 'in',
                amount: oldSrc.amount,
                sourceTable: 'expenses',
                sourceId: id,
                notes: `Reversal sumber dana belanja #${id} (${before.item_name}) [Koreksi: ${editReason}]`,
                userId,
                trx
              });
            }
          }

          // 2. Apply New Outflows (Outflow)
          for (const newSrc of newSources) {
            if (newSrc.amount > 0) {
              await fundBalanceEngine.applyFundMutation({
                schoolUnitId,
                fundType: newSrc.fund_type,
                fundRefId: newSrc.fund_ref_id,
                academicYearId: newSrc.academic_year_id,
                direction: 'out',
                amount: newSrc.amount,
                sourceTable: 'expenses',
                sourceId: id,
                notes: `Pengeluaran belanja #${id} (${data.item_name || before.item_name}) [Koreksi: ${editReason}]`,
                userId,
                trx
              });
            }
          }
        }
      } catch (fbErr) {
        console.warn('Fund balance adjustment on expense edit error:', fbErr.message);
      }

      const updated = await this.getExpenseById(schoolUnitId, id, trx);

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'UPDATE_EXPENSE',
        entityType: 'expense',
        entityId: id,
        dataBefore: before,
        dataAfter: updated,
        trx
      });

      return updated;
    });
  }

  /**
   * Pembatalan / Void Transaksi Pengeluaran (Audit Storno Reversal)
   */
  async softDeleteExpense(schoolUnitId, id, reason, userId = null) {
    return db.transaction(async (trx) => {
      const expense = await this.getExpenseById(schoolUnitId, id, trx);
      if (!expense || expense.deleted_at) {
        return null;
      }

      // 1. Bersihkan rekonsiliasi mutasi rekening koran
      if (expense.bank_statement_id) {
        try {
          await trx('bank_statement_references')
            .where({ reference_type: 'expense', reference_id: id })
            .delete();

          const stmt = await trx('bank_statements').where({ id: expense.bank_statement_id }).first();
          if (stmt) {
            const allocSum = await trx('bank_statement_references')
              .where('bank_statement_id', stmt.id)
              .sum('amount as total_allocated')
              .first();
            const curAlloc = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
            const isFullyReconciled = curAlloc >= parseFloat(stmt.amount || 0) - 0.01;
            await trx('bank_statements')
              .where({ id: stmt.id })
              .update({
                is_reconciled: isFullyReconciled,
                reconciliation_notes: isFullyReconciled ? stmt.reconciliation_notes : `Teralokasi Rp ${curAlloc.toLocaleString('id-ID')} / Rp ${parseFloat(stmt.amount || 0).toLocaleString('id-ID')}`,
                reconciled_at: isFullyReconciled ? stmt.reconciled_at : null,
                updated_at: trx.fn.now()
              });
          }
        } catch (bsErr) {
          console.warn('Cleaning bank statement reference on expense cancel error:', bsErr.message);
        }
      }

      // 2. Kembalikan saldo kantong dana (Reverse Outflow -> Inflow)
      try {
        let oldSources = [];
        if (expense.fund_sources) {
          try {
            const rawOld = typeof expense.fund_sources === 'string' ? JSON.parse(expense.fund_sources) : expense.fund_sources;
            if (Array.isArray(rawOld) && rawOld.length > 0) {
              oldSources = rawOld.map(s => ({
                fund_type: s.fund_type || (s.fee_type_id ? 'fee_type' : (s.income_item_id ? 'budget_income_item' : 'opening_pool')),
                fund_ref_id: Number(s.fund_ref_id || s.fee_type_id || s.income_item_id || 0),
                academic_year_id: Number(s.target_academic_year_id || s.academic_year_id || expense.academic_year_id || 2),
                amount: parseFloat(s.amount || 0)
              })).filter(s => s.amount > 0);
            }
          } catch (_) {}
        }
        if (oldSources.length === 0) {
          oldSources = [{
            fund_type: expense.fund_source_type || 'opening_pool',
            fund_ref_id: Number(expense.fund_source_ref_id || 0),
            academic_year_id: Number(expense.academic_year_id || 2),
            amount: parseFloat(expense.total_amount || 0)
          }];
        }

        for (const src of oldSources) {
          if (src.amount > 0) {
            await fundBalanceEngine.applyFundMutation({
              schoolUnitId,
              fundType: src.fund_type,
              fundRefId: src.fund_ref_id,
              academicYearId: src.academic_year_id,
              direction: 'in',
              amount: src.amount,
              sourceTable: 'expenses',
              sourceId: id,
              notes: `Pembatalan Pengeluaran #${id} (${expense.item_name}): ${reason}`,
              userId,
              trx
            });
          }
        }
      } catch (fbErr) {
        console.warn('Reversing fund balance for cancelled expense error:', fbErr.message);
      }

      // 3. Terbitkan Jurnal Pembalik (Storno Reversal Journal)
      try {
        const origJournal = await trx('journal_entries')
          .where({ school_unit_id: schoolUnitId, source_type: 'expense', source_id: id })
          .first();

        if (origJournal) {
          const lines = await trx('journal_entry_lines').where({ journal_entry_id: origJournal.id });
          const debitLine = lines.find(l => l.line_type === 'debit');
          const creditLine = lines.find(l => l.line_type === 'credit');

          if (debitLine && creditLine) {
            await recordJournal({
              schoolUnitId,
              academicYearId: expense.academic_year_id,
              transactionCode: 'expense_reversal',
              amount: parseFloat(expense.total_amount),
              sourceType: 'expense_cancellation',
              sourceId: id,
              description: `[PEMBATALAN] Pengeluaran #${id}: ${expense.item_name} - ${reason}`,
              journalDate: new Date(),
              overrideDebitAccountId: creditLine.account_id,
              overrideCreditAccountId: debitLine.account_id,
              overrideReason: `Storno pembatalan pengeluaran: ${reason}`,
              userId,
              trx
            });
          }
        }
      } catch (jErr) {
        console.warn('Storno journal for cancelled expense error:', jErr.message);
      }

      // 4. Mark deleted pada baris expenses
      await trx('expenses')
        .where({ id, school_unit_id: schoolUnitId })
        .update({
          deleted_at: trx.fn.now(),
          deleted_reason: reason
        });

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'CANCEL_EXPENSE',
        entityType: 'expense',
        entityId: id,
        dataBefore: expense,
        trx
      });

      return { success: true, message: 'Pengeluaran berhasil dibatalkan dan jurnal pembalik telah dibukukan' };
    });
  }

  /**
   * Mengambil Data Bukti Kas Keluar (BKK / Voucher Pengeluaran)
   */
  async getExpenseVoucher(schoolUnitId, id) {
    const expense = await this.getExpenseById(schoolUnitId, id);
    if (!expense) return null;

    return {
      id: expense.id,
      voucher_number: expense.proof_number || `BKK/${new Date(expense.expense_date).getFullYear()}/${String(expense.id).padStart(5, '0')}`,
      expense_date: expense.expense_date,
      item_name: expense.item_name,
      vendor: expense.vendor || 'Umum / Pihak Ketiga',
      staff_name: expense.staff_name || '-',
      unit: expense.unit || 'pcs',
      quantity: parseFloat(expense.quantity || 1),
      unit_price: parseFloat(expense.unit_price || 0),
      total_amount: parseFloat(expense.total_amount || 0),
      is_package: Boolean(expense.is_package),
      is_outside_budget: Boolean(expense.is_outside_budget),
      budget_item_name: expense.budget_item_name || (expense.is_outside_budget ? 'Di Luar Perencanaan RAPBS' : 'Pengeluaran Operasional'),
      budget_program_name: expense.budget_program_name || 'Program Operasional Umum',
      cash_account_name: expense.cash_account_name || 'Kasir Loket Utama',
      payment_method: expense.payment_method === 'bank_transfer' ? 'Non-Tunai / Transfer Bank' : 'Tunai',
      bank_statement_ref: expense.bank_statement_ref,
      bank_statement_desc: expense.bank_statement_desc,
      debit_account_code: expense.debit_account_code,
      debit_account_name: expense.debit_account_name,
      credit_account_code: expense.credit_account_code,
      credit_account_name: expense.credit_account_name,
      notes: expense.notes,
      school_unit_id: expense.school_unit_id,
      academic_year_id: expense.academic_year_id,
      created_at: expense.created_at
    };
  }

  /**
   * Mengalokasikan Ulang Sumber Dana Pengeluaran (Reassign)
   */
  async reassignExpenseFundSource(schoolUnitId, id, data, userId = null) {
    return db.transaction(async (trx) => {
      const expense = await this.getExpenseById(schoolUnitId, id, trx);
      if (!expense || expense.deleted_at) {
        const err = new Error('Data pengeluaran tidak ditemukan');
        err.statusCode = 404;
        throw err;
      }

      const oldType = expense.fund_source_type || 'opening_pool';
      const oldRefId = Number(expense.fund_source_ref_id || 0);
      const newType = data.fund_source_type || 'opening_pool';
      const newRefId = Number(data.fund_source_ref_id || 0);
      const reason = data.reason || 'Reklasifikasi alokasi sumber dana';

      // Parse old sources if multi
      let oldSources = [];
      if (expense.fund_sources) {
        try {
          const rawOld = typeof expense.fund_sources === 'string' ? JSON.parse(expense.fund_sources) : expense.fund_sources;
          if (Array.isArray(rawOld) && rawOld.length > 0) {
            oldSources = rawOld.map(s => ({
              fund_type: s.fund_type || (s.fee_type_id ? 'fee_type' : (s.income_item_id ? 'budget_income_item' : 'opening_pool')),
              fund_ref_id: Number(s.fund_ref_id || s.fee_type_id || s.income_item_id || 0),
              academic_year_id: Number(s.target_academic_year_id || s.academic_year_id || expense.academic_year_id || 2),
              amount: parseFloat(s.amount || 0)
            })).filter(s => s.amount > 0);
          }
        } catch (_) {}
      }
      if (oldSources.length === 0) {
        oldSources = [{
          fund_type: oldType,
          fund_ref_id: oldRefId,
          academic_year_id: Number(expense.academic_year_id || 2),
          amount: parseFloat(expense.total_amount || 0)
        }];
      }

      // 1. Balikkan sumber dana lama
      for (const oldSrc of oldSources) {
        if (oldSrc.amount > 0) {
          await fundBalanceEngine.applyFundMutation({
            schoolUnitId,
            fundType: oldSrc.fund_type,
            fundRefId: oldSrc.fund_ref_id,
            academicYearId: oldSrc.academic_year_id,
            direction: 'in',
            amount: oldSrc.amount,
            sourceTable: 'expenses',
            sourceId: id,
            notes: `Pembalikan sumber dana lama belanja #${id} [Reklasifikasi ke ${newType} #${newRefId}]: ${reason}`,
            userId,
            trx
          });
        }
      }

      // 2. Terapkan sumber dana baru
      await fundBalanceEngine.applyFundMutation({
        schoolUnitId,
        fundType: newType,
        fundRefId: newRefId,
        academicYearId: expense.academic_year_id,
        direction: 'out',
        amount: parseFloat(expense.total_amount),
        sourceTable: 'expenses',
        sourceId: id,
        notes: `Alokasi sumber dana baru belanja #${id} [Peralihan dari ${oldType} #${oldRefId}]: ${reason}`,
        userId,
        trx
      });

      // 3. Update baris expenses
      await trx('expenses')
        .where({ id, school_unit_id: schoolUnitId })
        .update({
          fund_source_type: newType,
          fund_source_ref_id: newRefId,
          fund_source_override_reason: reason,
          fund_sources: null
        });

      const updated = await this.getExpenseById(schoolUnitId, id, trx);

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'REASSIGN_EXPENSE_FUND_SOURCE',
        entityType: 'expense',
        entityId: id,
        dataBefore: expense,
        dataAfter: updated,
        trx
      });

      return updated;
    });
  }
}

module.exports = new ExpensesService();
