import api, { handleApiResponse } from './api';

export const incidentService = {
  /**
   * Mengambil daftar kejadian santri (dengan server-side visibility enforcement)
   */
  async getIncidents(params = {}) {
    return handleApiResponse(api.get('/akademik/incidents', { params }));
  },

  /**
   * Mengambil detail kejadian by ID
   */
  async getIncidentById(id) {
    return handleApiResponse(api.get(`/akademik/incidents/${id}`));
  },

  /**
   * Mengambil master kategori kejadian
   */
  async getCategories(params = {}) {
    return handleApiResponse(api.get('/akademik/incident-categories', { params }));
  },

  /**
   * Mengambil ringkasan poin & histori kejadian santri tertentu
   */
  async getStudentSummary(studentId) {
    return handleApiResponse(
      api.get(`/akademik/incidents/students/${studentId}/summary`)
    );
  },

  /**
   * Mencatat kejadian baru
   */
  async createIncident(payload) {
    return handleApiResponse(api.post('/akademik/incidents', payload));
  },

  /**
   * Memperbarui kejadian (oleh pelapor sebelum diproses, atau wali/kesiswaan)
   */
  async updateIncident(id, payload) {
    return handleApiResponse(api.put(`/akademik/incidents/${id}`, payload));
  },

  /**
   * Memperbarui tindakan & status penanganan (Wali Kelas / BK / Kesiswaan)
   */
  async updateHandlingStatus(id, payload) {
    return handleApiResponse(api.patch(`/akademik/incidents/${id}/handling-status`, payload));
  },

  /**
   * Verifikasi poin (oleh Kesiswaan)
   */
  async verifyPoints(id, payload) {
    return handleApiResponse(api.patch(`/akademik/incidents/${id}/verify-points`, payload));
  },

  /**
   * Bimbingan & Konseling (Privat BK / Wali Kelas)
   */
  async getCounselingRecords(params = {}) {
    return handleApiResponse(api.get('/akademik/counseling-records', { params }));
  },

  async createCounselingRecord(payload) {
    return handleApiResponse(api.post('/akademik/counseling-records', payload));
  },
};

