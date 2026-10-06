import api, { handleApiResponse } from './api';

export const attendanceService = {
  /**
   * Mendapatkan status presensi hari ini (masuk, pulang, shift, lokasi valid)
   */
  async getTodayStatus() {
    return handleApiResponse(api.get('/kepegawaian/attendance/today-status'));
  },

  /**
   * Mendapatkan riwayat kehadiran bulanan
   */
  async getMonthlyAttendance(params = {}) {
    return handleApiResponse(api.get('/kepegawaian/attendance', { params }));
  },

  /**
   * Check-in GPS
   */
  async checkIn(payload) {
    return handleApiResponse(api.post('/kepegawaian/attendance/check-in', payload));
  },

  /**
   * Check-out GPS
   */
  async checkOut(id, payload) {
    return handleApiResponse(api.post(`/kepegawaian/attendance/${id}/check-out`, payload));
  },

  /**
   * Mengambil riwayat pengajuan cuti / izin
   */
  async getLeaveRequests(params = {}) {
    return handleApiResponse(api.get('/kepegawaian/attendance/leave-requests', { params }));
  },

  /**
   * Mengajukan izin / cuti baru
   */
  async submitLeaveRequest(payload) {
    return handleApiResponse(api.post('/kepegawaian/attendance/leave-requests', payload));
  },

  /**
   * Upload lampiran berkas surat izin / dokter
   */
  async uploadLeaveAttachment(formData) {
    return handleApiResponse(
      api.post('/kepegawaian/attendance/leave-requests/attachment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  },
};
