import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../shared/store/AuthContext';
import api from '../../../../shared/services/api';
import StatusPill from '../../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../../shared/components/FlatAlertBanner';
import {
  UserCircle,
  Lock,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Building,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Loader2,
  HelpCircle
} from 'lucide-react';

export default function ProfilSaya() {
  const { user, activeSchoolUnit } = useAuth();

  const [activeTab, setActiveTab] = useState('profil'); // 'profil' | 'password' | 'penugasan'
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form Identitas Pribadi (Yang boleh diedit mandiri oleh Guru)
  const [profileData, setProfileData] = useState({
    full_name: '',
    academic_title: '',
    nik: '',
    phone_number: '',
    email: '',
    address: '',
    birth_place: '',
    birth_date: '',
    gender: 'L',
    religion: 'Islam',
    marital_status: 'menikah',
    photo_url: '',
    // Data terproteksi yayasan (Read-Only)
    employee_number: '',
    nip: '',
    nuptk: '',
    current_position_name: 'Guru Mata Pelajaran',
    employment_status: 'GTY (Guru Tetap Yayasan)'
  });

  // Form Ganti Password
  const [showPassword, setShowPassword] = useState(false);
  const [passForm, setPassForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Load Employee Data
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        if (user?.ref_id) {
          const res = await api.get(`/kepegawaian/employees/${user.ref_id}`).catch(() => null);
          const emp = res?.data?.data;
          if (emp) {
            setProfileData({
              full_name: emp.full_name || user.full_name || '',
              academic_title: emp.academic_title || 'S.Pd.',
              nik: emp.nik || '',
              phone_number: emp.phone_number || '',
              email: emp.email || user.email || '',
              address: emp.address || '',
              birth_place: emp.birth_place || 'Bogor',
              birth_date: emp.birth_date ? emp.birth_date.split('T')[0] : '1990-05-15',
              gender: emp.gender || 'L',
              religion: emp.religion || 'Islam',
              marital_status: emp.marital_status || 'menikah',
              photo_url: emp.photo_url || '',
              employee_number: emp.employee_number || 'EMP-2026-008',
              nip: emp.nip || '199005152026011001',
              nuptk: emp.nuptk || '8945768670130002',
              current_position_name: emp.position_name || 'Guru Mata Pelajaran',
              employment_status: emp.employment_status || 'GTY (Guru Tetap Yayasan)'
            });
          }
        } else {
          // Fallback dari user context
          setProfileData((prev) => ({
            ...prev,
            full_name: user?.full_name || 'Ustadz Ahmad Fauzi, S.Pd.',
            email: user?.email || 'ahmad.fauzi@aldepos.sch.id',
            phone_number: '081298765432',
            nik: '3201011505900003',
            address: 'Komplek Perumahan Asatidz Aldepos No. 12, Bogor'
          }));
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Handle Simpan Profil Identitas Pribadi
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const payload = {
        nik: profileData.nik,
        academic_title: profileData.academic_title,
        phone_number: profileData.phone_number,
        email: profileData.email,
        address: profileData.address,
        birth_place: profileData.birth_place,
        birth_date: profileData.birth_date,
        gender: profileData.gender,
        religion: profileData.religion,
        marital_status: profileData.marital_status,
        photo_url: profileData.photo_url
      };

      const res = await api.put('/kepegawaian/employees/me/profile', payload);
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: 'Data identitas pribadi Anda berhasil diperbarui.'
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal memperbarui profil. Periksa koneksi data.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Ganti Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (passForm.new_password !== passForm.confirm_password) {
      setFeedback({ type: 'error', message: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    if (passForm.new_password.length < 6) {
      setFeedback({ type: 'error', message: 'Password baru minimal 6 karakter.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.put('/core/users/change-password', {
        old_password: passForm.old_password,
        new_password: passForm.new_password
      });

      if (res.data?.success || res.status === 200) {
        setFeedback({
          type: 'success',
          message: 'Kata sandi Anda berhasil diubah. Silakan gunakan sandi baru untuk login berikutnya.'
        });
        setPassForm({ old_password: '', new_password: '', confirm_password: '' });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal mengubah password. Pastikan kata sandi lama benar.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
      
      {/* Header Halaman */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-700/25 border border-slate-700">
            <UserCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">Profil & Keamanan Akun Guru</h1>
            <p className="text-xs text-slate-400">
              Pengelolaan data diri mandiri dan pembaruan kata sandi akun SSO
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
          <button
            onClick={() => setActiveTab('profil')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'profil' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Identitas Pribadi
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'password' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ganti Password
          </button>
          <button
            onClick={() => setActiveTab('penugasan')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'penugasan' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Data Yayasan
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* TAB 1: IDENTITAS PRIBADI MANDIRI */}
      {activeTab === 'profil' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Formulir Identitas Pribadi</h2>
              <p className="text-xs text-slate-400">
                Data di bawah ini dapat Anda ubah dan perbarui secara mandiri
              </p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              Self-Service Aktif
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  disabled
                  value={profileData.full_name}
                  className="w-full px-3 py-2 text-xs bg-slate-800/60 border border-slate-700/60 rounded-xl text-slate-400 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Nama resmi terhubung dengan SK Yayasan</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Gelar Akademik</label>
                <input
                  type="text"
                  value={profileData.academic_title}
                  onChange={(e) => setProfileData({ ...profileData, academic_title: e.target.value })}
                  placeholder="Contoh: S.Pd., M.Pd."
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">NIK (Nomor Induk Kependudukan)</label>
                <input
                  type="text"
                  maxLength={16}
                  value={profileData.nik}
                  onChange={(e) => setProfileData({ ...profileData, nik: e.target.value })}
                  placeholder="16 Digit NIK KTP..."
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nomor Kontak / WhatsApp</label>
                <input
                  type="tel"
                  value={profileData.phone_number}
                  onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Alamat Email Pribadi / Kerja</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="nama@aldepos.sch.id"
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Jenis Kelamin</label>
                <select
                  value={profileData.gender}
                  onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="L">Laki-laki (Ikhwan / Asatidz)</option>
                  <option value="P">Perempuan (Akhwat / Ustadzah)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={profileData.birth_place}
                  onChange={(e) => setProfileData({ ...profileData, birth_place: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={profileData.birth_date}
                  onChange={(e) => setProfileData({ ...profileData, birth_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status Perkawinan</label>
                <select
                  value={profileData.marital_status}
                  onChange={(e) => setProfileData({ ...profileData, marital_status: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="menikah">Menikah</option>
                  <option value="lajang">Belum Menikah</option>
                  <option value="duda">Duda</option>
                  <option value="janda">Janda</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Foto Profil URL</label>
                <input
                  type="text"
                  value={profileData.photo_url}
                  onChange={(e) => setProfileData({ ...profileData, photo_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Alamat Domisili Lengkap</label>
              <textarea
                rows={2}
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                placeholder="Alamat tempat tinggal saat ini..."
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition active:scale-95 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Pembaruan Identitas</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: GANTI PASSWORD */}
      {activeTab === 'password' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Ganti Kata Sandi (Password)</h2>
              <p className="text-xs text-slate-400">Amankan akun Anda dengan kata sandi yang kuat</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Kata Sandi Saat Ini</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passForm.old_password}
                  onChange={(e) => setPassForm({ ...passForm, old_password: e.target.value })}
                  placeholder="Masukkan sandi lama Anda..."
                  className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Kata Sandi Baru</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passForm.new_password}
                onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
                placeholder="Minimal 6 karakter..."
                className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Konfirmasi Kata Sandi Baru</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passForm.confirm_password}
                onChange={(e) => setPassForm({ ...passForm, confirm_password: e.target.value })}
                placeholder="Ulangi sandi baru..."
                className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Perbarui Kata Sandi</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: DATA TERPROTEKSI YAYASAN */}
      {activeTab === 'penugasan' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Data Kepegawaian & Penugasan Yayasan</h2>
              <p className="text-xs text-slate-400">
                Bidang di bawah ini bersifat terkunci dan hanya dapat diubah oleh Admin Yayasan / HRD
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Satuan Pendidikan</span>
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-sm font-bold text-white">{activeSchoolUnit?.name || 'Aldepos IBS'}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Nomor Induk Pegawai (NIP)</span>
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-sm font-bold font-mono text-emerald-400">{profileData.nip || '-'}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>NUPTK Kemenag / Kemdikbud</span>
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-sm font-bold font-mono text-blue-400">{profileData.nuptk || '-'}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Status Kepegawaian</span>
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-sm font-bold text-purple-400">{profileData.employment_status || 'GTY'}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 sm:col-span-2">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Jabatan Struktural / Fungsional</span>
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-sm font-bold text-white">{profileData.current_position_name}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
