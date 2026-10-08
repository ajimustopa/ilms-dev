import api from '../../../../shared/services/api';

/**
 * presensiService — Layanan API terpusat untuk Halaman Presensi & Absensi Pegawai (HRD)
 */
export const presensiService = {
  // 1. Dashboard KPI summary (7 metrics: total, hadir, terlambat, izin_sakit, cuti_dinas, alpa, belum_presensi)
  getDashboardSummary: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances/dashboard-summary', { params });
    return res.data;
  },

  // 2. Daftar riwayat presensi harian / filter
  getAttendances: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances', { params });
    return res.data;
  },

  // 3. Detail presensi per record (termasuk telemetri GPS, radius, foto, audit trail)
  getAttendanceDetail: async (id) => {
    const res = await api.get(`/kepegawaian/attendances/${id}`);
    return res.data;
  },

  // 4. Tab 2: Kandidat Belum Presensi (Guru & Staf yang terjadwal tapi belum check-in)
  getAbsentCandidates: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances/absent-candidates', { params });
    return res.data;
  },

  // 5. Quick Mark: Tandai cepat Izin, Sakit, Cuti, Dinas Luar, atau Alpa
  quickMarkAttendance: async (data) => {
    const res = await api.post('/kepegawaian/attendances/quick-mark', data);
    return res.data;
  },

  // 6. Tab 3: Anomali Presensi (Luar radius, terlambat berat, pulang awal)
  getAnomalies: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances/anomalies', { params });
    return res.data;
  },

  // 7. Selesaikan anomali presensi
  resolveAnomaly: async (id, data) => {
    const res = await api.patch(`/kepegawaian/attendances/anomalies/${id}/resolve`, data);
    return res.data;
  },

  // 8. Tab 5: Rekapitulasi Bulanan (KPI Agregat & Persentase)
  getMonthlySummary: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances/monthly-summary', { params });
    return res.data;
  },

  // 9. Tab 5: Matriks Kehadiran Kalender 1-31 Hari
  getMonthlyMatrix: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances/monthly-matrix', { params });
    return res.data;
  },

  // 9b. Tab 5: Tren Kehadiran Harian Bulanan
  getMonthlyTrends: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances/monthly-trends', { params });
    return res.data;
  },

  // 10. Ekspor Laporan Rekap Presensi ke file Excel (.xlsx)
  exportExcel: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances/export-excel', {
      params,
      responseType: 'blob'
    });
    return res;
  },

  // 10b. Ekspor Laporan Rekap Presensi ke file PDF (.pdf)
  exportPdf: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances/export-pdf', {
      params,
      responseType: 'blob'
    });
    return res;
  },

  // 11. Input Presensi Manual (Single Entry)
  createManualEntry: async (data) => {
    const res = await api.post('/kepegawaian/attendances/manual-entry', data);
    return res.data;
  },

  // 12. Input Presensi Manual Masal (Bulk Entry)
  createBulkManualEntry: async (data) => {
    const res = await api.post('/kepegawaian/attendances/bulk-manual-entry', data);
    return res.data;
  },

  // 13. Status Tutup Periode Presensi & Kesiapan Audit
  getPeriodLockStatus: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances/period-lock-status', { params });
    return res.data;
  },

  getPeriodReadiness: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances/period-readiness', { params });
    return res.data;
  },

  // 14. Eksekusi Kunci / Tutup Periode Presensi
  lockPeriod: async (data) => {
    const res = await api.post('/kepegawaian/attendances/lock-period', data);
    return res.data;
  },

  // 14b. Buka Kunci Periode Presensi (Super Admin)
  unlockPeriod: async (data) => {
    const res = await api.post('/kepegawaian/attendances/unlock-period', data);
    return res.data;
  },

  // 14c. Serahkan Rekap Presensi ke Modul Penggajian (Payroll)
  submitToPayroll: async (data) => {
    const res = await api.post('/kepegawaian/attendances/submit-to-payroll', data);
    return res.data;
  },

  // 15. Check-In Mandiri (HRD self test / manual)
  selfCheckIn: async (data = {}) => {
    const res = await api.post('/kepegawaian/attendances/check-in', data);
    return res.data;
  },

  // 16. Check-Out Presensi Pegawai
  checkOut: async (id, data = {}) => {
    const res = await api.patch(`/kepegawaian/attendances/${id}/check-out`, data);
    return res.data;
  },

  // 17. Koreksi Presensi Pegawai oleh HRD
  updateAttendance: async (id, data) => {
    const res = await api.patch(`/kepegawaian/attendances/${id}`, data);
    return res.data;
  },

  // 18. Tab 4: Antrean Koreksi & Klarifikasi Presensi
  getClarifications: async (params = {}) => {
    const res = await api.get('/kepegawaian/attendances/clarifications', { params });
    return res.data;
  },

  getClarificationDetail: async (id) => {
    const res = await api.get(`/kepegawaian/attendances/clarifications/${id}`);
    return res.data;
  },

  reviewClarification: async (id, data) => {
    const res = await api.patch(`/kepegawaian/attendances/clarifications/${id}/review`, data);
    return res.data;
  },

  // 19. Helper Master Data Pegawai & Unit untuk formulir filter & modal
  getEmployeesMaster: async (params = {}) => {
    const res = await api.get('/kepegawaian/employees', { params: { per_page: 200, ...params } });
    return res.data;
  }
};

export default presensiService;
