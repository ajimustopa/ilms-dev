import api, { handleApiResponse } from './api';

export const scheduleService = {
  /**
   * Mengambil seluruh jadwal mengajar guru yang login
   */
  async getMySchedules(params = {}) {
    return handleApiResponse(api.get('/akademik/curriculum/my-schedules', { params }));
  },

  /**
   * Mengambil penugasan mengajar mata pelajaran & rombel guru
   */
  async getMyTeachingAssignments(params = {}) {
    return handleApiResponse(api.get('/akademik/curriculum/my-teaching-assignments', { params }));
  },
};
