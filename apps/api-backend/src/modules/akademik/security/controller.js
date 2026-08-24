/**
 * Security Controller Implementation
 * Modul Akademik - Fitur 8: Audit Log Aktivitas
 */
const securityService = require('./service');

class SecurityController {
  async listActivityLogs(req, res, next) {
    try {
      const data = await securityService.listActivityLogs(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Log aktivitas berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SecurityController();
