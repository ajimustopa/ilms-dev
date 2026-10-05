const dashboardService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class DashboardController {
  async getSummary(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await dashboardService.getSummary(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getSalesChart(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await dashboardService.getSalesChart(schoolUnitId, req.query.period);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();
