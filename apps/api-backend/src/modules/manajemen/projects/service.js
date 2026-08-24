/**
 * Projects, Tasks & Approvals Service Implementation
 * Modul Manajemen: Tasks (#198), Proyek (#199), Approval Workflow (#200)
 */
const db = require('../../../config/db/manajemen');
const { validateEmployee } = require('../utils/crossModuleHelper');

class ProjectsService {
  // ==========================================
  // 1. Tasks Tracking - #198
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
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('t.title', 'like', s).orWhere('t.description', 'like', s);
      });
    }

    const items = await q
      .select('t.*', 'p.name as project_name')
      .orderBy('t.id', 'desc');

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

    let assignee = null;
    try {
      assignee = await validateEmployee(item.assignee_employee_id);
    } catch (e) {
      assignee = { id: item.assignee_employee_id, full_name: `Pegawai #${item.assignee_employee_id}` };
    }

    return {
      ...item,
      assignee_name: assignee?.full_name || `Pegawai #${item.assignee_employee_id}`,
      comments: enrichedComments,
    };
  }

  async createTask(data, userId) {
    await validateEmployee(data.assignee_employee_id);

    const [id] = await db('tasks').insert({
      school_unit_id: data.school_unit_id || 1,
      project_id: data.project_id || null,
      reference_type: data.reference_type || null,
      reference_id: data.reference_id || null,
      title: data.title,
      description: data.description || null,
      assignee_employee_id: data.assignee_employee_id,
      created_by: userId || 1,
      priority: data.priority || 'medium',
      status: 'todo',
      due_date: data.due_date || null,
    });

    return this.getTaskById(id);
  }

  async updateTask(id, data) {
    const item = await this.getTaskById(id);
    if (data.assignee_employee_id) {
      await validateEmployee(data.assignee_employee_id);
    }

    await db('tasks')
      .where({ id })
      .update({
        project_id: data.project_id !== undefined ? data.project_id : item.project_id,
        reference_type: data.reference_type !== undefined ? data.reference_type : item.reference_type,
        reference_id: data.reference_id !== undefined ? data.reference_id : item.reference_id,
        title: data.title !== undefined ? data.title : item.title,
        description: data.description !== undefined ? data.description : item.description,
        assignee_employee_id:
          data.assignee_employee_id !== undefined ? data.assignee_employee_id : item.assignee_employee_id,
        priority: data.priority !== undefined ? data.priority : item.priority,
        status: data.status !== undefined ? data.status : item.status,
        due_date: data.due_date !== undefined ? data.due_date : item.due_date,
      });

    return this.getTaskById(id);
  }

  async updateTaskStatus(id, status) {
    await this.getTaskById(id);
    await db('tasks').where({ id }).update({ status });
    return this.getTaskById(id);
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
  // 3. Approval Workflows - #200
  // ==========================================
  async listWorkflows(schoolUnitId) {
    let q = db('approval_workflows').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId).orWhereNull('school_unit_id');
    });

    const workflows = await q.orderBy('id', 'asc');
    return await Promise.all(
      workflows.map(async (wf) => {
        const steps = await db('approval_steps')
          .where({ approval_workflow_id: wf.id })
          .orderBy('step_order', 'asc');
        return { ...wf, steps };
      })
    );
  }

  async createWorkflow(data) {
    const [id] = await db('approval_workflows').insert({
      school_unit_id: data.school_unit_id || null,
      name: data.name,
      applies_to: data.applies_to,
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

    const steps = await db('approval_steps')
      .where({ approval_workflow_id: id })
      .orderBy('step_order', 'asc');
    const wf = await db('approval_workflows').where({ id }).first();
    return { ...wf, steps };
  }

  async listApprovalRequests(schoolUnitId, query = {}, user = null) {
    let q = db('approval_requests as ar')
      .leftJoin('approval_workflows as aw', 'ar.approval_workflow_id', 'aw.id')
      .where(function () {
        if (schoolUnitId) this.where('ar.school_unit_id', schoolUnitId);
      });

    if (query.status) q = q.where('ar.status', query.status);
    if (query.reference_type) q = q.where('ar.reference_type', query.reference_type);

    const items = await q
      .select('ar.*', 'aw.name as workflow_name')
      .orderBy('ar.id', 'desc');

    return await Promise.all(
      items.map(async (item) => {
        let requester = null;
        try {
          requester = await validateEmployee(item.requested_by_employee_id);
        } catch (e) {
          requester = { id: item.requested_by_employee_id, full_name: `Pemohon #${item.requested_by_employee_id}` };
        }
        return {
          ...item,
          requester_name: requester?.full_name || `Pemohon #${item.requested_by_employee_id}`,
        };
      })
    );
  }

  async createApprovalRequest(data, user) {
    const workflow = await db('approval_workflows').where({ id: data.approval_workflow_id }).first();
    if (!workflow) {
      const err = new Error('Template workflow persetujuan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const requestedBy = data.requested_by_employee_id || user?.id || 1;

    const [id] = await db('approval_requests').insert({
      approval_workflow_id: data.approval_workflow_id,
      school_unit_id: data.school_unit_id || 1,
      reference_type: data.reference_type,
      reference_id: data.reference_id,
      requested_by_employee_id: requestedBy,
      current_step: 1,
      status: 'pending',
    });

    return db('approval_requests').where({ id }).first();
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

    const approverId = data.approver_employee_id || user?.id || 1;
    const action = data.action; // 'approved' | 'rejected' | 'returned'

    // Catat log approval
    await db('approval_actions').insert({
      approval_request_id: id,
      approval_step_id: step ? step.id : null,
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

    return db('approval_requests').where({ id }).first();
  }

  async getApprovalRequestActions(id) {
    const request = await db('approval_requests').where({ id }).first();
    if (!request) {
      const err = new Error('Pengajuan persetujuan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const actions = await db('approval_actions as aa')
      .leftJoin('approval_steps as as_step', 'aa.approval_step_id', 'as_step.id')
      .where('aa.approval_request_id', id)
      .select('aa.*', 'as_step.step_order')
      .orderBy('aa.acted_at', 'asc');

    return await Promise.all(
      actions.map(async (a) => {
        let approver = null;
        try {
          approver = await validateEmployee(a.approver_employee_id);
        } catch (e) {
          approver = { id: a.approver_employee_id, full_name: `Approver #${a.approver_employee_id}` };
        }
        return {
          ...a,
          approver_name: approver?.full_name || `Approver #${a.approver_employee_id}`,
        };
      })
    );
  }
}

module.exports = new ProjectsService();
