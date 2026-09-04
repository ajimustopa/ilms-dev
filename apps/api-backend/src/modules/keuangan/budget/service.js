/**
 * Budget (RAPBS) Service for Keuangan Module
 * Covers Features #10, #11, #12
 */
const db = require('../../../config/db/keuangan');
const { logFinanceAudit } = require('../common/auditLogService');

const { getWorkPlanProgramById } = require('../common/crossModuleServices');

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

    const incomeItems = (await db('budget_plan_income_items')
      .leftJoin('fee_types', 'budget_plan_income_items.fee_type_id', 'fee_types.id')
      .where('budget_plan_income_items.budget_plan_id', id)
      .select(
        'budget_plan_income_items.*',
        'fee_types.name as fee_type_name',
        'fee_types.billing_pattern as fee_type_billing_pattern'
      )).map(item => {
      let monthlyDist = {};
      if (item.monthly_distribution) {
        try {
          monthlyDist = typeof item.monthly_distribution === 'string' ? JSON.parse(item.monthly_distribution) : item.monthly_distribution;
        } catch (e) { monthlyDist = {}; }
      }
      return {
        ...item,
        monthly_distribution: monthlyDist
      };
    });

    const rawExpenseItems = await db('budget_plan_expense_items')
      .leftJoin('budget_programs', 'budget_plan_expense_items.budget_program_id', 'budget_programs.id')
      .leftJoin('catalog_items', 'budget_plan_expense_items.catalog_item_id', 'catalog_items.id')
      .leftJoin('fee_types', 'budget_plan_expense_items.fund_source_fee_type_id', 'fee_types.id')
      .leftJoin('budget_plan_income_items', 'budget_plan_expense_items.fund_source_income_item_id', 'budget_plan_income_items.id')
      .where('budget_plan_expense_items.budget_plan_id', id)
      .select(
        'budget_plan_expense_items.*',
        'budget_programs.name as budget_program_name',
        'budget_programs.rks_reference_id',
        'catalog_items.name as catalog_item_name',
        'catalog_items.reference_price as catalog_reference_price',
        'fee_types.name as fund_source_fee_type_name',
        'budget_plan_income_items.name as fund_source_income_name'
      );

    // Hydrate program kerja RKT jika rks_reference_id ada & parse monthly_distribution & fund_sources
    const expenseItems = await Promise.all(
      rawExpenseItems.map(async (item) => {
        let rktProgramName = null;
        if (item.rks_reference_id) {
          const rktProg = await getWorkPlanProgramById(item.rks_reference_id);
          if (rktProg) {
            rktProgramName = rktProg.title || rktProg.name || `RKT #${item.rks_reference_id}`;
          }
        }
        let monthlyDist = {};
        if (item.monthly_distribution) {
          try {
            monthlyDist = typeof item.monthly_distribution === 'string' ? JSON.parse(item.monthly_distribution) : item.monthly_distribution;
          } catch (e) { monthlyDist = {}; }
        }

        let parsedFundSources = [];
        if (item.fund_sources) {
          try {
            parsedFundSources = typeof item.fund_sources === 'string' ? JSON.parse(item.fund_sources) : item.fund_sources;
          } catch (e) { parsedFundSources = []; }
        }
        if (!Array.isArray(parsedFundSources) || parsedFundSources.length === 0) {
          if (item.fund_source_income_item_id) {
            parsedFundSources = [{
              income_item_id: item.fund_source_income_item_id,
              name: item.fund_source_income_name || item.fund_source_fee_type_name || 'Sumber Pendapatan',
              amount: parseFloat(item.planned_amount || 0)
            }];
          } else if (item.fund_source_fee_type_id) {
            parsedFundSources = [{
              fee_type_id: item.fund_source_fee_type_id,
              name: item.fund_source_fee_type_name || 'Pos Sumber Dana',
              amount: parseFloat(item.planned_amount || 0)
            }];
          }
        }

        const fundSourceName = item.fund_source_income_name
          || (parsedFundSources.length > 1
            ? parsedFundSources.map(s => s.name).join(', ')
            : (parsedFundSources[0]?.name || item.fund_source_fee_type_name || 'Pos Sumber Dana'));

        return {
          ...item,
          fund_source_name: fundSourceName,
          fund_sources: parsedFundSources,
          rkt_program_name: rktProgramName,
          monthly_distribution: monthlyDist
        };
      })
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
      title: data.title || null,
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

  async updateBudgetPlanTitle(schoolUnitId, planId, title, userId = null) {
    const existing = await db('budget_plans').where({ id: planId, school_unit_id: schoolUnitId }).first();
    if (!existing) return null;

    await db('budget_plans')
      .where({ id: planId, school_unit_id: schoolUnitId })
      .update({
        title: title || null,
        updated_at: db.fn.now()
      });

    const updated = await this.getBudgetPlanById(schoolUnitId, planId);
    await logFinanceAudit({
      schoolUnitId,
      userId,
      action: 'UPDATE_BUDGET_PLAN_TITLE',
      entityType: 'budget_plan',
      entityId: planId,
      dataBefore: existing,
      dataAfter: updated
    });
    return updated;
  }

  async createNewVersionFromPublished(schoolUnitId, planId, revisionReason, userId = null, newTitle = null) {
    const existing = await this.getBudgetPlanById(schoolUnitId, planId);
    if (!existing) return null;

    const newVersion = existing.version + 1;

    const [newPlanId] = await db('budget_plans').insert({
      school_unit_id: schoolUnitId,
      academic_year_id: existing.academic_year_id,
      title: newTitle || existing.title || null,
      version: newVersion,
      status: 'draft',
      revision_reason: revisionReason
    });

    // Duplikasi income items
    if (existing.income_items && existing.income_items.length > 0) {
      const incomesToInsert = existing.income_items.map(item => ({
        budget_plan_id: newPlanId,
        fee_type_id: item.fee_type_id || null,
        name: item.name,
        planned_amount: item.planned_amount,
        max_cap_amount: item.max_cap_amount || item.planned_amount,
        monthly_distribution: item.monthly_distribution ? (typeof item.monthly_distribution === 'object' ? JSON.stringify(item.monthly_distribution) : item.monthly_distribution) : null
      }));
      await db('budget_plan_income_items').insert(incomesToInsert);
    }

    // Duplikasi expense items (termasuk kolom katalog & sumber dana & monthly distribution)
    if (existing.expense_items && existing.expense_items.length > 0) {
      const expensesToInsert = existing.expense_items.map(item => ({
        budget_plan_id: newPlanId,
        budget_program_id: item.budget_program_id,
        catalog_item_id: item.catalog_item_id || null,
        fund_source_fee_type_id: item.fund_source_fee_type_id || null,
        name: item.name,
        unit: item.unit || null,
        quantity: item.quantity || 1.00,
        unit_price: item.unit_price || item.planned_amount || 0.00,
        planned_amount: item.planned_amount,
        monthly_distribution: item.monthly_distribution ? (typeof item.monthly_distribution === 'object' ? JSON.stringify(item.monthly_distribution) : item.monthly_distribution) : null
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

    const now = db.fn.now();
    await db('budget_plans')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status: 'published',
        published_at: now,
        published_by: userId,
        approved_by: userId,
        approved_at: now
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
    if (!plan || plan.status !== 'draft') {
      const err = new Error('Hanya RAPBS berstatus draft yang dapat ditambahkan item pendapatan');
      err.statusCode = 422;
      throw err;
    }

    let monthlyDist = data.monthly_distribution || null;
    let plannedAmount = parseFloat(data.planned_amount || 0);

    if (monthlyDist) {
      const distObj = typeof monthlyDist === 'string' ? JSON.parse(monthlyDist) : monthlyDist;
      const sumMonths = Object.values(distObj || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
      if (sumMonths > 0) {
        plannedAmount = sumMonths;
      }
      monthlyDist = typeof monthlyDist === 'object' ? JSON.stringify(monthlyDist) : monthlyDist;
    }

    const maxCap = data.max_cap_amount !== undefined && data.max_cap_amount !== null ? parseFloat(data.max_cap_amount) : null;
    if (maxCap !== null && plannedAmount > maxCap) {
      const err = new Error(`Total alokasi bulanan (Rp ${plannedAmount.toLocaleString('id-ID')}) melebihi batas maksimal penetapan setahun (Rp ${maxCap.toLocaleString('id-ID')})`);
      err.statusCode = 422;
      throw err;
    }

    const [id] = await db('budget_plan_income_items').insert({
      budget_plan_id: planId,
      fee_type_id: data.fee_type_id || null,
      name: data.name,
      planned_amount: plannedAmount,
      max_cap_amount: maxCap,
      monthly_distribution: monthlyDist
    });
    return db('budget_plan_income_items').where({ id }).first();
  }

  async updateIncomeItem(schoolUnitId, planId, itemId, data, userId = null) {
    const plan = await db('budget_plans').where({ id: planId, school_unit_id: schoolUnitId }).first();
    if (!plan || plan.status !== 'draft') {
      const err = new Error('Hanya RAPBS berstatus draft yang dapat diubah item pendapatannya');
      err.statusCode = 422;
      throw err;
    }

    const before = await db('budget_plan_income_items').where({ id: itemId, budget_plan_id: planId }).first();
    if (!before) return null;

    let monthlyDist = data.monthly_distribution !== undefined ? data.monthly_distribution : before.monthly_distribution;
    let plannedAmount = parseFloat(data.planned_amount !== undefined ? data.planned_amount : before.planned_amount);

    if (data.monthly_distribution !== undefined) {
      const distObj = typeof data.monthly_distribution === 'string' ? JSON.parse(data.monthly_distribution) : data.monthly_distribution;
      const sumMonths = Object.values(distObj || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
      if (sumMonths > 0 || Object.keys(distObj || {}).length > 0) {
        plannedAmount = sumMonths;
      }
      monthlyDist = typeof data.monthly_distribution === 'object' ? JSON.stringify(data.monthly_distribution) : data.monthly_distribution;
    }

    const maxCap = data.max_cap_amount !== undefined ? (data.max_cap_amount ? parseFloat(data.max_cap_amount) : null) : (before.max_cap_amount ? parseFloat(before.max_cap_amount) : null);
    if (maxCap !== null && plannedAmount > maxCap) {
      const err = new Error(`Total alokasi bulanan (Rp ${plannedAmount.toLocaleString('id-ID')}) melebihi batas maksimal penetapan setahun (Rp ${maxCap.toLocaleString('id-ID')})`);
      err.statusCode = 422;
      throw err;
    }

    await db('budget_plan_income_items')
      .where({ id: itemId, budget_plan_id: planId })
      .update({
        name: data.name !== undefined ? data.name : before.name,
        fee_type_id: data.fee_type_id !== undefined ? data.fee_type_id : before.fee_type_id,
        planned_amount: plannedAmount,
        max_cap_amount: maxCap,
        monthly_distribution: monthlyDist,
        updated_at: db.fn.now()
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

  /**
   * Generate Rencana Penerimaan RAPBS otomatis dari Penetapan Biaya Siswa
   * Sesuai aturan: Pos bulanan (SPP / billing_pattern='monthly') dikali 12 bulan.
   */
  async generateIncomeFromFeeAssignments(schoolUnitId, planId, userId = null) {
    const plan = await db('budget_plans').where({ id: planId, school_unit_id: schoolUnitId }).first();
    if (!plan || plan.status !== 'draft') {
      const err = new Error('Hanya RAPBS berstatus draft yang dapat digenerate rencana penerimaannya');
      err.statusCode = 422;
      throw err;
    }

    const feeSchemesService = require('../schemes/service');
    const assignments = await feeSchemesService.listStudentAssignments(schoolUnitId, {
      academic_year_id: plan.academic_year_id
    });

    const feeTypes = await db('fee_types').select('*');

    // Akumulasi rencana penerimaan per pos biaya
    const incomeEstimates = {};
    feeTypes.forEach(ft => {
      incomeEstimates[ft.id] = {
        fee_type_id: ft.id,
        name: ft.name,
        billing_pattern: ft.billing_pattern,
        is_monthly: ft.billing_pattern === 'monthly' || ft.name.toLowerCase() === 'spp',
        total_nominal: 0,
        total_students: 0
      };
    });

    assignments.forEach(st => {
      const breakdown = st.assignment?.fee_breakdown || {};
      Object.keys(breakdown).forEach(ftId => {
        const item = breakdown[ftId];
        if (item && item.final_amount > 0 && incomeEstimates[ftId]) {
          const multiplier = incomeEstimates[ftId].is_monthly ? 12 : 1;
          incomeEstimates[ftId].total_nominal += (Number(item.final_amount) * multiplier);
          incomeEstimates[ftId].total_students += 1;
        }
      });
    });

    const generatedItems = Object.values(incomeEstimates)
      .filter(i => i.total_nominal > 0)
      .map(i => {
        // Buat default monthly distribution 12 bulan (m1 s.d. m12)
        const monthlyDist = {};
        if (i.is_monthly) {
          // Bagi rata per bulan
          const perMonth = Math.round(i.total_nominal / 12);
          for (let m = 1; m <= 12; m++) {
            monthlyDist[`m${m}`] = (m === 12) ? (i.total_nominal - (perMonth * 11)) : perMonth;
          }
        } else {
          // Pos non-bulanan: default dialokasikan di bulan 1 (Juli / awal tahun ajaran)
          for (let m = 1; m <= 12; m++) {
            monthlyDist[`m${m}`] = (m === 1) ? i.total_nominal : 0;
          }
        }

        return {
          budget_plan_id: planId,
          fee_type_id: i.fee_type_id,
          name: `${i.name} (${i.total_students} Santri${i.is_monthly ? ' × 12 Bln' : ''})`,
          planned_amount: i.total_nominal,
          max_cap_amount: i.total_nominal,
          monthly_distribution: JSON.stringify(monthlyDist)
        };
      });

    if (generatedItems.length === 0) {
      const err = new Error(`Belum ada data penetapan biaya santri pada Tahun Ajaran #${plan.academic_year_id}. Silakan lakukan penetapan biaya santri terlebih dahulu.`);
      err.statusCode = 422;
      throw err;
    }

    return db.transaction(async (trx) => {
      // Hapus item penerimaan lama pada draft ini
      await trx('budget_plan_income_items').where({ budget_plan_id: planId }).del();

      // Masukkan item penerimaan baru hasil kalkulasi penetapan biaya
      await trx('budget_plan_income_items').insert(generatedItems);

      const updated = await this.getBudgetPlanById(schoolUnitId, planId);

      await logFinanceAudit({
        schoolUnitId,
        userId,
        action: 'GENERATE_RAPBS_INCOME_FROM_FEES',
        entityType: 'budget_plan',
        entityId: planId,
        dataAfter: {
          total_items: generatedItems.length,
          items: generatedItems
        },
        trx
      });

      return updated;
    });
  }

  async addExpenseItem(schoolUnitId, planId, data, userId = null) {
    const plan = await db('budget_plans').where({ id: planId, school_unit_id: schoolUnitId }).first();
    if (!plan || plan.status !== 'draft') {
      const err = new Error('Hanya RAPBS berstatus draft yang dapat ditambahkan item belanja');
      err.statusCode = 422;
      throw err;
    }

    const entryMode = data.entry_mode === 'lump_sum' ? 'lump_sum' : 'itemized';
    let monthlyDist = data.monthly_distribution || null;
    let quantity = null;
    let unitPrice = null;
    let plannedAmount = 0;
    let catalogItemId = null;
    let unit = null;
    let lumpSumDesc = null;

    if (entryMode === 'lump_sum') {
      // 1. Mode Lump Sum per Kegiatan
      lumpSumDesc = data.lump_sum_description ? String(data.lump_sum_description).trim() : '';
      if (!lumpSumDesc) {
        const err = new Error('Uraian kegiatan / keperluan (lump_sum_description) wajib diisi untuk mode belanja Lump Sum');
        err.statusCode = 422;
        throw err;
      }

      if (monthlyDist) {
        const distObj = typeof monthlyDist === 'string' ? JSON.parse(monthlyDist) : monthlyDist;
        const sumMonths = Object.values(distObj || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
        plannedAmount = sumMonths > 0 ? sumMonths : parseFloat(data.planned_amount || 0);
        monthlyDist = typeof monthlyDist === 'object' ? JSON.stringify(monthlyDist) : monthlyDist;
      } else {
        plannedAmount = parseFloat(data.planned_amount || 0);
      }

      if (plannedAmount <= 0) {
        const err = new Error('Total pagu anggaran belanja lump sum harus lebih dari Rp 0');
        err.statusCode = 422;
        throw err;
      }
    } else {
      // 2. Mode Rincian Item Katalog (Itemized)
      quantity = parseFloat(data.quantity || 1);
      unitPrice = parseFloat(data.unit_price !== undefined ? data.unit_price : (data.planned_amount || 0));
      catalogItemId = data.catalog_item_id || null;
      unit = data.unit || 'Unit';

      if (monthlyDist) {
        const distObj = typeof monthlyDist === 'string' ? JSON.parse(monthlyDist) : monthlyDist;
        const sumQty = Object.values(distObj || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
        quantity = sumQty;
        monthlyDist = typeof monthlyDist === 'object' ? JSON.stringify(monthlyDist) : monthlyDist;
      }

      // Validasi plafon harga acuan jika catalog_item_id diisi
      if (catalogItemId) {
        const catalogItem = await db('catalog_items').where({ id: catalogItemId }).first();
        if (catalogItem) {
          const refPrice = parseFloat(catalogItem.reference_price);
          if (unitPrice > refPrice) {
            const err = new Error(
              `Harga satuan (Rp ${unitPrice.toLocaleString('id-ID')}) tidak boleh melebihi harga tertinggi katalog "${catalogItem.name}" (Rp ${refPrice.toLocaleString('id-ID')})`
            );
            err.statusCode = 422;
            throw err;
          }
        }
      }

      plannedAmount = quantity * unitPrice;
    }

    // Resolusi Pos Sumber Dana:
    // Mendukung multi-sumber dana (fund_sources array) khususnya untuk mode lump_sum,
    // serta referensi ke Sumber Pendapatan RAPBS (fund_source_income_item_id)
    let fundSources = data.fund_sources;
    let fundSourceIncomeItemId = data.fund_source_income_item_id || null;
    let fundSourceFeeTypeId = data.fund_source_fee_type_id || null;

    if (fundSources && typeof fundSources === 'string') {
      try { fundSources = JSON.parse(fundSources); } catch (e) { fundSources = []; }
    }

    if (Array.isArray(fundSources) && fundSources.length > 0) {
      if (entryMode === 'lump_sum') {
        const totalAllocated = fundSources.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);
        if (Math.abs(totalAllocated - plannedAmount) > 1) {
          const err = new Error(`Total alokasi sumber dana (Rp ${totalAllocated.toLocaleString('id-ID')}) harus sama dengan Total Pagu Anggaran Belanja (Rp ${plannedAmount.toLocaleString('id-ID')})`);
          err.statusCode = 422;
          throw err;
        }
      }
      fundSourceIncomeItemId = fundSources[0].income_item_id || null;
      if (fundSourceIncomeItemId && !fundSourceFeeTypeId) {
        const incItem = await db('budget_plan_income_items').where({ id: fundSourceIncomeItemId }).first();
        if (incItem?.fee_type_id) fundSourceFeeTypeId = incItem.fee_type_id;
      }
    } else if (fundSourceIncomeItemId) {
      const incItem = await db('budget_plan_income_items').where({ id: fundSourceIncomeItemId }).first();
      fundSources = [{
        income_item_id: incItem ? incItem.id : fundSourceIncomeItemId,
        name: incItem ? incItem.name : 'Sumber Pendapatan',
        amount: plannedAmount
      }];
      if (incItem?.fee_type_id) fundSourceFeeTypeId = incItem.fee_type_id;
    } else if (fundSourceFeeTypeId) {
      const ft = await db('fee_types').where({ id: fundSourceFeeTypeId }).first();
      fundSources = [{
        fee_type_id: fundSourceFeeTypeId,
        name: ft ? ft.name : 'Pos Sumber Dana',
        amount: plannedAmount
      }];
    } else {
      const err = new Error('Pos sumber dana wajib dipilih dari Rencana Sumber Pendapatan');
      err.statusCode = 422;
      throw err;
    }

    const [id] = await db('budget_plan_expense_items').insert({
      budget_plan_id: planId,
      budget_program_id: data.budget_program_id,
      catalog_item_id: catalogItemId,
      fund_source_fee_type_id: fundSourceFeeTypeId,
      fund_source_income_item_id: fundSourceIncomeItemId,
      entry_mode: entryMode,
      name: data.name,
      unit: unit,
      quantity: quantity,
      unit_price: unitPrice,
      planned_amount: plannedAmount,
      lump_sum_description: lumpSumDesc,
      fund_sources: typeof fundSources === 'object' ? JSON.stringify(fundSources) : fundSources,
      monthly_distribution: monthlyDist
    });
    return db('budget_plan_expense_items').where({ id }).first();
  }

  async updateExpenseItem(schoolUnitId, planId, itemId, data, userId = null) {
    const plan = await db('budget_plans').where({ id: planId, school_unit_id: schoolUnitId }).first();
    if (!plan || plan.status !== 'draft') {
      const err = new Error('Hanya RAPBS berstatus draft yang dapat diubah item belanjanya');
      err.statusCode = 422;
      throw err;
    }

    const before = await db('budget_plan_expense_items').where({ id: itemId, budget_plan_id: planId }).first();
    if (!before) return null;

    // Guard: Cek apakah baris belanja ini sudah memiliki realisasi pengeluaran
    const linkedExpenses = await db('expenses')
      .where({ budget_plan_expense_item_id: itemId })
      .whereNull('deleted_at');

    const newEntryMode = data.entry_mode !== undefined ? data.entry_mode : (before.entry_mode || 'itemized');
    if (linkedExpenses.length > 0 && newEntryMode !== before.entry_mode) {
      const err = new Error('Tidak bisa mengubah mode item yang sudah memiliki realisasi pengeluaran, buat baris baru sebagai gantinya');
      err.statusCode = 422;
      throw err;
    }

    let monthlyDist = data.monthly_distribution !== undefined ? data.monthly_distribution : before.monthly_distribution;
    let quantity = null;
    let unitPrice = null;
    let plannedAmount = 0;
    let catalogItemId = null;
    let unit = null;
    let lumpSumDesc = null;

    if (newEntryMode === 'lump_sum') {
      lumpSumDesc = data.lump_sum_description !== undefined
        ? String(data.lump_sum_description).trim()
        : (before.lump_sum_description || '');

      if (!lumpSumDesc) {
        const err = new Error('Uraian kegiatan / keperluan (lump_sum_description) wajib diisi untuk mode belanja Lump Sum');
        err.statusCode = 422;
        throw err;
      }

      if (data.monthly_distribution !== undefined) {
        const distObj = typeof data.monthly_distribution === 'string' ? JSON.parse(data.monthly_distribution) : data.monthly_distribution;
        const sumMonths = Object.values(distObj || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
        plannedAmount = sumMonths > 0 ? sumMonths : parseFloat(data.planned_amount !== undefined ? data.planned_amount : before.planned_amount);
        monthlyDist = typeof data.monthly_distribution === 'object' ? JSON.stringify(data.monthly_distribution) : data.monthly_distribution;
      } else {
        plannedAmount = parseFloat(data.planned_amount !== undefined ? data.planned_amount : before.planned_amount);
      }

      if (plannedAmount <= 0) {
        const err = new Error('Total pagu anggaran belanja lump sum harus lebih dari Rp 0');
        err.statusCode = 422;
        throw err;
      }
    } else {
      catalogItemId = data.catalog_item_id !== undefined ? data.catalog_item_id : before.catalog_item_id;
      quantity = parseFloat(data.quantity !== undefined ? data.quantity : before.quantity || 1);
      unitPrice = parseFloat(data.unit_price !== undefined ? data.unit_price : (data.planned_amount !== undefined ? data.planned_amount : before.unit_price));
      unit = data.unit !== undefined ? data.unit : (before.unit || 'Unit');

      if (data.monthly_distribution !== undefined) {
        const distObj = typeof data.monthly_distribution === 'string' ? JSON.parse(data.monthly_distribution) : data.monthly_distribution;
        const sumQty = Object.values(distObj || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
        quantity = sumQty;
        monthlyDist = typeof data.monthly_distribution === 'object' ? JSON.stringify(data.monthly_distribution) : data.monthly_distribution;
      }

      // Validasi plafon harga acuan jika catalogItemId ada
      if (catalogItemId) {
        const catalogItem = await db('catalog_items').where({ id: catalogItemId }).first();
        if (catalogItem) {
          const refPrice = parseFloat(catalogItem.reference_price);
          if (unitPrice > refPrice) {
            const err = new Error(
              `Harga satuan (Rp ${unitPrice.toLocaleString('id-ID')}) tidak boleh melebihi harga tertinggi katalog "${catalogItem.name}" (Rp ${refPrice.toLocaleString('id-ID')})`
            );
            err.statusCode = 422;
            throw err;
          }
        }
      }

      plannedAmount = quantity * unitPrice;
    }

    // Resolusi Pos Sumber Dana
    let fundSources = data.fund_sources !== undefined ? data.fund_sources : before.fund_sources;
    let fundSourceIncomeItemId = data.fund_source_income_item_id !== undefined ? data.fund_source_income_item_id : before.fund_source_income_item_id;
    let fundSourceFeeTypeId = data.fund_source_fee_type_id !== undefined ? data.fund_source_fee_type_id : before.fund_source_fee_type_id;

    if (fundSources && typeof fundSources === 'string') {
      try { fundSources = JSON.parse(fundSources); } catch (e) { fundSources = []; }
    }

    if (Array.isArray(fundSources) && fundSources.length > 0) {
      if (newEntryMode === 'lump_sum') {
        const totalAllocated = fundSources.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);
        if (Math.abs(totalAllocated - plannedAmount) > 1) {
          const err = new Error(`Total alokasi sumber dana (Rp ${totalAllocated.toLocaleString('id-ID')}) harus sama dengan Total Pagu Anggaran Belanja (Rp ${plannedAmount.toLocaleString('id-ID')})`);
          err.statusCode = 422;
          throw err;
        }
      }
      fundSourceIncomeItemId = fundSources[0].income_item_id || null;
      if (fundSourceIncomeItemId && !fundSourceFeeTypeId) {
        const incItem = await db('budget_plan_income_items').where({ id: fundSourceIncomeItemId }).first();
        if (incItem?.fee_type_id) fundSourceFeeTypeId = incItem.fee_type_id;
      }
    } else if (fundSourceIncomeItemId) {
      const incItem = await db('budget_plan_income_items').where({ id: fundSourceIncomeItemId }).first();
      fundSources = [{
        income_item_id: incItem ? incItem.id : fundSourceIncomeItemId,
        name: incItem ? incItem.name : 'Sumber Pendapatan',
        amount: plannedAmount
      }];
      if (incItem?.fee_type_id) fundSourceFeeTypeId = incItem.fee_type_id;
    }

    await db('budget_plan_expense_items')
      .where({ id: itemId, budget_plan_id: planId })
      .update({
        budget_program_id: data.budget_program_id !== undefined ? data.budget_program_id : before.budget_program_id,
        catalog_item_id: catalogItemId || null,
        fund_source_fee_type_id: fundSourceFeeTypeId || null,
        fund_source_income_item_id: fundSourceIncomeItemId || null,
        entry_mode: newEntryMode,
        name: data.name !== undefined ? data.name : before.name,
        unit: unit,
        quantity: quantity,
        unit_price: unitPrice,
        planned_amount: plannedAmount,
        lump_sum_description: lumpSumDesc,
        fund_sources: typeof fundSources === 'object' ? JSON.stringify(fundSources) : fundSources,
        monthly_distribution: monthlyDist,
        updated_at: db.fn.now()
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
        'budget_plan_expense_items.entry_mode',
        'budget_plan_expense_items.lump_sum_description',
        'budget_plan_expense_items.planned_amount'
      )
      .select(
        'budget_programs.id as budget_program_id',
        'budget_programs.name as program_name',
        'budget_plan_expense_items.id as expense_item_id',
        'budget_plan_expense_items.name as item_name',
        'budget_plan_expense_items.entry_mode',
        'budget_plan_expense_items.lump_sum_description',
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
        entry_mode: it.entry_mode || 'itemized',
        lump_sum_description: it.lump_sum_description || null,
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
