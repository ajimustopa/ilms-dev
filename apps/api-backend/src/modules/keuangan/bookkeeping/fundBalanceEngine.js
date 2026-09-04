/**
 * Fund Balance Engine for Keuangan Module
 * Handles:
 * 1. Tracking Saldo per Sumber Dana & Tahun Ajaran (Kantong Dana / Pos Biaya / Opening Pool)
 * 2. Applying Fund Mutations (Inflows & Outflows) with mandatory academic_year_id
 * 3. Fund Balance Inquiries and Drill-down History per Academic Year
 */
const db = require('../../../config/db/keuangan');

class FundBalanceEngine {
  /**
   * Apply a fund balance mutation (inflow or outflow)
   * Parameter academicYearId WAJIB disertakan (Tahap 10 AY dimension)
   */
  async applyFundMutation({
    schoolUnitId,
    fundType,
    fundRefId = 0,
    academicYearId,
    direction, // 'in' or 'out'
    amount,
    sourceTable,
    sourceId = null,
    notes = null,
    userId = null,
    trx = null
  }) {
    const numericAmount = Math.abs(parseFloat(amount || 0));
    if (numericAmount <= 0) return null;

    if (!academicYearId) {
      const err = new Error('academic_year_id wajib disertakan untuk mutasi kantong dana (applyFundMutation)');
      err.statusCode = 422;
      throw err;
    }

    const normalizedRefId = fundType === 'opening_pool' ? 0 : Number(fundRefId || 0);
    const normalizedAyId = Number(academicYearId);

    const exec = async (t) => {
      // 1. Cari atau buat baris fund_balances untuk (unit, fund_type, fund_ref_id, academic_year_id)
      let fundRow = await t('fund_balances')
        .where({
          school_unit_id: schoolUnitId,
          fund_type: fundType,
          fund_ref_id: normalizedRefId,
          academic_year_id: normalizedAyId
        })
        .first();

      if (!fundRow) {
        const bpiiId = fundType === 'budget_income_item' ? normalizedRefId : null;
        const [insertedId] = await t('fund_balances').insert({
          school_unit_id: schoolUnitId,
          fund_type: fundType,
          fund_ref_id: normalizedRefId,
          budget_plan_income_item_id: bpiiId,
          academic_year_id: normalizedAyId,
          balance: 0
        });

        const actualId = insertedId || (await t('fund_balances').where({
          school_unit_id: schoolUnitId,
          fund_type: fundType,
          fund_ref_id: normalizedRefId,
          academic_year_id: normalizedAyId
        }).first()).id;

        fundRow = await t('fund_balances').where({ id: actualId }).first();
      }

      // 2. Hitung saldo sebelum dan sesudah
      const balanceBefore = parseFloat(fundRow.balance || 0);
      const balanceAfter = direction === 'in'
        ? balanceBefore + numericAmount
        : balanceBefore - numericAmount;

      // 3. Update saldo kantong dana
      await t('fund_balances')
        .where({ id: fundRow.id })
        .update({
          balance: balanceAfter,
          updated_at: t.fn.now()
        });

      // 4. Catat riwayat mutasi dana dengan academic_year_id
      const [mutationId] = await t('fund_balance_mutations').insert({
        fund_balance_id: fundRow.id,
        academic_year_id: normalizedAyId,
        direction,
        amount: numericAmount,
        source_table: sourceTable,
        source_id: sourceId,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        notes: notes || null,
        created_by: userId
      });

      const actualMutationId = mutationId || (await t('fund_balance_mutations')
        .where({ fund_balance_id: fundRow.id })
        .orderBy('id', 'desc')
        .first()).id;

      const createdMutation = await t('fund_balance_mutations').where({ id: actualMutationId }).first();

      return {
        fund_balance_id: fundRow.id,
        academic_year_id: normalizedAyId,
        fund_type: fundType,
        fund_ref_id: normalizedRefId,
        direction,
        amount: numericAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        mutation: createdMutation
      };
    };

    if (trx) {
      return exec(trx);
    }
    return db.transaction(exec);
  }

