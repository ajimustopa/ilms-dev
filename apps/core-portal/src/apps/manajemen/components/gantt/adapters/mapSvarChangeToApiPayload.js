/**
 * Data Adapter: SVAR React Gantt Event -> Aldepos API Schedule Payload
 * 
 * Mengonversi event perubahan SVAR Gantt (drag move, resize, progress drag, form edit)
 * menjadi payload dan parameter untuk endpoint:
 * PATCH /api/v1/manajemen/tasks/gantt/:item_type/:raw_id/schedule
 */

/**
 * Format Date object menjadi string 'YYYY-MM-DD' lokal
 * @param {Date|string} date 
 * @returns {string}
 */
export function formatDateToYMD(date) {
  if (!date) return '';
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return trimmed.slice(0, 10);
  }
  if (date instanceof Date && !isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
}

/**
 * Normalisasi Date ke jam 00:00:00.000 lokal
 * @param {Date|string} date 
 * @returns {Date}
 */
export function snapToDayMidnight(date) {
  if (!date) return new Date();
  if (date instanceof Date && !isNaN(date.getTime())) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }
  }
  return new Date();
}

/**
 * Mengonversi task yang diperbarui dari SVAR Gantt menjadi payload API Aldepos
 * dengan snapping per-hari (1 hari inklusif, minimum 1 hari)
 * 
 * @param {Object} updatedSvarTask - Objek task dari event SVAR Gantt (misal: update-task event)
 * @param {Object} [originalItem] - Referensi item awal (jika tersedia)
 * @returns {{
 *   item_type: 'activity'|'task',
 *   raw_id: number|string,
 *   endpoint: string,
 *   body: { start_date: string, end_date: string, progress_percent: number },
 *   updatedItem: Object
 * }}
 */
export function mapSvarChangeToApiPayload(updatedSvarTask, originalItem = {}) {
  if (!updatedSvarTask) {
    throw new Error('updatedSvarTask is required for mapSvarChangeToApiPayload');
  }

  // 1. Ambil item_type eksplisit
  const itemType =
    updatedSvarTask.item_type ||
    originalItem.item_type ||
    (updatedSvarTask.program_id || originalItem.program_id ? 'activity' : 'task');

  // 2. Ambil raw_id numerik
  let rawId = updatedSvarTask.raw_id ?? originalItem.raw_id;
  if (rawId === undefined || rawId === null) {
    const idStr = String(updatedSvarTask.id || originalItem.id || '');
    const matched = idStr.match(/\d+/);
    rawId = matched ? parseInt(matched[0], 10) : idStr;
  }

  // 3. Tanggal Mulai dan Tanggal Selesai (Snapping Per-Hari)
  const isMilestone = updatedSvarTask.type === 'milestone' || originalItem.type === 'milestone' || originalItem.is_milestone;
  const rawStart = updatedSvarTask.start || originalItem.start_date || originalItem.activity_date;
  const startDate = snapToDayMidnight(rawStart);

  let durationDays = 1;
  if (isMilestone) {
    durationDays = 0;
  } else if (updatedSvarTask.duration !== undefined && updatedSvarTask.duration !== null) {
    durationDays = Math.max(1, Math.round(Number(updatedSvarTask.duration)));
  } else if (updatedSvarTask.end) {
    const endDateObj = snapToDayMidnight(updatedSvarTask.end);
    const diffMs = endDateObj.getTime() - startDate.getTime();
    durationDays = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));
  }

  // Tanggal mulai string (YYYY-MM-DD)
  const startDateStr = formatDateToYMD(startDate);

  // Tanggal selesai inklusif:
  // Jika durasi = 1 hari: end_date = start_date (1 Agustus s.d 1 Agustus)
  // Jika durasi = N hari: end_date = start_date + (N - 1) hari (1 Agustus s.d 3 Agustus = 3 hari)
  const inclusiveEndDate = isMilestone
    ? startDate
    : new Date(startDate.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000);
  const endDateStr = formatDateToYMD(inclusiveEndDate);

  // 4. Hitung progress percent (0 - 100)
  const rawProgress = updatedSvarTask.progress !== undefined ? updatedSvarTask.progress : originalItem.progress_percent;
  const progressPercent = Math.min(100, Math.max(0, Math.round(Number(rawProgress) || 0)));

  // 5. Body payload untuk endpoint schedule
  const body = {
    start_date: startDateStr,
    end_date: endDateStr,
    progress_percent: progressPercent,
  };

  const endpoint = `/manajemen/tasks/gantt/${itemType}/${rawId}/schedule`;

  // 6. Objek lengkap yang telah dimutasi untuk dikirim ke state parent (TaskProjectHub)
  const updatedItem = {
    ...(originalItem.raw_item || originalItem),
    ...updatedSvarTask,
    id: updatedSvarTask.id || originalItem.id,
    raw_id: rawId,
    item_type: itemType,
    title: updatedSvarTask.text || originalItem.title || originalItem.name,
    start_date: startDateStr,
    end_date: endDateStr,
    due_date: endDateStr,
    progress_percent: progressPercent,
    status:
      updatedSvarTask.status ||
      (progressPercent >= 100
        ? itemType === 'activity'
          ? 'completed'
          : 'done'
        : originalItem.status),
  };

  return {
    item_type: itemType,
    raw_id: rawId,
    endpoint,
    body,
    updatedItem,
  };
}

export default mapSvarChangeToApiPayload;
