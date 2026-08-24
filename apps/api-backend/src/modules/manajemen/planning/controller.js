/**
 * Planning Controller Implementation
 */
const planningService = require('./service');
const { getSchoolUnitId, getUserId } = require('../utils/crossModuleHelper');

class PlanningController {
  // RIPS
  async listRips(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await planningService.listRips(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar RIPS berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getRipsById(req, res, next) {
    try {
      const data = await planningService.getRipsById(req.params.id);
      res.json({ success: true, data, message: 'Detail RIPS berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createRips(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await planningService.createRips({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'RIPS berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateRips(req, res, next) {
    try {
      const data = await planningService.updateRips(req.params.id, req.body);
      res.json({ success: true, data, message: 'RIPS berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async approveRips(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await planningService.approveRips(req.params.id, userId);
      res.json({ success: true, data, message: 'RIPS berhasil disetujui (aktif)', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async archiveRips(req, res, next) {
    try {
      const data = await planningService.archiveRips(req.params.id);
      res.json({ success: true, data, message: 'RIPS berhasil diarsipkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // RKS
  async listRks(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await planningService.listRks(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar RKS tahunan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getRksById(req, res, next) {
    try {
      const data = await planningService.getRksById(req.params.id);
      res.json({ success: true, data, message: 'Detail RKS berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createRks(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await planningService.createRks({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'RKS tahunan berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateRks(req, res, next) {
    try {
      const data = await planningService.updateRks(req.params.id, req.body);
      res.json({ success: true, data, message: 'RKS berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async submitRks(req, res, next) {
    try {
      const data = await planningService.submitRks(req.params.id);
      res.json({ success: true, data, message: 'RKS berhasil diajukan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async approveRks(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await planningService.approveRks(req.params.id, userId);
      res.json({ success: true, data, message: 'RKS berhasil disetujui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Work Plan Programs
  async listPrograms(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await planningService.listPrograms(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar program kerja berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getProgramById(req, res, next) {
    try {
      const data = await planningService.getProgramById(req.params.id);
      res.json({ success: true, data, message: 'Detail program kerja berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createProgram(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await planningService.createProgram({ ...req.body, school_unit_id: schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Program kerja berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateProgram(req, res, next) {
    try {
      const data = await planningService.updateProgram(req.params.id, req.body);
      res.json({ success: true, data, message: 'Program kerja berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateProgramStatus(req, res, next) {
    try {
      const data = await planningService.updateProgramStatus(req.params.id, req.body.status);
      res.json({ success: true, data, message: 'Status program kerja berhasil diubah', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteProgram(req, res, next) {
    try {
      const data = await planningService.deleteProgram(req.params.id);
      res.json({ success: true, data, message: 'Program kerja berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PlanningController();
