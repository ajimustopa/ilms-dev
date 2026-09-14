import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  Activity,
  Plus,
  Users,
  Clock,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  RotateCw
} from 'lucide-react';

export default function Ekstrakurikuler() {
  const [extracurriculars, setExtracurriculars] = useState([]);
  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [selectedExtra, setSelectedExtra] = useState(null);

  // Forms
  const [extraForm, setExtraForm] = useState({ satuan_pendidikan_id: 1, name: '', supervisor_employee_id: null, schedule: 'Setiap Sabtu 08.00 - 10.00' });
  const [memberForm, setMemberForm] = useState({ student_id: '', academic_year_id: 1 });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [exRes, stuRes, yrRes] = await Promise.all([
        api.get('/akademik/extracurriculars'),
        api.get('/akademik/students'),
        api.get('/akademik/academic-years'),
      ]);
      setExtracurriculars(exRes.data?.data || []);
      const stus = stuRes.data?.data || [];
      const yrs = yrRes.data?.data || [];
      setStudents(stus);
      setAcademicYears(yrs);

      if (stus.length > 0) setMemberForm(prev => ({ ...prev, student_id: stus[0].id }));
      if (yrs.length > 0) setMemberForm(prev => ({ ...prev, academic_year_id: yrs[0].id }));
    } catch (err) {
      console.error('Error fetching extracurriculars:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExtra = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await api.post('/akademik/extracurriculars', extraForm);
      setSuccessMsg('Ekstrakurikuler baru berhasil ditambahkan!');
      setCreateModalOpen(false);
      fetchInitialData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal membuat ekskul');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await api.post(`/akademik/extracurriculars/${selectedExtra.id}/members`, memberForm);
      setSuccessMsg('Anggota siswa berhasil didaftarkan ke ekskul!');
      setMemberModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mendaftarkan anggota');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manajemen Ekstrakurikuler</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola cabang minat bakat ekstrakurikuler, penugasan guru pembina, jadwal latihan, dan keanggotaan siswa.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchInitialData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition active:scale-95"
            title="Segarkan Data dari Database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Data</span>
          </button>
          <button
            onClick={() => { setErrorMsg(''); setCreateModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Ekstrakurikuler</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid Ekstrakurikuler */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-600" />
          <span>Memuat data ekstrakurikuler...</span>
        </div>
      ) : extracurriculars.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          Belum ada data ekstrakurikuler. Klik tombol "Tambah Ekstrakurikuler" di atas.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {extracurriculars.map((ex) => (
            <div key={ex.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">
                  Aktif
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-800">{ex.name}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{ex.schedule || 'Jadwal belum ditentukan'}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">Pembina:</span>
                  <span className="font-semibold text-slate-800">{ex.supervisor_name || 'Belum Ditugaskan'}</span>
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => { setSelectedExtra(ex); setErrorMsg(''); setMemberModalOpen(true); }}
                  className="w-full py-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Daftarkan Anggota Siswa</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Ekskul */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold text-slate-800">Tambah Ekstrakurikuler Baru</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExtra} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Ekstrakurikuler *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pramuka, Futsal, Tahfidz Quran"
                  value={extraForm.name}
                  onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jadwal Latihan</label>
                <input
                  type="text"
                  placeholder="Contoh: Setiap Jumat 14.00 - 16.00"
                  value={extraForm.schedule}
                  onChange={(e) => setExtraForm({ ...extraForm, schedule: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  Simpan Ekstrakurikuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Anggota */}
      {memberModalOpen && selectedExtra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold text-slate-800">
                Pendaftaran Anggota: {selectedExtra.name}
              </h3>
              <button onClick={() => setMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Siswa *</label>
                <SearchableSelect
                  options={students.map(s => ({
                    value: String(s.id),
                    label: s.full_name,
                    sublabel: `NIS: ${s.nis || '-'}${s.class_group_name ? ' • ' + s.class_group_name : ''}`,
                  }))}
                  value={memberForm.student_id}
                  onChange={(sid) => setMemberForm({ ...memberForm, student_id: sid })}
                  placeholder="-- Cari & Pilih Siswa --"
                  searchPlaceholder="Ketik nama atau NIS siswa..."
                  emptyText="Siswa tidak ditemukan"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tahun Ajaran *</label>
                <select
                  value={memberForm.academic_year_id}
                  onChange={(e) => setMemberForm({ ...memberForm, academic_year_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setMemberModalOpen(false)}
                  className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  Daftarkan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
