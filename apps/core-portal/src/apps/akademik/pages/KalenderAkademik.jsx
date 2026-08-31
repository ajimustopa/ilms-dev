import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Layers,
  RotateCw,
  Award,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Lock,
  Unlock,
  Building2,
  Sparkles,
  ExternalLink,
  Tag,
  Palette,
  Eye,
  FileText,
  Trash2,
  Edit2
} from 'lucide-react';

export default function KalenderAkademik() {
  const { activeSchoolUnit, schoolUnits } = useAuth();

  // Context & Document Versioning State
  const [contextType, setContextType] = useState('satuan'); // 'satuan' | 'yayasan'
  const [selectedSatuanId, setSelectedSatuanId] = useState(activeSchoolUnit?.id || '');
  const [academicYears, setAcademicYears] = useState(['2025/2026', '2026/2027', '2027/2028']);
  const [selectedYear, setSelectedYear] = useState('2026/2027');

  const [documentVersions, setDocumentVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [activeVersion, setActiveVersion] = useState(null);

  // Master Categories & RKT Candidates
  const [categories, setCategories] = useState([]);
  const [rktPrograms, setRktPrograms] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);

  // Events & Display State
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('year_grid'); // 'year_grid' | 'single_month' | 'agenda_list'
  const [activeMonthOffset, setActiveMonthOffset] = useState(0); // 0 to 11 (Juli to Juni)

  // Modals
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  // Form States
  const [eventForm, setEventForm] = useState({
    title: '',
    category_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    grade_level_id: '',
    rkt_activity_id: '',
    rkt_program_name_snapshot: '',
    notes: ''
  });

  const [publishForm, setPublishForm] = useState({
    decree_number: '',
    file_url: '',
    notes: ''
  });

  const [newCategoryForm, setNewCategoryForm] = useState({
    name: '',
    color_hex: '#10B981'
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (activeSchoolUnit?.id && !selectedSatuanId) {
      setSelectedSatuanId(activeSchoolUnit.id);
    }
  }, [activeSchoolUnit]);

  useEffect(() => {
    fetchInitialMasterData();
  }, []);

  useEffect(() => {
    fetchDocumentVersions();
    fetchRktPrograms();
  }, [contextType, selectedSatuanId, selectedYear]);

  useEffect(() => {
    if (selectedVersionId) {
      fetchEventsByVersion(selectedVersionId);
    }
  }, [selectedVersionId]);

  const fetchInitialMasterData = async () => {
    try {
      const [catRes, grRes, yrRes] = await Promise.all([
        api.get('/akademik/calendar-event-categories').catch(() => ({ data: { data: [] } })),
        api.get('/akademik/grade-levels').catch(() => ({ data: { data: [] } })),
        api.get('/akademik/academic-years').catch(() => ({ data: { data: [] } }))
      ]);

      setCategories(catRes.data?.data || []);
      setGradeLevels(grRes.data?.data || []);

      const yrData = yrRes.data?.data || [];
      if (yrData.length > 0) {
        const yrNames = yrData.map((y) => y.name);
        setAcademicYears(yrNames);
        const activeYr = yrData.find((y) => y.is_active)?.name || yrNames[0];
        setSelectedYear(activeYr);
      }
    } catch (err) {
      console.warn('Failed to load calendar master data:', err);
    }
  };

  const fetchDocumentVersions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/akademik/calendar-document-versions', {
        params: {
          context_type: contextType,
          satuan_pendidikan_id: contextType === 'yayasan' ? null : selectedSatuanId,
          academic_year_label: selectedYear
        }
      });

      const versions = res.data?.data || [];
      setDocumentVersions(versions);

      if (versions.length > 0) {
        const initial = versions[0];
        setSelectedVersionId(String(initial.id));
        setActiveVersion(initial);
      } else {
        setSelectedVersionId('');
        setActiveVersion(null);
        setEvents([]);
      }
    } catch (err) {
      console.warn('Error loading calendar versions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventsByVersion = async (versionId) => {
    try {
      setLoading(true);
      const res = await api.get('/akademik/calendar-events', {
        params: { calendar_document_version_id: versionId }
      });
      setEvents(res.data?.data || []);
      const matchedVer = documentVersions.find((v) => String(v.id) === String(versionId));
      if (matchedVer) setActiveVersion(matchedVer);
    } catch (err) {
      console.warn('Error loading calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRktPrograms = async () => {
    try {
      const res = await api.get('/akademik/calendar-events/rkt-programs', {
        params: {
          academic_year: selectedYear,
          school_unit_id: contextType === 'yayasan' ? null : selectedSatuanId,
          context: contextType === 'yayasan' ? 'foundation' : 'school_unit'
        }
      });
      setRktPrograms(res.data?.data || []);
    } catch (err) {
      console.warn('Error loading RKT programs:', err);
    }
  };

  // Create new draft revision
  const handleCreateRevision = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.post('/akademik/calendar-document-versions', {
        context_type: contextType,
        satuan_pendidikan_id: contextType === 'yayasan' ? null : selectedSatuanId,
        academic_year_label: selectedYear
      });
      setSuccessMsg('Revisi versi dokumen baru berhasil dibuat!');
      await fetchDocumentVersions();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal membuat revisi baru');
    } finally {
      setLoading(false);
    }
  };

  // Publish Document
  const handlePublishDocument = async (e) => {
    e.preventDefault();
    if (!activeVersion) return;
    setSaving(true);
    setErrorMsg('');

    try {
      const res = await api.put(`/akademik/calendar-document-versions/${activeVersion.id}/publish`, publishForm);
      setSuccessMsg(`Dokumen Kaldik Versi ${activeVersion.version_number} resmi disahkan & diterbitkan!`);
      setPublishModalOpen(false);
      fetchDocumentVersions();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menerbitkan dokumen');
    } finally {
      setSaving(false);
    }
  };

  // Open Event Modal (Add or Edit)
  const handleOpenEventModal = (dateStr = null, existingEvent = null) => {
    setErrorMsg('');
    if (existingEvent) {
      setEditingEventId(existingEvent.id);
      setEventForm({
        title: existingEvent.title,
        category_id: existingEvent.category_id || (categories[0]?.id || ''),
        start_date: existingEvent.start_date?.split('T')[0],
        end_date: existingEvent.end_date?.split('T')[0],
        grade_level_id: existingEvent.grade_level_id || '',
        rkt_activity_id: existingEvent.rkt_activity_id || '',
        rkt_program_name_snapshot: existingEvent.rkt_program_name_snapshot || '',
        notes: existingEvent.notes || ''
      });
    } else {
      setEditingEventId(null);
      const defaultDate = dateStr || new Date().toISOString().split('T')[0];
      setEventForm({
        title: '',
        category_id: categories[0]?.id || '',
        start_date: defaultDate,
        end_date: defaultDate,
        grade_level_id: '',
        rkt_activity_id: '',
        rkt_program_name_snapshot: '',
        notes: ''
      });
    }
    setEventModalOpen(true);
  };

  // Save Calendar Event
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!selectedVersionId) {
      setErrorMsg('Pilih versi dokumen kaldik terlebih dahulu');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        ...eventForm,
        calendar_document_version_id: Number(selectedVersionId),
        satuan_pendidikan_id: contextType === 'yayasan' ? null : selectedSatuanId,
        category_id: Number(eventForm.category_id),
        grade_level_id: eventForm.grade_level_id ? Number(eventForm.grade_level_id) : null,
        rkt_activity_id: eventForm.rkt_activity_id ? Number(eventForm.rkt_activity_id) : null
      };

      if (editingEventId) {
        await api.put(`/akademik/calendar-events/${editingEventId}`, payload);
        setSuccessMsg('Kegiatan kalender berhasil diperbarui!');
      } else {
        await api.post('/akademik/calendar-events', payload);
        setSuccessMsg('Kegiatan kalender baru berhasil ditambahkan!');
      }

      setEventModalOpen(false);
      fetchEventsByVersion(selectedVersionId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan kegiatan kalender');
    } finally {
      setSaving(false);
    }
  };

  // Delete Calendar Event
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Yakin ingin menghapus agenda kegiatan kalender ini?')) return;
    try {
      await api.delete(`/akademik/calendar-events/${eventId}`);
      setSuccessMsg('Kegiatan berhasil dihapus');
      fetchEventsByVersion(selectedVersionId);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus kegiatan');
    }
  };

  // Add Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/akademik/calendar-event-categories', newCategoryForm);
      setCategories([...categories, res.data.data]);
      setNewCategoryForm({ name: '', color_hex: '#10B981' });
      setSuccessMsg('Kategori baru berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menambah kategori');
    }
  };

  // Helper Academic Year Months (Juli to Juni)
  const startYearNum = parseInt(selectedYear.split('/')[0], 10) || 2026;
  const monthSequence = [
    { name: 'Juli', year: startYearNum, monthIndex: 6 },
    { name: 'Agustus', year: startYearNum, monthIndex: 7 },
    { name: 'September', year: startYearNum, monthIndex: 8 },
    { name: 'Oktober', year: startYearNum, monthIndex: 9 },
    { name: 'November', year: startYearNum, monthIndex: 10 },
    { name: 'Desember', year: startYearNum, monthIndex: 11 },
    { name: 'Januari', year: startYearNum + 1, monthIndex: 0 },
    { name: 'Februari', year: startYearNum + 1, monthIndex: 1 },
    { name: 'Maret', year: startYearNum + 1, monthIndex: 2 },
    { name: 'April', year: startYearNum + 1, monthIndex: 3 },
    { name: 'Mei', year: startYearNum + 1, monthIndex: 4 },
    { name: 'Juni', year: startYearNum + 1, monthIndex: 5 },
  ];

  // Helper date checker
  const getEventsForDate = (year, monthIndex, day) => {
    const dayStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((ev) => {
      const s = ev.start_date?.split('T')[0];
      const e = ev.end_date?.split('T')[0];
      return s <= dayStr && e >= dayStr;
    });
  };

  // Render a Single Month Grid
  const renderMonthBlock = (mInfo, isCompact = true) => {
    const { name, year, monthIndex } = mInfo;
    const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0 is Sunday
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 0 is Monday
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Month events list for bottom summary
    const monthStartStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const monthEndStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const monthEvents = events.filter((ev) => {
      const s = ev.start_date?.split('T')[0];
      const e = ev.end_date?.split('T')[0];
      return s <= monthEndStr && e >= monthStartStr;
    });

    const dayCells = [];
    // Blank prefix cells
    for (let i = 0; i < adjustedFirstDay; i++) {
      dayCells.push(<div key={`blank-${i}`} className="h-7 w-7"></div>);
    }

    // Days 1 to N
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvts = getEventsForDate(year, monthIndex, d);
      const hasEvent = dayEvts.length > 0;
      const primaryColor = hasEvent ? (dayEvts[0].category_color_hex || '#10B981') : null;
      const isSunday = new Date(year, monthIndex, d).getDay() === 0;

      dayCells.push(
        <button
          key={`day-${d}`}
          type="button"
          onClick={() => handleOpenEventModal(dateStr, dayEvts[0] || null)}
          className={`h-7 w-7 rounded-lg text-xs font-bold flex items-center justify-center transition relative group ${
            hasEvent
              ? 'text-white shadow-2xs font-extrabold scale-105'
              : isSunday
              ? 'text-rose-500 hover:bg-rose-50'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          style={hasEvent ? { backgroundColor: primaryColor } : {}}
          title={hasEvent ? dayEvts.map((e) => e.title).join(', ') : dateStr}
        >
          <span>{d}</span>
          {dayEvts.length > 1 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-slate-900 border border-white"></span>
          )}
        </button>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition">
        {/* Month Header */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
            <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              {name} {year}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200">
              {monthEvents.length} Agenda
            </span>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1.5">
            <div>S</div>
            <div>S</div>
            <div>R</div>
            <div>K</div>
            <div>J</div>
            <div>S</div>
            <div className="text-rose-500">M</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 place-items-center mb-3">
            {dayCells}
          </div>
        </div>

        {/* Month Events Text Summary */}
        <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1.5 min-h-[48px]">
          {monthEvents.length === 0 ? (
            <p className="text-[10px] text-slate-300 italic text-center py-1">Tidak ada kegiatan</p>
          ) : (
            monthEvents.map((ev) => {
              const startDay = parseInt(ev.start_date?.split('-')[2], 10);
              const endDay = parseInt(ev.end_date?.split('-')[2], 10);
              const dayRange = startDay === endDay ? `${startDay}` : `${startDay}-${endDay}`;

              return (
                <div
                  key={ev.id}
                  onClick={() => handleOpenEventModal(null, ev)}
                  className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ev.category_color_hex || '#10B981' }}
                  ></span>
                  <span className="font-bold text-slate-800 text-[10px] shrink-0">
                    {dayRange} —
                  </span>
                  <span className="text-slate-600 truncate text-[11px] font-medium" title={ev.title}>
                    {ev.title}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <span>Kalender Pendidikan (Kaldik)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Matriks kalender berversi per tahun ajaran & pengesahan SK resmi, terintegrasi ke program kerja RKT Manajemen.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs transition"
          >
            <Palette className="w-3.5 h-3.5 text-slate-500" />
            <span>Master Kategori & Warna</span>
          </button>

          <button
            onClick={() => handleOpenEventModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Kegiatan</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Control Selector Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Konteks */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Konteks:</label>
            <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 font-bold text-xs">
              <button
                type="button"
                onClick={() => setContextType('satuan')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  contextType === 'satuan' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Satuan Pendidikan
              </button>
              <button
                type="button"
                onClick={() => setContextType('yayasan')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  contextType === 'yayasan' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Gabungan Yayasan
              </button>
            </div>
          </div>

          {/* Satuan Unit */}
          {contextType === 'satuan' && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Satuan Pendidikan:</label>
              <select
                value={selectedSatuanId}
                onChange={(e) => setSelectedSatuanId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
              >
                {schoolUnits?.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tahun Ajaran */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tahun Ajaran:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
            >
              {academicYears.map((yr) => (
                <option key={yr} value={yr}>TA {yr}</option>
              ))}
            </select>
          </div>

          {/* Versi Dokumen */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Versi Dokumen:</label>
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl font-extrabold text-emerald-800 focus:ring-1 focus:ring-emerald-500"
            >
              {documentVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  Versi {v.version_number} — {v.status === 'published' ? `Disahkan (${v.decree_number || 'SK'})` : 'Draft Revisi'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Version Actions & Status Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {activeVersion?.status === 'published' ? (
            <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 font-bold flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-teal-600" />
              <span>Disahkan: {activeVersion.decree_number || 'SK Resmi'}</span>
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Status: Draft</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setPublishForm({
                    decree_number: `SK/KALDIK/${selectedYear.replace('/', '-')}/00${activeVersion?.version_number || 1}`,
                    file_url: '',
                    notes: `Pengesahan Kalender Pendidikan TA ${selectedYear}`
                  });
                  setPublishModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-2xs transition flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Terbitkan Dokumen</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleCreateRevision}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold border border-slate-200 transition"
            title="Buat versi revisi baru dari dokumen ini"
          >
            + Buat Revisi Baru
          </button>
        </div>
      </div>

      {/* Category Legend Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4 flex-wrap text-xs">
        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Kategori:</span>
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: cat.color_hex }}></span>
            <span className="font-semibold text-slate-700 text-[11px]">{cat.name}</span>
          </div>
        ))}
      </div>

      {/* Calendar 12-Month Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {monthSequence.map((m) => renderMonthBlock(m))}
      </div>

      {/* MODAL: Tambah / Edit Kegiatan Kalender */}
      {eventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                <span>{editingEventId ? 'Edit Kegiatan Kalender' : 'Tambah Kegiatan Kalender'}</span>
              </h3>
              <button onClick={() => setEventModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Kegiatan / Agenda *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. Asesmen Sumatif Akhir Semester (ASAS)"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Kegiatan *</label>
                <select
                  required
                  value={eventForm.category_id}
                  onChange={(e) => setEventForm({ ...eventForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Selesai *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.end_date}
                    onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* RKT Program Linkage Dropdown */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Kaitkan ke Program Kerja RKT (Manajemen)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
                </label>
                <select
                  value={eventForm.rkt_activity_id}
                  onChange={(e) => {
                    const actId = e.target.value;
                    const matchedAct = rktPrograms.find((r) => String(r.id) === String(actId));
                    setEventForm({
                      ...eventForm,
                      rkt_activity_id: actId,
                      rkt_program_name_snapshot: matchedAct ? matchedAct.program_name : ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 font-semibold text-slate-800"
                >
                  <option value="">-- Tidak Dikaitkan ke RKT --</option>
                  {rktPrograms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Catatan Teknis</label>
                <textarea
                  rows={2}
                  placeholder="Catatan pelaksanaan, sasaran santri, atau panitia..."
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {editingEventId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEventModalOpen(false);
                      handleDeleteEvent(editingEventId);
                    }}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 font-bold rounded-xl flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Kegiatan</span>
                  </button>
                ) : <div></div>}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEventModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-900/20"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Kegiatan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Pengesahan & Penerbitan Dokumen Kaldik */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Pengesahan Dokumen Kaldik</span>
              </h3>
              <button onClick={() => setPublishModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishDocument} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Surat Keputusan (SK) *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. SK/KALDIK/2026-2027/001"
                  value={publishForm.decree_number}
                  onChange={(e) => setPublishForm({ ...publishForm, decree_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL / Berkas PDF Resmi (Opsional)</label>
                <input
                  type="text"
                  placeholder="https://.../kaldik-2026-2027.pdf"
                  value={publishForm.file_url}
                  onChange={(e) => setPublishForm({ ...publishForm, file_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Pengesahan</label>
                <textarea
                  rows={2}
                  value={publishForm.notes}
                  onChange={(e) => setPublishForm({ ...publishForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setPublishModalOpen(false)}
                  className="px-4 py-2 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-900/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sahkan & Terbitkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Master Kategori & Warna */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-600" />
                <span>Master Kategori & Warna Kalender</span>
              </h3>
              <button onClick={() => setCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1 text-xs">
                {categories.map((c) => (
                  <div key={c.id} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded-md shadow-2xs" style={{ backgroundColor: c.color_hex }}></span>
                      <span className="font-bold text-slate-800">{c.name}</span>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">{c.color_hex}</span>
                  </div>
                ))}
              </div>

              {/* Add New Category */}
              <form onSubmit={handleCreateCategory} className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Nama kategori baru..."
                  value={newCategoryForm.name}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl"
                />
                <input
                  type="color"
                  value={newCategoryForm.color_hex}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, color_hex: e.target.value })}
                  className="w-10 h-9 rounded-xl border border-slate-300 p-0.5 cursor-pointer"
                  title="Pilih Warna"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shrink-0"
                >
                  + Tambah
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
