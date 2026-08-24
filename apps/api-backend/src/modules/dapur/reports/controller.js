/**
 * Dapur Dashboard & Reports Controller
 */
const reportsService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');

class DapurReportsController {
  async getDashboardSummary(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await reportsService.getDashboardSummary(schoolUnitId);
      res.json({
        success: true,
        data,
        message: 'Ringkasan dashboard Dapur berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DapurReportsController();
