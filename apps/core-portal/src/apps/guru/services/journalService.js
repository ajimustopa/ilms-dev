import api, { handleApiResponse } from './api';

export const journalService = {
  /**
   * Mengambil daftar jurnal mengajar guru
   */
  async getMyJournals(params = {}) {
    return handleApiResponse(api.get('/akademik/curriculum/teaching-journals', { params }));
  },

  /**
   * Mengambil detail satu jurnal mengajar
   */
  async getJournalById(id) {
    return handleApiResponse(api.get(`/akademik/curriculum/teaching-journals/${id}`));
  },

  /**
   * Mengambil status pengisian jurnal mengajar hari ini
   */
  async getTodayJournalStatus(params = {}) {
    return handleApiResponse(api.get('/akademik/curriculum/teaching-journals/today-status', { params }));
  },

  /**
   * Membuat catatan jurnal mengajar baru
   */
  async createJournal(payload) {
    return handleApiResponse(api.post('/akademik/curriculum/teaching-journals', payload));
  },

  /**
   * Mengubah catatan jurnal mengajar
   */
  async updateJournal(id, payload) {
    return handleApiResponse(api.put(`/akademik/curriculum/teaching-journals/${id}`, payload));
  },

  /**
   * Menghapus catatan jurnal mengajar
   */
  async deleteJournal(id) {
    return handleApiResponse(api.delete(`/akademik/curriculum/teaching-journals/${id}`));
  }
};
