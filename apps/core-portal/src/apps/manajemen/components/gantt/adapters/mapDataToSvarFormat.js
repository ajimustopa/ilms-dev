/**
 * Data Adapter: Aldepos API -> SVAR React Gantt
 * 
 * Mengonversi data aktivitas dan tugas ke dalam SATU ARRAY FLAT tugas bertingkat:
 * 1. Bidang (Level 1 - Summary, parent: 0, open: true)
 * 2. Sub Bidang (Level 2 - Summary, parent: bidangId, open: true)
 * 3. Program (Level 3 - Summary, parent: subBidangId, open: true)
 * 4. Aktivitas / Tugas (Level 4 - Leaf Items, parent: programId, open: false)
 * 
 * SVAR Gantt / lib-state DataTree mengharapkan array flat dan secara internal
 * menyusun relasi tree berdasarkan field `parent`.
 */

// Palet warna dinamis untuk tag kustom
// Palet warna dinamis untuk tag kustom (Soft Harmonious Gradients)
const DYNAMIC_PALETTES = [
  { color: '#6366f1', fill: '#4f46e5', border: 'rgba(99, 102, 241, 0.45)', bgGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', fillGradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' }, // Indigo
  { color: '#0ea5e9', fill: '#0284c7', border: 'rgba(14, 165, 233, 0.45)', bgGradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', fillGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }, // Sky
  { color: '#10b981', fill: '#059669', border: 'rgba(16, 185, 129, 0.45)', bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fillGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }, // Emerald
  { color: '#f43f5e', fill: '#e11d48', border: 'rgba(244, 63, 94, 0.45)', bgGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', fillGradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' }, // Rose
  { color: '#f59e0b', fill: '#d97706', border: 'rgba(245, 158, 11, 0.45)', bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', fillGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' }, // Amber
  { color: '#8b5cf6', fill: '#7c3aed', border: 'rgba(139, 92, 246, 0.45)', bgGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', fillGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }, // Violet
  { color: '#14b8a6', fill: '#0d9488', border: 'rgba(20, 184, 166, 0.45)', bgGradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', fillGradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' }, // Teal
  { color: '#d946ef', fill: '#c026d3', border: 'rgba(217, 70, 239, 0.45)', bgGradient: 'linear-gradient(135deg, #d946ef 0%, #c026d3 100%)', fillGradient: 'linear-gradient(135deg, #c026d3 0%, #a21caf 100%)' }, // Fuchsia
  { color: '#f97316', fill: '#ea580c', border: 'rgba(249, 115, 22, 0.45)', bgGradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', fillGradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' }, // Orange
  { color: '#06b6d4', fill: '#0891b2', border: 'rgba(6, 182, 212, 0.45)', bgGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', fillGradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)' }, // Cyan
];

/**
 * Deteksi Tag / Tipe Kegiatan & Palet Warna Visual
 * @param {Object} item 
 * @returns {{ id: string, label: string, color: string, fill: string, border: string, bgGradient: string, fillGradient: string }}
 */
export function getTaskCategory(item = {}) {
  // 1. Ekstraksi Tag Eksplisit
  const rawTag = String(item.tag || '').trim().toLowerCase();

  if (rawTag) {
    if (rawTag === 'rapat' || rawTag.includes('meeting') || rawTag.includes('sidang')) {
      return {
        id: 'tag_rapat',
        label: 'Rapat & Pertemuan',
        color: '#6366f1',
        fill: '#4f46e5',
        border: 'rgba(99, 102, 241, 0.45)',
        bgGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        fillGradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
      };
    }

    if (rawTag === 'koordinasi' || rawTag.includes('komunikasi') || rawTag.includes('audiensi')) {
      return {
        id: 'tag_koordinasi',
        label: 'Koordinasi',
        color: '#0ea5e9',
        fill: '#0284c7',
        border: 'rgba(14, 165, 233, 0.45)',
        bgGradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        fillGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      };
    }

    if (rawTag === 'dokumen' || rawTag === 'administrasi' || rawTag.includes('surat') || rawTag.includes('sk')) {
      return {
        id: 'tag_dokumen',
        label: 'Dokumen & Administrasi',
        color: '#14b8a6',
        fill: '#0d9488',
        border: 'rgba(20, 184, 166, 0.45)',
        bgGradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        fillGradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
      };
    }

    if (rawTag === 'dokumentasi' || rawTag.includes('publikasi') || rawTag.includes('media') || rawTag.includes('foto')) {
      return {
        id: 'tag_dokumentasi',
        label: 'Dokumentasi & Media',
        color: '#f43f5e',
        fill: '#e11d48',
        border: 'rgba(244, 63, 94, 0.45)',
        bgGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
        fillGradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
      };
    }

    if (rawTag === 'lapangan' || rawTag.includes('survei') || rawTag.includes('kunjungan')) {
      return {
        id: 'tag_lapangan',
        label: 'Kegiatan Lapangan',
        color: '#f59e0b',
        fill: '#d97706',
        border: 'rgba(245, 158, 11, 0.45)',
        bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        fillGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      };
    }

    if (rawTag === 'evaluasi' || rawTag.includes('monev') || rawTag.includes('audit')) {
      return {
        id: 'tag_evaluasi',
        label: 'Evaluasi & Monev',
        color: '#8b5cf6',
        fill: '#7c3aed',
        border: 'rgba(139, 92, 246, 0.45)',
        bgGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        fillGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      };
    }

    if (rawTag === 'pengadaan' || rawTag.includes('logistik') || rawTag.includes('sarana')) {
      return {
        id: 'tag_pengadaan',
        label: 'Pengadaan & Logistik',
        color: '#10b981',
        fill: '#059669',
        border: 'rgba(16, 185, 129, 0.45)',
        bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        fillGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      };
    }

    if (rawTag === 'pelatihan' || rawTag.includes('workshop') || rawTag.includes('bimtek')) {
      return {
        id: 'tag_pelatihan',
        label: 'Pelatihan & Workshop',
        color: '#d946ef',
        fill: '#c026d3',
        border: 'rgba(217, 70, 239, 0.45)',
        bgGradient: 'linear-gradient(135deg, #d946ef 0%, #c026d3 100%)',
        fillGradient: 'linear-gradient(135deg, #c026d3 0%, #a21caf 100%)',
      };
    }

    // Hash deterministik untuk tag kustom lainnya
    let hash = 0;
    for (let i = 0; i < rawTag.length; i++) {
      hash = rawTag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const palIndex = Math.abs(hash) % DYNAMIC_PALETTES.length;
    const pal = DYNAMIC_PALETTES[palIndex];
    const formattedLabel = rawTag.charAt(0).toUpperCase() + rawTag.slice(1).replace(/_/g, ' ');

    return {
      id: `tag_${rawTag.replace(/[^a-z0-9_]/gi, '')}`,
      label: formattedLabel,
      color: pal.color,
      fill: pal.fill,
      border: pal.border,
      bgGradient: pal.bgGradient,
      fillGradient: pal.fillGradient,
    };
  }

  // 2. Deteksi berdasarkan Kata Kunci pada Judul jika Tag kosong
  const titleStr = String(item.title || item.name || '').toLowerCase();

  if (titleStr.includes('rapat') || titleStr.includes('diskusi') || titleStr.includes('pleno') || titleStr.includes('briefing')) {
    return {
      id: 'tag_rapat',
      label: 'Rapat & Pertemuan',
      color: '#6366f1',
      fill: '#4f46e5',
      border: 'rgba(99, 102, 241, 0.45)',
      bgGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      fillGradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    };
  }

  if (titleStr.includes('koordinasi') || titleStr.includes('audiensi') || titleStr.includes('sosialisasi')) {
    return {
      id: 'tag_koordinasi',
      label: 'Koordinasi',
      color: '#0ea5e9',
      fill: '#0284c7',
      border: 'rgba(14, 165, 233, 0.45)',
      bgGradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      fillGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    };
  }

  if (titleStr.includes('survei') || titleStr.includes('lapangan') || titleStr.includes('observasi') || titleStr.includes('kunjungan')) {
    return {
      id: 'tag_lapangan',
      label: 'Kegiatan Lapangan',
      color: '#f59e0b',
      fill: '#d97706',
      border: 'rgba(245, 158, 11, 0.45)',
      bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      fillGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    };
  }

  if (titleStr.includes('dokumen') || titleStr.includes('draf') || titleStr.includes('proposal') || titleStr.includes('rundown') || titleStr.includes('laporan') || titleStr.includes('sk')) {
    return {
      id: 'tag_dokumen',
      label: 'Dokumen & Administrasi',
      color: '#14b8a6',
      fill: '#0d9488',
      border: 'rgba(20, 184, 166, 0.45)',
      bgGradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
      fillGradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    };
  }

  if (titleStr.includes('dokumentasi') || titleStr.includes('publikasi') || titleStr.includes('liputan') || titleStr.includes('konten')) {
    return {
      id: 'tag_dokumentasi',
      label: 'Dokumentasi & Media',
      color: '#f43f5e',
      fill: '#e11d48',
      border: 'rgba(244, 63, 94, 0.45)',
      bgGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
      fillGradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    };
  }

  if (titleStr.includes('instalasi') || titleStr.includes('server') || titleStr.includes('jaringan') || titleStr.includes('it') || titleStr.includes('sistem') || titleStr.includes('software')) {
    return {
      id: 'tag_teknis',
      label: 'Teknis & IT',
      color: '#06b6d4',
      fill: '#0891b2',
      border: 'rgba(6, 182, 212, 0.45)',
      bgGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      fillGradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
    };
  }

  // 3. Fallback Tipe Item (Tugas Proyek vs Aktivitas RKT)
  const isTask = item.item_type === 'task' || item.project_id;
  if (isTask) {
    return {
      id: 'tag_proyek',
      label: 'Tugas Proyek',
      color: '#06b6d4',
      fill: '#0891b2',
      border: 'rgba(6, 182, 212, 0.45)',
      bgGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      fillGradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
    };
  }

  return {
    id: 'tag_umum',
    label: 'Aktivitas RKT',
    color: '#94a3b8',
    fill: '#475569',
    border: '#334155',
  };
}

/**
 * Parsing tanggal string (YYYY-MM-DD / ISO) menjadi Date object lokal jam 00:00:00
 * @param {string|Date} dateVal 
 * @param {Date} fallbackDate 
 * @returns {Date}
 */
export function safeParseDate(dateVal, fallbackDate = new Date()) {
  if (!dateVal) return new Date(fallbackDate);
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate(), 0, 0, 0, 0);
  }

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    // 1. Jika murni format 'YYYY-MM-DD' (tanpa jam/timezone)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const parsed = new Date(year, month, day, 0, 0, 0, 0);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // 2. Jika ada timestamp / ISO timezone (misal: '2026-08-29T17:00:00.000Z')
    // Gunakan new Date lalu ambil local date komponennya
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }
  }

  return new Date(fallbackDate);
}

