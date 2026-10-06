import api, { handleApiResponse } from './api';

export const studentService = {
  /**
   * Mengambil daftar rombel / kelas
   */
  async getClassGroups(params = {}) {
    return handleApiResponse(api.get('/akademik/curriculum/class-groups', { params }));
  },

  /**
   * Mengambil daftar santri / anggota kelas pada rombel tertentu
   */
  async getClassMembers(classGroupId, params = {}) {
    return handleApiResponse(
      api.get(`/akademik/curriculum/class-groups/${classGroupId}/members`, { params })
    );
  },

  /**
   * Simpan presensi santri per jam pelajaran (sesi KBM)
   */
  async saveLessonAttendance(payload) {
    return handleApiResponse(api.post('/akademik/lesson-attendances/bulk', payload));
  },

  /**
   * Simpan presensi santri harian (oleh Wali Kelas)
   */
  async saveDailyAttendance(payload) {
    return handleApiResponse(api.post('/akademik/attendances/bulk', payload));
  },
};
