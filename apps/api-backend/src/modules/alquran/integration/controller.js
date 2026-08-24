/**
 * Integration Controller (Parent-Facing) for Alquran Module
 */
const integrationService = require('./service');

class IntegrationController {
  getStudentAchievements = async (req, res, next) => {
    try {
      const studentRefId = req.params.student_ref_id;
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;

      const data = await integrationService.getStudentAchievementsForParent(studentRefId, schoolUnitId);

      res.json({
        success: true,
        data,
        message: 'Data capaian hafalan berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };
}

module.exports = new IntegrationController();
