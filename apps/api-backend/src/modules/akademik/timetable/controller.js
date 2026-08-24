/**
 * Timetable Controller Implementation
 */
const timetableService = require('./service');

class TimetableController {
  // Time Slots
  async listTimeSlots(req, res, next) {
    try {
      const data = await timetableService.listTimeSlots(req.query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async saveTimeSlot(req, res, next) {
    try {
      const data = await timetableService.saveTimeSlot(req.body);
      res.json({ success: true, data, message: 'Time slot berhasil disimpan' });
    } catch (err) { next(err); }
  }

  async deleteTimeSlot(req, res, next) {
    try {
      const data = await timetableService.deleteTimeSlot(req.params.id);
      res.json({ success: true, data, message: 'Time slot berhasil dihapus' });
    } catch (err) { next(err); }
  }

  // Teacher Availabilities
  async getTeacherAvailabilities(req, res, next) {
    try {
      const { academic_year_id, teacher_employee_id } = req.query;
      const data = await timetableService.getTeacherAvailabilities(academic_year_id, teacher_employee_id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async bulkSaveTeacherAvailabilities(req, res, next) {
    try {
      const data = await timetableService.bulkSaveTeacherAvailabilities(req.body);
      res.json({ success: true, data, message: 'Ketersediaan guru berhasil disimpan' });
    } catch (err) { next(err); }
  }

  // Class Availabilities
  async getClassAvailabilities(req, res, next) {
    try {
      const { academic_year_id, class_group_id } = req.query;
      const data = await timetableService.getClassAvailabilities(academic_year_id, class_group_id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async bulkSaveClassAvailabilities(req, res, next) {
    try {
      const data = await timetableService.bulkSaveClassAvailabilities(req.body);
      res.json({ success: true, data, message: 'Ketersediaan rombel berhasil disimpan' });
    } catch (err) { next(err); }
  }

  // Lessons
  async listLessons(req, res, next) {
    try {
      const data = await timetableService.listLessons(req.query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async saveLesson(req, res, next) {
    try {
      const data = await timetableService.saveLesson(req.body);
      res.json({ success: true, data, message: 'Lesson beban mengajar berhasil disimpan' });
    } catch (err) { next(err); }
  }

  async deleteLesson(req, res, next) {
    try {
      const data = await timetableService.deleteLesson(req.params.id);
      res.json({ success: true, data, message: 'Lesson berhasil dihapus' });
    } catch (err) { next(err); }
  }

  async syncLessons(req, res, next) {
    try {
      const { satuan_pendidikan_id, academic_year_id } = req.body;
      const data = await timetableService.syncLessonsFromTeachingDuties(satuan_pendidikan_id, academic_year_id);
      res.json({ success: true, data, message: `${data.synced_count} lesson berhasil disinkronkan dari tugas mengajar!` });
    } catch (err) { next(err); }
  }

  // Activities
  async listActivities(req, res, next) {
    try {
      const data = await timetableService.listActivities(req.query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async saveActivity(req, res, next) {
    try {
      const data = await timetableService.saveActivity(req.body);
      res.json({ success: true, data, message: 'Kegiatan non-pelajaran berhasil disimpan' });
    } catch (err) { next(err); }
  }

  async deleteActivity(req, res, next) {
    try {
      const data = await timetableService.deleteActivity(req.params.id);
      res.json({ success: true, data, message: 'Kegiatan berhasil dihapus' });
    } catch (err) { next(err); }
  }

  // Automated Generator Run
  async runGenerator(req, res, next) {
    try {
      const data = await timetableService.runGenerator(req.body, req.user);
      res.json({ success: true, data, message: data.success ? 'Jadwal berhasil digenerate otomatis tanpa bentrok!' : 'Generate jadwal selesai dengan beberapa catatan.' });
    } catch (err) { next(err); }
  }

  // Runs & Entries
  async listRuns(req, res, next) {
    try {
      const data = await timetableService.listRuns(req.query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getRunById(req, res, next) {
    try {
      const data = await timetableService.getRunById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Timetable run tidak ditemukan' });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async swapEntries(req, res, next) {
    try {
      const data = await timetableService.swapEntries(req.body, req.user);
      res.json({ success: true, data, message: 'Slot jadwal berhasil ditukar (swap)!' });
    } catch (err) { next(err); }
  }

  async updateEntry(req, res, next) {
    try {
      const data = await timetableService.updateEntry(req.params.id, req.body, req.user);
      res.json({ success: true, data, message: 'Slot jadwal berhasil diupdate!' });
    } catch (err) { next(err); }
  }

  async publishRun(req, res, next) {
    try {
      const data = await timetableService.publishRun(req.params.id, req.user);
      res.json({ success: true, data, message: 'Jadwal resmi berhasil dipublikasikan ke seluruh portal!' });
    } catch (err) { next(err); }
  }
}

module.exports = new TimetableController();
