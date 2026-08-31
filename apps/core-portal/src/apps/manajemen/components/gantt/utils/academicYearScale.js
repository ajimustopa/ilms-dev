/**
 * Academic Year Scale Utilities for SVAR Gantt
 * 
 * Mengelola rentang tahun ajaran (1 Juli s.d. 30 Juni) dan pembagian
 * semester untuk time scale SVAR Gantt Chart.
 */

export const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const ID_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * Parsing string tahun ajaran (contoh: "2026/2027") ke rentang Date objek.
 * Tahun ajaran dimulai 1 Juli tahun pertama dan berakhir 30 Juni tahun kedua.
 * 
 * @param {string} academicYear - Format "YYYY/YYYY+1" (contoh: "2026/2027")
 * @returns {{ startYear: number, endYear: number, startDate: Date, endDate: Date, label: string }}
 */
export function parseAcademicYear(academicYear = '2026/2027') {
  let startYear = 2026;
  let endYear = 2027;

  if (typeof academicYear === 'string' && academicYear.includes('/')) {
    const parts = academicYear.split('/').map((p) => parseInt(p.trim(), 10));
    if (!isNaN(parts[0])) startYear = parts[0];
    if (!isNaN(parts[1])) endYear = parts[1];
    else endYear = startYear + 1;
  } else if (typeof academicYear === 'number') {
    startYear = academicYear;
    endYear = academicYear + 1;
  }

  // 1 Juli startYear 00:00:00 s.d. 30 Juni endYear 23:59:59
  const startDate = new Date(startYear, 6, 1, 0, 0, 0, 0); // Bulan Juli = index 6
  const endDate = new Date(endYear, 5, 30, 23, 59, 59, 999); // Bulan Juni = index 5

  return {
    startYear,
    endYear,
    startDate,
    endDate,
    label: `TA ${startYear}/${endYear}`,
    fullLabel: `Tahun Ajaran ${startYear}/${endYear} (1 Juli ${startYear} - 30 Juni ${endYear})`,
  };
}

/**
 * Format label Semester berdasarkan tanggal.
 * Semester 1 (Ganjil): Juli - Desember
 * Semester 2 (Genap): Januari - Juni
 */
export function getSemesterLabel(date, withYear = true) {
  if (!date || isNaN(date.getTime())) return '';
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 6) {
    return withYear ? `SEMESTER GANJIL (${year})` : 'SEMESTER GANJIL';
  } else {
    return withYear ? `SEMESTER GENAP (${year})` : 'SEMESTER GENAP';
  }
}

/**
 * Definisi Time Scales untuk SVAR Gantt
 * 
 * - Skala Atas: Indikator Semester (Ganjil: Juli-Desember, Genap: Januari-Juni)
 *   menggunakan unit 'quarter' dengan step: 2 (6 bulan) yang presisi membagi 2 semester.
 * - Skala Bawah: Nama Bulan Indonesia (Juli ... Juni), Minggu, atau Hari.
 */
export function getAcademicYearScales(zoomLevel = 'month') {
  switch (zoomLevel) {
    case 'semester':
      return [
        {
          unit: 'quarter',
          step: 2, // 6 bulan (1 semester)
          format: (date) => getSemesterLabel(date, true),
          css: (date) => (date.getMonth() >= 6 ? 'scale-semester-ganjil' : 'scale-semester-genap'),
        },
        {
          unit: 'month',
          step: 1,
          format: (date) => `${ID_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`,
        },
      ];

    case 'week':
      return [
        {
          unit: 'month',
          step: 1,
          format: (date) => {
            const sem = date.getMonth() >= 6 ? '[Ganjil]' : '[Genap]';
            return `${sem} ${ID_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
          },
          css: (date) => 'scale-month-header',
        },
        {
          unit: 'week',
          step: 1,
          format: (date) => `M${Math.ceil(date.getDate() / 7)} (${date.getDate()} ${ID_MONTHS_SHORT[date.getMonth()]})`,
          css: (date) => (date.getDate() <= 7 ? 'scale-cell-month-start' : ''),
        },
      ];

    case 'day':
      return [
        {
          unit: 'month',
          step: 1,
          format: (date) => `${ID_MONTHS[date.getMonth()]} ${date.getFullYear()}`,
          css: (date) => 'scale-month-header',
        },
        {
          unit: 'day',
          step: 1,
          format: (date) => `${date.getDate()}`,
          css: (date) => {
            const isMonthStart = date.getDate() === 1;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const classes = [];
            if (isMonthStart) classes.push('scale-cell-month-start');
            if (isWeekend) classes.push('scale-cell-weekend');
            return classes.join(' ');
          },
        },
      ];

    case 'month':
    default:
      return [
        {
          unit: 'quarter',
          step: 2, // 6 bulan per semester (Juli-Desember & Januari-Juni)
          format: (date) => getSemesterLabel(date, true),
          css: (date) => (date.getMonth() >= 6 ? 'scale-semester-ganjil' : 'scale-semester-genap'),
        },
        {
          unit: 'month',
          step: 1,
          format: (date) => `${ID_MONTHS[date.getMonth()]} ${date.getFullYear()}`,
        },
      ];
  }
}
