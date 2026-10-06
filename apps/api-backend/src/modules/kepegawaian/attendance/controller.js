/**
 * Attendance Controller Implementation
 * Modul Kepegawaian - Fitur 3: Kehadiran
 */
const attendanceService = require('./service');

class AttendanceController {
  // 1. Presensi
  async listAttendances(req, res, next) {
    try {
      const result = await attendanceService.listAttendances(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar presensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async checkIn(req, res, next) {
    try {
      const result = await attendanceService.checkIn(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Presensi masuk (check-in) berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async checkOut(req, res, next) {
    try {
      const result = await attendanceService.checkOut(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Presensi keluar (check-out) berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async correctAttendance(req, res, next) {
    try {
      const result = await attendanceService.correctAttendance(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data presensi berhasil diperbarui/dikoreksi',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getTodayStatus(req, res, next) {
    try {
      const result = await attendanceService.getTodayStatus(req.user, req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Status presensi hari ini berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Cuti & Izin
  async listLeaveRequests(req, res, next) {
    try {
      const result = await attendanceService.listLeaveRequests(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengajuan cuti/izin berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyLeaveRequests(req, res, next) {
    try {
      const result = await attendanceService.getMyLeaveRequests(req.user, req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengajuan izin pribadi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getLeaveAttachment(req, res, next) {
    try {
      const result = await attendanceService.getLeaveAttachment(req.params.id, req.user);
      
      if (req.query.download === 'true' || req.query.raw === 'true') {
        if (result.exists_on_disk) {
          return res.download(result.absolute_file_path, result.attachment_name);
        }
      }

      res.status(200).json({
        success: true,
        data: result,
        message: 'Data berkas lampiran izin berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createLeaveRequest(req, res, next) {
    try {
      const result = await attendanceService.createLeaveRequest(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Pengajuan cuti/izin berhasil dikirim',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async approveLeaveRequest(req, res, next) {
    try {
      const result = await attendanceService.approveLeaveRequest(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengajuan cuti/izin berhasil disetujui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectLeaveRequest(req, res, next) {
    try {
      const result = await attendanceService.rejectLeaveRequest(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengajuan cuti/izin berhasil ditolak',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Lembur
  async listOvertimes(req, res, next) {
    try {
      const result = await attendanceService.listOvertimes(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengajuan lembur berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createOvertime(req, res, next) {
    try {
      const result = await attendanceService.createOvertime(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Pengajuan lembur berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async approveOvertime(req, res, next) {
    try {
      const result = await attendanceService.approveOvertime(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengajuan lembur berhasil disetujui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectOvertime(req, res, next) {
    try {
      const result = await attendanceService.rejectOvertime(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengajuan lembur ditolak',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Master Lokasi Absensi
  async listLocations(req, res, next) {
    try {
      const result = await attendanceService.listLocations(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar lokasi absensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getLocationById(req, res, next) {
    try {
      const result = await attendanceService.getLocationById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail lokasi absensi berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createLocation(req, res, next) {
    try {
      const result = await attendanceService.createLocation(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Lokasi absensi baru berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateLocation(req, res, next) {
    try {
      const result = await attendanceService.updateLocation(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Lokasi absensi berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteLocation(req, res, next) {
    try {
      const result = await attendanceService.deleteLocation(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Lokasi absensi berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Pengaturan Jam Kerja
  async listWorkSchedules(req, res, next) {
    try {
      const result = await attendanceService.listWorkSchedules(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengaturan jam kerja berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getWorkScheduleById(req, res, next) {
    try {
      const result = await attendanceService.getWorkScheduleById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail pengaturan jam kerja berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createWorkSchedule(req, res, next) {
    try {
      const result = await attendanceService.createWorkSchedule(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Pengaturan jam kerja baru berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateWorkSchedule(req, res, next) {
    try {
      const result = await attendanceService.updateWorkSchedule(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengaturan jam kerja berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteWorkSchedule(req, res, next) {
    try {
      const result = await attendanceService.deleteWorkSchedule(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengaturan jam kerja berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AttendanceController();
