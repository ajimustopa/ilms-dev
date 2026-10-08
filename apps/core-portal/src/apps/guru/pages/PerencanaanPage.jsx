import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
  FileCheck2,
  Sparkles,
  HelpCircle,
  Tag,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
  Info,
  Check,
  ChevronDown,
  Download,
  Copy,
  FolderOpen,
  GraduationCap,
  Clock,
  Verified,
  FileClock,
  X
} from 'lucide-react';
import { useTeacherContext } from '../context/TeacherContext';
import { scoreService } from '../services/scoreService';
import {
  PageHeader,
  SelectorKonteks,
  Card,
  Button,
  StatusBadge,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  BottomSheet,
  ConfirmDialog,
  StatRibbonCard,
  useToast
} from '../components';

export default function PerencanaanPage() {
  const toast = useToast();
  const { activeContext, teachingAssignments, loadingContext } = useTeacherContext();

  // State Konteks Filter
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');

  // State Data TP
  const [learningObjectives, setLearningObjectives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUsage, setFilterUsage] = useState('ALL'); // 'ALL' | 'USED' | 'DRAFT'

  // Form Drawer / Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTp, setEditingTp] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    scope_material: '',
    description: '',
    order_index: 1,
    is_active: true
  });
  const [formErrors, setFormErrors] = useState({});

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ekstrak daftar mapel yang diampu guru dari teachingAssignments
  const mySubjects = useMemo(() => {
    const map = new Map();
    teachingAssignments.forEach((a) => {
      if (a.subject_id && a.subject_name) {
        if (!map.has(String(a.subject_id))) {
          map.set(String(a.subject_id), {
            id: a.subject_id,
            name: a.subject_name,
            code: a.subject_code,
            grade_levels: []
          });
        }
        const item = map.get(String(a.subject_id));
        if (
          a.class_group_grade_level_id &&
          !item.grade_levels.some((g) => String(g.id) === String(a.class_group_grade_level_id))
        ) {
          item.grade_levels.push({
            id: a.class_group_grade_level_id,
            name: a.class_group_name
              ? `Kelas ${a.class_group_name.split(' ')[0] || ''}`
              : `Tingkat #${a.class_group_grade_level_id}`
          });
        }
      }
    });
    return Array.from(map.values());
  }, [teachingAssignments]);

  const myGradeLevels = useMemo(() => {
    const map = new Map();
    teachingAssignments.forEach((a) => {
      if (a.class_group_grade_level_id) {
        const idStr = String(a.class_group_grade_level_id);
        if (!map.has(idStr)) {
          map.set(idStr, {
            id: a.class_group_grade_level_id,
            name: a.class_group_name
              ? `Kelas ${a.class_group_name.split(' ')[0] || ''}`
              : `Tingkat #${a.class_group_grade_level_id}`
          });
        }
      }
    });
    return Array.from(map.values());
  }, [teachingAssignments]);

  // Auto-select mapel pertama jika belum terpilih
  useEffect(() => {
    if (mySubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(String(mySubjects[0].id));
    }
  }, [mySubjects, selectedSubjectId]);

  useEffect(() => {
    if (myGradeLevels.length > 0 && !selectedGradeLevelId) {
      setSelectedGradeLevelId(String(myGradeLevels[0].id));
    }
  }, [myGradeLevels, selectedGradeLevelId]);

  // Load Daftar Tujuan Pembelajaran
  const fetchObjectives = useCallback(async () => {
    if (!activeContext?.satuanPendidikanId || !activeContext?.academicYearId) {
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const params = {
        satuan_pendidikan_id: activeContext.satuanPendidikanId,
        academic_year_id: activeContext.academicYearId
      };
      if (selectedSubjectId) params.subject_id = selectedSubjectId;
      if (selectedGradeLevelId) params.grade_level_id = selectedGradeLevelId;
      if (selectedSemesterId) params.semester_id = selectedSemesterId;

      const res = await scoreService.getLearningObjectives(params);
      const data = res?.data || res || [];
      const list = Array.isArray(data) ? data : (data.items || []);
      setLearningObjectives(list);
    } catch (err) {
      console.error('Error fetching learning objectives:', err);
      setFetchError(err.response?.data?.message || err.message || 'Gagal memuat daftar Tujuan Pembelajaran');
    } finally {
      setIsLoading(false);
    }
  }, [
    activeContext?.satuanPendidikanId,
    activeContext?.academicYearId,
    selectedSubjectId,
    selectedGradeLevelId,
    selectedSemesterId
  ]);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  // Hitung Metrik Statistik Beban TP
  const stats = useMemo(() => {
    const total = learningObjectives.length;
    // Anggap TP yang memiliki scores_count > 0 atau journals_count > 0 adalah terpakai di rapor
    let used = 0;
    learningObjectives.forEach((tp) => {
      const isUsed =
        Boolean(tp.is_used_in_report) ||
        Number(tp.scores_count || 0) > 0 ||
        Number(tp.journals_count || 0) > 0;
      if (isUsed) used += 1;
    });

    const draft = Math.max(0, total - used);
    const percentUsed = total > 0 ? Math.round((used / total) * 100) : 0;
    const percentDraft = total > 0 ? Math.round((draft / total) * 100) : 0;

    return {
      total,
      used,
      draft,
      percentUsed,
      percentDraft
    };
  }, [learningObjectives]);

  // Filtered List TP berdasarkan Tab & Query Search
  const filteredObjectives = useMemo(() => {
    return learningObjectives.filter((tp) => {
      const isUsed =
        Boolean(tp.is_used_in_report) ||
        Number(tp.scores_count || 0) > 0 ||
        Number(tp.journals_count || 0) > 0;

      if (filterUsage === 'USED' && !isUsed) return false;
      if (filterUsage === 'DRAFT' && isUsed) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (tp.code || '').toLowerCase().includes(q);
        const matchDesc = (tp.description || '').toLowerCase().includes(q);
        const matchScope = (tp.scope_material || '').toLowerCase().includes(q);
        if (!matchCode && !matchDesc && !matchScope) return false;
      }
      return true;
    });
  }, [learningObjectives, filterUsage, searchQuery]);

  // Buka Form Tambah Baru
  const handleOpenCreate = () => {
    setEditingTp(null);
    setFormData({
      code: `TP-${learningObjectives.length + 1}`,
      scope_material: '',
      description: '',
      order_index: learningObjectives.length + 1,
      is_active: true
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Buka Form Edit
  const handleOpenEdit = (tp) => {
    setEditingTp(tp);
    setFormData({
      code: tp.code || '',
      scope_material: tp.scope_material || '',
      description: tp.description || '',
      order_index: tp.order_index || 1,
      is_active: tp.is_active !== false
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Validasi Form Client-side
  const validateForm = () => {
    const errors = {};
    if (!formData.code.trim()) {
      errors.code = 'Kode Tujuan Pembelajaran wajib diisi';
    } else {
      // Cek duplikasi kode di client
      const duplicate = learningObjectives.find(
        (tp) =>
          tp.code.trim().toLowerCase() === formData.code.trim().toLowerCase() &&
          (!editingTp || String(tp.id) !== String(editingTp.id))
      );
      if (duplicate) {
        errors.code = `Kode TP "${formData.code.trim()}" sudah digunakan pada mata pelajaran ini`;
      }
    }

    if (!formData.description.trim()) {
      errors.description = 'Deskripsi Capaian Kompetensi wajib diisi';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Deskripsi TP minimal 10 karakter';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Form (Tambah / Edit)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!selectedSubjectId || !selectedGradeLevelId) {
      toast.show({
        type: 'danger',
        title: 'Konteks Belum Lengkap',
        message: 'Pastikan Mata Pelajaran dan Tingkat Kelas telah dipilih.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        satuan_pendidikan_id: Number(activeContext?.satuanPendidikanId),
        academic_year_id: Number(activeContext?.academicYearId),
        subject_id: Number(selectedSubjectId),
        grade_level_id: Number(selectedGradeLevelId),
        semester_id: selectedSemesterId ? Number(selectedSemesterId) : null,
        code: formData.code.trim(),
        scope_material: formData.scope_material.trim() || null,
        description: formData.description.trim(),
        order_index: parseInt(formData.order_index, 10) || 1,
        is_active: formData.is_active
      };

      if (editingTp) {
        await scoreService.updateLearningObjective(editingTp.id, payload);
        toast.show({
          type: 'success',
          title: 'Tujuan Pembelajaran Diperbarui',
          message: `TP "${payload.code}" berhasil diperbarui.`
        });
      } else {
        await scoreService.createLearningObjective(payload);
        toast.show({
          type: 'success',
          title: 'Tujuan Pembelajaran Ditambahkan',
          message: `TP "${payload.code}" berhasil dibuat.`
        });
      }

      setIsFormOpen(false);
      fetchObjectives();
    } catch (err) {
      console.error('Error saving learning objective:', err);
      toast.show({
        type: 'danger',
        title: 'Gagal Menyimpan TP',
        message: err.response?.data?.message || err.message || 'Terjadi kesalahan pada server.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eksekusi Hapus TP
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await scoreService.deleteLearningObjective(deleteTarget.id);
      toast.show({
        type: 'success',
        title: 'Tujuan Pembelajaran Dihapus',
        message: `TP "${deleteTarget.code}" berhasil dihapus.`
      });
      setDeleteTarget(null);
      fetchObjectives();
    } catch (err) {
      console.error('Error deleting learning objective:', err);
      toast.show({
        type: 'danger',
        title: 'Gagal Menghapus TP',
        message:
          err.response?.data?.message ||
          err.message ||
          'TP tidak dapat dihapus karena sudah terhubung ke data nilai atau jurnal.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Ekspor Data ke CSV
  const handleExportCSV = () => {
    if (learningObjectives.length === 0) return;
    const headers = ['Kode', 'Lingkup Materi', 'Deskripsi Capaian Kompetensi', 'Status'];
    const rows = learningObjectives.map((tp) => [
      `"${tp.code || ''}"`,
      `"${tp.scope_material || ''}"`,
      `"${(tp.description || '').replace(/"/g, '""')}"`,
      `"${tp.is_used_in_report ? 'Di Rapor' : 'Draf'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tujuan_Pembelajaran_${selectedSubjectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <PageHeader
        title="Tujuan Pembelajaran (TP)"
        subtitle="Target capaian kompetensi per lingkup materi Kurikulum Merdeka e-Rapor santri."
        badge={
          <StatusBadge status="info" size="sm">
            {learningObjectives.length} Target TP
          </StatusBadge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              leftIcon={<Plus className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-sm min-h-[38px]"
            >
              Tambah TP Baru
            </Button>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 2. STAT RIBBON CARDS (3 Metrik Beban TP)                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatRibbonCard
          label="Total TP Terdata"
          value={`${stats.total} TP`}
          status="success"
          icon={Layers}
          context="Target aktif semester ini"
          badge="100% Terstruktur"
        >
          <div className="mt-2.5 space-y-1">
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full w-full" />
            </div>
          </div>
        </StatRibbonCard>

        <StatRibbonCard
          label="Di Rapor (Terpakai)"
          value={`${stats.used} TP`}
          status="info"
          icon={Verified}
          context={`${stats.percentUsed}% terpakai pada asesmen`}
          badge="Aktif di Rapor"
        />

        <StatRibbonCard
          label="Draf / Belum Diuji"
          value={`${stats.draft} TP`}
          status="warning"
          icon={FileClock}
          context="Menunggu asesmen sumatif"
          badge={`${stats.percentDraft}% Draf`}
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTEXT FILTER BAR & TOOLBAR                                           */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
        {/* Row 1: Dropdown Konteks Ajar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mapel Guru */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 font-medium">Mapel:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="bg-transparent font-bold text-emerald-800 dark:text-emerald-400 focus:outline-none cursor-pointer"
            >
              {mySubjects.map((s) => (
                <option key={s.id} value={s.id} className="text-slate-900 dark:text-slate-100">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tingkat Kelas / Fase */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 font-medium">Tingkat:</span>
            <select
              value={selectedGradeLevelId}
              onChange={(e) => setSelectedGradeLevelId(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {myGradeLevels.map((g) => (
                <option key={g.id} value={g.id} className="text-slate-900 dark:text-slate-100">
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 font-medium">Semester:</span>
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="" className="text-slate-900 dark:text-slate-100">
                Semua Semester
              </option>
              <option value="1" className="text-slate-900 dark:text-slate-100">
                Semester Ganjil
              </option>
              <option value="2" className="text-slate-900 dark:text-slate-100">
                Semester Genap
              </option>
            </select>
          </div>

          {/* Ekspor CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>

        {/* Row 2: Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari kode TP atau deskripsi materi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Segmented Filter Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setFilterUsage('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                filterUsage === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Semua ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterUsage('USED')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                filterUsage === 'USED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700'
              }`}
            >
              Di Rapor ({stats.used})
            </button>
            <button
              type="button"
              onClick={() => setFilterUsage('DRAFT')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                filterUsage === 'DRAFT'
                  ? 'bg-slate-900 text-white dark:bg-slate-700 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Draf ({stats.draft})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CONTENT LIST: DESKTOP TABLE & MOBILE CARDS                             */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard count={3} />
        </div>
      ) : fetchError ? (
        <ErrorState
          title="Gagal Memuat Tujuan Pembelajaran"
          message={fetchError}
          onRetry={fetchObjectives}
        />
      ) : learningObjectives.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-slate-400" />}
          title="Belum Ada Tujuan Pembelajaran"
          description="Mata pelajaran ini belum memiliki master TP untuk semester aktif. Tambahkan TP baru untuk memulai perumusan capaian kurikulum."
          actionLabel="Tambah TP Sekarang"
          onAction={handleOpenCreate}
        />
      ) : filteredObjectives.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8 text-slate-400" />}
          title="Tidak Ditemukan TP yang Cocok"
          description="Tidak ditemukan Tujuan Pembelajaran yang sesuai dengan kriteria filter atau pencarian Anda."
          actionLabel="Reset Filter"
          onAction={() => {
            setFilterUsage('ALL');
            setSearchQuery('');
          }}
        />
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-28">Kode TP</th>
                  <th className="py-3 px-4">Deskripsi Capaian Kompetensi</th>
                  <th className="py-3 px-4 w-44">Lingkup Materi</th>
                  <th className="py-3 px-4 w-32 text-center">Status Rapor</th>
                  <th className="py-3 px-4 w-24 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                {filteredObjectives.map((tp) => {
                  const isUsed =
                    Boolean(tp.is_used_in_report) ||
                    Number(tp.scores_count || 0) > 0 ||
                    Number(tp.journals_count || 0) > 0;

                  return (
                    <tr
                      key={tp.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Kode TP */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                          {tp.code}
                        </span>
                      </td>

                      {/* Deskripsi */}
                      <td className="py-3.5 px-4 align-top">
                        <p className="text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                          {tp.description}
                        </p>
                        {isUsed && (
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1 block">
                            • Terhubung ke asesmen penilaian
                          </span>
                        )}
                      </td>

                      {/* Lingkup Materi */}
                      <td className="py-3.5 px-4 align-top">
                        {tp.scope_material ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] border border-slate-200 dark:border-slate-700">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {tp.scope_material}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top text-center">
                        {isUsed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Di Rapor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Draf
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tp)}
                            title="Ubah TP"
                            className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(tp)}
                            title="Hapus TP"
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD-STACK VIEW */}
          <div className="md:hidden space-y-3">
            {filteredObjectives.map((tp) => {
              const isUsed =
                Boolean(tp.is_used_in_report) ||
                Number(tp.scores_count || 0) > 0 ||
                Number(tp.journals_count || 0) > 0;

              return (
                <div
                  key={tp.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
                      {tp.code}
                    </span>

                    {isUsed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Di Rapor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Draf
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                    {tp.description}
                  </p>

                  {tp.scope_material && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span>{tp.scope_material}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(tp)}
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      className="min-h-[40px] text-xs"
                    >
                      Ubah TP
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteTarget(tp)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      className="min-h-[40px] text-xs"
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 5. SLIDE-OVER DRAWER / MODAL FORM (TAMBAH & UBAH TP)                      */}
      {/* ========================================================================= */}
      <BottomSheet
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingTp ? 'Ubah Tujuan Pembelajaran' : 'Tambah Tujuan Pembelajaran Baru'}
        description={`Mata Pelajaran: ${mySubjects.find((s) => String(s.id) === String(selectedSubjectId))?.name || 'Mapel'}`}
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSubmitForm}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold"
            >
              {isSubmitting ? 'Menyimpan...' : editingTp ? 'Simpan Perubahan' : 'Buat TP'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 py-1 text-xs">
          {/* Kode TP & Urutan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                Kode TP <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: TP-7.1.1"
                value={formData.code}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }));
                  if (formErrors.code) setFormErrors((prev) => ({ ...prev, code: null }));
                }}
                className={`w-full h-10 px-3 text-xs font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border ${
                  formErrors.code
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-200 dark:border-slate-700'
                } text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500`}
              />
              {formErrors.code && (
                <p className="text-[11px] text-rose-500 font-semibold">{formErrors.code}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                Lingkup Materi
              </label>
              <input
                type="text"
                placeholder="Contoh: Bilangan Bulat"
                value={formData.scope_material}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, scope_material: e.target.value }))
                }
                className="w-full h-10 px-3 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Deskripsi Capaian Kompetensi */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Deskripsi Capaian Kompetensi <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows="3"
              placeholder="Contoh: Memahami konsep bilangan bulat dan sifat operasinya dalam kehidupan sehari-hari..."
              value={formData.description}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, description: e.target.value }));
                if (formErrors.description) setFormErrors((prev) => ({ ...prev, description: null }));
              }}
              className={`w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border ${
                formErrors.description
                  ? 'border-rose-500 ring-1 ring-rose-500'
                  : 'border-slate-200 dark:border-slate-700'
              } text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed`}
            />
            {formErrors.description && (
              <p className="text-[11px] text-rose-500 font-semibold">{formErrors.description}</p>
            )}
          </div>

          {/* Status Aktif Switch */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Status TP Aktif
              </span>
              <span className="text-[11px] text-slate-500">
                TP aktif dapat dipilih di Jurnal dan Asesmen Rapor
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>
        </form>
      </BottomSheet>

      {/* ========================================================================= */}
      {/* 6. CONFIRM DELETE DIALOG                                                  */}
      {/* ========================================================================= */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Hapus Tujuan Pembelajaran?"
        message={`Apakah Anda yakin ingin menghapus TP "${deleteTarget?.code}" (${deleteTarget?.scope_material || 'Materi'})? Aksi ini tidak dapat dibatalkan jika TP belum terhubung ke nilai.`}
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus TP'}
        cancelText="Batal"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
