import api, { handleApiResponse } from './api';

export const scoreService = {
  /**
   * Jenis Pengujian (Formatif, Sumatif Lingkup Materi, STS, SAS)
   */
  async getAssessmentTypes(params = {}) {
    return handleApiResponse(api.get('/akademik/assessment-types', { params }));
  },

  /**
   * Sesi Penilaian (Assessment Sessions)
   */
  async getAssessmentSessions(params = {}) {
    return handleApiResponse(api.get('/akademik/assessment-sessions', { params }));
  },

  async createAssessmentSession(payload) {
    return handleApiResponse(api.post('/akademik/assessment-sessions', payload));
  },

  async updateAssessmentSession(id, payload) {
    return handleApiResponse(api.put(`/akademik/assessment-sessions/${id}`, payload));
  },

  async deleteAssessmentSession(id) {
    return handleApiResponse(api.delete(`/akademik/assessment-sessions/${id}`));
  },

  /**
   * Nilai Siswa per Sesi Penilaian
   */
  async getSessionScores(sessionId) {
    return handleApiResponse(api.get(`/akademik/assessment-sessions/${sessionId}/scores`));
  },

  async saveSessionScoresBulk(sessionId, payload) {
    return handleApiResponse(api.post(`/akademik/assessment-sessions/${sessionId}/scores`, payload));
  },

  /**
   * KKM / KKTP Mata Pelajaran
   */
  async getSubjectGradeKkms(params = {}) {
    return handleApiResponse(api.get('/akademik/subject-grade-kkms', { params }));
  },

  /**
   * Tujuan Pembelajaran (TP)
   */
  async getLearningObjectives(params = {}) {
    return handleApiResponse(api.get('/akademik/curriculum/learning-objectives', { params }));
  },

  async createLearningObjective(payload) {
    return handleApiResponse(api.post('/akademik/curriculum/learning-objectives', payload));
  },

  async updateLearningObjective(id, payload) {
    return handleApiResponse(api.put(`/akademik/curriculum/learning-objectives/${id}`, payload));
  },

  async deleteLearningObjective(id) {
    return handleApiResponse(api.delete(`/akademik/curriculum/learning-objectives/${id}`));
  },

  /**
   * Nilai Capaian TP (Tahap 25)
   */
  async getTpScores(params = {}) {
    return handleApiResponse(api.get('/akademik/tp-scores', { params }));
  },

  async saveTpScoresBulk(payload) {
    return handleApiResponse(api.post('/akademik/scores/tp-scores/bulk', payload));
  },

  /**
   * Dimensi Sikap & Nilai Sikap / Karakter (Tahap 25)
   */
  async getAttitudeDimensions(params = {}) {
    return handleApiResponse(api.get('/akademik/attitude-dimensions', { params }));
  },

  async getAttitudeScoresMatrix(params = {}) {
    return handleApiResponse(api.get('/akademik/attitude-scores/matrix', { params }));
  },

  async saveAttitudeScoresBulk(payload) {
    return handleApiResponse(api.post('/akademik/scores/attitude-scores/bulk', payload));
  },

  /**
   * Siswa Rombel
   */
  async getClassGroupMembers(classGroupId) {
    return handleApiResponse(api.get(`/akademik/curriculum/class-groups/${classGroupId}/members`));
  }
};

