/**
 * Annual Work Plan (RKT) Service Implementation
 * Modul Manajemen - Fitur Rencana Kerja Tahunan, Langkah Kegiatan, dan Kepanitiaan Program
 */
const db = require('../../../config/db/manajemen');

class AnnualWorkPlanService {
  // ==========================================
  // 1. MASTER COMMITTEE POSITION TYPES
  // ==========================================
  async listCommitteePositionTypes() {
    return db('committee_position_types').orderBy('order_index', 'asc').orderBy('id', 'asc');
  }

  async createCommitteePositionType(payload) {
    if (!payload.name || !payload.name.trim()) {
      const error = new Error("Nama jenis jabatan kepanitiaan wajib diisi");
      error.statusCode = 422;
      throw error;
    }
    const [id] = await db('committee_position_types').insert({
      name: payload.name.trim(),
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return db('committee_position_types').where({ id }).first();
  }

  async updateCommitteePositionType(id, payload) {
    const pos = await db('committee_position_types').where({ id }).first();
    if (!pos) {
      const error = new Error('Jenis jabatan kepanitiaan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('committee_position_types').where({ id }).update({
      name: payload.name ? payload.name.trim() : pos.name,
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : pos.order_index,
      updated_at: db.fn.now(),
    });
    return db('committee_position_types').where({ id }).first();
  }

  async deleteCommitteePositionType(id) {
    const countUsed = await db('program_committee_members').where({ committee_position_type_id: id }).count('* as count');
    if (countUsed[0].count > 0) {
      const error = new Error('Jabatan tidak dapat dihapus karena masih digunakan dalam kepanitiaan');
      error.statusCode = 422;
      throw error;
    }
    await db('committee_position_types').where({ id }).del();
    return { success: true };
  }

  // ==========================================
  // 2. ANNUAL WORK PLAN (RKT HEADER)
  // ==========================================
  async getOrInitAnnualWorkPlan(schoolUnitId, academicYear, user = null, context = null) {
    if (!academicYear) {
      const error = new Error("academic_year wajib disertakan");
      error.statusCode = 422;
      throw error;
    }

    const isFoundation = context === 'foundation' || schoolUnitId === 'foundation' || schoolUnitId === 'null' || !schoolUnitId;
    const sUnitId = isFoundation ? null : Number(schoolUnitId);
    const acYear = String(academicYear).trim();

    let planQuery = db('annual_work_plans').where('academic_year', acYear);
    if (sUnitId) {
      planQuery = planQuery.where('school_unit_id', sUnitId);
    } else {
      planQuery = planQuery.whereNull('school_unit_id');
    }

    let plan = await planQuery.first();

    if (!plan) {
      // Auto-detect matching RKJM if any (based on start_year <= year <= end_year)
      const startYearFromAcYear = parseInt(acYear.split('/')[0], 10) || new Date().getFullYear();
      let rkjmQuery = db('long_term_work_plans')
        .where('plan_type', 'rkjm')
        .where('start_year', '<=', startYearFromAcYear)
        .where('end_year', '>=', startYearFromAcYear);

      if (sUnitId) {
        rkjmQuery = rkjmQuery.where('school_unit_id', sUnitId);
      } else {
        rkjmQuery = rkjmQuery.whereNull('school_unit_id');
      }

      const parentRkjm = await rkjmQuery.first();

      const title = isFoundation
        ? `Rencana Kerja Tahunan (RKT) Gabungan Yayasan TA ${acYear}`
        : `Rencana Kerja Tahunan (RKT) TA ${acYear}`;

      const [id] = await db('annual_work_plans').insert({
        school_unit_id: sUnitId,
        academic_year: acYear,
        title,
        parent_rkjm_id: parentRkjm?.id || null,
        current_version: 1,
        status: 'draft',
        created_by: user?.id || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      plan = await db('annual_work_plans').where({ id }).first();
    }

    return plan;
  }

  async listAnnualWorkPlans(query = {}) {
    let q = db('annual_work_plans');
    if (query.context === 'foundation' || query.school_unit_id === 'null') {
      q = q.whereNull('school_unit_id');
    } else if (query.school_unit_id) {
      q = q.where('school_unit_id', Number(query.school_unit_id));
    }
    if (query.academic_year) q = q.where('academic_year', query.academic_year);
    if (query.status) q = q.where('status', query.status);

    return q.orderBy('academic_year', 'desc');
  }

  async getAnnualWorkPlanById(id) {
    const plan = await db('annual_work_plans').where({ id }).first();
    if (!plan) {
      const error = new Error('Dokumen RKT tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return plan;
  }

  async updateAnnualWorkPlan(id, payload) {
    const plan = await db('annual_work_plans').where({ id }).first();
    if (!plan) {
      const error = new Error('Dokumen RKT tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.title) updateData.title = payload.title.trim();
    if (payload.parent_rkjm_id !== undefined) updateData.parent_rkjm_id = payload.parent_rkjm_id || null;
    if (payload.status) updateData.status = payload.status;

    await db('annual_work_plans').where({ id }).update(updateData);
    return db('annual_work_plans').where({ id }).first();
  }

  // ==========================================
  // 3. RKT PROGRAMS ACCORDION WITH ACTIVITIES & COMMITTEES
  // ==========================================
  /**
   * Mengambil daftar program aktif pada tahun ajaran ini (dari annual_program_targets yang target_percent != null)
   * beserta aktivitas dan kepanitiaannya.
   */
  async getRktProgramMatrix(annualWorkPlanId) {
    const awp = await this.getAnnualWorkPlanById(annualWorkPlanId);

    // 1. Ambil program yang ditandai aktif dilaksanakan (is_active = true) untuk satuan pendidikan (atau Yayasan jika null) & tahun ajaran ini
    let targetQuery = db('annual_program_targets')
      .join('rips_programs', 'annual_program_targets.rips_program_id', 'rips_programs.id')
      .where('annual_program_targets.academic_year', awp.academic_year)
      .where((builder) => {
        builder.where('annual_program_targets.is_active', 1)
          .orWhere((sub) => {
            sub.whereNull('annual_program_targets.is_active')
              .whereNotNull('annual_program_targets.target_percent');
          });
      });

    if (awp.school_unit_id) {
      targetQuery = targetQuery.where('annual_program_targets.school_unit_id', awp.school_unit_id);
    } else {
      targetQuery = targetQuery.whereNull('annual_program_targets.school_unit_id');
    }

    const targets = await targetQuery
      .leftJoin('rips_program_categories as pc', 'rips_programs.category_id', 'pc.id')
      .leftJoin('rips_domains as direct_domain', 'rips_programs.domain_id', 'direct_domain.id')
      .leftJoin('rips_subdomains as direct_subdomain', 'rips_programs.subdomain_id', 'direct_subdomain.id')
      .select(
        'annual_program_targets.id as target_id',
        'annual_program_targets.target_percent',
        'annual_program_targets.notes as target_notes',
        'rips_programs.id as program_id',
        'rips_programs.code as program_code',
        'rips_programs.name as program_name',
        'rips_programs.description as program_description',
        'rips_programs.is_flagship',
        'rips_programs.status as program_status',
        'rips_programs.category_id',
        'rips_programs.domain_id as direct_domain_id',
        'rips_programs.subdomain_id as direct_subdomain_id',
        'direct_domain.name as direct_domain_name',
        'direct_subdomain.name as direct_subdomain_name',
        'pc.name as category_name',
        'pc.color as category_color',
        'pc.bg_color as category_bg_color',
        'pc.border_color as category_border_color'
      )
      .orderBy('rips_programs.is_flagship', 'desc')
      .orderBy('rips_programs.order_index', 'asc')
      .orderBy('rips_programs.id', 'asc');

    const programIds = targets.map((t) => t.program_id);

    // Ambil link ke sasaran strategis RIPS & bidang/sub-bidang
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
          'd.order_index as domain_order',
          'g.subdomain_id',
          'sub.name as subdomain_name',
          'sub.order_index as subdomain_order'
        )
        .whereIn('pgl.rips_program_id', programIds);
    }

    // Ambil master domain & subdomain
    const domains = await db('rips_domains').orderBy('order_index', 'asc');
    const subdomains = await db('rips_subdomains').orderBy('order_index', 'asc');

    // 2. Ambil seluruh aktivitas/langkah kegiatan pada RKT ini
    const rawActivities = await db('work_plan_activities')
      .where('annual_work_plan_id', annualWorkPlanId)
      .orderBy('order_index', 'asc')
      .orderBy('id', 'asc');

    const activities = rawActivities.map((a) => {
      let empIds = [];
      if (a.assignee_employee_ids) {
        try {
          empIds = typeof a.assignee_employee_ids === 'string' ? JSON.parse(a.assignee_employee_ids) : a.assignee_employee_ids;
        } catch (e) {
          empIds = [];
        }
      }
      if ((!empIds || empIds.length === 0) && a.assignee_employee_id) {
        empIds = [a.assignee_employee_id];
      }
      return {
        ...a,
        assignee_employee_ids: Array.isArray(empIds) ? empIds.map(Number) : [],
      };
    });

    // 3. Ambil seluruh kepanitiaan pada RKT ini beserta anggotanya
    const committees = await db('program_committees')
      .where('annual_work_plan_id', annualWorkPlanId);

    const committeeIds = committees.map((c) => c.id);
    let members = [];
    if (committeeIds.length > 0) {
      members = await db('program_committee_members')
        .join('committee_position_types', 'program_committee_members.committee_position_type_id', 'committee_position_types.id')
        .whereIn('program_committee_members.program_committee_id', committeeIds)
        .select(
          'program_committee_members.*',
          'committee_position_types.name as position_name',
          'committee_position_types.order_index as position_order'
        )
        .orderBy('committee_position_types.order_index', 'asc');
    }

    // Gabungkan data ke struktur hierarki program
    const programList = targets.map((t) => {
      const progActivities = activities.filter((a) => a.rips_program_id === t.program_id);
      const progCommittee = committees.find((c) => c.rips_program_id === t.program_id) || null;
      const linked = goalLinks.filter((gl) => gl.rips_program_id === t.program_id);

      let committeeWithMembers = null;
      if (progCommittee) {
        committeeWithMembers = {
          ...progCommittee,
          members: members.filter((m) => m.program_committee_id === progCommittee.id),
        };
      }

      // Hitung agregat progress
      const totalAct = progActivities.length;
      const completedAct = progActivities.filter((a) => a.status === 'completed').length;
      const avgProgress = totalAct > 0
        ? Math.round(progActivities.reduce((acc, curr) => acc + (curr.progress_percent || 0), 0) / totalAct)
        : 0;

      return {
        ...t,
        domain_id: t.direct_domain_id || linked[0]?.domain_id || null,
        domain_name: t.direct_domain_name || linked[0]?.domain_name || null,
        subdomain_id: t.direct_subdomain_id || linked[0]?.subdomain_id || null,
        subdomain_name: t.direct_subdomain_name || linked[0]?.subdomain_name || null,
        linked_goals: linked,
        activities: progActivities,
        committee: committeeWithMembers,
        stats: {
          total_activities: totalAct,
          completed_activities: completedAct,
          avg_progress_percent: avgProgress,
        },
      };
    });

    return {
      annual_work_plan: awp,
      programs: programList,
      domains,
      subdomains,
      stats: {
        total_programs: targets.length,
        flagship_programs: targets.filter((p) => p.is_flagship).length,
      },
    };
  }

  // ==========================================
  // 4. WORK PLAN ACTIVITIES (LANGKAH KEGIATAN)
  // ==========================================
  async listActivities(queryOrAwpId = {}, maybeQuery = {}) {
    let query = {};
    let awpId = null;

    if (typeof queryOrAwpId === 'object' && queryOrAwpId !== null) {
      query = queryOrAwpId;
      awpId = query.annual_work_plan_id || null;
    } else {
      awpId = queryOrAwpId;
      query = maybeQuery || {};
    }

    let q = db('work_plan_activities');
    if (awpId) q = q.where('annual_work_plan_id', Number(awpId));
    if (query.rips_program_id) q = q.where('rips_program_id', Number(query.rips_program_id));
    if (query.status) q = q.where('status', query.status);
    if (query.tag) q = q.where('tag', query.tag);
    if (query.assignee_employee_id) q = q.where('assignee_employee_id', Number(query.assignee_employee_id));

    const list = await q.orderBy('order_index', 'asc').orderBy('id', 'asc');
    return list.map((a) => {
      let empIds = [];
      if (a.assignee_employee_ids) {
        try {
          empIds = typeof a.assignee_employee_ids === 'string' ? JSON.parse(a.assignee_employee_ids) : a.assignee_employee_ids;
        } catch (e) {}
      }
      if ((!empIds || empIds.length === 0) && a.assignee_employee_id) {
        empIds = [a.assignee_employee_id];
      }
      return {
        ...a,
        assignee_employee_ids: Array.isArray(empIds) ? empIds.map(Number) : [],
      };
    });
  }

  async createActivity(payload) {
    if (!payload.annual_work_plan_id || !payload.rips_program_id || !payload.title) {
      const error = new Error("annual_work_plan_id, rips_program_id, dan title wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    let assigneeIds = [];
    if (Array.isArray(payload.assignee_employee_ids)) {
      assigneeIds = payload.assignee_employee_ids.map(Number).filter(Boolean);
    } else if (payload.assignee_employee_id) {
      assigneeIds = [Number(payload.assignee_employee_id)];
    }

    const primaryAssigneeId = assigneeIds.length > 0 ? assigneeIds[0] : null;
    const startDate = payload.start_date || payload.activity_date || null;
    const endDate = payload.end_date || startDate || null;
    const activityDate = startDate || null;

    const [id] = await db('work_plan_activities').insert({
      annual_work_plan_id: Number(payload.annual_work_plan_id),
      rips_program_id: Number(payload.rips_program_id),
      parent_activity_id: payload.parent_activity_id ? Number(payload.parent_activity_id) : null,
      title: payload.title.trim(),
      tag: payload.tag || 'lainnya',
      activity_date: activityDate,
      start_date: startDate,
      end_date: endDate,
      assignee_employee_id: primaryAssigneeId,
      assignee_employee_ids: assigneeIds.length > 0 ? JSON.stringify(assigneeIds) : null,
      document_link: payload.document_link || null,
      status: payload.status || 'planned',
      progress_percent: payload.progress_percent !== undefined ? Number(payload.progress_percent) : 0,
      notes: payload.notes || null,
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    const act = await db('work_plan_activities').where({ id }).first();
    let empIds = [];
    if (act.assignee_employee_ids) {
      try {
        empIds = typeof act.assignee_employee_ids === 'string' ? JSON.parse(act.assignee_employee_ids) : act.assignee_employee_ids;
      } catch (e) {}
    }
    if ((!empIds || empIds.length === 0) && act.assignee_employee_id) {
      empIds = [act.assignee_employee_id];
    }
    return {
      ...act,
      assignee_employee_ids: Array.isArray(empIds) ? empIds.map(Number) : [],
    };
  }

  async updateActivity(id, payload) {
    const act = await db('work_plan_activities').where({ id }).first();
    if (!act) {
      const error = new Error('Aktivitas kegiatan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.title) updateData.title = payload.title.trim();
    if (payload.tag) updateData.tag = payload.tag;
    
    if (payload.start_date !== undefined || payload.activity_date !== undefined) {
      const sDate = payload.start_date !== undefined ? payload.start_date : payload.activity_date;
      updateData.start_date = sDate || null;
      updateData.activity_date = sDate || null;
    }
    if (payload.end_date !== undefined) {
      updateData.end_date = payload.end_date || null;
    }
    
    if (payload.assignee_employee_ids !== undefined) {
      const assigneeIds = Array.isArray(payload.assignee_employee_ids)
        ? payload.assignee_employee_ids.map(Number).filter(Boolean)
        : [];
      updateData.assignee_employee_ids = assigneeIds.length > 0 ? JSON.stringify(assigneeIds) : null;
      updateData.assignee_employee_id = assigneeIds.length > 0 ? assigneeIds[0] : null;
    } else if (payload.assignee_employee_id !== undefined) {
      updateData.assignee_employee_id = payload.assignee_employee_id ? Number(payload.assignee_employee_id) : null;
      updateData.assignee_employee_ids = payload.assignee_employee_id ? JSON.stringify([Number(payload.assignee_employee_id)]) : null;
    }

    if (payload.document_link !== undefined) updateData.document_link = payload.document_link || null;
    if (payload.status) updateData.status = payload.status;
    if (payload.progress_percent !== undefined) updateData.progress_percent = Number(payload.progress_percent);
    if (payload.notes !== undefined) updateData.notes = payload.notes || null;
    if (payload.order_index !== undefined) updateData.order_index = Number(payload.order_index);

    await db('work_plan_activities').where({ id }).update(updateData);
    const updated = await db('work_plan_activities').where({ id }).first();
    let empIds = [];
    if (updated.assignee_employee_ids) {
      try {
        empIds = typeof updated.assignee_employee_ids === 'string' ? JSON.parse(updated.assignee_employee_ids) : updated.assignee_employee_ids;
      } catch (e) {}
    }
    if ((!empIds || empIds.length === 0) && updated.assignee_employee_id) {
      empIds = [updated.assignee_employee_id];
    }
    return {
      ...updated,
      assignee_employee_ids: Array.isArray(empIds) ? empIds.map(Number) : [],
    };
  }

  async deleteActivity(id) {
    const act = await db('work_plan_activities').where({ id }).first();
    if (!act) {
      const error = new Error('Aktivitas kegiatan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('work_plan_activities').where({ id }).del();
    return { success: true };
  }

  // ==========================================
  // 5. PROGRAM COMMITTEES & SAHKAN SK
  // ==========================================
  async getOrCreateCommittee(annualWorkPlanId, ripsProgramId) {
    let comm = await db('program_committees')
      .where({
        annual_work_plan_id: Number(annualWorkPlanId),
        rips_program_id: Number(ripsProgramId),
      })
      .first();

    if (!comm) {
      const [id] = await db('program_committees').insert({
        annual_work_plan_id: Number(annualWorkPlanId),
        rips_program_id: Number(ripsProgramId),
        status: 'draft',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
      comm = await db('program_committees').where({ id }).first();
    }

    const members = await db('program_committee_members')
      .join('committee_position_types', 'program_committee_members.committee_position_type_id', 'committee_position_types.id')
      .where('program_committee_members.program_committee_id', comm.id)
      .select(
        'program_committee_members.*',
        'committee_position_types.name as position_name',
        'committee_position_types.order_index as position_order'
      )
      .orderBy('committee_position_types.order_index', 'asc');

    return {
      ...comm,
      members,
    };
  }

  async addCommitteeMember(committeeId, payload) {
    const comm = await db('program_committees').where({ id: committeeId }).first();
    if (!comm) {
      const error = new Error('Kepanitiaan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    if (comm.status === 'disahkan') {
      const error = new Error('Kepanitiaan yang telah disahkan SK-nya tidak dapat diubah lagi');
      error.statusCode = 422;
      throw error;
    }
    if (!payload.committee_position_type_id || !payload.employee_id) {
      const error = new Error('committee_position_type_id dan employee_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('program_committee_members').insert({
      program_committee_id: Number(committeeId),
      committee_position_type_id: Number(payload.committee_position_type_id),
      employee_id: Number(payload.employee_id),
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return db('program_committee_members').where({ id }).first();
  }

  async removeCommitteeMember(memberId) {
    const mem = await db('program_committee_members').where({ id: memberId }).first();
    if (!mem) {
      const error = new Error('Anggota kepanitiaan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const comm = await db('program_committees').where({ id: mem.program_committee_id }).first();
    if (comm && comm.status === 'disahkan') {
      const error = new Error('Kepanitiaan yang telah disahkan SK-nya tidak dapat diubah lagi');
      error.statusCode = 422;
      throw error;
    }

    await db('program_committee_members').where({ id: memberId }).del();
    return { success: true };
  }

  async sahkanCommittee(committeeId, payload) {
    const comm = await db('program_committees').where({ id: committeeId }).first();
    if (!comm) {
      const error = new Error('Kepanitiaan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    if (!payload.sk_number || !payload.sk_date) {
      const error = new Error('Nomor SK dan tanggal SK wajib disertakan');
      error.statusCode = 422;
      throw error;
    }

    await db('program_committees').where({ id: committeeId }).update({
      sk_number: payload.sk_number.trim(),
      sk_date: payload.sk_date,
      sk_file_url: payload.sk_file_url || null,
      status: 'disahkan',
      updated_at: db.fn.now(),
    });

    return db('program_committees').where({ id: committeeId }).first();
  }

  // ==========================================
  // 6. PUBLISH RKT TO DOCUMENT_PUBLICATIONS
  // ==========================================
  async publishAnnualWorkPlan(annualWorkPlanId, payload, user = null) {
    const awp = await this.getAnnualWorkPlanById(annualWorkPlanId);
    const matrixData = await this.getRktProgramMatrix(annualWorkPlanId);

    const currentVersion = awp.current_version || 1;
    const snapshot = {
      annual_work_plan: awp,
      programs: matrixData.programs,
      published_at: new Date().toISOString(),
      published_by_user: user ? { id: user.id, username: user.username, full_name: user.full_name } : null,
    };

    // Archive previous published publications of this RKT
    await db('document_publications')
      .where({
        document_type: 'rkt',
        source_id: annualWorkPlanId,
        status: 'published',
      })
      .update({
        status: 'archived',
        updated_at: db.fn.now(),
      });

    // Insert new publication record
    const [pubId] = await db('document_publications').insert({
      document_type: 'rkt',
      source_id: annualWorkPlanId,
      school_unit_id: awp.school_unit_id,
      version_number: currentVersion,
      document_number: payload.document_number || `SK-RKT/${awp.academic_year.replace('/', '-')}/V${currentVersion}`,
      title: payload.title || `${awp.title} (Versi ${currentVersion})`,
      snapshot_json: JSON.stringify(snapshot),
      change_summary: payload.change_summary || `Penerbitan RKT TA ${awp.academic_year} Versi ${currentVersion}`,
      file_url: payload.file_url || null,
      status: 'published',
      effective_date: payload.effective_date || db.raw('CURDATE()'),
      published_by: user?.id || null,
      published_at: db.fn.now(),
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    // Update annual_work_plans status & increment version
    await db('annual_work_plans')
      .where({ id: annualWorkPlanId })
      .update({
        status: 'published',
        current_version: currentVersion + 1,
        updated_at: db.fn.now(),
      });

    return db('document_publications').where({ id: pubId }).first();
  }

  async getPublications(annualWorkPlanId) {
    return db('document_publications')
      .where({
        document_type: 'rkt',
        source_id: annualWorkPlanId,
      })
      .orderBy('version_number', 'desc');
  }

  // ==========================================
  // 7. RKT PROGRAM MANAGEMENT (ADD FROM RIPS / CREATE NEW)
  // ==========================================
  async getAvailableRipsPrograms(annualWorkPlanId) {
    const awp = await this.getAnnualWorkPlanById(annualWorkPlanId);

    // 1. Temukan dokumen RIPS yang sesuai
    let ripsDocQuery = db('rips_documents');
    if (awp.school_unit_id) {
      ripsDocQuery = ripsDocQuery.where('school_unit_id', awp.school_unit_id);
    } else {
      ripsDocQuery = ripsDocQuery.whereNull('school_unit_id');
    }
    let ripsDoc = await ripsDocQuery.first();
    if (!ripsDoc) {
      ripsDoc = await db('rips_documents').whereNull('school_unit_id').first() || await db('rips_documents').first();
    }

    if (!ripsDoc) return [];

    // 2. Ambil ID program yang SUDAH masuk ke RKT terkait
    let activeTargetsQuery = db('annual_program_targets')
      .where('academic_year', awp.academic_year)
      .where((builder) => {
        builder.where('is_active', 1)
          .orWhere((sub) => {
            sub.whereNull('is_active').whereNotNull('target_percent');
          });
      });

    if (awp.school_unit_id) {
      activeTargetsQuery = activeTargetsQuery.where('school_unit_id', awp.school_unit_id);
    } else {
      activeTargetsQuery = activeTargetsQuery.whereNull('school_unit_id');
    }

    const activeTargets = await activeTargetsQuery.select('rips_program_id');
    const existingProgramIds = activeTargets.map((t) => t.rips_program_id);

    // 3. Ambil semua program di dokumen RIPS terkait yang BELUM masuk ke RKT ini
    let progQuery = db('rips_programs as rp')
      .leftJoin('rips_program_categories as pc', 'rp.category_id', 'pc.id')
      .where('rp.rips_document_id', ripsDoc.id);

    if (existingProgramIds.length > 0) {
      progQuery = progQuery.whereNotIn('rp.id', existingProgramIds);
    }

    const availableProgs = await progQuery
      .select(
        'rp.*',
        'pc.name as category_name',
        'pc.color as category_color',
        'pc.bg_color as category_bg_color',
        'pc.border_color as category_border_color'
      )
      .orderBy('rp.order_index', 'asc')
      .orderBy('rp.id', 'asc');

    const progIds = availableProgs.map((p) => p.id);
    if (progIds.length === 0) return [];

    // Ambil info sasaran & bidang terkait
    const goalLinks = await db('rips_program_goal_links as pgl')
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
      .whereIn('pgl.rips_program_id', progIds);

    return availableProgs.map((p) => {
      const linked = goalLinks.filter((gl) => gl.rips_program_id === p.id);
      return {
        ...p,
        domain_name: linked[0]?.domain_name || null,
        subdomain_name: linked[0]?.subdomain_name || null,
        linked_goals: linked,
      };
    });
  }

  async addProgramToRkt(annualWorkPlanId, payload, user = null) {
    const awp = await this.getAnnualWorkPlanById(annualWorkPlanId);
    const { rips_program_id, target_percent, notes } = payload;

    if (!rips_program_id) {
      const error = new Error('rips_program_id wajib disertakan');
      error.statusCode = 422;
      throw error;
    }

    const prog = await db('rips_programs').where({ id: Number(rips_program_id) }).first();
    if (!prog) {
      const error = new Error('Program RIPS tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    let targetQuery = db('annual_program_targets')
      .where({
        rips_program_id: Number(rips_program_id),
        academic_year: awp.academic_year,
      });

    if (awp.school_unit_id) {
      targetQuery = targetQuery.where('school_unit_id', awp.school_unit_id);
    } else {
      targetQuery = targetQuery.whereNull('school_unit_id');
    }

    let target = await targetQuery.first();

    const targetVal = target_percent !== undefined && target_percent !== '' ? Number(target_percent) : 100;
    const notesVal = notes !== undefined ? notes : null;

    if (payload.subdomain_id || payload.domain_id) {
      let subId = payload.subdomain_id ? Number(payload.subdomain_id) : null;
      let domId = payload.domain_id ? Number(payload.domain_id) : null;
      if (subId && !domId) {
        const sub = await db('rips_subdomains').where({ id: subId }).first();
        if (sub) domId = sub.domain_id;
      }
      const existingProg = await db('rips_programs').where({ id: Number(rips_program_id) }).first();
      if (existingProg && (domId || subId)) {
        await db('rips_programs').where({ id: Number(rips_program_id) }).update({
          domain_id: domId || existingProg.domain_id,
          subdomain_id: subId || existingProg.subdomain_id,
          updated_at: db.fn.now(),
        });
      }
    }

    if (target) {
      await db('annual_program_targets')
        .where({ id: target.id })
        .update({
          is_active: 1,
          target_percent: targetVal,
          notes: notesVal,
          updated_at: db.fn.now(),
        });
    } else {
      const [newId] = await db('annual_program_targets').insert({
        rips_program_id: Number(rips_program_id),
        school_unit_id: awp.school_unit_id,
        academic_year: awp.academic_year,
        target_percent: targetVal,
        notes: notesVal,
        is_active: 1,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
      target = await db('annual_program_targets').where({ id: newId }).first();
    }

    return target;
  }

  async createAndAttachProgramToRkt(annualWorkPlanId, payload, user = null) {
    const awp = await this.getAnnualWorkPlanById(annualWorkPlanId);

    if (!payload.name || !payload.name.trim()) {
      const error = new Error('Nama program wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // 1. Temukan dokumen RIPS terkait
    let ripsDocQuery = db('rips_documents');
    if (awp.school_unit_id) {
      ripsDocQuery = ripsDocQuery.where('school_unit_id', awp.school_unit_id);
    } else {
      ripsDocQuery = ripsDocQuery.whereNull('school_unit_id');
    }
    let ripsDoc = await ripsDocQuery.first();
    if (!ripsDoc) {
      ripsDoc = await db('rips_documents').whereNull('school_unit_id').first() || await db('rips_documents').first();
    }

    if (!ripsDoc) {
      const error = new Error('Dokumen RIPS terkait tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 2. Tentukan kode program jika tidak ada atau jika kode sudah terpakai (hindari duplicate entry)
    let code = payload.code ? payload.code.trim() : '';
    if (code) {
      const existing = await db('rips_programs').where({ code }).first();
      if (existing) {
        code = '';
      }
    }
    if (!code) {
      const progs = await db('rips_programs').select('code');
      let maxNum = 0;
      progs.forEach((p) => {
        const match = p.code?.match(/PRG-(?:UNG-)?(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      let nextNum = maxNum + 1;
      code = `PRG-${String(nextNum).padStart(3, '0')}`;
      while (await db('rips_programs').where({ code }).first()) {
        nextNum++;
        code = `PRG-${String(nextNum).padStart(3, '0')}`;
      }
    }

    let subdomainId = payload.subdomain_id !== undefined && payload.subdomain_id !== '' && payload.subdomain_id !== null ? Number(payload.subdomain_id) : null;
    let domainId = payload.domain_id !== undefined && payload.domain_id !== '' && payload.domain_id !== null ? Number(payload.domain_id) : null;

    if (subdomainId && !domainId) {
      const sub = await db('rips_subdomains').where({ id: subdomainId }).first();
      if (sub) domainId = sub.domain_id;
    }

    const goalIds = Array.isArray(payload.linked_goal_ids) ? payload.linked_goal_ids : [];
    if ((!domainId || !subdomainId) && goalIds.length > 0) {
      const firstGoal = await db('rips_goals').where({ id: Number(goalIds[0]) }).first();
      if (firstGoal) {
        if (!domainId && firstGoal.domain_id) domainId = firstGoal.domain_id;
        if (!subdomainId && firstGoal.subdomain_id) subdomainId = firstGoal.subdomain_id;
      }
    }

    const [progId] = await db('rips_programs').insert({
      rips_document_id: ripsDoc.id,
      category_id: payload.category_id !== undefined && payload.category_id !== '' && payload.category_id !== null ? Number(payload.category_id) : null,
      domain_id: domainId,
      subdomain_id: subdomainId,
      code,
      name: payload.name.trim(),
      description: payload.description || null,
      is_flagship: payload.is_flagship ? 1 : 0,
      order_index: payload.order_index !== undefined ? Number(payload.order_index) : 99,
      status: payload.status || 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    // 3. Link ke sasaran strategis RIPS
    if (goalIds.length > 0) {
      const cleanedGoalIds = goalIds.filter((gid) => gid !== null && gid !== undefined && gid !== '').map(Number);
      if (cleanedGoalIds.length > 0) {
        const validGoals = await db('rips_goals').whereIn('id', cleanedGoalIds).pluck('id');
        if (validGoals.length > 0) {
          const goalInserts = validGoals.map((gid) => ({
            rips_program_id: progId,
            rips_goal_id: Number(gid),
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          }));
          await db('rips_program_goal_links').insert(goalInserts);
        }
      }
    }

    // 4. Link ke indikator spesifik
    const indicatorIds = Array.isArray(payload.linked_indicator_ids) ? payload.linked_indicator_ids : [];
    if (indicatorIds.length > 0) {
      const cleanedIndIds = indicatorIds.filter((iid) => iid !== null && iid !== undefined && iid !== '').map(Number);
      if (cleanedIndIds.length > 0) {
        const validInds = await db('rips_goal_indicators').whereIn('id', cleanedIndIds).pluck('id');
        if (validInds.length > 0) {
          const indInserts = validInds.map((iid) => ({
            rips_program_id: progId,
            rips_goal_indicator_id: Number(iid),
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          }));
          await db('rips_program_indicator_links').insert(indInserts);
        }
      }
    }

    // 5. Tambahkan target dan aktifkan di RKT terkait
    const targetVal = payload.target_percent !== undefined && payload.target_percent !== '' ? Number(payload.target_percent) : 100;
    await db('annual_program_targets').insert({
      rips_program_id: progId,
      school_unit_id: awp.school_unit_id,
      academic_year: awp.academic_year,
      target_percent: targetVal,
      notes: payload.notes || null,
      is_active: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return await db('rips_programs').where({ id: progId }).first();
  }

  async removeProgramFromRkt(annualWorkPlanId, ripsProgramId) {
    const awp = await this.getAnnualWorkPlanById(annualWorkPlanId);

    const actCount = await db('work_plan_activities')
      .where({
        annual_work_plan_id: annualWorkPlanId,
        rips_program_id: Number(ripsProgramId),
      })
      .count('* as total');

    let targetQuery = db('annual_program_targets')
      .where({
        rips_program_id: Number(ripsProgramId),
        academic_year: awp.academic_year,
      });

    if (awp.school_unit_id) {
      targetQuery = targetQuery.where('school_unit_id', awp.school_unit_id);
    } else {
      targetQuery = targetQuery.whereNull('school_unit_id');
    }

    if (actCount[0].total > 0) {
      await targetQuery.update({
        is_active: 0,
        updated_at: db.fn.now(),
      });
    } else {
      await targetQuery.del();
    }

    return { success: true };
  }
}

module.exports = AnnualWorkPlanService;

