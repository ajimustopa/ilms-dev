/**
 * Calendar Service
 * Modul Akademik - Fitur: Kalender Pendidikan Berversi (Kaldik Satuan & Yayasan),
 * Master Kategori & Warna, Pengesahan SK Dokumen, dan Integrasi RKT Manajemen.
 */
const db = require('../../../config/db/akademik');
let manajemenDb;
try {
  manajemenDb = require('../../../config/db/manajemen');
} catch (e) {
  manajemenDb = null;
}

class CalendarService {
  // ==========================================
  // 1. MASTER KATEGORI & KODE WARNA KEGIATAN
  // ==========================================
  async listCategories(query = {}) {
    // Cek apakah ada data di calendar_event_categories
    const countRes = await db('calendar_event_categories').count('id as total').first();
    const total = parseInt(countRes?.total, 10) || 0;

    // Auto-seed kategori standar jika masih kosong
    if (total === 0) {
      const defaultCategories = [
        { name: 'KBM & Pembelajaran Reguler', color_hex: '#10B981' },
        { name: 'Libur Nasional & Libur Santri', color_hex: '#EF4444' },
        { name: 'Ujian, STS & Asesmen Sumatif', color_hex: '#F59E0B' },
        { name: 'Kegiatan Pesantren & Ibadah', color_hex: '#6366F1' },
        { name: 'Ekstrakurikuler, Lomba & Acara', color_hex: '#EC4899' },
        { name: 'Rapat Dewan Guru & Kedinasan', color_hex: '#3B82F6' },
      ];

      for (const cat of defaultCategories) {
        await db('calendar_event_categories').insert({
          satuan_pendidikan_id: null,
          name: cat.name,
          color_hex: cat.color_hex,
          is_active: 1,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }

    let q = db('calendar_event_categories').where('is_active', 1);
    if (query.satuan_pendidikan_id) {
      q = q.where((b) => {
        b.where('satuan_pendidikan_id', query.satuan_pendidikan_id).orWhereNull('satuan_pendidikan_id');
      });
    }

    return q.orderBy('id', 'asc');
  }

  async createCategory(payload) {
    const { satuan_pendidikan_id, name, color_hex } = payload;
    if (!name || !color_hex) {
      const error = new Error('Field name dan color_hex wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('calendar_event_categories').insert({
      satuan_pendidikan_id: satuan_pendidikan_id || null,
      name: name.trim(),
      color_hex: color_hex.trim(),
      is_active: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('calendar_event_categories').where({ id }).first();
  }

  async updateCategory(id, payload) {
    const existing = await db('calendar_event_categories').where({ id }).first();
    if (!existing) {
      const error = new Error('Kategori kalender tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.color_hex) updateData.color_hex = payload.color_hex.trim();
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active ? 1 : 0;

    await db('calendar_event_categories').where({ id }).update(updateData);
    return db('calendar_event_categories').where({ id }).first();
  }

  async deleteCategory(id) {
    await db('calendar_event_categories').where({ id }).update({
      is_active: 0,
      updated_at: db.fn.now()
    });
    return { success: true };
  }

  // ==========================================
  // 2. DOKUMEN KALDIK BERVERSI (VERSIONING)
  // ==========================================
  async listDocumentVersions(query = {}) {
    const contextType = query.context_type || 'satuan';
    const sUnitId = contextType === 'yayasan' ? null : (query.satuan_pendidikan_id || null);
    const academicYearLabel = query.academic_year_label || '2026/2027';

    let q = db('calendar_document_versions')
      .where('context_type', contextType)
      .where('academic_year_label', academicYearLabel);

    if (contextType === 'satuan' && sUnitId) {
      q = q.where('satuan_pendidikan_id', sUnitId);
    } else if (contextType === 'yayasan') {
      q = q.whereNull('satuan_pendidikan_id');
    }

    let list = await q.orderBy('version_number', 'desc');

    // Auto-init Draft Versi 1 jika belum ada
    if (list.length === 0) {
      const [newId] = await db('calendar_document_versions').insert({
        context_type: contextType,
        satuan_pendidikan_id: contextType === 'yayasan' ? null : sUnitId,
        academic_year_label: academicYearLabel,
        version_number: 1,
        status: 'draft',
        notes: `Dokumen Kalender Pendidikan ${academicYearLabel} (${contextType === 'yayasan' ? 'Gabungan Yayasan' : 'Satuan Pendidikan'}) Versi 1`,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      const initialDoc = await db('calendar_document_versions').where({ id: newId }).first();
      list = [initialDoc];
    }

    return list;
  }

  async createDocumentVersion(payload, user = null) {
    const { context_type, satuan_pendidikan_id, academic_year_label, notes } = payload;
    const ctx = context_type || 'satuan';
    const sUnitId = ctx === 'yayasan' ? null : (satuan_pendidikan_id || null);
    const yearLabel = academic_year_label || '2026/2027';

    // Cari versi tertinggi saat ini
    let maxQuery = db('calendar_document_versions')
      .where('context_type', ctx)
      .where('academic_year_label', yearLabel);

    if (ctx === 'satuan' && sUnitId) {
      maxQuery = maxQuery.where('satuan_pendidikan_id', sUnitId);
    } else {
      maxQuery = maxQuery.whereNull('satuan_pendidikan_id');
    }

    const latestDoc = await maxQuery.orderBy('version_number', 'desc').first();
    const nextVer = (latestDoc?.version_number || 0) + 1;

    const [id] = await db('calendar_document_versions').insert({
      context_type: ctx,
      satuan_pendidikan_id: sUnitId,
      academic_year_label: yearLabel,
      version_number: nextVer,
      status: 'draft',
      notes: notes || `Revisi Kalender Pendidikan ${yearLabel} Versi ${nextVer}`,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Salin event dari versi sebelumnya (jika ada) ke versi baru ini
    if (latestDoc) {
      const oldEvents = await db('academic_calendar_events')
        .where('calendar_document_version_id', latestDoc.id);

      for (const ev of oldEvents) {
        await db('academic_calendar_events').insert({
          calendar_document_version_id: id,
          satuan_pendidikan_id: ev.satuan_pendidikan_id,
          category_id: ev.category_id,
          title: ev.title,
          start_date: ev.start_date,
          end_date: ev.end_date,
          grade_level_id: ev.grade_level_id,
          rkt_activity_id: ev.rkt_activity_id,
          rkt_program_name_snapshot: ev.rkt_program_name_snapshot,
          notes: ev.notes,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }

    return db('calendar_document_versions').where({ id }).first();
  }

  async publishDocumentVersion(id, payload, user = null) {
    const existing = await db('calendar_document_versions').where({ id }).first();
    if (!existing) {
      const error = new Error('Dokumen versi kaldik tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const publishedBy = user?.full_name || user?.username || 'Admin Kurikulum';
    const { decree_number, file_url, notes } = payload;

    await db('calendar_document_versions').where({ id }).update({
      status: 'published',
      published_at: db.fn.now(),
      published_by: publishedBy,
      decree_number: decree_number || existing.decree_number || `SK/KALDIK/${existing.academic_year_label?.replace('/', '-')}/${existing.version_number}`,
      file_url: file_url || existing.file_url || null,
      notes: notes || existing.notes,
      updated_at: db.fn.now()
    });

    return db('calendar_document_versions').where({ id }).first();
  }

  // ==========================================
  // 3. KEGIATAN KALENDER (ACADEMIC CALENDAR EVENTS)
  // ==========================================
  async listCalendarEvents(query = {}) {
    let baseQuery = db('academic_calendar_events')
      .leftJoin('calendar_document_versions as cdv', 'academic_calendar_events.calendar_document_version_id', 'cdv.id')
      .leftJoin('calendar_event_categories as cec', 'academic_calendar_events.category_id', 'cec.id')
      .leftJoin('grade_levels', 'academic_calendar_events.grade_level_id', 'grade_levels.id')
      .select(
        'academic_calendar_events.*',
        'cdv.academic_year_label',
        'cdv.version_number',
        'cdv.status as document_status',
        'cec.name as category_name',
        'cec.color_hex as category_color_hex',
        'grade_levels.name as grade_level_name'
      );

    if (query.calendar_document_version_id) {
      baseQuery = baseQuery.where('academic_calendar_events.calendar_document_version_id', query.calendar_document_version_id);
    }
    if (query.category_id) {
      baseQuery = baseQuery.where('academic_calendar_events.category_id', query.category_id);
    }
    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where((b) => {
        b.where('academic_calendar_events.satuan_pendidikan_id', query.satuan_pendidikan_id)
          .orWhereNull('academic_calendar_events.satuan_pendidikan_id');
      });
    }
    if (query.start_date && query.end_date) {
      baseQuery = baseQuery.where('academic_calendar_events.start_date', '<=', query.end_date)
        .where('academic_calendar_events.end_date', '>=', query.start_date);
    }

    return baseQuery.orderBy('academic_calendar_events.start_date', 'asc');
  }

  async createCalendarEvent(payload) {
    const {
      calendar_document_version_id,
      category_id,
      satuan_pendidikan_id,
      title,
      start_date,
      end_date,
      grade_level_id,
      rkt_activity_id,
      rkt_program_name_snapshot,
      notes
    } = payload;

    if (!title || !start_date || !end_date) {
      const error = new Error('Field title, start_date, dan end_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Default category fallback jika tidak dipilih
    let selectedCatId = category_id;
    if (!selectedCatId) {
      const firstCat = await db('calendar_event_categories').where('is_active', 1).first();
      selectedCatId = firstCat?.id || null;
    }

    const [id] = await db('academic_calendar_events').insert({
      calendar_document_version_id: calendar_document_version_id || null,
      category_id: selectedCatId,
      satuan_pendidikan_id: satuan_pendidikan_id || null,
      title: title.trim(),
      start_date,
      end_date,
      grade_level_id: grade_level_id || null,
      rkt_activity_id: rkt_activity_id ? Number(rkt_activity_id) : null,
      rkt_program_name_snapshot: rkt_program_name_snapshot || null,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('academic_calendar_events')
      .leftJoin('calendar_event_categories as cec', 'academic_calendar_events.category_id', 'cec.id')
      .select('academic_calendar_events.*', 'cec.name as category_name', 'cec.color_hex as category_color_hex')
      .where('academic_calendar_events.id', id)
      .first();
  }

  async updateCalendarEvent(id, payload) {
    const existing = await db('academic_calendar_events').where({ id }).first();
    if (!existing) {
      const error = new Error('Kegiatan kalender tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.title) updateData.title = payload.title.trim();
    if (payload.start_date) updateData.start_date = payload.start_date;
    if (payload.end_date) updateData.end_date = payload.end_date;
    if (payload.category_id !== undefined) updateData.category_id = payload.category_id || null;
    if (payload.grade_level_id !== undefined) updateData.grade_level_id = payload.grade_level_id || null;
    if (payload.rkt_activity_id !== undefined) updateData.rkt_activity_id = payload.rkt_activity_id ? Number(payload.rkt_activity_id) : null;
    if (payload.rkt_program_name_snapshot !== undefined) updateData.rkt_program_name_snapshot = payload.rkt_program_name_snapshot || null;
    if (payload.notes !== undefined) updateData.notes = payload.notes || null;

    await db('academic_calendar_events').where({ id }).update(updateData);

    return db('academic_calendar_events')
      .leftJoin('calendar_event_categories as cec', 'academic_calendar_events.category_id', 'cec.id')
      .select('academic_calendar_events.*', 'cec.name as category_name', 'cec.color_hex as category_color_hex')
      .where('academic_calendar_events.id', id)
      .first();
  }

  async deleteCalendarEvent(id) {
    const existing = await db('academic_calendar_events').where({ id }).first();
    if (!existing) {
      const error = new Error('Kegiatan kalender tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('academic_calendar_events').where({ id }).del();
    return { success: true, message: 'Kegiatan kalender berhasil dihapus' };
  }

  // ==========================================
  // 4. INTEGRASI PROGRAM RKT MANAJEMEN
  // ==========================================
  async getRktPrograms(query = {}) {
    const { academic_year, school_unit_id, context } = query;
    const acYear = (academic_year || '2026/2027').trim();
    const isFoundation = context === 'foundation' || !school_unit_id || school_unit_id === 'null';
    const sUnitId = isFoundation ? null : Number(school_unit_id);

    if (!manajemenDb) {
      return [];
    }

    try {
      // 1. Cari annual work plan
      let planQuery = manajemenDb('annual_work_plans').where('academic_year', acYear);
      if (sUnitId) {
        planQuery = planQuery.where('school_unit_id', sUnitId);
      } else {
        planQuery = planQuery.whereNull('school_unit_id');
      }

      const plan = await planQuery.first();
      if (!plan) return [];

      // 2. Ambil work_plan_activities join target program RIPS jika ada
      const activities = await manajemenDb('work_plan_activities')
        .leftJoin('rips_programs', 'work_plan_activities.rips_program_id', 'rips_programs.id')
        .select(
          'work_plan_activities.id',
          'work_plan_activities.annual_work_plan_id',
          'work_plan_activities.title',
          'work_plan_activities.tag',
          'work_plan_activities.status',
          'work_plan_activities.activity_date',
          'rips_programs.name as program_name',
          'rips_programs.code as program_code'
        )
        .where('work_plan_activities.annual_work_plan_id', plan.id)
        .orderBy('work_plan_activities.id', 'asc');

      return activities.map((a) => ({
        id: a.id,
        activity_code: a.program_code ? `${a.program_code}-ACT${a.id}` : `ACT-${a.id}`,
        activity_name: a.title,
        program_name: a.program_name || 'Program Kerja Umum RKT',
        display_label: `[${a.program_code || 'RKT'}] ${a.title} (${a.program_name || 'RKT'})`,
        status: a.status
      }));
    } catch (err) {
      console.warn('[RKT Integration Warning] Gagal membaca data RKT dari database Manajemen:', err.message);
      return [];
    }
  }
}

module.exports = new CalendarService();
