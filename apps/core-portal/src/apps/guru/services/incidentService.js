import api, { handleApiResponse } from './api';

export const incidentService = {
  /**
   * Mengambil daftar kejadian santri (dengan server-side visibility enforcement)
   */
  async getIncidents(params = {}) {
    return handleApiResponse(api.get('/akademik/student-affairs/incidents', { params }));
  },

  /**
   * Mengambil master kategori kejadian
   */
  async getCategories(params = {}) {
    return handleApiResponse(api.get('/akademik/student-affairs/incidents/categories', { params }));
  },

  /**
   * Mengambil ringkasan poin & histori kejadian santri tertentu
   */
  async getStudentSummary(studentId, params = {}) {
    return handleApiResponse(
      api.get(`/akademik/student-affairs/incidents/student/${studentId}/summary`, { params })
    );
  },

  /**
   * Mencatat kejadian baru
   */
  async createIncident(payload) {
    return handleApiResponse(api.post('/akademik/student-affairs/incidents', payload));
  },

  /**
   * Memperbarui tindakan & status penanganan
   */
  async updateHandling(id, payload) {
    return handleApiResponse(api.put(`/akademik/student-affairs/incidents/${id}/handling`, payload));
  },

  /**
   * Verifikasi poin (oleh Kesiswaan / Wali Kelas / BK)
   */
  async verifyPoints(id, payload) {
    return handleApiResponse(api.put(`/akademik/student-affairs/incidents/${id}/verify`, payload));
  },
};
