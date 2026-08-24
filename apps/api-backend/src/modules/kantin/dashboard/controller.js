const dashboardService = require('./service');

class DashboardController {
  async getSummary(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await dashboardService.getSummary(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getSalesChart(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await dashboardService.getSalesChart(schoolUnitId, req.query.period);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();
