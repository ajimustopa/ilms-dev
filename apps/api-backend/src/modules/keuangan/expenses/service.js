/**
 * Expenses Service for Keuangan Module
 * Covers Features #23, #24, #25, RAPBS Pos Linkage, and Fund Source Pockets Allocation
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const { recordJournal, generateJournalNumber } = require('../bookkeeping/journalEngine');
const fundBalanceEngine = require('../bookkeeping/fundBalanceEngine');

class ExpensesService {
  async listExpenses(schoolUnitId, filters = {}) {
    let query = db('expenses')
      .leftJoin('budget_plan_expense_items', 'expenses.budget_plan_expense_item_id', 'budget_plan_expense_items.id')
      .leftJoin('catalog_items', 'budget_plan_expense_items.catalog_item_id', 'catalog_items.id')
      .leftJoin('fee_types as fund_source', 'budget_plan_expense_items.fund_source_fee_type_id', 'fund_source.id')
      .leftJoin('fee_types as actual_fund_fee', function () {
        this.on('expenses.fund_source_ref_id', '=', 'actual_fund_fee.id')
            .andOn('expenses.fund_source_type', '=', db.raw("'fee_type'"));
      })
      .leftJoin('transaction_categories as actual_fund_cat', function () {
        this.on('expenses.fund_source_ref_id', '=', 'actual_fund_cat.id')
            .andOn('expenses.fund_source_type', '=', db.raw("'transaction_category'"));
      })
      .leftJoin('budget_plans', 'budget_plan_expense_items.budget_plan_id', 'budget_plans.id')
      .where('expenses.school_unit_id', schoolUnitId)
      .select(
        'expenses.*',
        'budget_plan_expense_items.name as budget_item_name',
        'budget_plan_expense_items.planned_amount as budget_item_pagu',
        'catalog_items.name as catalog_item_name',
        'fund_source.name as default_fund_source_name',
        'actual_fund_fee.name as actual_fund_fee_name',
        'actual_fund_cat.name as actual_fund_cat_name',
        'budget_plans.version as budget_plan_version'
      );

    if (filters.include_deleted) {
      // allow seeing deleted/cancelled expenses
    } else {
      query = query.whereNull('expenses.deleted_at');
    }

    if (filters.academic_year_id) {
      query = query.where('expenses.academic_year_id', Number(filters.academic_year_id));
    }
    if (filters.is_outside_budget !== undefined && filters.is_outside_budget !== 'all') {
      const boolVal = filters.is_outside_budget === 'true' || filters.is_outside_budget === '1' || filters.is_outside_budget === true;
      query = query.where('expenses.is_outside_budget', boolVal ? 1 : 0);
    }
    if (filters.budget_plan_expense_item_id) {
      query = query.where('expenses.budget_plan_expense_item_id', filters.budget_plan_expense_item_id);
    }
    if (filters.expense_date_from) {
      query = query.where('expenses.expense_date', '>=', filters.expense_date_from);
    }
    if (filters.expense_date_to) {
      query = query.where('expenses.expense_date', '<=', filters.expense_date_to);
    }
    return query.orderBy('expenses.expense_date', 'desc');
  }

  async getExpenseById(schoolUnitId, id, trx = null) {
    return (trx || db)('expenses')
      .leftJoin('budget_plan_expense_items', 'expenses.budget_plan_expense_item_id', 'budget_plan_expense_items.id')
      .leftJoin('catalog_items', 'budget_plan_expense_items.catalog_item_id', 'catalog_items.id')
      .leftJoin('fee_types as fund_source', 'budget_plan_expense_items.fund_source_fee_type_id', 'fund_source.id')
      .leftJoin('fee_types as actual_fund_fee', function () {
        this.on('expenses.fund_source_ref_id', '=', 'actual_fund_fee.id')
            .andOn('expenses.fund_source_type', '=', (trx || db).raw("'fee_type'"));
      })
      .leftJoin('transaction_categories as actual_fund_cat', function () {
        this.on('expenses.fund_source_ref_id', '=', 'actual_fund_cat.id')
            .andOn('expenses.fund_source_type', '=', (trx || db).raw("'transaction_category'"));
      })
      .leftJoin('budget_plans', 'budget_plan_expense_items.budget_plan_id', 'budget_plans.id')
      .where({ 'expenses.id': id, 'expenses.school_unit_id': schoolUnitId })
      .select(
        'expenses.*',
        'budget_plan_expense_items.name as budget_item_name',
        'budget_plan_expense_items.planned_amount as budget_item_pagu',
        'catalog_items.name as catalog_item_name',
        'fund_source.name as default_fund_source_name',
        'actual_fund_fee.name as actual_fund_fee_name',
        'actual_fund_cat.name as actual_fund_cat_name',
        'budget_plans.version as budget_plan_version'
      )
      .first();
  }

  async createExpense(schoolUnitId, data, userId = null) {
    const unitPrice = parseFloat(data.unit_price || 0);
    const quantity = parseFloat(data.quantity || 1);
    const totalAmount = unitPrice * quantity;
    const isOutsideBudget = Boolean(data.is_outside_budget || !data.budget_plan_expense_item_id);

    return db.transaction(async (trx) => {
      // 1. Tentukan sumber dana default dari item RAPBS & resolve academic_year_id
      let defaultFundType = 'opening_pool';
      let defaultFundRefId = 0;
      let rapbsItem = null;
      let resolvedAcademicYearId = data.academic_year_id ? Number(data.academic_year_id) : null;
      let fundSources = null;

      if (data.fund_sources) {
        fundSources = typeof data.fund_sources === 'string' ? JSON.parse(data.fund_sources) : data.fund_sources;
      }

      if (!isOutsideBudget && data.budget_plan_expense_item_id) {
        rapbsItem = await trx('budget_plan_expense_items')
          .where({ id: data.budget_plan_expense_item_id })
          .first();

        if (rapbsItem) {
          if (rapbsItem.fund_source_fee_type_id) {
            defaultFundType = 'fee_type';
            defaultFundRefId = Number(rapbsItem.fund_source_fee_type_id);
          } else if (rapbsItem.fund_source_income_item_id) {
            defaultFundType = 'transaction_category';
            defaultFundRefId = Number(rapbsItem.fund_source_income_item_id);
          }
          if (!fundSources && rapbsItem.fund_sources) {
            try {
              fundSources = typeof rapbsItem.fund_sources === 'string'
                ? JSON.parse(rapbsItem.fund_sources)
                : rapbsItem.fund_sources;
            } catch (e) {}
          }
          if (!resolvedAcademicYearId && rapbsItem.budget_plan_id) {
            const plan = await trx('budget_plans').where({ id: rapbsItem.budget_plan_id }).first();
            if (plan) resolvedAcademicYearId = Number(plan.academic_year_id);
          }
        }
      }

      // Fallback academic_year_id ke tahun aktif (2) jika belum terdefinisi
      if (!resolvedAcademicYearId) {
        resolvedAcademicYearId = 2;
      }

      // 2. Sumber dana yang dipilih bendahara
      const chosenFundType = data.fund_source_type || defaultFundType;
      const chosenFundRefId = chosenFundType === 'opening_pool'
        ? 0
        : Number(data.fund_source_ref_id || (chosenFundType === defaultFundType ? defaultFundRefId : 0));

      // 3. Validasi override reason jika berbeda dari default RAPBS
      const isOverridden = !isOutsideBudget && (chosenFundType !== defaultFundType || chosenFundRefId !== defaultFundRefId);
      if (isOverridden && (!data.fund_source_override_reason || !String(data.fund_source_override_reason).trim())) {
        const err = new Error('Alasan pengubahan sumber dana dari default RAPBS (fund_source_override_reason) wajib diisi');
        err.statusCode = 422;
        throw err;
      }

      // 4. Periksa saldo kantong dana terpilih
      let fundWarning = null;
      let fundBalAfter = 0;
      if (Array.isArray(fundSources) && fundSources.length > 0) {
        for (const src of fundSources) {
          const sAmt = parseFloat(src.amount || 0);
          const cBal = await fundBalanceEngine.getFundBalance(
            schoolUnitId,
            src.fund_type || 'fee_type',
            Number(src.fund_ref_id || 0),
            resolvedAcademicYearId,
            trx
          );
          if (cBal - sAmt < 0) {
            fundWarning = `Peringatan: Salah satu kantong sumber dana multi-pos (${src.fund_type} #${src.fund_ref_id}) tidak mencukupi (tersisa Rp ${cBal.toLocaleString('id-ID')}).`;
          }
        }
      } else {
        const currentFundBal = await fundBalanceEngine.getFundBalance(schoolUnitId, chosenFundType, chosenFundRefId, resolvedAcademicYearId, trx);
        fundBalAfter = currentFundBal - totalAmount;
        if (fundBalAfter < 0) {
          fundWarning = `Peringatan: Saldo kantong sumber dana terpilih (${chosenFundType === 'opening_pool' ? 'Opening Pool' : `Ref #${chosenFundRefId}`}) TA #${resolvedAcademicYearId} tidak mencukupi (tersisa Rp ${currentFundBal.toLocaleString('id-ID')}). Saldo menjadi defisit sebesar Rp ${Math.abs(fundBalAfter).toLocaleString('id-ID')}.`;
        }
      }

      // 5. Insert pengeluaran
      const [id] = await trx('expenses').insert({
        school_unit_id: schoolUnitId,
        academic_year_id: resolvedAcademicYearId,
        budget_plan_expense_item_id: isOutsideBudget ? null : (data.budget_plan_expense_item_id || null),
        is_outside_budget: isOutsideBudget ? 1 : 0,
        item_name: data.item_name,
        unit: data.unit || null,
        unit_price: unitPrice,
        quantity: quantity,
        total_amount: totalAmount,
        vendor: data.vendor || null,
        expense_date: data.expense_date || new Date().toISOString().slice(0, 10),
        proof_number: data.proof_number || null,
        notes: data.notes || null,
        fund_source_type: chosenFundType,
        fund_source_ref_id: chosenFundRefId,
        fund_source_override_reason: data.fund_source_override_reason || null,
        fund_sources: fundSources ? JSON.stringify(fundSources) : null
      });

      const actualId = id || (await trx('expenses').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

      // 6. Buat jurnal otomatis via journalEngine
      try {
        await recordJournal({
          schoolUnitId,
          academicYearId: resolvedAcademicYearId,
          transactionCode: 'expense_default',
          amount: totalAmount,
          sourceType: 'expense',
          sourceId: actualId,
          description: `${isOutsideBudget ? '[Di Luar RAPBS] ' : ''}Pengeluaran: ${data.item_name} (${data.vendor || 'Vendor'})`,
          journalDate: data.expense_date || new Date(),
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

      // 7. Terapkan mutasi keluar pada kantong dana terpilih dengan academic_year_id
      if (Array.isArray(fundSources) && fundSources.length > 0) {
        for (const src of fundSources) {
          const sAmt = parseFloat(src.amount || 0);
          if (sAmt > 0) {
            const targetAy = src.target_academic_year_id || src.academic_year_id || resolvedAcademicYearId;
            try {
              await fundBalanceEngine.applyFundMutation({
                schoolUnitId,
                fundType: src.fund_type || 'fee_type',
                fundRefId: Number(src.fund_ref_id || 0),
                academicYearId: targetAy,
                direction: 'out',
                amount: sAmt,
                sourceTable: 'expenses',
                sourceId: actualId,
                notes: `Pengeluaran belanja #${actualId}: ${data.item_name} (Pos Dana ${src.scope === 'prior' ? 'Saldo Bawaan' : 'T.A. Berjalan'})`,
                userId,
                trx
              });
            } catch (fbErr) {
              console.warn('Fund balance mutation for multi-source expense skipped or error:', fbErr.message);
            }
          }
        }
      } else {
        const targetAy = data.fund_source_academic_year_id || (data.fund_source_scope === 'prior' ? data.target_academic_year_id : null) || resolvedAcademicYearId;
        try {
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
        } catch (fbErr) {
          console.warn('Fund balance mutation for expense skipped or error:', fbErr.message);
        }
      }

      const created = await this.getExpenseById(schoolUnitId, actualId, trx);

      // 8. Cek apakah melebihi pagu anggaran RAPBS per Item
      let budgetWarning = null;
      let itemRemainingBudget = null;

      if (!isOutsideBudget && data.budget_plan_expense_item_id) {
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
        dataAfter: { ...created, budget_warning: budgetWarning, fund_warning: fundWarning },
        trx
      });

      return {
        ...created,
        budget_warning: budgetWarning,
        is_over_budget: Boolean(budgetWarning),
        item_remaining_budget: itemRemainingBudget,
        fund_warning: fundWarning,
        fund_balance_after: fundBalAfter
      };
    });
  }

  async updateExpense(schoolUnitId, id, data, userId = null) {
    const editReason = data.edit_reason || data.reason;
    if (!editReason || !String(editReason).trim()) {
      const err = new Error('Alasan pengubahan pengeluaran (edit_reason) wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const before = await this.getExpenseById(schoolUnitId, id);
    if (!before || before.deleted_at) {
      const err = new Error('Data pengeluaran tidak ditemukan atau telah dihapus');
      err.statusCode = 404;
      throw err;
    }

    const unitPrice = data.unit_price !== undefined ? parseFloat(data.unit_price) : parseFloat(before.unit_price);
    const quantity = data.quantity !== undefined ? parseFloat(data.quantity) : parseFloat(before.quantity);
    const totalAmount = unitPrice * quantity;
    const isOutsideBudget = data.is_outside_budget !== undefined
      ? Boolean(data.is_outside_budget)
      : Boolean(before.is_outside_budget);

    const previousSnapshot = {
      budget_plan_expense_item_id: before.budget_plan_expense_item_id,
      is_outside_budget: before.is_outside_budget,
      item_name: before.item_name,
      unit: before.unit,
      unit_price: before.unit_price,
      quantity: before.quantity,
      total_amount: before.total_amount,
      vendor: before.vendor,
      expense_date: before.expense_date,
      proof_number: before.proof_number,
      fund_source_type: before.fund_source_type,
      fund_source_ref_id: before.fund_source_ref_id,
      fund_sources: before.fund_sources,
      edit_reason: editReason
    };

    const targetBudgetItemId = isOutsideBudget ? null : (data.budget_plan_expense_item_id !== undefined
      ? data.budget_plan_expense_item_id
      : before.budget_plan_expense_item_id);

    let fundSources = data.fund_sources !== undefined ? data.fund_sources : before.fund_sources;
    if (fundSources && typeof fundSources !== 'string') {
      fundSources = JSON.stringify(fundSources);
    }

    await db('expenses')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        budget_plan_expense_item_id: targetBudgetItemId || null,
        is_outside_budget: isOutsideBudget ? 1 : 0,
        item_name: data.item_name || before.item_name,
        unit: data.unit !== undefined ? data.unit : before.unit,
        unit_price: unitPrice,
        quantity: quantity,
        total_amount: totalAmount,
        vendor: data.vendor !== undefined ? data.vendor : before.vendor,
        expense_date: data.expense_date || before.expense_date,
        proof_number: data.proof_number !== undefined ? data.proof_number : before.proof_number,
        notes: data.notes !== undefined ? data.notes : before.notes,
        fund_sources: fundSources,
        previous_data: JSON.stringify(previousSnapshot),
        updated_at: db.fn.now()
      });

    const updated = await this.getExpenseById(schoolUnitId, id);

    let budgetWarning = null;
    let itemRemainingBudget = null;

    if (!isOutsideBudget && targetBudgetItemId) {
      const item = await db('budget_plan_expense_items')
        .where({ id: targetBudgetItemId })
        .first();

      if (item) {
        const realized = await db('expenses')
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
      action: 'UPDATE_EXPENSE',
      entityType: 'expense',
      entityId: id,
      dataBefore: before,
      dataAfter: { ...updated, edit_reason: editReason, budget_warning: budgetWarning }
    });

    return {
      ...updated,
      budget_warning: budgetWarning,
      is_over_budget: Boolean(budgetWarning),
      item_remaining_budget: itemRemainingBudget
    };
  }

  /**
   * Reassign Fund Source for an Existing Expense (Realokasi Sumber Dana)
   */
  async reassignExpenseFundSource(schoolUnitId, id, data, userId = null) {
    const { fund_source_type, fund_source_ref_id, reason } = data;

    if (!reason || !String(reason).trim()) {
      const err = new Error('Alasan realokasi sumber dana pengeluaran (reason) wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const expense = await this.getExpenseById(schoolUnitId, id);
    if (!expense || expense.deleted_at) {
      const err = new Error('Data pengeluaran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const oldType = expense.fund_source_type || 'opening_pool';
    const oldRefId = oldType === 'opening_pool' ? 0 : Number(expense.fund_source_ref_id || 0);

    const newType = fund_source_type || 'opening_pool';
    const newRefId = newType === 'opening_pool' ? 0 : Number(fund_source_ref_id || 0);

    const totalAmount = parseFloat(expense.total_amount);
    const expenseAyId = Number(expense.academic_year_id || 2);

    return db.transaction(async (trx) => {
      // 1. Kembalikan dana ke kantong lama (direction: 'in')
      await fundBalanceEngine.applyFundMutation({
        schoolUnitId,
        fundType: oldType,
        fundRefId: oldRefId,
        academicYearId: expenseAyId,
        direction: 'in',
        amount: totalAmount,
        sourceTable: 'expenses',
        sourceId: expense.id,
        notes: `Pengembalian realokasi sumber dana belanja #${expense.id} ke kantong baru (${newType} #${newRefId}). Alasan: ${reason}`,
        userId,
        trx
      });

      // 2. Potong dana dari kantong baru (direction: 'out')
      await fundBalanceEngine.applyFundMutation({
        schoolUnitId,
        fundType: newType,
        fundRefId: newRefId,
        academicYearId: expenseAyId,
        direction: 'out',
        amount: totalAmount,
        sourceTable: 'expenses',
        sourceId: expense.id,
        notes: `Pembebanan realokasi sumber dana belanja #${expense.id} dari kantong lama (${oldType} #${oldRefId}). Alasan: ${reason}`,
        userId,
        trx
      });

      // 3. Update baris pengeluaran
      await trx('expenses')
        .where({ id: expense.id, school_unit_id: schoolUnitId })
        .update({
          fund_source_type: newType,
          fund_source_ref_id: newRefId,
          fund_source_override_reason: reason,
          updated_at: trx.fn.now()
        });

      const updated = await this.getExpenseById(schoolUnitId, expense.id, trx);

      // 4. Log audit log
      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'REASSIGN_EXPENSE_FUND_SOURCE',
        entityType: 'expense',
        entityId: expense.id,
        dataBefore: {
          fund_source_type: oldType,
          fund_source_ref_id: oldRefId
        },
        dataAfter: {
          fund_source_type: newType,
          fund_source_ref_id: newRefId,
          reason
        },
        trx
      });

      return updated;
    });
  }

  /**
   * Soft Delete Expense (PEMBATALAN PENGELUARAN)
   * Audit Fix: Membentuk JURNAL PEMBALIK (STORNO REVERSAL ENTRY) & PENGEMBALIAN SALDO KANTONG DANA
   */
  async softDeleteExpense(schoolUnitId, id, reason, userId = null) {
    if (!reason || !String(reason).trim()) {
      const err = new Error('Alasan pembatalan/penghapusan pengeluaran (reason) wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    return db.transaction(async (trx) => {
      const expense = await this.getExpenseById(schoolUnitId, id, trx);
      if (!expense) {
        const err = new Error('Data pengeluaran tidak ditemukan');
        err.statusCode = 404;
        throw err;
      }
      if (expense.deleted_at) {
        const err = new Error('Pengeluaran ini sudah pernah dibatalkan sebelumnya');
        err.statusCode = 422;
        throw err;
      }

      const totalAmount = parseFloat(expense.total_amount || 0);
      const expenseAyId = Number(expense.academic_year_id || 2);

      // 1. CARI JURNAL ASLI DARI EXPENSE INI
      const originalJournal = await trx('journal_entries')
        .where({
          school_unit_id: schoolUnitId,
          source_type: 'expense',
          source_id: expense.id
        })
        .orderBy('id', 'desc')
        .first();

      let originalLines = [];
      if (originalJournal) {
        originalLines = await trx('journal_entry_lines')
          .where({ journal_entry_id: originalJournal.id });
      }

      // 2. BUAT JURNAL PEMBALIK (STORNO REVERSAL ENTRY)
      // Jurnal asli: Debit Beban Belanja, Kredit Kas/Bank
      // Jurnal pembalik: Debit Kas/Bank (uang kembali), Kredit Beban Belanja (beban dibatalkan)
      if (originalLines.length >= 2) {
        const originalDebitLine = originalLines.find(l => l.entry_side === 'debit');
        const originalCreditLine = originalLines.find(l => l.entry_side === 'credit');

        if (originalDebitLine && originalCreditLine) {
          const reversalJournalNumber = await generateJournalNumber(trx, new Date());
          const [revJournalId] = await trx('journal_entries').insert({
            school_unit_id: schoolUnitId,
            academic_year_id: expense.academic_year_id || 2,
            journal_number: reversalJournalNumber,
            journal_date: new Date().toISOString().slice(0, 10),
            source_type: 'expense',
            source_id: expense.id,
            description: `Pembalik/Storno Pembatalan Belanja #${expense.id}: ${expense.item_name}. Alasan: ${reason}`,
            is_manual_correction: 1
          });

          const actualRevId = revJournalId || (await trx('journal_entries')
            .where({ journal_number: reversalJournalNumber })
            .first()).id;

          // Insert reversed lines: debit line gets original credit account, credit line gets original debit account
          await trx('journal_entry_lines').insert([
            {
              journal_entry_id: actualRevId,
              chart_of_account_id: originalCreditLine.chart_of_account_id, // Kas/Bank (Debit)
              entry_side: 'debit',
              amount: totalAmount
            },
            {
              journal_entry_id: actualRevId,
              chart_of_account_id: originalDebitLine.chart_of_account_id, // Beban (Kredit)
              entry_side: 'credit',
              amount: totalAmount
            }
          ]);
        }
      } else {
        // Fallback jika jurnal belum pernah tercatat
        try {
          await recordJournal({
            schoolUnitId,
            academicYearId: expense.academic_year_id || 2,
            transactionCode: 'expense_default',
            amount: totalAmount,
            sourceType: 'expense',
            sourceId: expense.id,
            description: `Pembalik/Storno Pembatalan Belanja #${expense.id}: ${expense.item_name}. Alasan: ${reason}`,
            journalDate: new Date(),
            userId,
            trx
          });
        } catch (e) {
          console.warn('Reversal journal fallback error:', e.message);
        }
      }

      // 3. MUTASI BALIK PADA fundBalanceEngine (DIRECTION: 'in')
      const originalMutations = await trx('fund_balance_mutations')
        .join('fund_balances', 'fund_balance_mutations.fund_balance_id', 'fund_balances.id')
        .where({
          'fund_balance_mutations.source_table': 'expenses',
          'fund_balance_mutations.source_id': expense.id,
          'fund_balance_mutations.direction': 'out'
        })
        .select(
          'fund_balance_mutations.*',
          'fund_balances.fund_type',
          'fund_balances.fund_ref_id'
        );

      if (originalMutations.length > 0) {
        for (const om of originalMutations) {
          await fundBalanceEngine.applyFundMutation({
            schoolUnitId,
            fundType: om.fund_type,
            fundRefId: om.fund_ref_id,
            academicYearId: om.academic_year_id || expenseAyId,
            direction: 'in',
            amount: parseFloat(om.amount),
            sourceTable: 'expenses',
            sourceId: expense.id,
            notes: `Pengembalian dana pembatalan belanja #${expense.id} (${expense.item_name}). Alasan: ${reason}`,
            userId,
            trx
          });
        }
      } else {
        const oldType = expense.fund_source_type || 'opening_pool';
        const oldRefId = oldType === 'opening_pool' ? 0 : Number(expense.fund_source_ref_id || 0);

        await fundBalanceEngine.applyFundMutation({
          schoolUnitId,
          fundType: oldType,
          fundRefId: oldRefId,
          academicYearId: expenseAyId,
          direction: 'in',
          amount: totalAmount,
          sourceTable: 'expenses',
          sourceId: expense.id,
          notes: `Pengembalian dana pembatalan belanja #${expense.id} (${expense.item_name}). Alasan: ${reason}`,
          userId,
          trx
        });
      }

      // 4. SOFT DELETE EXPENSE
      await trx('expenses')
        .where({ id: expense.id, school_unit_id: schoolUnitId })
        .update({
          deleted_reason: reason,
          deleted_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });

      // 5. AUDIT LOG
      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'SOFT_DELETE_EXPENSE',
        entityType: 'expense',
        entityId: expense.id,
        dataBefore: expense,
        dataAfter: {
          deleted_reason: reason,
          deleted_at: new Date(),
          reversal_formed: true,
          fund_restored: totalAmount
        },
        trx
      });

      return {
        success: true,
        message: `Pengeluaran #${expense.id} berhasil dibatalkan. Jurnal pembalik (storno) telah diterbitkan dan saldo kas/dana sebesar Rp ${totalAmount.toLocaleString('id-ID')} telah dikembalikan.`,
        refunded_amount: totalAmount
      };
    });
  }
}

module.exports = new ExpensesService();
