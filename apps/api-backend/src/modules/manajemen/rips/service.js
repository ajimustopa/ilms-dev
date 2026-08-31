/**
 * RIPS Service Implementation
 * Modul Manajemen - Fitur Rencana Induk Pengembangan Sekolah (RIPS) Terintegrasi
 */
const db = require('../../../config/db/manajemen');

class RipsService {
  // ==========================================
  // 1. MASTER DOMAINS & SUBDOMAINS & BSC
  // ==========================================
  async listDomains() {
    const domains = await db('rips_domains').orderBy('order_index', 'asc').orderBy('id', 'asc');
    const subdomains = await db('rips_subdomains').orderBy('order_index', 'asc').orderBy('id', 'asc');

    return domains.map((d) => ({
      ...d,
      subdomains: subdomains.filter((s) => s.domain_id === d.id),
    }));
  }

  async createDomain(payload) {
    if (!payload.name || !payload.name.trim()) {
      const error = new Error("Nama bidang (domain) wajib diisi");
      error.statusCode = 422;
      throw error;
    }
    const [id] = await db('rips_domains').insert({
      name: payload.name.trim(),
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return db('rips_domains').where({ id }).first();
  }

  async updateDomain(id, payload) {
    const dom = await db('rips_domains').where({ id }).first();
    if (!dom) {
      const error = new Error('Bidang (domain) tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('rips_domains').where({ id }).update({
      name: payload.name ? payload.name.trim() : dom.name,
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : dom.order_index,
      updated_at: db.fn.now(),
    });
    return db('rips_domains').where({ id }).first();
  }

  async deleteDomain(id) {
    const dom = await db('rips_domains').where({ id }).first();
    if (!dom) {
      const error = new Error('Bidang (domain) tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    return await db.transaction(async (trx) => {
      // 1. Find all goals under this domain
      const goals = await trx('rips_goals').where({ domain_id: id }).select('id');
      const goalIds = goals.map((g) => g.id);

      if (goalIds.length > 0) {
        // Delete indicators of these goals
        await trx('rips_goal_indicators').whereIn('rips_goal_id', goalIds).del();
        // Delete program goal links
        await trx('rips_program_goal_links').whereIn('rips_goal_id', goalIds).del();
        // Delete evadir goal results
        await trx('evadir_goal_results').whereIn('rips_goal_id', goalIds).del();
        // Delete the goals
        await trx('rips_goals').whereIn('id', goalIds).del();
      }

      // 2. Delete all subdomains under this domain
      await trx('rips_subdomains').where({ domain_id: id }).del();

      // 3. Delete the domain itself
      await trx('rips_domains').where({ id }).del();

      return { success: true };
    });
  }

  // Subdomains
  async createSubdomain(payload) {
    if (!payload.domain_id || !payload.name || !payload.name.trim()) {
      const error = new Error("domain_id dan nama sub-bidang wajib diisi");
      error.statusCode = 422;
      throw error;
    }
    const [id] = await db('rips_subdomains').insert({
      domain_id: payload.domain_id,
      name: payload.name.trim(),
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return db('rips_subdomains').where({ id }).first();
  }

  async updateSubdomain(id, payload) {
    const sub = await db('rips_subdomains').where({ id }).first();
    if (!sub) {
      const error = new Error('Sub-bidang tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('rips_subdomains').where({ id }).update({
      name: payload.name ? payload.name.trim() : sub.name,
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : sub.order_index,
      updated_at: db.fn.now(),
    });
    return db('rips_subdomains').where({ id }).first();
  }

  async deleteSubdomain(id) {
    const sub = await db('rips_subdomains').where({ id }).first();
    if (!sub) {
      const error = new Error('Sub-bidang tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    return await db.transaction(async (trx) => {
      // 1. Find all goals under this subdomain
      const goals = await trx('rips_goals').where({ subdomain_id: id }).select('id');
      const goalIds = goals.map((g) => g.id);

      if (goalIds.length > 0) {
        // Delete indicators of these goals
        await trx('rips_goal_indicators').whereIn('rips_goal_id', goalIds).del();
        // Delete program goal links
        await trx('rips_program_goal_links').whereIn('rips_goal_id', goalIds).del();
        // Delete evadir goal results
        await trx('evadir_goal_results').whereIn('rips_goal_id', goalIds).del();
        // Delete the goals
        await trx('rips_goals').whereIn('id', goalIds).del();
      }

      // 2. Delete the subdomain itself
      await trx('rips_subdomains').where({ id }).del();

      return { success: true };
    });
  }

  // BSC Aspects
  async listBscAspects() {
    return db('bsc_aspects').orderBy('order_index', 'asc').orderBy('id', 'asc');
  }

  async createBscAspect(payload) {
    if (!payload.name || !payload.name.trim()) {
      const error = new Error("Nama aspek BSC wajib diisi");
      error.statusCode = 422;
      throw error;
    }
    const [id] = await db('bsc_aspects').insert({
      name: payload.name.trim(),
      description: payload.description || null,
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return db('bsc_aspects').where({ id }).first();
  }

  async updateBscAspect(id, payload) {
    const aspect = await db('bsc_aspects').where({ id }).first();
    if (!aspect) {
      const error = new Error('Aspek BSC tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('bsc_aspects').where({ id }).update({
      name: payload.name ? payload.name.trim() : aspect.name,
      description: payload.description !== undefined ? payload.description : aspect.description,
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : aspect.order_index,
      updated_at: db.fn.now(),
    });
    return db('bsc_aspects').where({ id }).first();
  }

  async deleteBscAspect(id) {
    const countGoals = await db('rips_goals').where({ bsc_aspect_id: id }).count('* as count');
    if (countGoals[0].count > 0) {
      const error = new Error('Aspek BSC tidak dapat dihapus karena masih digunakan pada sasaran RIPS');
      error.statusCode = 422;
      throw error;
    }
    await db('bsc_aspects').where({ id }).del();
    return { success: true };
  }

  // Program Categories
  async listProgramCategories() {
    return db('rips_program_categories').orderBy('order_index', 'asc').orderBy('id', 'asc');
  }

  async createProgramCategory(payload) {
    if (!payload.name || !payload.name.trim()) {
      const error = new Error("Nama kategori program wajib diisi");
      error.statusCode = 422;
      throw error;
    }
    const [id] = await db('rips_program_categories').insert({
      name: payload.name.trim(),
      color: payload.color || '#3B82F6',
      bg_color: payload.bg_color || '#EFF6FF',
      border_color: payload.border_color || '#BFDBFE',
      description: payload.description || null,
      order_index: payload.order_index ? Number(payload.order_index) : 0,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return db('rips_program_categories').where({ id }).first();
  }

  async updateProgramCategory(id, payload) {
    const cat = await db('rips_program_categories').where({ id }).first();
    if (!cat) {
      const error = new Error('Kategori program tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('rips_program_categories').where({ id }).update({
      name: payload.name ? payload.name.trim() : cat.name,
      color: payload.color || cat.color,
      bg_color: payload.bg_color || cat.bg_color,
      border_color: payload.border_color || cat.border_color,
      description: payload.description !== undefined ? payload.description : cat.description,
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : cat.order_index,
      is_active: payload.is_active !== undefined ? payload.is_active : cat.is_active,
      updated_at: db.fn.now(),
    });
    return db('rips_program_categories').where({ id }).first();
  }

  async deleteProgramCategory(id) {
    const countProg = await db('rips_programs').where({ category_id: id }).count('* as count');
    if (countProg[0].count > 0) {
      const error = new Error('Kategori tidak dapat dihapus karena sedang digunakan oleh program');
      error.statusCode = 422;
      throw error;
    }
    await db('rips_program_categories').where({ id }).del();
    return { success: true };
  }

  async getOrInitRipsDocument(schoolUnitId = null) {
    let q = db('rips_documents');
    if (schoolUnitId) {
      q = q.where('school_unit_id', Number(schoolUnitId));
    } else {
      q = q.whereNull('school_unit_id');
    }

    let doc = await q.first();
    if (!doc) {
      const defaultMission = [
        'Meningkatkan mutu pembelajaran terpadu berbasis kurikulum adab & sains',
        'Membangun karakter, kemandirian, dan keteladanan santri berprestasi',
        'Menyediakan tata kelola kelembagaan yang transparan, akuntabel, dan berbasis digital'
      ];
      const defaultObjectives = [
        'Mencapai 100% kelulusan santri dengan kompetensi akademik dan keagamaan unggul',
        'Mewujudkan iklim pesantren yang aman, sehat, inklusif, dan ramah anak',
        'Meningkatkan efisiensi dan tata kelola sarana prasarana sekolah mencapai standar prima'
      ];

      const [id] = await db('rips_documents').insert({
        school_unit_id: schoolUnitId ? Number(schoolUnitId) : null,
        name: schoolUnitId ? `RIPS Satuan Pendidikan (ID #${schoolUnitId})` : 'RIPS Induk Yayasan Aldepos',
        vision: 'Mewujudkan institusi pendidikan berkualitas prima, islami, dan berdaya saing global.',
        mission: JSON.stringify(defaultMission),
        objectives: JSON.stringify(defaultObjectives),
        current_version: 0,
        status: 'draft',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
      doc = await db('rips_documents').where({ id }).first();
    }

    // Parse mission JSON
    let parsedMission = [];
    if (typeof doc.mission === 'string') {
      try {
        parsedMission = JSON.parse(doc.mission);
      } catch (e) {
        parsedMission = [doc.mission];
      }
    } else if (Array.isArray(doc.mission)) {
      parsedMission = doc.mission;
    }

    // Parse objectives JSON
    let parsedObjectives = [];
    if (typeof doc.objectives === 'string') {
      try {
        parsedObjectives = JSON.parse(doc.objectives);
      } catch (e) {
        parsedObjectives = [doc.objectives];
      }
    } else if (Array.isArray(doc.objectives)) {
      parsedObjectives = doc.objectives;
    }

    return {
      ...doc,
      mission: parsedMission,
      objectives: parsedObjectives,
    };
  }

  async updateRipsDocument(id, payload) {
    const doc = await db('rips_documents').where({ id }).first();
    if (!doc) {
      const error = new Error('Dokumen RIPS tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.vision !== undefined) updateData.vision = payload.vision;
    if (payload.mission !== undefined) {
      updateData.mission = Array.isArray(payload.mission) ? JSON.stringify(payload.mission) : payload.mission;
    }
    if (payload.objectives !== undefined) {
      updateData.objectives = Array.isArray(payload.objectives) ? JSON.stringify(payload.objectives) : payload.objectives;
    }
    if (payload.description !== undefined) updateData.description = payload.description;

    // Optional direct draft update of SK info if needed before ratification
    if (payload.sk_number !== undefined) updateData.sk_number = payload.sk_number;
    if (payload.sk_date !== undefined) updateData.sk_date = payload.sk_date;
    if (payload.sk_signer_name !== undefined) updateData.sk_signer_name = payload.sk_signer_name;
    if (payload.sk_signer_position !== undefined) updateData.sk_signer_position = payload.sk_signer_position;
    if (payload.sk_file_url !== undefined) updateData.sk_file_url = payload.sk_file_url;

    // If changes are made to a published document without ratifying a new version, switch status back to draft
    if (payload.reset_to_draft && doc.status === 'published') {
      updateData.status = 'draft';
    }

    await db('rips_documents').where({ id }).update(updateData);
    return this.getOrInitRipsDocument(doc.school_unit_id);
  }

  // ==========================================
  // 3. RIPS GOALS (SASARAN STRATEGIS RIPS)
  // ==========================================
  async listGoals(ripsDocumentId, query = {}) {
    let q = db('rips_goals')
      .leftJoin('rips_domains', 'rips_goals.domain_id', 'rips_domains.id')
      .leftJoin('rips_subdomains', 'rips_goals.subdomain_id', 'rips_subdomains.id')
      .leftJoin('bsc_aspects', 'rips_goals.bsc_aspect_id', 'bsc_aspects.id')
      .where('rips_goals.rips_document_id', ripsDocumentId)
      .select(
        'rips_goals.*',
        'rips_domains.name as domain_name',
        'rips_subdomains.name as subdomain_name',
        'bsc_aspects.name as bsc_aspect_name'
      );

    if (query.domain_id) q = q.where('rips_goals.domain_id', query.domain_id);
    if (query.bsc_aspect_id) q = q.where('rips_goals.bsc_aspect_id', query.bsc_aspect_id);
    if (query.status) q = q.where('rips_goals.status', query.status);

    const goals = await q.orderBy('rips_goals.order_index', 'asc').orderBy('rips_goals.id', 'asc');

    const goalIds = goals.map((g) => g.id);
    let links = [];
    let indicators = [];

    if (goalIds.length > 0) {
      const [fetchedLinks, fetchedIndicators] = await Promise.all([
        db('rips_program_goal_links')
          .join('rips_programs', 'rips_program_goal_links.rips_program_id', 'rips_programs.id')
          .whereIn('rips_program_goal_links.rips_goal_id', goalIds)
          .select(
            'rips_program_goal_links.rips_goal_id',
            'rips_programs.id as program_id',
            'rips_programs.code as program_code',
            'rips_programs.name as program_name',
            'rips_programs.is_flagship'
          ),
        db('rips_goal_indicators')
          .whereIn('rips_goal_id', goalIds)
          .orderBy('order_index', 'asc')
          .orderBy('id', 'asc')
      ]);

      links = fetchedLinks;
      indicators = fetchedIndicators;
    }

    return goals.map((g) => {
      const goalIndicators = indicators.filter((ind) => ind.rips_goal_id === g.id);
      return {
        ...g,
        indicators: goalIndicators,
        // Fallback for primary/first indicator
        indicator_name: goalIndicators[0]?.name || g.indicator_name || g.title,
        indicator_unit: goalIndicators[0]?.unit || g.indicator_unit || '%',
        baseline_percent: goalIndicators[0]?.baseline_percent ?? g.baseline_percent ?? 0,
        target_percent: goalIndicators[0]?.target_percent ?? g.target_percent ?? 100,
        linked_programs: links.filter((l) => l.rips_goal_id === g.id),
      };
    });
  }

  async createGoal(payload) {
    if (!payload.rips_document_id || !payload.domain_id || !payload.bsc_aspect_id || !payload.title) {
      const error = new Error("rips_document_id, domain_id, bsc_aspect_id, dan title (nama sasaran) wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    let code = payload.code ? payload.code.trim() : null;
    if (!code) {
      const count = await db('rips_goals').where({ rips_document_id: payload.rips_document_id }).count('* as total');
      code = `SAS-${String(count[0].total + 1).padStart(3, '0')}`;
    }

    const rawIndicators = Array.isArray(payload.indicators) && payload.indicators.length > 0
      ? payload.indicators
      : [
          {
            name: payload.indicator_name || payload.title.trim(),
            unit: payload.indicator_unit || '%',
            baseline_percent: payload.baseline_percent !== undefined ? payload.baseline_percent : 0,
            target_percent: payload.target_percent !== undefined ? payload.target_percent : 100,
          }
        ];

    const firstInd = rawIndicators[0] || {};

    const [id] = await db('rips_goals').insert({
      rips_document_id: payload.rips_document_id,
      domain_id: payload.domain_id,
      subdomain_id: payload.subdomain_id || null,
      bsc_aspect_id: payload.bsc_aspect_id,
      code,
      title: payload.title.trim(),
      indicator_name: firstInd.name || payload.title.trim(),
      indicator_unit: firstInd.unit || '%',
      baseline_percent: firstInd.baseline_percent !== undefined ? firstInd.baseline_percent : 0,
      target_percent: firstInd.target_percent !== undefined ? firstInd.target_percent : 100,
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : 0,
      status: payload.status || 'draft',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    // Insert all indicators
    for (let i = 0; i < rawIndicators.length; i++) {
      const ind = rawIndicators[i];
      if (ind && ind.name) {
        await db('rips_goal_indicators').insert({
          rips_goal_id: id,
          code: `${code}-IND-${String(i + 1).padStart(2, '0')}`,
          name: ind.name.trim(),
          unit: ind.unit ? ind.unit.trim() : '%',
          baseline_percent: ind.baseline_percent !== undefined ? Number(ind.baseline_percent) : 0,
          target_percent: ind.target_percent !== undefined ? Number(ind.target_percent) : 100,
          order_index: i + 1,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
      }
    }

    const created = await db('rips_goals').where({ id }).first();
    const indList = await db('rips_goal_indicators').where({ rips_goal_id: id }).orderBy('order_index', 'asc');
    return { ...created, indicators: indList };
  }

  async updateGoal(id, payload) {
    const goal = await db('rips_goals').where({ id }).first();
    if (!goal) {
      const error = new Error('Sasaran RIPS tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.domain_id) updateData.domain_id = payload.domain_id;
    if (payload.subdomain_id !== undefined) updateData.subdomain_id = payload.subdomain_id || null;
    if (payload.bsc_aspect_id) updateData.bsc_aspect_id = payload.bsc_aspect_id;
    if (payload.code) updateData.code = payload.code.trim();
    if (payload.title) updateData.title = payload.title.trim();
    if (payload.order_index !== undefined) updateData.order_index = Number(payload.order_index);
    if (payload.status) updateData.status = payload.status;

    // If indicators array is provided, sync them
    if (Array.isArray(payload.indicators) && payload.indicators.length > 0) {
      const firstInd = payload.indicators[0];
      updateData.indicator_name = firstInd.name;
      updateData.indicator_unit = firstInd.unit || '%';
      updateData.baseline_percent = firstInd.baseline_percent;
      updateData.target_percent = firstInd.target_percent;

      // Delete existing and re-insert
      await db('rips_goal_indicators').where({ rips_goal_id: id }).del();
      for (let i = 0; i < payload.indicators.length; i++) {
        const ind = payload.indicators[i];
        if (ind && ind.name) {
          await db('rips_goal_indicators').insert({
            rips_goal_id: id,
            code: ind.code || `${goal.code}-IND-${String(i + 1).padStart(2, '0')}`,
            name: ind.name.trim(),
            unit: ind.unit ? ind.unit.trim() : '%',
            baseline_percent: ind.baseline_percent !== undefined ? Number(ind.baseline_percent) : 0,
            target_percent: ind.target_percent !== undefined ? Number(ind.target_percent) : 100,
            order_index: i + 1,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });
        }
      }
    } else if (payload.indicator_name) {
      updateData.indicator_name = payload.indicator_name.trim();
      if (payload.indicator_unit) updateData.indicator_unit = payload.indicator_unit.trim();
      if (payload.baseline_percent !== undefined) updateData.baseline_percent = payload.baseline_percent;
      if (payload.target_percent !== undefined) updateData.target_percent = payload.target_percent;
    }

    await db('rips_goals').where({ id }).update(updateData);
    const updated = await db('rips_goals').where({ id }).first();
    const indList = await db('rips_goal_indicators').where({ rips_goal_id: id }).orderBy('order_index', 'asc');
    return { ...updated, indicators: indList };
  }

  async deleteGoal(id) {
    const goal = await db('rips_goals').where({ id }).first();
    if (!goal) {
      const error = new Error('Sasaran RIPS tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('rips_goals').where({ id }).del();
    return { success: true };
  }

  // ==========================================
  // 3b. RIPS GOAL INDICATORS CRUD
  // ==========================================
  async addIndicator(ripsGoalId, payload) {
    const goal = await db('rips_goals').where({ id: ripsGoalId }).first();
    if (!goal) {
      const error = new Error('Sasaran RIPS tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const count = await db('rips_goal_indicators').where({ rips_goal_id: ripsGoalId }).count('* as total');
    const orderIndex = count[0].total + 1;
    const code = payload.code || `${goal.code}-IND-${String(orderIndex).padStart(2, '0')}`;

    const [id] = await db('rips_goal_indicators').insert({
      rips_goal_id: ripsGoalId,
      code,
      name: payload.name.trim(),
      unit: payload.unit ? payload.unit.trim() : '%',
      baseline_percent: payload.baseline_percent !== undefined ? Number(payload.baseline_percent) : 0,
      target_percent: payload.target_percent !== undefined ? Number(payload.target_percent) : 100,
      order_index: payload.order_index || orderIndex,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return db('rips_goal_indicators').where({ id }).first();
  }

  async updateIndicator(id, payload) {
    const ind = await db('rips_goal_indicators').where({ id }).first();
    if (!ind) {
      const error = new Error('Indikator sasaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.unit) updateData.unit = payload.unit.trim();
    if (payload.baseline_percent !== undefined) updateData.baseline_percent = Number(payload.baseline_percent);
    if (payload.target_percent !== undefined) updateData.target_percent = Number(payload.target_percent);
    if (payload.order_index !== undefined) updateData.order_index = Number(payload.order_index);

    await db('rips_goal_indicators').where({ id }).update(updateData);
    return db('rips_goal_indicators').where({ id }).first();
  }

  async deleteIndicator(id) {
    const ind = await db('rips_goal_indicators').where({ id }).first();
    if (!ind) {
      const error = new Error('Indikator sasaran tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('rips_goal_indicators').where({ id }).del();
    return { success: true };
  }

  // ==========================================
  // 4. RIPS PROGRAMS & LINK GOALS
  // ==========================================
  async listPrograms(ripsDocumentId) {
    const programs = await db('rips_programs')
      .leftJoin('rips_program_categories', 'rips_programs.category_id', 'rips_program_categories.id')
      .where('rips_programs.rips_document_id', ripsDocumentId)
      .orderBy('rips_programs.order_index', 'asc')
      .orderBy('rips_programs.id', 'asc')
      .select(
        'rips_programs.*',
        'rips_program_categories.name as category_name',
        'rips_program_categories.color as category_color',
        'rips_program_categories.bg_color as category_bg_color',
        'rips_program_categories.border_color as category_border_color'
      );

    const programIds = programs.map((p) => p.id);
    let links = [];
    let indicatorsMap = new Map();
    if (programIds.length > 0) {
      links = await db('rips_program_goal_links')
        .join('rips_goals', 'rips_program_goal_links.rips_goal_id', 'rips_goals.id')
        .leftJoin('rips_domains', 'rips_goals.domain_id', 'rips_domains.id')
        .leftJoin('rips_subdomains', 'rips_goals.subdomain_id', 'rips_subdomains.id')
        .whereIn('rips_program_goal_links.rips_program_id', programIds)
        .select(
          'rips_program_goal_links.rips_program_id',
          'rips_goals.id as goal_id',
          'rips_goals.code as goal_code',
          'rips_goals.title as goal_title',
          'rips_goals.domain_id',
          'rips_domains.name as domain_name',
          'rips_domains.order_index as domain_order_index',
          'rips_goals.subdomain_id',
          'rips_subdomains.name as subdomain_name',
          'rips_subdomains.order_index as subdomain_order_index'
        );

      const linkedGoalIds = Array.from(new Set(links.map((l) => l.goal_id)));
      if (linkedGoalIds.length > 0) {
        const indicators = await db('rips_goal_indicators')
          .whereIn('rips_goal_id', linkedGoalIds)
          .orderBy('order_index', 'asc')
          .orderBy('id', 'asc')
          .select('id', 'rips_goal_id', 'code', 'name', 'unit', 'baseline_percent', 'target_percent');

        for (const ind of indicators) {
          if (!indicatorsMap.has(ind.rips_goal_id)) {
            indicatorsMap.set(ind.rips_goal_id, []);
          }
          indicatorsMap.get(ind.rips_goal_id).push(ind);
        }
      }
    }

    return programs.map((p) => {
      const pLinks = links.filter((l) => l.rips_program_id === p.id).map((l) => ({
        ...l,
        indicators: indicatorsMap.get(l.goal_id) || [],
      }));

      // Primary domain and subdomain from the first linked goal
      const primaryDomainId = pLinks[0]?.domain_id || null;
      const primaryDomainName = pLinks[0]?.domain_name || 'Lainnya';
      const primaryDomainOrder = pLinks[0]?.domain_order_index ?? 99;
      const primarySubdomainId = pLinks[0]?.subdomain_id || null;
      const primarySubdomainName = pLinks[0]?.subdomain_name || 'Umum / Lintas Sub-Bidang';
      const primarySubdomainOrder = pLinks[0]?.subdomain_order_index ?? 99;

      return {
        ...p,
        domain_id: primaryDomainId,
        domain_name: primaryDomainName,
        domain_order_index: primaryDomainOrder,
        subdomain_id: primarySubdomainId,
        subdomain_name: primarySubdomainName,
        subdomain_order_index: primarySubdomainOrder,
        linked_goals: pLinks,
      };
    });
  }

  async createProgram(payload) {
    if (!payload.rips_document_id || !payload.name) {
      const error = new Error("rips_document_id dan nama program wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    let code = payload.code ? payload.code.trim() : null;
    if (!code) {
      const count = await db('rips_programs').where({ rips_document_id: payload.rips_document_id }).count('* as total');
      code = `PRG-${String(count[0].total + 1).padStart(3, '0')}`;
    }

    const [id] = await db('rips_programs').insert({
      rips_document_id: payload.rips_document_id,
      code,
      name: payload.name.trim(),
      description: payload.description || null,
      is_flagship: payload.is_flagship ? 1 : 0,
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : 0,
      status: payload.status || 'draft',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    if (Array.isArray(payload.linked_goal_ids) && payload.linked_goal_ids.length > 0) {
      await this.linkProgramGoals(id, payload.linked_goal_ids);
    }

    return db('rips_programs').where({ id }).first();
  }

  async updateProgram(id, payload) {
    const program = await db('rips_programs').where({ id }).first();
    if (!program) {
      const error = new Error('Program RIPS tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.code) updateData.code = payload.code.trim();
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.is_flagship !== undefined) updateData.is_flagship = payload.is_flagship ? 1 : 0;
    if (payload.order_index !== undefined) updateData.order_index = Number(payload.order_index);
    if (payload.status) updateData.status = payload.status;

    await db('rips_programs').where({ id }).update(updateData);

    if (Array.isArray(payload.linked_goal_ids)) {
      await this.linkProgramGoals(id, payload.linked_goal_ids);
    }

    return db('rips_programs').where({ id }).first();
  }

  async deleteProgram(id) {
    const prog = await db('rips_programs').where({ id }).first();
    if (!prog) {
      const error = new Error('Program RIPS tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('rips_programs').where({ id }).del();
    return { success: true };
  }

  async linkProgramGoals(programId, ripsGoalIds = []) {
    const prog = await db('rips_programs').where({ id: programId }).first();
    if (!prog) {
      const error = new Error('Program RIPS tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Clear old links
    await db('rips_program_goal_links').where({ rips_program_id: programId }).del();

    // Insert new links
    if (ripsGoalIds.length > 0) {
      const rows = ripsGoalIds.map((gId) => ({
        rips_program_id: programId,
        rips_goal_id: Number(gId),
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }));
      await db('rips_program_goal_links').insert(rows);
    }

    return { success: true, linked_count: ripsGoalIds.length };
  }

  // ==========================================
  // 5. PUBLICATION & VERSIONING (document_publications)
  // ==========================================
  async publishRipsDocument(ripsDocumentId, payload, user = null) {
    const doc = await db('rips_documents').where({ id: ripsDocumentId }).first();
    if (!doc) {
      const error = new Error('Dokumen RIPS tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 1. Gather all goals & programs snapshot
    const goals = await this.listGoals(ripsDocumentId);
    const programs = await this.listPrograms(ripsDocumentId);

    const snapshot = {
      document: doc,
      goals,
      programs,
      published_at: new Date().toISOString(),
      published_by_user: user ? { id: user.id, username: user.username, full_name: user.full_name } : null,
    };

    const previousPubs = await db('document_publications')
      .where({
        document_type: 'rips',
        source_id: ripsDocumentId,
      });

    const nextVersion = previousPubs.length + 1;

    // Archive previous published publications of this document
    await db('document_publications')
      .where({
        document_type: 'rips',
        source_id: ripsDocumentId,
        status: 'published',
      })
      .update({
        status: 'archived',
        updated_at: db.fn.now(),
      });

    // Create new publication record with SK details
    const [pubId] = await db('document_publications').insert({
      document_type: 'rips',
      source_id: ripsDocumentId,
      school_unit_id: doc.school_unit_id || null,
      version_number: nextVersion,
      document_number: payload.document_number || payload.sk_number || `SK-RIPS/${new Date().getFullYear()}/V${nextVersion}`,
      title: payload.title || `${doc.name} (Versi Resmi ${nextVersion})`,
      snapshot_json: JSON.stringify(snapshot),
      change_summary: payload.change_summary || `Pengesahan Resmi RIPS Versi ${nextVersion} melalui SK No. ${payload.document_number || payload.sk_number}`,
      file_url: payload.file_url || payload.sk_file_url || null,
      sk_signer_name: payload.sk_signer_name || null,
      sk_signer_position: payload.sk_signer_position || null,
      status: 'published',
      effective_date: payload.effective_date || payload.sk_date || db.raw('CURDATE()'),
      published_by: user?.id || null,
      published_at: db.fn.now(),
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    // Update rips_documents status, version, and active SK info
    await db('rips_documents')
      .where({ id: ripsDocumentId })
      .update({
        status: 'published',
        current_version: nextVersion,
        sk_number: payload.document_number || payload.sk_number,
        sk_date: payload.effective_date || payload.sk_date || db.raw('CURDATE()'),
        sk_signer_name: payload.sk_signer_name || null,
        sk_signer_position: payload.sk_signer_position || null,
        sk_file_url: payload.file_url || payload.sk_file_url || null,
        ratified_at: db.fn.now(),
        ratified_by: user?.id || null,
        updated_at: db.fn.now(),
      });

    return db('document_publications').where({ id: pubId }).first();
  }

  async getPublications(ripsDocumentId) {
    return db('document_publications')
      .where({
        document_type: 'rips',
        source_id: ripsDocumentId,
      })
      .orderBy('version_number', 'desc');
  }

  // ==========================================
  // 6. DEPENDENCY INSPECTION FOR SAFE DELETION
  // ==========================================
  async getDomainImpact(id) {
    const domain = await db('rips_domains').where({ id }).first();
    if (!domain) {
      const error = new Error('Bidang tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const subdomains = await db('rips_subdomains').where({ domain_id: id });
    const goals = await db('rips_goals as g')
      .leftJoin('rips_documents as d', 'g.rips_document_id', 'd.id')
      .where('g.domain_id', id)
      .select('g.id', 'g.code', 'g.title', 'g.rips_document_id', 'd.name as document_name', 'd.school_unit_id');

    return {
      domain,
      subdomains_count: subdomains.length,
      subdomains,
      goals_count: goals.length,
      goals: goals.map((g) => ({
        id: g.id,
        code: g.code,
        title: g.title,
        document_name: g.document_name || (g.school_unit_id ? `Satuan Unit #${g.school_unit_id}` : 'Tingkat Yayasan'),
      })),
      can_delete: true,
    };
  }

  async getSubdomainImpact(id) {
    const subdomain = await db('rips_subdomains').where({ id }).first();
    if (!subdomain) {
      const error = new Error('Sub-bidang tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const goals = await db('rips_goals as g')
      .leftJoin('rips_documents as d', 'g.rips_document_id', 'd.id')
      .where('g.subdomain_id', id)
      .select('g.id', 'g.code', 'g.title', 'g.rips_document_id', 'd.name as document_name', 'd.school_unit_id');

    return {
      subdomain,
      goals_count: goals.length,
      goals: goals.map((g) => ({
        id: g.id,
        code: g.code,
        title: g.title,
        document_name: g.document_name || (g.school_unit_id ? `Satuan Unit #${g.school_unit_id}` : 'Tingkat Yayasan'),
      })),
      can_delete: true,
    };
  }

  async getGoalImpact(id) {
    const goal = await db('rips_goals').where({ id }).first();
    if (!goal) {
      const error = new Error('Sasaran RIPS tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const programLinks = await db('rips_program_goal_links as l')
      .join('rips_programs as p', 'l.rips_program_id', 'p.id')
      .where('l.rips_goal_id', id)
      .select('p.id', 'p.code', 'p.name');

    const evadirResults = await db('evadir_goal_results as r')
      .join('evadir_reports as rep', 'r.evadir_report_id', 'rep.id')
      .where('r.rips_goal_id', id)
      .select('rep.id', 'rep.period_label', 'r.achieved_percent');

    return {
      goal,
      linked_programs_count: programLinks.length,
      linked_programs: programLinks,
      evadir_evaluations_count: evadirResults.length,
      evadir_evaluations: evadirResults,
      can_delete: true,
    };
  }

  async getProgramImpact(id) {
    const program = await db('rips_programs').where({ id }).first();
    if (!program) {
      const error = new Error('Program RIPS tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const annualTargets = await db('annual_program_targets').where({ rips_program_id: id });
    const activities = await db('work_plan_activities').where({ rips_program_id: id });
    const committees = await db('program_committees').where({ rips_program_id: id });
    const discussions = await db('program_discussions').where({ rips_program_id: id });

    return {
      program,
      annual_targets_count: annualTargets.length,
      activities_count: activities.length,
      committees_count: committees.length,
      discussions_count: discussions.length,
      can_delete: true,
    };
  }
}

module.exports = RipsService;

