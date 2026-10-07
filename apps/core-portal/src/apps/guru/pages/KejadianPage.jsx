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
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  MessageCircle,
  BookOpen,
  Download,
  X,
  Maximize2,
  Minimize2,
  Check,
  PhoneCall,
  LockKeyhole
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
      month: 'short',
      year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
    };
    return new Intl.DateTimeFormat('id-ID', options).format(d);
  } catch {
    return String(dateString);
  }
};

// Helper normalisasi nomor WA
const formatWhatsAppLink = (phone, text = '') => {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9]/g, '');
  const formatted = cleaned.startsWith('0') ? '62' + cleaned.slice(1) : cleaned.startsWith('62') ? cleaned : '62' + cleaned;
  return `https://wa.me/${formatted}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

export default function KejadianPage() {
  const { user, isHomeroom, isCounselor, isKesiswaan, isAdminUnit, isSuperAdmin } = useTeacherAuth();
  const { activeSchoolUnit, activeAcademicYear } = useTeacherContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  // Role permissions
  const canAccessBK = isCounselor || isAdminUnit || isSuperAdmin;
  const canManageHandling = isHomeroom || isCounselor || isKesiswaan || isAdminUnit || isSuperAdmin;
  const canVerifyPoints = isKesiswaan || isAdminUnit || isSuperAdmin;

  // Active Tab: 'all' | 'negative' (Pelanggaran) | 'positive' (Prestasi) | 'counseling' (Privat BK)
  const [activeTypeTab, setActiveTypeTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedClassGroup, setSelectedClassGroup] = useState('all');

  // Data List & Categories
  const [incidents, setIncidents] = useState([]);
  const [counselingList, setCounselingList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Form Pencatatan Baru (Panel Kanan Desktop / Bottom Sheet Mobile)
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    student_id: '',
    student_name: '',
    student_nis: '',
    class_group_name: '',
    type: 'negative',
    category_id: '',
    title: '',
    description: '',
    points: 5,
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().slice(0, 5),
    location: '',
    action_taken: '',
    visibility_level: 'teachers_only'
  });

  // Student Search Sheet State
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [studentSearchText, setStudentSearchText] = useState('');

  // 1. Inisialisasi Master Data (Kategori & Rombel)
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
          const catList = Array.isArray(catData) ? catData : [];
          setCategories(catList);
          // Set default category for form if available
          const firstNeg = catList.find(c => c.type === 'negative');
          if (firstNeg && !formData.category_id) {
            setFormData(prev => ({
              ...prev,
              category_id: String(firstNeg.id),
              points: firstNeg.default_points || 5
            }));
          }
        }

        if (rombelRes.status === 'fulfilled') {
          const rombelData = rombelRes.value?.data || rombelRes.value;
          setClassGroups(Array.isArray(rombelData) ? rombelData : []);
        }
      } catch (err) {
        console.error('Gagal memuat master data kesiswaan:', err);
      }
    }

    initMasterData();
  }, [activeSchoolUnit?.id, activeAcademicYear?.id]);

  // 2. Fetch Data Kejadian & Konseling
  const fetchIncidentsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        satuan_pendidikan_id: activeSchoolUnit?.id || undefined,
        type: activeTypeTab !== 'all' && activeTypeTab !== 'counseling' ? activeTypeTab : undefined,
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
        handling_status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery || undefined
      };

      const promises = [incidentService.getIncidents(params)];

      // Jika user punya hak akses BK dan membuka tab BK/all, fetch konseling
      if (canAccessBK) {
        promises.push(
          incidentService.getCounselingRecords({
            satuan_pendidikan_id: activeSchoolUnit?.id || undefined
          }).catch(() => ({ data: [] }))
        );
      }

      const [incRes, cslRes] = await Promise.all(promises);

      const incData = incRes?.data || incRes;
      setIncidents(Array.isArray(incData) ? incData : []);

      if (cslRes) {
        const cslData = cslRes?.data || cslRes;
        setCounselingList(Array.isArray(cslData) ? cslData : []);
      }
    } catch (err) {
      console.error('Gagal memuat catatan kejadian santri:', err);
      setError(err?.message || 'Gagal memuat data kejadian santri. Periksa koneksi Anda.');
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [activeSchoolUnit?.id, activeTypeTab, selectedCategory, selectedStatus, searchQuery, canAccessBK]);

  useEffect(() => {
    fetchIncidentsData();
  }, [fetchIncidentsData]);

  // 3. Load Santri untuk Form Picker Cepat
  useEffect(() => {
    async function loadStudents() {
      if (classGroups.length === 0) return;
      try {
        const allPromises = classGroups.slice(0, 8).map(cg =>
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
      } catch (err) {
        console.error('Gagal memuat daftar santri:', err);
      }
    }
    loadStudents();
  }, [classGroups]);

  // Filtered Students Picker
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

  // Metrik Statistik Terpadu (4 Top KPI Cards)
  const metrics = useMemo(() => {
    const negativeIncidents = incidents.filter(i => i.type === 'negative');
    const positiveIncidents = incidents.filter(i => i.type === 'positive');

    const openCases = incidents.filter(i => i.handling_status === 'reported' || i.handling_status === 'open').length;
    const inProgressCases = incidents.filter(i => i.handling_status === 'in_progress').length;

    const totalNegativePoints = negativeIncidents.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
    const totalPositivePoints = positiveIncidents.reduce((sum, item) => sum + (Number(item.points) || 0), 0);

    const counselingCount = counselingList.length;

    return {
      openCases,
      inProgressCases,
      totalNegativePoints,
      totalPositivePoints,
      counselingCount,
      totalPelanggaran: negativeIncidents.length,
      totalPrestasi: positiveIncidents.length
    };
  }, [incidents, counselingList]);

  // Form Handlers
  const handleSelectStudent = (student) => {
    setFormData(prev => ({
      ...prev,
      student_id: student.id,
      student_name: student.full_name,
      student_nis: student.nis || student.nisn || '',
      class_group_name: student.class_group_name || student.rombel_name || ''
    }));
    setIsStudentPickerOpen(false);
  };

  const handleCategoryChange = (catId) => {
    const found = categories.find(c => String(c.id) === String(catId));
    setFormData(prev => ({
      ...prev,
      category_id: catId,
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

  const handleSubmitForm = async (e) => {
    if (e) e.preventDefault();
    if (!formData.student_id) {
      toast.error('Pilih santri terlebih dahulu.');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Uraian kronologi kejadian wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedCat = categories.find(c => String(c.id) === String(formData.category_id));
      const autoTitle = formData.title.trim() || selectedCat?.name || (formData.type === 'positive' ? 'Prestasi Santri' : 'Pelanggaran Disiplin');

      const payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id,
        academic_year_id: activeAcademicYear?.id,
        student_id: Number(formData.student_id),
        category_id: formData.category_id ? Number(formData.category_id) : null,
        type: formData.type,
        title: autoTitle,
        description: formData.description.trim(),
        points: Number(formData.points) || 0,
        incident_date: formData.incident_date,
        incident_time: formData.incident_time ? `${formData.incident_time}:00` : null,
        location: formData.location.trim() || null,
        handling_action: formData.action_taken.trim() || null,
        visibility_level: formData.visibility_level
      };

      await incidentService.createIncident(payload);
      toast.success('Catatan kejadian santri berhasil dilaporkan dan disimpan.');

      // Reset form
      const firstNeg = categories.find(c => c.type === 'negative');
      setFormData({
        id: null,
        student_id: '',
        student_name: '',
        student_nis: '',
        class_group_name: '',
        type: 'negative',
        category_id: firstNeg ? String(firstNeg.id) : '',
        title: '',
        description: '',
        points: firstNeg?.default_points || 5,
        incident_date: new Date().toISOString().split('T')[0],
        incident_time: new Date().toTimeString().slice(0, 5),
        location: '',
        action_taken: '',
        visibility_level: 'teachers_only'
      });
      setIsMobileFormOpen(false);
      fetchIncidentsData();
    } catch (err) {
      console.error('Gagal menyimpan kejadian santri:', err);
      toast.error(err?.message || 'Gagal menyimpan data kejadian.');
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
    if (e) e.preventDefault();
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
      toast.success('Status dan tindakan penanganan berhasil diperbarui.');
      setIsHandlingOpen(false);
      fetchIncidentsData();
    } catch (err) {
      console.error('Gagal memperbarui penanganan kejadian:', err);
      toast.error(err?.message || 'Gagal memperbarui penanganan kejadian.');
    } finally {
      setHandlingSubmitting(false);
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
      toast.error(err?.message || 'Gagal memuat rekam jejak santri.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Filtered displayed records
  const displayedRecords = useMemo(() => {
    if (activeTypeTab === 'counseling') {
      return counselingList.filter(c => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (c.student_name && c.student_name.toLowerCase().includes(q)) ||
               (c.notes && c.notes.toLowerCase().includes(q));
      });
    }

    return incidents.filter(item => {
      // Tab filter
      if (activeTypeTab === 'negative' && item.type !== 'negative') return false;
      if (activeTypeTab === 'positive' && item.type !== 'positive') return false;

      // Status filter
      if (selectedStatus !== 'all' && item.handling_status !== selectedStatus) return false;

      // Category filter
      if (selectedCategory !== 'all' && String(item.category_id) !== String(selectedCategory)) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchStudent = item.student_name && item.student_name.toLowerCase().includes(q);
        const matchTitle = item.title && item.title.toLowerCase().includes(q);
        const matchDesc = item.description && item.description.toLowerCase().includes(q);
        const matchNis = item.nis && item.nis.toLowerCase().includes(q);
        if (!matchStudent && !matchTitle && !matchDesc && !matchNis) return false;
      }

      return true;
    });
  }, [incidents, counselingList, activeTypeTab, selectedStatus, selectedCategory, searchQuery]);

  // Tab definitions with count badges
  const typeTabs = useMemo(() => {
    const base = [
      { id: 'all', label: 'Semua', count: incidents.length },
      { id: 'negative', label: 'Pelanggaran', count: metrics.totalPelanggaran, badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
      { id: 'positive', label: 'Prestasi', count: metrics.totalPrestasi, badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' }
    ];

    if (canAccessBK) {
      base.push({
        id: 'counseling',
        label: 'Konseling Privat BK',
        count: metrics.counselingCount,
        icon: LockKeyhole,
        badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
      });
    }

    return base;
  }, [incidents.length, metrics, canAccessBK]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Halaman */}
      <PageHeader
        title="Kejadian & Konseling Siswa"
        subtitle="Pencatatan rekam jejak pelanggaran disiplin santri, apresiasi prestasi, dan bimbingan konseling terintegrasi"
        breadcrumbs={[
          { label: 'Portal Guru', to: '/guru' },
          { label: 'Kesiswaan & BK' },
          { label: 'Kejadian Siswa' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Buku Pedoman Tata Tertib & Sanksi Santri 2026/2027 tersedia di menu Dokumen Sekolah.')}
              leftIcon={<BookOpen className="w-4 h-4 text-slate-500" />}
              className="text-xs min-h-[40px] hidden sm:inline-flex"
            >
              Panduan Tatib
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsMobileFormOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="text-xs min-h-[40px] xl:hidden"
            >
              + Catat Kejadian
            </Button>
          </div>
        }
      />

      {/* 2. Top 4 KPI Metric Cards (Stitch Design Hairline Accents) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Kasus Terbuka */}
        <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col justify-between overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-rose-600"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Kasus Terbuka
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
              Perlu Tindak Lanjut
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {metrics.openCases} Kasus
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Menunggu pembinaan & pemanggilan</span>
          </div>
        </div>

        {/* Metric 2: Dalam Pembinaan */}
        <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col justify-between overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-600"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dalam Pembinaan
            </span>
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {metrics.inProgressCases} Santri
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Aktif mentoring wali kelas & asrama</span>
          </div>
        </div>

        {/* Metric 3: Total Poin Semester Ini */}
        <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col justify-between overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Poin Semester Ini
            </span>
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">
              -{metrics.totalNegativePoints}
            </span>
            <span className="text-slate-400 font-medium">/</span>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              +{metrics.totalPositivePoints} Poin
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Pelanggaran Disiplin vs Prestasi
          </div>
        </div>

        {/* Metric 4: Konseling Privat Terjadwal */}
        <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col justify-between overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-400"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Konseling BK Privat
            </span>
            <LockKeyhole className="w-4 h-4 text-slate-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {canAccessBK ? `${metrics.counselingCount} Rekam Sesi` : 'Terproteksi'}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{canAccessBK ? 'Ruang Bimbingan & Konseling' : 'Akses khusus Guru BK & Kepsek'}</span>
          </div>
        </div>
      </div>

      {/* 3. Alert Notice Banner: Integrasi Wali Asrama & BK */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Info className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-slate-100 font-semibold">Integrasi Wali Asrama & BK: </strong>
            Setiap pengurangan &gt;10 poin otomatis membuat tembusan ke Mudir Kepengasuhan dan mengaktifkan notifikasi buku saku digital wali santri.
          </div>
        </div>
        <button
          type="button"
          onClick={() => toast.info('Alur Tatib: Pelaporan Guru &gt; Verifikasi Kesiswaan &gt; Pembinaan Wali Kelas/BK &gt; Pemanggilan Wali.')}
          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 flex items-center gap-1 self-end sm:self-auto"
        >
          Lihat Alur Tatib <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4. Two-Column Canvas (Left: Table Log 8 Cols | Right: Persistent Quick Form 4 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT SECTION: Data Table & Filters (8 Cols) */}
        <section className="xl:col-span-8 flex flex-col gap-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-sm">
          {/* Header Bar: Search & Select Filter */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari santri, NIS, atau kronologi..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
                />
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px] shrink-0"
              >
                <option value="all">Semua Status</option>
                <option value="reported">Dilaporkan (Open)</option>
                <option value="in_progress">Dalam Pembinaan</option>
                <option value="resolved">Selesai (Tuntas)</option>
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px] shrink-0"
              >
                <option value="all">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `[${c.code}] ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto">
              {typeTabs.map(tab => {
                const isActive = activeTypeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTypeTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0 transition-all min-h-[36px] ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-sm dark:bg-emerald-600'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.badgeColor || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table / List Records */}
          <div>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : error ? (
              <ErrorState
                title="Gagal Memuat Data Kejadian"
                message={error}
                onRetry={fetchIncidentsData}
              />
            ) : displayedRecords.length === 0 ? (
              <EmptyState
                icon={<ShieldAlert className="w-8 h-8 text-slate-400" />}
                title="Tidak Ada Catatan Kejadian"
                description={
                  searchQuery || selectedStatus !== 'all' || selectedCategory !== 'all'
                    ? 'Tidak ada kejadian yang cocok dengan filter pencarian Anda.'
                    : 'Belum ada kejadian atau prestasi santri yang dicatat pada periode ini.'
                }
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsMobileFormOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Catat Kejadian Baru
                  </Button>
                }
              />
            ) : (
              <div>
                {/* Desktop View Table (Hidden on Mobile) */}
                <div className="hidden lg:block overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 px-3">Waktu &amp; Santri</th>
                        <th className="py-2.5 px-3">Rombel</th>
                        <th className="py-2.5 px-3">Kejadian &amp; Kronologi</th>
                        <th className="py-2.5 px-3 text-center">Poin</th>
                        <th className="py-2.5 px-3">Pelapor</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs bg-white dark:bg-slate-800">
                      {displayedRecords.map((item) => {
                        const isPositive = item.type === 'positive';
                        const isCounseling = activeTypeTab === 'counseling';

                        // Initials for avatar
                        const initials = (item.student_name || 'Santri')
                          .split(' ')
                          .slice(0, 2)
                          .map(w => w[0])
                          .join('')
                          .toUpperCase();

                        const statusMap = {
                          reported: { label: 'Open', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800', dot: 'bg-rose-600' },
                          in_progress: { label: 'Pembinaan', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800', dot: 'bg-indigo-600' },
                          resolved: { label: 'Selesai', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-600' }
                        };
                        const statusObj = statusMap[item.handling_status] || { label: item.handling_status || 'Tercatat', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' };

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                            {/* Waktu & Santri */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 ${
                                  isPositive
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}>
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div
                                    onClick={() => handleOpenStudentSummary(item.student_id, item.student_name)}
                                    className="font-bold text-slate-900 dark:text-slate-100 truncate hover:text-emerald-600 cursor-pointer"
                                  >
                                    {item.student_name || 'Santri'}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    NIS: {item.nis || '-'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Rombel */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                                {item.class_group_name || 'Kelas Aktif'}
                              </span>
                            </td>

                            {/* Kejadian & Kronologi */}
                            <td className="py-3 px-3 max-w-[240px]">
                              <div className="flex flex-col gap-0.5">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                  isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                                  {item.title}
                                </span>
                                <span className="text-slate-600 dark:text-slate-400 text-xs line-clamp-1">
                                  {item.description}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatIndonesianDate(item.incident_date || item.session_date)}
                                </span>
                              </div>
                            </td>

                            {/* Poin */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {isPositive ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  +{item.points || 0} Poin
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  -{item.points || 0} Poin
                                </span>
                              )}
                            </td>

                            {/* Pelapor */}
                            <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400 text-[11px]">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.reporter_name || 'Asatidz/Piket'}
                              </div>
                              <div className="text-[10px] text-slate-400">Pengajar</div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusObj.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`}></span>
                                {statusObj.label}
                              </span>
                            </td>

                            {/* Aksi */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(item)}
                                  title="Lihat Detail Lengkap"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenStudentSummary(item.student_id, item.student_name)}
                                  title="Rekam Jejak Santri"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                  <Activity className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards (Hidden on Desktop) */}
                <div className="lg:hidden space-y-3">
                  {displayedRecords.map((item) => {
                    const isPositive = item.type === 'positive';
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleOpenDetail(item)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isPositive
                            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatIndonesianDate(item.incident_date)}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {isPositive ? `+${item.points} Poin` : `-${item.points} Poin`}
                          </span>
                        </div>

                        <div className="mt-1.5">
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {item.student_name || 'Santri'}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500">
                          <span>Pelapor: {item.reporter_name || 'Ustadz/Piket'}</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                            Detail <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT SECTION: Persistent Slide-over Style Input Form Panel (4 Cols) */}
        <aside className="hidden xl:flex xl:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex-col overflow-hidden shadow-sm sticky top-20">
          {/* Form Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Catat Kejadian &amp; Perilaku
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Formulir Pelaporan Terpadu Kesiswaan &amp; BK
              </p>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmitForm} className="p-4 space-y-3.5">
            {/* Jenis Kejadian Toggle */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Jenis Laporan
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange('negative')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 min-h-[38px] ${
                    formData.type === 'negative'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Pelanggaran
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('positive')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 min-h-[38px] ${
                    formData.type === 'positive'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Prestasi
                </button>
              </div>
            </div>

            {/* Field: Pilih Santri */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Santri Terkait <span className="text-rose-600">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">Ketik Nama/NIS</span>
              </label>
              <button
                type="button"
                onClick={() => setIsStudentPickerOpen(true)}
                className="w-full px-3 py-2 text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 flex items-center justify-between min-h-[40px] focus:ring-2 focus:ring-emerald-500"
              >
                {formData.student_name ? (
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">{formData.student_name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {formData.class_group_name || 'Santri'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    Pilih santri bersangkutan...
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>

            {/* Field: Tanggal & Waktu */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Tanggal <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, incident_date: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[38px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Waktu
                </label>
                <input
                  type="time"
                  value={formData.incident_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, incident_time: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[38px]"
                />
              </div>
            </div>

            {/* Field: Kategori Kejadian */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Kategori Kejadian
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[38px]"
              >
                {categories
                  .filter(c => c.type === formData.type)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({formData.type === 'positive' ? `+${c.default_points}` : `-${c.default_points}`} Poin)
                    </option>
                  ))}
              </select>
            </div>

            {/* Field: Poin Sanksi / Penghargaan Quick Pills */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Poin Penghargaan / Sanksi</span>
                <span className="text-[10px] text-slate-400 font-normal">Sesuai Tatib</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 15, 20].map((p) => {
                  const isSelected = Number(formData.points) === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, points: p }))}
                      className={`py-1.5 rounded-lg text-xs font-bold text-center border transition-all ${
                        isSelected
                          ? formData.type === 'positive'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-500 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {formData.type === 'positive' ? `+${p}` : `-${p}`} Poin
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field: Kronologi */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Kronologi Kejadian <span className="text-rose-600">*</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {formData.description.length}/500
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Uraikan waktu, tempat, dan kronologi kejadian secara objektif..."
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
              />
            </div>

            {/* Field: Tindakan Langsung */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Tindakan Awal yang Diambil
              </label>
              <input
                type="text"
                value={formData.action_taken}
                onChange={(e) => setFormData(prev => ({ ...prev, action_taken: e.target.value }))}
                placeholder="Contoh: Dinasihati di tempat &amp; diarahkan kembali"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[38px]"
              />
            </div>

            {/* Field: Visibilitas */}
            <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Tingkat Visibilitas Catatan
              </span>
              <div className="space-y-1.5">
                <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility_level"
                    value="teachers_only"
                    checked={formData.visibility_level === 'teachers_only' || formData.visibility_level === 'public_school'}
                    onChange={() => setFormData(prev => ({ ...prev, visibility_level: 'teachers_only' }))}
                    className="mt-0.5 text-emerald-600 focus:ring-0"
                  />
                  <div className="min-w-0 text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      Publik Guru &amp; Wali Kelas
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                      Dapat dilihat oleh semua asatidz pengajar dan wali kelas santri.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility_level"
                    value="counselors_only"
                    checked={formData.visibility_level === 'counselors_only'}
                    onChange={() => setFormData(prev => ({ ...prev, visibility_level: 'counselors_only' }))}
                    className="mt-0.5 text-rose-600 focus:ring-0"
                  />
                  <div className="min-w-0 text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      Rahasia BK &amp; Manajemen
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                      Hanya dapat diakses oleh Guru BK, Kepala Sekolah, dan Mudir.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                className="w-full text-xs font-bold min-h-[40px]"
                leftIcon={<Check className="w-4 h-4" />}
              >
                Simpan Catatan Kejadian
              </Button>
            </div>
          </form>
        </aside>
      </div>

      {/* 5. Modal Picker Santri */}
      <BottomSheet
        isOpen={isStudentPickerOpen}
        onClose={() => setIsStudentPickerOpen(false)}
        title="Pilih Santri Terkait"
      >
        <div className="space-y-3 pb-6">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={studentSearchText}
              onChange={(e) => setStudentSearchText(e.target.value)}
              placeholder="Cari nama santri, NIS, atau rombel..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[40px]"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Santri tidak ditemukan.
              </div>
            ) : (
              filteredStudents.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectStudent(s)}
                  className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center justify-between min-h-[44px]"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{s.full_name}</div>
                    <div className="text-[11px] text-slate-500">NIS: {s.nis || s.nisn || '-'} • Rombel: {s.class_group_name}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))
            )}
          </div>
        </div>
      </BottomSheet>

      {/* 6. Mobile Bottom Sheet Input Form */}
      <BottomSheet
        isOpen={isMobileFormOpen}
        onClose={() => setIsMobileFormOpen(false)}
        title="Catat Kejadian &amp; Perilaku Santri"
        maxHeight="max-h-[90vh]"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 pb-8">
          {/* Jenis Kejadian */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('negative')}
              className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 min-h-[44px] ${
                formData.type === 'negative'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Pelanggaran
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('positive')}
              className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 min-h-[44px] ${
                formData.type === 'positive'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Award className="w-4 h-4 text-emerald-600" />
              Prestasi
            </button>
          </div>

          {/* Pilih Santri */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Santri Terkait *
            </label>
            <button
              type="button"
              onClick={() => setIsStudentPickerOpen(true)}
              className="w-full px-3 py-2.5 text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 flex items-center justify-between min-h-[44px]"
            >
              <span className="text-xs">{formData.student_name || 'Ketuk untuk memilih santri...'}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Kronologi */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Kronologi Kejadian *
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Uraikan detail kejadian..."
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Tombol Simpan */}
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            className="w-full text-xs font-bold min-h-[44px]"
          >
            Simpan Catatan Kejadian
          </Button>
        </form>
      </BottomSheet>

      {/* 7. Modal Detail Kejadian & Penanganan Kasus */}
      <BottomSheet
        isOpen={Boolean(selectedIncident)}
        onClose={() => setSelectedIncident(null)}
        title="Detail Catatan Kejadian Santri"
      >
        {selectedIncident && (
          <div className="space-y-4 pb-6">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {selectedIncident.student_name}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  selectedIncident.type === 'positive'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}>
                  {selectedIncident.type === 'positive' ? `+${selectedIncident.points} Poin` : `-${selectedIncident.points} Poin`}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {selectedIncident.title}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {selectedIncident.description}
              </p>
            </div>

            {/* Form Update Penanganan */}
            {canManageHandling && (
              <form onSubmit={handleSubmitHandling} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Alur Pembinaan &amp; Penanganan Kasus
                </h4>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Status Penanganan
                  </label>
                  <select
                    value={handlingForm.handling_status}
                    onChange={(e) => setHandlingForm(prev => ({ ...prev, handling_status: e.target.value }))}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[40px]"
                  >
                    <option value="reported">Dilaporkan (Menunggu)</option>
                    <option value="in_progress">Dalam Pembinaan Aktif</option>
                    <option value="resolved">Selesai / Tuntas</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Tindakan &amp; Catatan Pembinaan
                  </label>
                  <textarea
                    rows={2}
                    value={handlingForm.handling_action}
                    onChange={(e) => setHandlingForm(prev => ({ ...prev, handling_action: e.target.value }))}
                    placeholder="Tuliskan tindakan yang telah dilakukan..."
                    className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  loading={handlingSubmitting}
                  className="w-full text-xs font-bold min-h-[40px]"
                >
                  Perbarui Status Penanganan
                </Button>
              </form>
            )}
          </div>
        )}
      </BottomSheet>

      {/* 8. Modal Ringkasan Rekam Jejak Santri */}
      <BottomSheet
        isOpen={Boolean(selectedStudentForSummary)}
        onClose={() => setSelectedStudentForSummary(null)}
        title={`Rekam Jejak: ${selectedStudentForSummary?.full_name || 'Santri'}`}
      >
        <div className="space-y-3 pb-6">
          {loadingSummary ? (
            <Skeleton className="h-28 w-full rounded-xl" />
          ) : studentSummaryData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Pelanggaran</span>
                  <span className="text-base font-bold text-rose-600">
                    -{studentSummaryData.total_negative_points || 0} Poin
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Prestasi</span>
                  <span className="text-base font-bold text-emerald-600">
                    +{studentSummaryData.total_positive_points || 0} Poin
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Skor Bersih</span>
                  <span className={`text-base font-bold ${
                    (studentSummaryData.net_score || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {studentSummaryData.net_score || 0}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-4">
              Tidak ada data histori tambahan.
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
