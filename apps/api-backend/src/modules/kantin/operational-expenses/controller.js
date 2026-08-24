const operationalExpensesService = require('./service');

class OperationalExpensesController {
  async listExpenses(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await operationalExpensesService.listExpenses(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createExpense(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const { expense_name, amount } = req.body;
      if (!expense_name || amount === undefined) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'expense_name dan amount wajib diisi',
          errors: null
        });
      }
      const data = await operationalExpensesService.createExpense(schoolUnitId, req.body, req.user?.id || 1);
      res.status(201).json({ success: true, data, message: 'Pengeluaran operasional berhasil dicatat', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OperationalExpensesController();
