import api, { handleApiResponse } from './api';

export const announcementService = {
  /**
   * Mengambil pengumuman internal khusus guru (target: teachers / all_internal)
   */
  async getTeacherAnnouncements(params = {}) {
    return handleApiResponse(
      api.get('/website-utama/admin/news/teacher-announcements', { params })
    );
  },

  /**
   * Mengambil berita / pengumuman publik jika dibutuhkan
   */
  async getPublicNews(params = {}) {
    return handleApiResponse(api.get('/website-utama/public/news', { params }));
  },
};
