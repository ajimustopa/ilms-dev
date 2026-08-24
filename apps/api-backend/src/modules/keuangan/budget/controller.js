/**
 * Budget Controller for Keuangan Module
 */
const budgetService = require('./service');

class BudgetController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  listBudgetPlans = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await budgetService.listBudgetPlans(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar RAPBS berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getBudgetPlanById = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await budgetService.getBudgetPlanById(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'RAPBS tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Detail RAPBS berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createBudgetPlanDraft = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await budgetService.createBudgetPlanDraft(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Draft RAPBS berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  };

  createNewVersionFromPublished = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await budgetService.createNewVersionFromPublished(
        schoolUnitId,
        req.params.id,
        req.body.revision_reason,
        req.user?.id
      );
      if (!data) return res.status(404).json({ success: false, data: null, message: 'RAPBS asal tidak ditemukan', errors: null });
      res.status(201).json({ success: true, data, message: 'Versi baru RAPBS berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  };

  publishBudgetPlan = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await budgetService.publishBudgetPlan(schoolUnitId, req.params.id, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'RAPBS tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'RAPBS berhasil diterbitkan', errors: null });
    } catch (err) { next(err); }
  };

  addIncomeItem = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await budgetService.addIncomeItem(schoolUnitId, req.params.id, req.body, req.user?.id);
      if (!data) return res.status(400).json({ success: false, data: null, message: 'Gagal menambah pendapatan RAPBS (pastikan status draft)', errors: null });
      res.status(201).json({ success: true, data, message: 'Rencana pendapatan berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateIncomeItem = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await budgetService.updateIncomeItem(schoolUnitId, req.params.id, req.params.item_id, req.body, req.user?.id);
      if (!data) return res.status(400).json({ success: false, data: null, message: 'Gagal mengubah pendapatan RAPBS', errors: null });
      res.json({ success: true, data, message: 'Rencana pendapatan berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  deleteIncomeItem = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const success = await budgetService.deleteIncomeItem(schoolUnitId, req.params.id, req.params.item_id, req.user?.id);
      if (!success) return res.status(400).json({ success: false, data: null, message: 'Gagal menghapus pendapatan RAPBS', errors: null });
      res.json({ success: true, data: null, message: 'Rencana pendapatan berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  };

  addExpenseItem = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await budgetService.addExpenseItem(schoolUnitId, req.params.id, req.body, req.user?.id);
      if (!data) return res.status(400).json({ success: false, data: null, message: 'Gagal menambah pengeluaran RAPBS (pastikan status draft)', errors: null });
      res.status(201).json({ success: true, data, message: 'Rencana pengeluaran berhasil ditambahkan', errors: null });
    } catch (err) { next(err); }
  };

  updateExpenseItem = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await budgetService.updateExpenseItem(schoolUnitId, req.params.id, req.params.item_id, req.body, req.user?.id);
      if (!data) return res.status(400).json({ success: false, data: null, message: 'Gagal mengubah pengeluaran RAPBS', errors: null });
      res.json({ success: true, data, message: 'Rencana pengeluaran berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  deleteExpenseItem = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const success = await budgetService.deleteExpenseItem(schoolUnitId, req.params.id, req.params.item_id, req.user?.id);
      if (!success) return res.status(400).json({ success: false, data: null, message: 'Gagal menghapus pengeluaran RAPBS', errors: null });
      res.json({ success: true, data: null, message: 'Rencana pengeluaran berhasil dihapus', errors: null });
    } catch (err) { next(err); }
  };

  getBudgetRealization = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await budgetService.getBudgetRealization(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'RAPBS tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Realisasi anggaran berhasil dihitung', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new BudgetController();
