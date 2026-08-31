/**
 * RIPS Controller
 * Modul Manajemen - Fitur Rencana Induk Pengembangan Sekolah
 */
const RipsService = require('./service');
const service = new RipsService();

class RipsController {
  // Master Domains & Subdomains
  async listDomains(req, res, next) {
    try {
      const data = await service.listDomains();
      res.json({ success: true, data, message: 'Daftar bidang & sub-bidang RIPS berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createDomain(req, res, next) {
    try {
      const data = await service.createDomain(req.body);
      res.status(201).json({ success: true, data, message: 'Bidang RIPS berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateDomain(req, res, next) {
    try {
      const data = await service.updateDomain(req.params.id, req.body);
      res.json({ success: true, data, message: 'Bidang RIPS berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteDomain(req, res, next) {
    try {
      await service.deleteDomain(req.params.id);
      res.json({ success: true, data: null, message: 'Bidang RIPS berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createSubdomain(req, res, next) {
    try {
      const data = await service.createSubdomain(req.body);
      res.status(201).json({ success: true, data, message: 'Sub-bidang RIPS berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateSubdomain(req, res, next) {
    try {
      const data = await service.updateSubdomain(req.params.id, req.body);
      res.json({ success: true, data, message: 'Sub-bidang RIPS berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteSubdomain(req, res, next) {
    try {
      await service.deleteSubdomain(req.params.id);
      res.json({ success: true, data: null, message: 'Sub-bidang RIPS berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Master BSC Aspects
  async listBscAspects(req, res, next) {
    try {
      const data = await service.listBscAspects();
      res.json({ success: true, data, message: 'Daftar aspek BSC berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createBscAspect(req, res, next) {
    try {
      const data = await service.createBscAspect(req.body);
      res.status(201).json({ success: true, data, message: 'Aspek BSC berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateBscAspect(req, res, next) {
    try {
      const data = await service.updateBscAspect(req.params.id, req.body);
      res.json({ success: true, data, message: 'Aspek BSC berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteBscAspect(req, res, next) {
    try {
      await service.deleteBscAspect(req.params.id);
      res.json({ success: true, data: null, message: 'Aspek BSC berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Master Program Categories
  async listProgramCategories(req, res, next) {
    try {
      const data = await service.listProgramCategories();
      res.json({ success: true, data, message: 'Daftar kategori program berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createProgramCategory(req, res, next) {
    try {
      const data = await service.createProgramCategory(req.body);
      res.status(201).json({ success: true, data, message: 'Kategori program berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateProgramCategory(req, res, next) {
    try {
      const data = await service.updateProgramCategory(req.params.id, req.body);
      res.json({ success: true, data, message: 'Kategori program berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteProgramCategory(req, res, next) {
    try {
      await service.deleteProgramCategory(req.params.id);
      res.json({ success: true, data: null, message: 'Kategori program berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // RIPS Document Header
  async getRipsDocument(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || null;
      const data = await service.getOrInitRipsDocument(schoolUnitId);
      res.json({ success: true, data, message: 'Data dokumen RIPS berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateRipsDocument(req, res, next) {
    try {
      const data = await service.updateRipsDocument(req.params.id, req.body);
      res.json({ success: true, data, message: 'Data dokumen RIPS berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // RIPS Goals
  async listGoals(req, res, next) {
    try {
      const { rips_document_id } = req.query;
      if (!rips_document_id) {
        return res.status(422).json({ success: false, data: null, message: 'rips_document_id wajib disertakan', errors: null });
      }
      const data = await service.listGoals(Number(rips_document_id), req.query);
      res.json({ success: true, data, message: 'Daftar sasaran RIPS berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createGoal(req, res, next) {
    try {
      const data = await service.createGoal(req.body);
      res.status(201).json({ success: true, data, message: 'Sasaran RIPS berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateGoal(req, res, next) {
    try {
      const data = await service.updateGoal(req.params.id, req.body);
      res.json({ success: true, data, message: 'Sasaran RIPS berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteGoal(req, res, next) {
    try {
      await service.deleteGoal(req.params.id);
      res.json({ success: true, data: null, message: 'Sasaran RIPS berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // RIPS Goal Indicators
  async addIndicator(req, res, next) {
    try {
      const data = await service.addIndicator(req.params.id, req.body);
      res.status(201).json({ success: true, data, message: 'Indikator sasaran berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateIndicator(req, res, next) {
    try {
      const data = await service.updateIndicator(req.params.id, req.body);
      res.json({ success: true, data, message: 'Indikator sasaran berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteIndicator(req, res, next) {
    try {
      await service.deleteIndicator(req.params.id);
      res.json({ success: true, data: null, message: 'Indikator sasaran berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // RIPS Programs & Links
  async listPrograms(req, res, next) {
    try {
      const { rips_document_id } = req.query;
      if (!rips_document_id) {
        return res.status(422).json({ success: false, data: null, message: 'rips_document_id wajib disertakan', errors: null });
      }
      const data = await service.listPrograms(Number(rips_document_id));
      res.json({ success: true, data, message: 'Daftar program RIPS berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createProgram(req, res, next) {
    try {
      const data = await service.createProgram(req.body);
      res.status(201).json({ success: true, data, message: 'Program RIPS berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateProgram(req, res, next) {
    try {
      const data = await service.updateProgram(req.params.id, req.body);
      res.json({ success: true, data, message: 'Program RIPS berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteProgram(req, res, next) {
    try {
      await service.deleteProgram(req.params.id);
      res.json({ success: true, data: null, message: 'Program RIPS berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async linkProgramGoals(req, res, next) {
    try {
      const { rips_goal_ids } = req.body;
      const data = await service.linkProgramGoals(req.params.id, rips_goal_ids || []);
      res.json({ success: true, data, message: 'Relasi sasaran dan program berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Publish & History
  async publishRipsDocument(req, res, next) {
    try {
      const data = await service.publishRipsDocument(req.params.id, req.body, req.user);
      res.json({ success: true, data, message: 'Dokumen RIPS berhasil diterbitkan ke Document Publications', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getPublications(req, res, next) {
    try {
      const data = await service.getPublications(req.params.id);
      res.json({ success: true, data, message: 'Riwayat penerbitan RIPS berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Deletion Impact Inspections
  async getDomainImpact(req, res, next) {
    try {
      const data = await service.getDomainImpact(req.params.id);
      res.json({ success: true, data, message: 'Analisis dampak penghapusan bidang berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getSubdomainImpact(req, res, next) {
    try {
      const data = await service.getSubdomainImpact(req.params.id);
      res.json({ success: true, data, message: 'Analisis dampak penghapusan sub-bidang berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getGoalImpact(req, res, next) {
    try {
      const data = await service.getGoalImpact(req.params.id);
      res.json({ success: true, data, message: 'Analisis dampak penghapusan sasaran berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getProgramImpact(req, res, next) {
    try {
      const data = await service.getProgramImpact(req.params.id);
      res.json({ success: true, data, message: 'Analisis dampak penghapusan program berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RipsController();

