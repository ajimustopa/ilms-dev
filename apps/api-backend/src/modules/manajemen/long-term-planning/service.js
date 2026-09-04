/**
 * Long Term Planning Service Implementation
 * Modul Manajemen - Fitur RKJP (8 Tahun) & RKJM (4 Tahun) Berbagi Target Tahunan
 */
const db = require('../../../config/db/manajemen');

class LongTermPlanningService {
  /**
   * Helper: Generate daftar string tahun ajaran dari rentang tahun
   * Misal: 2026 s/d 2033 -> ["2026/2027", "2027/2028", ..., "2033/2034"]
   */
  generateAcademicYears(startYear, endYear) {
    const years = [];
    for (let y = Number(startYear); y <= Number(endYear); y++) {
      years.push(`${y}/${y + 1}`);
    }
    return years;
  }

  /**
   * Helper: Konversi angka ke Angka Romawi (1 -> I, 2 -> II, 3 -> III, dst.)
   */
  toRoman(num) {
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
    return roman[num - 1] || `${num}`;
  }

  /**
   * POST /long-term-work-plans
   * Membuat RKJP dengan durasi tahun fleksibel (ditetapkan user) dan OTOMATIS membuat RKJM turunan per 4 tahun dalam 1 transaksi
   */
  async createRkjpWithRkjm(payload, user = null) {
    const { school_unit_id, start_year, end_year, duration_years, title } = payload;
    if (!start_year) {
      const error = new Error("Tahun awal (start_year) wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    const unitId = school_unit_id ? Number(school_unit_id) : null;
    const sYear = Number(start_year);
    let eYear = sYear + 7; // Default 8 tahun jika tidak ditentukan
    if (end_year) {
      eYear = Number(end_year);
    } else if (duration_years) {
      eYear = sYear + Number(duration_years) - 1;
    }

    if (eYear < sYear) {
      const error = new Error("Tahun akhir tidak boleh lebih kecil dari tahun awal");
      error.statusCode = 422;
      throw error;
    }

    return db.transaction(async (trx) => {
      // 1. Insert RKJP
      const defaultTitle = unitId ? `RKJP Satuan Pendidikan ${sYear}-${eYear}` : `RKJP Gabungan Yayasan ${sYear}-${eYear}`;
      const rkjpTitle = title || defaultTitle;
      const [rkjpId] = await trx('long_term_work_plans').insert({
        school_unit_id: unitId,
        plan_type: 'rkjp',
        parent_rkjp_id: null,
        title: rkjpTitle,
        start_year: sYear,
        end_year: eYear,
        sequence_order: null,
        current_version: 1,
        status: 'draft',
        created_by: user?.id || null,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });

      // 2. Dynamically Insert RKJM children (chunk per 4 tahun)
      let currentSeq = 1;
      for (let y = sYear; y <= eYear; y += 4) {
        const rkjmStart = y;
        const rkjmEnd = Math.min(y + 3, eYear);
        const yearOffsetStart = rkjmStart - sYear + 1;
        const yearOffsetEnd = rkjmEnd - sYear + 1;
        const yearLabel = yearOffsetStart === yearOffsetEnd
          ? `Tahun ${yearOffsetStart}`
          : `Tahun ${yearOffsetStart}-${yearOffsetEnd}`;

        await trx('long_term_work_plans').insert({
          school_unit_id: unitId,
          plan_type: 'rkjm',
          parent_rkjp_id: rkjpId,
          title: `RKJM ${this.toRoman(currentSeq)} (${yearLabel}) Periode ${rkjmStart}-${rkjmEnd}`,
          start_year: rkjmStart,
          end_year: rkjmEnd,
          sequence_order: currentSeq,
          current_version: 1,
          status: 'draft',
          created_by: user?.id || null,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });
        currentSeq++;
      }

      const rkjp = await trx('long_term_work_plans').where({ id: rkjpId }).first();
      const rkjms = await trx('long_term_work_plans').where({ parent_rkjp_id: rkjpId }).orderBy('sequence_order', 'asc');

      return {
        ...rkjp,
        rkjm_list: rkjms,
      };
    });
  }

  /**
   * GET /long-term-work-plans
   * Daftar RKJP dan RKJM berdasarkan school_unit_id dan filter plan_type
   */
  async listPlans(query = {}) {
    let q = db('long_term_work_plans');
    if (query.school_unit_id !== undefined && query.school_unit_id !== '' && query.school_unit_id !== 'null') {
      q = q.where('school_unit_id', Number(query.school_unit_id));
    } else if (query.school_unit_id === 'null' || query.context === 'foundation') {
      q = q.whereNull('school_unit_id');
    }
    if (query.plan_type) {
      q = q.where('plan_type', query.plan_type);
    }
    if (query.parent_rkjp_id) {
      q = q.where('parent_rkjp_id', Number(query.parent_rkjp_id));
    }

    const plans = await q.orderBy('start_year', 'desc').orderBy('sequence_order', 'asc');
    return plans;
  }

  async getPlanById(id) {
    const plan = await db('long_term_work_plans').where({ id }).first();
    if (!plan) {
      const error = new Error('Dokumen perencanaan kerja jangka panjang tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    let rkjmList = [];
    if (plan.plan_type === 'rkjp') {
      rkjmList = await db('long_term_work_plans')
        .where({ parent_rkjp_id: plan.id })
        .orderBy('sequence_order', 'asc');
    }

    return {
      ...plan,
      rkjm_list: rkjmList,
    };
  }

  /**
   * GET /long-term-work-plans/:id/targets
   * Mengambil matriks target tahunan per program dalam rentang tahun dokumen
   */
  async getPlanTargets(planId) {
    const plan = await this.getPlanById(planId);
    const academicYears = this.generateAcademicYears(plan.start_year, plan.end_year);

    // Cari dokumen RIPS yang sesuai dengan konteks plan (Yayasan jika school_unit_id null, atau per Satuan)
    let ripsDocQuery = db('rips_documents');
    if (plan.school_unit_id) {
      ripsDocQuery = ripsDocQuery.where('school_unit_id', Number(plan.school_unit_id));
    } else {
      ripsDocQuery = ripsDocQuery.whereNull('school_unit_id');
    }
    const matchingRipsDoc = await ripsDocQuery.first();

    // Ambil program aktif RIPS yang sesuai dokumen RIPS ini (hindari duplikasi lintas dokumen satuan/yayasan)
    let programQuery = db('rips_programs as p')
      .leftJoin('rips_program_categories as c', 'p.category_id', 'c.id')
      .leftJoin('rips_domains as direct_domain', 'p.domain_id', 'direct_domain.id')
      .leftJoin('rips_subdomains as direct_subdomain', 'p.subdomain_id', 'direct_subdomain.id')
      .select(
        'p.*',
        'direct_domain.name as direct_domain_name',
        'direct_subdomain.name as direct_subdomain_name',
        'c.name as category_name',
        'c.color as category_color',
        'c.bg_color as category_bg_color',
        'c.border_color as category_border_color'
      )
      .whereIn('p.status', ['active', 'draft']);

    if (matchingRipsDoc) {
      programQuery = programQuery.where('p.rips_document_id', matchingRipsDoc.id);
    } else if (plan.school_unit_id) {
      // Fallback jika belum ada RIPS satuan khusus, gunakan RIPS induk yayasan (rips_document_id = 1)
      const foundationDoc = await db('rips_documents').whereNull('school_unit_id').first();
      if (foundationDoc) {
        programQuery = programQuery.where('p.rips_document_id', foundationDoc.id);
      }
    }

    const programs = await programQuery
      .orderBy('p.order_index', 'asc')
      .orderBy('p.id', 'asc');

    const programIds = programs.map((p) => p.id);

    // Ambil link ke sasaran strategis RIPS
    let goalLinks = [];
    if (programIds.length > 0) {
      goalLinks = await db('rips_program_goal_links as pgl')
        .join('rips_goals as g', 'pgl.rips_goal_id', 'g.id')
        .leftJoin('rips_domains as d', 'g.domain_id', 'd.id')
        .leftJoin('rips_subdomains as sub', 'g.subdomain_id', 'sub.id')
        .select(
          'pgl.rips_program_id',
          'g.id as goal_id',
          'g.code as goal_code',
          'g.title as goal_title',
          'g.domain_id',
          'd.name as domain_name',
          'g.subdomain_id',
          'sub.name as subdomain_name'
        )
        .whereIn('pgl.rips_program_id', programIds);
    }

    // Ambil target yang sudah tersimpan pada tahun-tahun bersangkutan untuk school_unit ini (atau Yayasan jika null)
    let savedTargets = [];
    if (programIds.length > 0) {
      let targetQuery = db('annual_program_targets')
        .whereIn('rips_program_id', programIds)
        .whereIn('academic_year', academicYears);

      if (plan.school_unit_id) {
        targetQuery = targetQuery.where('school_unit_id', Number(plan.school_unit_id));
      } else {
        targetQuery = targetQuery.whereNull('school_unit_id');
      }

      savedTargets = await targetQuery;
    }

    // Ambil seluruh master domain & subdomain untuk struktur pohon lengkap
    const domains = await db('rips_domains').orderBy('order_index', 'asc');
    const subdomains = await db('rips_subdomains').orderBy('order_index', 'asc');

    // Ambil sasaran strategis RIPS yang sesuai dokumen RIPS ini
    const bscAspects = await db('bsc_aspects').orderBy('order_index', 'asc');
    let goalsQuery = db('rips_goals as g')
      .leftJoin('bsc_aspects as b', 'g.bsc_aspect_id', 'b.id')
      .select('g.*', 'b.name as bsc_aspect_name')
      .whereIn('g.status', ['active', 'draft']);

    if (matchingRipsDoc) {
      goalsQuery = goalsQuery.where('g.rips_document_id', matchingRipsDoc.id);
    } else {
      const foundationDoc = await db('rips_documents').whereNull('school_unit_id').first();
      if (foundationDoc) {
        goalsQuery = goalsQuery.where('g.rips_document_id', foundationDoc.id);
      }
    }

    const goals = await goalsQuery
      .orderBy('g.order_index', 'asc')
      .orderBy('g.id', 'asc');

    const goalIds = goals.map((g) => g.id);
    let goalIndicators = [];
    if (goalIds.length > 0) {
      goalIndicators = await db('rips_goal_indicators')
        .whereIn('rips_goal_id', goalIds)
        .orderBy('order_index', 'asc')
        .orderBy('id', 'asc');
    }

    // Ambil target trajectory sasaran strategis yang tersimpan
    let savedGoalTrajectories = [];
    if (goalIds.length > 0) {
      let goalTrajectoryQuery = db('annual_goal_target_trajectories')
        .whereIn('rips_goal_id', goalIds)
        .whereIn('academic_year', academicYears);

      if (plan.school_unit_id) {
        goalTrajectoryQuery = goalTrajectoryQuery.where('school_unit_id', Number(plan.school_unit_id));
      } else {
        goalTrajectoryQuery = goalTrajectoryQuery.whereNull('school_unit_id');
      }

      savedGoalTrajectories = await goalTrajectoryQuery;
    }

    // Attach indicators, linked programs & yearly trajectories to goals
    const enrichedGoals = goals.map((g) => {
      const gInds = goalIndicators.filter((i) => i.rips_goal_id === g.id);
      const linkedProgs = goalLinks.filter((gl) => gl.goal_id === g.id);

      // Hitung baseline & target agregat
      const baseVal = gInds.length > 0
        ? (gInds.reduce((acc, curr) => acc + Number(curr.baseline_percent || 0), 0) / gInds.length)
        : (g.baseline_percent !== null && g.baseline_percent !== undefined ? Number(g.baseline_percent) : 0);

      const targetVal = gInds.length > 0
        ? (gInds.reduce((acc, curr) => acc + Number(curr.target_percent || 0), 0) / gInds.length)
        : (g.target_percent !== null && g.target_percent !== undefined ? Number(g.target_percent) : 100);

      const yearly_goal_targets = {};
      academicYears.forEach((year) => {
        const found = savedGoalTrajectories.find(
          (t) => t.rips_goal_id === g.id && t.academic_year === year
        );
        yearly_goal_targets[year] = found
          ? {
              id: found.id,
              target_percent: found.target_percent,
              notes: found.notes,
            }
          : {
              id: null,
              target_percent: null,
              notes: null,
            };
      });

      return {
        ...g,
        baseline_calc: baseVal,
        target_calc: targetVal,
        indicators: gInds,
        linked_programs: linkedProgs,
        yearly_goal_targets,
      };
    });

    // Bentuk matriks: baris program x kolom tahun ajaran (Penerapan Rencana Program)
    const matrix = programs.map((p) => {
      const yearly_targets = {};
      academicYears.forEach((year) => {
        const found = savedTargets.find(
          (t) => t.rips_program_id === p.id && t.academic_year === year
        );
        yearly_targets[year] = found
          ? {
              id: found.id,
              is_active: found.is_active !== 0 && found.is_active !== false && found.is_active !== null,
              target_percent: found.target_percent,
              notes: found.notes,
            }
          : {
              id: null,
              is_active: false,
              target_percent: null,
              notes: null,
            };
      });

      const linked = goalLinks.filter((gl) => gl.rips_program_id === p.id);
      // Determine primary domain & subdomain (direct takes precedence, then linked goals)
      const primaryDomain = p.domain_id || linked[0]?.domain_id || null;
      const primaryDomainName = p.direct_domain_name || linked[0]?.domain_name || null;
      const primarySubdomain = p.subdomain_id || linked[0]?.subdomain_id || null;
      const primarySubdomainName = p.direct_subdomain_name || linked[0]?.subdomain_name || null;

      return {
        program_id: p.id,
        program_code: p.code,
        program_name: p.name,
        description: p.description,
        is_flagship: p.is_flagship,
        category_name: p.category_name,
        category_color: p.category_color,
        category_bg_color: p.category_bg_color,
        category_border_color: p.category_border_color,
        domain_id: primaryDomain,
        domain_name: primaryDomainName,
        subdomain_id: primarySubdomain,
        subdomain_name: primarySubdomainName,
        linked_goals: linked,
        yearly_targets,
      };
    });

    return {
      plan,
      academic_years: academicYears,
      matrix,
      domains,
      subdomains,
      bsc_aspects: bscAspects,
      goals: enrichedGoals,
    };
  }

  /**
   * PUT /annual-program-targets/bulk
   * Bulk upsert penerapan program tahunan (is_active) untuk satuan pendidikan tertentu atau yayasan
   */
  async bulkUpsertTargets(schoolUnitId, items = [], goalItems = []) {
    const unitId = schoolUnitId ? Number(schoolUnitId) : null;

    return db.transaction(async (trx) => {
      // 1. Upsert Program Plan Targets & Active Status
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const { rips_program_id, academic_year, is_active, target_percent, notes } = item;
          if (!rips_program_id || !academic_year) continue;

          const isActiveVal = is_active !== undefined ? (is_active ? 1 : 0) : (target_percent !== null && target_percent !== undefined && target_percent !== '' ? 1 : 0);
          const valPercent = target_percent !== undefined && target_percent !== '' && target_percent !== null
            ? Number(target_percent)
            : null;

          let query = trx('annual_program_targets')
            .where({
              rips_program_id: Number(rips_program_id),
              academic_year: String(academic_year).trim(),
            });

          if (unitId) {
            query = query.where('school_unit_id', unitId);
          } else {
            query = query.whereNull('school_unit_id');
          }

          const existing = await query.first();

          if (existing) {
            await trx('annual_program_targets')
              .where({ id: existing.id })
              .update({
                is_active: isActiveVal,
                target_percent: valPercent,
                notes: notes !== undefined ? notes : existing.notes,
                updated_at: trx.fn.now(),
              });
          } else {
            await trx('annual_program_targets').insert({
              rips_program_id: Number(rips_program_id),
              school_unit_id: unitId,
              academic_year: String(academic_year).trim(),
              is_active: isActiveVal,
              target_percent: valPercent,
              notes: notes || null,
              created_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            });
          }
        }
      }

      // 2. Upsert Goal Trajectories (Target Sasaran Strategis %)
      if (Array.isArray(goalItems) && goalItems.length > 0) {
        for (const gItem of goalItems) {
          const { rips_goal_id, rips_goal_indicator_id, academic_year, target_percent, notes } = gItem;
          if (!rips_goal_id || !academic_year) continue;

          const valPercent = target_percent !== undefined && target_percent !== '' && target_percent !== null
            ? Number(target_percent)
            : null;

          let gQuery = trx('annual_goal_target_trajectories')
            .where({
              rips_goal_id: Number(rips_goal_id),
              academic_year: String(academic_year).trim(),
            });

          if (rips_goal_indicator_id) {
            gQuery = gQuery.where('rips_goal_indicator_id', Number(rips_goal_indicator_id));
          }

          if (unitId) {
            gQuery = gQuery.where('school_unit_id', unitId);
          } else {
            gQuery = gQuery.whereNull('school_unit_id');
          }

          const existingG = await gQuery.first();

          if (existingG) {
            await trx('annual_goal_target_trajectories')
              .where({ id: existingG.id })
              .update({
                target_percent: valPercent,
                notes: notes !== undefined ? notes : existingG.notes,
                updated_at: trx.fn.now(),
              });
          } else {
            await trx('annual_goal_target_trajectories').insert({
              rips_goal_id: Number(rips_goal_id),
              rips_goal_indicator_id: rips_goal_indicator_id ? Number(rips_goal_indicator_id) : null,
              school_unit_id: unitId,
              academic_year: String(academic_year).trim(),
              target_percent: valPercent,
              notes: notes || null,
              created_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            });
          }
        }
      }

      return { success: true, program_items: items.length, goal_items: goalItems.length };
    });
  }

  /**
   * POST /long-term-work-plans/:id/publish
   * Snapshot targets dalam rentang tahun dokumen ke document_publications (document_type sesuai plan_type)
   */
  async publishPlan(planId, payload, user = null) {
    const plan = await this.getPlanById(planId);
    const planTargets = await this.getPlanTargets(planId);

    const docType = plan.plan_type === 'rkjp' ? 'rkjp' : 'rkjm';
    const currentVersion = plan.current_version || 1;

    const snapshot = {
      plan,
      academic_years: planTargets.academic_years,
      matrix: planTargets.matrix,
      published_at: new Date().toISOString(),
      published_by_user: user ? { id: user.id, username: user.username, full_name: user.full_name } : null,
    };

    // Archive previous published publications of this plan
    await db('document_publications')
      .where({
        document_type: docType,
        source_id: planId,
        status: 'published',
      })
      .update({
        status: 'archived',
        updated_at: db.fn.now(),
      });

    // Create new publication record
    const [pubId] = await db('document_publications').insert({
      document_type: docType,
      source_id: planId,
      school_unit_id: plan.school_unit_id,
      version_number: currentVersion,
      document_number: payload.document_number || `SK-${docType.toUpperCase()}/${new Date().getFullYear()}/V${currentVersion}`,
      title: payload.title || `${plan.title} (Versi ${currentVersion})`,
      snapshot_json: JSON.stringify(snapshot),
      change_summary: payload.change_summary || `Penerbitan ${docType.toUpperCase()} Versi ${currentVersion}`,
      file_url: payload.file_url || null,
      status: 'published',
      effective_date: payload.effective_date || db.raw('CURDATE()'),
      published_by: user?.id || null,
      published_at: db.fn.now(),
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    // Update plan status & version
    await db('long_term_work_plans')
      .where({ id: planId })
      .update({
        status: 'published',
        current_version: currentVersion + 1,
        updated_at: db.fn.now(),
      });

    return db('document_publications').where({ id: pubId }).first();
  }

  /**
   * DELETE /long-term-work-plans/:id
   * Menghapus dokumen RKJP beserta RKJM turunannya dan publikasi terkait
   */
  async deletePlan(planId) {
    const plan = await this.getPlanById(planId);

    return db.transaction(async (trx) => {
      if (plan.plan_type === 'rkjp') {
        // Cari seluruh rkjm anak
        const childRkjm = await trx('long_term_work_plans')
          .where({ parent_rkjp_id: planId })
          .select('id');
        
        const childIds = childRkjm.map((r) => r.id);
        const allIds = [planId, ...childIds];

        // Hapus publications
        await trx('document_publications')
          .whereIn('source_id', allIds)
          .whereIn('document_type', ['rkjp', 'rkjm'])
          .delete();

        // Hapus rkjm anak
        if (childIds.length > 0) {
          await trx('long_term_work_plans')
            .whereIn('id', childIds)
            .delete();
        }

        // Hapus rkjp induk
        await trx('long_term_work_plans')
          .where({ id: planId })
          .delete();
      } else {
        // Hapus single rkjm jika direct delete
        await trx('document_publications')
          .where({ source_id: planId, document_type: 'rkjm' })
          .delete();

        await trx('long_term_work_plans')
          .where({ id: planId })
          .delete();
      }

      return { success: true, deleted_id: planId };
    });
  }

  /**
   * PUT /long-term-work-plans/:id
   * Memperbarui judul, status, atau rentang tahun dokumen perencanaan
   */
  async updatePlan(planId, payload, user = null) {
    const plan = await this.getPlanById(planId);
    const updateData = {};
    if (payload.title) updateData.title = payload.title;
    if (payload.status) updateData.status = payload.status;

    let yearChanged = false;
    let newStartYear = plan.start_year;
    let newEndYear = plan.end_year;

    if (payload.start_year !== undefined && payload.start_year !== null && payload.start_year !== '') {
      newStartYear = Number(payload.start_year);
      if (newStartYear !== plan.start_year) {
        updateData.start_year = newStartYear;
        yearChanged = true;
      }
    }

    if (payload.end_year !== undefined && payload.end_year !== null && payload.end_year !== '') {
      newEndYear = Number(payload.end_year);
      if (newEndYear !== plan.end_year) {
        updateData.end_year = newEndYear;
        yearChanged = true;
      }
    }

    if (newEndYear < newStartYear) {
      const error = new Error("Tahun akhir tidak boleh lebih kecil dari tahun awal");
      error.statusCode = 422;
      throw error;
    }

    updateData.updated_at = db.fn.now();

    return db.transaction(async (trx) => {
      await trx('long_term_work_plans')
        .where({ id: planId })
        .update(updateData);

      // Jika dokumen bertipe RKJP dan rentang tahunnya diubah, sinkronkan RKJM anak secara otomatis!
      if (plan.plan_type === 'rkjp' && yearChanged) {
        // Hapus RKJM turunan lama
        await trx('long_term_work_plans')
          .where({ parent_rkjp_id: planId })
          .delete();

        // Buat ulang RKJM turunan sesuai rentang tahun baru (chunk per 4 tahun)
        let currentSeq = 1;
        for (let y = newStartYear; y <= newEndYear; y += 4) {
          const rkjmStart = y;
          const rkjmEnd = Math.min(y + 3, newEndYear);
          const yearOffsetStart = rkjmStart - newStartYear + 1;
          const yearOffsetEnd = rkjmEnd - newStartYear + 1;
          const yearLabel = yearOffsetStart === yearOffsetEnd
            ? `Tahun ${yearOffsetStart}`
            : `Tahun ${yearOffsetStart}-${yearOffsetEnd}`;

          await trx('long_term_work_plans').insert({
            school_unit_id: plan.school_unit_id,
            plan_type: 'rkjm',
            parent_rkjp_id: planId,
            title: `RKJM ${this.toRoman(currentSeq)} (${yearLabel}) Periode ${rkjmStart}-${rkjmEnd}`,
            start_year: rkjmStart,
            end_year: rkjmEnd,
            sequence_order: currentSeq,
            current_version: 1,
            status: 'draft',
            created_by: user?.id || null,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });
          currentSeq++;
        }
      }

      const updatedPlan = await trx('long_term_work_plans').where({ id: planId }).first();
      let rkjmList = [];
      if (updatedPlan.plan_type === 'rkjp') {
        rkjmList = await trx('long_term_work_plans')
          .where({ parent_rkjp_id: planId })
          .orderBy('sequence_order', 'asc');
      }

      return {
        ...updatedPlan,
        rkjm_list: rkjmList,
      };
    });
  }

  async getPublications(planId, planType) {
    const docType = planType === 'rkjm' ? 'rkjm' : 'rkjp';
    return db('document_publications')
      .where({
        document_type: docType,
        source_id: planId,
      })
      .orderBy('version_number', 'desc');
  }
}

module.exports = LongTermPlanningService;
