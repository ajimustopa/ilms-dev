/**
 * Internal Controller Implementation
 * Modul Kepegawaian - Fitur 6: Endpoint Data Pegawai & Struktur Jabatan untuk Konsumsi Modul Lain
 */
const kepegawaianInternalService = require('./service');

class KepegawaianInternalController {
  async listEmployees(req, res, next) {
    try {
      const result = await kepegawaianInternalService.listInternalEmployees(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data pegawai berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getEmployeeById(req, res, next) {
    try {
      const result = await kepegawaianInternalService.getInternalEmployeeById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail pegawai berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getJobPositionsTree(req, res, next) {
    try {
      const result = await kepegawaianInternalService.getJobPositionsTree(req.query.school_unit_id);
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
}

module.exports = new KepegawaianInternalController();
