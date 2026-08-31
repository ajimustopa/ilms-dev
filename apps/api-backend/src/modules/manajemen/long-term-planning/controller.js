/**
 * Long Term Planning Controller
 * Modul Manajemen - Fitur RKJP & RKJM
 */
const LongTermPlanningService = require('./service');
const service = new LongTermPlanningService();

class LongTermPlanningController {
  async createPlan(req, res, next) {
    try {
      const data = await service.createRkjpWithRkjm(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'RKJP 8 Tahun dan 2 RKJM turunan berhasil dibuat',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async listPlans(req, res, next) {
    try {
      const data = await service.listPlans(req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar dokumen perencanaan jangka panjang berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPlanById(req, res, next) {
    try {
      const data = await service.getPlanById(req.params.id);
      res.json({
        success: true,
        data,
        message: 'Data dokumen perencanaan jangka panjang berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPlanTargets(req, res, next) {
    try {
      const data = await service.getPlanTargets(req.params.id);
      res.json({
        success: true,
        data,
        message: 'Matriks target tahunan per program berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async bulkUpsertTargets(req, res, next) {
    try {
      const { school_unit_id, items, goal_items } = req.body;
      const data = await service.bulkUpsertTargets(school_unit_id, items, goal_items);
      res.json({
        success: true,
        data,
        message: 'Penerapan rencana program & target sasaran berhasil disimpan',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async publishPlan(req, res, next) {
    try {
      const data = await service.publishPlan(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data,
        message: 'Dokumen perencanaan berhasil diterbitkan ke Document Publications',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePlan(req, res, next) {
    try {
      const data = await service.updatePlan(req.params.id, req.body);
      res.json({
        success: true,
        data,
        message: 'Dokumen perencanaan berhasil diperbarui',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async deletePlan(req, res, next) {
    try {
      const data = await service.deletePlan(req.params.id);
      res.json({
        success: true,
        data,
        message: 'Dokumen perencanaan dan seluruh turunannya berhasil dihapus',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPublications(req, res, next) {
    try {
      const plan = await service.getPlanById(req.params.id);
      const data = await service.getPublications(req.params.id, plan.plan_type);
      res.json({
        success: true,
        data,
        message: 'Riwayat penerbitan dokumen berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LongTermPlanningController();
