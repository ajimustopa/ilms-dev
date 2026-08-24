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
      const data = await projectsService.updateTask(req.params.id, req.body);
      res.json({ success: true, data, message: 'Detail tugas berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateTaskStatus(req, res, next) {
    try {
      const data = await projectsService.updateTaskStatus(req.params.id, req.body.status);
      res.json({ success: true, data, message: 'Status tugas berhasil diubah', errors: null });
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

  async listApprovalRequests(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await projectsService.listApprovalRequests(schoolUnitId, req.query, req.user);
      res.json({ success: true, data, message: 'Daftar pengajuan approval berhasil diambil', errors: null });
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

  async getApprovalRequestActions(req, res, next) {
    try {
      const data = await projectsService.getApprovalRequestActions(req.params.id);
      res.json({ success: true, data, message: 'Riwayat tindakan approval berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProjectsController();
