import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  HeartHandshake,
  AlertTriangle,
  Award,
  ShieldAlert,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  RotateCw
} from 'lucide-react';

export default function Kesiswaan() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('disciplinary');
  const [dataList, setDataList] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Forms
  const [discForm, setDiscForm] = useState({ student_id: '', violation_type: '', points: 5, incident_date: new Date().toISOString().split('T')[0], notes: '' });
  const [achieveForm, setAchieveForm] = useState({ student_id: '', achievement_type: '', level: 'kabupaten', achieved_at: new Date().toISOString().split('T')[0], notes: '' });
  const [counselForm, setCounselForm] = useState({ student_id: '', session_date: new Date().toISOString().split('T')[0], service_type: 'Konseling Individu', notes: '', visibility_level: 'bk_only' });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Role permissions check
  const isBKRole = user?.roles?.some(r => ['super_admin', 'admin_yayasan', 'guru_bk'].includes(r)) || user?.account_type === 'admin';

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/akademik/students');
      const list = res.data?.data || [];
      setStudents(list);
      if (list.length > 0) {
        setDiscForm(prev => ({ ...prev, student_id: list[0].id }));
        setAchieveForm(prev => ({ ...prev, student_id: list[0].id }));
        setCounselForm(prev => ({ ...prev, student_id: list[0].id }));
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchTabData = async () => {
    try {
      setLoading(true);
      let endpoint = '/akademik/disciplinary-records';
      if (activeTab === 'achievements') endpoint = '/akademik/achievements';
      if (activeTab === 'counseling') endpoint = '/akademik/counseling-records';

      const res = await api.get(endpoint);
      setDataList(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveData = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      if (activeTab === 'disciplinary') {
        await api.post('/akademik/disciplinary-records', discForm);
      } else if (activeTab === 'achievements') {
        await api.post('/akademik/achievements', achieveForm);
      } else if (activeTab === 'counseling') {
        await api.post('/akademik/counseling-records', counselForm);
      }

      setSuccessMsg('Data kesiswaan berhasil disimpan!');
      setModalOpen(false);
      fetchTabData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kesiswaan & Bimbingan Konseling</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan pelanggaran disiplin & poin pelanggaran, piagam prestasi siswa, serta konseling psikososial BK.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchTabData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition active:scale-95"
            title="Segarkan Data Kesiswaan dari Database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Data</span>
          </button>
          <button
            onClick={() => { setErrorMsg(''); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>
              {activeTab === 'disciplinary' ? 'Catat Pelanggaran' :
               activeTab === 'achievements' ? 'Catat Prestasi' : 'Catat Sesi BK'}
            </span>
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('disciplinary')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'disciplinary' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Pelanggaran & Disiplin</span>
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'achievements' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Prestasi Siswa</span>
        </button>
        {isBKRole && (
          <button
            onClick={() => setActiveTab('counseling')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === 'counseling' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Bimbingan Konseling (BK)</span>
          </button>
        )}
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <span>Memuat data kesiswaan...</span>
          </div>
        ) : dataList.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            Belum ada catatan di bagian ini.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
            {activeTab === 'disciplinary' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Jenis Pelanggaran</th>
                    <th className="py-3 px-4">Poin Pelanggaran</th>
                    <th className="py-3 px-4">Catatan Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataList.map(d => (
                    <tr key={d.id}>
                      <td className="py-3 px-4 font-mono text-slate-600">{d.incident_date?.split('T')[0]}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{d.student_name}</td>
                      <td className="py-3 px-4 text-slate-700">{d.violation_type}</td>
                      <td className="py-3 px-4 font-bold text-rose-600">+{d.points} Poin</td>
                      <td className="py-3 px-4 text-slate-600">{d.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'achievements' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-3 px-4">Tanggal Prestasi</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Nama Prestasi / Lomba</th>
                    <th className="py-3 px-4">Tingkat</th>
                    <th className="py-3 px-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataList.map(a => (
                    <tr key={a.id}>
                      <td className="py-3 px-4 font-mono text-slate-600">{a.achieved_at?.split('T')[0]}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{a.student_name}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-800">{a.achievement_type}</td>
                      <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-600">{a.level || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{a.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'counseling' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-3 px-4">Tanggal Sesi</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Layanan BK</th>
                    <th className="py-3 px-4">Tingkat Kerahasiaan</th>
                    <th className="py-3 px-4">Catatan Konseling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataList.map(c => (
                    <tr key={c.id}>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.session_date?.split('T')[0]}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{c.student_name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{c.service_type}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase">
                          {c.visibility_level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{c.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal Form Tambah Data */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              {activeTab === 'disciplinary' ? 'Catat Pelanggaran Siswa' :
               activeTab === 'achievements' ? 'Catat Prestasi Siswa' : 'Catat Sesi Bimbingan Konseling'}
            </h3>

            <form onSubmit={handleSaveData} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Siswa *</label>
                <SearchableSelect
                  options={students.map(s => ({
                    value: String(s.id),
                    label: s.full_name,
                    sublabel: `NIS: ${s.nis || '-'}${s.class_group_name ? ' • ' + s.class_group_name : ''}`,
                  }))}
                  value={
                    activeTab === 'disciplinary' ? discForm.student_id :
                    activeTab === 'achievements' ? achieveForm.student_id : counselForm.student_id
                  }
                  onChange={(sid) => {
                    if (activeTab === 'disciplinary') setDiscForm({ ...discForm, student_id: sid });
                    if (activeTab === 'achievements') setAchieveForm({ ...achieveForm, student_id: sid });
                    if (activeTab === 'counseling') setCounselForm({ ...counselForm, student_id: sid });
                  }}
                  placeholder="-- Cari & Pilih Siswa --"
                  searchPlaceholder="Ketik nama atau NIS siswa..."
                  emptyText="Siswa tidak ditemukan"
                />
              </div>

              {activeTab === 'disciplinary' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jenis Pelanggaran *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Terlambat, Atribut tidak lengkap"
                      value={discForm.violation_type}
                      onChange={(e) => setDiscForm({ ...discForm, violation_type: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Poin Pelanggaran</label>
                      <input
                        type="number"
                        min="1"
                        value={discForm.points}
                        onChange={(e) => setDiscForm({ ...discForm, points: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Kejadian</label>
                      <input
                        type="date"
                        value={discForm.incident_date}
                        onChange={(e) => setDiscForm({ ...discForm, incident_date: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tindakan / Pembinaan</label>
                    <textarea
                      rows={2}
                      value={discForm.notes}
                      onChange={(e) => setDiscForm({ ...discForm, notes: e.target.value })}
                      className="w-full p-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                </>
              )}

              {activeTab === 'achievements' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Prestasi / Juara *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Juara 1 OSN Matematika"
                      value={achieveForm.achievement_type}
                      onChange={(e) => setAchieveForm({ ...achieveForm, achievement_type: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tingkat Prestasi</label>
                      <select
                        value={achieveForm.level}
                        onChange={(e) => setAchieveForm({ ...achieveForm, level: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                      >
                        <option value="sekolah">Sekolah</option>
                        <option value="kecamatan">Kecamatan</option>
                        <option value="kabupaten">Kabupaten / Kota</option>
                        <option value="provinsi">Provinsi</option>
                        <option value="nasional">Nasional</option>
                        <option value="internasional">Internasional</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Diraih</label>
                      <input
                        type="date"
                        value={achieveForm.achieved_at}
                        onChange={(e) => setAchieveForm({ ...achieveForm, achieved_at: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'counseling' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jenis Layanan BK</label>
                    <input
                      type="text"
                      value={counselForm.service_type}
                      onChange={(e) => setCounselForm({ ...counselForm, service_type: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tingkat Kerahasiaan *</label>
                    <select
                      value={counselForm.visibility_level}
                      onChange={(e) => setCounselForm({ ...counselForm, visibility_level: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="bk_only">Rahasia (Hanya Guru BK)</option>
                      <option value="bk_and_homeroom">BK dan Wali Kelas</option>
                      <option value="all_staff">Semua Guru / Staf</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Catatan Hasil Konseling *</label>
                    <textarea
                      rows={3}
                      required
                      value={counselForm.notes}
                      onChange={(e) => setCounselForm({ ...counselForm, notes: e.target.value })}
                      className="w-full p-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
