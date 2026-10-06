import React, { useState, useEffect, useCallback } from 'react';
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
  Heart
} from 'lucide-react';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useTeacherContext } from '../context/TeacherContext';
import { profileService } from '../services/profileService';
import {
  PageHeader,
  Card,
  Button,
  StatusBadge,
  SegmentedTabs,
  EmptyState,
  ErrorState,
  Skeleton,
  useToast
} from '../components';

export default function ProfilPage() {
  const { user, roleTitle, isHomeroom } = useTeacherAuth();
  const { activeSchoolUnit, activeAcademicYear, myTeachingAssignments } = useTeacherContext();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('biodata'); // 'biodata' | 'penugasan' | 'keamanan'
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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
    mother_name: '',
    position_name: '',
    employment_status: ''
  });

  // Form State: Keamanan & Ganti Password
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Fetch Profil Pegawai
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await profileService.getMyProfile().catch(() => null);
      const data = res?.data || res;
      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name || user?.full_name || '',
          academic_title: data.academic_title || '',
          employee_number: data.employee_number || '-',
          nip: data.nip || '-',
          nuptk: data.nuptk || '-',
          nik: data.nik || '',
          gender: data.gender || 'L',
          birth_place: data.birth_place || '',
          birth_date: data.birth_date ? data.birth_date.split('T')[0] : '',
          phone_number: data.phone_number || '',
          email: data.email || user?.email || '',
          address: data.address || '',
          religion: data.religion || 'Islam',
          marital_status: data.marital_status || 'menikah',
          mother_name: data.mother_name || '',
          position_name: data.position_name || 'Guru Pengajar',
          employment_status: data.employment_status || 'GTY (Guru Tetap Yayasan)'
        });
      } else {
        // Fallback data dari context auth
        setProfile(prev => ({
          ...prev,
          full_name: user?.full_name || 'Guru Pengajar',
          email: user?.email || '',
          phone_number: user?.phone || '',
          employee_number: user?.employee_number || '-'
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

  // Simpan Perubahan Biodata Mandiri
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        academic_title: profile.academic_title.trim() || null,
        phone_number: profile.phone_number.trim() || null,
        email: profile.email.trim() || null,
        address: profile.address.trim() || null,
        birth_place: profile.birth_place.trim() || null,
        birth_date: profile.birth_date || null,
        gender: profile.gender,
        religion: profile.religion,
        marital_status: profile.marital_status,
        mother_name: profile.mother_name.trim() || null
      };

      await profileService.updateMyProfile(payload);
      toast?.success('Data biodata dan kontak Anda berhasil diperbarui.');
      fetchProfile();
    } catch (err) {
      console.error('Gagal memperbarui profil:', err);
      toast?.error(err?.message || 'Gagal memperbarui profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Simpan Ganti Password
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.old_password) {
      toast?.error('Kata sandi saat ini wajib diisi.');
      return;
    }
    if (!passwordForm.new_password || passwordForm.new_password.length < 8) {
      toast?.error('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast?.error('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setSavingPassword(true);
    try {
      await profileService.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      });

      toast?.success('Kata sandi akun SSO Anda berhasil diubah.');
      setPasswordForm({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      console.error('Gagal mengubah password:', err);
      toast?.error(err?.message || 'Gagal mengubah kata sandi. Periksa kata sandi lama Anda.');
    } finally {
      setSavingPassword(false);
    }
  };

  const tabs = [
    { id: 'biodata', label: 'Biodata & Kontak', icon: User },
    { id: 'penugasan', label: 'Jabatan & Penugasan', icon: Briefcase },
    { id: 'keamanan', label: 'Kata Sandi & Keamanan', icon: Lock }
  ];

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Halaman */}
      <PageHeader
        title="Profil Guru & Pengaturan Akun"
        subtitle="Informasi kepegawaian, daftar penugasan KBM, dan pembaruan data mandiri"
        breadcrumbs={[
          { label: 'Portal Guru', to: '/guru' },
          { label: 'Profil Saya' }
        ]}
      />

      {/* 2. Kartu Ringkasan Guru */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xl flex items-center justify-center border border-emerald-300 dark:border-emerald-800 shadow-xs shrink-0">
            {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'G'}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="success" size="sm">
                {roleTitle || 'Guru Pengajar'}
              </StatusBadge>
              {profile.employment_status && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {profile.employment_status}
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              {profile.full_name}
              {profile.academic_title ? `, ${profile.academic_title}` : ''}
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
              <span>NIP/No. Pegawai: <strong className="font-mono text-slate-700 dark:text-slate-300">{profile.employee_number || profile.nip}</strong></span>
              <span>•</span>
              <span>{activeSchoolUnit?.name || 'Yayasan Aldepos'}</span>
            </p>
          </div>
        </div>

        <div className="sm:self-center">
          <SegmentedTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(t) => setActiveTab(t)}
            size="md"
            className="w-full sm:w-auto"
          />
        </div>
      </Card>

      {/* 3. Konten Sesuai Tab */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      ) : activeTab === 'biodata' ? (
        /* TAB 1: BIODATA & KONTAK MANDIRI */
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Informasi Biodata & Kontak Mandiri
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Perbarui nomor kontak, alamat domisili, dan data identitas pribadi Anda.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
              Self-Service Guru
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Grid Data Terproteksi Yayasan (Read-Only) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nomor Induk Pegawai (NIP)</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{profile.nip || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">NUPTK</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{profile.nuptk || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nomor KTP (NIK)</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{profile.nik || '-'}</span>
              </div>
            </div>

            {/* Field yang Dapat Diedit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Lengkap (Tanpa Gelar)
                </label>
                <input
                  type="text"
                  value={profile.full_name}
                  disabled
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 cursor-not-allowed min-h-[42px]"
                />
                <span className="text-[10px] text-slate-400">Hubungi HRD/Admin Yayasan untuk perubahan nama resmi.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Gelar Akademik
                </label>
                <input
                  type="text"
                  value={profile.academic_title}
                  onChange={(e) => setProfile(prev => ({ ...prev, academic_title: e.target.value }))}
                  placeholder="Misal: S.Pd. / Lc. / M.Pd."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
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
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Akun *
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="guru@aldepos.sch.id"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tempat Lahir
                </label>
                <input
                  type="text"
                  value={profile.birth_place}
                  onChange={(e) => setProfile(prev => ({ ...prev, birth_place: e.target.value }))}
                  placeholder="Kota kelahiran..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={profile.birth_date}
                  onChange={(e) => setProfile(prev => ({ ...prev, birth_date: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Status Pernikahan
                </label>
                <select
                  value={profile.marital_status}
                  onChange={(e) => setProfile(prev => ({ ...prev, marital_status: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                >
                  <option value="belum_menikah">Belum Menikah</option>
                  <option value="menikah">Menikah</option>
                  <option value="cerai_hidup">Cerai Hidup</option>
                  <option value="cerai_mati">Cerai Mati</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Ibu Kandung
                </label>
                <input
                  type="text"
                  value={profile.mother_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, mother_name: e.target.value }))}
                  placeholder="Nama ibu kandung..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Alamat Domisili / Tempat Tinggal
              </label>
              <textarea
                rows={2}
                value={profile.address}
                onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Alamat lengkap tempat tinggal saat ini..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={savingProfile}
                leftIcon={<Save className="w-4 h-4" />}
                className="min-h-[44px]"
              >
                {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
              </Button>
            </div>
          </form>
        </Card>
      ) : activeTab === 'penugasan' ? (
        /* TAB 2: JABATAN & PENUGASAN KBM */
        <div className="space-y-4">
          <Card className="p-4 sm:p-5 space-y-3.5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                Jabatan & Status Kepegawaian
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Surat Keputusan (SK) dan posisi penugasan resmi dari Yayasan Aldepos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Jabatan Utama</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">{profile.position_name || 'Guru Mata Pelajaran'}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Status Ikatan Kerja</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">{profile.employment_status || 'Guru Tetap Yayasan (GTY)'}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Satuan Pendidikan Aktif</span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 block">{activeSchoolUnit?.name || 'Yayasan Aldepos'}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Tahun Ajaran Aktif</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">{activeAcademicYear?.name || '2026/2027'}</span>
              </div>
            </div>
          </Card>

          {/* Rombel Perwalian (Jika Wali Kelas) */}
          {myTeachingAssignments?.homeroom_class_groups?.length > 0 && (
            <Card className="p-4 sm:p-5 space-y-3">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Rombel Perwalian (Wali Kelas)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {myTeachingAssignments.homeroom_class_groups.map((cg) => (
                  <div key={cg.id} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        Kelas {cg.name}
                      </h4>
                      <p className="text-[10px] text-indigo-700 dark:text-indigo-400">
                        Wali Kelas Tahun Ajaran Aktif
                      </p>
                    </div>
                    <StatusBadge status="info" size="sm">
                      Wali Kelas
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Daftar Penugasan Mengajar */}
          <Card className="p-4 sm:p-5 space-y-3">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Penugasan Mengajar Mapel
              </h3>
            </div>

            {myTeachingAssignments?.teaching_assignments?.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myTeachingAssignments.teaching_assignments.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">
                        {item.subject_name || item.subject_code}
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Tingkat: {item.grade_level_name || '-'} • Rombel: {item.class_group_name || '-'}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      {item.hours_per_week ? `${item.hours_per_week} Jam/Pekan` : 'Aktif'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                Belum ada penugasan mengajar mata pelajaran terdaftar untuk periode aktif ini.
              </p>
            )}
          </Card>
        </div>
      ) : (
        /* TAB 3: KEAMANAN & GANTI PASSWORD */
        <Card className="p-4 sm:p-5 space-y-4 max-w-xl">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              Perbarui Kata Sandi Akun SSO
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gunakan kata sandi kuat minimal 8 karakter yang memadukan huruf dan angka.
            </p>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Kata Sandi Saat Ini *
              </label>
              <div className="relative">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, old_password: e.target.value }))}
                  placeholder="Masukkan kata sandi lama Anda..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px] pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

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
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px] pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Ulangi Kata Sandi Baru *
              </label>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                placeholder="Ketik ulang kata sandi baru..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={savingPassword}
                leftIcon={<Lock className="w-4 h-4" />}
                className="min-h-[44px]"
              >
                {savingPassword ? 'Memproses...' : 'Ubah Kata Sandi'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