  /**
   * Get single fund balance for specific academic year
   */
  async getFundBalance(schoolUnitId, fundType, fundRefId = 0, academicYearId = null, trx = null) {
    const normalizedRefId = fundType === 'opening_pool' ? 0 : Number(fundRefId || 0);
    let query = (trx || db)('fund_balances')
      .where({
        school_unit_id: schoolUnitId,
        fund_type: fundType,
        fund_ref_id: normalizedRefId
      });

    if (academicYearId) {
      query = query.where('academic_year_id', Number(academicYearId));
    }

    const row = await query.first();
    return parseFloat(row?.balance || 0);
  }

  /**
   * List all fund balances with enriched RAPBS names, total in/out, and remaining balance per academic_year
   * Refactored to center on RAPBS income items (budget_plan_income_items) & real mutations
   */
  async listFundBalances(schoolUnitId, academicYearId = null) {
    // 1. Ambil seluruh fund_balances yang tercatat di database (opsional filter academic_year_id)
    let fbQuery = db('fund_balances').where({ school_unit_id: schoolUnitId });
    if (academicYearId) {
      fbQuery = fbQuery.where('academic_year_id', Number(academicYearId));
    }
    const existingBalances = await fbQuery;

    // 2. Ambil master RAPBS income items (mata anggaran pendapatan) untuk tahun ajaran terkait
    let rapbsQuery = db('budget_plan_income_items')
      .join('budget_plans', 'budget_plan_income_items.budget_plan_id', 'budget_plans.id')
      .where(b => b.where('budget_plans.school_unit_id', schoolUnitId).orWhere('budget_plans.school_unit_id', 0));

    if (academicYearId) {
      rapbsQuery = rapbsQuery.where('budget_plans.academic_year_id', Number(academicYearId));
    }

    const rapbsIncomeItems = await rapbsQuery.select(
      'budget_plan_income_items.id',
      'budget_plan_income_items.name',
      'budget_plan_income_items.fee_type_id',
      'budget_plan_income_items.planned_amount',
      'budget_plans.id as budget_plan_id',
      'budget_plans.title as budget_plan_title',
      'budget_plans.academic_year_id'
    );

    // 3. Ambil agregasi mutasi in/out per fund_balance_id
    let mutQuery = db('fund_balance_mutations')
      .join('fund_balances', 'fund_balance_mutations.fund_balance_id', 'fund_balances.id')
      .where('fund_balances.school_unit_id', schoolUnitId);

    if (academicYearId) {
      mutQuery = mutQuery.where('fund_balance_mutations.academic_year_id', Number(academicYearId));
    }

    const mutationsAgg = await mutQuery
      .groupBy('fund_balance_mutations.fund_balance_id', 'fund_balance_mutations.direction')
      .select(
        'fund_balance_mutations.fund_balance_id',
        'fund_balance_mutations.direction',
        db.raw('SUM(fund_balance_mutations.amount) as total_amount')
      );

    const aggMap = {};
    mutationsAgg.forEach(m => {
      if (!aggMap[m.fund_balance_id]) aggMap[m.fund_balance_id] = { total_in: 0, total_out: 0 };
      if (m.direction === 'in') {
        aggMap[m.fund_balance_id].total_in += parseFloat(m.total_amount || 0);
      } else {
        aggMap[m.fund_balance_id].total_out += parseFloat(m.total_amount || 0);
      }
    });

    const fundMap = {};
    existingBalances.forEach(fb => {
      fundMap[`${fb.fund_type}_${fb.fund_ref_id}`] = fb;
      if (fb.budget_plan_income_item_id) {
        fundMap[`bpii_${fb.budget_plan_income_item_id}`] = fb;
      }
    });

    const results = [];
    const matchedFbIds = new Set();

    // A. Baris Pertama: "Saldo Awal (Belum Teralokasi)" (opening_pool)
    const openingPoolFb = fundMap['opening_pool_0'];
    const opAgg = openingPoolFb ? aggMap[openingPoolFb.id] || { total_in: 0, total_out: 0 } : { total_in: 0, total_out: 0 };
    if (openingPoolFb) matchedFbIds.add(openingPoolFb.id);

    results.push({
      id: openingPoolFb?.id || null,
      fund_type: 'opening_pool',
      fund_ref_id: 0,
      budget_plan_income_item_id: null,
      academic_year_id: openingPoolFb?.academic_year_id || (academicYearId ? Number(academicYearId) : null),
      name: 'Saldo Awal Kas (Opening Pool)',
      code: 'OPENING_POOL',
      category: 'Saldo Awal',
      description: 'Pool dana saldo awal kas pra-pencatatan sistem yang dapat digunakan untuk belanja sampai habis',
      planned_amount: 0,
      balance: parseFloat(openingPoolFb?.balance || 0),
      total_in: opAgg.total_in,
      total_out: opAgg.total_out,
      realization_percentage: 100
    });

    // B. Pos Pendapatan RAPBS Resmi (budget_plan_income_items)
    rapbsIncomeItems.forEach(item => {
      let fb = null;
      let totalIn = 0;
      let totalOut = 0;
      let currentBal = 0;

      // 1. Check direct budget_income_item match
      const directBpii = fundMap[`bpii_${item.id}`] || fundMap[`budget_income_item_${item.id}`];
      if (directBpii) {
        fb = directBpii;
        matchedFbIds.add(directBpii.id);
        const agg = aggMap[directBpii.id] || { total_in: 0, total_out: 0 };
        totalIn += agg.total_in;
        totalOut += agg.total_out;
        currentBal += parseFloat(directBpii.balance || 0);
      }

      // 2. If item is tied to a fee_type (Penerimaan Siswa / PPDB)
      if (item.fee_type_id) {
        const feeFb = fundMap[`fee_type_${item.fee_type_id}`];
        if (feeFb) {
          if (!fb) fb = feeFb;
          matchedFbIds.add(feeFb.id);
          const agg = aggMap[feeFb.id] || { total_in: 0, total_out: 0 };
          totalIn += agg.total_in;
          totalOut += agg.total_out;
          currentBal += parseFloat(feeFb.balance || 0);
        }
      }

      const planned = parseFloat(item.planned_amount || 0);
      const percent = planned > 0 ? Math.round((totalIn / planned) * 10000) / 100 : 0;

      results.push({
        id: fb?.id || null,
        fund_type: item.fee_type_id ? 'fee_type' : 'budget_income_item',
        fund_ref_id: item.fee_type_id || item.id,
        budget_plan_income_item_id: item.id,
        academic_year_id: item.academic_year_id || (academicYearId ? Number(academicYearId) : null),
        name: item.name,
        code: `RAPBS-INC-${item.id}`,
        category: item.fee_type_id ? 'Penerimaan Siswa / PPDB' : 'Sumber Lain (RAPBS)',
        description: `Kantong dana penerimaan pos RAPBS: ${item.name}`,
        planned_amount: planned,
        balance: currentBal,
        total_in: totalIn,
        total_out: totalOut,
        realization_percentage: percent
      });
    });

    // C. Data Kantong Lain yang Belum Terpetakan di RAPBS (Data Historis / Transaksi Kategori)
    existingBalances.forEach(fb => {
      if (!matchedFbIds.has(fb.id) && fb.fund_type !== 'opening_pool') {
        const agg = aggMap[fb.id] || { total_in: 0, total_out: 0 };
        results.push({
          id: fb.id,
          fund_type: fb.fund_type,
          fund_ref_id: fb.fund_ref_id,
          budget_plan_income_item_id: fb.budget_plan_income_item_id || null,
          academic_year_id: fb.academic_year_id,
          name: `Pos Historis: ${fb.fund_type} #${fb.fund_ref_id}`,
          code: `HIST-${fb.id}`,
          category: 'Kantong Dana Historis',
          description: `Kantong dana tercatat di database tanpa relasi aktif ke RAPBS tahun ajaran ini`,
          planned_amount: 0,
          balance: parseFloat(fb.balance || 0),
          total_in: agg.total_in,
          total_out: agg.total_out,
          realization_percentage: 100
        });
      }
    });

    // Ringkasan
    const totalInAll = results.reduce((acc, r) => acc + r.total_in, 0);
    const totalOutAll = results.reduce((acc, r) => acc + r.total_out, 0);
    const totalBalanceAll = results.reduce((acc, r) => acc + r.balance, 0);
    const totalPlannedAll = results.reduce((acc, r) => acc + (r.planned_amount || 0), 0);

    return {
      academic_year_id: academicYearId ? Number(academicYearId) : null,
      summary: {
        total_planned_budget: totalPlannedAll,
        total_fund_in: totalInAll,
        total_fund_out: totalOutAll,
        total_fund_balance: totalBalanceAll,
        opening_pool_balance: parseFloat(openingPoolFb?.balance || 0),
        fund_count: results.length
      },
      funds: results
    };
  }

