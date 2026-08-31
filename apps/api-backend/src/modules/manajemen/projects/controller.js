/**
 * Projects Controller Implementation
 */
const projectsService = require('./service');
const { getSchoolUnitId, getUserId } = require('../utils/crossModuleHelper');

class ProjectsController {
  // Tasks
  async listTasks(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.listTasks(schoolUnitId, req.query, req.user);
      res.json({ success: true, data, message: 'Daftar tugas berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getTaskById(req, res, next) {
    try {
      const data = await projectsService.getTaskById(req.params.id);
      res.json({ success: true, data, message: 'Detail tugas berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createTask(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await projectsService.createTask({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'Tugas baru berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateTask(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await projectsService.updateTask(req.params.id, req.body, userId);
      res.json({ success: true, data, message: 'Detail tugas berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateTaskStatus(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await projectsService.updateTaskStatus(req.params.id, req.body.status, userId);
      res.json({ success: true, data, message: 'Status tugas berhasil diubah', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteTask(req, res, next) {
    try {
      const data = await projectsService.deleteTask(req.params.id);
      res.json({ success: true, data, message: 'Tugas berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Checklists (#Fitur 10)
  async createTaskChecklist(req, res, next) {
    try {
      const data = await projectsService.createTaskChecklist(req.params.id, req.body.title, req.body.order_index);
      res.status(201).json({ success: true, data, message: 'Checklist berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async toggleTaskChecklist(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await projectsService.toggleTaskChecklist(req.params.id, req.body.is_completed, userId);
      res.json({ success: true, data, message: 'Status checklist berhasil diubah', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteTaskChecklist(req, res, next) {
    try {
      const data = await projectsService.deleteTaskChecklist(req.params.id);
      res.json({ success: true, data, message: 'Checklist berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async addComment(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await projectsService.addComment(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data, message: 'Komentar berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Projects
  async listProjects(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.listProjects(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar proyek berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getProjectById(req, res, next) {
    try {
      const data = await projectsService.getProjectById(req.params.id);
      res.json({ success: true, data, message: 'Detail proyek berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createProject(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.createProject({ ...req.body, school_unit_id: schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Proyek baru berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateProject(req, res, next) {
    try {
      const data = await projectsService.updateProject(req.params.id, req.body);
      res.json({ success: true, data, message: 'Detail proyek berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateProjectStatus(req, res, next) {
    try {
      const data = await projectsService.updateProjectStatus(req.params.id, req.body.status);
      res.json({ success: true, data, message: 'Status proyek berhasil diubah', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async addProjectMember(req, res, next) {
    try {
      const data = await projectsService.addProjectMember(req.params.id, req.body);
      res.status(201).json({ success: true, data, message: 'Anggota proyek berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async removeProjectMember(req, res, next) {
    try {
      const data = await projectsService.removeProjectMember(req.params.id, req.params.employee_id);
      res.json({ success: true, data, message: 'Anggota proyek berhasil dikeluarkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Workflows & Approvals
  async listWorkflows(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.listWorkflows(schoolUnitId);
      res.json({ success: true, data, message: 'Daftar workflow approval berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createWorkflow(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.createWorkflow({ ...req.body, school_unit_id: schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Workflow approval baru berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteWorkflow(req, res, next) {
    try {
      const data = await projectsService.deleteWorkflow(req.params.id);
      res.json({ success: true, data, message: 'Workflow persetujuan berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listApprovalRequests(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.listApprovalRequests(schoolUnitId, req.query, req.user);
      res.json({ success: true, data, message: 'Daftar pengajuan approval berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getApprovalRequestById(req, res, next) {
    try {
      const data = await projectsService.getApprovalRequestById(req.params.id);
      res.json({ success: true, data, message: 'Detail pengajuan persetujuan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createApprovalRequest(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.createApprovalRequest(
        { ...req.body, school_unit_id: schoolUnitId },
        req.user
      );
      res.status(201).json({ success: true, data, message: 'Pengajuan approval berhasil diajukan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async actOnApprovalRequest(req, res, next) {
    try {
      const data = await projectsService.actOnApprovalRequest(req.params.id, req.body, req.user);
      res.json({ success: true, data, message: 'Tindakan persetujuan berhasil diproses', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async resubmitApprovalRequest(req, res, next) {
    try {
      const data = await projectsService.resubmitApprovalRequest(req.params.id, req.body, req.user);
      res.json({ success: true, data, message: 'Pengajuan persetujuan berhasil diajukan ulang (Resubmitted)', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getApprovalRequestActions(req, res, next) {
    try {
      const data = await projectsService.getApprovalRequestActions(req.params.id);
      res.json({ success: true, data, message: 'Riwayat tindakan approval berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Timeline, Kalender, Agenda & Reminder (#Fitur 11)
  // ==========================================
  async getHierarchicalTimeline(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.getHierarchicalTimeline(schoolUnitId);
      res.json({ success: true, data, message: 'Hirarki timeline berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getCalendarEvents(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.getCalendarEvents(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Event kalender berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getAgendaBuckets(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.getAgendaBuckets(schoolUnitId);
      res.json({ success: true, data, message: 'Kategori agenda berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listAgendas(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.listAgendas(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar agenda berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getAgendaById(req, res, next) {
    try {
      const data = await projectsService.getAgendaById(req.params.id);
      res.json({ success: true, data, message: 'Detail agenda berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createAgenda(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await projectsService.createAgenda({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'Agenda baru berhasil dijadwalkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateAgenda(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await projectsService.updateAgenda(req.params.id, req.body, userId);
      res.json({ success: true, data, message: 'Agenda berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteAgenda(req, res, next) {
    try {
      const data = await projectsService.deleteAgenda(req.params.id);
      res.json({ success: true, data, message: 'Agenda berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async generateDueReminders(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.generateDueReminders(schoolUnitId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async listNotifications(req, res, next) {
    try {
      const employeeId = req.user?.employee_id || req.user?.id || 1;
      const data = await projectsService.listNotifications(employeeId, req.query);
      res.json({ success: true, data, message: 'Notifikasi berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async markNotificationAsRead(req, res, next) {
    try {
      const employeeId = req.user?.employee_id || req.user?.id || 1;
      const data = await projectsService.markNotificationAsRead(req.params.id, employeeId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async markAllNotificationsAsRead(req, res, next) {
    try {
      const employeeId = req.user?.employee_id || req.user?.id || 1;
      const data = await projectsService.markAllNotificationsAsRead(employeeId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // Task Hub & Discussions
  async getTasksBucket(req, res, next) {
    try {
      const isFoundation = req.query.is_foundation === 'true' || req.query.context === 'foundation';
      const schoolUnitId = isFoundation ? null : (req.query.school_unit_id || getSchoolUnitId(req));
      const data = await projectsService.getTasksBucket({ ...req.query, school_unit_id: schoolUnitId });
      res.json({ success: true, data, message: 'Bucket tugas berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getTasksGantt(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.getTasksGantt({ ...req.query, school_unit_id: req.query.school_unit_id || schoolUnitId });
      res.json({ success: true, data, message: 'Data timeline Gantt tugas berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateTaskGanttSchedule(req, res, next) {
    try {
      const { item_type, raw_id } = req.params;
      const data = await projectsService.updateTaskGanttSchedule(item_type, raw_id, req.body, req.user);
      res.json({ success: true, data, message: 'Jadwal timeline tugas berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getTasksProgressDashboard(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.getTasksProgressDashboard(req.query.school_unit_id || schoolUnitId);
      res.json({ success: true, data, message: 'Agregat progres tugas berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listProgramDiscussions(req, res, next) {
    try {
      const data = await projectsService.listProgramDiscussions(req.query.rips_program_id);
      res.json({ success: true, data, message: 'Daftar diskusi program berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createProgramDiscussion(req, res, next) {
    try {
      const data = await projectsService.createProgramDiscussion(req.body.rips_program_id, req.body.message, req.user);
      res.status(201).json({ success: true, data, message: 'Pesan diskusi berhasil dikirim', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProjectsController();

