const operationalExpensesService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class OperationalExpensesController {
  async listExpenses(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await operationalExpensesService.listExpenses(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getSummary(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await operationalExpensesService.getSummary(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getCashAccounts(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await operationalExpensesService.getCashAccounts(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getCoaAccounts(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const type = req.query.type || 'expense';
      const data = await operationalExpensesService.getCoaAccounts(schoolUnitId, type);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getBankStatements(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await operationalExpensesService.getBankStatements(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getAccountingLedger(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await operationalExpensesService.getAccountingLedger(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createExpense(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { expense_name, amount } = req.body;
      if (!expense_name || amount === undefined) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'expense_name dan amount wajib diisi',
          errors: null
        });
      }
      const data = await operationalExpensesService.createExpense(schoolUnitId, req.body, req.user?.id || null);
      res.status(201).json({
        success: true,
        data,
        message: req.body.type === 'income' ? 'Pemasukan operasional berhasil dicatat' : 'Pengeluaran operasional berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteExpense(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { id } = req.params;
      const data = await operationalExpensesService.deleteExpense(id, schoolUnitId);
      res.json({ success: true, data, message: 'Transaksi operasional berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OperationalExpensesController();
