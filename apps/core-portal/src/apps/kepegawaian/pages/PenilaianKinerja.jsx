import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Award,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Star,
  TrendingUp,
  User
} from 'lucide-react';
import api from '../../../shared/services/api';

export default function PenilaianKinerja() {
  const { activeSchoolUnit } = useAuth();
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    employee_id: '',
    period_year: new Date().getFullYear(),
    score_pedagogik: 85,
    score_kepribadian: 85,
    score_sosial: 85,
    score_profesional: 85,
    notes: ''
  });

  const [employees, setEmployees] = useState([]);

  const fetchAppraisals = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let q = `?period_year=${selectedYear}`;
      if (activeSchoolUnit?.id) q += `&school_unit_id=${activeSchoolUnit.id}`;

      const res = await api.get(`/kepegawaian/performance-appraisals${q}`);
      if (res.data?.success) {
        setAppraisals(res.data.data || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat penilaian kinerja');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/kepegawaian/employees?per_page=100');
      if (res.data?.success) setEmployees(res.data.data.items || []);
    } catch (err) {}
  };

  useEffect(() => {
    fetchAppraisals();
    fetchEmployees();
  }, [activeSchoolUnit, selectedYear]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        ...form,
        period_year: parseInt(form.period_year, 10),
        score_pedagogik: parseFloat(form.score_pedagogik),
        score_kepribadian: parseFloat(form.score_kepribadian),
        score_sosial: parseFloat(form.score_sosial),
        score_profesional: parseFloat(form.score_profesional),
      };

      const res = await api.post('/kepegawaian/performance-appraisals', payload);
      if (res.data?.success) {
        setSuccessMsg('Penilaian kinerja berhasil disimpan');
        setIsModalOpen(false);
        fetchAppraisals();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan penilaian');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateAverage = (a) => {
    const total = parseFloat(a.score_pedagogik || 0) +
                  parseFloat(a.score_kepribadian || 0) +
                  parseFloat(a.score_sosial || 0) +
                  parseFloat(a.score_profesional || 0);
    return (total / 4).toFixed(1);
  };

  const getScoreGrade = (avg) => {
    if (avg >= 90) return { label: 'Sangat Baik (A)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (avg >= 80) return { label: 'Baik (B)', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    if (avg >= 70) return { label: 'Cukup (C)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Perlu Pembinaan (D)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Penilaian Kinerja (PK Guru & Pegawai)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluasi kompetensi pedagogik, kepribadian, sosial, dan profesional berkala
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAppraisals}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition text-xs shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Input Penilaian Baru</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">Tahun Periode Evaluasi:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
          >
            <option value={2026}>Tahun 2026</option>
            <option value={2025}>Tahun 2025</option>
            <option value={2024}>Tahun 2024</option>
          </select>
        </div>
        <div className="text-xs text-slate-500">
          Total Evaluasi: <span className="font-bold text-slate-700">{appraisals.length} Berkas</span>
        </div>
      </div>

      {/* Table Evaluasi */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
            <tr>
              <th className="p-3.5">Pegawai</th>
              <th className="p-3.5 text-center">Pedagogik</th>
              <th className="p-3.5 text-center">Kepribadian</th>
              <th className="p-3.5 text-center">Sosial</th>
              <th className="p-3.5 text-center">Profesional</th>
              <th className="p-3.5 text-center">Rata-rata & Predikat</th>
              <th className="p-3.5">Catatan / Rekomendasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  <span>Memuat berkas penilaian kinerja...</span>
                </td>
              </tr>
            ) : appraisals.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400">
                  Belum ada evaluasi kinerja untuk tahun {selectedYear}
                </td>
              </tr>
            ) : (
              appraisals.map((item) => {
                const avg = calculateAverage(item);
                const grade = getScoreGrade(avg);
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{item.employee_name || `Pegawai #${item.employee_id}`}</div>
                      <div className="text-[10px] text-slate-400">{item.employee_number || ''}</div>
                    </td>
                    <td className="p-3.5 text-center font-mono font-semibold text-slate-700">{item.score_pedagogik || '-'}</td>
                    <td className="p-3.5 text-center font-mono font-semibold text-slate-700">{item.score_kepribadian || '-'}</td>
                    <td className="p-3.5 text-center font-mono font-semibold text-slate-700">{item.score_sosial || '-'}</td>
                    <td className="p-3.5 text-center font-mono font-semibold text-slate-700">{item.score_profesional || '-'}</td>
                    <td className="p-3.5 text-center">
                      <div className="font-bold text-slate-800 text-sm">{avg}</div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${grade.color}`}>
                        {grade.label}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">{item.notes || '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Input Penilaian */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Input Penilaian Kinerja Pegawai</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilih Pegawai *</label>
                <select
                  required
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Pilih Pegawai</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tahun Penilaian</label>
                <input
                  type="number"
                  required
                  value={form.period_year}
                  onChange={(e) => setForm({ ...form, period_year: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Skor Pedagogik (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={form.score_pedagogik}
                    onChange={(e) => setForm({ ...form, score_pedagogik: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Skor Kepribadian (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={form.score_kepribadian}
                    onChange={(e) => setForm({ ...form, score_kepribadian: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Skor Sosial (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={form.score_sosial}
                    onChange={(e) => setForm({ ...form, score_sosial: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Skor Profesional (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={form.score_profesional}
                    onChange={(e) => setForm({ ...form, score_profesional: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Evaluasi & Rekomendasi</label>
                <textarea
                  rows="2"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan dari penilai / kepala sekolah..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-semibold">Simpan Penilaian</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
