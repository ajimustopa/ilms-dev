/**
 * Reminders Controller Implementation
 */
const remindersService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');

class RemindersController {
  async listReminders(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await remindersService.listReminders(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar riwayat pengingat jatuh tempo berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async runReminderJob(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await remindersService.runReminderJob(schoolUnitId);
      res.status(201).json({
        success: true,
        data,
        message: 'Pemeriksaan & antrean pengingat jatuh tempo berhasil dijalankan',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RemindersController();
