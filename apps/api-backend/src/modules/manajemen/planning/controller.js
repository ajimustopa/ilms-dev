/**
 * Planning Controller Implementation
 */
const planningService = require('./service');
const { getSchoolUnitId, getUserId } = require('../utils/crossModuleHelper');

class PlanningController {
  // ==========================================
  // 0. EXECUTIVE DASHBOARD (FITUR 14)
  // ==========================================
  async getExecutiveDashboard(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await planningService.getExecutiveDashboard(schoolUnitId);
      res.json({ success: true, data, message: 'Data Dashboard Eksekutif berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 0. MASTER REFERENCES & TRACEABILITY
  // ==========================================
  async getReferences(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await planningService.getPlanningReferences(schoolUnitId);
      res.json({ success: true, data, message: 'Referensi master berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getTraceabilityChain(req, res, next) {
    try {
      const { type, id } = req.params;
      const data = await planningService.getTraceabilityChain(type, id);
      res.json({ success: true, data, message: 'Rantai penelusuran perencanaan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 1. RIPS / RENSTRA
  // ==========================================
  async listRips(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await planningService.listRips(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar Renstra berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getRipsById(req, res, next) {
    try {
      const data = await planningService.getRipsById(req.params.id);
      res.json({ success: true, data, message: 'Detail Renstra berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createRips(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id !== undefined ? req.body.school_unit_id : getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await planningService.createRips({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'Renstra berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateRips(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await planningService.updateRips(req.params.id, req.body, userId);
      res.json({ success: true, data, message: 'Renstra berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteRips(req, res, next) {
    try {
      const data = await planningService.deleteRips(req.params.id);
      res.json({ success: true, data, message: 'Renstra berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async approveRips(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await planningService.approveRips(req.params.id, userId);
      res.json({ success: true, data, message: 'Renstra berhasil disetujui (aktif)', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async archiveRips(req, res, next) {
    try {
      const data = await planningService.archiveRips(req.params.id);
      res.json({ success: true, data, message: 'Renstra berhasil diarsipkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 2. SASARAN STRATEGIS (Strategic Goals)
  // ==========================================
  async listStrategicGoals(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await planningService.listStrategicGoals(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar sasaran strategis berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getStrategicGoalById(req, res, next) {
    try {
      const data = await planningService.getStrategicGoalById(req.params.id);
      res.json({ success: true, data, message: 'Detail sasaran strategis berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createStrategicGoal(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id !== undefined ? req.body.school_unit_id : getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await planningService.createStrategicGoal({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'Sasaran strategis berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateStrategicGoal(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await planningService.updateStrategicGoal(req.params.id, req.body, userId);
      res.json({ success: true, data, message: 'Sasaran strategis berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteStrategicGoal(req, res, next) {
    try {
      const data = await planningService.deleteStrategicGoal(req.params.id);
      res.json({ success: true, data, message: 'Sasaran strategis berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async reorderStrategicGoals(req, res, next) {
    try {
      const data = await planningService.reorderStrategicGoals(req.body.items);
      res.json({ success: true, data, message: 'Urutan sasaran strategis berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 3. RPS, RJJP, RJM & RKS (School Work Plans)
  // ==========================================
  async listRks(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await planningService.listRks(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar rencana kerja / RPS / RJJP / RJM / RKT berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getRksById(req, res, next) {
    try {
      const data = await planningService.getRksById(req.params.id);
      res.json({ success: true, data, message: 'Detail rencana kerja berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createRks(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id !== undefined ? req.body.school_unit_id : getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await planningService.createRks({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'Rencana kerja berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateRks(req, res, next) {
    try {
      const data = await planningService.updateRks(req.params.id, req.body);
      res.json({ success: true, data, message: 'Rencana kerja berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteRks(req, res, next) {
    try {
      const data = await planningService.deleteRks(req.params.id);
      res.json({ success: true, data, message: 'Rencana kerja berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async submitRks(req, res, next) {
    try {
      const data = await planningService.submitRks(req.params.id);
      res.json({ success: true, data, message: 'Rencana kerja berhasil diajukan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async approveRks(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await planningService.approveRks(req.params.id, userId);
      res.json({ success: true, data, message: 'Rencana kerja berhasil disetujui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 4. PROGRAM KERJA TAHUNAN
  // ==========================================
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
      const schoolUnitId = req.body.school_unit_id !== undefined ? req.body.school_unit_id : getSchoolUnitId(req);
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

  async setProgramPriority(req, res, next) {
    try {
      const data = await planningService.setProgramPriority(req.params.id, req.body);
      res.json({ success: true, data, message: 'Atribut prioritas program berhasil diperbarui', errors: null });
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

  // ==========================================
  // 5. RENOP KEGIATAN & SUBKEGIATAN
  // ==========================================
  async listActivities(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await planningService.listActivities(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar kegiatan Renop berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getActivityById(req, res, next) {
    try {
      const data = await planningService.getActivityById(req.params.id);
      res.json({ success: true, data, message: 'Detail kegiatan Renop berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createActivity(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id !== undefined ? req.body.school_unit_id : getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await planningService.createActivity({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'Kegiatan Renop berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateActivity(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await planningService.updateActivity(req.params.id, req.body, userId);
      res.json({ success: true, data, message: 'Kegiatan Renop berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteActivity(req, res, next) {
    try {
      const data = await planningService.deleteActivity(req.params.id);
      res.json({ success: true, data, message: 'Kegiatan Renop berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PlanningController();
