/**
 * Organization Controller Implementation
 * Modul Kepegawaian - Fitur 2: Organisasi
 */
const organizationService = require('./service');

class OrganizationController {
  // 1. DUK Pangkat
  async getDuk(req, res, next) {
    try {
      const result = await organizationService.getDukPangkat(req.query.school_unit_id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'DUK Pangkat berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Manajemen Jabatan
  async listPositions(req, res, next) {
    try {
      const result = await organizationService.listJobPositions(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar jabatan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getTree(req, res, next) {
    try {
      const result = await organizationService.getJobPositionsTree(req.query.school_unit_id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Struktur pohon jabatan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createPosition(req, res, next) {
    try {
      const result = await organizationService.createJobPosition(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Jabatan berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePosition(req, res, next) {
    try {
      const result = await organizationService.updateJobPosition(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Jabatan berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deletePosition(req, res, next) {
    try {
      const result = await organizationService.deleteJobPosition(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Jabatan berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Riwayat Jabatan
  async listPositionHistory(req, res, next) {
    try {
      const result = await organizationService.listPositionHistory(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Riwayat jabatan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async addPositionHistory(req, res, next) {
    try {
      const result = await organizationService.addPositionHistory(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Riwayat jabatan baru berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Mutasi / Promosi
  async listMutations(req, res, next) {
    try {
      const result = await organizationService.listMutations(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Riwayat mutasi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createMutation(req, res, next) {
    try {
      const result = await organizationService.createMutation(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Mutasi pegawai berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrganizationController();
