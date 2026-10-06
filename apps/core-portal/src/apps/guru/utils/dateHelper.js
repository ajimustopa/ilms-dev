/**
 * Helper format tanggal dan jam standar untuk Portal Guru
 */

export const HARI_INDONESIA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function getIndonesianDayName(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return HARI_INDONESIA[d.getDay()] || '';
}

export function formatIndonesianDate(date = new Date(), withDay = true) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const dayName = HARI_INDONESIA[d.getDay()];
  const dateNum = d.getDate();
  const monthName = BULAN_INDONESIA[d.getMonth()];
  const year = d.getFullYear();

  if (withDay) {
    return `${dayName}, ${dateNum} ${monthName} ${year}`;
  }
  return `${dateNum} ${monthName} ${year}`;
}

export function formatShortTime(timeString) {
  if (!timeString) return '-';
  // Jika format HH:mm:ss atau HH:mm
  const parts = String(timeString).split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return timeString;
}

export function getGreetingByTime() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'Selamat Pagi';
  if (hour >= 11 && hour < 15) return 'Selamat Siang';
  if (hour >= 15 && hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}
