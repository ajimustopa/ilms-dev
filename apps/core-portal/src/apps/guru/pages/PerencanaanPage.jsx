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
  Info
} from 'lucide-react';
import { useTeacherContext } from '../context/TeacherContext';
import { scoreService } from '../services/scoreService';
import PageHeader from '../components/PageHeader';
import SelectorKonteks from '../components/SelectorKonteks';
import Card from '../components/Card';
import Button from '../components/Button';
import FormField, { Input, Select, Textarea } from '../components/FormField';
import BottomSheet from '../components/BottomSheet';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Skeleton from '../components/Skeleton';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

export default function PerencanaanPage() {
  const {
    activeContext,
    teachingAssignments,
    loadingContext
  } = useTeacherContext();

  // State Pilihan Mapel & Jenjang dari "Kelas dan Mapel Saya"
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');

  // State Data TP
  const [learningObjectives, setLearningObjectives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUsage, setFilterUsage] = useState('all'); // 'all' | 'used' | 'unused'

  // Form Modal / Sheet State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTp, setEditingTp] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    scope_material: '',
    description: '',
    order_index: 1,
    is_active: true,
    semester_id: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  // Ekstrak daftar mapel dan tingkat kelas yang diampu guru dari teachingAssignments
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
        if (a.class_group_grade_level_id && !item.grade_levels.some(g => String(g.id) === String(a.class_group_grade_level_id))) {
          item.grade_levels.push({
            id: a.class_group_grade_level_id,
            name: a.class_group_name ? `Tingkat ${a.class_group_name.split(' ')[0] || ''}` : `Jenjang #${a.class_group_grade_level_id}`
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
            name: a.class_group_name ? a.class_group_name.split(' ')[0] || `Kelas #${a.class_group_grade_level_id}` : `Tingkat #${a.class_group_grade_level_id}`
          });
        }
      }
    });
    return Array.from(map.values());
  }, [teachingAssignments]);

  // Auto-select mapel & grade level pertama jika belum terpilih
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

  // Load Tujuan Pembelajaran
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
  }, [activeContext?.satuanPendidikanId, activeContext?.academicYearId, selectedSubjectId, selectedGradeLevelId]);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  // Buka Sheet Tambah / Edit
  const handleOpenForm = (item = null) => {
    setFormErrors({});
    if (item) {
      setEditingTp(item);
      setFormData({
        code: item.code || '',
        scope_material: item.scope_material || '',
        description: item.description || '',
        order_index: item.order_index || 1,
        is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
        semester_id: item.semester_id ? String(item.semester_id) : ''
      });
    } else {
      setEditingTp(null);
      const nextIndex = learningObjectives.length + 1;
      setFormData({
        code: `TP.${nextIndex}`,
        scope_material: '',
        description: '',
        order_index: nextIndex,
        is_active: true,
        semester_id: ''
      });
    }
    setIsFormOpen(true);
  };

  // Validasi Form
  const validateForm = () => {
    const errors = {};
    if (!formData.code.trim()) errors.code = 'Kode TP wajib diisi (misal: TP.1)';
    if (!formData.description.trim()) errors.description = 'Deskripsi tujuan pembelajaran wajib diisi';
    if (!selectedSubjectId) errors.subject = 'Pilih mata pelajaran terlebih dahulu';
    if (!selectedGradeLevelId) errors.grade_level = 'Pilih tingkat kelas terlebih dahulu';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Simpan (Tambah / Ubah)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        satuan_pendidikan_id: activeContext.satuanPendidikanId,
        academic_year_id: activeContext.academicYearId,
        subject_id: Number(selectedSubjectId),
        grade_level_id: Number(selectedGradeLevelId),
        semester_id: formData.semester_id ? Number(formData.semester_id) : null,
        code: formData.code.trim(),
        scope_material: formData.scope_material.trim() || null,
        description: formData.description.trim(),
        order_index: parseInt(formData.order_index, 10) || 1,
        is_active: formData.is_active
      };

      if (editingTp) {
        await scoreService.updateLearningObjective(editingTp.id, payload);
        setToast({
          type: 'success',
          title: 'Berhasil Diperbarui',
          message: `Tujuan Pembelajaran "${formData.code}" berhasil diperbarui.`
        });
      } else {
        await scoreService.createLearningObjective(payload);
        setToast({
          type: 'success',
          title: 'Berhasil Ditambahkan',
          message: `Tujuan Pembelajaran "${formData.code}" berhasil disimpan ke sistem.`
        });
      }

      setIsFormOpen(false);
      fetchObjectives();
    } catch (err) {
      console.error('Error saving learning objective:', err);
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan Tujuan Pembelajaran.';
      setToast({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: msg
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
      setToast({
        type: 'success',
        title: 'TP Dihapus',
        message: `Tujuan Pembelajaran "${deleteTarget.code}" berhasil dihapus.`
      });
      setDeleteTarget(null);
      fetchObjectives();
    } catch (err) {
      console.error('Error deleting learning objective:', err);
      const msg = err.response?.data?.message || err.message || 'Gagal menghapus Tujuan Pembelajaran.';
      setToast({
        type: 'error',
        title: 'Hapus Gagal',
        message: msg
      });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter & Pencarian
  const filteredTPs = useMemo(() => {
    return learningObjectives.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.code || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.scope_material || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filterUsage === 'used') {
        return item.is_used || (item.journal_count > 0 || item.score_count > 0);
      }
      if (filterUsage === 'unused') {
        return !item.is_used && (item.journal_count || 0) === 0 && (item.score_count || 0) === 0;
      }

      return true;
    });
  }, [learningObjectives, searchQuery, filterUsage]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = learningObjectives.length;
    const active = learningObjectives.filter(t => t.is_active).length;
    const used = learningObjectives.filter(t => t.is_used || t.journal_count > 0 || t.score_count > 0).length;
    return { total, active, used };
  }, [learningObjectives]);

  const activeSubjectName = mySubjects.find(s => String(s.id) === String(selectedSubjectId))?.name || 'Mata Pelajaran';

  return (
    <div className="flex flex-col gap-5 pb-16 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Perencanaan Pembelajaran"
        subtitle="Kelola Tujuan Pembelajaran (TP) dan Lingkup Materi Kurikulum Merdeka."
        action={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => handleOpenForm()}
            className="shrink-0"
          >
            Tambah TP
          </Button>
        }
      />

      {/* Context Selector Bar */}
      <div className="bg-slate-900/60 dark:bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SelectorKonteks />
        </div>

        {/* Filter Mapel & Jenjang dari Kelas & Mapel Saya */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="min-w-[140px] max-w-[200px]">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              aria-label="Pilih Mata Pelajaran"
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium truncate"
            >
              {mySubjects.length > 0 ? (
                mySubjects.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))
              ) : (
                <option value="">Semua Mapel</option>
              )}
            </select>
          </div>

          <div className="min-w-[110px] max-w-[150px]">
            <select
              value={selectedGradeLevelId}
              onChange={(e) => setSelectedGradeLevelId(e.target.value)}
              aria-label="Pilih Jenjang / Tingkat Kelas"
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium truncate"
            >
              {myGradeLevels.length > 0 ? (
                myGradeLevels.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    Tingkat {g.name}
                  </option>
                ))
              ) : (
                <option value="">Semua Tingkat</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5 bg-slate-900/60 dark:bg-slate-900 border-slate-800 flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-slate-400">Total TP</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-100">{stats.total}</span>
            <span className="text-[11px] text-slate-500">butir</span>
          </div>
        </Card>
        <Card className="p-3.5 bg-slate-900/60 dark:bg-slate-900 border-slate-800 flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-emerald-400">Status Aktif</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-400">{stats.active}</span>
            <span className="text-[11px] text-slate-500">TP</span>
          </div>
        </Card>
        <Card className="p-3.5 bg-slate-900/60 dark:bg-slate-900 border-slate-800 flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-sky-400">Telah Dipakai</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-sky-400">{stats.used}</span>
            <span className="text-[11px] text-slate-500">KBM/Nilai</span>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode TP, materi, atau deskripsi..."
            className="w-full pl-9 pr-4 py-2 min-h-[44px] text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Usage Pill */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 border border-slate-800 rounded-xl overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setFilterUsage('all')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition ${
              filterUsage === 'all'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({learningObjectives.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterUsage('used')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition ${
              filterUsage === 'used'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Terpakai ({stats.used})
          </button>
          <button
            type="button"
            onClick={() => setFilterUsage('unused')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition ${
              filterUsage === 'unused'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Belum Terpakai ({stats.total - stats.used})
          </button>
        </div>
      </div>

      {/* Content Section: Loading, Error, Empty, List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : fetchError ? (
        <ErrorState
          title="Gagal Memuat Tujuan Pembelajaran"
          message={fetchError}
          onRetry={fetchObjectives}
        />
      ) : filteredTPs.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'Tidak Ada TP yang Cocok' : 'Belum Ada Tujuan Pembelajaran'}
          description={
            searchQuery
              ? `Tidak ditemukan TP dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
              : `Belum ada Tujuan Pembelajaran yang dirumuskan untuk mapel ${activeSubjectName} di tingkat ini.`
          }
          icon={BookOpen}
          action={
            !searchQuery && (
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={() => handleOpenForm()}
              >
                Buat TP Pertama
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTPs.map((tp) => {
            const isUsedInJournal = (tp.journal_count || 0) > 0;
            const isUsedInScore = (tp.score_count || 0) > 0;
            const isUsed = tp.is_used || isUsedInJournal || isUsedInScore;

            return (
              <Card
                key={tp.id}
                className={`p-4 sm:p-5 flex flex-col justify-between border-slate-800 transition-all hover:border-slate-700 bg-slate-900/70 ${
                  !tp.is_active ? 'opacity-70 bg-slate-900/40' : ''
                }`}
              >
                <div>
                  {/* Top Bar: Code, Scope, Status */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-black font-mono tracking-wide">
                        {tp.code}
                      </span>
                      {tp.scope_material && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700/60">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {tp.scope_material}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {tp.is_active ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Nonaktif
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal mt-2">
                    {tp.description}
                  </p>
                </div>

                {/* Bottom Meta & Action Buttons */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Usage Indicators */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    {isUsedInJournal && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-800/50"
                        title="Tujuan Pembelajaran ini telah digunakan dalam jurnal KBM harian"
                      >
                        <CheckCircle2 className="w-3 h-3 text-teal-400" />
                        {tp.journal_count} Jurnal
                      </span>
                    )}

                    {isUsedInScore && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/50"
                        title="Tujuan Pembelajaran ini telah tercatat dalam penilaian e-Rapor siswa"
                      >
                        <FileCheck2 className="w-3 h-3 text-sky-400" />
                        {tp.score_count} Nilai
                      </span>
                    )}

                    {!isUsed && (
                      <span className="text-slate-500 italic text-[11px]">
                        Belum dipakai di jurnal / nilai
                      </span>
                    )}
                  </div>

                  {/* Action Buttons (Touch Target 44px) */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenForm(tp)}
                      aria-label={`Ubah TP ${tp.code}`}
                      className="p-2 min-w-[40px] min-h-[40px] rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 active:bg-slate-700 transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(tp)}
                      aria-label={`Hapus TP ${tp.code}`}
                      className="p-2 min-w-[40px] min-h-[40px] rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 active:bg-rose-900/40 transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet Form Tambah / Edit TP */}
      <BottomSheet
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        title={editingTp ? 'Ubah Tujuan Pembelajaran' : 'Tambah Tujuan Pembelajaran'}
        description={`Konfigurasi kompetensi TP untuk ${activeSubjectName} di ${activeContext?.satuanPendidikanName || 'Unit Sekolah'}.`}
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              disabled={isSubmitting}
              onClick={() => setIsFormOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={isSubmitting}
              onClick={handleSubmitForm}
              className="flex-1"
            >
              {editingTp ? 'Simpan Perubahan' : 'Simpan TP'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 py-1">
          {/* Grid Kode TP & No Urut */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Kode TP"
              required
              error={formErrors.code}
              help="Contoh: TP.1 atau TP.8.1"
            >
              <Input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="TP.1"
                className="font-mono font-bold"
              />
            </FormField>

            <FormField
              label="No. Urutan"
              required
              help="Urutan tampil di e-Rapor"
            >
              <Input
                type="number"
                min="1"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
                placeholder="1"
              />
            </FormField>
          </div>

          {/* Lingkup Materi */}
          <FormField
            label="Lingkup Materi (Opsional)"
            help="Topik bahasan, misal: Aljabar / Bilangan Bulat / Teks Prosedur"
          >
            <Input
              type="text"
              value={formData.scope_material}
              onChange={(e) => setFormData({ ...formData, scope_material: e.target.value })}
              placeholder="Contoh: Aljabar & SPLDV"
            />
          </FormField>

          {/* Deskripsi TP */}
          <FormField
            label="Rumusan Tujuan Pembelajaran"
            required
            error={formErrors.description}
            help="Tuliskan rumusan kompetensi dan lingkup materi yang diharapkan dicapai peserta didik."
          >
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Peserta didik mampu memahami konsep..."
            />
          </FormField>

          {/* Status Aktif Switch */}
          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-200 block">Status TP Aktif</span>
                <span className="text-[11px] text-slate-400 block">
                  TP aktif akan muncul di pilihan jurnal harian dan modul penilaian.
                </span>
              </div>
            </label>
          </div>
        </form>
      </BottomSheet>

      {/* Confirm Dialog Hapus TP */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title={`Hapus TP ${deleteTarget.code}?`}
          message={
            (deleteTarget.journal_count > 0 || deleteTarget.score_count > 0 || deleteTarget.is_used)
              ? `PERINGATAN: Tujuan Pembelajaran "${deleteTarget.code}" telah digunakan pada ${deleteTarget.journal_count || 0} jurnal mengajar dan ${deleteTarget.score_count || 0} penilaian siswa. Backend akan menolak penghapusan untuk menjaga integritas e-Rapor. Anda disarankan menonaktifkannya saja.`
              : `Apakah Anda yakin ingin menghapus Tujuan Pembelajaran "${deleteTarget.code}"? Tindakan ini tidak dapat dibatalkan.`
          }
          variant={(deleteTarget.journal_count > 0 || deleteTarget.score_count > 0) ? 'warning' : 'danger'}
          confirmLabel={
            (deleteTarget.journal_count > 0 || deleteTarget.score_count > 0)
              ? 'Tetap Coba Hapus'
              : 'Ya, Hapus TP'
          }
          cancelLabel="Batal"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={isDeleting}
        />
      )}
    </div>
  );
}
