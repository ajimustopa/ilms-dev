/**
 * Helper utilitas data Jadwal Mengajar Guru
 */

/**
 * Mendapatkan nama rombel reguler / kelas dari item jadwal
 * Mendukung format: class_group_names, class_groups (array), class_group_name, class_name, kelas, rombel_name
 * @param {Object} schedule - Item data jadwal
 * @returns {string} Nama rombel (misal: "7A", "Kelas 7A", atau "Rombel Reguler")
 */
export function getScheduleClassGroupDisplay(schedule) {
  if (!schedule) return '-';

  // 1. Jika ada string gabungan nama rombel dari backend
  if (schedule.class_group_names && schedule.class_group_names !== '-' && schedule.class_group_names !== 'Kelas') {
    return schedule.class_group_names;
  }

  // 2. Jika ada array class_groups dengan type 'reguler'
  if (Array.isArray(schedule.class_groups) && schedule.class_groups.length > 0) {
    const regulerList = schedule.class_groups.filter(
      (c) => !c.type || c.type === 'reguler'
    );
    if (regulerList.length > 0) {
      const names = regulerList.map((c) => c.name).filter((n) => n && n !== 'Kelas');
      if (names.length > 0) return names.join(', ');
    }
    const allNames = schedule.class_groups.map((c) => c.name).filter((n) => n && n !== 'Kelas');
    if (allNames.length > 0) return allNames.join(', ');
  }

  // 3. Fallback ke properti nama single
  const singleName =
    schedule.class_group_name ||
    schedule.class_name ||
    schedule.rombel_name ||
    schedule.kelas;

  if (singleName && singleName !== '-' && singleName !== 'Kelas') {
    return singleName;
  }

  if (schedule.class_group_id) {
    return `Kelas ${schedule.class_group_id}`;
  }

  return 'Rombel Reguler';
}

/**
 * Mendapatkan nama ruang kelas dari item jadwal dengan fallback yang informatif
 * @param {Object} schedule - Item data jadwal
 * @returns {string} Nama ruangan (misal: "Ruang 7A", "Ruang Lab IPA", "Ruang Kelas Reguler")
 */
export function getScheduleRoomDisplay(schedule) {
  if (!schedule) return 'Ruang Kelas';

  const rawRoom = schedule.room_name || schedule.ruang || schedule.room || schedule.location;
  if (rawRoom && String(rawRoom).trim() && String(rawRoom).trim() !== '-') {
    const trimmed = String(rawRoom).trim();
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('ruang') ||
      lower.startsWith('r.') ||
      lower.startsWith('lab') ||
      lower.startsWith('lapangan') ||
      lower.startsWith('masjid') ||
      lower.startsWith('aula')
    ) {
      return trimmed;
    }
    return `Ruang ${trimmed}`;
  }

  // Fallback berdasarkan nama rombel/kelas jika nama ruang belum diset
  const className = getScheduleClassGroupDisplay(schedule);
  if (className && className !== '-' && className !== 'Rombel Reguler') {
    return `Ruang ${className}`;
  }

  return 'Ruang Kelas Reguler';
}
