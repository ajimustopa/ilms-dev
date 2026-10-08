import { useMemo } from 'react';

/**
 * useAcademicPeriod — Hook Pembaca Periode Akademik & Kalender Aktif
 * 
 * Sesuai panduan arsitektur (RENCANA-IMPLEMENTASI Bagian G):
 * Bila informasi Tahun Ajaran / Semester belum tersedia di sesi global atau role tidak berhak,
 * hook ini mengembalikan null (sehingga UI tidak merender data palsu / hardcoded).
 * 
 * @param {Object} [activeSchoolUnit] Unit sekolah aktif dari AuthContext
 * @returns {{ academicYear: string|null, semester: string|null, formattedDate: string }}
 */
export function useAcademicPeriod(activeSchoolUnit) {
  return useMemo(() => {
    // Format tanggal kalender masehi riil hari ini (Bahasa Indonesia)
    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(today);

    // Ambil tahun ajaran & semester jika tersedia di metadata unit sekolah aktif
    const academicYear = activeSchoolUnit?.academic_year_name || activeSchoolUnit?.academic_year || null;
    const semester = activeSchoolUnit?.semester_name || activeSchoolUnit?.semester || null;

    return {
      academicYear,
      semester,
      formattedDate,
      hasPeriodData: Boolean(academicYear)
    };
  }, [activeSchoolUnit]);
}

export default useAcademicPeriod;
