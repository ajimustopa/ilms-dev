/**
 * Projects, Tasks & Approvals Service Implementation
 * Modul Manajemen: Tasks (#198), Proyek (#199), Approval Workflow (#200)
 */
const db = require('../../../config/db/manajemen');
const { validateEmployee } = require('../utils/crossModuleHelper');

class ProjectsService {
  // ==========================================
  // 1. Tasks Tracking & Task Hub (#198 & Fitur 10)
  // ==========================================
  async listTasks(schoolUnitId, query = {}, user = null) {
    let q = db('tasks as t')
      .leftJoin('projects as p', 't.project_id', 'p.id')
      .where(function () {
        if (schoolUnitId) this.where('t.school_unit_id', schoolUnitId);
      });

    if (query.project_id) q = q.where('t.project_id', query.project_id);
    if (query.assignee_employee_id) q = q.where('t.assignee_employee_id', query.assignee_employee_id);
    if (query.status) q = q.where('t.status', query.status);
    if (query.priority) q = q.where('t.priority', query.priority);
    if (query.reference_type) q = q.where('t.reference_type', query.reference_type);
    if (query.reference_id) q = q.where('t.reference_id', query.reference_id);

    // Time Filters (Semua, Hari Ini, Terlewat, Besok, Pekan Ini)
    if (query.time_filter && query.time_filter !== 'all') {
      const today = new Date().toISOString().slice(0, 10);
      if (query.time_filter === 'today') {
        q = q.where('t.due_date', today);
      } else if (query.time_filter === 'overdue') {
        q = q.where('t.due_date', '<', today).whereNot('t.status', 'done');
      } else if (query.time_filter === 'tomorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const tomorrow = d.toISOString().slice(0, 10);
        q = q.where('t.due_date', tomorrow);
      } else if (query.time_filter === 'week') {
        const d1 = new Date();
        const d2 = new Date();
        d2.setDate(d2.getDate() + 7);
        q = q.whereBetween('t.due_date', [d1.toISOString().slice(0, 10), d2.toISOString().slice(0, 10)]);
      }
    }

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('t.title', 'like', s)
          .orWhere('t.description', 'like', s)
          .orWhere('t.relation_name', 'like', s)
          .orWhere('t.relation_code', 'like', s);
      });
    }

    const items = await q
      .select('t.*', 'p.name as project_name')
      .orderBy('t.id', 'desc');

    // Attach checklists summary & assignee
    const taskIds = items.map(i => i.id);
    let checklistsMap = {};
    if (taskIds.length > 0) {
      try {
        const chks = await db('task_checklists').whereIn('task_id', taskIds);
        chks.forEach(c => {
          if (!checklistsMap[c.task_id]) checklistsMap[c.task_id] = { total: 0, completed: 0 };
          checklistsMap[c.task_id].total++;
          if (c.is_completed) checklistsMap[c.task_id].completed++;
        });
      } catch (e) {}
    }

    return await Promise.all(
      items.map(async (item) => {
        let assignee = null;
        try {
          assignee = await validateEmployee(item.assignee_employee_id);
        } catch (e) {
          assignee = { id: item.assignee_employee_id, full_name: `Pegawai #${item.assignee_employee_id}` };
        }
        return {
          ...item,
          assignee_name: assignee?.full_name || `Pegawai #${item.assignee_employee_id}`,
          checklists_summary: checklistsMap[item.id] || { total: 0, completed: 0 }
        };
      })
    );
  }

  async getTaskById(id) {
    const item = await db('tasks as t')
      .leftJoin('projects as p', 't.project_id', 'p.id')
      .where('t.id', id)
      .select('t.*', 'p.name as project_name')
      .first();

    if (!item) {
      const err = new Error('Tugas (task) tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // Checklists
    const checklists = await db('task_checklists').where({ task_id: id }).orderBy('order_index', 'asc').orderBy('id', 'asc');

    // Comments
    const comments = await db('task_comments').where({ task_id: id }).orderBy('created_at', 'asc');
    const enrichedComments = await Promise.all(
      comments.map(async (c) => {
        let emp = null;
        try {
          emp = await validateEmployee(c.employee_id);
        } catch (e) {
          emp = { id: c.employee_id, full_name: `Pegawai #${c.employee_id}` };
        }
        return {
          ...c,
          employee_name: emp?.full_name || `Pegawai #${c.employee_id}`,
        };
      })
    );

    // Assignee
    let assignee = null;
    try {
      assignee = await validateEmployee(item.assignee_employee_id);
    } catch (e) {
      assignee = { id: item.assignee_employee_id, full_name: `Pegawai #${item.assignee_employee_id}` };
    }

    // Planning Hierarchy Lookup (Renstra -> Sasaran -> RKT -> Program -> Renop Kegiatan)
    let planning_hierarchy = null;
    if (item.reference_type === 'renop_activity' && item.reference_id) {
      try {
        const act = await db('work_plan_activities as act')
          .leftJoin('work_plan_programs as prg', 'act.work_plan_program_id', 'prg.id')
          .leftJoin('school_work_plans as rkt', 'prg.school_work_plan_id', 'rkt.id')
          .leftJoin('strategic_goals as sg', 'prg.strategic_goal_id', 'sg.id')
          .where('act.id', item.reference_id)
          .select(
            'act.name as activity_name',
            'act.code as activity_code',
            'prg.title as program_title',
            'prg.code as program_code',
            'rkt.title as rkt_title',
            'sg.name as strategic_goal_name',
            'sg.perspective as strategic_goal_perspective'
          )
          .first();

        if (act) {
          planning_hierarchy = {
            strategic_goal_name: act.strategic_goal_name || 'Sasaran Mutu Kelembagaan',
            rkt_title: act.rkt_title || 'Rencana Kerja Tahunan',
            program_title: act.program_title || 'Program Kerja',
            activity_name: act.activity_name || 'Kegiatan Renop Operasional',
            chain: `Sasaran: ${act.strategic_goal_name || '-'} ➔ Program: ${act.program_title || '-'} ➔ Renop: ${act.activity_name || '-'}`
          };
        }
      } catch (e) {}
    } else if (item.reference_type === 'program' && item.reference_id) {
      try {
        const prg = await db('work_plan_programs as prg')
          .leftJoin('strategic_goals as sg', 'prg.strategic_goal_id', 'sg.id')
          .where('prg.id', item.reference_id)
          .select('prg.title as program_title', 'sg.name as strategic_goal_name')
          .first();
        if (prg) {
          planning_hierarchy = {
            program_title: prg.program_title,
            strategic_goal_name: prg.strategic_goal_name,
            chain: `Sasaran: ${prg.strategic_goal_name || '-'} ➔ Program: ${prg.program_title}`
          };
        }
      } catch (e) {}
    }

    return {
      ...item,
      assignee_name: assignee?.full_name || `Pegawai #${item.assignee_employee_id}`,
      checklists: checklists || [],
      comments: enrichedComments,
      planning_hierarchy
    };
  }

  async createTask(data, userId) {
    await validateEmployee(data.assignee_employee_id);

    const [id] = await db('tasks').insert({
      school_unit_id: data.school_unit_id || 1,
      project_id: data.project_id || null,
      reference_type: data.reference_type || null,
      reference_id: data.reference_id ? Number(data.reference_id) : null,
      relation_code: data.relation_code || null,
      relation_name: data.relation_name || null,
      title: data.title,
      description: data.description || null,
      assignee_employee_id: data.assignee_employee_id,
      created_by: userId || 1,
      priority: data.priority || 'medium',
      status: data.status || 'todo',
      due_date: data.due_date || null,
      start_date: data.start_date || null,
      progress_percent: data.progress_percent !== undefined ? Number(data.progress_percent) : 0,
    });

    // Create initial checklists if provided
    if (data.checklists && Array.isArray(data.checklists)) {
      for (let idx = 0; idx < data.checklists.length; idx++) {
        const chk = data.checklists[idx];
        const title = typeof chk === 'string' ? chk : chk.title;
        if (title && title.trim()) {
          await db('task_checklists').insert({
            task_id: id,
            title: title.trim(),
            order_index: idx,
            is_completed: false
          });
        }
      }
    }

    return this.getTaskById(id);
  }

  async updateTask(id, data, userId) {
    const item = await this.getTaskById(id);
    if (data.assignee_employee_id) {
      await validateEmployee(data.assignee_employee_id);
    }

    const nextStatus = data.status !== undefined ? data.status : item.status;
    const completedAt = nextStatus === 'done' ? (item.completed_at || new Date()) : null;

    await db('tasks')
      .where({ id })
      .update({
        project_id: data.project_id !== undefined ? data.project_id : item.project_id,
        reference_type: data.reference_type !== undefined ? data.reference_type : item.reference_type,
        reference_id: data.reference_id !== undefined ? (data.reference_id ? Number(data.reference_id) : null) : item.reference_id,
        relation_code: data.relation_code !== undefined ? data.relation_code : item.relation_code,
        relation_name: data.relation_name !== undefined ? data.relation_name : item.relation_name,
        title: data.title !== undefined ? data.title : item.title,
        description: data.description !== undefined ? data.description : item.description,
        assignee_employee_id:
          data.assignee_employee_id !== undefined ? data.assignee_employee_id : item.assignee_employee_id,
        priority: data.priority !== undefined ? data.priority : item.priority,
        status: nextStatus,
        due_date: data.due_date !== undefined ? data.due_date : item.due_date,
        start_date: data.start_date !== undefined ? data.start_date : item.start_date,
        progress_percent: data.progress_percent !== undefined ? Number(data.progress_percent) : item.progress_percent,
        completed_at: completedAt,
      });

    return this.getTaskById(id);
  }

  async updateTaskStatus(id, status, userId) {
    await this.getTaskById(id);
    const completedAt = status === 'done' ? new Date() : null;
    const progress = status === 'done' ? 100 : status === 'todo' ? 0 : 50;

    await db('tasks').where({ id }).update({
      status,
      completed_at: completedAt,
      progress_percent: progress
    });
    return this.getTaskById(id);
  }

  async deleteTask(id) {
    const item = await db('tasks').where({ id }).first();
    if (!item) {
      const err = new Error('Tugas tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('tasks').where({ id }).delete();
    return { success: true, message: 'Tugas berhasil dihapus' };
  }

  // ==========================================
  // Checklists (#Fitur 10)
  // ==========================================
  async createTaskChecklist(taskId, title, orderIndex = 0) {
    if (!title || !title.trim()) {
      const err = new Error('Judul checklist wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const [id] = await db('task_checklists').insert({
      task_id: taskId,
      title: title.trim(),
      order_index: orderIndex,
      is_completed: false,
    });

    return this.getTaskById(taskId);
  }

  async toggleTaskChecklist(checklistId, isCompleted, userId) {
    const chk = await db('task_checklists').where({ id: checklistId }).first();
    if (!chk) {
      const err = new Error('Checklist tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const completed = isCompleted !== undefined ? Boolean(isCompleted) : !chk.is_completed;
    await db('task_checklists').where({ id: checklistId }).update({
      is_completed: completed,
      completed_at: completed ? new Date() : null,
      completed_by: completed ? (userId || 1) : null,
    });

    // Auto-calculate Task progress percent
    const allChecklists = await db('task_checklists').where({ task_id: chk.task_id });
    if (allChecklists.length > 0) {
      const completedCount = allChecklists.filter(c => c.is_completed).length;
      const progress = Math.round((completedCount / allChecklists.length) * 100);
      const nextStatus = progress === 100 ? 'done' : progress > 0 ? 'in_progress' : 'todo';
      await db('tasks').where({ id: chk.task_id }).update({
        progress_percent: progress,
        status: nextStatus,
        completed_at: progress === 100 ? new Date() : null
      });
    }

    return this.getTaskById(chk.task_id);
  }

  async deleteTaskChecklist(checklistId) {
    const chk = await db('task_checklists').where({ id: checklistId }).first();
    if (!chk) {
      const err = new Error('Checklist tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('task_checklists').where({ id: checklistId }).delete();

    // Recalculate Task progress
    const allChecklists = await db('task_checklists').where({ task_id: chk.task_id });
    const completedCount = allChecklists.filter(c => c.is_completed).length;
    const progress = allChecklists.length > 0 ? Math.round((completedCount / allChecklists.length) * 100) : 0;
    await db('tasks').where({ id: chk.task_id }).update({ progress_percent: progress });

    return this.getTaskById(chk.task_id);
  }

  async addComment(taskId, data, userId) {
    await this.getTaskById(taskId);
    const employeeId = data.employee_id || userId || 1;

    const [id] = await db('task_comments').insert({
      task_id: taskId,
      employee_id: employeeId,
      comment: data.comment,
    });

    return db('task_comments').where({ id }).first();
  }

  // ==========================================
  // 2. Projects - #199
  // ==========================================
  async listProjects(schoolUnitId, query = {}) {
    let q = db('projects').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });

    if (query.status) q = q.where('status', query.status);
    if (query.pic_employee_id) q = q.where('pic_employee_id', query.pic_employee_id);
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('name', 'like', s).orWhere('description', 'like', s);
      });
    }

    const items = await q.orderBy('id', 'desc');

    return await Promise.all(
      items.map(async (item) => {
        let pic = null;
        try {
          pic = await validateEmployee(item.pic_employee_id);
        } catch (e) {
          pic = { id: item.pic_employee_id, full_name: `PIC #${item.pic_employee_id}` };
        }
        return {
          ...item,
          pic_name: pic?.full_name || `PIC #${item.pic_employee_id}`,
        };
      })
    );
  }

  async getProjectById(id) {
    const item = await db('projects').where({ id }).first();
    if (!item) {
      const err = new Error('Proyek tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const members = await db('project_members').where({ project_id: id }).orderBy('id', 'asc');
    const enrichedMembers = await Promise.all(
      members.map(async (m) => {
        let emp = null;
        try {
          emp = await validateEmployee(m.employee_id);
        } catch (e) {
          emp = { id: m.employee_id, full_name: `Pegawai #${m.employee_id}` };
        }
        return {
          ...m,
          employee_name: emp?.full_name || `Pegawai #${m.employee_id}`,
        };
      })
    );

    const tasks = await db('tasks').where({ project_id: id }).orderBy('id', 'asc');

    let pic = null;
    try {
      pic = await validateEmployee(item.pic_employee_id);
    } catch (e) {
      pic = { id: item.pic_employee_id, full_name: `PIC #${item.pic_employee_id}` };
    }

    return {
      ...item,
      pic_name: pic?.full_name || `PIC #${item.pic_employee_id}`,
      members: enrichedMembers,
      tasks,
    };
  }

  async createProject(data) {
    await validateEmployee(data.pic_employee_id);

    const [id] = await db('projects').insert({
      school_unit_id: data.school_unit_id || 1,
      name: data.name,
      description: data.description || null,
      pic_employee_id: data.pic_employee_id,
      budget_reference: data.budget_reference || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      status: 'planning',
    });

    // Otomatis masukkan PIC sebagai member ketua
    await db('project_members').insert({
      project_id: id,
      employee_id: data.pic_employee_id,
      role_in_project: 'Ketua Tim Proyek',
    });

    return this.getProjectById(id);
  }

  async updateProject(id, data) {
    const item = await this.getProjectById(id);
    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    await db('projects')
      .where({ id })
      .update({
        name: data.name !== undefined ? data.name : item.name,
        description: data.description !== undefined ? data.description : item.description,
        pic_employee_id: data.pic_employee_id !== undefined ? data.pic_employee_id : item.pic_employee_id,
        budget_reference:
          data.budget_reference !== undefined ? data.budget_reference : item.budget_reference,
        start_date: data.start_date !== undefined ? data.start_date : item.start_date,
        end_date: data.end_date !== undefined ? data.end_date : item.end_date,
      });

    return this.getProjectById(id);
  }

  async updateProjectStatus(id, status) {
    await this.getProjectById(id);
    await db('projects').where({ id }).update({ status });
    return this.getProjectById(id);
  }

  async addProjectMember(projectId, data) {
    await this.getProjectById(projectId);
    await validateEmployee(data.employee_id);

    const existing = await db('project_members')
      .where({ project_id: projectId, employee_id: data.employee_id })
      .first();

    if (existing) {
      const err = new Error('Pegawai sudah menjadi anggota proyek ini');
      err.statusCode = 409;
      throw err;
    }

    const [id] = await db('project_members').insert({
      project_id: projectId,
      employee_id: data.employee_id,
      role_in_project: data.role_in_project || 'Anggota Tim',
    });

    return db('project_members').where({ id }).first();
  }

  async removeProjectMember(projectId, employeeId) {
    await this.getProjectById(projectId);
    await db('project_members').where({ project_id: projectId, employee_id: employeeId }).del();
    return { project_id: Number(projectId), employee_id: Number(employeeId), removed: true };
  }

  // ==========================================
  // 3. Approval Workflows & Approval Center - #200 (Fitur 13)
  // ==========================================

  // Resolve generic document title, code, and type
  async resolveDocumentMeta(referenceType, referenceId) {
    if (!referenceType || !referenceId) return { document_title: 'Dokumen Perencanaan', document_code: '-', document_type_label: 'Umum' };

    try {
      if (referenceType === 'institution_development_plan') {
        const item = await db('institution_development_plans').where({ id: referenceId }).first();
        if (item) {
          const typeLabel = (item.plan_type || item.type || 'Renstra').toUpperCase();
          return {
            document_title: item.title || item.name || 'Rencana Pengembangan Sekolah',
            document_code: item.code || typeLabel,
            document_type_label: `Dokumen ${typeLabel}`,
            school_unit_id: item.school_unit_id
          };
        }
      } else if (referenceType === 'school_work_plan') {
        const item = await db('school_work_plans').where({ id: referenceId }).first();
        if (item) {
          return {
            document_title: item.title || item.name || 'Rencana Kerja Tahunan',
            document_code: item.code || 'RKT',
            document_type_label: 'Rencana Kerja Tahunan (RKT)',
            school_unit_id: item.school_unit_id
          };
        }
      } else if (referenceType === 'work_plan_program') {
        const item = await db('work_plan_programs').where({ id: referenceId }).first();
        if (item) {
          return {
            document_title: item.title || item.name || 'Program Kerja',
            document_code: item.code || 'PRG',
            document_type_label: item.is_priority ? 'Program Prioritas' : 'Program Kerja',
            school_unit_id: item.school_unit_id
          };
        }
      } else if (referenceType === 'work_plan_activity') {
        const item = await db('work_plan_activities').where({ id: referenceId }).first();
        if (item) {
          return {
            document_title: item.name || 'Kegiatan Renop',
            document_code: item.code || 'RENOP',
            document_type_label: 'Kegiatan Operasional (Renop)'
          };
        }
      } else if (referenceType === 'quality_goal') {
        const item = await db('quality_goals').where({ id: referenceId }).first();
        if (item) {
          return {
            document_title: item.name || 'Sasaran Mutu',
            document_code: item.code || 'MUTU',
            document_type_label: 'Sasaran Mutu Satuan Pendidikan',
            school_unit_id: item.school_unit_id
          };
        }
      } else if (referenceType === 'evaluation_follow_up') {
        const item = await db('evaluation_follow_ups').where({ id: referenceId }).first();
        if (item) {
          return {
            document_title: item.action_plan || item.issue || 'Rencana Tindak Lanjut',
            document_code: item.source_code || 'RTL',
            document_type_label: 'Rencana Tindak Lanjut (RTL)',
            school_unit_id: item.school_unit_id
          };
        }
      }
    } catch (e) {
      console.warn('Error resolving document meta:', e.message);
    }

    return {
      document_title: `Dokumen #${referenceId}`,
      document_code: referenceType,
      document_type_label: referenceType
    };
  }

  // Ensure default approval workflows exist
  async ensureDefaultWorkflows(schoolUnitId) {
    const countRes = await db('approval_workflows').count('id as cnt').first();
    const cnt = Number(countRes?.cnt) || 0;
    if (cnt > 0) return;

    // 1. Alur Pengesahan Renstra & RPS
    const [wf1] = await db('approval_workflows').insert({
      school_unit_id: schoolUnitId || null,
      name: 'Alur Pengesahan Renstra, RPS & RJJP',
      applies_to: 'institution_development_plan',
      description: 'Persetujuan 3 jenjang dokumen perencanaan jangka panjang: Tim Perumus -> Kepala Sekolah -> Dewan Pengurus Yayasan'
    });
    await db('approval_steps').insert([
      { approval_workflow_id: wf1, step_order: 1, approver_job_position_id: null, approver_employee_id: 1 },
      { approval_workflow_id: wf1, step_order: 2, approver_job_position_id: null, approver_employee_id: 2 },
      { approval_workflow_id: wf1, step_order: 3, approver_job_position_id: null, approver_employee_id: 3 }
    ]);

    // 2. Alur Pengesahan RKT
    const [wf2] = await db('approval_workflows').insert({
      school_unit_id: schoolUnitId || null,
      name: 'Alur Pengesahan Rencana Kerja Tahunan (RKT)',
      applies_to: 'school_work_plan',
      description: 'Persetujuan tahunan: Waka Perencanaan -> Kepala Satuan Pendidikan'
    });
    await db('approval_steps').insert([
      { approval_workflow_id: wf2, step_order: 1, approver_job_position_id: null, approver_employee_id: 1 },
      { approval_workflow_id: wf2, step_order: 2, approver_job_position_id: null, approver_employee_id: 2 }
    ]);

    // 3. Alur Pengesahan Program Kerja & Prioritas
    const [wf3] = await db('approval_workflows').insert({
      school_unit_id: schoolUnitId || null,
      name: 'Alur Pengesahan Program Kerja & Anggaran',
      applies_to: 'work_plan_program',
      description: 'Persetujuan program kerja & estimasi pagu anggaran: PIC Program -> Kepala Satuan Pendidikan'
    });
    await db('approval_steps').insert([
      { approval_workflow_id: wf3, step_order: 1, approver_job_position_id: null, approver_employee_id: 1 },
      { approval_workflow_id: wf3, step_order: 2, approver_job_position_id: null, approver_employee_id: 2 }
    ]);

    // 4. Alur Verifikasi RTL & Evaluasi
    const [wf4] = await db('approval_workflows').insert({
      school_unit_id: schoolUnitId || null,
      name: 'Alur Verifikasi Rencana Tindak Lanjut (RTL)',
      applies_to: 'evaluation_follow_up',
      description: 'Validasi ketuntasan tindak lanjut temuan evaluasi: Koordinator Mutu -> Kepala Sekolah'
    });
    await db('approval_steps').insert([
      { approval_workflow_id: wf4, step_order: 1, approver_job_position_id: null, approver_employee_id: 1 },
      { approval_workflow_id: wf4, step_order: 2, approver_job_position_id: null, approver_employee_id: 2 }
    ]);
  }

  async listWorkflows(schoolUnitId) {
    await this.ensureDefaultWorkflows(schoolUnitId);

    let q = db('approval_workflows').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId).orWhereNull('school_unit_id');
    });

    const workflows = await q.orderBy('id', 'asc');
    return await Promise.all(
      workflows.map(async (wf) => {
        const steps = await db('approval_steps')
          .where({ approval_workflow_id: wf.id })
          .orderBy('step_order', 'asc');

        // Lookup employee names
        const empIds = steps.filter(s => s.approver_employee_id).map(s => s.approver_employee_id);
        let empMap = {};
        if (empIds.length > 0) {
          try {
            const emps = await dbKepegawaian('employees').whereIn('id', empIds).select('id', 'full_name');
            emps.forEach(e => { empMap[e.id] = e.full_name; });
          } catch (e) {}
        }

        const enrichedSteps = steps.map(s => ({
          ...s,
          approver_name: empMap[s.approver_employee_id] || (s.approver_employee_id ? `Pegawai #${s.approver_employee_id}` : (s.approver_job_position_id ? `Jabatan #${s.approver_job_position_id}` : 'Approver'))
        }));

        return { ...wf, steps: enrichedSteps };
      })
    );
  }

  async createWorkflow(data) {
    const [id] = await db('approval_workflows').insert({
      school_unit_id: data.school_unit_id || null,
      name: data.name,
      applies_to: data.applies_to || 'general',
      description: data.description || null,
    });

    if (Array.isArray(data.steps) && data.steps.length > 0) {
      for (const step of data.steps) {
        await db('approval_steps').insert({
          approval_workflow_id: id,
          step_order: step.step_order,
          approver_job_position_id: step.approver_job_position_id || null,
          approver_employee_id: step.approver_employee_id || null,
        });
      }
    }

    return this.listWorkflows(data.school_unit_id).then(wfs => wfs.find(w => w.id === id));
  }

  async deleteWorkflow(id) {
    const wf = await db('approval_workflows').where({ id }).first();
    if (!wf) {
      const err = new Error('Workflow tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    await db('approval_workflows').where({ id }).delete();
    return { success: true, message: 'Workflow persetujuan berhasil dihapus' };
  }

  async listApprovalRequests(schoolUnitId, query = {}, user = null) {
    await this.ensureDefaultWorkflows(schoolUnitId);

    let q = db('approval_requests as ar')
      .leftJoin('approval_workflows as aw', 'ar.approval_workflow_id', 'aw.id')
      .where(function () {
        if (schoolUnitId) this.where('ar.school_unit_id', schoolUnitId);
      });

    if (query.status && query.status !== 'all') q = q.where('ar.status', query.status);
    if (query.reference_type && query.reference_type !== 'all') q = q.where('ar.reference_type', query.reference_type);

    const items = await q
      .select('ar.*', 'aw.name as workflow_name', 'aw.applies_to as workflow_applies_to')
      .orderBy('ar.id', 'desc');

    // Collect Requester IDs
    const empIds = [...new Set(items.map(i => i.requested_by_employee_id).filter(Boolean))];
    let empMap = {};
    if (empIds.length > 0) {
      try {
        const emps = await dbKepegawaian('employees').whereIn('id', empIds).select('id', 'full_name');
        emps.forEach(e => { empMap[e.id] = e.full_name; });
      } catch (e) {}
    }

    return await Promise.all(
      items.map(async (item) => {
        const docMeta = await this.resolveDocumentMeta(item.reference_type, item.reference_id);
        const steps = await db('approval_steps')
          .where({ approval_workflow_id: item.approval_workflow_id })
          .orderBy('step_order', 'asc');

        const currentStepObj = steps.find(s => s.step_order === item.current_step);

        return {
          ...item,
          ...docMeta,
          requester_name: empMap[item.requested_by_employee_id] || `Pemohon #${item.requested_by_employee_id}`,
          total_steps: steps.length,
          current_step_order: item.current_step,
          current_approver_employee_id: currentStepObj?.approver_employee_id || null,
        };
      })
    );
  }

  async getApprovalRequestById(id) {
    const item = await db('approval_requests as ar')
      .leftJoin('approval_workflows as aw', 'ar.approval_workflow_id', 'aw.id')
      .where('ar.id', id)
      .select('ar.*', 'aw.name as workflow_name', 'aw.description as workflow_description', 'aw.applies_to as workflow_applies_to')
      .first();

    if (!item) {
      const err = new Error('Pengajuan persetujuan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const docMeta = await this.resolveDocumentMeta(item.reference_type, item.reference_id);
    const steps = await db('approval_steps')
      .where({ approval_workflow_id: item.approval_workflow_id })
      .orderBy('step_order', 'asc');

    const actions = await this.getApprovalRequestActions(id);

    let requester_name = `Pemohon #${item.requested_by_employee_id}`;
    if (item.requested_by_employee_id) {
      try {
        const emp = await dbKepegawaian('employees').where({ id: item.requested_by_employee_id }).first();
        if (emp) requester_name = emp.full_name;
      } catch (e) {}
    }

    return {
      ...item,
      ...docMeta,
      requester_name,
      steps,
      total_steps: steps.length,
      actions
    };
  }

  async createApprovalRequest(data, user) {
    const workflow = await db('approval_workflows').where({ id: data.approval_workflow_id }).first();
    if (!workflow) {
      const err = new Error('Template workflow persetujuan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const requestedBy = data.requested_by_employee_id || user?.employee_id || user?.id || 1;

    const [id] = await db('approval_requests').insert({
      approval_workflow_id: data.approval_workflow_id,
      school_unit_id: data.school_unit_id || 1,
      reference_type: data.reference_type,
      reference_id: data.reference_id,
      requested_by_employee_id: requestedBy,
      current_step: 1,
      status: 'pending',
    });

    // Catat log pengajuan awal (submitted)
    await db('approval_actions').insert({
      approval_request_id: id,
      approval_step_id: 1,
      approver_employee_id: requestedBy,
      action: 'returned', // atau draft submission log
      notes: data.notes || 'Pengajuan persetujuan baru diajukan',
      acted_at: new Date(),
    }).catch(() => {});

    return this.getApprovalRequestById(id);
  }

  async actOnApprovalRequest(id, data, user) {
    const request = await db('approval_requests').where({ id }).first();
    if (!request) {
      const err = new Error('Pengajuan persetujuan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (request.status !== 'pending') {
      const err = new Error(`Pengajuan ini sudah berstatus ${request.status}`);
      err.statusCode = 422;
      throw err;
    }

    const step = await db('approval_steps')
      .where({ approval_workflow_id: request.approval_workflow_id, step_order: request.current_step })
      .first();

    const approverId = data.approver_employee_id || user?.employee_id || user?.id || 1;
    const action = data.action; // 'approved' | 'rejected' | 'returned'

    // Catat log approval (append-only)
    await db('approval_actions').insert({
      approval_request_id: id,
      approval_step_id: step ? step.id : 1,
      approver_employee_id: approverId,
      action: action,
      notes: data.notes || null,
      acted_at: new Date(),
    });

    if (action === 'rejected') {
      await db('approval_requests').where({ id }).update({ status: 'rejected' });
    } else if (action === 'returned') {
      await db('approval_requests').where({ id }).update({ current_step: 1 });
    } else if (action === 'approved') {
      // Cek apakah masih ada step berikutnya
      const nextStep = await db('approval_steps')
        .where({ approval_workflow_id: request.approval_workflow_id, step_order: request.current_step + 1 })
        .first();

      if (nextStep) {
        await db('approval_requests').where({ id }).update({ current_step: request.current_step + 1 });
      } else {
        await db('approval_requests').where({ id }).update({ status: 'approved' });
      }
    }

    return this.getApprovalRequestById(id);
  }

  async resubmitApprovalRequest(id, data, user) {
    const request = await db('approval_requests').where({ id }).first();
    if (!request) {
      const err = new Error('Pengajuan persetujuan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const requesterId = user?.employee_id || user?.id || request.requested_by_employee_id;

    // Reset status back to pending and current_step to 1
    await db('approval_requests').where({ id }).update({
      status: 'pending',
      current_step: 1,
    });

    // Catat log tindakan resubmit
    const step1 = await db('approval_steps')
      .where({ approval_workflow_id: request.approval_workflow_id, step_order: 1 })
      .first();

    await db('approval_actions').insert({
      approval_request_id: id,
      approval_step_id: step1 ? step1.id : 1,
      approver_employee_id: requesterId,
      action: 'returned',
      notes: data.notes || 'Dokumen telah diperbaiki dan diajukan ulang (Resubmitted)',
      acted_at: new Date(),
    });

    return this.getApprovalRequestById(id);
  }

  async getApprovalRequestActions(id) {
    const actions = await db('approval_actions as aa')
      .leftJoin('approval_steps as as_step', 'aa.approval_step_id', 'as_step.id')
      .where('aa.approval_request_id', id)
      .select('aa.*', 'as_step.step_order')
      .orderBy('aa.acted_at', 'asc');

    const empIds = [...new Set(actions.map(a => a.approver_employee_id).filter(Boolean))];
    let empMap = {};
    if (empIds.length > 0) {
      try {
        const emps = await dbKepegawaian('employees').whereIn('id', empIds).select('id', 'full_name');
        emps.forEach(e => { empMap[e.id] = e.full_name; });
      } catch (e) {}
    }

    return actions.map(a => ({
      ...a,
      approver_name: empMap[a.approver_employee_id] || `Approver #${a.approver_employee_id}`,
    }));
  }

  // ==========================================
  // 4. TIMELINE, KALENDER, AGENDA & REMINDER (#FITUR 11)
  // ==========================================

  // Hierarchical Gantt (Program -> Kegiatan -> Task)
  async getHierarchicalTimeline(schoolUnitId) {
    let progQ = db('work_plan_programs as prg')
      .leftJoin('school_work_plans as rkt', 'prg.school_work_plan_id', 'rkt.id')
      .leftJoin('strategic_goals as sg', 'prg.strategic_goal_id', 'sg.id');

    if (schoolUnitId) progQ = progQ.where('rkt.school_unit_id', schoolUnitId);

    const programs = await progQ.select(
      'prg.*',
      'rkt.title as rkt_title',
      'rkt.school_unit_id',
      'sg.name as strategic_goal_name'
    ).orderBy('prg.id', 'asc');

    // Get all activities
    const programIds = programs.map(p => p.id);
    let activities = [];
    if (programIds.length > 0) {
      activities = await db('work_plan_activities')
        .whereIn('work_plan_program_id', programIds)
        .orderBy('id', 'asc');
    }

    // Get all tasks
    const actIds = activities.map(a => a.id);
    let tasks = [];
    if (actIds.length > 0 || programIds.length > 0) {
      tasks = await db('tasks')
        .where(function () {
          if (actIds.length > 0) this.whereIn('reference_id', actIds).andWhere('reference_type', 'renop_activity');
          if (programIds.length > 0) this.orWhere(function() {
            this.whereIn('reference_id', programIds).andWhere('reference_type', 'program');
          });
        })
        .orderBy('id', 'asc');
    }

    // Lookup PIC employees
    const empIds = [...new Set([
      ...programs.filter(p => p.pic_employee_id).map(p => p.pic_employee_id),
      ...activities.filter(a => a.pic_employee_id).map(a => a.pic_employee_id),
      ...tasks.filter(t => t.assignee_employee_id).map(t => t.assignee_employee_id)
    ])];

    let empMap = {};
    if (empIds.length > 0) {
      try {
        const { dbKepegawaian } = require('../utils/crossModuleHelper');
        const emps = await dbKepegawaian('employees').whereIn('id', empIds).select('id', 'full_name');
        emps.forEach(e => { empMap[e.id] = e.full_name; });
      } catch (e) {}
    }

    // Build hierarchy tree
    const tree = programs.map((p) => {
      const pActivities = activities.filter(a => a.work_plan_program_id === p.id).map(a => {
        const aTasks = tasks.filter(t => t.reference_type === 'renop_activity' && String(t.reference_id) === String(a.id)).map(t => ({
          ...t,
          assignee_name: empMap[t.assignee_employee_id] || (t.assignee_employee_id ? `Pegawai #${t.assignee_employee_id}` : null)
        }));

        return {
          ...a,
          pic_name: empMap[a.pic_employee_id] || (a.pic_employee_id ? `Pegawai #${a.pic_employee_id}` : null),
          tasks: aTasks
        };
      });

      const pDirectTasks = tasks.filter(t => t.reference_type === 'program' && String(t.reference_id) === String(p.id)).map(t => ({
        ...t,
        assignee_name: empMap[t.assignee_employee_id] || (t.assignee_employee_id ? `Pegawai #${t.assignee_employee_id}` : null)
      }));

      return {
        ...p,
        pic_name: empMap[p.pic_employee_id] || (p.pic_employee_id ? `Pegawai #${p.pic_employee_id}` : null),
        activities: pActivities,
        direct_tasks: pDirectTasks
      };
    });

    return tree;
  }

  // Helper safe date string
  toDateStr(d) {
    if (!d) return null;
    if (typeof d === 'string') return d.slice(0, 10);
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    return String(d).slice(0, 10);
  }

  // Calendar Events Aggregator (Tasks + Kegiatan + Agendas)
  async getCalendarEvents(schoolUnitId, query = {}) {
    // 1. Tasks
    let taskQ = db('tasks as t').select('t.*');
    if (schoolUnitId) taskQ = taskQ.where('t.school_unit_id', schoolUnitId);
    const tasks = await taskQ.orderBy('t.due_date', 'asc');

    // 2. Kegiatan Renop
    let actQ = db('work_plan_activities as act')
      .leftJoin('work_plan_programs as prg', 'act.work_plan_program_id', 'prg.id')
      .leftJoin('school_work_plans as rkt', 'prg.school_work_plan_id', 'rkt.id')
      .select('act.*', 'rkt.school_unit_id');
    if (schoolUnitId) actQ = actQ.where('rkt.school_unit_id', schoolUnitId);
    const activities = await actQ.orderBy('act.start_date', 'asc');

    // 3. Agendas
    let agendaQ = db('planning_agendas as pa').select('pa.*');
    if (schoolUnitId) agendaQ = agendaQ.where('pa.school_unit_id', schoolUnitId);
    const agendas = await agendaQ.orderBy('pa.start_date', 'asc');

    const events = [];

    // Map Tasks
    tasks.forEach(t => {
      const d = this.toDateStr(t.due_date);
      if (d) {
        events.push({
          id: `task-${t.id}`,
          original_id: t.id,
          type: 'task',
          title: t.title,
          start: this.toDateStr(t.start_date) || d,
          end: d,
          date: d,
          status: t.status,
          priority: t.priority,
          progress: t.progress_percent,
          color: t.status === 'done' ? 'emerald' : t.priority === 'high' ? 'rose' : 'indigo',
          assignee_employee_id: t.assignee_employee_id
        });
      }
    });

    // Map Activities
    activities.forEach(a => {
      const s = this.toDateStr(a.start_date);
      if (s) {
        events.push({
          id: `act-${a.id}`,
          original_id: a.id,
          type: 'activity',
          title: `[Renop] ${a.name}`,
          start: s,
          end: this.toDateStr(a.end_date) || null,
          date: s,
          status: a.status,
          progress: a.progress_percentage,
          color: 'blue',
          pic_employee_id: a.pic_employee_id
        });
      }
    });

    // Map Agendas
    agendas.forEach(ag => {
      const s = this.toDateStr(ag.start_date);
      events.push({
        id: `agenda-${ag.id}`,
        original_id: ag.id,
        type: 'agenda',
        title: `[${ag.category.toUpperCase()}] ${ag.title}`,
        start: s,
        end: this.toDateStr(ag.end_date) || null,
        date: s,
        start_time: ag.start_time,
        end_time: ag.end_time,
        location: ag.location,
        status: ag.status,
        color: 'purple',
        pic_employee_id: ag.pic_employee_id
      });
    });

    return events;
  }

  // 5 Agenda Buckets (Hari Ini, Besok, Pekan Ini, Mendatang, Terlewat)
  async getAgendaBuckets(schoolUnitId) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dTom = new Date();
    dTom.setDate(dTom.getDate() + 1);
    const tomorrowStr = dTom.toISOString().slice(0, 10);

    const dWeekEnd = new Date();
    dWeekEnd.setDate(dWeekEnd.getDate() + 7);
    const weekEndStr = dWeekEnd.toISOString().slice(0, 10);

    const tasks = await this.listTasks(schoolUnitId);
    const agendas = await this.listAgendas(schoolUnitId);

    const buckets = {
      today: [],
      tomorrow: [],
      week: [],
      upcoming: [],
      overdue: []
    };

    // Classify Tasks
    tasks.forEach(t => {
      const d = this.toDateStr(t.due_date);
      const item = { ...t, item_type: 'task', due_date_str: d };
      if (!d) {
        buckets.upcoming.push(item);
      } else if (d < todayStr && t.status !== 'done') {
        buckets.overdue.push(item);
      } else if (d === todayStr) {
        buckets.today.push(item);
      } else if (d === tomorrowStr) {
        buckets.tomorrow.push(item);
      } else if (d > todayStr && d <= weekEndStr) {
        buckets.week.push(item);
      } else if (d > weekEndStr) {
        buckets.upcoming.push(item);
      }
    });

    // Classify Agendas
    agendas.forEach(ag => {
      const d = this.toDateStr(ag.start_date);
      const item = { ...ag, item_type: 'agenda', start_date_str: d };
      if (d) {
        if (d < todayStr && ag.status !== 'completed') {
          buckets.overdue.push(item);
        } else if (d === todayStr) {
          buckets.today.push(item);
        } else if (d === tomorrowStr) {
          buckets.tomorrow.push(item);
        } else if (d > todayStr && d <= weekEndStr) {
          buckets.week.push(item);
        } else if (d > weekEndStr) {
          buckets.upcoming.push(item);
        }
      }
    });

    return buckets;
  }

  // Agendas CRUD
  async listAgendas(schoolUnitId, query = {}) {
    let q = db('planning_agendas').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });

    if (query.category) q = q.where('category', query.category);
    if (query.status) q = q.where('status', query.status);

    const items = await q.orderBy('start_date', 'asc').orderBy('start_time', 'asc');

    return await Promise.all(
      items.map(async (item) => {
        let pic = null;
        if (item.pic_employee_id) {
          try {
            pic = await validateEmployee(item.pic_employee_id);
          } catch (e) {
            pic = { id: item.pic_employee_id, full_name: `Pegawai #${item.pic_employee_id}` };
          }
        }
        return {
          ...item,
          pic_name: pic?.full_name || (item.pic_employee_id ? `Pegawai #${item.pic_employee_id}` : null)
        };
      })
    );
  }

  async getAgendaById(id) {
    const item = await db('planning_agendas').where({ id }).first();
    if (!item) {
      const err = new Error('Agenda tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    let pic = null;
    if (item.pic_employee_id) {
      try {
        pic = await validateEmployee(item.pic_employee_id);
      } catch (e) {
        pic = { id: item.pic_employee_id, full_name: `Pegawai #${item.pic_employee_id}` };
      }
    }
    return {
      ...item,
      pic_name: pic?.full_name || (item.pic_employee_id ? `Pegawai #${item.pic_employee_id}` : null)
    };
  }

  async createAgenda(data, userId) {
    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    const [id] = await db('planning_agendas').insert({
      school_unit_id: data.school_unit_id || 1,
      title: data.title,
      category: data.category || 'rapat',
      description: data.description || null,
      start_date: data.start_date || new Date().toISOString().slice(0, 10),
      start_time: data.start_time || '08:00',
      end_date: data.end_date || data.start_date || new Date().toISOString().slice(0, 10),
      end_time: data.end_time || null,
      location: data.location || 'Ruang Rapat Utama',
      pic_employee_id: data.pic_employee_id ? Number(data.pic_employee_id) : null,
      reference_type: data.reference_type || 'none',
      reference_id: data.reference_id ? Number(data.reference_id) : null,
      status: data.status || 'scheduled',
      created_by: userId || 1,
    });

    return this.getAgendaById(id);
  }

  async updateAgenda(id, data, userId) {
    const item = await db('planning_agendas').where({ id }).first();
    if (!item) {
      const err = new Error('Agenda tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    await db('planning_agendas').where({ id }).update({
      title: data.title !== undefined ? data.title : item.title,
      category: data.category !== undefined ? data.category : item.category,
      description: data.description !== undefined ? data.description : item.description,
      start_date: data.start_date !== undefined ? data.start_date : item.start_date,
      start_time: data.start_time !== undefined ? data.start_time : item.start_time,
      end_date: data.end_date !== undefined ? data.end_date : item.end_date,
      end_time: data.end_time !== undefined ? data.end_time : item.end_time,
      location: data.location !== undefined ? data.location : item.location,
      pic_employee_id: data.pic_employee_id !== undefined ? (data.pic_employee_id ? Number(data.pic_employee_id) : null) : item.pic_employee_id,
      reference_type: data.reference_type !== undefined ? data.reference_type : item.reference_type,
      reference_id: data.reference_id !== undefined ? (data.reference_id ? Number(data.reference_id) : null) : item.reference_id,
      status: data.status !== undefined ? data.status : item.status,
    });

    return this.getAgendaById(id);
  }

  async deleteAgenda(id) {
    const item = await db('planning_agendas').where({ id }).first();
    if (!item) {
      const err = new Error('Agenda tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    await db('planning_agendas').where({ id }).delete();
    return { success: true, message: 'Agenda berhasil dihapus' };
  }

  // Idempotent Reminder & Notification Generator
  async generateDueReminders(schoolUnitId) {
    const todayStr = new Date().toISOString().slice(0, 10);
    let createdCount = 0;

    // 1. Scan Tasks Due Today
    const dueTodayTasks = await db('tasks')
      .where('due_date', todayStr)
      .whereNot('status', 'done');

    for (const t of dueTodayTasks) {
      try {
        await db('user_notifications').insert({
          school_unit_id: t.school_unit_id || schoolUnitId || 1,
          recipient_employee_id: t.assignee_employee_id,
          type: 'deadline_today',
          title: `Tenggat Tugas Hari Ini: ${t.title}`,
          message: `Tugas "${t.title}" memiliki batas waktu hari ini (${todayStr}). Harap selesaikan checklist pekerjaan.`,
          reference_type: 'task',
          reference_id: t.id,
          due_date: todayStr
        });
        createdCount++;
      } catch (e) {
        // Ignored on duplicate key
      }
    }

    // 2. Scan Overdue Tasks
    const overdueTasks = await db('tasks')
      .where('due_date', '<', todayStr)
      .whereNot('status', 'done');

    for (const t of overdueTasks) {
      try {
        await db('user_notifications').insert({
          school_unit_id: t.school_unit_id || schoolUnitId || 1,
          recipient_employee_id: t.assignee_employee_id,
          type: 'overdue_alert',
          title: `Peringatan Tugas Terlewat: ${t.title}`,
          message: `Tugas "${t.title}" telah melewati tenggat waktu (${t.due_date ? t.due_date.slice(0, 10) : '-'}). Mohon tindak lanjut segera.`,
          reference_type: 'task',
          reference_id: t.id,
          due_date: t.due_date ? t.due_date.slice(0, 10) : todayStr
        });
        createdCount++;
      } catch (e) {
        // Ignored on duplicate key
      }
    }

    // 3. Scan Agendas Today
    const todayAgendas = await db('planning_agendas')
      .where('start_date', todayStr)
      .whereNot('status', 'completed');

    for (const ag of todayAgendas) {
      if (ag.pic_employee_id) {
        try {
          await db('user_notifications').insert({
            school_unit_id: ag.school_unit_id || schoolUnitId || 1,
            recipient_employee_id: ag.pic_employee_id,
            type: 'agenda_reminder',
            title: `Pengingat Agenda Hari Ini: ${ag.title}`,
            message: `Agenda "${ag.title}" dijadwalkan hari ini pukul ${ag.start_time || '08:00'} WIB di ${ag.location || 'Sekolah'}.`,
            reference_type: 'agenda',
            reference_id: ag.id,
            due_date: todayStr
          });
          createdCount++;
        } catch (e) {
          // Ignored on duplicate key
        }
      }
    }

    return { success: true, created_reminders_count: createdCount, message: `Pemeriksaan selesai. ${createdCount} notifikasi baru dibuat.` };
  }

  // List in-app notifications
  async listNotifications(employeeId, query = {}) {
    let q = db('user_notifications').where(function () {
      if (employeeId) this.where('recipient_employee_id', employeeId);
    });

    if (query.unread_only === 'true') {
      q = q.whereNull('read_at');
    }

    const items = await q.orderBy('id', 'desc').limit(50);
    const unreadCount = await db('user_notifications')
      .where(function () {
        if (employeeId) this.where('recipient_employee_id', employeeId);
      })
      .whereNull('read_at')
      .count('id as cnt')
      .first();

    return {
      notifications: items,
      unread_count: unreadCount?.cnt || 0
    };
  }

  async markNotificationAsRead(id, employeeId) {
    await db('user_notifications')
      .where({ id })
      .update({ read_at: new Date() });
    return { success: true, message: 'Notifikasi ditandai sudah dibaca' };
  }

  // ==========================================
  // 12. NEW TASK HUB ENDPOINTS & PROGRAM DISCUSSIONS
  // ==========================================
  async getTasksBucket(query = {}) {
    const { school_unit_id, assignee_employee_id, academic_year, rips_program_id, project_id } = query;
    
    // Format tanggal lokal YYYY-MM-DD
    const now = new Date();
    const toYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = toYMD(now);
    const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrow = toYMD(tomorrowDate);

    // Batas Pekan Ini (+7 hari)
    const weekEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    const weekEnd = toYMD(weekEndDate);

    // 1. Fetch uncompleted Tasks
    let taskQ = db('tasks as t')
      .leftJoin('projects as p', 't.project_id', 'p.id')
      .whereNot('t.status', 'done')
      .whereNot('t.status', 'completed')
      .whereNot('t.status', 'cancelled')
      .whereNot('t.status', 'dibatalkan');

    if (school_unit_id) taskQ = taskQ.where('t.school_unit_id', Number(school_unit_id));
    if (assignee_employee_id) taskQ = taskQ.where('t.assignee_employee_id', Number(assignee_employee_id));
    if (project_id && project_id !== 'all') taskQ = taskQ.where('t.project_id', Number(project_id));
    if (academic_year) {
      taskQ = taskQ.where(function() {
        this.where('p.academic_year', academic_year).orWhereNull('p.academic_year');
      });
    }

    const rawTasks = await taskQ.select(
      't.id',
      't.title',
      't.start_date',
      't.due_date',
      't.priority',
      't.status',
      't.progress_percent',
      't.assignee_employee_ids',
      't.assignee_employee_id',
      't.document_link',
      't.notes',
      't.project_id',
      'p.name as program_name',
      'p.name as context_name'
    );

    const tasks = rawTasks.map((t) => {
      let empIds = [];
      if (t.assignee_employee_ids) {
        try {
          empIds = typeof t.assignee_employee_ids === 'string' ? JSON.parse(t.assignee_employee_ids) : t.assignee_employee_ids;
        } catch {
          empIds = [];
        }
      }
      if (empIds.length === 0 && t.assignee_employee_id) empIds = [t.assignee_employee_id];

      return {
        id: t.id,
        raw_id: t.id,
        item_type: 'task',
        title: t.title,
        start_date: t.start_date ? toYMD(new Date(t.start_date)) : null,
        end_date: t.due_date ? toYMD(new Date(t.due_date)) : (t.start_date ? toYMD(new Date(t.start_date)) : null),
        due_date: t.due_date ? toYMD(new Date(t.due_date)) : (t.start_date ? toYMD(new Date(t.start_date)) : null),
        priority: t.priority || 'medium',
        status: t.status || 'todo',
        progress_percent: t.progress_percent || 0,
        assignee_employee_ids: empIds,
        assignee_employee_id: t.assignee_employee_id,
        document_link: t.document_link || '',
        notes: t.notes || '',
        project_id: t.project_id,
        program_id: null,
        program_code: 'PROYEK',
        program_name: t.program_name || 'Proyek Mandiri',
        context_name: t.context_name || 'Proyek Mandiri',
      };
    });

    // 2. Fetch uncompleted Work Plan Activities (RKT)
    let actQ = db('work_plan_activities as a')
      .leftJoin('annual_work_plans as awp', 'a.annual_work_plan_id', 'awp.id')
      .leftJoin('rips_programs as rp', 'a.rips_program_id', 'rp.id')
      .whereNot('a.status', 'completed')
      .whereNot('a.status', 'done')
      .whereNot('a.status', 'cancelled')
      .whereNot('a.status', 'dibatalkan');

    if (school_unit_id) {
      actQ = actQ.where(function() {
        this.where('awp.school_unit_id', Number(school_unit_id))
          .orWhere('rp.school_unit_id', Number(school_unit_id))
          .orWhereNull('awp.school_unit_id');
      });
    }
    if (assignee_employee_id) actQ = actQ.where('a.assignee_employee_id', Number(assignee_employee_id));
    if (rips_program_id && rips_program_id !== 'all') actQ = actQ.where('a.rips_program_id', Number(rips_program_id));
    if (academic_year) {
      actQ = actQ.where(function() {
        this.where('awp.academic_year', academic_year)
          .orWhere('rp.academic_year', academic_year)
          .orWhereNull('awp.academic_year');
      });
    }

    const rawActivities = await actQ.select(
      'a.id',
      'a.title',
      'a.start_date',
      'a.end_date',
      'a.activity_date',
      'a.status',
      'a.progress_percent',
      'a.assignee_employee_ids',
      'a.assignee_employee_id',
      'a.document_link',
      'a.notes',
      'a.tag',
      'a.rips_program_id as program_id',
      'rp.code as program_code',
      'rp.name as program_name'
    );

    const activities = rawActivities.map((a) => {
      let empIds = [];
      if (a.assignee_employee_ids) {
        try {
          empIds = typeof a.assignee_employee_ids === 'string' ? JSON.parse(a.assignee_employee_ids) : a.assignee_employee_ids;
        } catch {
          empIds = [];
        }
      }
      if (empIds.length === 0 && a.assignee_employee_id) empIds = [a.assignee_employee_id];

      const sDate = a.start_date ? toYMD(new Date(a.start_date)) : (a.activity_date ? toYMD(new Date(a.activity_date)) : null);
      const eDate = a.end_date ? toYMD(new Date(a.end_date)) : (a.activity_date ? toYMD(new Date(a.activity_date)) : (sDate || null));

      return {
        id: a.id,
        raw_id: a.id,
        item_type: 'activity',
        title: a.title,
        start_date: sDate,
        end_date: eDate,
        due_date: eDate,
        priority: 'medium',
        status: a.status === 'completed' ? 'done' : (a.status || 'planned'),
        progress_percent: a.progress_percent || 0,
        assignee_employee_ids: empIds,
        assignee_employee_id: a.assignee_employee_id,
        document_link: a.document_link || '',
        notes: a.notes || '',
        tag: a.tag || 'lainnya',
        program_id: a.program_id,
        program_code: a.program_code || '',
        program_name: a.program_name || 'Program RKT',
        context_name: a.program_name || 'Program RKT',
      };
    });

    const allItems = [...tasks, ...activities];

    const bucket = {
      overdue: [],
      today: [],
      tomorrow: [],
      this_week: [],
    };

    allItems.forEach((item) => {
      const due = item.due_date || item.end_date;
      const start = item.start_date;
      const effectiveDate = due || start;

      if (!effectiveDate) {
        bucket.this_week.push(item);
      } else if (effectiveDate < today) {
        bucket.overdue.push(item);
      } else if (effectiveDate === today || (start && start <= today && due && due >= today)) {
        bucket.today.push(item);
      } else if (effectiveDate === tomorrow) {
        bucket.tomorrow.push(item);
      } else {
        bucket.this_week.push(item);
      }
    });

    return bucket;
  }

  async getTasksGantt(query = {}) {
    const { rips_program_id, project_id, school_unit_id } = query;

    if (rips_program_id) {
      // Return activities for this RIPS program
      const activities = await db('work_plan_activities as a')
        .leftJoin('rips_programs as p', 'a.rips_program_id', 'p.id')
        .leftJoin('rips_program_goal_links as pgl', 'p.id', 'pgl.rips_program_id')
        .leftJoin('rips_goals as g', 'pgl.rips_goal_id', 'g.id')
        .leftJoin('rips_subdomains as sd', 'g.subdomain_id', 'sd.id')
        .leftJoin('rips_domains as d', 'sd.domain_id', 'd.id')
        .where('a.rips_program_id', Number(rips_program_id))
        .select(
          'a.*',
          'p.code as program_code',
          'p.name as program_name',
          'sd.id as sub_bidang_id',
          'sd.name as sub_bidang_name',
          'd.id as bidang_id',
          'd.name as bidang_name'
        )
        .groupBy('a.id')
        .orderBy('a.order_index', 'asc')
        .orderBy('a.id', 'asc');

      return activities.map((a) => ({
        id: `act-${a.id}`,
        raw_id: a.id,
        item_type: 'activity',
        program_id: a.rips_program_id,
        program_code: a.program_code,
        program_name: a.program_name,
        sub_bidang_id: a.sub_bidang_id || null,
        sub_bidang_name: a.sub_bidang_name || 'Umum',
        bidang_id: a.bidang_id || null,
        bidang_name: a.bidang_name || 'UMUM',
        tag: a.tag || null,
        title: a.title,
        start_date: a.start_date || a.activity_date || new Date().toISOString().slice(0, 10),
        end_date: a.end_date || a.activity_date || new Date().toISOString().slice(0, 10),
        progress_percent: a.progress_percent || 0,
        status: a.status,
        dependency_id: a.parent_activity_id ? `act-${a.parent_activity_id}` : null,
      }));
    }

    if (project_id) {
      // Return tasks for this project
      const tasks = await db('tasks as t')
        .leftJoin('projects as pr', 't.project_id', 'pr.id')
        .where('t.project_id', Number(project_id))
        .select('t.*', 'pr.name as project_name')
        .orderBy('t.id', 'asc');

      return tasks.map((t) => ({
        id: `task-${t.id}`,
        raw_id: t.id,
        item_type: 'task',
        project_id: t.project_id,
        project_name: t.project_name,
        program_name: t.project_name || 'Proyek',
        sub_bidang_name: 'Pelaksanaan Proyek',
        bidang_name: 'PROYEK & PENGEMBANGAN',
        tag: t.tag || null,
        title: t.title,
        start_date: t.start_date || t.created_at || new Date().toISOString().slice(0, 10),
        end_date: t.due_date || t.start_date || new Date().toISOString().slice(0, 10),
        progress_percent: t.progress_percent || (t.status === 'done' ? 100 : 0),
        status: t.status,
        dependency_id: null,
      }));
    }

    // Default: Return both activities and tasks with full hierarchy
    const activities = await db('work_plan_activities as a')
      .leftJoin('rips_programs as p', 'a.rips_program_id', 'p.id')
      .leftJoin('rips_program_goal_links as pgl', 'p.id', 'pgl.rips_program_id')
      .leftJoin('rips_goals as g', 'pgl.rips_goal_id', 'g.id')
      .leftJoin('rips_subdomains as sd', 'g.subdomain_id', 'sd.id')
      .leftJoin('rips_domains as d', 'sd.domain_id', 'd.id')
      .select(
        'a.*',
        'p.code as program_code',
        'p.name as program_name',
        'sd.id as sub_bidang_id',
        'sd.name as sub_bidang_name',
        'd.id as bidang_id',
        'd.name as bidang_name'
      )
      .groupBy('a.id')
      .orderBy('a.id', 'asc');

    let q = db('tasks as t')
      .leftJoin('projects as pr', 't.project_id', 'pr.id')
      .select('t.*', 'pr.name as project_name');
    if (school_unit_id) q = q.where('t.school_unit_id', Number(school_unit_id));
    const tasks = await q.limit(50).orderBy('t.id', 'desc');

    const mappedActivities = activities.map((a) => ({
      id: `act-${a.id}`,
      raw_id: a.id,
      item_type: 'activity',
      program_id: a.rips_program_id,
      program_code: a.program_code,
      program_name: a.program_name,
      sub_bidang_id: a.sub_bidang_id || null,
      sub_bidang_name: a.sub_bidang_name || 'Umum',
      bidang_id: a.bidang_id || null,
      bidang_name: a.bidang_name || 'UMUM',
      tag: a.tag || null,
      title: a.title,
      start_date: a.start_date || a.activity_date || new Date().toISOString().slice(0, 10),
      end_date: a.end_date || a.activity_date || new Date().toISOString().slice(0, 10),
      progress_percent: a.progress_percent || 0,
      status: a.status,
      dependency_id: a.parent_activity_id ? `act-${a.parent_activity_id}` : null,
    }));

    const mappedTasks = tasks.map((t) => ({
      id: `task-${t.id}`,
      raw_id: t.id,
      item_type: 'task',
      project_id: t.project_id,
      project_name: t.project_name,
      program_name: t.project_name || 'Proyek',
      sub_bidang_name: 'Pelaksanaan Proyek',
      bidang_name: 'PROYEK & PENGEMBANGAN',
      tag: t.tag || null,
      title: t.title,
      start_date: t.start_date || t.created_at || new Date().toISOString().slice(0, 10),
      end_date: t.due_date || t.start_date || new Date().toISOString().slice(0, 10),
      progress_percent: t.progress_percent || (t.status === 'done' ? 100 : 0),
      status: t.status,
      dependency_id: null,
    }));

    return [...mappedActivities, ...mappedTasks];
  }

  async updateTaskGanttSchedule(itemType, rawId, payload = {}, user = {}) {
    if (!itemType || (itemType !== 'activity' && itemType !== 'task')) {
      const err = new Error("item_type harus berupa 'activity' atau 'task'");
      err.statusCode = 400;
      throw err;
    }

    const id = Number(rawId);
    if (!id || isNaN(id)) {
      const err = new Error('raw_id tidak valid');
      err.statusCode = 400;
      throw err;
    }

    const { start_date, end_date, progress_percent } = payload;

    // Validasi rentang tanggal jika keduanya dikirimkan
    if (start_date && end_date) {
      const s = String(start_date).slice(0, 10);
      const e = String(end_date).slice(0, 10);
      if (e < s) {
        const err = new Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
        err.statusCode = 400;
        throw err;
      }
    }

    if (itemType === 'activity') {
      const act = await db('work_plan_activities').where({ id }).first();
      if (!act) {
        const err = new Error('Aktivitas kegiatan RKT tidak ditemukan');
        err.statusCode = 404;
        throw err;
      }

      const currentStart = String(start_date || act.start_date || act.activity_date || '').slice(0, 10);
      const currentEnd = String(end_date || act.end_date || currentStart).slice(0, 10);

      if (currentStart && currentEnd && currentEnd < currentStart) {
        const err = new Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
        err.statusCode = 400;
        throw err;
      }

      const updateData = { updated_at: db.fn.now() };
      if (start_date) {
        updateData.start_date = currentStart;
        updateData.activity_date = currentStart;
      }
      if (end_date) {
        updateData.end_date = currentEnd;
      }
      if (progress_percent !== undefined && progress_percent !== null) {
        const prog = Math.min(100, Math.max(0, Number(progress_percent)));
        updateData.progress_percent = prog;
        if (prog === 100) {
          updateData.status = 'completed';
        } else if (prog > 0 && act.status === 'planned') {
          updateData.status = 'in_progress';
        }
      }

      await db('work_plan_activities').where({ id }).update(updateData);
      const updated = await db('work_plan_activities').where({ id }).first();

      return {
        id: `act-${updated.id}`,
        raw_id: updated.id,
        item_type: 'activity',
        title: updated.title,
        start_date: updated.start_date || updated.activity_date || new Date().toISOString().slice(0, 10),
        end_date: updated.end_date || updated.activity_date || new Date().toISOString().slice(0, 10),
        progress_percent: updated.progress_percent || 0,
        status: updated.status,
        dependency_id: updated.parent_activity_id ? `act-${updated.parent_activity_id}` : null,
      };
    }

    if (itemType === 'task') {
      const task = await db('tasks').where({ id }).first();
      if (!task) {
        const err = new Error('Tugas proyek tidak ditemukan');
        err.statusCode = 404;
        throw err;
      }

      const currentStart = String(start_date || task.start_date || task.created_at || '').slice(0, 10);
      const currentEnd = String(end_date || task.due_date || currentStart).slice(0, 10);

      if (currentStart && currentEnd && currentEnd < currentStart) {
        const err = new Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
        err.statusCode = 400;
        throw err;
      }

      const updateData = { updated_at: db.fn.now() };
      if (start_date) {
        updateData.start_date = currentStart;
      }
      if (end_date) {
        updateData.due_date = currentEnd;
      }
      if (progress_percent !== undefined && progress_percent !== null) {
        const prog = Math.min(100, Math.max(0, Number(progress_percent)));
        updateData.progress_percent = prog;
        if (prog === 100) {
          updateData.status = 'done';
        } else if (prog > 0 && task.status === 'todo') {
          updateData.status = 'in_progress';
        }
      }

      await db('tasks').where({ id }).update(updateData);
      const updated = await db('tasks').where({ id }).first();

      return {
        id: `task-${updated.id}`,
        raw_id: updated.id,
        item_type: 'task',
        title: updated.title,
        start_date: updated.start_date || updated.created_at || new Date().toISOString().slice(0, 10),
        end_date: updated.due_date || updated.start_date || new Date().toISOString().slice(0, 10),
        progress_percent: updated.progress_percent || (updated.status === 'done' ? 100 : 0),
        status: updated.status,
        dependency_id: null,
      };
    }
  }

  async getTasksProgressDashboard(schoolUnitId) {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Task aggregates
    let taskQ = db('tasks');
    if (schoolUnitId) taskQ = taskQ.where('school_unit_id', Number(schoolUnitId));
    const tasks = await taskQ.select('status', 'due_date', 'progress_percent', 'assignee_employee_id');

    // 2. Activity aggregates
    let actQ = db('work_plan_activities as a')
      .join('annual_work_plans as awp', 'a.annual_work_plan_id', 'awp.id');
    if (schoolUnitId) actQ = actQ.where('awp.school_unit_id', Number(schoolUnitId));
    const activities = await actQ.select('a.status', 'a.activity_date as due_date', 'a.progress_percent', 'a.assignee_employee_id');

    const all = [...tasks, ...activities];
    const total = all.length;
    const completed = all.filter((i) => i.status === 'done' || i.status === 'completed').length;
    const inProgress = all.filter((i) => i.status === 'in_progress').length;
    const overdue = all.filter((i) => (i.status !== 'done' && i.status !== 'completed') && i.due_date && String(i.due_date).slice(0, 10) < today).length;

    const avgProgress = total > 0
      ? Math.round(all.reduce((acc, curr) => acc + (curr.progress_percent || 0), 0) / total)
      : 0;

    return {
      total_tasks: total,
      completed_tasks: completed,
      in_progress_tasks: inProgress,
      overdue_tasks: overdue,
      avg_progress_percent: avgProgress,
    };
  }

  // Program Discussions CRUD
  async listProgramDiscussions(ripsProgramId) {
    if (!ripsProgramId) return [];
    return db('program_discussions')
      .where('rips_program_id', Number(ripsProgramId))
      .orderBy('created_at', 'asc');
  }

  async createProgramDiscussion(ripsProgramId, message, user = null) {
    if (!ripsProgramId || !message || !message.trim()) {
      const error = new Error('rips_program_id dan message wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('program_discussions').insert({
      rips_program_id: Number(ripsProgramId),
      author_user_id: user?.id || 1,
      message: message.trim(),
      created_at: db.fn.now(),
    });

    return db('program_discussions').where({ id }).first();
  }
}

module.exports = new ProjectsService();

