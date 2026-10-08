import api from '../../../shared/services/api';

export const attendanceMonitoringService = {
  // 1. Live Monitoring KBM
  getTodayKbmMonitoring: async (params = {}) => {
    const res = await api.get('/akademik/curriculum/kbm-monitoring/today', { params });
    return res.data?.data || { kpi: {}, sessions: [] };
  },

  verifyTeachingJournal: async (journalId, data) => {
    const res = await api.put(`/akademik/curriculum/teaching-journals/${journalId}/verify`, data);
    return res.data?.data;
  },

  getEarlyWarningStudents: async (params = {}) => {
    const res = await api.get('/akademik/curriculum/early-warning-students', { params });
    return res.data?.data || [];
  },

  getAttendanceMatrix: async (params = {}) => {
    const res = await api.get('/akademik/curriculum/attendance-matrix', { params });
    return res.data?.data || [];
  },

  // 2. Class Groups & Schedules
  getClassGroups: async (params = {}) => {
    const res = await api.get('/akademik/class-groups', { params });
    return res.data?.data || [];
  },

  getClassMembers: async (classGroupId) => {
    const res = await api.get(`/akademik/class-groups/${classGroupId}/members`);
    return res.data?.data || [];
  },

  getSchedules: async (params = {}) => {
    const res = await api.get('/akademik/curriculum/subject-schedules', { params });
    return res.data?.data || [];
  },

  // 3. Teaching Journals
  getTeachingJournals: async (params = {}) => {
    const res = await api.get('/akademik/curriculum/teaching-journals', { params });
    return res.data?.data || [];
  },

  createTeachingJournal: async (data) => {
    const res = await api.post('/akademik/curriculum/teaching-journals', data);
    return res.data?.data;
  },

  updateTeachingJournal: async (id, data) => {
    const res = await api.put(`/akademik/curriculum/teaching-journals/${id}`, data);
    return res.data?.data;
  },

  // 4. Lesson Attendance (Per Jam Sesi)
  getLessonAttendances: async (params = {}) => {
    const res = await api.get('/akademik/attendance/lesson-attendances', { params });
    return res.data?.data || [];
  },

  saveLessonAttendanceBulk: async (payload) => {
    const res = await api.post('/akademik/attendance/lesson-attendances/bulk', payload);
    return res.data?.data;
  },

  getLessonSummary: async (params = {}) => {
    const res = await api.get('/akademik/attendance/lesson-attendances/summary', { params });
    return res.data?.data;
  },

  // 5. Daily Attendance (Harian Rombel)
  getDailyAttendances: async (params = {}) => {
    const res = await api.get('/akademik/attendance/attendances', { params });
    return res.data?.data || [];
  },

  saveDailyAttendanceBulk: async (payload) => {
    const res = await api.post('/akademik/attendance/attendances/bulk', payload);
    return res.data?.data;
  },

  getDailySummary: async (params = {}) => {
    const res = await api.get('/akademik/attendance/attendances/summary', { params });
    return res.data?.data;
  },

  // 6. Leave Requests (Pusat Izin Santri)
  getLeaveRequests: async (params = {}) => {
    const res = await api.get('/akademik/attendance/leave-requests', { params });
    return res.data?.data || [];
  },

  createLeaveRequest: async (payload) => {
    const res = await api.post('/akademik/attendance/leave-requests', payload);
    return res.data?.data;
  },

  approveLeaveRequest: async (id, payload) => {
    const res = await api.put(`/akademik/attendance/leave-requests/${id}/approve`, payload);
    return res.data?.data;
  }
};

export default attendanceMonitoringService;
