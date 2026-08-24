/**
 * Internal Controller Implementation
 * Modul Akademik - Fitur 9: Endpoint X-API-Key Inter-Service
 */
const internalService = require('./service');

class InternalController {
  async getStudentBrief(req, res, next) {
    try {
      const data = await internalService.getStudentBrief(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Detail ringkas siswa berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listActiveStudents(req, res, next) {
    try {
      const data = await internalService.listActiveStudents(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar siswa aktif berhasil diambil untuk kebutuhan antar-layanan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getStudentGuardians(req, res, next) {
    try {
      const data = await internalService.getStudentGuardians(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Data wali siswa berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getClassGroupDetail(req, res, next) {
    try {
      const data = await internalService.getClassGroupDetail(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Detail rombel berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async receiveExamResult(req, res, next) {
    try {
      const data = await internalService.receiveExamResult(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Hasil ujian CBE berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InternalController();
