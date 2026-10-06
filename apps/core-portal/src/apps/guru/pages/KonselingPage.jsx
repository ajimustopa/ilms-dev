import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartHandshake,
  Plus,
  Calendar,
  User,
  ShieldCheck,
  Search,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Lock,
  ChevronRight
} from 'lucide-react';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useTeacherContext } from '../context/TeacherContext';
import { incidentService } from '../services/incidentService';
import { studentService } from '../services/studentService';
import {
  PageHeader,
  Card,
  Button,
  StatusBadge,
  EmptyState,
  ErrorState,
  Skeleton,
  BottomSheet,
  useToast
} from '../components';

const formatIndonesianDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  } catch {
    return String(dateString);
  }
};

export default function KonselingPage() {
  const { user, isHomeroom, isCounselor, isAdminUnit, isSuperAdmin } = useTeacherAuth();
  const { activeSchoolUnit, activeAcademicYear } = useTeacherContext();
  const toast = useToast();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    session_date: new Date().toISOString().split('T')[0],
    service_type: 'Konseling Individu',
    notes: '',
    visibility_level: 'bk_and_homeroom',
    follow_up_status: 'completed'
  });

  // Student Picker
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [students, setStudents] = useState([]);

  // Detail Modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await incidentService.getCounselingRecords({
        satuan_pendidikan_id: activeSchoolUnit?.id || undefined
      });
      const data = res?.data || res;
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memuat catatan konseling:', err);
      setError(err?.message || 'Gagal memuat data konseling.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [activeSchoolUnit?.id]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Load students for picker
  useEffect(() => {
    async function loadStudents() {
      try {
        const rombelRes = await studentService.getClassGroups({
          satuan_pendidikan_id: activeSchoolUnit?.id || undefined
        });
        const rData = rombelRes?.data || rombelRes || [];
        if (Array.isArray(rData) && rData.length > 0) {
          const promises = rData.slice(0, 5).map(r =>
            studentService.getClassMembers(r.id).catch(() => ({ data: [] }))
          );
          const results = await Promise.all(promises);
          const aggregated = [];
          results.forEach((res, idx) => {
            const list = res?.data || res || [];
            if (Array.isArray(list)) {
              list.forEach(s => aggregated.push({
                ...s,
                class_group_name: rData[idx]?.name || 'Rombel'
              }));
            }
          });
          setStudents(aggregated);
        }
      } catch (e) {
        console.warn('Gagal memuat santri untuk picker konseling:', e);
      }
    }
    loadStudents();
  }, [activeSchoolUnit?.id]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s =>
      (s.full_name && s.full_name.toLowerCase().includes(q)) ||
      (s.nis && s.nis.toLowerCase().includes(q))
    );
  }, [students, studentSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student_id) {
      toast?.error('Pilih santri terlebih dahulu.');
      return;
    }
    if (!formData.notes.trim()) {
      toast?.error('Catatan konseling wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await incidentService.createCounselingRecord({
        satuan_pendidikan_id: activeSchoolUnit?.id,
        academic_year_id: activeAcademicYear?.id,
        student_id: Number(formData.student_id),
        session_date: formData.session_date,
        service_type: formData.service_type,
        notes: formData.notes.trim(),
        visibility_level: formData.visibility_level,
        follow_up_status: formData.follow_up_status
      });

      toast?.success('Sesi konseling santri berhasil dicatat.');
      setIsFormOpen(false);
      fetchRecords();
    } catch (err) {
      console.error('Gagal menyimpan konseling:', err);
      toast?.error(err?.message || 'Gagal menyimpan catatan konseling.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(r =>
      (r.student_name && r.student_name.toLowerCase().includes(q)) ||
      (r.service_type && r.service_type.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      <PageHeader
        title="Layanan Bimbingan & Konseling Santri"
        subtitle="Catatan sesi konseling santri privat bersama Guru BK dan Wali Kelas"
        breadcrumbs={[
          { label: 'Portal Guru', to: '/guru' },
          { label: 'Bimbingan Konseling' }
        ]}
        actions={
          (isCounselor || isHomeroom || isAdminUnit || isSuperAdmin) && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFormData({
                  student_id: '',
                  student_name: '',
                  session_date: new Date().toISOString().split('T')[0],
                  service_type: 'Konseling Individu',
                  notes: '',
                  visibility_level: 'bk_and_homeroom',
                  follow_up_status: 'completed'
                });
                setIsFormOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
              className="text-xs min-h-[40px]"
            >
              + Catat Sesi Konseling
            </Button>
          )
        }
      />

      <Card className="p-3.5 sm:p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari santri atau jenis layanan konseling..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
          />
        </div>
      </Card>

      <div>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : error ? (
          <ErrorState
            title="Gagal Memuat Konseling"
            message={error}
            onRetry={fetchRecords}
          />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            icon={<HeartHandshake className="w-8 h-8 text-slate-400" />}
            title="Belum Ada Catatan Konseling"
            description={
              searchQuery
                ? 'Tidak ada data konseling yang cocok dengan pencarian.'
                : 'Sesi bimbingan konseling dan pendampingan santri akan tampil di sini.'
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedRecord(item)}
                className="p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer select-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status="info" size="sm">
                        {item.service_type || 'Konseling'}
                      </StatusBadge>

                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatIndonesianDate(item.session_date)}
                      </span>

                      <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {item.visibility_level}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.student_name || 'Santri'}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.notes}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 self-center" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Catat Konseling */}
      <BottomSheet
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Catat Sesi Bimbingan & Konseling"
        maxHeight="max-h-[90vh]"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5 pb-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Santri Bersangkutan *
            </label>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="w-full px-3 py-2 text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs flex items-center justify-between min-h-[42px]"
            >
              <span>{formData.student_name || 'Ketuk untuk memilih santri...'}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tanggal Sesi *
              </label>
              <input
                type="date"
                value={formData.session_date}
                onChange={(e) => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[42px]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Jenis Layanan
              </label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[42px]"
              >
                <option value="Konseling Individu">Konseling Individu</option>
                <option value="Bimbingan Karir & Belajar">Bimbingan Karir & Belajar</option>
                <option value="Mediasi Teman Sebaya">Mediasi Teman Sebaya</option>
                <option value="Koordinasi Wali Santri">Koordinasi Wali Santri</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Catatan & Observasi Konseling *
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Tuliskan poin penting sesi konseling, asesmen, dan kesepakatan tindak lanjut..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg leading-relaxed"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tingkat Visibilitas Catatan
            </label>
            <select
              value={formData.visibility_level}
              onChange={(e) => setFormData(prev => ({ ...prev, visibility_level: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[42px]"
            >
              <option value="bk_and_homeroom">Wali Kelas & Guru BK (bk_and_homeroom)</option>
              <option value="bk_only">Khusus Guru BK Privat (bk_only)</option>
              <option value="all_staff">Seluruh Dewan Guru (all_staff)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Catatan Konseling'}
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* Student Picker */}
      <BottomSheet
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="Pilih Santri"
        maxHeight="max-h-[85vh]"
      >
        <div className="space-y-3 pb-6">
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Cari nama santri..."
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
          />
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
            {filteredStudents.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    student_id: s.id,
                    student_name: s.full_name
                  }));
                  setIsPickerOpen(false);
                }}
                className="w-full py-2.5 px-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between text-xs"
              >
                <span className="font-bold text-slate-800 dark:text-slate-200">{s.full_name}</span>
                <span className="text-slate-400">{s.class_group_name}</span>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* Detail BottomSheet */}
      <BottomSheet
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title="Detail Sesi Konseling"
        maxHeight="max-h-[85vh]"
      >
        {selectedRecord && (
          <div className="space-y-3 pb-6 text-xs">
            <div className="border-b pb-2 space-y-1">
              <span className="text-slate-400">SANTRI</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {selectedRecord.student_name}
              </h3>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400">TANGGAL & LAYANAN</span>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {formatIndonesianDate(selectedRecord.session_date)} • {selectedRecord.service_type}
              </p>
            </div>
            <div className="space-y-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block font-bold">CATATAN KONSELING</span>
              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {selectedRecord.notes}
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedRecord(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
