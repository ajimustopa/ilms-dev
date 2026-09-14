import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  FileCheck2,
  Award,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Download
} from 'lucide-react';

export default function Quality() {
  const { user, schoolUnits, activeSchoolUnit } = useAuth();
  const [selectedUnitId, setSelectedUnitId] = useState(
    activeSchoolUnit?.id || (schoolUnits?.[0]?.id || 1)
  );

  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [evidences, setEvidences] = useState([]);

  // Modals
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeSchoolUnit?.id) {
      setSelectedUnitId(activeSchoolUnit.id);
    }
  }, [activeSchoolUnit]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/manajemen/accreditation-reports?school_unit_id=${selectedUnitId}`);
      if (res.data?.success) {
        const list = res.data.data || [];
        setReports(list);
        if (list.length > 0) {
          fetchEvidences(list[0].id);
          setSelectedReport(list[0]);
        } else {
          setSelectedReport(null);
          setEvidences([]);
        }
      }
    } catch (err) {
      console.error('Error fetching accreditation reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvidences = async (reportId) => {
    try {
      const res = await api.get(`/manajemen/accreditation-reports/${reportId}/evidences`);
      if (res.data?.success) {
        setEvidences(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching evidences:', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedUnitId]);

  const handleCreateReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/manajemen/accreditation-reports', {
        ...formData,
        school_unit_id: selectedUnitId,
      });
      setReportModalOpen(false);
      setFormData({});
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan laporan akreditasi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateEvidence = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    setSubmitting(true);
    try {
      await api.post(`/manajemen/accreditation-reports/${selectedReport.id}/evidences`, formData);
      setEvidenceModalOpen(false);
      setFormData({});
      fetchEvidences(selectedReport.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan butir bukti akreditasi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/60 border border-indigo-400/30">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Akreditasi Lembaga</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Manajemen instrumen akreditasi, penilaian butir standar, dan repositori bukti dukung (Evidence)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SearchableSelect
            value={selectedUnitId}
            onChange={(val) => setSelectedUnitId(Number(val))}
            className="w-56"
            options={schoolUnits?.map((unit) => ({
              value: unit.id,
              label: `${unit.name} (${unit.level})`,
            })) || []}
          />
          <button
            onClick={() => {
              setFormData({
                title: `Akreditasi ${selectedUnitId} 2026`,
                accreditation_body: 'BAN-S/M',
                period: '2026/2027',
                status: 'draft',
              });
              setReportModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
          >
            <Plus className="w-4 h-4" />
            Laporan Akreditasi Baru
          </button>
        </div>
      </div>

      {/* Reports & Evidence Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Reports List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Daftar Laporan Akreditasi ({reports.length})
          </h3>

          <div className="space-y-2.5">
            {reports.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Belum ada laporan akreditasi.</p>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => {
                    setSelectedReport(rep);
                    fetchEvidences(rep.id);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition space-y-1.5 ${
                    selectedReport?.id === rep.id
                      ? 'bg-indigo-500/10 border-indigo-500 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{rep.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold mj-badge-primary">
                      {rep.accreditation_body || 'BAN-S/M'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Periode: {rep.period || '-'}</span>
                    <span className="capitalize mj-badge-done px-2 py-0.5 rounded-full text-[10px] font-semibold">{rep.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Evidences Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Butir Instrumen & Bukti Fisik ({selectedReport?.title || 'Pilih Laporan'})
              </h3>
              <p className="text-xs text-slate-400">Daftar evidence dan dokumen pendukung per butir akreditasi</p>
            </div>

            {selectedReport && (
              <button
                onClick={() => {
                  setFormData({
                    standard_number: '1',
                    standard_name: 'Standar Kelulusan',
                    indicator_code: 'BUTIR-01',
                    indicator_name: '',
                    compliance_status: 'compliant',
                  });
                  setEvidenceModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Butir Bukti
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Standar & Butir</th>
                  <th className="p-3">Uraian Indikator Bukti</th>
                  <th className="p-3">Status Pemenuhan</th>
                  <th className="p-3">Berkas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {evidences.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Belum ada bukti dukung untuk laporan ini.
                    </td>
                  </tr>
                ) : (
                  evidences.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3">
                        <span className="font-mono text-indigo-400 font-bold block">{ev.indicator_code || '-'}</span>
                        <span className="text-slate-400 text-[11px]">{ev.standard_name || `Standar ${ev.standard_number}`}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-white block">{ev.indicator_name}</span>
                        {ev.notes && <p className="text-[11px] text-slate-400 mt-0.5">{ev.notes}</p>}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.compliance_status === 'compliant'
                              ? 'mj-badge-done'
                              : 'mj-badge-progress'
                          }`}
                        >
                          {ev.compliance_status === 'compliant' ? 'Memenuhi' : 'Belum Lengkap'}
                        </span>
                      </td>
                      <td className="p-3">
                        {ev.file_url ? (
                          <a
                            href={ev.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Buka Bukti
                          </a>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Laporan Akreditasi */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Laporan Akreditasi Baru</h3>
              <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateReport} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Laporan</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Badan Akreditasi</label>
                <input
                  type="text"
                  value={formData.accreditation_body || ''}
                  onChange={(e) => setFormData({ ...formData, accreditation_body: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Periode</label>
                <input
                  type="text"
                  value={formData.period || ''}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Evidence */}
      {evidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Tambah Butir Bukti Akreditasi</h3>
              <button onClick={() => setEvidenceModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateEvidence} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kode Butir</label>
                  <input
                    type="text"
                    required
                    value={formData.indicator_code || ''}
                    onChange={(e) => setFormData({ ...formData, indicator_code: e.target.value })}
                    placeholder="BUTIR-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Standar</label>
                  <input
                    type="text"
                    value={formData.standard_name || ''}
                    onChange={(e) => setFormData({ ...formData, standard_name: e.target.value })}
                    placeholder="Standar Kelulusan"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Uraian Indikator Bukti</label>
                <input
                  type="text"
                  required
                  value={formData.indicator_name || ''}
                  onChange={(e) => setFormData({ ...formData, indicator_name: e.target.value })}
                  placeholder="Kelengkapan dokumen kurikulum & silabus"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL File Dokumen Bukti</label>
                <input
                  type="text"
                  value={formData.file_url || ''}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEvidenceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Bukti'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
