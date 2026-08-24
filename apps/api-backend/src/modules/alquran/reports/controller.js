/**
 * Reports Controller for Alquran Module
 */
const reportsService = require('./service');

class ReportsController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  getStudentReport = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getStudentReport(schoolUnitId, req.params.student_ref_id);
      res.json({ success: true, data, message: 'Laporan capaian hafalan santri berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getClassReport = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await reportsService.getClassReport(schoolUnitId, req.params.class_ref_id, req.query.period_label);
      res.json({ success: true, data, message: 'Laporan capaian hafalan kelas berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  exportClassReport = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const format = req.query.format || 'pdf';
      const data = await reportsService.getClassReport(schoolUnitId, req.params.class_ref_id, req.query.period_label);

      // Sesuai catatan api-contract-alquran.md §2.5: export laporan endpoint awal
      res.json({
        success: true,
        data: {
          ...data,
          export_format: format,
          generated_at: new Date().toISOString()
        },
        message: `Laporan kelas berhasil diekspor ke format ${format.toUpperCase()}`,
        errors: null
      });
    } catch (err) { next(err); }
  };
}

module.exports = new ReportsController();
