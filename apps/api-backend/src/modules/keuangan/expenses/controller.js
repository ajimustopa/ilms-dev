/**
 * Expenses Controller for Keuangan Module
 */
const expensesService = require('./service');

class ExpensesController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  listExpenses = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await expensesService.listExpenses(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar pengeluaran berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getExpenseById = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await expensesService.getExpenseById(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Data pengeluaran tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Detail pengeluaran berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createExpense = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await expensesService.createExpense(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Pengeluaran berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };

  updateExpense = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await expensesService.updateExpense(schoolUnitId, req.params.id, req.body, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Data pengeluaran tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Pengeluaran berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };

  deleteExpense = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const reason = req.body.deleted_reason || req.body.reason || req.query.reason || 'Dibatalkan oleh user';
      const result = await expensesService.softDeleteExpense(schoolUnitId, req.params.id, reason, req.user?.id);
      if (!result) return res.status(404).json({ success: false, data: null, message: 'Data pengeluaran tidak ditemukan', errors: null });
      res.json({
        success: true,
        data: result,
        message: result.message || 'Pengeluaran berhasil dibatalkan dan jurnal pembalik telah diterbitkan',
        errors: null
      });
    } catch (err) { next(err); }
  };

  reassignFundSource = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await expensesService.reassignExpenseFundSource(schoolUnitId, req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Sumber dana pengeluaran berhasil dialokasikan ulang', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new ExpensesController();
