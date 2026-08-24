/**
 * Dashboard Controller for Keuangan Module
 */
const dashboardService = require('./service');

class DashboardController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  getDashboardSummary = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await dashboardService.getDashboardSummary(schoolUnitId, req.query.academic_year_id);
      res.json({ success: true, data, message: 'Data dashboard keuangan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new DashboardController();
