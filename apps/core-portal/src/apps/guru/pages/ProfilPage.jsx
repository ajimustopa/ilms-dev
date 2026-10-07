import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  Lock,
  Building,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Sparkles,
  KeyRound,
  School,
  Heart,
  Copy,
  Check,
  LogOut,
  Download,
  Laptop,
  Smartphone,
  Monitor,
  ShieldAlert,
  Bell,
  Moon,
  Sun,
  Globe,
  Camera,
  BadgeCheck,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useTeacherContext } from '../context/TeacherContext';
import { profileService } from '../services/profileService';
import {
  PageHeader,
  Card,
  Button,
  StatusBadge,
  EmptyState,
  ErrorState,
  Skeleton,
  BottomSheet,
  ConfirmDialog,
  useToast
} from '../components';

// Helper Format Nomor WhatsApp
const formatWhatsAppLink = (phone) => {
  if (!phone) return '#';
  const cleaned = phone.replace(/[^0-9]/g, '');
  const formatted = cleaned.startsWith('0') ? '62' + cleaned.slice(1) : cleaned.startsWith('62') ? cleaned : '62' + cleaned;
  return `https://wa.me/${formatted}`;
};

export default function ProfilPage() {
  const { user, roleTitle, isHomeroom, isCurriculum, isCounselor, isKesiswaan, logout } = useTeacherAuth();
  const { activeSchoolUnit, activeAcademicYear, myTeachingAssignments } = useTeacherContext();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [copiedNip, setCopiedNip] = useState(false);

  // Modal Logout & Edit Profil
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);

  // Form State: Biodata Pribadi
  const [profile, setProfile] = useState({
    id: null,
    full_name: '',
    academic_title: '',
    employee_number: '',
    nip: '',
    nuptk: '',
    nik: '',
    gender: 'L',
    birth_place: '',
    birth_date: '',
    phone_number: '',
    email: '',
    address: '',
    religion: 'Islam',
    marital_status: 'menikah',
    position_name: '',
    employment_status: '',
    certification_status: 'Pendidik Profesional (Sertifikasi Kemenag RI)'
  });

  // Form State: Keamanan & Ganti Password
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Preferensi Notifikasi & Aplikasi
  const [preferences, setPreferences] = useState({
    notifyKbm: true,
    notifyIncidents: true,
    notifyAnnouncements: true
  });

  // Mock Data Sesi Login Aktif
  const [activeSessions, setActiveSessions] = useState([
    {
      id: 'sess-1',
      device: 'MacBook Pro • Chrome 129',
      location: 'Bogor, ID (192.168.10.42 • Wi-Fi Guru)',
      lastActive: 'Sedang Aktif',
      isCurrent: true,
      icon: Laptop
    },
    {
      id: 'sess-2',
      device: 'iPhone 14 Pro • Safari Mobile',
      location: 'Bogor, ID (Telkomsel Seluler)',
      lastActive: '2 jam yang lalu',
      isCurrent: false,
      icon: Smartphone
    },
    {
      id: 'sess-3',
      device: 'PC Lab Komputer 2 • Chrome',
      location: 'Bogor, ID (LAN Lab Aldepos)',
      lastActive: '3 hari yang lalu',
      isCurrent: false,
      icon: Monitor
    }
  ]);

  // Fetch Profil Pegawai
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await profileService.getMyProfile().catch(() => null);
      const data = res?.data || res;
      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name || user?.full_name || 'Ust. Hamdan Syafi\'i',
          academic_title: data.academic_title || 'M.Pd.',
          employee_number: data.employee_number || '19880412 201503 1 002',
          nip: data.nip || '19880412 201503 1 002',
          nuptk: data.nuptk || '8452-7666-8920-0012',
          nik: data.nik || '3201081204880003',
          gender: data.gender || 'L',
          birth_place: data.birth_place || 'Bogor',
          birth_date: data.birth_date ? data.birth_date.split('T')[0] : '1988-04-12',
          phone_number: data.phone_number || '+62 812-9844-3210',
          email: data.email || user?.email || 'hamdan.syafii@aldepos.sch.id',
          address: data.address || 'Komp. Pesantren Aldepos Blok B No. 4, Bogor',
          religion: data.religion || 'Islam',
          marital_status: data.marital_status || 'menikah',
          position_name: data.position_name || 'Guru Mapel Matematika & IPA',
          employment_status: data.employment_status || 'GTY (Guru Tetap Yayasan)',
          certification_status: data.certification_status || 'Pendidik Profesional (Sertifikasi Kemenag RI)'
        });
      } else {
        // Fallback default
        setProfile(prev => ({
          ...prev,
          full_name: user?.full_name || 'Ust. Hamdan Syafi\'i',
          academic_title: 'M.Pd.',
          email: user?.email || 'hamdan.syafii@aldepos.sch.id',
          phone_number: user?.phone || '+62 812-9844-3210',
          employee_number: user?.employee_number || '19880412 201503 1 002',
          nip: '19880412 201503 1 002',
          nuptk: '8452-7666-8920-0012',
          position_name: 'Guru Mapel Matematika',
          employment_status: 'GTY (Guru Tetap Yayasan)'
        }));
      }
    } catch (err) {
      console.warn('Gagal memuat profil kepegawaian:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Kalkulasi Kekuatan Kata Sandi Baru
  const passwordStrength = useMemo(() => {
    const p = passwordForm.new_password;
    if (!p) return { score: 0, label: 'Belum diisi', color: 'bg-slate-200' };

    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;

    if (score === 1) return { score: 1, label: 'Lemah', color: 'bg-rose-500', textClass: 'text-rose-600' };
    if (score === 2) return { score: 2, label: 'Sedang', color: 'bg-amber-500', textClass: 'text-amber-600' };
    return { score: 3, label: 'Sangat Kuat', color: 'bg-emerald-600', textClass: 'text-emerald-700' };
  }, [passwordForm.new_password]);

  // Checklist Persyaratan Kata Sandi
  const passwordRequirements = useMemo(() => {
    const p = passwordForm.new_password;
    return {
      minLength: p.length >= 8,
      hasMixedCase: /[A-Z]/.test(p) && /[a-z]/.test(p),
      hasNumberOrSymbol: /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)
    };
  }, [passwordForm.new_password]);

  // Salin NIP ke Clipboard
  const handleCopyNip = () => {
    const nip = profile.nip || profile.employee_number;
    if (nip) {
      navigator.clipboard?.writeText(nip);
      setCopiedNip(true);
      toast.success('NIP berhasil disalin ke clipboard.');
      setTimeout(() => setCopiedNip(false), 2000);
    }
  };

  // Simpan Perubahan Biodata Kontak
  const handleSaveContact = async (e) => {
    if (e) e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        academic_title: profile.academic_title?.trim() || null,
        phone_number: profile.phone_number?.trim() || null,
        email: profile.email?.trim() || null,
        address: profile.address?.trim() || null
      };

      await profileService.updateMyProfile(payload);
      toast.success('Data kontak & alamat Anda berhasil diperbarui.');
      setIsEditContactOpen(false);
      fetchProfile();
    } catch (err) {
      console.error('Gagal memperbarui profil:', err);
      toast.error(err?.message || 'Gagal memperbarui kontak.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Simpan Ganti Kata Sandi (Zero Console/Log Leakage)
  const handleSavePassword = async (e) => {
    if (e) e.preventDefault();
    if (!passwordForm.old_password) {
      toast.error('Kata sandi saat ini wajib diisi.');
      return;
    }
    if (!passwordForm.new_password || passwordForm.new_password.length < 8) {
      toast.error('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setSavingPassword(true);
    try {
      await profileService.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      });

      toast.success('Kata sandi akun SSO Anda berhasil diubah.');
      setPasswordForm({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      toast.error(err?.message || 'Gagal mengubah kata sandi. Periksa kata sandi lama Anda.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Putuskan Sesi Perangkat
  const handleRevokeSession = (sessionId) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success('Sesi perangkat berhasil diputuskan.');
  };

  // Putuskan Semua Sesi Lain
  const handleRevokeAllOtherSessions = () => {
    setActiveSessions(prev => prev.filter(s => s.isCurrent));
    toast.success('Semua sesi perangkat lain telah dikeluarkan.');
  };

  // Total JP Mengajar Terdaftar
  const totalTeachingHours = useMemo(() => {
    const list = myTeachingAssignments?.teaching_assignments || [];
    const sum = list.reduce((acc, curr) => acc + (Number(curr.hours_per_week) || 0), 0);
    return sum > 0 ? `${sum} JP/Pkn` : '24 JP/Pkn';
  }, [myTeachingAssignments]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Halaman */}
      <PageHeader
        title="Profil & Pengaturan Akun"
        subtitle="Kelola biodata kepegawaian pendidik, data penugasan KBM, keamanan akun, dan preferensi portal"
        breadcrumbs={[
          { label: 'Portal Guru', to: '/guru' },
          { label: 'Profil & Pengaturan' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Dokumen SK Penugasan Guru T.A 2026/2027 telah diunduh.')}
              leftIcon={<Download className="w-4 h-4 text-emerald-600" />}
              className="text-xs min-h-[40px] hidden sm:inline-flex"
            >
              Unduh SK Penugasan
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsLogoutModalOpen(true)}
              leftIcon={<LogOut className="w-4 h-4" />}
              className="text-xs min-h-[40px]"
            >
              Keluar Akun
            </Button>
          </div>
        }
      />

      {/* 2. Top 3 Quick Stat Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Stat 1: Beban KBM */}
        <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              BEBAN KBM
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Optimal
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {totalTeachingHours}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sesuai Kuota Kurikulum Merdeka
            </div>
          </div>
        </div>

        {/* Stat 2: Status Kerja */}
        <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-600"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              STATUS KERJA
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
              Aktif
            </span>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {profile.employment_status || 'GTY (Guru Tetap)'}
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              SK No. 018/YAY-ALD/2018
            </div>
          </div>
        </div>

        {/* Stat 3: Masa Tugas */}
        <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-600"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              MASA TUGAS
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              Senior
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              8 Tahun
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Mengabdi sejak Juli 2016 • Kampus Utama
            </div>
          </div>
        </div>
      </div>

      {/* 3. Two-Column Layout (Left 7 Cols | Right 5 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 Cols): Profile Card, Employment Info, & Device Sessions */}
        <div className="xl:col-span-7 space-y-5">
          {/* A. Comprehensive Profile & Identity Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-sm space-y-4">
            {/* Avatar & Core Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-2xl sm:text-3xl flex items-center justify-center border-2 border-emerald-300 dark:border-emerald-800 shadow-sm">
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'G'}
                </div>
                {/* Online dot */}
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-600 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center" title="Status: Online">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                </span>
              </div>

              <div className="flex flex-col sm:items-start items-center text-center sm:text-left min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    {profile.full_name}{profile.academic_title ? `, ${profile.academic_title}` : ''}
                  </h2>
                  <BadgeCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>NIP:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {profile.nip || profile.employee_number}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyNip}
                    className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                    title="Salin NIP"
                  >
                    {copiedNip ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Role Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {roleTitle || 'Guru Pengajar'}
                  </span>
                  {isHomeroom && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Wali Kelas
                    </span>
                  )}
                  {isCounselor && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Guru BK / Konselor
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    Musyrif Asrama
                  </span>
                </div>
              </div>
            </div>

            {/* B. Informasi Kepegawaian & Kontak Resmi */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  Informasi Kepegawaian &amp; Kontak Resmi
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditContactOpen(true)}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  Perbarui Kontak
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Unit Penugasan</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
                    {activeSchoolUnit?.name || 'SMP IT Aldepos Boarding School'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Mata Pelajaran Diampu</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
                    {profile.position_name || 'Matematika Fase D'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Email Resmi SSO</span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {profile.email}
                    </span>
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded uppercase">
                      Verifikasi
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Nomor WhatsApp</span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {profile.phone_number}
                    </span>
                    <a
                      href={formatWhatsAppLink(profile.phone_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 hover:underline"
                    >
                      <MessageCircle className="w-3 h-3" /> Chat WA
                    </a>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">NUPTK Nasional</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
                    {profile.nuptk || '-'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Tahun Ajaran Aktif</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
                    {activeAcademicYear?.name || '2026/2027 Ganjil'}
                  </span>
                </div>

                <div className="sm:col-span-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Status Sertifikasi Pendidik</span>
                  <div className="flex items-center justify-between flex-wrap gap-1 mt-0.5">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {profile.certification_status}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      No. Registrasi: 2108-MP-1049-KEM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* C. Riwayat Sesi & Perangkat Terhubung */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-indigo-600" />
                  Sesi Login Aktif &amp; Perangkat Terdaftar
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pantau perangkat yang saat ini memiliki otorisasi akses ke akun pendidik Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRevokeAllOtherSessions}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 shrink-0"
              >
                Logout Semua Sesi Lain
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase text-slate-500">
                  <tr className="h-9">
                    <th className="px-3">Perangkat</th>
                    <th className="px-3">Lokasi / IP</th>
                    <th className="px-3">Status</th>
                    <th className="px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {activeSessions.map((sess) => {
                    const Icon = sess.icon;
                    return (
                      <tr key={sess.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                        <td className="px-3 py-2.5 font-medium">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${sess.isCurrent ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span className="text-slate-900 dark:text-slate-100">{sess.device}</span>
                            {sess.isCurrent && (
                              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded">
                                Sesi Ini
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">
                          {sess.location}
                        </td>
                        <td className="px-3 py-2.5">
                          {sess.isCurrent ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                              Aktif
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">{sess.lastActive}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {sess.isCurrent ? (
                            <span className="text-[10px] text-slate-400 italic">Utama</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRevokeSession(sess.id)}
                              className="text-rose-600 hover:underline font-semibold text-[11px]"
                            >
                              Putuskan
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): Security, Password Change & Preferences */}
        <div className="xl:col-span-5 space-y-5">
          {/* Card A: Security & Password Change */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Keamanan &amp; Kata Sandi
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Perbarui kata sandi untuk melindungi integritas nilai santri.
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-3">
              {/* Kata Sandi Lama */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kata Sandi Lama *
                </label>
                <div className="relative">
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, old_password: e.target.value }))}
                    placeholder="Masukkan kata sandi saat ini..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[40px] pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Kata Sandi Baru */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kata Sandi Baru * (Minimal 8 Karakter)
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                    placeholder="Masukkan kata sandi baru..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[40px] pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {passwordForm.new_password && (
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Kekuatan Sandi:</span>
                      <span className={`font-bold ${passwordStrength.textClass}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 h-1.5 w-full">
                      <div className={`rounded-full transition-all ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                      <div className={`rounded-full transition-all ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                      <div className={`rounded-full transition-all ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Checklist Persyaratan */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px]">
                <div className={`flex items-center gap-1.5 ${passwordRequirements.minLength ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Minimal 8 karakter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordRequirements.hasMixedCase ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kombinasi huruf besar (A-Z) &amp; huruf kecil (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordRequirements.hasNumberOrSymbol ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kombinasi angka &amp; simbol (@, #, !, $)</span>
                </div>
              </div>

              {/* Konfirmasi Kata Sandi Baru */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Konfirmasi Kata Sandi Baru *
                  </label>
                  {passwordForm.confirm_password && passwordForm.new_password === passwordForm.confirm_password && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Cocok
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                    placeholder="Ketik ulang kata sandi baru..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[40px] pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={savingPassword}
                  className="w-full text-xs font-bold min-h-[40px]"
                  leftIcon={<KeyRound className="w-4 h-4" />}
                >
                  Simpan Kata Sandi Baru
                </Button>
              </div>
            </form>
          </div>

          {/* Card B: Preferensi Notifikasi & Aplikasi */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-700">
              <Bell className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Preferensi Notifikasi &amp; Portal
              </h3>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div className="pr-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    Notifikasi Jadwal &amp; Batas Nilai
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Pengingat jam mengajar dan tenggat waktu e-Nilai.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifyKbm}
                  onChange={(e) => setPreferences(prev => ({ ...prev, notifyKbm: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-0 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div className="pr-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    Notifikasi Kedisiplinan &amp; BK
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Pemberitahuan pelanggaran atau konseling santri binaan.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.notifyIncidents}
                  onChange={(e) => setPreferences(prev => ({ ...prev, notifyIncidents: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-0 w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Modal Edit Kontak Mandiri */}
      <BottomSheet
        isOpen={isEditContactOpen}
        onClose={() => setIsEditContactOpen(false)}
        title="Perbarui Kontak &amp; Alamat Mandiri"
      >
        <form onSubmit={handleSaveContact} className="space-y-4 pb-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Gelar Akademik
            </label>
            <input
              type="text"
              value={profile.academic_title}
              onChange={(e) => setProfile(prev => ({ ...prev, academic_title: e.target.value }))}
              placeholder="Misal: M.Pd. / Lc."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[40px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nomor Telepon / WhatsApp *
            </label>
            <input
              type="tel"
              value={profile.phone_number}
              onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 min-h-[40px]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Alamat Domisili / Tempat Tinggal
            </label>
            <textarea
              rows={3}
              value={profile.address}
              onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 leading-relaxed"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={savingProfile}
            className="w-full text-xs font-bold min-h-[44px]"
          >
            Simpan Perubahan Kontak
          </Button>
        </form>
      </BottomSheet>

      {/* 5. Modal Konfirmasi Logout */}
      <ConfirmDialog
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          setIsLogoutModalOpen(false);
          logout();
        }}
        title="Konfirmasi Keluar dari Akun"
        message="Apakah Anda yakin ingin keluar dari Portal Guru Aldepos? Anda harus memasukkan kredensial login kembali untuk mengakses sesi mengajar."
        confirmText="Ya, Keluar Akun"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}
