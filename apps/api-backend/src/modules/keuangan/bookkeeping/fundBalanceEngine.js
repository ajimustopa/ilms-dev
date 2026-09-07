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
   * Get single fund balance for specific academic year with prior carry-over support
   */
  async getFundBalance(schoolUnitId, fundType, fundRefId = 0, academicYearId = null, trx = null, includeCarryOver = true) {
    const normalizedRefId = fundType === 'opening_pool' ? 0 : Number(fundRefId || 0);
    const dbClient = trx || db;

    if (!academicYearId) {
      // If no AY specified, return total lifetime balance
      const row = await dbClient('fund_balances')
        .where({
          school_unit_id: schoolUnitId,
          fund_type: fundType,
          fund_ref_id: normalizedRefId
        })
        .sum('balance as total_balance')
        .first();
      return parseFloat(row?.total_balance || 0);
    }

    const targetAyId = Number(academicYearId);
    if (!includeCarryOver) {
      const row = await dbClient('fund_balances')
        .where({
          school_unit_id: schoolUnitId,
          fund_type: fundType,
          fund_ref_id: normalizedRefId,
          academic_year_id: targetAyId
        })
        .first();
      return parseFloat(row?.balance || 0);
    }

    // Include prior carry-over: query chronological AYs
    const dbAkademik = require('../../../config/db/akademik');
    const ays = await dbAkademik('academic_years')
      .where(b => b.where('satuan_pendidikan_id', schoolUnitId).orWhere('satuan_pendidikan_id', 0))
      .orderBy('start_date', 'asc');

    const targetAy = ays.find(a => a.id === targetAyId);
    let priorAyIds = [];
    if (targetAy) {
      priorAyIds = ays
        .filter(a => new Date(a.start_date) < new Date(targetAy.start_date))
        .map(a => a.id);
    }

    const mutations = await dbClient('fund_balance_mutations')
      .join('fund_balances', 'fund_balance_mutations.fund_balance_id', 'fund_balances.id')
      .where({
        'fund_balances.school_unit_id': schoolUnitId,
        'fund_balances.fund_type': fundType,
        'fund_balances.fund_ref_id': normalizedRefId
      })
      .whereIn('fund_balance_mutations.academic_year_id', [...priorAyIds, targetAyId])
      .select(
        'fund_balance_mutations.academic_year_id',
        'fund_balance_mutations.direction',
        'fund_balance_mutations.amount'
      );

    let balance = 0;
    mutations.forEach(m => {
      const amt = parseFloat(m.amount || 0);
      if (m.direction === 'in') balance += amt;
      else balance -= amt;
    });

    return balance;
  }

  /**
   * Helper to fetch chronological academic years
   */
  async getChronologicalAcademicYears(schoolUnitId) {
    const dbAkademik = require('../../../config/db/akademik');
    let query = dbAkademik('academic_years');
    if (schoolUnitId && schoolUnitId !== 'all' && schoolUnitId !== 'foundation') {
      query = query.where(b => b.where('satuan_pendidikan_id', Number(schoolUnitId)).orWhere('satuan_pendidikan_id', 0));
    }
    const ays = await query.orderBy('start_date', 'asc');
    return ays;
  }

  /**
   * List all fund balances (Pos Alokasi Sumber Dana) with enriched RAPBS names,
   * Prior Year Carry-Over Balances (Saldo Bawaan Tahun Sebelumnya), Current Year In/Out/Net, and Total Usable Balance.
   */
  async listFundBalances(schoolUnitId, academicYearId = null) {
    const isAllUnits = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    const unitId = isAllUnits ? 1 : Number(schoolUnitId);

    // 1. Ambil daftar tahun ajaran kronologis
    const ays = await this.getChronologicalAcademicYears(unitId);
    let targetAy = null;
    if (academicYearId) {
      targetAy = ays.find(a => a.id === Number(academicYearId)) || null;
    }
    if (!targetAy && ays.length > 0) {
      // Default to active academic year or last one
      targetAy = ays.find(a => a.is_active === 1) || ays[ays.length - 1];
    }

    const targetAyId = targetAy ? targetAy.id : null;
    const priorAys = targetAy
      ? ays.filter(a => new Date(a.start_date) < new Date(targetAy.start_date))
      : [];
    const priorAyIds = priorAys.map(a => a.id);

    // 2. Ambil master Fee Types (Pos Tagihan Siswa)
    let ftQuery = db('fee_types');
    if (!isAllUnits) {
      ftQuery = ftQuery.where(b => b.where('school_unit_id', unitId).orWhere('school_unit_id', 0));
    }
    const feeTypes = await ftQuery.where('is_active', 1).orderBy('id', 'asc');

    // 3. Ambil master RAPBS Income Items untuk tahun ajaran terpilih
    let rapbsQuery = db('budget_plan_income_items')
      .join('budget_plans', 'budget_plan_income_items.budget_plan_id', 'budget_plans.id');
    if (!isAllUnits) {
      rapbsQuery = rapbsQuery.where(b => b.where('budget_plans.school_unit_id', unitId).orWhere('budget_plans.school_unit_id', 0));
    }
    if (targetAyId) {
      rapbsQuery = rapbsQuery.where('budget_plans.academic_year_id', targetAyId);
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

    // 4. Ambil seluruh mutasi dana
    let mutQuery = db('fund_balance_mutations')
      .join('fund_balances', 'fund_balance_mutations.fund_balance_id', 'fund_balances.id');
    if (!isAllUnits) {
      mutQuery = mutQuery.where('fund_balances.school_unit_id', unitId);
    }
    const allMutations = await mutQuery.select(
      'fund_balances.id as fund_balance_id',
      'fund_balances.fund_type',
      'fund_balances.fund_ref_id',
      'fund_balances.academic_year_id as fund_ay_id',
      'fund_balance_mutations.academic_year_id as mutation_ay_id',
      'fund_balance_mutations.direction',
      'fund_balance_mutations.amount',
      'fund_balance_mutations.created_at'
    );

    // 5. Build Aggregation Per Fund Key
    const aggMap = {};
    const getOrInitAgg = (fundType, fundRefId) => {
      const key = `${fundType}_${fundRefId}`;
      if (!aggMap[key]) {
        aggMap[key] = {
          fund_type: fundType,
          fund_ref_id: fundRefId,
          prior_in: 0,
          prior_out: 0,
          current_in: 0,
          current_out: 0,
          by_academic_year: {} // map of ayId -> { in, out }
        };
      }
      return aggMap[key];
    };

    allMutations.forEach(m => {
      const itemAgg = getOrInitAgg(m.fund_type, m.fund_ref_id);
      const mutAyId = m.mutation_ay_id || m.fund_ay_id;
      const amt = parseFloat(m.amount || 0);

      if (!itemAgg.by_academic_year[mutAyId]) {
        itemAgg.by_academic_year[mutAyId] = { in: 0, out: 0 };
      }

      if (m.direction === 'in') {
        itemAgg.by_academic_year[mutAyId].in += amt;
        if (priorAyIds.includes(mutAyId)) itemAgg.prior_in += amt;
        else if (mutAyId === targetAyId) itemAgg.current_in += amt;
      } else {
        itemAgg.by_academic_year[mutAyId].out += amt;
        if (priorAyIds.includes(mutAyId)) itemAgg.prior_out += amt;
        else if (mutAyId === targetAyId) itemAgg.current_out += amt;
      }
    });

    // 6. Ambil fund_balances records untuk mendapatkan ID fund_balance jika ada
    let fbQuery = db('fund_balances');
    if (!isAllUnits) {
      fbQuery = fbQuery.where('school_unit_id', unitId);
    }
    const existingFbRecords = await fbQuery;
    const fbRecordMap = {};
    existingFbRecords.forEach(fb => {
      fbRecordMap[`${fb.fund_type}_${fb.fund_ref_id}_${fb.academic_year_id}`] = fb;
      if (!fbRecordMap[`${fb.fund_type}_${fb.fund_ref_id}`]) {
        fbRecordMap[`${fb.fund_type}_${fb.fund_ref_id}`] = fb;
      }
    });

    const results = [];
    const matchedKeys = new Set();

    // Helper to generate trajectory per fund
    const buildTrajectory = (fundAgg) => {
      let runningBalance = 0;
      return ays.map(ay => {
        const ayData = fundAgg?.by_academic_year[ay.id] || { in: 0, out: 0 };
        const net = ayData.in - ayData.out;
        runningBalance += net;
        return {
          academic_year_id: ay.id,
          academic_year_name: ay.name,
          total_in: ayData.in,
          total_out: ayData.out,
          net_change: net,
          cumulative_balance: runningBalance,
          is_current: ay.id === targetAyId,
          is_prior: priorAyIds.includes(ay.id)
        };
      });
    };

    // --- A. Saldo Awal Kas / Opening Pool ---
    const opAgg = getOrInitAgg('opening_pool', 0);
    const opPriorCarry = opAgg.prior_in - opAgg.prior_out;
    const opCurNet = opAgg.current_in - opAgg.current_out;
    const opTotalBalance = opPriorCarry + opCurNet;
    const opFb = fbRecordMap[`opening_pool_0_${targetAyId}`] || fbRecordMap['opening_pool_0'];
    matchedKeys.add('opening_pool_0');

    results.push({
      id: opFb?.id || null,
      fund_type: 'opening_pool',
      fund_ref_id: 0,
      budget_plan_income_item_id: null,
      academic_year_id: targetAyId,
      name: 'Saldo Awal Kas (Opening Pool)',
      code: 'OPENING_POOL',
      category: 'Saldo Awal & Kas Utama',
      description: 'Pool dana saldo awal kas pra-pencatatan sistem yang dapat digunakan untuk belanja sampai habis',
      planned_amount: 0,
      prior_years_carry_over: opPriorCarry,
      prior_years_in: opAgg.prior_in,
      prior_years_out: opAgg.prior_out,
      current_year_in: opAgg.current_in,
      current_year_out: opAgg.current_out,
      current_year_net: opCurNet,
      balance: opTotalBalance,
      total_in: opAgg.current_in,
      total_out: opAgg.current_out,
      realization_percentage: 100,
      trajectory: buildTrajectory(opAgg)
    });

    // --- B. Pos Alokasi Tagihan Biaya (Fee Types / Pos Penerimaan Siswa) ---
    feeTypes.forEach(ft => {
      const key = `fee_type_${ft.id}`;
      matchedKeys.add(key);
      const ftAgg = getOrInitAgg('fee_type', ft.id);
      const priorCarry = ftAgg.prior_in - ftAgg.prior_out;
      const curNet = ftAgg.current_in - ftAgg.current_out;
      const totalBal = priorCarry + curNet;

      // Check if there is an associated RAPBS item
      const linkedRapbs = rapbsIncomeItems.find(r => Number(r.fee_type_id) === Number(ft.id));
      const planned = parseFloat(linkedRapbs?.planned_amount || 0);
      const percent = planned > 0 ? Math.round((ftAgg.current_in / planned) * 10000) / 100 : 0;
      const fb = fbRecordMap[`fee_type_${ft.id}_${targetAyId}`] || fbRecordMap[key];

      results.push({
        id: fb?.id || null,
        fund_type: 'fee_type',
        fund_ref_id: ft.id,
        budget_plan_income_item_id: linkedRapbs?.id || null,
        academic_year_id: targetAyId,
        name: `Dana ${ft.name}`,
        code: ft.code || `FEE-${ft.id}`,
        category: 'Penerimaan Tagihan Siswa',
        description: `Pos alokasi penerimaan pembayaran ${ft.name}`,
        planned_amount: planned,
        prior_years_carry_over: priorCarry,
        prior_years_in: ftAgg.prior_in,
        prior_years_out: ftAgg.prior_out,
        current_year_in: ftAgg.current_in,
        current_year_out: ftAgg.current_out,
        current_year_net: curNet,
        balance: totalBal,
        total_in: ftAgg.current_in,
        total_out: ftAgg.current_out,
        realization_percentage: percent,
        billing_pattern: ft.billing_pattern,
        trajectory: buildTrajectory(ftAgg)
      });
    });

    // --- C. Pos Pendapatan RAPBS Non-Tagihan Siswa (budget_plan_income_items) ---
    rapbsIncomeItems.forEach(item => {
      if (item.fee_type_id) return; // already handled in Fee Types
      const key = `budget_income_item_${item.id}`;
      matchedKeys.add(key);
      const bpiiAgg = getOrInitAgg('budget_income_item', item.id);
      const priorCarry = bpiiAgg.prior_in - bpiiAgg.prior_out;
      const curNet = bpiiAgg.current_in - bpiiAgg.current_out;
      const totalBal = priorCarry + curNet;

      const planned = parseFloat(item.planned_amount || 0);
      const percent = planned > 0 ? Math.round((bpiiAgg.current_in / planned) * 10000) / 100 : 0;
      const fb = fbRecordMap[`budget_income_item_${item.id}_${targetAyId}`] || fbRecordMap[key];

      results.push({
        id: fb?.id || null,
        fund_type: 'budget_income_item',
        fund_ref_id: item.id,
        budget_plan_income_item_id: item.id,
        academic_year_id: targetAyId,
        name: `Dana ${item.name}`,
        code: `RAPBS-INC-${item.id}`,
        category: 'Sumber Pendapatan Lain (RAPBS)',
        description: `Pos alokasi pendapatan anggaran: ${item.name}`,
        planned_amount: planned,
        prior_years_carry_over: priorCarry,
        prior_years_in: bpiiAgg.prior_in,
        prior_years_out: bpiiAgg.prior_out,
        current_year_in: bpiiAgg.current_in,
        current_year_out: bpiiAgg.current_out,
        current_year_net: curNet,
        balance: totalBal,
        total_in: bpiiAgg.current_in,
        total_out: bpiiAgg.current_out,
        realization_percentage: percent,
        trajectory: buildTrajectory(bpiiAgg)
      });
    });

    // --- D. Pos Historis Lainnya yang Memiliki Mutasi / Saldo ---
    Object.keys(aggMap).forEach(key => {
      if (matchedKeys.has(key)) return;
      const agg = aggMap[key];
      const priorCarry = agg.prior_in - agg.prior_out;
      const curNet = agg.current_in - agg.current_out;
      const totalBal = priorCarry + curNet;

      if (priorCarry === 0 && curNet === 0 && totalBal === 0 && agg.current_in === 0 && agg.current_out === 0) return;

      const fb = fbRecordMap[`${agg.fund_type}_${agg.fund_ref_id}_${targetAyId}`] || fbRecordMap[key];

      results.push({
        id: fb?.id || null,
        fund_type: agg.fund_type,
        fund_ref_id: agg.fund_ref_id,
        budget_plan_income_item_id: null,
        academic_year_id: targetAyId,
        name: `Pos Dana: ${agg.fund_type} #${agg.fund_ref_id}`,
        code: `POS-${agg.fund_type}-${agg.fund_ref_id}`,
        category: 'Pos Dana Tambahan',
        description: `Pos sumber dana dengan riwayat mutasi keuangan`,
        planned_amount: 0,
        prior_years_carry_over: priorCarry,
        prior_years_in: agg.prior_in,
        prior_years_out: agg.prior_out,
        current_year_in: agg.current_in,
        current_year_out: agg.current_out,
        current_year_net: curNet,
        balance: totalBal,
        total_in: agg.current_in,
        total_out: agg.current_out,
        realization_percentage: 100,
        trajectory: buildTrajectory(agg)
      });
    });

    // Ringkasan
    const totalPlannedAll = results.reduce((acc, r) => acc + (r.planned_amount || 0), 0);
    const totalPriorCarryAll = results.reduce((acc, r) => acc + (r.prior_years_carry_over || 0), 0);
    const totalCurrentInAll = results.reduce((acc, r) => acc + (r.current_year_in || 0), 0);
    const totalCurrentOutAll = results.reduce((acc, r) => acc + (r.current_year_out || 0), 0);
    const totalBalanceAll = results.reduce((acc, r) => acc + (r.balance || 0), 0);

    return {
      academic_year_id: targetAyId,
      academic_year_name: targetAy?.name || null,
      prior_academic_years: priorAys.map(a => ({ id: a.id, name: a.name })),
      summary: {
        total_planned_budget: totalPlannedAll,
        total_prior_carry_over: totalPriorCarryAll,
        total_current_year_in: totalCurrentInAll,
        total_current_year_out: totalCurrentOutAll,
        total_current_year_net: totalCurrentInAll - totalCurrentOutAll,
        total_fund_in: totalCurrentInAll,
        total_fund_out: totalCurrentOutAll,
        total_fund_balance: totalBalanceAll,
        opening_pool_balance: opTotalBalance,
        fund_count: results.length
      },
      funds: results
    };
  }

  /**
   * Get Available Fund Source Choices for Expense Forms & Transaction dropdowns.
   * Grouped into:
   * - Tahun Berjalan (Current Year Fund Pockets)
   * - Saldo Bawaan Tahun Lalu (Prior Year Carry-Over Pockets)
   * - Saldo Awal Kas / Opening Pool
   */
  async getAvailableFundSources(schoolUnitId, academicYearId = null) {
    const listData = await this.listFundBalances(schoolUnitId, academicYearId);
    const ayName = listData.academic_year_name || 'T.A. Berjalan';
    const priorAyNames = listData.prior_academic_years?.map(a => a.name).join(', ') || 'T.A. Sebelumnya';

    const currentYearOptions = [];
    const priorYearOptions = [];
    const openingPoolOptions = [];

    listData.funds.forEach(f => {
      if (f.fund_type === 'opening_pool') {
        openingPoolOptions.push({
          key: 'opening_pool_0_current',
          fund_type: 'opening_pool',
          fund_ref_id: 0,
          scope: 'current',
          name: f.name,
          label: `${f.name} — Saldo: Rp ${f.balance.toLocaleString('id-ID')}`,
          balance: f.balance,
          is_available: f.balance > 0
        });
        return;
      }

      // Current Year Option
      currentYearOptions.push({
        key: `${f.fund_type}_${f.fund_ref_id}_current`,
        fund_type: f.fund_type,
        fund_ref_id: f.fund_ref_id,
        scope: 'current',
        target_academic_year_id: listData.academic_year_id,
        name: f.name,
        category: f.category,
        label: `${f.name} (${ayName}) — Saldo Berjalan: Rp ${f.current_year_net.toLocaleString('id-ID')} (Total: Rp ${f.balance.toLocaleString('id-ID')})`,
        current_net: f.current_year_net,
        balance: f.balance,
        is_available: f.balance > 0
      });

      // Prior Year Carry-Over Option (if has carry-over or lifetime available)
      if (f.prior_years_carry_over > 0 || (f.balance > 0 && f.prior_years_in > 0)) {
        priorYearOptions.push({
          key: `${f.fund_type}_${f.fund_ref_id}_prior`,
          fund_type: f.fund_type,
          fund_ref_id: f.fund_ref_id,
          scope: 'prior',
          target_academic_year_id: listData.prior_academic_years?.[listData.prior_academic_years.length - 1]?.id || null,
          name: `${f.name} (Saldo Bawaan Lalu)`,
          category: 'Saldo Bawaan Tahun Sebelumnya',
          label: `${f.name} (Saldo Bawaan ${priorAyNames}) — Tersedia: Rp ${f.prior_years_carry_over.toLocaleString('id-ID')}`,
          balance: f.prior_years_carry_over,
          is_available: f.prior_years_carry_over > 0
        });
      }
    });

    return {
      academic_year_id: listData.academic_year_id,
      academic_year_name: ayName,
      groups: [
        {
          group_title: `Pos Alokasi Dana (Tahun Berjalan ${ayName})`,
          options: currentYearOptions
        },
        {
          group_title: `Saldo Bawaan Tahun Sebelumnya (${priorAyNames})`,
          options: priorYearOptions
        },
        {
          group_title: `Kas Utama & Saldo Awal`,
          options: openingPoolOptions
        }
      ],
      all_funds: listData.funds
    };
  }

  /**
   * Get Multi-Year Trajectory Matrix for All Funds
   */
  async getMultiYearTrajectory(schoolUnitId) {
    const listData = await this.listFundBalances(schoolUnitId, null);
    const ays = await this.getChronologicalAcademicYears(schoolUnitId);

    return {
      academic_years: ays.map(a => ({ id: a.id, name: a.name, start_date: a.start_date, is_active: a.is_active })),
      funds: listData.funds.map(f => ({
        fund_type: f.fund_type,
        fund_ref_id: f.fund_ref_id,
        name: f.name,
        code: f.code,
        category: f.category,
        total_balance: f.balance,
        trajectory: f.trajectory
      }))
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
    const isAll = !schoolUnitId || schoolUnitId === 'all' || schoolUnitId === 'foundation';
    let query = db('inter_year_fund_loans as iyfl')
      .leftJoin('fee_types as ft_from', 'iyfl.fund_ref_id', 'ft_from.id')
      .leftJoin('fee_types as ft_to', 'iyfl.to_fund_ref_id', 'ft_to.id');

    if (!isAll) {
      query = query.where('iyfl.school_unit_id', Number(schoolUnitId));
    }

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
    let summaryQuery = db('inter_year_fund_loans');
    if (!isAll) {
      summaryQuery = summaryQuery.where('school_unit_id', Number(schoolUnitId));
    }
    const allLoans = await summaryQuery;
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
