import api, { handleApiResponse } from './api';

export const attendanceService = {
  /**
   * Mendapatkan status presensi hari ini (masuk, pulang, shift, lokasi valid)
   */
  async getTodayStatus() {
    return handleApiResponse(api.get('/kepegawaian/attendances/today-status'));
  },

  /**
   * Mendapatkan riwayat kehadiran bulanan
   */
  async getMonthlyAttendance(params = {}) {
    return handleApiResponse(api.get('/kepegawaian/attendances', { params }));
  },

  /**
   * Check-in GPS
   */
  async checkIn(payload) {
    return handleApiResponse(api.post('/kepegawaian/attendances/check-in', payload));
  },

  /**
   * Check-out GPS
   */
  async checkOut(id, payload) {
    return handleApiResponse(api.patch(`/kepegawaian/attendances/${id}/check-out`, payload));
  },

  /**
   * Mengambil riwayat pengajuan cuti / izin pribadi guru
   */
  async getMyLeaveRequests(params = {}) {
    return handleApiResponse(api.get('/kepegawaian/leave-requests/my', { params }));
  },

  /**
   * Mengajukan izin / cuti baru (mendukung lampiran base64/objek sesuai Tahap 8)
   */
  async submitLeaveRequest(payload) {
    return handleApiResponse(api.post('/kepegawaian/leave-requests', payload));
  },

  /**
   * Mengunduh/melihat lampiran berkas surat izin / dokter
   */
  async getLeaveAttachment(id) {
    return handleApiResponse(api.get(`/kepegawaian/leave-requests/${id}/attachment`));
  },

  // ==========================================
  // Presensi Santri / Siswa (Jam Pelajaran KBM)
  // ==========================================
  /**
   * Mengambil data presensi siswa per jam pelajaran
   */
  async getLessonAttendances(params = {}) {
    return handleApiResponse(api.get('/akademik/lesson-attendances', { params }));
  },

  /**
   * Simpan massal presensi siswa per jam pelajaran (H/I/S/A/T)
   */
  async saveLessonAttendanceBulk(payload) {
    return handleApiResponse(api.post('/akademik/lesson-attendances/bulk', payload));
  },

  /**
   * Mengambil anggota rombel / santri aktif di kelas
   */
  async getClassGroupMembers(classGroupId) {
    return handleApiResponse(api.get(`/akademik/curriculum/class-groups/${classGroupId}/members`));
  },

  /**
   * Mengambil rekapitulasi presensi jam pelajaran
   */
  async getLessonAttendanceSummary(params = {}) {
    return handleApiResponse(api.get('/akademik/lesson-attendances/summary', { params }));
  }
};


