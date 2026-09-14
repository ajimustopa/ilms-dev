import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  User,
  MapPin,
  Users2,
  School,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Phone,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function CalonMuridDataLengkap() {
  const { profile, refreshProfile } = useOutletContext();
  const [activeTab, setActiveTab] = useState('biodata');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    nisn: '',
    full_name: '',
    candidate_birth_place: '',
    candidate_birth_date: '',
    candidate_gender: 'L',
    address: '',
    previous_school_name: '',
    father_name: '',
    mother_name: '',
    parent_contact: '',
    entry_type: 'reguler'
  });

  useEffect(() => {
    if (profile?.registrant) {
      const r = profile.registrant;
      setFormData({
        nisn: r.nisn || '',
        full_name: r.full_name || '',
        candidate_birth_place: r.candidate_birth_place || '',
        candidate_birth_date: r.candidate_birth_date ? r.candidate_birth_date.split('T')[0] : '',
        candidate_gender: r.candidate_gender || 'L',
        address: r.address || '',
        previous_school_name: r.previous_school_name || '',
        father_name: r.father_name || '',
        mother_name: r.mother_name || '',
        parent_contact: r.parent_contact || '',
        entry_type: r.entry_type || 'reguler'
      });
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.put('/akademik/psb-portal/me/data-lengkap', formData);
      setSuccessMsg('Data lengkap formulir calon santri berhasil disimpan!');
      if (refreshProfile) refreshProfile();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data lengkap');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'biodata', label: 'Data Diri Santri', icon: User },
    { key: 'domisili', label: 'Alamat & Domisili', icon: MapPin },
    { key: 'orangtua', label: 'Orang Tua / Wali', icon: Users2 },
    { key: 'sekolah', label: 'Riwayat Asal Sekolah', icon: School }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Formulir Data Lengkap Calon Santri
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Data ini akan disinkronisasikan ke data pokok pendidikan (Dapodik) saat Anda resmi ditempatkan.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/20 transition self-start sm:self-auto"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Data'}</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* TAB 1: BIODATA */}
          {activeTab === 'biodata' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Identitas Pribadi Calon Murid</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap Sesuai Akta Kelahiran *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Nama lengkap pendaftar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    NISN (Nomor Induk Siswa Nasional)
                  </label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="10 digit nomor NISN"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={formData.candidate_birth_place}
                    onChange={(e) => setFormData({ ...formData, candidate_birth_place: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Kota kelahiran"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={formData.candidate_birth_date}
                    onChange={(e) => setFormData({ ...formData, candidate_birth_date: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.candidate_gender}
                    onChange={(e) => setFormData({ ...formData, candidate_gender: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="L">Laki-laki (Ikhwan)</option>
                    <option value="P">Perempuan (Akhwat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jalur Masuk Pendaftaran
                  </label>
                  <select
                    value={formData.entry_type}
                    onChange={(e) => setFormData({ ...formData, entry_type: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="reguler">Siswa Baru (Reguler)</option>
                    <option value="pindahan">Siswa Pindahan</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOMISILI */}
          {activeTab === 'domisili' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Alamat Tempat Tinggal & Kontak</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap Domisili
                </label>
                <textarea
                  rows={4}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Jl. Nama Jalan, No. Rumah, RT/RW, Dusun, Kelurahan, Kecamatan, Kota/Kabupaten, Kode Pos"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  No. Handphone / WhatsApp Aktif Orang Tua
                </label>
                <input
                  type="text"
                  value={formData.parent_contact}
                  onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="0812-xxxx-xxxx"
                />
              </div>
            </div>
          )}

          {/* TAB 3: ORANG TUA */}
          {activeTab === 'orangtua' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Users2 className="w-4 h-4 text-emerald-600" />
                <span>Data Orang Tua / Wali Santri</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Ayah Kandung
                  </label>
                  <input
                    type="text"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Nama ayah kandung"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Ibu Kandung
                  </label>
                  <input
                    type="text"
                    value={formData.mother_name}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Nama ibu kandung"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ASAL SEKOLAH */}
          {activeTab === 'sekolah' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <School className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Pendidikan & Sekolah Asal</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Asal Sekolah / Madrasah Sebelumnya
                </label>
                <input
                  type="text"
                  value={formData.previous_school_name}
                  onChange={(e) => setFormData({ ...formData, previous_school_name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: SDIT Al-Hidayah Bogor / SMP Negeri 1 Cijeruk"
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4 flex justify-end border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Formulir Lengkap</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
