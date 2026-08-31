/**
 * EVADIR Controller
 * Modul Manajemen
 */
const EvadirService = require('./service');
const service = new EvadirService();

class EvadirController {
  async listReports(req, res, next) {
    try {
      const data = await service.listReports(req.query);
      res.json({ success: true, data, message: 'Daftar laporan EVADIR berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getReportById(req, res, next) {
    try {
      const data = await service.getReportById(req.params.id);
      res.json({ success: true, data, message: 'Detail laporan EVADIR berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createReport(req, res, next) {
    try {
      const data = await service.createReport(req.body, req.user);
      res.status(201).json({ success: true, data, message: 'Laporan EVADIR baru berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateReport(req, res, next) {
    try {
      const data = await service.updateReport(req.params.id, req.body);
      res.json({ success: true, data, message: 'Laporan EVADIR berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteReport(req, res, next) {
    try {
      await service.deleteReport(req.params.id);
      res.json({ success: true, data: null, message: 'Laporan EVADIR berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getGoalResults(req, res, next) {
    try {
      const data = await service.getGoalResults(req.params.id);
      res.json({ success: true, data, message: 'Hasil evaluasi sasaran RIPS berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async bulkUpsertGoalResults(req, res, next) {
    try {
      const { items } = req.body;
      const data = await service.bulkUpsertGoalResults(req.params.id, items);
      res.json({ success: true, data, message: 'Hasil evaluasi sasaran berhasil disimpan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async publishReport(req, res, next) {
    try {
      const data = await service.publishReport(req.params.id, req.body, req.user);
      res.json({ success: true, data, message: 'Laporan EVADIR berhasil diterbitkan ke Document Publications', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getPublications(req, res, next) {
    try {
      const data = await service.getPublications(req.params.id);
      res.json({ success: true, data, message: 'Riwayat penerbitan EVADIR berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // BSC
  async getBscDashboard(req, res, next) {
    try {
      const data = await service.getBscDashboard(req.query.evadir_report_id);
      res.json({ success: true, data, message: 'Dashboard Balanced Scorecard berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getBscTrend(req, res, next) {
    try {
      const data = await service.getBscTrend(req.query.rips_document_id, req.query.bsc_aspect_id);
      res.json({ success: true, data, message: 'Tren Balanced Scorecard berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EvadirController();

