import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Award,
  Plus,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function Quality() {
  const [activeTab, setActiveTab] = useState('kpi'); // 'kpi' | 'evadir' | 'accreditation' | 'risks'
  const [loading, setLoading] = useState(false);
  const [kpiList, setKpiList] = useState([]);
  const [evadirList, setEvadirList] = useState([]);
  const [accreditationList, setAccreditationList] = useState([]);
  const [risksList, setRisksList] = useState([]);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create_kpi');
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'kpi') {
        const res = await api.get('/api/v1/manajemen/quality-indicators/dashboard');
        setKpiList(res.data.data || []);
      } else if (activeTab === 'evadir') {
        const res = await api.get('/api/v1/manajemen/self-evaluations');
        setEvadirList(res.data.data || []);
      } else if (activeTab === 'accreditation') {
        const res = await api.get('/api/v1/manajemen/accreditation-reports');
        setAccreditationList(res.data.data || []);
      } else if (activeTab === 'risks') {
        const res = await api.get('/api/v1/manajemen/school-risks');
        setRisksList(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching quality data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleOpenCreate = () => {
    setError(null);
    if (activeTab === 'kpi') {
      setModalType('create_kpi');
      setFormData({
        code: 'KPI-MUTU-01',
        name: '',
        category: 'akademik',
        unit_of_measure: 'poin',
        target_value: 85,
        data_source_module: 'akademik',
      });
    } else if (activeTab === 'evadir') {
      setModalType('create_evadir');
      setFormData({
        period_year: 2026,
        standard_component: 'Standar Proses Pembelajaran',
        score: 85,
        notes: '',
      });
    } else if (activeTab === 'accreditation') {
      setModalType('create_accreditation');
      setFormData({
        accreditation_year: 2026,
        standard_code: 'STD-01-KOMPETENSI-LULUSAN',
        description: '',
      });
    } else {
      setModalType('create_risk');
      setFormData({
        title: '',
        category: 'sarpras',
        likelihood: 'medium',
        impact: 'high',
        status: 'identified',
        mitigation_plan: '',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (modalType === 'create_kpi') {
        await api.post('/api/v1/manajemen/quality-indicators', formData);
      } else if (modalType === 'create_evadir') {
        await api.post('/api/v1/manajemen/self-evaluations', formData);
      } else if (modalType === 'create_accreditation') {
        await api.post('/api/v1/manajemen/accreditation-reports', formData);
      } else if (modalType === 'create_risk') {
        await api.post('/api/v1/manajemen/school-risks', formData);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-violet-600" />
            <span>Penjaminan Mutu, Akreditasi & Risiko</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring KPI institusi, Evaluasi Diri Sekolah (Evadir), instrumen akreditasi, dan mitigasi risiko.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-950/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === 'kpi' && 'Tambah Indikator KPI'}
            {activeTab === 'evadir' && 'Input Skor Evadir'}
            {activeTab === 'accreditation' && 'Tambah Standar Akreditasi'}
            {activeTab === 'risks' && 'Catat Risiko Baru'}
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('kpi')}
          className={`pb-3 whitespace-nowrap transition relative ${
            activeTab === 'kpi'
              ? 'text-violet-600 border-b-2 border-violet-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          1. Indikator Mutu / KPI
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('evadir')}
          className={`pb-3 whitespace-nowrap transition relative ${
            activeTab === 'evadir'
              ? 'text-violet-600 border-b-2 border-violet-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          2. Evadir (Evaluasi Diri Sekolah)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('accreditation')}
          className={`pb-3 whitespace-nowrap transition relative ${
            activeTab === 'accreditation'
              ? 'text-violet-600 border-b-2 border-violet-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          3. Laporan & Bukti Akreditasi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('risks')}
          className={`pb-3 whitespace-nowrap transition relative ${
            activeTab === 'risks'
              ? 'text-violet-600 border-b-2 border-violet-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          4. Register Risiko Sekolah
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB 1: KPI */}
          {activeTab === 'kpi' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kpiList.map((kpi) => (
                <div key={kpi.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 uppercase">
                      {kpi.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 capitalize">
                      Modul: {kpi.data_source_module || 'manual'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{kpi.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">Kategori: {kpi.category}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Capaian Terkini:</span>
                      <span className="font-black text-slate-800 text-base">
                        {kpi.actual_value !== null ? kpi.actual_value : '-'} / {kpi.target_value} {kpi.unit_of_measure}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Persentase Target:</span>
                      <span className="font-bold text-violet-600 text-sm">
                        {kpi.achievement_percentage ? `${kpi.achievement_percentage}%` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: EVADIR */}
          {activeTab === 'evadir' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Komponen Standar</th>
                    <th className="py-3 px-4">Tahun Evaluasi</th>
                    <th className="py-3 px-4">Skor Mandiri</th>
                    <th className="py-3 px-4">Catatan Temuan</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evadirList.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{ev.standard_component}</td>
                      <td className="py-3.5 px-4 text-slate-600">{ev.period_year}</td>
                      <td className="py-3.5 px-4 font-bold text-violet-600">{ev.score || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{ev.notes || '-'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {ev.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: AKREDITASI */}
          {activeTab === 'accreditation' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Kode Standar</th>
                    <th className="py-3 px-4">Tahun Akreditasi</th>
                    <th className="py-3 px-4">Deskripsi / Instrumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accreditationList.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{acc.standard_code}</td>
                      <td className="py-3.5 px-4 text-slate-600">{acc.accreditation_year}</td>
                      <td className="py-3.5 px-4 text-slate-600">{acc.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: RISIKO */}
          {activeTab === 'risks' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Risiko / Isu Sekolah</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Likelihood / Impact</th>
                    <th className="py-3 px-4">Rencana Mitigasi</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {risksList.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{r.title}</td>
                      <td className="py-3.5 px-4 text-slate-600 uppercase text-[10px] font-bold">{r.category}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="capitalize">{r.likelihood}</span> / <span className="capitalize font-semibold text-rose-600">{r.impact}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{r.mitigation_plan || '-'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">
              {modalType === 'create_kpi' && 'Tambah Indikator KPI Mutu'}
              {modalType === 'create_evadir' && 'Input Skor Evadir'}
              {modalType === 'create_accreditation' && 'Tambah Standar Akreditasi'}
              {modalType === 'create_risk' && 'Catat Risiko Baru'}
            </h3>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {modalType === 'create_kpi' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kode Indikator</label>
                    <input
                      type="text"
                      required
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Indikator</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Satuan Ukur</label>
                      <input
                        type="text"
                        value={formData.unit_of_measure || ''}
                        onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                        placeholder="%, poin, dsb."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Target Nilai</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.target_value || ''}
                        onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalType === 'create_risk' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Judul Isu / Risiko</label>
                    <input
                      type="text"
                      required
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rencana Mitigasi</label>
                    <textarea
                      rows="2"
                      value={formData.mitigation_plan || ''}
                      onChange={(e) => setFormData({ ...formData, mitigation_plan: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
