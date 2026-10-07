/**
 * Holiday Service (Kalender Libur Berlapis)
 * Modul Kepegawaian - Core Aldepos
 * Manages holidays, holiday schedule targets, imports, year copying, and effective off-days calculation
 * Conforms to SPEC-CUTI-LEMBUR.md §2 #5-7, #34, §10.2, §10.3 (M-B), §10.4, §11.1
 */

const { z } = require('zod');
const db = require('../../../config/db/kepegawaian');
const akademikDb = require('../../../config/db/akademik');
const { isUnitInScope, HR_PERMISSIONS } = require('../common/actorHelper');
const { recordLeaveAuditLog } = require('./leaveAuditHelper');
const { todayWIB } = require('./dateHelper');

const HOLIDAY_TYPES = [
  'national',
  'joint_leave',
  'school_semester',
  'school_ramadan',
  'school_exam',
  'foundation',
  'unit_special'
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Format DB date to YYYY-MM-DD
 */
function formatDbDate(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    return val.slice(0, 10);
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

/**
 * Zod Schemas for validation
 */
const createHolidaySchema = z.object({
  name: z.string({ required_error: 'Nama hari libur wajib diisi' }).min(1).max(150),
  holiday_type: z.enum(HOLIDAY_TYPES, {
    errorMap: () => ({ message: `Tipe libur tidak valid. Pilihan: ${HOLIDAY_TYPES.join(', ')}` })
  }),
  start_date: z.string().regex(DATE_REGEX, 'Format start_date harus YYYY-MM-DD'),
  end_date: z.string().regex(DATE_REGEX, 'Format end_date harus YYYY-MM-DD').optional().nullable(),
  school_unit_id: z.number().int().positive().optional().nullable(),
  is_off_day: z.boolean().optional().default(true),
  applies_to: z.enum(['all_employees', 'schedules']).optional().default('all_employees'),
  deducts_annual_leave: z.boolean().optional().default(false),
  date_rule: z.enum(['fixed_date', 'floating']).optional().default('floating'),
  review_status: z.enum(['confirmed', 'draft_needs_review']).optional().default('confirmed'),
  source: z.enum(['manual', 'imported_file', 'copied', 'academic_calendar']).optional().default('manual'),
  source_ref: z.string().max(255).optional().nullable(),
  academic_event_id: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  target_schedule_ids: z.array(z.number().int().positive()).optional().default([])
}).refine(data => {
  const endDate = data.end_date || data.start_date;
  return endDate >= data.start_date;
}, {
  message: 'Tanggal selesai (end_date) tidak boleh lebih awal dari tanggal mulai (start_date)',
  path: ['end_date']
});

const updateHolidaySchema = z.object({
  name: z.string().min(1).max(150).optional(),
  holiday_type: z.enum(HOLIDAY_TYPES).optional(),
  start_date: z.string().regex(DATE_REGEX, 'Format start_date harus YYYY-MM-DD').optional(),
  end_date: z.string().regex(DATE_REGEX, 'Format end_date harus YYYY-MM-DD').optional().nullable(),
  school_unit_id: z.number().int().positive().optional().nullable(),
  is_off_day: z.boolean().optional(),
  applies_to: z.enum(['all_employees', 'schedules']).optional(),
  deducts_annual_leave: z.boolean().optional(),
  date_rule: z.enum(['fixed_date', 'floating']).optional(),
  review_status: z.enum(['confirmed', 'draft_needs_review']).optional(),
  notes: z.string().optional().nullable(),
  target_schedule_ids: z.array(z.number().int().positive()).optional()
}).refine(data => {
  if (data.start_date && data.end_date) {
    return data.end_date >= data.start_date;
  }
  return true;
}, {
  message: 'Tanggal selesai (end_date) tidak boleh lebih awal dari tanggal mulai (start_date)',
  path: ['end_date']
});

// =========================================================================
// PURE HELPER FUNCTIONS (Zero DB / Zero I/O for unit tests)
// =========================================================================

/**
 * Pure function to filter applicable off-day holidays for an employee on a given date.
 * @param {Array} holidays - array of holiday objects
 * @param {number|null} employeeUnitId - unit ID of the employee
 * @param {number|null} employeeWorkScheduleId - active work schedule ID of the employee on this date
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {Array} matching off-holidays
 */
function filterOffHolidaysForDate(holidays, employeeUnitId, employeeWorkScheduleId, dateStr) {
  if (!Array.isArray(holidays)) return [];
  return holidays.filter(h => {
    // 1. Must be off day
    if (!h.is_off_day && h.is_off_day !== 1) return false;

    // 2. Must be confirmed (drafts do NOT apply to attendance or leave calculation)
    if (h.review_status !== 'confirmed') return false;

    // 3. Must not be soft-deleted
    if (h.deleted_at) return false;

    // 4. Must cover date
    const sDate = formatDbDate(h.start_date);
    const eDate = formatDbDate(h.end_date || h.start_date);
    if (!sDate || !eDate || dateStr < sDate || dateStr > eDate) return false;

    // 5. Scope check: null = all units (foundation / national), otherwise must match employee's unit
    if (h.school_unit_id !== null && h.school_unit_id !== undefined) {
      if (employeeUnitId === null || employeeUnitId === undefined || Number(h.school_unit_id) !== Number(employeeUnitId)) {
        return false;
      }
    }

    // 6. Schedule target check: all_employees vs specific schedules
    if (h.applies_to === 'schedules') {
      const targets = h.target_schedule_ids || [];
      if (!employeeWorkScheduleId || !targets.map(Number).includes(Number(employeeWorkScheduleId))) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Normalizes boolean string/value
 */
function normalizeBoolean(val, defaultVal = false) {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  const str = String(val).trim().toLowerCase();
  if (['1', 'true', 'ya', 'yes', 'y', 't'].includes(str)) return true;
  if (['0', 'false', 'tidak', 'no', 'n', 'f'].includes(str)) return false;
  return defaultVal;
}

/**
 * Parses and normalizes date string (supports YYYY-MM-DD and DD/MM/YYYY)
 */
function normalizeDateStr(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return str;
  }
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\-]/);
    const d = String(parts[0]).padStart(2, '0');
    const m = String(parts[1]).padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  return null;
}

/**
 * Pure CSV line parser (handles quotes and commas/semicolons)
 */
function parseCsvLine(text, delimiter = ',') {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Pure file parser for CSV & JSON holiday imports
 * Reports per-line errors and prevents fabricated data
 * @param {string|object} content - raw CSV text or JSON object/array
 * @param {'csv'|'json'} format - input format
 * @returns {{ valid_rows: Array, errors: Array, total_rows: number }}
 */
function parseImportFile(content, format = 'csv') {
  const errors = [];
  const valid_rows = [];
  const seenKeys = new Set();

  if (!content) {
    return { valid_rows: [], errors: [{ line: 0, field: 'content', message: 'Konten berkas kosong' }], total_rows: 0 };
  }

  let rawList = [];

  if (format === 'json' || typeof content === 'object') {
    try {
      rawList = typeof content === 'string' ? JSON.parse(content) : content;
      if (!Array.isArray(rawList)) {
        if (rawList && Array.isArray(rawList.data)) rawList = rawList.data;
        else if (rawList && Array.isArray(rawList.holidays)) rawList = rawList.holidays;
        else throw new Error('Format JSON harus berupa array objek data libur');
      }
    } catch (e) {
      return { valid_rows: [], errors: [{ line: 1, field: 'json', message: `Gagal membaca format JSON: ${e.message}` }], total_rows: 0 };
    }

    rawList.forEach((item, idx) => {
      const lineNo = idx + 1;
      validateAndAddRow(item, lineNo);
    });
  } else {
    // CSV format
    const lines = String(content).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      return { valid_rows: [], errors: [{ line: 0, field: 'csv', message: 'Berkas CSV kosong' }], total_rows: 0 };
    }

    // Detect delimiter (comma or semicolon)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';

    const headerParts = parseCsvLine(lines[0], delimiter).map(h => h.toLowerCase().replace(/[\s_]+/g, ''));
    const isHeader = headerParts.includes('name') || headerParts.includes('nama') || headerParts.includes('startdate') || headerParts.includes('tanggalmulai');

    const startIndex = isHeader ? 1 : 0;
    if (lines.length <= startIndex) {
      return { valid_rows: [], errors: [{ line: 1, field: 'csv', message: 'Berkas CSV tidak memiliki baris data' }], total_rows: 0 };
    }

    for (let i = startIndex; i < lines.length; i++) {
      const lineNo = i + 1;
      const cols = parseCsvLine(lines[i], delimiter);
      if (cols.length < 3) {
        errors.push({ line: lineNo, field: 'format', message: 'Jumlah kolom kurang (minimal nama, tipe, tanggal mulai)' });
        continue;
      }

      let rowObj = {};
      if (isHeader) {
        headerParts.forEach((h, colIdx) => {
          const val = cols[colIdx] !== undefined ? cols[colIdx] : '';
          if (['name', 'nama', 'namalibur', 'title'].includes(h)) rowObj.name = val;
          else if (['holidaytype', 'jenis', 'type', 'kategori'].includes(h)) rowObj.holiday_type = val;
          else if (['startdate', 'tanggalmulai', 'tglmulai', 'mulai'].includes(h)) rowObj.start_date = val;
          else if (['enddate', 'tanggalselesai', 'tglselesai', 'selesai'].includes(h)) rowObj.end_date = val;
          else if (['isoffday', 'libur', 'offday'].includes(h)) rowObj.is_off_day = val;
          else if (['appliesto', 'berlakuuntuk', 'sasaran'].includes(h)) rowObj.applies_to = val;
          else if (['deductsannualleave', 'potongcuti', 'potongjatah'].includes(h)) rowObj.deducts_annual_leave = val;
          else if (['daterule', 'aturantanggal', 'rule'].includes(h)) rowObj.date_rule = val;
          else if (['notes', 'catatan', 'keterangan'].includes(h)) rowObj.notes = val;
        });
      } else {
        // Fallback positional: name, type, start_date, end_date, is_off_day, deducts_annual_leave, date_rule, notes
        rowObj = {
          name: cols[0],
          holiday_type: cols[1],
          start_date: cols[2],
          end_date: cols[3] || cols[2],
          is_off_day: cols[4] !== undefined ? cols[4] : true,
          deducts_annual_leave: cols[5] !== undefined ? cols[5] : false,
          date_rule: cols[6] || 'floating',
          notes: cols[7] || null
        };
      }

      validateAndAddRow(rowObj, lineNo);
    }
  }

  function validateAndAddRow(item, lineNo) {
    const name = String(item.name || item.nama || item.title || '').trim();
    if (!name) {
      errors.push({ line: lineNo, field: 'name', message: 'Nama libur tidak boleh kosong' });
      return;
    }

    let holiday_type = String(item.holiday_type || item.jenis || item.type || 'national').trim().toLowerCase();
    // Friendly mapping for Indonesian names
    const typeAliases = {
      'nasional': 'national',
      'cuti_bersama': 'joint_leave',
      'cutibersama': 'joint_leave',
      'semester': 'school_semester',
      'libur_semester': 'school_semester',
      'ramadhan': 'school_ramadan',
      'ramadan': 'school_ramadan',
      'ujian': 'school_exam',
      'yayasan': 'foundation',
      'khusus': 'unit_special'
    };
    if (typeAliases[holiday_type]) holiday_type = typeAliases[holiday_type];
    if (!HOLIDAY_TYPES.includes(holiday_type)) {
      errors.push({ line: lineNo, field: 'holiday_type', message: `Tipe libur '${holiday_type}' tidak valid. Pilihan: ${HOLIDAY_TYPES.join(', ')}` });
      return;
    }

    const startDate = normalizeDateStr(item.start_date || item.tanggal_mulai || item.mulai);
    if (!startDate) {
      errors.push({ line: lineNo, field: 'start_date', message: 'Tanggal mulai tidak valid (gunakan format YYYY-MM-DD atau DD/MM/YYYY)' });
      return;
    }

    let endDate = normalizeDateStr(item.end_date || item.tanggal_selesai || item.selesai);
    if (!endDate) endDate = startDate;

    if (endDate < startDate) {
      errors.push({ line: lineNo, field: 'end_date', message: `Tanggal selesai (${endDate}) lebih awal dari tanggal mulai (${startDate})` });
      return;
    }

    const isOffDay = normalizeBoolean(item.is_off_day !== undefined ? item.is_off_day : item.libur, true);
    const deductsAnnualLeave = normalizeBoolean(item.deducts_annual_leave !== undefined ? item.deducts_annual_leave : item.potong_cuti, false);
    
    let appliesTo = String(item.applies_to || item.appliesTo || 'all_employees').toLowerCase();
    if (!['all_employees', 'schedules'].includes(appliesTo)) appliesTo = 'all_employees';

    let dateRule = String(item.date_rule || item.dateRule || 'floating').toLowerCase();
    if (!['fixed_date', 'floating'].includes(dateRule)) dateRule = 'floating';

    const notes = item.notes ? String(item.notes).trim() : null;

    // Check duplicate key within the same import payload
    const duplicateKey = `${holiday_type}:${startDate}:${name.toLowerCase()}`;
    if (seenKeys.has(duplicateKey)) {
      errors.push({ line: lineNo, field: 'duplicate', message: `Data duplikat pada baris ini: ${name} (${startDate})` });
      return;
    }
    seenKeys.add(duplicateKey);

    valid_rows.push({
      name,
      holiday_type,
      start_date: startDate,
      end_date: endDate,
      is_off_day: isOffDay,
      applies_to: appliesTo,
      deducts_annual_leave: deductsAnnualLeave,
      date_rule: dateRule,
      review_status: 'confirmed',
      notes,
      source: 'imported_file'
    });
  }

  return {
    valid_rows,
    errors,
    total_rows: valid_rows.length + errors.length
  };
}

/**
 * Pure transformer to copy holidays from fromYear to toYear
 * SPEC §10.4:
 * - fixed_date: copied with the exact same calendar date in toYear, review_status='confirmed'
 * - floating: copied with new year date placeholder, review_status='draft_needs_review'
 */
function computeCopyYearHolidays(sourceHolidays, fromYear, toYear) {
  if (!Array.isArray(sourceHolidays)) return [];
  const deltaYears = toYear - fromYear;
  if (deltaYears === 0) return [];

  return sourceHolidays.map(h => {
    const sDate = formatDbDate(h.start_date);
    const eDate = formatDbDate(h.end_date || h.start_date);

    const [sY, sM, sD] = sDate.split('-');
    const [eY, eM, eD] = eDate.split('-');

    // Target years
    const newSY = Number(sY) + deltaYears;
    const newEY = Number(eY) + deltaYears;

    // Handle leap day
    let safeSD = sD;
    if (sM === '02' && sD === '29' && (newSY % 4 !== 0 || (newSY % 100 === 0 && newSY % 400 !== 0))) {
      safeSD = '28';
    }
    let safeED = eD;
    if (eM === '02' && eD === '29' && (newEY % 4 !== 0 || (newEY % 100 === 0 && newEY % 400 !== 0))) {
      safeED = '28';
    }

    const newStartDate = `${newSY}-${sM}-${safeSD}`;
    const newEndDate = `${newEY}-${eM}-${safeED}`;

    const isFixed = h.date_rule === 'fixed_date';

    return {
      school_unit_id: h.school_unit_id || null,
      name: h.name,
      holiday_type: h.holiday_type,
      start_date: newStartDate,
      end_date: newEndDate,
      is_off_day: Boolean(h.is_off_day),
      applies_to: h.applies_to || 'all_employees',
      deducts_annual_leave: Boolean(h.deducts_annual_leave),
      date_rule: h.date_rule || 'floating',
      review_status: isFixed ? 'confirmed' : 'draft_needs_review',
      source: 'copied',
      source_ref: `Salin dari tahun ${fromYear} (ID asal: ${h.id})`,
      notes: h.notes || null,
      target_schedule_ids: h.target_schedule_ids ? [...h.target_schedule_ids] : []
    };
  });
}

// =========================================================================
// SERVICE CLASS
// =========================================================================

class HolidayService {
  constructor() {
    this.filterOffHolidaysForDate = filterOffHolidaysForDate;
    this.parseImportFile = parseImportFile;
    this.computeCopyYearHolidays = computeCopyYearHolidays;
    this.formatDbDate = formatDbDate;
  }

  /**
   * List holidays with scoping and filters
   */
  async getHolidays(query = {}, actor = null) {
    const {
      year,
      school_unit_id,
      holiday_type,
      date_from,
      date_to,
      review_status,
      include_deleted = false,
      q,
      page,
      per_page = 50
    } = query;

    let qb = db('holidays as h').select('h.*');

    if (!include_deleted) {
      qb = qb.whereNull('h.deleted_at');
    }

    // Scoping
    if (actor && actor.unitScope !== 'all') {
      const allowedUnits = Array.isArray(actor.unitScope) ? actor.unitScope : [];
      qb = qb.where(builder => {
        builder.whereNull('h.school_unit_id')
          .orWhereIn('h.school_unit_id', allowedUnits);
      });
    }

    if (school_unit_id !== undefined && school_unit_id !== null && school_unit_id !== '') {
      if (school_unit_id === 'null' || school_unit_id === 'global') {
        qb = qb.whereNull('h.school_unit_id');
      } else {
        qb = qb.where(b => {
          b.where('h.school_unit_id', Number(school_unit_id)).orWhereNull('h.school_unit_id');
        });
      }
    }

    if (year) {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;
      qb = qb.where(builder => {
        builder.whereBetween('h.start_date', [startOfYear, endOfYear])
          .orWhereBetween('h.end_date', [startOfYear, endOfYear])
          .orWhere(sub => {
            sub.where('h.start_date', '<=', startOfYear)
              .andWhere('h.end_date', '>=', endOfYear);
          });
      });
    }

    if (date_from && date_to) {
      qb = qb.where(builder => {
        builder.where('h.start_date', '<=', date_to)
          .andWhere('h.end_date', '>=', date_from);
      });
    } else if (date_from) {
      qb = qb.where('h.end_date', '>=', date_from);
    } else if (date_to) {
      qb = qb.where('h.start_date', '<=', date_to);
    }

    if (holiday_type) {
      qb = qb.where('h.holiday_type', holiday_type);
    }

    if (review_status) {
      qb = qb.where('h.review_status', review_status);
    }

    if (q) {
      qb = qb.where(b => {
        b.where('h.name', 'like', `%${q}%`)
          .orWhere('h.notes', 'like', `%${q}%`);
      });
    }

    const totalCountQuery = qb.clone().clearSelect().count('* as total').first();
    const totalRes = await totalCountQuery;
    const total = totalRes ? Number(totalRes.total) : 0;

    let rowsQuery = qb.orderBy('h.start_date', 'asc');
    if (page) {
      const pageNum = Math.max(1, Number(page));
      const perPageNum = Math.max(1, Math.min(100, Number(per_page)));
      rowsQuery = rowsQuery.limit(perPageNum).offset((pageNum - 1) * perPageNum);
    }

    const rows = await rowsQuery;

    // Attach target schedule IDs
    const holidayIds = rows.map(r => r.id);
    let targetMap = {};
    if (holidayIds.length > 0) {
      const targets = await db('holiday_schedule_targets')
        .whereIn('holiday_id', holidayIds);
      targets.forEach(t => {
        if (!targetMap[t.holiday_id]) targetMap[t.holiday_id] = [];
        targetMap[t.holiday_id].push(t.work_schedule_id);
      });
    }

    const formattedData = rows.map(r => ({
      ...r,
      start_date: formatDbDate(r.start_date),
      end_date: formatDbDate(r.end_date),
      is_off_day: Boolean(r.is_off_day),
      deducts_annual_leave: Boolean(r.deducts_annual_leave),
      target_schedule_ids: targetMap[r.id] || []
    }));

    return {
      data: formattedData,
      meta: page ? { total, page: Number(page), per_page: Number(per_page) } : { total }
    };
  }

  /**
   * Get single holiday by ID
   */
  async getHolidayById(id, actor = null) {
    const holiday = await db('holidays')
      .where({ id })
      .whereNull('deleted_at')
      .first();

    if (!holiday) return null;

    if (actor && actor.unitScope !== 'all' && holiday.school_unit_id) {
      if (!isUnitInScope(actor.unitScope, holiday.school_unit_id)) {
        const err = new Error('Hari libur berada di luar cakupan satuan pendidikan Anda');
        err.code = 'FORBIDDEN_SCOPE';
        err.statusCode = 403;
        throw err;
      }
    }

    const targets = await db('holiday_schedule_targets')
      .where({ holiday_id: id });

    return {
      ...holiday,
      start_date: formatDbDate(holiday.start_date),
      end_date: formatDbDate(holiday.end_date),
      is_off_day: Boolean(holiday.is_off_day),
      deducts_annual_leave: Boolean(holiday.deducts_annual_leave),
      target_schedule_ids: targets.map(t => t.work_schedule_id)
    };
  }

  /**
   * Create holiday
   */
  async createHoliday(payload, actor) {
    const validated = createHolidaySchema.safeParse(payload);
    if (!validated.success) {
      const firstErr = validated.error.errors[0];
      const err = new Error(firstErr.message);
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 422;
      err.errors = validated.error.errors.map(e => ({
        code: 'VALIDATION_ERROR',
        field: e.path.join('.'),
        message: e.message
      }));
      throw err;
    }

    const data = validated.data;

    // Check unit scope for actor
    if (actor && actor.unitScope !== 'all') {
      if (data.school_unit_id && !isUnitInScope(actor.unitScope, data.school_unit_id)) {
        const err = new Error('Satuan pendidikan berada di luar cakupan wewenang Anda');
        err.code = 'FORBIDDEN_SCOPE';
        err.statusCode = 403;
        throw err;
      }
    }

    // If applies_to === 'schedules', validate target_schedule_ids exist
    if (data.applies_to === 'schedules' && data.target_schedule_ids.length > 0) {
      const validSchedules = await db('attendance_work_schedules')
        .whereIn('id', data.target_schedule_ids);
      if (validSchedules.length !== data.target_schedule_ids.length) {
        const err = new Error('Salah satu ID jadwal kerja target tidak ditemukan');
        err.code = 'INVALID_TARGET_SCHEDULE';
        err.statusCode = 422;
        throw err;
      }
    }

    const endDate = data.end_date || data.start_date;

    const [insertId] = await db.transaction(async (trx) => {
      const [id] = await trx('holidays').insert({
        name: data.name,
        holiday_type: data.holiday_type,
        start_date: data.start_date,
        end_date: endDate,
        school_unit_id: data.school_unit_id || null,
        is_off_day: data.is_off_day ? 1 : 0,
        applies_to: data.applies_to,
        deducts_annual_leave: data.deducts_annual_leave ? 1 : 0,
        date_rule: data.date_rule,
        review_status: data.review_status,
        source: data.source,
        source_ref: data.source_ref || null,
        academic_event_id: data.academic_event_id || null,
        notes: data.notes || null,
        created_by: actor ? actor.userId : null,
        updated_by: actor ? actor.userId : null,
        created_at: new Date(),
        updated_at: new Date()
      });

      if (data.applies_to === 'schedules' && data.target_schedule_ids.length > 0) {
        const targetInserts = data.target_schedule_ids.map(schedId => ({
          holiday_id: id,
          work_schedule_id: schedId,
          created_at: new Date()
        }));
        await trx('holiday_schedule_targets').insert(targetInserts);
      }

      await recordLeaveAuditLog({
        entity_type: 'holiday',
        entity_id: id,
        action: 'create',
        actor,
        school_unit_id: data.school_unit_id || null,
        after_state: {
          id,
          name: data.name,
          holiday_type: data.holiday_type,
          start_date: data.start_date,
          end_date: endDate,
          applies_to: data.applies_to,
          target_schedule_ids: data.target_schedule_ids
        },
        metadata: { source: data.source }
      }, trx);

      return [id];
    });

    return this.getHolidayById(insertId, actor);
  }

  /**
   * Update holiday
   */
  async updateHoliday(id, payload, actor) {
    const existing = await this.getHolidayById(id, actor);
    if (!existing) {
      const err = new Error('Hari libur tidak ditemukan');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const validated = updateHolidaySchema.safeParse(payload);
    if (!validated.success) {
      const firstErr = validated.error.errors[0];
      const err = new Error(firstErr.message);
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 422;
      err.errors = validated.error.errors.map(e => ({
        code: 'VALIDATION_ERROR',
        field: e.path.join('.'),
        message: e.message
      }));
      throw err;
    }

    const data = validated.data;

    // Check scope if unit changes
    if (data.school_unit_id !== undefined && actor && actor.unitScope !== 'all') {
      if (data.school_unit_id && !isUnitInScope(actor.unitScope, data.school_unit_id)) {
        const err = new Error('Satuan pendidikan berada di luar cakupan wewenang Anda');
        err.code = 'FORBIDDEN_SCOPE';
        err.statusCode = 403;
        throw err;
      }
    }

    const updateFields = {
      updated_by: actor ? actor.userId : null,
      updated_at: new Date()
    };

    if (data.name !== undefined) updateFields.name = data.name;
    if (data.holiday_type !== undefined) updateFields.holiday_type = data.holiday_type;
    if (data.start_date !== undefined) updateFields.start_date = data.start_date;
    if (data.end_date !== undefined) updateFields.end_date = data.end_date || data.start_date || existing.start_date;
    if (data.school_unit_id !== undefined) updateFields.school_unit_id = data.school_unit_id || null;
    if (data.is_off_day !== undefined) updateFields.is_off_day = data.is_off_day ? 1 : 0;
    if (data.applies_to !== undefined) updateFields.applies_to = data.applies_to;
    if (data.deducts_annual_leave !== undefined) updateFields.deducts_annual_leave = data.deducts_annual_leave ? 1 : 0;
    if (data.date_rule !== undefined) updateFields.date_rule = data.date_rule;
    if (data.review_status !== undefined) updateFields.review_status = data.review_status;
    if (data.notes !== undefined) updateFields.notes = data.notes;

    const finalAppliesTo = data.applies_to !== undefined ? data.applies_to : existing.applies_to;

    await db.transaction(async (trx) => {
      await trx('holidays').where({ id }).update(updateFields);

      if (data.target_schedule_ids !== undefined || data.applies_to !== undefined) {
        await trx('holiday_schedule_targets').where({ holiday_id: id }).del();
        const targets = data.target_schedule_ids !== undefined ? data.target_schedule_ids : existing.target_schedule_ids;
        if (finalAppliesTo === 'schedules' && Array.isArray(targets) && targets.length > 0) {
          const targetInserts = targets.map(schedId => ({
            holiday_id: id,
            work_schedule_id: schedId,
            created_at: new Date()
          }));
          await trx('holiday_schedule_targets').insert(targetInserts);
        }
      }

      await recordLeaveAuditLog({
        entity_type: 'holiday',
        entity_id: id,
        action: 'update',
        actor,
        school_unit_id: existing.school_unit_id || null,
        before_state: existing,
        after_state: { ...existing, ...updateFields, target_schedule_ids: data.target_schedule_ids }
      }, trx);
    });

    return this.getHolidayById(id, actor);
  }

  /**
   * Soft delete holiday
   */
  async deleteHoliday(id, actor) {
    const existing = await this.getHolidayById(id, actor);
    if (!existing) {
      const err = new Error('Hari libur tidak ditemukan');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    await db.transaction(async (trx) => {
      await trx('holidays').where({ id }).update({
        deleted_at: new Date(),
        updated_by: actor ? actor.userId : null
      });

      await recordLeaveAuditLog({
        entity_type: 'holiday',
        entity_id: id,
        action: 'delete',
        actor,
        school_unit_id: existing.school_unit_id || null,
        before_state: existing,
        after_state: null
      }, trx);
    });

    return { success: true, message: 'Hari libur berhasil dihapus' };
  }

  /**
   * Import holidays (CSV / JSON) with preview and commit modes
   */
  async importHolidays(payload, actor) {
    const { mode = 'preview', format = 'csv', content, school_unit_id = null } = payload;

    const parsed = parseImportFile(content, format);
    if (parsed.errors.length > 0 && mode === 'preview') {
      return {
        mode: 'preview',
        total_rows: parsed.total_rows,
        valid_count: parsed.valid_rows.length,
        invalid_count: parsed.errors.length,
        errors: parsed.errors,
        preview_rows: parsed.valid_rows
      };
    }

    if (mode === 'preview') {
      return {
        mode: 'preview',
        total_rows: parsed.total_rows,
        valid_count: parsed.valid_rows.length,
        invalid_count: 0,
        errors: [],
        preview_rows: parsed.valid_rows
      };
    }

    // Mode === 'commit'
    if (parsed.valid_rows.length === 0) {
      const err = new Error('Tidak ada baris data libur yang valid untuk diimpor');
      err.code = 'NO_VALID_DATA';
      err.statusCode = 422;
      err.errors = parsed.errors;
      throw err;
    }

    const targetUnitId = school_unit_id ? Number(school_unit_id) : null;
    if (actor && actor.unitScope !== 'all' && targetUnitId) {
      if (!isUnitInScope(actor.unitScope, targetUnitId)) {
        const err = new Error('Satuan pendidikan berada di luar cakupan wewenang Anda');
        err.code = 'FORBIDDEN_SCOPE';
        err.statusCode = 403;
        throw err;
      }
    }

    const results = await db.transaction(async (trx) => {
      let insertedCount = 0;
      let updatedCount = 0;

      for (const row of parsed.valid_rows) {
        const unitVal = targetUnitId || null;
        const unitKeyVal = unitVal || 0;

        // Check unique constraint: (unit_key, holiday_type, start_date, name)
        const existing = await trx('holidays')
          .where({
            unit_key: unitKeyVal,
            holiday_type: row.holiday_type,
            start_date: row.start_date,
            name: row.name
          })
          .first();

        if (existing) {
          await trx('holidays')
            .where({ id: existing.id })
            .update({
              end_date: row.end_date,
              is_off_day: row.is_off_day ? 1 : 0,
              applies_to: row.applies_to,
              deducts_annual_leave: row.deducts_annual_leave ? 1 : 0,
              date_rule: row.date_rule,
              review_status: 'confirmed',
              source: 'imported_file',
              notes: row.notes,
              deleted_at: null,
              updated_by: actor ? actor.userId : null,
              updated_at: new Date()
            });
          updatedCount++;
        } else {
          await trx('holidays').insert({
            name: row.name,
            holiday_type: row.holiday_type,
            start_date: row.start_date,
            end_date: row.end_date,
            school_unit_id: unitVal,
            is_off_day: row.is_off_day ? 1 : 0,
            applies_to: row.applies_to,
            deducts_annual_leave: row.deducts_annual_leave ? 1 : 0,
            date_rule: row.date_rule,
            review_status: 'confirmed',
            source: 'imported_file',
            notes: row.notes,
            created_by: actor ? actor.userId : null,
            updated_by: actor ? actor.userId : null,
            created_at: new Date(),
            updated_at: new Date()
          });
          insertedCount++;
        }
      }

      await recordLeaveAuditLog({
        entity_type: 'holiday',
        action: 'import',
        actor,
        school_unit_id: targetUnitId,
        metadata: {
          format,
          inserted_count: insertedCount,
          updated_count: updatedCount,
          total_imported: parsed.valid_rows.length
        }
      }, trx);

      return {
        inserted_count: insertedCount,
        updated_count: updatedCount,
        total_imported: parsed.valid_rows.length
      };
    });

    return {
      success: true,
      message: `Berhasil mengimpor ${results.total_imported} hari libur (${results.inserted_count} baru, ${results.updated_count} diperbarui)`,
      data: results
    };
  }

  /**
   * Copy holidays from one year to another
   * SPEC §10.4:
   * - fixed_date -> copied with confirmed status
   * - floating -> copied as draft_needs_review
   */
  async copyYear(payload, actor) {
    const { from_year, to_year, school_unit_id = null } = payload;
    if (!from_year || !to_year) {
      const err = new Error('Parameter from_year dan to_year wajib diisi');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 422;
      throw err;
    }

    const fromYearNum = Number(from_year);
    const toYearNum = Number(to_year);

    if (fromYearNum === toYearNum) {
      const err = new Error('Tahun asal dan tahun tujuan tidak boleh sama');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 422;
      throw err;
    }

    const targetUnitId = school_unit_id ? Number(school_unit_id) : null;
    if (actor && actor.unitScope !== 'all' && targetUnitId) {
      if (!isUnitInScope(actor.unitScope, targetUnitId)) {
        const err = new Error('Satuan pendidikan berada di luar cakupan wewenang Anda');
        err.code = 'FORBIDDEN_SCOPE';
        err.statusCode = 403;
        throw err;
      }
    }

    // Fetch source holidays
    const sourceHolidaysRes = await this.getHolidays({
      year: fromYearNum,
      school_unit_id: targetUnitId,
      include_deleted: false
    }, actor);

    const sourceHolidays = sourceHolidaysRes.data;
    if (sourceHolidays.length === 0) {
      return {
        success: true,
        data: { copied_count: 0, from_year: fromYearNum, to_year: toYearNum },
        message: `Tidak ditemukan hari libur pada tahun ${fromYearNum} untuk disalin`
      };
    }

    const targetHolidays = computeCopyYearHolidays(sourceHolidays, fromYearNum, toYearNum);

    const results = await db.transaction(async (trx) => {
      let createdCount = 0;
      let skippedCount = 0;

      for (const h of targetHolidays) {
        const unitVal = h.school_unit_id || null;
        const unitKeyVal = unitVal || 0;

        const existing = await trx('holidays')
          .where({
            unit_key: unitKeyVal,
            holiday_type: h.holiday_type,
            start_date: h.start_date,
            name: h.name
          })
          .first();

        if (existing) {
          skippedCount++;
          continue;
        }

        const [insertId] = await trx('holidays').insert({
          name: h.name,
          holiday_type: h.holiday_type,
          start_date: h.start_date,
          end_date: h.end_date,
          school_unit_id: unitVal,
          is_off_day: h.is_off_day ? 1 : 0,
          applies_to: h.applies_to,
          deducts_annual_leave: h.deducts_annual_leave ? 1 : 0,
          date_rule: h.date_rule,
          review_status: h.review_status,
          source: h.source,
          source_ref: h.source_ref,
          notes: h.notes,
          created_by: actor ? actor.userId : null,
          updated_by: actor ? actor.userId : null,
          created_at: new Date(),
          updated_at: new Date()
        });

        if (h.applies_to === 'schedules' && Array.isArray(h.target_schedule_ids) && h.target_schedule_ids.length > 0) {
          const targetInserts = h.target_schedule_ids.map(schedId => ({
            holiday_id: insertId,
            work_schedule_id: schedId,
            created_at: new Date()
          }));
          await trx('holiday_schedule_targets').insert(targetInserts);
        }

        createdCount++;
      }

      await recordLeaveAuditLog({
        entity_type: 'holiday',
        action: 'copy_year',
        actor,
        school_unit_id: targetUnitId,
        metadata: {
          from_year: fromYearNum,
          to_year: toYearNum,
          created_count: createdCount,
          skipped_count: skippedCount
        }
      }, trx);

      return {
        created_count: createdCount,
        skipped_count: skippedCount,
        from_year: fromYearNum,
        to_year: toYearNum
      };
    });

    return {
      success: true,
      message: `Berhasil menyalin ${results.created_count} hari libur ke tahun ${toYearNum} (${results.skipped_count} dilewati karena sudah ada)`,
      data: results
    };
  }

  /**
   * Sync academic calendar events in-process
   * SPEC §10.4:
   * Copies academic calendar events with is_holiday / school events into holidays table as draft_needs_review
   */
  async syncAcademicCalendar(payload = {}, actor) {
    const { school_unit_id = null } = payload;
    const targetUnitId = school_unit_id ? Number(school_unit_id) : null;

    if (actor && actor.unitScope !== 'all' && targetUnitId) {
      if (!isUnitInScope(actor.unitScope, targetUnitId)) {
        const err = new Error('Satuan pendidikan berada di luar cakupan wewenang Anda');
        err.code = 'FORBIDDEN_SCOPE';
        err.statusCode = 403;
        throw err;
      }
    }

    try {
      const hasAcademicEvents = await akademikDb.schema.hasTable('academic_calendar_events');
      if (!hasAcademicEvents) {
        return {
          success: true,
          data: { synced_count: 0, items: [] },
          message: 'Tabel kalender akademik tidak ditemukan di database akademik'
        };
      }

      let qb = akademikDb('academic_calendar_events');
      if (targetUnitId) {
        qb = qb.where(b => {
          b.where('satuan_pendidikan_id', targetUnitId).orWhereNull('satuan_pendidikan_id');
        });
      }

      const events = await qb;
      if (events.length === 0) {
        return {
          success: true,
          data: { synced_count: 0, items: [] },
          message: 'Tidak ada event kalender akademik yang ditemukan untuk disinkronkan'
        };
      }

      const synced = [];
      await db.transaction(async (trx) => {
        for (const ev of events) {
          const sDate = formatDbDate(ev.start_date);
          const eDate = formatDbDate(ev.end_date || ev.start_date);
          const unitVal = ev.satuan_pendidikan_id ? Number(ev.satuan_pendidikan_id) : null;
          const unitKeyVal = unitVal || 0;

          const existing = await trx('holidays')
            .where({
              academic_event_id: ev.id
            })
            .orWhere({
              unit_key: unitKeyVal,
              holiday_type: 'school_semester',
              start_date: sDate,
              name: ev.title
            })
            .first();

          if (existing) {
            await trx('holidays').where({ id: existing.id }).update({
              end_date: eDate,
              academic_event_id: ev.id,
              notes: ev.notes || existing.notes,
              updated_at: new Date()
            });
            synced.push(existing.id);
          } else {
            const [newId] = await trx('holidays').insert({
              name: ev.title,
              holiday_type: 'school_semester',
              start_date: sDate,
              end_date: eDate,
              school_unit_id: unitVal,
              is_off_day: 1,
              applies_to: 'all_employees',
              deducts_annual_leave: 0,
              date_rule: 'floating',
              review_status: 'draft_needs_review', // HRD must confirm
              source: 'academic_calendar',
              academic_event_id: ev.id,
              notes: ev.notes,
              created_by: actor ? actor.userId : null,
              created_at: new Date(),
              updated_at: new Date()
            });
            synced.push(newId);
          }
        }

        await recordLeaveAuditLog({
          entity_type: 'holiday',
          action: 'sync_academic',
          actor,
          school_unit_id: targetUnitId,
          metadata: { synced_count: synced.length }
        }, trx);
      });

      return {
        success: true,
        data: { synced_count: synced.length, holiday_ids: synced },
        message: `Berhasil menyinkronkan ${synced.length} event dari kalender akademik (status: draft_needs_review)`
      };
    } catch (err) {
      return {
        success: true,
        data: { synced_count: 0, error: err.message },
        message: `Sinkronisasi kalender akademik selesai (tanpa data baru): ${err.message}`
      };
    }
  }

  /**
   * Skeleton for joint leave deduction (activated in Tahap 7)
   */
  async applyJointLeaveDeduction(id, actor) {
    const err = new Error('Aksi potong cuti bersama diaktifkan di Tahap 7 setelah modul ledger saldo tersedia');
    err.code = 'NOT_IMPLEMENTED';
    err.statusCode = 501;
    throw err;
  }

  /**
   * Resolve effective off days for a specific employee across a date range
   */
  async getOffDaysForEmployee(employeeId, schoolUnitId, startDate, endDate) {
    const sDate = formatDbDate(startDate);
    const eDate = formatDbDate(endDate);

    // Fetch active schedule assignment
    const assignment = await db('employee_work_schedule_assignments')
      .where({ employee_id: employeeId, is_active: 1 })
      .first();

    const massSchedule = await db('attendance_work_schedules')
      .where({ is_active: 1, schedule_type: 'massal' })
      .modify(qb => { if (schoolUnitId) qb.where('satuan_pendidikan_id', schoolUnitId); })
      .first();

    const defaultScheduleId = assignment ? (assignment.work_schedule_id || assignment.id) : (massSchedule ? massSchedule.id : null);

    // Fetch confirmed holidays that overlap range for the unit / global
    const holidays = await db('holidays as h')
      .whereNull('h.deleted_at')
      .where('h.is_off_day', 1)
      .where('h.review_status', 'confirmed')
      .where(b => {
        b.whereNull('h.school_unit_id')
          .orWhere('h.school_unit_id', schoolUnitId);
      })
      .where('h.start_date', '<=', eDate)
      .where('h.end_date', '>=', sDate);

    // Attach targets
    const holidayIds = holidays.map(h => h.id);
    let targetMap = {};
    if (holidayIds.length > 0) {
      const targets = await db('holiday_schedule_targets')
        .whereIn('holiday_id', holidayIds);
      targets.forEach(t => {
        if (!targetMap[t.holiday_id]) targetMap[t.holiday_id] = [];
        targetMap[t.holiday_id].push(t.work_schedule_id);
      });
    }

    const holidaysWithTargets = holidays.map(h => ({
      ...h,
      target_schedule_ids: targetMap[h.id] || []
    }));

    // Iterate dates and compute matching off-holidays
    const result = {};
    const curr = new Date(`${sDate}T00:00:00`);
    const end = new Date(`${eDate}T00:00:00`);

    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dStr = `${y}-${m}-${d}`;

      const matched = filterOffHolidaysForDate(
        holidaysWithTargets,
        schoolUnitId,
        defaultScheduleId,
        dStr
      );

      result[dStr] = matched.map(h => ({
        id: h.id,
        name: h.name,
        holiday_type: h.holiday_type,
        deducts_annual_leave: Boolean(h.deducts_annual_leave),
        applies_to: h.applies_to
      }));

      curr.setDate(curr.getDate() + 1);
    }

    return result;
  }

  /**
   * Alias for getOffDaysForEmployee for full backwards compatibility
   */
  async getEffectiveHolidaysForEmployee(employeeId, schoolUnitId, startDate, endDate, workScheduleId = null) {
    return this.getOffDaysForEmployee(employeeId, schoolUnitId, startDate, endDate);
  }
}

module.exports = new HolidayService();
