/**
 * Attendance Controller Implementation
 * Modul Akademik - Fitur 5: Presensi & Izin Siswa
 */
const attendanceService = require('./service');

class AttendanceController {
  async listAttendances(req, res, next) {
    try {
      const data = await attendanceService.listAttendances(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar presensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async recordAttendance(req, res, next) {
    try {
      const data = await attendanceService.recordAttendance(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Presensi siswa berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async recordAttendanceBulk(req, res, next) {
    try {
      const data = await attendanceService.recordAttendanceBulk(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Presensi rombel berhasil dicatat secara massal',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getSummary(req, res, next) {
    try {
      const data = await attendanceService.getAttendanceSummary(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Rekapitulasi presensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // Izin / Sakit
  async listLeaveRequests(req, res, next) {
    try {
      const data = await attendanceService.listLeaveRequests(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar pengajuan izin berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createLeaveRequest(req, res, next) {
    try {
      const data = await attendanceService.createLeaveRequest(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Pengajuan izin berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async approveLeaveRequest(req, res, next) {
    try {
      const data = await attendanceService.approveLeaveRequest(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Status pengajuan izin berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Lesson Attendances (Per Jam Pelajaran)
  // ==========================================
  async listLessonAttendances(req, res, next) {
    try {
      const data = await attendanceService.listLessonAttendances(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar presensi per jam pelajaran berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async recordLessonAttendanceBulk(req, res, next) {
    try {
      const data = await attendanceService.recordLessonAttendanceBulk(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: data.message || 'Presensi jam pelajaran berhasil dicatat secara massal',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getLessonSummary(req, res, next) {
    try {
      const data = await attendanceService.getLessonAttendanceSummary(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Rekapitulasi presensi per jam pelajaran berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Activity Attendances (Kegiatan / Ekskul / Acara)
  // ==========================================
  async listActivityAttendances(req, res, next) {
    try {
      const data = await attendanceService.listActivityAttendances(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar presensi kegiatan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async recordActivityAttendanceBulk(req, res, next) {
    try {
      const data = await attendanceService.recordActivityAttendanceBulk(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: data.message || 'Presensi kegiatan berhasil dicatat secara massal',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getActivitySummary(req, res, next) {
    try {
      const data = await attendanceService.getActivityAttendanceSummary(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Rekapitulasi presensi kegiatan berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AttendanceController();
