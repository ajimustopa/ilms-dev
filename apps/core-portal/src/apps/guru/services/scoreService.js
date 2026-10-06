import api, { handleApiResponse } from './api';

export const scoreService = {
  /**
   * Mengambil sesi penilaian aktif
   */
  async getAssessmentSessions(params = {}) {
    return handleApiResponse(api.get('/akademik/scores/assessment-sessions', { params }));
  },

  /**
   * Mengambil dan menyimpan nilai santri per sesi
   */
  async getScoresBySession(sessionId, params = {}) {
    return handleApiResponse(api.get(`/akademik/scores/scores/session/${sessionId}`, { params }));
  },

  async saveScores(payload) {
    return handleApiResponse(api.post('/akademik/scores/scores/bulk', payload));
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
   * Nilai Capaian TP
   */
  async saveTpScores(payload) {
    return handleApiResponse(api.post('/akademik/scores/tp-scores/bulk', payload));
  },

  /**
   * Nilai Sikap & Karakter
   */
  async saveAttitudeScores(payload) {
    return handleApiResponse(api.post('/akademik/scores/attitude-scores/bulk', payload));
  },
};