/**
 * Normalisasi status ke standar teks
 * @param {string} rawStatus 
 * @returns {'in_progress' | 'completed' | 'cancelled' | 'planned'}
 */
export function normalizeTaskStatus(rawStatus) {
  const s = String(rawStatus || '').toLowerCase().trim();
  if (s === 'cancelled' || s === 'canceled' || s === 'dibatalkan' || s === 'batal') {
    return 'cancelled';
  }
  if (s === 'planned' || s === 'todo' || s === 'direncanakan') {
    return 'planned';
  }
  if (s === 'completed' || s === 'done' || s === 'selesai') {
    return 'completed';
  }
  if (s === 'in_progress' || s === 'progress' || s === 'sedang_berjalan' || s === 'running') {
    return 'in_progress';
  }
  return 'planned';
}

function cleanKey(str) {
  return String(str || 'umum').trim().toLowerCase().replace(/[^a-z0-9]/gi, '_');
}

/**
 * Konversi list item Aldepos ke format FLAT array tasks & links untuk SVAR Gantt
 * (Bidang -> Sub Bidang -> Program -> Aktivitas/Tugas)
 * 
 * @param {Array<Object>} rawData - Array item dari API Aldepos atau TaskProjectHub
 * @returns {{ tasks: Array<Object>, links: Array<Object>, categories: Array<Object> }}
 */
