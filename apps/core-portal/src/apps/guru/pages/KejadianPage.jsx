import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldAlert,
  Award,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  Sparkles,
  Info,
  Lock,
  Tag,
  ThumbsUp,
  AlertCircle,
  CheckCheck,
  ShieldCheck,
  History,
  Activity,
  ArrowUpRight,
  ArrowDownRight
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
  SegmentedTabs,
  EmptyState,
  ErrorState,
  Skeleton,
  BottomSheet,
  SelectSheet,
  ConfirmDialog,
  useToast
} from '../components';

// Helper Format Tanggal Indonesia
const formatIndonesianDate = (dateString, includeTime = false) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const options = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
    };
    return new Intl.DateTimeFormat('id-ID', options).format(d);
  } catch {
    return String(dateString);
  }
};

export default function KejadianPage() {
  const { user, isHomeroom, isCounselor, isKesiswaan, isAdminUnit, isSuperAdmin } = useTeacherAuth();
  const { activeSchoolUnit, activeAcademicYear, myTeachingAssignments } = useTeacherContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  // Tab Jenis Kejadian: 'all' | 'negative' (Pelanggaran) | 'positive' (Prestasi & Apresiasi)
  const [activeTypeTab, setActiveTypeTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Data List & Categories
  const [incidents, setIncidents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Santri List & Rombel Options
  const [classGroups, setClassGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Detail Modal & Handling State
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isHandlingOpen, setIsHandlingOpen] = useState(false);
  const [handlingSubmitting, setHandlingSubmitting] = useState(false);
  const [handlingForm, setHandlingForm] = useState({
    handling_status: 'in_progress',
    handling_action: '',
    resolution_date: new Date().toISOString().split('T')[0]
  });

  // Verifikasi Poin State (Kesiswaan / Admin)
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifyPointsValue, setVerifyPointsValue] = useState(0);
  const [verifying, setVerifying] = useState(false);

  // Ringkasan Rekam Jejak Santri Modal State
  const [selectedStudentForSummary, setSelectedStudentForSummary] = useState(null);
  const [studentSummaryData, setStudentSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Form Pencatatan Baru / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    student_id: '',
    student_name: '',
    class_group_name: '',
    type: 'negative',
    category_id: '',
    title: '',
    description: '',
    points: 5,
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().slice(0, 5),
    location: '',
    visibility_level: 'teachers_only'
  });

  // Student Search Sheet State di dalam Form
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [studentSearchText, setStudentSearchText] = useState('');

  // Hak Akses Pengguna
  const canManageHandling = isHomeroom || isCounselor || isKesiswaan || isAdminUnit || isSuperAdmin;
  const canVerifyPoints = isKesiswaan || isAdminUnit || isSuperAdmin;

  // 1. Ambil Master Kategori & Daftar Rombel
  useEffect(() => {
    async function initMasterData() {
      try {
        const [catRes, rombelRes] = await Promise.allSettled([
          incidentService.getCategories({
            satuan_pendidikan_id: activeSchoolUnit?.id || undefined,
            is_active: 1
          }),
          studentService.getClassGroups({
            satuan_pendidikan_id: activeSchoolUnit?.id || undefined,
            academic_year_id: activeAcademicYear?.id || undefined
          })
        ]);

        if (catRes.status === 'fulfilled') {
          const catData = catRes.value?.data || catRes.value;
          setCategories(Array.isArray(catData) ? catData : []);
        }

        if (rombelRes.status === 'fulfilled') {
          const rombelData = rombelRes.value?.data || rombelRes.value;
          setClassGroups(Array.isArray(rombelData) ? rombelData : []);
        }
      } catch (err) {
        console.error('Gagal memuat master data kejadian:', err);
      }
    }

    initMasterData();
  }, [activeSchoolUnit?.id, activeAcademicYear?.id]);

  // 2. Fetch Daftar Kejadian
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        satuan_pendidikan_id: activeSchoolUnit?.id || undefined,
        type: activeTypeTab !== 'all' ? activeTypeTab : undefined,
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
        handling_status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery || undefined
      };

      const res = await incidentService.getIncidents(params);
      const data = res?.data || res;
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memuat catatan kejadian santri:', err);
      setError(err?.message || 'Gagal memuat data kejadian santri. Periksa koneksi Anda.');
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [activeSchoolUnit?.id, activeTypeTab, selectedCategory, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // 3. Load Santri untuk Form Picker
  const loadStudentsForPicker = useCallback(async () => {
    setLoadingStudents(true);
    try {
      if (classGroups.length > 0) {
        const allPromises = classGroups.slice(0, 6).map(cg =>
          studentService.getClassMembers(cg.id).catch(() => ({ data: [] }))
        );
        const results = await Promise.all(allPromises);
        const aggregated = [];
        results.forEach((r, idx) => {
          const list = r?.data || r || [];
          if (Array.isArray(list)) {
            list.forEach(s => {
              aggregated.push({
                ...s,
                class_group_name: classGroups[idx]?.name || 'Rombel'
              });
            });
          }
        });
        setStudents(aggregated);
      }
    } catch (err) {
      console.error('Gagal memuat daftar santri:', err);
    } finally {
      setLoadingStudents(false);
    }
  }, [classGroups]);

  useEffect(() => {
    if (classGroups.length > 0) {
      loadStudentsForPicker();
    }
  }, [classGroups, loadStudentsForPicker]);

  const filteredStudents = useMemo(() => {
    if (!studentSearchText) return students;
    const q = studentSearchText.toLowerCase();
    return students.filter(s =>
      (s.full_name && s.full_name.toLowerCase().includes(q)) ||
      (s.nis && s.nis.toLowerCase().includes(q)) ||
      (s.nisn && s.nisn.toLowerCase().includes(q)) ||
      (s.class_group_name && s.class_group_name.toLowerCase().includes(q))
    );
  }, [students, studentSearchText]);

  // Form Create Handler
  const handleOpenCreateForm = (initialType = 'negative') => {
    setIsEditMode(false);
    const filteredCats = categories.filter(c => c.type === initialType);
    const defaultCat = filteredCats[0] || null;

    setFormData({
      id: null,
      student_id: '',
      student_name: '',
      class_group_name: '',
      type: initialType,
      category_id: defaultCat?.id ? String(defaultCat.id) : '',
      title: '',
      description: '',
      points: defaultCat?.default_points || (initialType === 'negative' ? 5 : 10),
      incident_date: new Date().toISOString().split('T')[0],
      incident_time: new Date().toTimeString().slice(0, 5),
      location: '',
      visibility_level: initialType === 'positive' ? 'public_school' : 'teachers_only'
    });
    setIsFormOpen(true);
  };

  const handleCategoryChange = (categoryId) => {
    const found = categories.find(c => String(c.id) === String(categoryId));
    setFormData(prev => ({
      ...prev,
      category_id: categoryId,
      points: found?.default_points !== undefined ? found.default_points : prev.points,
      title: prev.title || found?.name || ''
    }));
  };

  const handleTypeChange = (newType) => {
    const filteredCats = categories.filter(c => c.type === newType);
    const defaultCat = filteredCats[0] || null;
    setFormData(prev => ({
      ...prev,
      type: newType,
      category_id: defaultCat?.id ? String(defaultCat.id) : '',
      points: defaultCat?.default_points || (newType === 'negative' ? 5 : 10),
      visibility_level: newType === 'positive' ? 'public_school' : 'teachers_only'
    }));
  };

  const handleSelectStudent = (student) => {
    setFormData(prev => ({
      ...prev,
      student_id: student.id,
      student_name: student.full_name,
      class_group_name: student.class_group_name || student.rombel_name || ''
    }));
    setIsStudentPickerOpen(false);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.student_id) {
      toast?.error('Pilih santri terlebih dahulu.');
      return;
    }
    if (!formData.title.trim()) {
      toast?.error('Judul kejadian wajib diisi.');
      return;
    }
    if (!formData.description.trim()) {
      toast?.error('Uraian kronologi kejadian wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id,
        academic_year_id: activeAcademicYear?.id,
        student_id: Number(formData.student_id),
        category_id: formData.category_id ? Number(formData.category_id) : null,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        points: Number(formData.points) || 0,
        incident_date: formData.incident_date,
        incident_time: formData.incident_time ? `${formData.incident_time}:00` : null,
        location: formData.location.trim() || null,
        visibility_level: formData.visibility_level
      };

      if (isEditMode && formData.id) {
        await incidentService.updateIncident(formData.id, payload);
        toast?.success('Catatan kejadian berhasil diperbarui.');
      } else {
        await incidentService.createIncident(payload);
        toast?.success('Catatan kejadian santri berhasil dilaporkan.');
      }

      setIsFormOpen(false);
      fetchIncidents();
    } catch (err) {
      console.error('Gagal menyimpan kejadian santri:', err);
      toast?.error(err?.message || 'Gagal menyimpan data kejadian.');
    } finally {
      setSubmitting(false);
    }
  };

  // Detail Modal Handler
  const handleOpenDetail = (incident) => {
    setSelectedIncident(incident);
    setHandlingForm({
      handling_status: incident.handling_status || 'in_progress',
      handling_action: incident.handling_action || '',
      resolution_date: incident.resolution_date || new Date().toISOString().split('T')[0]
    });
    setVerifyPointsValue(incident.points || 0);
  };

  // Submit Update Penanganan Kejadian (Wali Kelas / BK / Kesiswaan)
  const handleSubmitHandling = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;

    setHandlingSubmitting(true);
    try {
      const res = await incidentService.updateHandlingStatus(selectedIncident.id, {
        handling_status: handlingForm.handling_status,
        handling_action: handlingForm.handling_action.trim() || null,
        resolution_date: handlingForm.handling_status === 'resolved' ? handlingForm.resolution_date : null
      });

      const updated = res?.data || res;
      setSelectedIncident(updated || { ...selectedIncident, ...handlingForm });
      toast?.success('Status dan tindakan penanganan berhasil diperbarui.');
      setIsHandlingOpen(false);
      fetchIncidents();
    } catch (err) {
      console.error('Gagal memperbarui penanganan kejadian:', err);
      toast?.error(err?.message || 'Gagal memperbarui penanganan kejadian.');
    } finally {
      setHandlingSubmitting(false);
    }
  };

  // Submit Verifikasi Poin (Kesiswaan / Admin)
  const handleSubmitVerifyPoints = async () => {
    if (!selectedIncident) return;
    setVerifying(true);
    try {
      const res = await incidentService.verifyPoints(selectedIncident.id, {
        points: Number(verifyPointsValue)
      });

      const updated = res?.data || res;
      setSelectedIncident(updated || {
        ...selectedIncident,
        points: Number(verifyPointsValue),
        verified_at: new Date().toISOString()
      });
      toast?.success('Poin kejadian berhasil diverifikasi dan dibukukan.');
      setIsVerifyOpen(false);
      fetchIncidents();
    } catch (err) {
      console.error('Gagal memverifikasi poin:', err);
      toast?.error(err?.message || 'Akses ditolak: hanya Kesiswaan/Admin yang berhak memverifikasi poin.');
    } finally {
      setVerifying(false);
    }
  };

  // Buka Modal Ringkasan Siswa
  const handleOpenStudentSummary = async (studentId, studentName = 'Santri') => {
    setSelectedStudentForSummary({ id: studentId, full_name: studentName });
    setStudentSummaryData(null);
    setLoadingSummary(true);
    try {
      const res = await incidentService.getStudentSummary(studentId);
      const data = res?.data || res;
      setStudentSummaryData(data);
    } catch (err) {
      console.error('Gagal memuat ringkasan santri:', err);
      toast?.error(err?.message || 'Gagal memuat rekam jejak santri.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Tabs Filter Utama
  const typeTabs = [
    { id: 'all', label: 'Semua Kejadian', icon: ShieldAlert },
    { id: 'negative', label: 'Pelanggaran Disiplin', icon: AlertTriangle },
    { id: 'positive', label: 'Prestasi & Apresiasi', icon: Award }
  ];

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Halaman */}
      <PageHeader
        title="Catatan Kejadian & Prestasi Santri"
        subtitle="Buku catatan perilaku santri, poin kedisiplinan, dan alur penanganan kasus"
        breadcrumbs={[
          { label: 'Portal Guru', to: '/guru' },
          { label: 'Kejadian Santri' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenCreateForm('positive')}
              leftIcon={<Award className="w-4 h-4 text-emerald-600" />}
              className="text-xs min-h-[40px]"
            >
              + Catat Prestasi
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenCreateForm('negative')}
              leftIcon={<Plus className="w-4 h-4" />}
              className="text-xs min-h-[40px]"
            >
              + Catat Pelanggaran
            </Button>
          </div>
        }
      />

      {/* 2. Filter & Toolbar */}
      <Card className="p-3.5 sm:p-4 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <SegmentedTabs
            tabs={typeTabs}
            activeTab={activeTypeTab}
            onChange={(tabId) => setActiveTypeTab(tabId)}
            size="md"
            className="w-full md:w-auto"
          />

          {/* Quick Stats Banner */}
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span>Total: <strong className="text-slate-900 dark:text-slate-100 font-bold">{incidents.length}</strong> catatan</span>
            <span>•</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {incidents.filter(i => i.type === 'negative').length} Pelanggaran
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {incidents.filter(i => i.type === 'positive').length} Prestasi
            </span>
          </div>
        </div>

        {/* Filter Bar: Pencarian, Status, & Kategori */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari santri, NIS, atau judul..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
            />
          </div>

          {/* Filter Status Penanganan */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
            >
              <option value="all">Semua Status Penanganan</option>
              <option value="reported">Dilaporkan (Menunggu)</option>
              <option value="in_progress">Sedang Ditangani</option>
              <option value="resolved">Selesai / Dituntaskan</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          {/* Filter Kategori */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
            >
              <option value="all">Semua Kategori</option>
              {categories
                .filter(c => activeTypeTab === 'all' || c.type === activeTypeTab)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `[${c.code}] ` : ''}{c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 3. Daftar Catatan Kejadian */}
      <div>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : error ? (
          <ErrorState
            title="Gagal Memuat Catatan Kejadian"
            message={error}
            onRetry={fetchIncidents}
          />
        ) : incidents.length === 0 ? (
          <EmptyState
            icon={<ShieldAlert className="w-8 h-8 text-slate-400" />}
            title="Tidak Ada Catatan Kejadian"
            description={
              searchQuery || selectedStatus !== 'all' || selectedCategory !== 'all'
                ? 'Tidak ditemukan kejadian yang sesuai dengan filter pencarian.'
                : 'Belum ada catatan kejadian atau prestasi santri yang dilaporkan.'
            }
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenCreateForm('negative')}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Catat Kejadian Baru
                </Button>
              </div>
            }
          />
        ) : (
          <div className="space-y-3">
            {incidents.map((item) => {
              const isPositive = item.type === 'positive';

              const statusMap = {
                reported: { label: 'Dilaporkan', status: 'warning' },
                in_progress: { label: 'Diproses', status: 'info' },
                resolved: { label: 'Tuntas', status: 'success' },
                cancelled: { label: 'Batal', status: 'neutral' }
              };
              const statusInfo = statusMap[item.handling_status] || { label: item.handling_status, status: 'neutral' };

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all select-none relative group ${
                    isPositive
                      ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => handleOpenDetail(item)}
                      className="space-y-1.5 flex-1 min-w-0 cursor-pointer"
                    >
                      {/* Baris Meta Atas */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isPositive ? (
                          <StatusBadge status="success" size="sm">
                            <span className="flex items-center gap-1 font-bold">
                              <Award className="w-3 h-3" />
                              +{item.points} Poin Prestasi
                            </span>
                          </StatusBadge>
                        ) : (
                          <StatusBadge status="danger" size="sm">
                            <span className="flex items-center gap-1 font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              -{item.points} Poin Pelanggaran
                            </span>
                          </StatusBadge>
                        )}

                        <StatusBadge status={statusInfo.status} size="sm">
                          {statusInfo.label}
                        </StatusBadge>

                        {item.category_name && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" />
                            {item.category_name}
                          </span>
                        )}

                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatIndonesianDate(item.incident_date)}
                        </span>
                      </div>

                      {/* Identitas Santri & Judul */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {item.student_name || 'Santri'}
                          </h3>
                          {item.nis && <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">({item.nis})</span>}
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {item.title}
                        </p>
                      </div>

                      {/* Uraian Singkat */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Info Footer: Pelapor, Petugas, & Verifikasi */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {item.location}
                          </span>
                        )}
                        {item.reporter_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            Pelapor: {item.reporter_name}
                          </span>
                        )}
                        {item.handler_name && (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            • Ditangani: {item.handler_name}
                          </span>
                        )}
                        {item.verified_at && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                            <CheckCheck className="w-3 h-3" />
                            Terverifikasi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sisi Kanan: Pintasan Rekam Jejak Santri & Detail */}
                    <div className="flex flex-col items-end justify-between self-stretch shrink-0 pl-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStudentSummary(item.student_id, item.student_name);
                        }}
                        title="Buka Ringkasan Rekam Jejak Santri"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      >
                        <Activity className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDetail(item)}
                        className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-auto hover:underline flex items-center gap-0.5"
                      >
                        <span>Detail</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Form BottomSheet Pencatatan Kejadian Baru */}
      <BottomSheet
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={formData.type === 'positive' ? 'Catat Prestasi / Kebaikan Santri' : 'Catat Pelanggaran Tata Tertib'}
        maxHeight="max-h-[92vh]"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 pb-6">
          {/* Pilihan Jenis Kejadian */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Jenis Kejadian
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('negative')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                  formData.type === 'negative'
                    ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Pelanggaran Disiplin
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('positive')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                  formData.type === 'positive'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
              >
                <Award className="w-4 h-4 text-emerald-600" />
                Prestasi / Apresiasi
              </button>
            </div>
          </div>

          {/* Pemilih Santri */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Santri Bersangkutan *</span>
              <span className="text-[11px] text-slate-400 font-normal">Pencarian Cepat</span>
            </label>
            <button
              type="button"
              onClick={() => setIsStudentPickerOpen(true)}
              className="w-full px-3 py-2.5 text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 flex items-center justify-between min-h-[44px] focus:ring-2 focus:ring-emerald-500"
            >
              {formData.student_name ? (
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">{formData.student_name}</span>
                  {formData.class_group_name && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      Rombel: {formData.class_group_name}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  Ketuk untuk mencari & memilih santri...
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>

          {/* Pemilih Kategori */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Kategori Kejadian
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            >
              <option value="">-- Pilih Kategori / Tata Tertib Standar --</option>
              {categories
                .filter(c => c.type === formData.type)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `[${c.code}] ` : ''}{c.name} ({c.type === 'positive' ? `+${c.default_points}` : `-${c.default_points}`} Poin)
                  </option>
                ))}
            </select>
          </div>

          {/* Judul & Poin */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Judul Kejadian *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Misal: Juara 1 Tahfidz / Terlambat Masuk Kelas"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Bobot Poin *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.points}
                onChange={(e) => setFormData(prev => ({ ...prev, points: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-bold text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                required
              />
            </div>
          </div>

          {/* Tanggal, Jam, Lokasi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tanggal Kejadian *
              </label>
              <input
                type="date"
                value={formData.incident_date}
                onChange={(e) => setFormData(prev => ({ ...prev, incident_date: e.target.value }))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Jam Kejadian
              </label>
              <input
                type="time"
                value={formData.incident_time}
                onChange={(e) => setFormData(prev => ({ ...prev, incident_time: e.target.value }))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Lokasi Kejadian
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Misal: Kelas 8A / Asrama"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
            </div>
          </div>

          {/* Uraian Kronologi */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Uraian Kronologi Kejadian *
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tuliskan kronologi singkat, konteks kejadian, dan fakta di lapangan..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              required
            />
          </div>

          {/* Tingkat Visibilitas */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tingkat Visibilitas Catatan
            </label>
            <select
              value={formData.visibility_level}
              onChange={(e) => setFormData(prev => ({ ...prev, visibility_level: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            >
              <option value="teachers_only">Dewan Guru & Staf Sekolah (teachers_only)</option>
              <option value="homeroom_and_bk">Khusus Wali Kelas & Guru BK (homeroom_and_bk)</option>
              <option value="public_school">Prestasi Terbuka / Publik Sekolah (public_school)</option>
            </select>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(false)}
              className="min-h-[44px]"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              className="min-h-[44px]"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Laporan Kejadian'}
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* 5. Student Picker BottomSheet */}
      <BottomSheet
        isOpen={isStudentPickerOpen}
        onClose={() => setIsStudentPickerOpen(false)}
        title="Pilih Santri"
        maxHeight="max-h-[85vh]"
      >
        <div className="space-y-3 pb-6">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={studentSearchText}
              onChange={(e) => setStudentSearchText(e.target.value)}
              placeholder="Ketik nama santri, NIS, atau rombel..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
              autoFocus
            />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
            {loadingStudents ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Memuat daftar santri...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Santri tidak ditemukan.
              </div>
            ) : (
              filteredStudents.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectStudent(s)}
                  className="w-full py-2.5 px-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg flex items-center justify-between min-h-[44px] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {s.full_name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      NIS: {s.nis || '-'} • Rombel: {s.class_group_name || 'Rombel'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </BottomSheet>

      {/* 6. Detail BottomSheet Kejadian & Form Update Penanganan */}
      <BottomSheet
        isOpen={Boolean(selectedIncident)}
        onClose={() => {
          setSelectedIncident(null);
          setIsHandlingOpen(false);
          setIsVerifyOpen(false);
        }}
        title="Detail Catatan Kejadian"
        maxHeight="max-h-[92vh]"
      >
        {selectedIncident && (
          <div className="space-y-4 pb-6">
            {/* Header Status & Poin */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {selectedIncident.type === 'positive' ? (
                  <StatusBadge status="success" size="sm">
                    <span className="flex items-center gap-1 font-bold">
                      <Award className="w-3 h-3" />
                      +{selectedIncident.points} Poin Prestasi
                    </span>
                  </StatusBadge>
                ) : (
                  <StatusBadge status="danger" size="sm">
                    <span className="flex items-center gap-1 font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      -{selectedIncident.points} Poin Pelanggaran
                    </span>
                  </StatusBadge>
                )}

                <StatusBadge
                  status={
                    selectedIncident.handling_status === 'resolved'
                      ? 'success'
                      : selectedIncident.handling_status === 'in_progress'
                      ? 'info'
                      : 'warning'
                  }
                  size="sm"
                >
                  Status: {selectedIncident.handling_status}
                </StatusBadge>

                {selectedIncident.verified_at ? (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Poin Terverifikasi
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Menunggu Verifikasi Kesiswaan
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {selectedIncident.title}
              </h2>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Santri: <strong className="text-slate-800 dark:text-slate-200 font-bold">{selectedIncident.student_name}</strong>
                  {selectedIncident.nis && <span className="font-mono ml-1">({selectedIncident.nis})</span>}
                </p>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenStudentSummary(selectedIncident.student_id, selectedIncident.student_name)}
                  leftIcon={<Activity className="w-3.5 h-3.5 text-indigo-600" />}
                  className="text-xs text-indigo-700 dark:text-indigo-400 py-1"
                >
                  Lihat Rekam Jejak
                </Button>
              </div>
            </div>

            {/* Info Waktu, Lokasi, Pelapor */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">WAKTU KEJADIAN</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatIndonesianDate(selectedIncident.incident_date)} {selectedIncident.incident_time?.slice(0, 5)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">LOKASI</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedIncident.location || '-'}
                </span>
              </div>
              <div className="pt-1.5">
                <span className="text-slate-400 block text-[10px]">PELAPOR</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedIncident.reporter_name || 'Dewan Guru'}
                </span>
              </div>
              <div className="pt-1.5">
                <span className="text-slate-400 block text-[10px]">VISIBILITAS</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">
                  {selectedIncident.visibility_level}
                </span>
              </div>
            </div>

            {/* Uraian Kronologi */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Uraian Kronologi Kejadian
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 whitespace-pre-line">
                {selectedIncident.description}
              </p>
            </div>

            {/* Bagian Tindakan Pembinaan / Penanganan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Tindakan Pembinaan & Status Kasus
                </h4>

                {canManageHandling && !isHandlingOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsHandlingOpen(true)}
                    leftIcon={<Edit className="w-3.5 h-3.5" />}
                    className="text-xs py-1 min-h-[36px]"
                  >
                    Update Penanganan
                  </Button>
                )}
              </div>

              {/* Form Input Penanganan (Jika Dibuka oleh Wali Kelas/BK/Kesiswaan) */}
              {isHandlingOpen ? (
                <form onSubmit={handleSubmitHandling} className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Ubah Status Penanganan *
                      </label>
                      <select
                        value={handlingForm.handling_status}
                        onChange={(e) => setHandlingForm(prev => ({ ...prev, handling_status: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                        required
                      >
                        <option value="reported">Dilaporkan (Menunggu)</option>
                        <option value="in_progress">Sedang Ditangani (in_progress)</option>
                        <option value="resolved">Selesai / Dituntaskan (resolved)</option>
                        <option value="cancelled">Dibatalkan (cancelled)</option>
                      </select>
                    </div>

                    {handlingForm.handling_status === 'resolved' && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Tanggal Selesai
                        </label>
                        <input
                          type="date"
                          value={handlingForm.resolution_date}
                          onChange={(e) => setHandlingForm(prev => ({ ...prev, resolution_date: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Catatan Tindakan Pembinaan / Sanksi / Penghargaan *
                    </label>
                    <textarea
                      rows={2}
                      value={handlingForm.handling_action}
                      onChange={(e) => setHandlingForm(prev => ({ ...prev, handling_action: e.target.value }))}
                      placeholder="Tuliskan tindakan pembinaan yang telah dilakukan (misal: konseling pribadi, peringatan lisan, pemanggilan wali santri, penyerahan piagam)..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsHandlingOpen(false)}
                      className="text-xs min-h-[36px]"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={handlingSubmitting}
                      className="text-xs min-h-[36px]"
                    >
                      {handlingSubmitting ? 'Menyimpan...' : 'Simpan Penanganan'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  {selectedIncident.handling_action ? (
                    <p className="whitespace-pre-line leading-relaxed">{selectedIncident.handling_action}</p>
                  ) : (
                    <p className="text-slate-400 italic">Belum ada tindakan penanganan yang dicatat oleh Wali Kelas/BK.</p>
                  )}
                  {selectedIncident.handler_name && (
                    <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      Petugas Penangan: <strong>{selectedIncident.handler_name}</strong>
                      {selectedIncident.resolution_date && ` (Selesai pada ${formatIndonesianDate(selectedIncident.resolution_date)})`}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Bagian Verifikasi Poin (Kesiswaan / Admin) */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verifikasi Poin Kedisiplinan
                </h4>

                {canVerifyPoints && !selectedIncident.verified_at && !isVerifyOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsVerifyOpen(true)}
                    leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    className="text-xs py-1 min-h-[36px]"
                  >
                    Verifikasi Poin
                  </Button>
                )}
              </div>

              {isVerifyOpen ? (
                <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Penyesuaian / Konfirmasi Bobot Poin Resmi
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={verifyPointsValue}
                      onChange={(e) => setVerifyPointsValue(e.target.value)}
                      className="w-28 px-2.5 py-1.5 font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsVerifyOpen(false)}
                      className="text-xs min-h-[36px]"
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleSubmitVerifyPoints}
                      disabled={verifying}
                      className="text-xs min-h-[36px] bg-emerald-600 hover:bg-emerald-700"
                    >
                      {verifying ? 'Memproses...' : 'Setujui & Bukukan Poin'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                  {selectedIncident.verified_at ? (
                    <div className="space-y-0.5">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Poin Resmi Disetujui ({selectedIncident.points} Poin)
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Diverifikasi oleh: {selectedIncident.verifier_name || 'Tim Kesiswaan'} pada {formatIndonesianDate(selectedIncident.verified_at, true)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[11px] italic">
                      Catatan ini masih berstatus usulan dan belum diverifikasi secara resmi oleh Kesiswaan.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Toolbar Tutup */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedIncident(null)}
                className="text-xs min-h-[40px]"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 7. BottomSheet Ringkasan Profil & Rekam Jejak Santri */}
      <BottomSheet
        isOpen={Boolean(selectedStudentForSummary)}
        onClose={() => setSelectedStudentForSummary(null)}
        title="Rekam Jejak & Profil Perilaku Santri"
        maxHeight="max-h-[90vh]"
      >
        {selectedStudentForSummary && (
          <div className="space-y-4 pb-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedStudentForSummary.full_name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Akumulasi Poin Disiplin & Apresiasi Prestasi Sekolah
              </p>
            </div>

            {loadingSummary ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : studentSummaryData ? (
              <div className="space-y-3">
                {/* 3 Kartu Skor */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800 text-center">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block uppercase">
                      Pelanggaran
                    </span>
                    <span className="text-lg font-bold text-rose-700 dark:text-rose-400 block font-mono mt-0.5">
                      -{studentSummaryData.total_negative_points || 0}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {studentSummaryData.negative_count || 0} Kasus
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase">
                      Prestasi
                    </span>
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 block font-mono mt-0.5">
                      +{studentSummaryData.total_positive_points || 0}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {studentSummaryData.positive_count || 0} Prestasi
                    </span>
                  </div>

                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 text-center">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 block uppercase">
                      Skor Bersih
                    </span>
                    <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400 block font-mono mt-0.5">
                      {studentSummaryData.net_score || 0}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {studentSummaryData.net_score >= 0 ? 'Baik / Aman' : 'Perlu Pembinaan'}
                    </span>
                  </div>
                </div>

                {/* Status Evaluasi Kedisiplinan */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Evaluasi Status Perilaku:
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Santri memiliki total <strong>{studentSummaryData.total_incidents || 0} catatan perilaku</strong> tercatat.
                    {studentSummaryData.total_negative_points > 20
                      ? ' Poin pelanggaran melebihi ambang 20 poin. Disarankan koordinasi dengan Guru BK dan Wali Kelas untuk pembinaan intensif.'
                      : ' Perilaku santri dalam batas wajar tata tertib madrasah/pesantren.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Data rekam jejak santri belum tersedia.
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedStudentForSummary(null)}
                className="text-xs min-h-[40px]"
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
