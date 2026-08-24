/**
 * Parent-Facing Controller Implementation
 */
const parentFacingService = require('./service');

class ParentFacingController {
  async getStudentLoanHistory(req, res, next) {
    try {
      const data = await parentFacingService.getStudentLoanHistory(req.params.student_ref_id);
      res.json({
        success: true,
        data,
        message: 'Riwayat baca santri berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ParentFacingController();
