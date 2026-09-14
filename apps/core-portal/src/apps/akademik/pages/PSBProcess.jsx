import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';

export default function PSBProcess() {
  const { activeSchoolUnit } = useAuth();
  const [processes, setProcesses] = useState([]);
  const [schoolUnits, setSchoolUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_academic_year: '2026/2027',
    context_type: 'satuan', // 'satuan' | 'yayasan'
    status: 'draft', // 'draft' | 'open' | 'closed'
    start_date: '',
    end_date: '',
    units: [] // [{ satuan_pendidikan_id, code_prefix, target_registrants, quota_male, quota_female }]
  });

  useEffect(() => {
    fetchSchoolUnits();
    fetchProcesses();
  }, [activeSchoolUnit]);

  const fetchSchoolUnits = async () => {
    try {
      const res = await api.get('/core/school-units');
      const items = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
      setSchoolUnits(items);
    } catch (err) {
      console.warn('Failed to load school units:', err);
    }
  };

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/akademik/psb-processes');
      setProcesses(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load PSB processes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (proc = null) => {
    setErrorMsg('');
    if (proc) {
      setEditingId(proc.id);
      setFormData({
        name: proc.name || '',
        description: proc.description || '',
        target_academic_year: proc.target_academic_year || '2026/2027',
        context_type: proc.context_type || 'satuan',
        status: proc.status || 'draft',
        start_date: proc.start_date ? proc.start_date.split('T')[0] : '',
        end_date: proc.end_date ? proc.end_date.split('T')[0] : '',
        units: (proc.units || []).map((u) => ({
          satuan_pendidikan_id: u.satuan_pendidikan_id,
          code_prefix: u.code_prefix || 'PSB',
          target_registrants: u.target_registrants || 0,
          quota_male: u.quota_male || 0,
          quota_female: u.quota_female || 0
        }))
      });
    } else {
      setEditingId(null);
      const initialUnit = activeSchoolUnit?.id || (schoolUnits[0]?.id || 1);
      setFormData({
        name: `Penerimaan Murid Baru TP 2026/2027`,
        description: 'Proses seleksi penerimaan santri dan murid baru gelombang reguler.',
        target_academic_year: '2026/2027',
        context_type: 'satuan',
        status: 'draft',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        units: [
          {
            satuan_pendidikan_id: Number(initialUnit),
            code_prefix: 'PSB',
            target_registrants: 100,
            quota_male: 50,
            quota_female: 50
          }
        ]
      });
    }
    setModalOpen(true);
  };

  const handleContextChange = (ctx) => {
    if (ctx === 'yayasan') {
      // populate all units
      const allUnits = schoolUnits.map((u) => {
        const existing = formData.units.find((x) => x.satuan_pendidikan_id === u.id);
        return existing || {
          satuan_pendidikan_id: u.id,
          code_prefix: u.code || `PSB-${u.id}`,
          target_registrants: 100,
          quota_male: 50,
          quota_female: 50
        };
      });
      setFormData({ ...formData, context_type: 'yayasan', units: allUnits });
    } else {
      // single unit
      const uId = activeSchoolUnit?.id || schoolUnits[0]?.id || 1;
      const existing = formData.units.find((x) => x.satuan_pendidikan_id === Number(uId)) || {
        satuan_pendidikan_id: Number(uId),
        code_prefix: 'PSB',
        target_registrants: 100,
        quota_male: 50,
        quota_female: 50
      };
      setFormData({ ...formData, context_type: 'satuan', units: [existing] });
    }
  };

  const handleUnitFieldChange = (index, field, value) => {
    const updated = [...formData.units];
    updated[index] = {
      ...updated[index],
      [field]: field === 'code_prefix' ? value : Number(value)
    };
    setFormData({ ...formData, units: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      if (editingId) {
        await api.put(`/akademik/psb-processes/${editingId}`, formData);
        setSuccessMsg('Proses PSB berhasil diperbarui!');
      } else {
        await api.post('/akademik/psb-processes', formData);
        setSuccessMsg('Proses PSB baru berhasil dibuat!');
      }
      setModalOpen(false);
      fetchProcesses();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan proses PSB');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus periode proses PSB ini?')) return;
    try {
      await api.delete(`/akademik/psb-processes/${id}`);
      setSuccessMsg('Proses PSB berhasil dihapus');
      fetchProcesses();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus proses PSB');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </div>
            <span>Periode & Proses PSB</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola periode penerimaan murid baru (konteks satuan pendidikan maupun yayasan), kuota L/P, target, dan kode pendaftaran.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Periode PSB Baru</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Table Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Nama Periode PSB</th>
                <th className="py-3.5 px-4">Tahun Ajaran</th>
                <th className="py-3.5 px-4">Konteks</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Jadwal Pelaksanaan</th>
                <th className="py-3.5 px-4">Unit & Kuota Target</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Memuat data proses PSB...</span>
                  </td>
                </tr>
              ) : processes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400">
                    Belum ada proses PSB yang dibuat. Klik tombol di atas untuk membuat baru.
                  </td>
                </tr>
              ) : (
                processes.map((p) => {
                  const isYayasan = p.context_type === 'yayasan';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{p.description || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                        {p.target_academic_year}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isYayasan
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {isYayasan ? 'Gabungan Yayasan' : 'Per Satuan'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          p.status === 'open'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.status === 'closed'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {p.status === 'open' ? 'Buka (Aktif)' : p.status === 'closed' ? 'Ditutup' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {p.start_date ? p.start_date.split('T')[0] : '-'} s/d {p.end_date ? p.end_date.split('T')[0] : 'Selesai'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {(p.units || []).map((u) => {
                            const unitName = schoolUnits.find((s) => s.id === u.satuan_pendidikan_id)?.name || `Unit ${u.satuan_pendidikan_id}`;
                            return (
                              <div key={u.id || u.satuan_pendidikan_id} className="text-[11px] flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800">{unitName}:</span>
                                <span className="font-mono text-emerald-600 font-bold">[{u.code_prefix}]</span>
                                <span className="text-slate-400">Target: {u.target_registrants} (L: {u.quota_male} | P: {u.quota_female})</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenModal(p)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Edit Periode"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                            title="Hapus Periode"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId ? 'Edit Periode Proses PSB' : 'Buat Periode Proses PSB Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="font-semibold">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Proses PSB *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Penerimaan Santri Baru 2026/2027 Gelombang 1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran Target *</label>
                  <input
                    type="text"
                    required
                    value={formData.target_academic_year}
                    onChange={(e) => setFormData({ ...formData, target_academic_year: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="2026/2027"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Periode</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="draft">Draft (Persiapan)</option>
                    <option value="open">Open (Pendaftaran Dibuka)</option>
                    <option value="closed">Closed (Ditutup)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Konteks Proses</label>
                  <select
                    value={formData.context_type}
                    onChange={(e) => handleContextChange(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-emerald-700"
                  >
                    <option value="satuan">Per Satuan Pendidikan</option>
                    <option value="yayasan">Gabungan Seluruh Yayasan</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Buka</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Tutup</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi / Catatan Periode</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sub-form Pengaturan Unit & Kuota */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Pengaturan Kuota & Kode Awalan per Satuan Pendidikan</span>
                </h4>

                <div className="space-y-3">
                  {formData.units.map((u, idx) => {
                    const unitName = schoolUnits.find((s) => s.id === u.satuan_pendidikan_id)?.name || `Unit ID ${u.satuan_pendidikan_id}`;
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="font-bold text-slate-800 text-xs">{unitName}</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500">Prefix Nomor *</label>
                            <input
                              type="text"
                              required
                              value={u.code_prefix}
                              onChange={(e) => handleUnitFieldChange(idx, 'code_prefix', e.target.value)}
                              className="w-full text-xs rounded-lg border border-slate-300 p-1.5 font-mono font-bold uppercase"
                              placeholder="SMP"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500">Target Total</label>
                            <input
                              type="number"
                              min="0"
                              value={u.target_registrants}
                              onChange={(e) => handleUnitFieldChange(idx, 'target_registrants', e.target.value)}
                              className="w-full text-xs rounded-lg border border-slate-300 p-1.5"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500">Kuota Laki-laki</label>
                            <input
                              type="number"
                              min="0"
                              value={u.quota_male}
                              onChange={(e) => handleUnitFieldChange(idx, 'quota_male', e.target.value)}
                              className="w-full text-xs rounded-lg border border-slate-300 p-1.5"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500">Kuota Perempuan</label>
                            <input
                              type="number"
                              min="0"
                              value={u.quota_female}
                              onChange={(e) => handleUnitFieldChange(idx, 'quota_female', e.target.value)}
                              className="w-full text-xs rounded-lg border border-slate-300 p-1.5"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Simpan Periode PSB</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
