import api, { handleApiResponse } from './api';

export const profileService = {
  /**
   * Mengambil biodata profil pegawai guru yang login
   */
  async getMyProfile() {
    return handleApiResponse(api.get('/kepegawaian/employees/me/profile'));
  },

  /**
   * Update data profil mandiri (telepon, alamat, kontak darurat, dll)
   */
  async updateMyProfile(payload) {
    return handleApiResponse(api.put('/kepegawaian/employees/me/profile', payload));
  },

  /**
   * Ubah kata sandi
   */
  async changePassword(payload) {
    return handleApiResponse(api.put('/core/users/change-password', payload));
  },
};
