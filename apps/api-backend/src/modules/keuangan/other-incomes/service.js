/**
 * Other Incomes (Penerimaan Kas Non-Siswa / Sumber Lain) Service for Keuangan Module
 * Sesuai Modul Keuangan Enterprise Aldepos
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');
const { recordJournal } = require('../bookkeeping/journalEngine');
const fundBalanceEngine = require('../bookkeeping/fundBalanceEngine');

class OtherIncomesService {
  /**
   * Mengambil daftar transaksi penerimaan lainnya dengan filter lengkap
   */
  async listOtherIncomes(schoolUnitId, filters = {}) {
    const isAllUnits = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let query = db('other_incomes')
      .leftJoin('cash_accounts', 'other_incomes.cash_account_id', 'cash_accounts.id')
      .leftJoin('bank_statements', 'other_incomes.bank_statement_id', 'bank_statements.id')
      .leftJoin('budget_plan_income_items', 'other_incomes.budget_plan_income_item_id', 'budget_plan_income_items.id')
      .leftJoin('transaction_categories', 'other_incomes.transaction_category_id', 'transaction_categories.id')
      .leftJoin('transaction_account_mappings as tam', 'other_incomes.transaction_mapping_id', 'tam.id')
      .leftJoin('chart_of_accounts as d', 'other_incomes.debit_account_id', 'd.id')
      .leftJoin('chart_of_accounts as c', 'other_incomes.credit_account_id', 'c.id')
      .leftJoin('fund_balances as fb', 'other_incomes.fund_balance_id', 'fb.id')
      .select(
        'other_incomes.*',
        'cash_accounts.name as cash_account_name',
        'cash_accounts.account_kind as cash_account_kind',
        'bank_statements.description as bank_statement_description',
        'bank_statements.amount as bank_statement_amount',
        'bank_statements.transaction_date as bank_statement_date',
        'budget_plan_income_items.name as budget_income_name',
        'budget_plan_income_items.planned_amount as budget_planned_amount',
        'budget_plan_income_items.source_category as budget_source_category',
        'transaction_categories.name as category_name',
        'tam.transaction_code as rule_code',
        'tam.transaction_label as rule_label',
        'd.account_code as debit_account_code',
        'd.account_name as debit_account_name',
        'c.account_code as credit_account_code',
        'c.account_name as credit_account_name',
        'fb.fund_type as fund_balance_type',
        'fb.balance as fund_balance_amount'
      );

    if (!isAllUnits) {
      query = query.where('other_incomes.school_unit_id', Number(schoolUnitId));
    }

    if (filters.academic_year_id) {
      query = query.where('other_incomes.academic_year_id', Number(filters.academic_year_id));
    }

    if (filters.budget_plan_income_item_id) {
      if (filters.budget_plan_income_item_id === 'unbudgeted') {
        query = query.whereNull('other_incomes.budget_plan_income_item_id');
      } else {
        query = query.where('other_incomes.budget_plan_income_item_id', Number(filters.budget_plan_income_item_id));
      }
    }

    if (filters.source_category && filters.source_category !== 'all') {
      query = query.where('other_incomes.source_category', filters.source_category);
    }

    if (filters.cash_account_id && filters.cash_account_id !== 'all') {
      query = query.where('other_incomes.cash_account_id', Number(filters.cash_account_id));
    }

    if (filters.start_date) {
      query = query.where('other_incomes.received_at', '>=', filters.start_date);
    }
    if (filters.end_date) {
      query = query.where('other_incomes.received_at', '<=', filters.end_date);
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.where((q) => {
        q.where('other_incomes.receipt_number', 'like', term)
         .orWhere('other_incomes.notes', 'like', term)
         .orWhere('other_incomes.payer_name', 'like', term)
         .orWhere('budget_plan_income_items.name', 'like', term)
         .orWhere('transaction_categories.name', 'like', term)
         .orWhere('c.account_name', 'like', term);
      });
    }

    return query.orderBy('other_incomes.received_at', 'desc').orderBy('other_incomes.id', 'desc');
  }

  /**
   * Mengambil detail transaksi penerimaan lainnya berdasarkan ID
   */
  async getOtherIncomeById(schoolUnitId, id, trxDb = db) {
    const isAllUnits = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let query = trxDb('other_incomes')
      .leftJoin('cash_accounts', 'other_incomes.cash_account_id', 'cash_accounts.id')
      .leftJoin('bank_statements', 'other_incomes.bank_statement_id', 'bank_statements.id')
      .leftJoin('budget_plan_income_items', 'other_incomes.budget_plan_income_item_id', 'budget_plan_income_items.id')
      .leftJoin('transaction_categories', 'other_incomes.transaction_category_id', 'transaction_categories.id')
      .leftJoin('transaction_account_mappings as tam', 'other_incomes.transaction_mapping_id', 'tam.id')
      .leftJoin('chart_of_accounts as d', 'other_incomes.debit_account_id', 'd.id')
      .leftJoin('chart_of_accounts as c', 'other_incomes.credit_account_id', 'c.id')
      .leftJoin('fund_balances as fb', 'other_incomes.fund_balance_id', 'fb.id')
      .where('other_incomes.id', id)
      .select(
        'other_incomes.*',
        'cash_accounts.name as cash_account_name',
        'cash_accounts.account_kind as cash_account_kind',
        'bank_statements.description as bank_statement_description',
        'bank_statements.amount as bank_statement_amount',
        'bank_statements.transaction_date as bank_statement_date',
        'other_incomes.budget_plan_income_item_id as budget_income_item_id',
        'budget_plan_income_items.name as budget_income_name',
        'budget_plan_income_items.planned_amount as budget_planned_amount',
        'budget_plan_income_items.source_category as budget_source_category',
        'transaction_categories.name as category_name',
        'tam.transaction_code as rule_code',
        'tam.transaction_label as rule_label',
        'd.account_code as debit_account_code',
        'd.account_name as debit_account_name',
        'c.account_code as credit_account_code',
        'c.account_name as credit_account_name',
        'fb.fund_type as fund_balance_type',
        'fb.balance as fund_balance_amount'
      );

    if (!isAllUnits) {
      query = query.where('other_incomes.school_unit_id', Number(schoolUnitId));
    }

    return query.first();
  }

  /**
   * Mengambil daftar pos sumber pendapatan RAPBS non-siswa (selain hasil penetapan biaya siswa)
   * beserta ringkasan kartu makro penerimaan
   */
  async getRapbsIncomeSources(schoolUnitId, academicYearId = null) {
    const isAllUnits = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const unitId = isAllUnits ? 1 : Number(schoolUnitId);

    // 1. Ambil pos pendapatan RAPBS non-siswa (fee_type_id is null atau source_category !== 'tagihan_santri')
    let query = db('budget_plan_income_items')
      .join('budget_plans', 'budget_plan_income_items.budget_plan_id', 'budget_plans.id')
      .leftJoin('chart_of_accounts as c', 'budget_plan_income_items.credit_account_id', 'c.id')
      .leftJoin('cash_accounts as ca', 'budget_plan_income_items.cash_account_id', 'ca.id')
      .whereNull('budget_plan_income_items.fee_type_id');

    if (!isAllUnits) {
      query = query.where(b => b.where('budget_plans.school_unit_id', unitId).orWhere('budget_plans.school_unit_id', 0));
    }

    if (academicYearId) {
      query = query.where('budget_plans.academic_year_id', Number(academicYearId));
    }

    const items = await query.select(
      'budget_plan_income_items.id',
      'budget_plan_income_items.name',
      'budget_plan_income_items.planned_amount',
      'budget_plan_income_items.fee_type_id',
      'budget_plan_income_items.source_category',
      'budget_plan_income_items.credit_account_id',
      'budget_plan_income_items.cash_account_id',
      'budget_plan_income_items.notes',
      'budget_plans.id as budget_plan_id',
      'budget_plans.title as budget_plan_title',
      'budget_plans.academic_year_id',
      'c.account_code as credit_account_code',
      'c.account_name as credit_account_name',
      'ca.name as cash_account_name'
    );

    // 2. Hitung realisasi per pos RAPBS
    let totalPlannedRapbs = 0;
    let totalRealizedRapbs = 0;

    const sources = await Promise.all(items.map(async (item) => {
      let realQuery = db('other_incomes')
        .where('budget_plan_income_item_id', item.id);

      if (!isAllUnits) {
        realQuery = realQuery.where('school_unit_id', unitId);
      }
      if (academicYearId) {
        realQuery = realQuery.where('academic_year_id', Number(academicYearId));
      }

      const real = await realQuery.sum('amount as total_realized').count('id as transactions_count').first();

      const totalRealized = real?.total_realized ? parseFloat(real.total_realized) : 0;
      const planned = parseFloat(item.planned_amount || 0);
      const remaining = Math.max(0, planned - totalRealized);
      const percent = planned > 0 ? Math.round((totalRealized / planned) * 10000) / 100 : (totalRealized > 0 ? 100 : 0);

      totalPlannedRapbs += planned;
      totalRealizedRapbs += totalRealized;

      return {
        ...item,
        planned_amount: planned,
        total_realized: totalRealized,
        remaining_amount: remaining,
        realization_percentage: percent,
        transactions_count: Number(real?.transactions_count || 0)
      };
    }));

    // 3. Hitung penerimaan lainnya di luar rencana RAPBS (unbudgeted)
    let unbudgetedQuery = db('other_incomes')
      .whereNull('budget_plan_income_item_id');

    if (!isAllUnits) {
      unbudgetedQuery = unbudgetedQuery.where('school_unit_id', unitId);
    }
    if (academicYearId) {
      unbudgetedQuery = unbudgetedQuery.where('academic_year_id', Number(academicYearId));
    }

    const unbudgetedRes = await unbudgetedQuery
      .sum('amount as total_unbudgeted')
      .count('id as unbudgeted_count')
      .first();

    const totalUnbudgeted = unbudgetedRes?.total_unbudgeted ? parseFloat(unbudgetedRes.total_unbudgeted) : 0;
    const unbudgetedCount = Number(unbudgetedRes?.unbudgeted_count || 0);

    // 4. Hitung total semua penerimaan lainnya
    let allQuery = db('other_incomes');
    if (!isAllUnits) {
      allQuery = allQuery.where('school_unit_id', unitId);
    }
    if (academicYearId) {
      allQuery = allQuery.where('academic_year_id', Number(academicYearId));
    }
    const allRes = await allQuery.sum('amount as total_all').count('id as total_count').first();
    const totalAllOtherIncome = allRes?.total_all ? parseFloat(allRes.total_all) : 0;
    const totalTransactionsCount = Number(allRes?.total_count || 0);

    const totalRemainingRapbs = Math.max(0, totalPlannedRapbs - totalRealizedRapbs);
    const overallProgressPercent = totalPlannedRapbs > 0
      ? Math.round((totalRealizedRapbs / totalPlannedRapbs) * 10000) / 100
      : (totalRealizedRapbs > 0 ? 100 : 0);

    return {
      summary: {
        total_planned_rapbs: totalPlannedRapbs,
        total_realized_rapbs: totalRealizedRapbs,
        total_remaining_rapbs: totalRemainingRapbs,
        realization_percentage: overallProgressPercent,
        total_unbudgeted_income: totalUnbudgeted,
        unbudgeted_count: unbudgetedCount,
        total_all_other_income: totalAllOtherIncome,
        total_transactions_count: totalTransactionsCount
      },
      sources
    };
  }

  /**
   * Helper untuk generate nomor kwitansi bukti kas masuk (BKM)
   */
  async generateReceiptNumber(schoolUnitId, receivedDate, trx = db) {
    const d = new Date(receivedDate || Date.now());
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `BKM/${yr}/${mo}/`;

    const last = await trx('other_incomes')
      .where('school_unit_id', schoolUnitId)
      .where('receipt_number', 'like', `${prefix}%`)
      .orderBy('id', 'desc')
      .first();

    let seq = 1;
    if (last && last.receipt_number) {
      const parts = last.receipt_number.split('/');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /**
   * Mencatat transaksi penerimaan kas lainnya baru
   */
  async createOtherIncome(schoolUnitId, data, userId = null) {
    return db.transaction(async (trx) => {
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) {
        const err = new Error('Nominal penerimaan harus lebih dari 0');
        err.statusCode = 422;
        throw err;
      }

      const receivedAt = data.received_at || new Date().toISOString().slice(0, 10);
      const academicYearId = Number(data.academic_year_id || 1);
      const cashAccountId = Number(data.override_cash_account_id || data.cash_account_id);
      if (!cashAccountId) {
        const err = new Error('Rekening kas/bank penerima wajib dipilih');
        err.statusCode = 422;
        throw err;
      }

      let budgetPlanIncomeItemId = data.budget_plan_income_item_id ? Number(data.budget_plan_income_item_id) : null;
      let transactionCategoryId = data.transaction_category_id ? Number(data.transaction_category_id) : null;
      let sourceCategory = data.source_category || 'other';
      let payerName = data.payer_name ? data.payer_name.trim() : null;
      let notes = data.notes ? data.notes.trim() : '';

      // Tentukan Nama Sumber Pendapatan
      let incomeSourceName = notes || 'Penerimaan Kas Lainnya';

      let bpItem = null;
      if (budgetPlanIncomeItemId) {
        bpItem = await trx('budget_plan_income_items')
          .join('budget_plans', 'budget_plan_income_items.budget_plan_id', 'budget_plans.id')
          .where({
            'budget_plan_income_items.id': budgetPlanIncomeItemId
          })
          .where(b => b.where('budget_plans.school_unit_id', schoolUnitId).orWhere('budget_plans.school_unit_id', 0))
          .select('budget_plan_income_items.*')
          .first();

        if (bpItem) {
          incomeSourceName = bpItem.name;
          if (!sourceCategory || sourceCategory === 'other') {
            sourceCategory = bpItem.source_category || 'other';
          }
        }
      }

      // Auto assign category jika belum ada
      if (!transactionCategoryId) {
        let defaultCat = await trx('transaction_categories')
          .where({ school_unit_id: schoolUnitId, category_kind: 'special_income' })
          .first()
          || await trx('transaction_categories').where({ school_unit_id: schoolUnitId }).first()
          || await trx('transaction_categories').where({ category_kind: 'special_income' }).first()
          || await trx('transaction_categories').first();

        if (defaultCat) {
          transactionCategoryId = defaultCat.id;
        } else {
          try {
            const [insertedCatId] = await trx('transaction_categories').insert({
              school_unit_id: schoolUnitId || 1,
              category_kind: 'special_income',
              name: 'Penerimaan Kas Lainnya',
              related_account_id: creditAccountId || null
            });
            transactionCategoryId = insertedCatId || 1;
          } catch (_) {
            transactionCategoryId = 1;
          }
        }
      }

      // Tentukan Aturan Transaksi & Akun Akuntansi (Debet Kas & Kredit Pendapatan)
      let transactionMappingId = data.transaction_mapping_id ? Number(data.transaction_mapping_id) : null;
      let debitAccountId = data.override_debit_account_id ? Number(data.override_debit_account_id) : null;
      let creditAccountId = data.override_credit_account_id ? Number(data.override_credit_account_id) : null;
      let transactionCode = 'other_income_default';

      // 1. Cek dari cash_accounts untuk debet kas
      if (!debitAccountId) {
        const cashAcc = await trx('cash_accounts').where({ id: cashAccountId }).first();
        if (cashAcc && cashAcc.account_id) {
          debitAccountId = cashAcc.account_id;
        }
      }

      // 2. Cek dari aturan transaksi mapping jika dipilih
      if (transactionMappingId) {
        const rule = await trx('transaction_account_mappings').where({ id: transactionMappingId }).first();
        if (rule) {
          transactionCode = rule.transaction_code;
          if (!creditAccountId && rule.credit_account_id) creditAccountId = rule.credit_account_id;
          if (!debitAccountId && rule.debit_account_id) debitAccountId = rule.debit_account_id;
        }
      }

      // 3. Cek dari RAPBS item jika ada
      if (!creditAccountId && bpItem && bpItem.credit_account_id) {
        creditAccountId = bpItem.credit_account_id;
      }

      // 4. Fallback ke aturan transaksi berdasarkan source_category
      if (!creditAccountId) {
        let matchedRuleCode = 'other_income_general';
        if (sourceCategory === 'bos_government') matchedRuleCode = 'other_income_bos';
        else if (sourceCategory === 'grant_foundation') matchedRuleCode = 'other_income_subsidi_yayasan';
        else if (sourceCategory === 'donation_waqf') matchedRuleCode = 'other_income_donasi_wakaf';
        else if (sourceCategory === 'business_unit') matchedRuleCode = 'other_income_sewa_kantin';
        else if (sourceCategory === 'facility_rental') matchedRuleCode = 'other_income_sewa_fasilitas';
        else if (sourceCategory === 'bank_interest') matchedRuleCode = 'other_income_jasa_giro';

        const categoryRule = await trx('transaction_account_mappings')
          .where(b => b.where('school_unit_id', schoolUnitId).orWhere('school_unit_id', 0))
          .where('transaction_code', matchedRuleCode)
          .first();

        if (categoryRule) {
          transactionMappingId = categoryRule.id;
          transactionCode = categoryRule.transaction_code;
          creditAccountId = categoryRule.credit_account_id;
          if (!debitAccountId) debitAccountId = categoryRule.debit_account_id;
        }
      }

      // 5. Ultimate Fallback COA Pendapatan Lain-lain (60800)
      if (!creditAccountId) {
        const defaultPendapatan = await trx('chart_of_accounts').where('account_code', '60800').first()
          || await trx('chart_of_accounts').where('account_group', 'pendapatan').first();
        if (defaultPendapatan) creditAccountId = defaultPendapatan.id;
      }

      // Generate Receipt Number
      const receiptNumber = data.receipt_number || await this.generateReceiptNumber(schoolUnitId, receivedAt, trx);
      const bankStatementId = data.bank_statement_id ? Number(data.bank_statement_id) : null;

      // Insert Other Income Record
      const [id] = await trx('other_incomes').insert({
        school_unit_id: schoolUnitId,
        academic_year_id: academicYearId,
        receipt_number: receiptNumber,
        transaction_category_id: transactionCategoryId,
        budget_plan_income_item_id: budgetPlanIncomeItemId,
        cash_account_id: cashAccountId,
        bank_statement_id: bankStatementId,
        payer_name: payerName,
        source_category: sourceCategory,
        fund_balance_id: data.fund_balance_id ? Number(data.fund_balance_id) : null,
        transaction_mapping_id: transactionMappingId,
        debit_account_id: debitAccountId,
        credit_account_id: creditAccountId,
        override_reason: data.override_reason || null,
        amount: amount,
        received_at: receivedAt,
        notes: notes || incomeSourceName
      });

      const actualId = id || (await trx('other_incomes').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;

      // Rekonsiliasi Rekening Koran jika dipilih
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
            const thisAlloc = Math.min(amount, remainingPlafon);

            await trx('bank_statement_references').insert({
              bank_statement_id: stmt.id,
              school_unit_id: schoolUnitId || 1,
              reference_type: 'other_income',
              reference_id: actualId,
              amount: thisAlloc,
              notes: `Kwitansi BKM #${receiptNumber} (${notes || incomeSourceName})`,
              created_by: userId
            });

            const newAlloc = curAlloc + thisAlloc;
            const isFullyReconciled = newAlloc >= stmtTotal - 0.01;

            await trx('bank_statements')
              .where({ id: stmt.id })
              .update({
                is_reconciled: isFullyReconciled,
                reconciled_reference_type: 'other_income',
                reconciled_reference_id: actualId,
                reconciliation_notes: isFullyReconciled
                  ? `Lunas teralokasi ke transaksi (Kwitansi BKM #${receiptNumber})`
                  : `Teralokasi Rp ${newAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`,
                reconciled_at: isFullyReconciled ? trx.fn.now() : stmt.reconciled_at,
                updated_at: trx.fn.now()
              });
          }
        } catch (bsErr) {
          if (bsErr.statusCode === 422) throw bsErr;
          console.warn('Bank statement reconciliation for other income error:', bsErr.message);
        }
      }

      // Auto Journal Entry via journalEngine
      try {
        await recordJournal({
          schoolUnitId,
          academicYearId: academicYearId,
          transactionCode: transactionCode || 'other_income_default',
          amount: amount,
          sourceType: 'other_income',
          sourceId: actualId,
          description: `Penerimaan Kas: ${payerName ? payerName + ' - ' : ''}${notes || incomeSourceName} [${receiptNumber}]`,
          journalDate: receivedAt,
          overrideDebitAccountId: debitAccountId,
          overrideCreditAccountId: creditAccountId,
          overrideCashAccountId: cashAccountId,
          overrideReason: data.override_reason || null,
          userId,
          trx
        });
      } catch (journalErr) {
        if (journalErr.statusCode === 422) throw journalErr;
        console.warn('Auto journal skipped or error:', journalErr.message);
      }

      // Mutasi Kantong Dana via fundBalanceEngine
      try {
        let fundType = budgetPlanIncomeItemId ? 'budget_income_item' : 'transaction_category';
        let fundRefId = budgetPlanIncomeItemId || transactionCategoryId;

        if (data.fund_balance_id) {
          const fb = await trx('fund_balances').where({ id: Number(data.fund_balance_id) }).first();
          if (fb) {
            fundType = fb.fund_type;
            fundRefId = fb.fund_ref_id;
          }
        }

        await fundBalanceEngine.applyFundMutation({
          schoolUnitId,
          fundType,
          fundRefId,
          academicYearId: academicYearId,
          direction: 'in',
          amount: amount,
          sourceTable: 'other_incomes',
          sourceId: actualId,
          notes: `Penerimaan Sumber Lain: ${payerName ? payerName + ' - ' : ''}${notes || incomeSourceName} [${receiptNumber}]`,
          userId,
          trx
        });
      } catch (fbErr) {
        console.warn('Fund balance mutation for other income skipped or error:', fbErr.message);
      }

      const created = await this.getOtherIncomeById(schoolUnitId, actualId, trx);

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

  /**
   * Memperbarui / mengoreksi data transaksi penerimaan lainnya
   */
  async updateOtherIncome(schoolUnitId, id, data, userId = null) {
    return db.transaction(async (trx) => {
      const before = await this.getOtherIncomeById(schoolUnitId, id);
      if (!before) return null;

      const newAmount = data.amount !== undefined ? parseFloat(data.amount) : parseFloat(before.amount);
      const receivedAt = data.received_at || before.received_at;
      const academicYearId = data.academic_year_id ? Number(data.academic_year_id) : before.academic_year_id;
      const cashAccountId = data.cash_account_id ? Number(data.cash_account_id) : before.cash_account_id;
      const budgetPlanIncomeItemId = data.budget_plan_income_item_id !== undefined
        ? (data.budget_plan_income_item_id ? Number(data.budget_plan_income_item_id) : null)
        : before.budget_plan_income_item_id;
      const transactionCategoryId = data.transaction_category_id ? Number(data.transaction_category_id) : before.transaction_category_id;
      const sourceCategory = data.source_category || before.source_category || 'other';
      const payerName = data.payer_name !== undefined ? (data.payer_name ? data.payer_name.trim() : null) : before.payer_name;
      const notes = data.notes !== undefined ? (data.notes ? data.notes.trim() : '') : before.notes;
      const debitAccountId = data.override_debit_account_id ? Number(data.override_debit_account_id) : (data.debit_account_id ? Number(data.debit_account_id) : before.debit_account_id);
      const creditAccountId = data.override_credit_account_id ? Number(data.override_credit_account_id) : (data.credit_account_id ? Number(data.credit_account_id) : before.credit_account_id);
      const transactionMappingId = data.transaction_mapping_id ? Number(data.transaction_mapping_id) : before.transaction_mapping_id;
      const newBsId = data.bank_statement_id !== undefined
        ? (data.bank_statement_id ? Number(data.bank_statement_id) : null)
        : before.bank_statement_id;

      await trx('other_incomes')
        .where({ id, school_unit_id: schoolUnitId })
        .update({
          academic_year_id: academicYearId,
          transaction_category_id: transactionCategoryId,
          budget_plan_income_item_id: budgetPlanIncomeItemId,
          cash_account_id: cashAccountId,
          bank_statement_id: newBsId,
          payer_name: payerName,
          source_category: sourceCategory,
          fund_balance_id: data.fund_balance_id !== undefined ? (data.fund_balance_id ? Number(data.fund_balance_id) : null) : before.fund_balance_id,
          transaction_mapping_id: transactionMappingId,
          debit_account_id: debitAccountId,
          credit_account_id: creditAccountId,
          override_reason: data.override_reason !== undefined ? data.override_reason : before.override_reason,
          amount: newAmount,
          received_at: receivedAt,
          notes: notes
        });

      // Update rekonsiliasi rekening koran jika ada perubahan
      if (before.bank_statement_id || newBsId) {
        try {
          // 1. Hapus referensi lama
          await trx('bank_statement_references')
            .where({ reference_type: 'other_income', reference_id: id })
            .delete();

          // Recalculate statement lama jika beda
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

          // 2. Alokasikan ke statement baru
          if (newBsId) {
            const stmt = await trx('bank_statements').where({ id: newBsId }).first();
            if (stmt) {
              const allocSum = await trx('bank_statement_references')
                .where('bank_statement_id', stmt.id)
                .sum('amount as total_allocated')
                .first();
              const curAlloc = allocSum?.total_allocated ? parseFloat(allocSum.total_allocated) : 0;
              const stmtTotal = parseFloat(stmt.amount || 0);
              const thisAlloc = Math.min(newAmount, Math.max(0, stmtTotal - curAlloc));

              if (thisAlloc > 0) {
                await trx('bank_statement_references').insert({
                  bank_statement_id: stmt.id,
                  school_unit_id: schoolUnitId || 1,
                  reference_type: 'other_income',
                  reference_id: id,
                  amount: thisAlloc,
                  notes: `Kwitansi BKM #${before.receipt_number} (${notes})`,
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
                  reconciled_reference_type: 'other_income',
                  reconciled_reference_id: id,
                  reconciliation_notes: isFullyReconciled
                    ? `Lunas teralokasi ke transaksi (Kwitansi BKM #${before.receipt_number})`
                    : `Teralokasi Rp ${finalAlloc.toLocaleString('id-ID')} / Rp ${stmtTotal.toLocaleString('id-ID')}`,
                  reconciled_at: isFullyReconciled ? trx.fn.now() : null,
                  updated_at: trx.fn.now()
                });
            }
          }
        } catch (bsErr) {
          console.warn('Updating bank statement reconciliation on edit error:', bsErr.message);
        }
      }

      // Update Journal Entry jika ada
      try {
        const journal = await trx('journal_entries')
          .where({
            school_unit_id: schoolUnitId,
            source_type: 'other_income',
            source_id: id
          })
          .first();

        if (journal) {
          await trx('journal_entries')
            .where({ id: journal.id })
            .update({
              academic_year_id: academicYearId,
              journal_date: receivedAt,
              total_debit: newAmount,
              total_credit: newAmount,
              description: `Penerimaan Kas: ${payerName ? payerName + ' - ' : ''}${notes} [${before.receipt_number}]`
            });

          // Update baris debit & credit
          if (debitAccountId) {
            await trx('journal_entry_lines')
              .where({ journal_entry_id: journal.id, line_type: 'debit' })
              .update({ account_id: debitAccountId, amount: newAmount });
          } else {
            await trx('journal_entry_lines')
              .where({ journal_entry_id: journal.id, line_type: 'debit' })
              .update({ amount: newAmount });
          }

          if (creditAccountId) {
            await trx('journal_entry_lines')
              .where({ journal_entry_id: journal.id, line_type: 'credit' })
              .update({ account_id: creditAccountId, amount: newAmount });
          } else {
            await trx('journal_entry_lines')
              .where({ journal_entry_id: journal.id, line_type: 'credit' })
              .update({ amount: newAmount });
          }
        }
      } catch (jErr) {
        console.warn('Update journal for other income failed:', jErr.message);
      }

      // Sesuaikan selisih mutasi kantong dana
      const diff = newAmount - parseFloat(before.amount);
      if (diff !== 0) {
        try {
          let fundType = budgetPlanIncomeItemId ? 'budget_income_item' : 'transaction_category';
          let fundRefId = budgetPlanIncomeItemId || transactionCategoryId;

          const activeFbId = data.fund_balance_id || before.fund_balance_id;
          if (activeFbId) {
            const fb = await trx('fund_balances').where({ id: Number(activeFbId) }).first();
            if (fb) {
              fundType = fb.fund_type;
              fundRefId = fb.fund_ref_id;
            }
          }

          await fundBalanceEngine.applyFundMutation({
            schoolUnitId,
            fundType,
            fundRefId,
            academicYearId: academicYearId,
            direction: diff > 0 ? 'in' : 'out',
            amount: Math.abs(diff),
            sourceTable: 'other_incomes',
            sourceId: id,
            notes: `Koreksi Penerimaan Sumber Lain #${id} (${diff > 0 ? '+' : '-'}${Math.abs(diff)})`,
            userId,
            trx
          });
        } catch (fbErr) {
          console.warn('Fund balance adjustment on edit skipped:', fbErr.message);
        }
      }

      const updated = await this.getOtherIncomeById(schoolUnitId, id, trx);

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'UPDATE_OTHER_INCOME',
        entityType: 'other_income',
        entityId: id,
        dataBefore: before,
        dataAfter: updated,
        trx
      });

      return updated;
    });
  }

  /**
   * Menghapus transaksi penerimaan lainnya (Void / Hard Delete draf)
   */
  async deleteOtherIncome(schoolUnitId, id, userId = null) {
    return db.transaction(async (trx) => {
      const before = await this.getOtherIncomeById(schoolUnitId, id);
      if (!before) return false;

      // Hapus referensi mutasi rekening koran jika ada
      if (before.bank_statement_id) {
        try {
          await trx('bank_statement_references')
            .where({ reference_type: 'other_income', reference_id: id })
            .delete();

          const stmt = await trx('bank_statements').where({ id: before.bank_statement_id }).first();
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
          console.warn('Cleaning bank statement references on delete error:', bsErr.message);
        }
      }

      // Balikkan mutasi kantong dana
      try {
        let fundType = before.budget_plan_income_item_id ? 'budget_income_item' : 'transaction_category';
        let fundRefId = before.budget_plan_income_item_id || before.transaction_category_id;

        if (before.fund_balance_id) {
          const fb = await trx('fund_balances').where({ id: Number(before.fund_balance_id) }).first();
          if (fb) {
            fundType = fb.fund_type;
            fundRefId = fb.fund_ref_id;
          }
        }

        await fundBalanceEngine.applyFundMutation({
          schoolUnitId,
          fundType,
          fundRefId,
          academicYearId: before.academic_year_id,
          direction: 'out',
          amount: parseFloat(before.amount),
          sourceTable: 'other_incomes',
          sourceId: id,
          notes: `Pembatalan / Hapus Penerimaan Sumber Lain #${id} [${before.receipt_number}]`,
          userId,
          trx
        });
      } catch (fbErr) {
        console.warn('Reversing fund balance mutation failed:', fbErr.message);
      }

      // Hapus jurnal terkait jika ada
      try {
        const journal = await trx('journal_entries')
          .where({
            school_unit_id: schoolUnitId,
            source_type: 'other_income',
            source_id: id
          })
          .first();

        if (journal) {
          await trx('journal_entry_lines').where({ journal_entry_id: journal.id }).delete();
          await trx('journal_entries').where({ id: journal.id }).delete();
        }
      } catch (jErr) {
        console.warn('Deleting journal for other income failed:', jErr.message);
      }

      await trx('other_incomes')
        .where({ id, school_unit_id: schoolUnitId })
        .delete();

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'DELETE_OTHER_INCOME',
        entityType: 'other_income',
        entityId: id,
        dataBefore: before,
        trx
      });

      return true;
    });
  }

  /**
   * Mengambil data kwitansi resmi bukti kas masuk (BKM)
   */
  async getOtherIncomeReceipt(schoolUnitId, id) {
    const item = await this.getOtherIncomeById(schoolUnitId, id);
    if (!item) return null;

    // Ambil data unit sekolah dari core jika perlu atau gunakan default nama unit
    return {
      id: item.id,
      receipt_number: item.receipt_number || `BKM-${item.id}`,
      received_at: item.received_at,
      payer_name: item.payer_name || 'Hamba Allah / Penyetor Umum',
      amount: parseFloat(item.amount),
      notes: item.notes || item.budget_income_name || 'Penerimaan Kas Lainnya',
      source_category: item.source_category,
      budget_income_name: item.budget_income_name,
      cash_account_name: item.cash_account_name,
      cash_account_kind: item.cash_account_kind,
      rule_label: item.rule_label,
      debit_account_code: item.debit_account_code,
      debit_account_name: item.debit_account_name,
      credit_account_code: item.credit_account_code,
      credit_account_name: item.credit_account_name,
      school_unit_id: item.school_unit_id,
      academic_year_id: item.academic_year_id,
      created_at: item.created_at
    };
  }
}

module.exports = new OtherIncomesService();
