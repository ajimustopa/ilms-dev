/**
 * Annual Work Plan (RKT) Controller
 * Modul Manajemen
 */
const AnnualWorkPlanService = require('./service');
const service = new AnnualWorkPlanService();

class AnnualWorkPlanController {
  // Master Committee Positions
  async listCommitteePositionTypes(req, res, next) {
    try {
      const data = await service.listCommitteePositionTypes();
      res.json({ success: true, data, message: 'Daftar jenis jabatan kepanitiaan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createCommitteePositionType(req, res, next) {
    try {
      const data = await service.createCommitteePositionType(req.body);
      res.status(201).json({ success: true, data, message: 'Jenis jabatan kepanitiaan berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateCommitteePositionType(req, res, next) {
    try {
      const data = await service.updateCommitteePositionType(req.params.id, req.body);
      res.json({ success: true, data, message: 'Jenis jabatan kepanitiaan berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteCommitteePositionType(req, res, next) {
    try {
      await service.deleteCommitteePositionType(req.params.id);
      res.json({ success: true, data: null, message: 'Jenis jabatan kepanitiaan berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Annual Work Plans (RKT)
  async getOrInitAnnualWorkPlan(req, res, next) {
    try {
      const { school_unit_id, academic_year, context } = req.query;
      const data = await service.getOrInitAnnualWorkPlan(school_unit_id, academic_year, req.user, context);
      res.json({ success: true, data, message: 'Data RKT berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listAnnualWorkPlans(req, res, next) {
    try {
      const data = await service.listAnnualWorkPlans(req.query);
      res.json({ success: true, data, message: 'Daftar dokumen RKT berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getAnnualWorkPlanById(req, res, next) {
    try {
      const data = await service.getAnnualWorkPlanById(req.params.id);
      res.json({ success: true, data, message: 'Data RKT berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateAnnualWorkPlan(req, res, next) {
    try {
      const data = await service.updateAnnualWorkPlan(req.params.id, req.body);
      res.json({ success: true, data, message: 'Data RKT berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getRktProgramMatrix(req, res, next) {
    try {
      const data = await service.getRktProgramMatrix(req.params.id);
      res.json({ success: true, data, message: 'Matriks program dan aktivitas RKT berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Work Plan Activities
  async listActivities(req, res, next) {
    try {
      const data = await service.listActivities(req.query);
      res.json({ success: true, data, message: 'Daftar aktivitas kegiatan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createActivity(req, res, next) {
    try {
      const data = await service.createActivity(req.body);
      res.status(201).json({ success: true, data, message: 'Aktivitas kegiatan berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateActivity(req, res, next) {
    try {
      const data = await service.updateActivity(req.params.id, req.body);
      res.json({ success: true, data, message: 'Aktivitas kegiatan berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteActivity(req, res, next) {
    try {
      await service.deleteActivity(req.params.id);
      res.json({ success: true, data: null, message: 'Aktivitas kegiatan berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Program Committees & Members
  async getOrCreateCommittee(req, res, next) {
    try {
      const { annual_work_plan_id, rips_program_id } = req.query;
      const data = await service.getOrCreateCommittee(annual_work_plan_id, rips_program_id);
      res.json({ success: true, data, message: 'Data kepanitiaan program berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async addCommitteeMember(req, res, next) {
    try {
      const data = await service.addCommitteeMember(req.params.id, req.body);
      res.status(201).json({ success: true, data, message: 'Anggota kepanitiaan berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async removeCommitteeMember(req, res, next) {
    try {
      await service.removeCommitteeMember(req.params.memberId);
      res.json({ success: true, data: null, message: 'Anggota kepanitiaan berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async sahkanCommittee(req, res, next) {
    try {
      const data = await service.sahkanCommittee(req.params.id, req.body);
      res.json({ success: true, data, message: 'Kepanitiaan program berhasil disahkan dengan SK', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Publication
  async publishAnnualWorkPlan(req, res, next) {
    try {
      const data = await service.publishAnnualWorkPlan(req.params.id, req.body, req.user);
      res.json({ success: true, data, message: 'Dokumen RKT berhasil diterbitkan ke Document Publications', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getPublications(req, res, next) {
    try {
      const data = await service.getPublications(req.params.id);
      res.json({ success: true, data, message: 'Riwayat penerbitan RKT berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Program Management in RKT
  async getAvailableRipsPrograms(req, res, next) {
    try {
      const data = await service.getAvailableRipsPrograms(req.params.id);
      res.json({ success: true, data, message: 'Daftar program RIPS yang tersedia berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async addProgramToRkt(req, res, next) {
    try {
      const data = await service.addProgramToRkt(req.params.id, req.body, req.user);
      res.status(201).json({ success: true, data, message: 'Program RIPS berhasil ditambahkan ke RKT', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createAndAttachProgramToRkt(req, res, next) {
    try {
      const data = await service.createAndAttachProgramToRkt(req.params.id, req.body, req.user);
      res.status(201).json({ success: true, data, message: 'Program baru berhasil dibuat di RIPS dan dimasukkan ke RKT', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async removeProgramFromRkt(req, res, next) {
    try {
      const data = await service.removeProgramFromRkt(req.params.id, req.params.programId);
      res.json({ success: true, data, message: 'Program berhasil dikeluarkan dari RKT', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnnualWorkPlanController();

