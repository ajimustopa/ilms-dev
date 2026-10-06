import api, { handleApiResponse } from './api';

export const journalService = {
  /**
   * Mengambil daftar jurnal mengajar guru
   */
  async getMyJournals(params = {}) {
    return handleApiResponse(api.get('/akademik/curriculum/teaching-journals', { params }));
  },

  /**
   * Mengambil status pengisian jurnal mengajar hari ini
   */
  async getTodayJournalStatus() {
    return handleApiResponse(api.get('/akademik/curriculum/teaching-journals/today-status'));
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
};
