/**
 * PSB Candidate Portal Controller
 * Modul Akademik
 */
const portalService = require('./service');

class PsbPortalController {
  async getProfile(req, res, next) {
    try {
      const data = await portalService.getProfile(req.user.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Profil pendaftar berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async updateDataLengkap(req, res, next) {
    try {
      const data = await portalService.updateDataLengkap(req.user.id, req.body);
      return res.status(200).json({
        success: true,
        data,
        message: 'Data formulir lengkap berhasil diperbarui'
      });
    } catch (err) {
      next(err);
    }
  }

  async listDocuments(req, res, next) {
    try {
      const data = await portalService.listDocuments(req.user.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Daftar dokumen berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async uploadDocument(req, res, next) {
    try {
      const data = await portalService.uploadDocument(req.user.id, req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Dokumen pendaftaran berhasil diunggah'
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteDocument(req, res, next) {
    try {
      const data = await portalService.deleteDocument(req.user.id, req.params.docId);
      return res.status(200).json({
        success: true,
        data,
        message: 'Dokumen pendaftaran berhasil dihapus'
      });
    } catch (err) {
      next(err);
    }
  }

  async listTestSessions(req, res, next) {
    try {
      const data = await portalService.listTestSessions(req.user.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Daftar sesi tes calon murid berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async getTestSessionDetail(req, res, next) {
    try {
      const data = await portalService.getTestSessionDetail(req.user.id, req.params.sessionId);
      return res.status(200).json({
        success: true,
        data,
        message: 'Detail sesi ujian berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async submitTestSession(req, res, next) {
    try {
      const answers = req.body.answers || [];
      const data = await portalService.submitTestSession(req.user.id, req.params.sessionId, answers);
      return res.status(200).json({
        success: true,
        data,
        message: data.message || 'Jawaban ujian berhasil dikirim'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PsbPortalController();
