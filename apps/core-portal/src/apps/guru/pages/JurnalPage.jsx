import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Tag,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useTeacherContext } from '../context/TeacherContext';
import { journalService } from '../services/journalService';
import { scoreService } from '../services/scoreService';
import PageHeader from '../components/PageHeader';
import SelectorKonteks from '../components/SelectorKonteks';
import Card from '../components/Card';
import Button from '../components/Button';
import FormField, { Input, Textarea } from '../components/FormField';
import BottomSheet from '../components/BottomSheet';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Skeleton from '../components/Skeleton';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

export default function JurnalPage() {
  const navigate = useNavigate();
  const { activeContext, teachingAssignments } = useTeacherContext();

  // Filter State
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickDateFilter, setQuickDateFilter] = useState('all'); // 'all' | 'today' | 'this_month'

  // Data State
  const [journals, setJournals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Edit BottomSheet State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    meeting_number: 1,
    learning_objective_id: '',
    topic_material: '',
    general_notes: ''
  });
  const [availableTPs, setAvailableTPs] = useState([]);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  // Daftar Mapel Guru dari Penugasan
  const mySubjects = useMemo(() => {
    const map = new Map();
    teachingAssignments.forEach((a) => {
      if (a.subject_id && a.subject_name) {
        if (!map.has(String(a.subject_id))) {
          map.set(String(a.subject_id), {
            id: a.subject_id,
            name: a.subject_name,
            code: a.subject_code
          });
        }
      }
    });
    return Array.from(map.values());
  }, [teachingAssignments]);

  // Load Daftar Jurnal Mengajar
  const fetchJournals = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const selectedUnitIds = activeContext?.satuanPendidikanIds || (activeContext?.satuanPendidikanId ? [activeContext.satuanPendidikanId] : []);
      const isMultiOrAll = activeContext?.isAllUnits || selectedUnitIds.length !== 1;
      const unitParam = isMultiOrAll ? undefined : activeContext?.satuanPendidikanId;

      const params = {
        satuan_pendidikan_id: unitParam,
        academic_year_id: activeContext?.academicYearId
      };

      if (selectedSubjectId) params.subject_id = selectedSubjectId;

      if (quickDateFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        params.date = todayStr;
      } else if (quickDateFilter === 'this_month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        params.start_date = firstDay;
        params.end_date = lastDay;
      } else if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }

      const res = await journalService.getMyJournals(params);
      const data = res?.data || res || [];
      const list = Array.isArray(data) ? data : (data.items || []);
      setJournals(list);
    } catch (err) {
      console.error('Error fetching teaching journals:', err);
      setFetchError(err.response?.data?.message || err.message || 'Gagal memuat riwayat jurnal mengajar.');
    } finally {
      setIsLoading(false);
    }
  }, [activeContext?.satuanPendidikanId, activeContext?.satuanPendidikanIds, activeContext?.academicYearId, activeContext?.isAllUnits, selectedSubjectId, quickDateFilter, startDate, endDate]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  // Handle Buka Modal Edit Jurnal
  const handleOpenEdit = async (journal) => {
    setEditingJournal(journal);
    setEditFormData({
      meeting_number: journal.meeting_number || 1,
      learning_objective_id: journal.learning_objective_id ? String(journal.learning_objective_id) : '',
      topic_material: journal.topic_material || '',
      general_notes: journal.general_notes || ''
    });

    // Ambil TP yang sesuai jika mapel tersedia
    if (journal.subject_id) {
      try {
        const res = await scoreService.getLearningObjectives({
          satuan_pendidikan_id: journal.satuan_pendidikan_id || activeContext?.satuanPendidikanId,
          academic_year_id: journal.academic_year_id || activeContext?.academicYearId,
          subject_id: journal.subject_id
        });
        const data = res?.data || res || [];
        setAvailableTPs(Array.isArray(data) ? data.filter(t => t.is_active) : []);
      } catch (e) {
        console.error('Error fetching TPs for journal edit:', e);
      }
    }

    setIsEditOpen(true);
  };

  // Submit Simpan Edit Jurnal
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingJournal) return;
    if (!editFormData.topic_material.trim()) {
      setToast({
        type: 'error',
        title: 'Materi Wajib Diisi',
        message: 'Topik atau materi pembelajaran tidak boleh kosong.'
      });
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const payload = {
        meeting_number: parseInt(editFormData.meeting_number, 10) || 1,
        topic_material: editFormData.topic_material.trim(),
        learning_objective_id: editFormData.learning_objective_id ? Number(editFormData.learning_objective_id) : null,
        general_notes: editFormData.general_notes ? editFormData.general_notes.trim() : null
      };

      await journalService.updateJournal(editingJournal.id, payload);
      setToast({
        type: 'success',
        title: 'Jurnal Diperbarui',
        message: `Jurnal pertemuan ke-${payload.meeting_number} berhasil diperbarui.`
      });
      setIsEditOpen(false);
      fetchJournals();
    } catch (err) {
      console.error('Error updating teaching journal:', err);
      setToast({
        type: 'error',
        title: 'Gagal Memperbarui',
        message: err.response?.data?.message || err.message || 'Gagal menyimpan perubahan jurnal.'
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Eksekusi Hapus Jurnal
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await journalService.deleteJournal(deleteTarget.id);
      setToast({
        type: 'success',
        title: 'Jurnal Dihapus',
        message: `Jurnal pertemuan ke-${deleteTarget.meeting_number || ''} berhasil dihapus.`
      });
      setDeleteTarget(null);
      fetchJournals();
    } catch (err) {
      console.error('Error deleting journal:', err);
      setToast({
        type: 'error',
        title: 'Gagal Menghapus',
        message: err.response?.data?.message || err.message || 'Gagal menghapus jurnal mengajar.'
      });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter Berdasarkan Pencarian
  const filteredJournals = useMemo(() => {
    if (!searchQuery.trim()) return journals;
    const q = searchQuery.toLowerCase().trim();
    return journals.filter((j) => {
      const topic = (j.topic_material || '').toLowerCase();
      const notes = (j.general_notes || '').toLowerCase();
      const subject = (j.subject_name || '').toLowerCase();
      const classNames = (j.class_group_names || '').toLowerCase();
      const tpCode = (j.learning_objective_code || '').toLowerCase();
      return (
        topic.includes(q) ||
        notes.includes(q) ||
        subject.includes(q) ||
        classNames.includes(q) ||
        tpCode.includes(q)
      );
    });
  }, [journals, searchQuery]);

  return (
    <div className="flex flex-col gap-5 pb-20 animate-in fade-in duration-200">
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
        title="Riwayat Jurnal Mengajar"
        subtitle="Dokumentasi materi KBM dan capaian pembelajaran yang telah diajarkan."
        action={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/guru/presensi-siswa')}
            className="shrink-0"
          >
            Tulis Jurnal Baru
          </Button>
        }
      />

      {/* Bar Filter Mapel */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-400">
            Filter Sesuai Mata Pelajaran:
          </div>
          <div className="min-w-[150px] max-w-[240px]">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              aria-label="Filter Mata Pelajaran"
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 truncate min-h-[44px]"
            >
              <option value="">Semua Mata Pelajaran</option>
              {mySubjects.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Date Pills */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setQuickDateFilter('all')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition ${
              quickDateFilter === 'all'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua Jurnal
          </button>
          <button
            type="button"
            onClick={() => setQuickDateFilter('today')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition ${
              quickDateFilter === 'today'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => setQuickDateFilter('this_month')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition ${
              quickDateFilter === 'this_month'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            Bulan Ini
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari materi, catatan KBM, rombel, atau kode TP..."
          className="w-full pl-9 pr-4 py-2 min-h-[44px] text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
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
          title="Gagal Memuat Jurnal Mengajar"
          message={fetchError}
          onRetry={fetchJournals}
        />
      ) : filteredJournals.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'Tidak Ada Jurnal yang Cocok' : 'Belum Ada Riwayat Jurnal'}
          description={
            searchQuery
              ? `Tidak ditemukan catatan jurnal dengan kata kunci "${searchQuery}".`
              : 'Anda belum mengisi jurnal mengajar pada periode ini. Klik tombol di bawah untuk mulai mengisi jurnal KBM.'
          }
          icon={FileText}
          action={
            !searchQuery && (
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={() => navigate('/guru/presensi-siswa')}
              >
                Mulai Isi Jurnal KBM
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredJournals.map((journal) => {
            const dateStr = journal.teaching_date || journal.date || '-';
            const dayLabel = journal.day_label_id || 'Hari';

            return (
              <Card
                key={journal.id}
                className="p-4 sm:p-5 bg-slate-900/70 border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-700 transition"
              >
                <div>
                  {/* Top Bar: Tanggal, Pertemuan Ke-N, Rombel */}
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-bold">
                        Pertemuan #{journal.meeting_number || 1}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {journal.class_group_names || 'Rombel'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {dayLabel}, {dateStr}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {journal.start_time?.slice(0, 5)} - {journal.end_time?.slice(0, 5)} WIB
                    </span>
                  </div>

                  {/* Nama Mapel & Tujuan Pembelajaran */}
                  <div className="mb-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-100">
                      {journal.subject_name || 'Mata Pelajaran'}
                    </h3>

                    {journal.learning_objective_code && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>
                          [{journal.learning_objective_code}] {journal.learning_objective_description || ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Topik / Materi yang Diajarkan */}
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 mt-2">
                    <p className="text-xs font-bold text-slate-300 mb-1">Materi Pembelajaran:</p>
                    <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-normal">
                      {journal.topic_material}
                    </p>
                  </div>

                  {/* Catatan Umum KBM */}
                  {journal.general_notes && (
                    <div className="mt-2 text-xs text-slate-400 italic">
                      <span className="font-semibold not-italic text-slate-300">Catatan: </span>
                      {journal.general_notes}
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => navigate(`/guru/presensi-siswa?schedule_id=${journal.schedule_id}&date=${dateStr}`)}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Buka Presensi Sesi Ini
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(journal)}
                      aria-label="Ubah Catatan Jurnal"
                      className="p-2 min-w-[40px] min-h-[40px] rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(journal)}
                      aria-label="Hapus Jurnal"
                      className="p-2 min-w-[40px] min-h-[40px] rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
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

      {/* Bottom Sheet Edit Jurnal */}
      <BottomSheet
        isOpen={isEditOpen}
        onClose={() => !isSubmittingEdit && setIsEditOpen(false)}
        title="Ubah Jurnal Mengajar"
        description={`Sesi ${editingJournal?.subject_name || ''} - Pertemuan #${editFormData.meeting_number}`}
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              disabled={isSubmittingEdit}
              onClick={() => setIsEditOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={isSubmittingEdit}
              onClick={handleSubmitEdit}
              className="flex-1"
            >
              Simpan Perubahan
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4 py-1">
          <FormField
            label="Pertemuan Ke"
            required
          >
            <Input
              type="number"
              min="1"
              value={editFormData.meeting_number}
              onChange={(e) => setEditFormData({ ...editFormData, meeting_number: e.target.value })}
              className="font-bold"
            />
          </FormField>

          {availableTPs.length > 0 && (
            <FormField
              label="Tujuan Pembelajaran (TP)"
              help="Pilih TP terkait untuk pemetaan e-Rapor"
            >
              <select
                value={editFormData.learning_objective_id}
                onChange={(e) => {
                  const tpId = e.target.value;
                  const selectedTp = availableTPs.find(t => String(t.id) === String(tpId));
                  setEditFormData((prev) => ({
                    ...prev,
                    learning_objective_id: tpId,
                    topic_material: selectedTp
                      ? (selectedTp.scope_material ? `${selectedTp.code} - ${selectedTp.scope_material}` : `${selectedTp.code} - ${selectedTp.description.slice(0, 100)}`)
                      : prev.topic_material
                  }));
                }}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
              >
                <option value="">-- Tetapkan TP --</option>
                {availableTPs.map((tp) => (
                  <option key={tp.id} value={String(tp.id)}>
                    {tp.code} - {tp.scope_material ? `(${tp.scope_material}) ` : ''}{tp.description.slice(0, 75)}...
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <FormField
            label="Materi yang Diajarkan"
            required
            help="Topik bahasan materi pembelajaran yang diajarkan"
          >
            <Input
              type="text"
              value={editFormData.topic_material}
              onChange={(e) => setEditFormData({ ...editFormData, topic_material: e.target.value })}
              placeholder="Uraian materi..."
            />
          </FormField>

          <FormField
            label="Catatan Pelaksanaan KBM (Opsional)"
            help="Catatan hambatan atau tindak lanjut"
          >
            <Textarea
              rows={3}
              value={editFormData.general_notes}
              onChange={(e) => setEditFormData({ ...editFormData, general_notes: e.target.value })}
              placeholder="Catatan umum KBM..."
            />
          </FormField>
        </form>
      </BottomSheet>

      {/* Confirm Dialog Hapus Jurnal */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title={`Hapus Jurnal Pertemuan #${deleteTarget.meeting_number || ''}?`}
          message={`Apakah Anda yakin ingin menghapus catatan jurnal mengajar ${deleteTarget.subject_name || ''} pada tanggal ${deleteTarget.teaching_date || deleteTarget.date || ''}?`}
          variant="danger"
          confirmLabel="Ya, Hapus Jurnal"
          cancelLabel="Batal"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={isDeleting}
        />
      )}
    </div>
  );
}
