import api, { handleApiResponse } from './api';

const READ_STORAGE_KEY_PREFIX = 'core_aldepos_read_announcements_';

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
   * Mengambil detail pengumuman internal guru by ID
   */
  async getTeacherAnnouncementById(id) {
    return handleApiResponse(
      api.get(`/website-utama/admin/news/teacher-announcements/${id}`)
    );
  },

  /**
   * Mengambil berita / pengumuman publik yayasan
   */
  async getPublicNews(params = {}) {
    return handleApiResponse(api.get('/website-utama/public/news', { params }));
  },

  /**
   * Mengambil detail berita publik by slug
   */
  async getPublicNewsBySlug(slug) {
    return handleApiResponse(api.get(`/website-utama/public/news/${slug}`));
  },

  /**
   * Client-side read status helper
   */
  getReadIds(userId = 'default') {
    try {
      const stored = localStorage.getItem(`${READ_STORAGE_KEY_PREFIX}${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  markAsRead(id, userId = 'default') {
    try {
      const current = this.getReadIds(userId);
      if (!current.includes(id)) {
        const updated = [...current, id];
        localStorage.setItem(`${READ_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));
        return updated;
      }
      return current;
    } catch {
      return [];
    }
  },

  markAllAsRead(ids, userId = 'default') {
    try {
      const current = this.getReadIds(userId);
      const combined = Array.from(new Set([...current, ...ids]));
      localStorage.setItem(`${READ_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(combined));
      return combined;
    } catch {
      return [];
    }
  }
};