export function mapDataToSvarFormat(rawData = []) {
  if (!Array.isArray(rawData)) {
    return { tasks: [], links: [], categories: [] };
  }

  const categoryMap = new Map();
  const rawLinks = [];

  // Struktur Grouping
  const bidangMap = new Map();

  rawData.forEach((item) => {
    if (!item) return;

    const itemType = item.item_type || (item.program_id ? 'activity' : 'task');
    const rawId = item.raw_id !== undefined ? item.raw_id : item.id;
    const taskId = String(item.id || `${itemType}-${rawId}`);

    // Penentuan Hirarki: Bidang, Sub Bidang, Program
    let bidangName = (item.bidang_name || item.domain_name || '').trim();
    let subBidangName = (item.sub_bidang_name || item.subdomain_name || '').trim();
    let programName = (item.program_name || item.project_name || item.program_title || '').trim();
    const programCode = item.program_code || null;

    if (!bidangName) {
      if (item.project_id || itemType === 'task') {
        bidangName = 'PROYEK & PENGEMBANGAN';
      } else {
        bidangName = 'PROGRAM STRATEGIS (RKT)';
      }
    }

    if (!subBidangName) {
      if (item.project_category) {
        subBidangName = item.project_category;
      } else if (programName) {
        subBidangName = 'Program Kerja';
      } else {
        subBidangName = 'Umum';
      }
    }

    if (!programName) {
      programName = item.project_name || 'Program Umum';
    }

    const bKey = cleanKey(bidangName);
    const sbKey = cleanKey(subBidangName);
    const pKey = cleanKey(`${programCode || ''}_${programName}`);

    if (!bidangMap.has(bKey)) {
      bidangMap.set(bKey, {
        name: bidangName.toUpperCase(),
        key: bKey,
        subBidangs: new Map(),
      });
    }

    const bidangObj = bidangMap.get(bKey);
    if (!bidangObj.subBidangs.has(sbKey)) {
      bidangObj.subBidangs.set(sbKey, {
        name: subBidangName,
        key: sbKey,
        programs: new Map(),
      });
    }

    const subBidangObj = bidangObj.subBidangs.get(sbKey);
    if (!subBidangObj.programs.has(pKey)) {
      subBidangObj.programs.set(pKey, {
        id: item.program_id || item.rips_program_id || item.project_id || null,
        name: programName,
        code: programCode,
        key: pKey,
        items: [],
      });
    }

    // Registrasi Kategori Warna Tag
    const tagInfo = getTaskCategory(item);
    if (!categoryMap.has(tagInfo.id)) {
      categoryMap.set(tagInfo.id, tagInfo);
    }

    // Hitung tanggal item
    const rawStart = item.start_date || item.activity_date || item.created_at || item.due_date;
    const rawEnd = item.end_date || item.due_date || item.start_date || item.activity_date;
    const startDate = safeParseDate(rawStart, new Date());
    const rawEndDate = safeParseDate(rawEnd, startDate);

    const isMilestone = item.type === 'milestone' || item.is_milestone;
    const isSummary = item.type === 'summary' || item.is_summary;

    let durationDays = 1;
    if (isMilestone) {
      durationDays = 0;
    } else {
      const diffMs = rawEndDate.getTime() - startDate.getTime();
      const rawDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      durationDays = rawDays >= 0 ? Math.max(1, rawDays + 1) : 1;
    }

    const endDate = isMilestone
      ? new Date(startDate)
      : new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + durationDays, 0, 0, 0, 0);

    const progress = Math.min(100, Math.max(0, Number(item.progress_percent) || 0));
    const taskTitle = item.title || item.name || item.text || 'Tanpa Judul';
    const normalizedStatus = normalizeTaskStatus(item.status);

    const leafTask = {
      id: taskId,
      text: taskTitle,
      start: startDate,
      end: endDate,
      duration: durationDays,
      progress,
      type: isMilestone ? 'milestone' : (isSummary ? 'summary' : tagInfo.id),
      parent: `grp-prog-${bKey}-${sbKey}-${pKey}`,
      open: false,

      // Metadata
      raw_id: rawId,
      item_type: itemType,
      tag: item.tag || null,
      status: item.status || 'planned',
      normalized_status: normalizedStatus,
      category_id: tagInfo.id,
      category_label: tagInfo.label,
      category_color: tagInfo.color,
      program_id: item.program_id || null,
      program_code: item.program_code || null,
      program_name: item.program_name || null,
      project_id: item.project_id || null,
      project_name: item.project_name || null,
      assignee_employee_id: item.assignee_employee_id || null,
      assignee_employee_ids: item.assignee_employee_ids || (item.assignee_employee_id ? [item.assignee_employee_id] : []),
      raw_item: item,
    };

    subBidangObj.programs.get(pKey).items.push(leafTask);

    // Ketergantungan (Links)
    const dependencyId = item.dependency_id || (item.parent_activity_id ? `act-${item.parent_activity_id}` : null);
    if (dependencyId && String(dependencyId) !== String(taskId)) {
      rawLinks.push({
        id: `link-${dependencyId}-${taskId}`,
        source: String(dependencyId),
        target: taskId,
        type: 'e2s',
      });
    }
  });

  // Flat tasks array yang disusun urut (Bidang -> Sub Bidang -> Program -> Leaf Items)
  const flatTasks = [];

  bidangMap.forEach((bidang, bKey) => {
    const bidangId = `grp-bidang-${bKey}`;
    const allBidangItems = [];
    const subBidangTasks = [];

    bidang.subBidangs.forEach((subBidang, sbKey) => {
      const subBidangId = `grp-subbidang-${bKey}-${sbKey}`;
      const allSubBidangItems = [];
      const programTasks = [];

      subBidang.programs.forEach((program, pKey) => {
        const programId = `grp-prog-${bKey}-${sbKey}-${pKey}`;
        const pItems = program.items;
        allSubBidangItems.push(...pItems);
        allBidangItems.push(...pItems);

        if (pItems.length === 0) return;

        // Hitung rentang tanggal program
        let minStart = new Date(Math.min(...pItems.map((it) => it.start.getTime())));
        let maxEnd = new Date(Math.max(...pItems.map((it) => it.end.getTime())));
        let avgProg = Math.round(pItems.reduce((acc, it) => acc + (it.progress || 0), 0) / pItems.length);
        let pDuration = Math.max(1, Math.round((maxEnd.getTime() - minStart.getTime()) / (24 * 60 * 60 * 1000)));

        const progSummaryTask = {
          id: programId,
          raw_id: program.id,
          program_id: program.id,
          program_code: program.code,
          program_name: program.name,
          text: `${program.code ? `[${program.code}] ` : ''}${program.name}`,
          start: minStart,
          end: maxEnd,
          duration: pDuration,
          progress: avgProg,
          type: 'summary',
          parent: subBidangId,
          open: true,
          is_group: true,
          group_level: 'program',
          $skip: true,
          $skip_baseline: true,
          unscheduled: true,
        };

        programTasks.push(progSummaryTask);
        programTasks.push(...pItems);
      });

      if (allSubBidangItems.length === 0) return;

      let sbMinStart = new Date(Math.min(...allSubBidangItems.map((it) => it.start.getTime())));
      let sbMaxEnd = new Date(Math.max(...allSubBidangItems.map((it) => it.end.getTime())));
      let sbAvgProg = Math.round(allSubBidangItems.reduce((acc, it) => acc + (it.progress || 0), 0) / allSubBidangItems.length);
      let sbDuration = Math.max(1, Math.round((sbMaxEnd.getTime() - sbMinStart.getTime()) / (24 * 60 * 60 * 1000)));

      const subBidangSummaryTask = {
        id: subBidangId,
        text: subBidang.name,
        start: sbMinStart,
        end: sbMaxEnd,
        duration: sbDuration,
        progress: sbAvgProg,
        type: 'summary',
        parent: bidangId,
        open: true,
        is_group: true,
        group_level: 'sub_bidang',
        $skip: true,
        $skip_baseline: true,
        unscheduled: true,
      };

      subBidangTasks.push(subBidangSummaryTask);
      subBidangTasks.push(...programTasks);
    });

    if (allBidangItems.length === 0) return;

    let bMinStart = new Date(Math.min(...allBidangItems.map((it) => it.start.getTime())));
    let bMaxEnd = new Date(Math.max(...allBidangItems.map((it) => it.end.getTime())));
    let bAvgProg = Math.round(allBidangItems.reduce((acc, it) => acc + (it.progress || 0), 0) / allBidangItems.length);
    let bDuration = Math.max(1, Math.round((bMaxEnd.getTime() - bMinStart.getTime()) / (24 * 60 * 60 * 1000)));

    const bidangSummaryTask = {
      id: bidangId,
      text: bidang.name,
      start: bMinStart,
      end: bMaxEnd,
      duration: bDuration,
      progress: bAvgProg,
      type: 'summary',
      parent: 0,
      open: true,
      is_group: true,
      group_level: 'bidang',
      $skip: true,
      $skip_baseline: true,
      unscheduled: true,
    };

    flatTasks.push(bidangSummaryTask);
    flatTasks.push(...subBidangTasks);
  });

  // Validasi Link: Hanya sertakan link jika source dan target benar-benar ADA di array flatTasks
  const validTaskIds = new Set(flatTasks.map((t) => String(t.id)));
  const validLinks = rawLinks.filter(
    (l) => validTaskIds.has(String(l.source)) && validTaskIds.has(String(l.target))
  );

  return {
    tasks: flatTasks,
    links: validLinks,
    categories: Array.from(categoryMap.values()),
  };
}

export default mapDataToSvarFormat;
