/**
 * Activity Logs Controller Implementation
 */
const activityLogsService = require('./service');

class ActivityLogsController {
  async listLoginLogs(req, res, next) {
    try {
      const result = await activityLogsService.listLoginLogs(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Log login berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async internalRecord(req, res, next) {
    try {
      const result = await activityLogsService.internalRecordLog(
        req.body,
        req.ip || req.connection?.remoteAddress
      );
      res.status(201).json({
        success: true,
        data: result,
        message: 'Log aktivitas berhasil dicatat ke audit trail Core Service',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listAdminActionLogs(req, res, next) {
    try {
      const result = await activityLogsService.listAdminActionLogs(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Audit log aktivitas admin berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getAdminActionLogById(req, res, next) {
    try {
      const result = await activityLogsService.getAdminActionLogById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail audit log berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ActivityLogsController();