  /**
   * List mutations for a specific fund balance
   */
  async listFundMutations(schoolUnitId, fundBalanceId, filters = {}) {
    const fund = await db('fund_balances')
      .where({ id: fundBalanceId, school_unit_id: schoolUnitId })
      .first();

    if (!fund) {
      const err = new Error('Kantong dana tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    let query = db('fund_balance_mutations')
      .where({ fund_balance_id: fundBalanceId });

    if (filters.direction) {
      query = query.where('direction', filters.direction);
    }
    if (filters.academic_year_id) {
      query = query.where('academic_year_id', Number(filters.academic_year_id));
    }

    const mutations = await query.orderBy('created_at', 'desc');

    return {
      fund,
      mutations
    };
  }

  /**
   * 4. INTER-YEAR FUND LOANS & REALLOCATIONS
   */

  /**
   * Create Inter-Year Fund Loan (Realokasi dana kantong antar tahun ajaran)
   */
  async createInterYearLoan({
    schoolUnitId,
    fromAcademicYearId,
    toAcademicYearId,
    fundType = 'fee_type',
    fundRefId = 0,
    toFundType = 'fee_type',
    toFundRefId = 0,
    amount,
    purpose,
    expectedRepaymentNote = null,
    borrowedAt = null,
    userId = null
  }) {
    const numAmount = Math.abs(parseFloat(amount || 0));
    if (numAmount <= 0) {
      const err = new Error('Nominal pinjaman antar tahun ajaran harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    if (!purpose || !purpose.trim()) {
      const err = new Error('Alasan / tujuan penggunaan dana wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    if (Number(fromAcademicYearId) === Number(toAcademicYearId)) {
      const err = new Error('Tahun ajaran sumber dan tahun ajaran pemakai tidak boleh sama');
      err.statusCode = 422;
      throw err;
    }

    // 1. Cek saldo kantong sumber
    const availableBalance = await this.getFundBalance(schoolUnitId, fundType, fundRefId, fromAcademicYearId);

    if (availableBalance < numAmount) {
      const err = new Error(`Saldo kantong dana sumber tidak mencukupi untuk dipinjamkan (Tersedia: Rp ${availableBalance.toLocaleString('id-ID')}, Diminta: Rp ${numAmount.toLocaleString('id-ID')})`);
      err.statusCode = 422;
      throw err;
    }

    const bDate = borrowedAt || new Date().toISOString().slice(0, 10);

    return db.transaction(async (trx) => {
      // 2. Insert record pinjaman
      const [loanId] = await trx('inter_year_fund_loans').insert({
        school_unit_id: schoolUnitId,
        from_academic_year_id: Number(fromAcademicYearId),
        to_academic_year_id: Number(toAcademicYearId),
        fund_type: fundType,
        fund_ref_id: Number(fundRefId || 0),
        to_fund_type: toFundType || fundType,
        to_fund_ref_id: Number(toFundRefId || fundRefId || 0),
        amount: numAmount,
        purpose: purpose.trim(),
        status: 'outstanding',
        outstanding_amount: numAmount,
        borrowed_by: userId,
        borrowed_at: bDate,
        expected_repayment_note: expectedRepaymentNote || null,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now()
      });

      const actualLoanId = loanId || (await trx('inter_year_fund_loans').orderBy('id', 'desc').first()).id;

      // 3. Mutasi 'out' dari Tahun Ajaran Sumber
      await this.applyFundMutation({
        schoolUnitId,
        fundType,
        fundRefId,
        academicYearId: fromAcademicYearId,
        direction: 'out',
        amount: numAmount,
        sourceTable: 'inter_year_fund_loans',
        sourceId: actualLoanId,
        notes: `Realokasi dipinjamkan ke TA #${toAcademicYearId} (${purpose.trim()})`,
        userId,
        trx
      });

      // 4. Mutasi 'in' ke Tahun Ajaran Pemakai/Peminjam
      await this.applyFundMutation({
        schoolUnitId,
        fundType: toFundType || fundType,
        fundRefId: toFundRefId || fundRefId,
        academicYearId: toAcademicYearId,
        direction: 'in',
        amount: numAmount,
        sourceTable: 'inter_year_fund_loans',
        sourceId: actualLoanId,
        notes: `Realokasi pinjaman dari TA #${fromAcademicYearId} (${purpose.trim()})`,
        userId,
        trx
      });

      return trx('inter_year_fund_loans').where({ id: actualLoanId }).first();
    });
  }

  /**
   * Repay Inter-Year Fund Loan (Pengembalian dana pinjaman ke TA sumber)
   */
  async repayInterYearLoan({
    schoolUnitId,
    loanId,
    amount,
    repaidAt = null,
    notes = null,
    userId = null
  }) {
    const loan = await db('inter_year_fund_loans')
      .where({ id: loanId, school_unit_id: schoolUnitId })
      .first();

    if (!loan) {
      const err = new Error('Data pinjaman antar tahun ajaran tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (loan.status === 'repaid') {
      const err = new Error('Pinjaman ini sudah lunas sepenuhnya');
      err.statusCode = 422;
      throw err;
    }

    const numAmount = Math.abs(parseFloat(amount || 0));
    const currentOutstanding = parseFloat(loan.outstanding_amount || 0);

    if (numAmount <= 0) {
      const err = new Error('Nominal pengembalian harus lebih dari 0');
      err.statusCode = 422;
      throw err;
    }

    if (numAmount > currentOutstanding) {
      const err = new Error(`Nominal pengembalian (Rp ${numAmount.toLocaleString('id-ID')}) melebihi sisa pinjaman (Rp ${currentOutstanding.toLocaleString('id-ID')})`);
      err.statusCode = 422;
      throw err;
    }

    // Cek saldo kantong pemakai (yang mengembalikan)
    const availableBorrowerBalance = await this.getFundBalance(
      schoolUnitId,
      loan.to_fund_type || loan.fund_type,
      loan.to_fund_ref_id || loan.fund_ref_id,
      loan.to_academic_year_id
    );

    if (availableBorrowerBalance < numAmount) {
      const err = new Error(`Saldo kantong pemakai tidak mencukupi untuk melakukan pengembalian (Tersedia: Rp ${availableBorrowerBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${numAmount.toLocaleString('id-ID')})`);
      err.statusCode = 422;
      throw err;
    }

    const rDate = repaidAt || new Date().toISOString().slice(0, 10);
    const newOutstanding = Math.max(0, currentOutstanding - numAmount);
    const newStatus = newOutstanding === 0 ? 'repaid' : 'partially_repaid';

    return db.transaction(async (trx) => {
      // 1. Insert repayment record
      const [repaymentId] = await trx('inter_year_fund_loan_repayments').insert({
        inter_year_fund_loan_id: loan.id,
        amount: numAmount,
        repaid_at: rDate,
        repaid_by: userId,
        notes: notes || `Pengembalian pinjaman dana ke TA #${loan.from_academic_year_id}`,
        created_at: trx.fn.now()
      });

      // 2. Update status pinjaman
      await trx('inter_year_fund_loans')
        .where({ id: loan.id })
        .update({
          outstanding_amount: newOutstanding,
          status: newStatus,
          updated_at: trx.fn.now()
        });

      // 3. Mutasi 'out' dari Tahun Ajaran Pemakai
      await this.applyFundMutation({
        schoolUnitId,
        fundType: loan.to_fund_type || loan.fund_type,
        fundRefId: loan.to_fund_ref_id || loan.fund_ref_id,
        academicYearId: loan.to_academic_year_id,
        direction: 'out',
        amount: numAmount,
        sourceTable: 'inter_year_fund_loan_repayments',
        sourceId: repaymentId,
        notes: `Pengembalian pinjaman dana ke TA #${loan.from_academic_year_id}`,
        userId,
        trx
      });

      // 4. Mutasi 'in' kembali ke Tahun Ajaran Sumber
      await this.applyFundMutation({
        schoolUnitId,
        fundType: loan.fund_type,
        fundRefId: loan.fund_ref_id,
        academicYearId: loan.from_academic_year_id,
        direction: 'in',
        amount: numAmount,
        sourceTable: 'inter_year_fund_loan_repayments',
        sourceId: repaymentId,
        notes: `Penerimaan pengembalian pinjaman dana dari TA #${loan.to_academic_year_id}`,
        userId,
        trx
      });

      const updatedLoan = await trx('inter_year_fund_loans').where({ id: loan.id }).first();
      return {
        loan: updatedLoan,
        repayment_id: repaymentId,
        amount_repaid: numAmount,
        remaining_outstanding: newOutstanding,
        status: newStatus
      };
    });
  }

  /**
   * List Inter-Year Fund Loans with metrics & warning indicators
   */
  async listInterYearLoans(schoolUnitId, filters = {}) {
    let query = db('inter_year_fund_loans as iyfl')
      .leftJoin('fee_types as ft_from', 'iyfl.fund_ref_id', 'ft_from.id')
      .leftJoin('fee_types as ft_to', 'iyfl.to_fund_ref_id', 'ft_to.id')
      .where('iyfl.school_unit_id', schoolUnitId);

    if (filters.status && filters.status !== 'all') {
      query = query.where('iyfl.status', filters.status);
    }
    if (filters.academic_year_id) {
      const ayId = Number(filters.academic_year_id);
      query = query.where(b => {
        b.where('iyfl.from_academic_year_id', ayId)
          .orWhere('iyfl.to_academic_year_id', ayId);
      });
    }

    const loans = await query
      .select(
        'iyfl.*',
        'ft_from.name as from_fee_type_name',
        'ft_to.name as to_fee_type_name'
      )
      .orderBy('iyfl.created_at', 'desc');

    const now = new Date();

    const formattedLoans = loans.map(l => {
      const bDate = new Date(l.borrowed_at);
      const diffDays = Math.floor((now - bDate) / (1000 * 60 * 60 * 24));
      const isAged = l.status !== 'repaid' && diffDays >= 90;

      const totalAmt = parseFloat(l.amount || 0);
      const outAmt = parseFloat(l.outstanding_amount || 0);
      const repaidAmt = totalAmt - outAmt;
      const progressPct = totalAmt > 0 ? Math.round((repaidAmt / totalAmt) * 100) : 0;

      return {
        ...l,
        amount: totalAmt,
        outstanding_amount: outAmt,
        repaid_amount: repaidAmt,
        progress_percentage: progressPct,
        days_outstanding: diffDays,
        is_aged_90_days: isAged
      };
    });

    // Summary calculation
    const allLoans = await db('inter_year_fund_loans').where('school_unit_id', schoolUnitId);
    const totalLoaned = allLoans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
    const totalOutstanding = allLoans.reduce((acc, l) => acc + parseFloat(l.outstanding_amount || 0), 0);
    const totalRepaid = totalLoaned - totalOutstanding;
    const activeLoans = allLoans.filter(l => l.status !== 'repaid');

    const agedCount = allLoans.filter(l => {
      if (l.status === 'repaid') return false;
      const d = Math.floor((now - new Date(l.borrowed_at)) / (1000 * 60 * 60 * 24));
      return d >= 90;
    }).length;

    return {
      summary: {
        total_loaned: totalLoaned,
        total_outstanding: totalOutstanding,
        total_repaid: totalRepaid,
        active_loans_count: activeLoans.length,
        aged_loans_count: agedCount
      },
      loans: formattedLoans
    };
  }

  /**
   * Get single loan detail with repayments
   */
  async getInterYearLoanById(schoolUnitId, loanId) {
    const loan = await db('inter_year_fund_loans as iyfl')
      .leftJoin('fee_types as ft_from', 'iyfl.fund_ref_id', 'ft_from.id')
      .leftJoin('fee_types as ft_to', 'iyfl.to_fund_ref_id', 'ft_to.id')
      .where({ 'iyfl.id': loanId, 'iyfl.school_unit_id': schoolUnitId })
      .select(
        'iyfl.*',
        'ft_from.name as from_fee_type_name',
        'ft_to.name as to_fee_type_name'
      )
      .first();

    if (!loan) return null;

    const repayments = await db('inter_year_fund_loan_repayments')
      .where({ inter_year_fund_loan_id: loan.id })
      .orderBy('repaid_at', 'desc');

    const now = new Date();
    const diffDays = Math.floor((now - new Date(loan.borrowed_at)) / (1000 * 60 * 60 * 24));

    return {
      ...loan,
      amount: parseFloat(loan.amount),
      outstanding_amount: parseFloat(loan.outstanding_amount),
      repaid_amount: parseFloat(loan.amount) - parseFloat(loan.outstanding_amount),
      days_outstanding: diffDays,
      is_aged_90_days: loan.status !== 'repaid' && diffDays >= 90,
      repayments
    };
  }

  /**
   * Get lending summary for an academic year (Cross-validation for RAPBS & Realization reports)
   */
  async getAcademicYearLoansSummary(schoolUnitId, academicYearId) {
    if (!academicYearId) return null;
    const ayId = Number(academicYearId);

    // 1. Pinjaman KELUAR (Tahun ini memberi pinjaman ke tahun lain -> kantong jadi lebih tipis)
    const lentOut = await db('inter_year_fund_loans')
      .where({
        school_unit_id: schoolUnitId,
        from_academic_year_id: ayId
      })
      .whereIn('status', ['outstanding', 'partially_repaid']);

    const totalLentOutstanding = lentOut.reduce((acc, l) => acc + parseFloat(l.outstanding_amount || 0), 0);

    // 2. Pinjaman MASUK (Tahun ini memakai dana dari tahun lain)
    const borrowedIn = await db('inter_year_fund_loans')
      .where({
        school_unit_id: schoolUnitId,
        to_academic_year_id: ayId
      })
      .whereIn('status', ['outstanding', 'partially_repaid']);

    const totalBorrowedOutstanding = borrowedIn.reduce((acc, l) => acc + parseFloat(l.outstanding_amount || 0), 0);

    return {
      academic_year_id: ayId,
      lent_out: {
        count: lentOut.length,
        total_outstanding: totalLentOutstanding,
        has_active_loans: totalLentOutstanding > 0,
        loans: lentOut
      },
      borrowed_in: {
        count: borrowedIn.length,
        total_outstanding: totalBorrowedOutstanding,
        has_active_loans: totalBorrowedOutstanding > 0,
        loans: borrowedIn
      }
    };
  }
}

module.exports = new FundBalanceEngine();
