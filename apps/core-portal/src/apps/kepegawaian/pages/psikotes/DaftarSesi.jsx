import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  FileBarChart,
  UserCheck,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  Share2
} from 'lucide-react';
import api from '../../../../shared/services/api';
import { useToast } from '../../../../shared/components/Toast';

export default function DaftarSesi() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [types, setTypes] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Create
  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [purpose, setPurpose] = useState('recruitment'); // 'recruitment' | 'employee'
  const [createForm, setCreateForm] = useState({
    test_type_id: 1,
    candidate_id: '',
    employee_id: '',
    participant_name: '',
    participant_email: '',
    duration_minutes: 30,
    assessor_notes: ''
  });

  // Modal Share Link
  const [createdSession, setCreatedSession] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchTypes();
  }, [statusFilter, typeFilter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      let url = '/kepegawaian/psychotest/sessions?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (typeFilter) url += `test_type_id=${typeFilter}&`;
      const res = await api.get(url);
      if (res.data?.success) {
        setSessions(res.data.data || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memuat daftar sesi psikotes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const res = await api.get('/kepegawaian/psychotest/types');
      if (res.data?.success) {
        setTypes(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = async () => {
    setModalCreateOpen(true);
    setPurpose('recruitment');
    setCreateForm({
      test_type_id: types[0]?.id || 1,
      candidate_id: '',
      employee_id: '',
      participant_name: '',
      participant_email: '',
      duration_minutes: 30,
      assessor_notes: ''
    });

    // Fetch Candidates & Employees
    try {
      const [candRes, empRes] = await Promise.all([
        api.get('/kepegawaian/recruitment-candidates').catch(() => ({ data: { data: [] } })),
        api.get('/kepegawaian/employees').catch(() => ({ data: { data: [] } }))
      ]);
      setCandidates(candRes.data?.data || []);
      const empList = empRes.data?.data?.items || (Array.isArray(empRes.data?.data) ? empRes.data.data : []);
      setEmployees(empList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCandidateChange = (candId) => {
    const cand = candidates.find((c) => String(c.id) === String(candId));
    if (cand) {
      setCreateForm({
        ...createForm,
        candidate_id: cand.id,
        participant_name: cand.candidate_name,
        participant_email: cand.email || '',
        assessor_notes: `Pelamar Formasi: ${cand.applied_position || '-'}`
      });
    } else {
      setCreateForm({
        ...createForm,
        candidate_id: '',
        participant_name: '',
        participant_email: ''
      });
    }
  };

  const handleEmployeeChange = (empId) => {
    const emp = employees.find((e) => String(e.id) === String(empId));
    if (emp) {
      setCreateForm({
        ...createForm,
        employee_id: emp.id,
        participant_name: emp.full_name,
        participant_email: emp.email || '',
        assessor_notes: `Pegawai NIP/Nomer: ${emp.employee_number || '-'}`
      });
    } else {
      setCreateForm({
        ...createForm,
        employee_id: '',
        participant_name: '',
        participant_email: ''
      });
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        test_type_id: parseInt(createForm.test_type_id, 10),
        candidate_id: purpose === 'recruitment' && createForm.candidate_id ? parseInt(createForm.candidate_id, 10) : null,
        employee_id: purpose === 'employee' && createForm.employee_id ? parseInt(createForm.employee_id, 10) : null,
        participant_name: createForm.participant_name,
        participant_email: createForm.participant_email || null,
        duration_minutes: parseInt(createForm.duration_minutes || 30, 10),
        assessor_notes: createForm.assessor_notes || null
      };

      const res = await api.post('/kepegawaian/psychotest/sessions', payload);
      if (res.data?.success) {
        showToast('Sesi psikotes baru berhasil dijadwalkan', 'success');
        setModalCreateOpen(false);
        setCreatedSession(res.data.data);
        fetchSessions();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menjadwalkan sesi', 'error');
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus sesi psikotes ini?')) return;
    try {
      await api.delete(`/kepegawaian/psychotest/sessions/${id}`);
      showToast('Sesi psikotes berhasil dihapus', 'success');
      fetchSessions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus sesi', 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    showToast('Tautan ujian berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedToken(false), 3000);
  };

  const getPublicExamLink = (token) => {
    const origin = window.location.origin;
    return `${origin}/kepegawaian/psikotes/isi/${token}`;
  };

  // Metrics
  const totalCount = sessions.length;
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const scheduledCount = sessions.filter((s) => s.status === 'scheduled').length;
  const inProgressCount = sessions.filter((s) => s.status === 'in_progress').length;

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.participant_name?.toLowerCase().includes(q) ||
      s.session_code?.toLowerCase().includes(q) ||
      s.participant_email?.toLowerCase().includes(q) ||
      s.candidate_name?.toLowerCase().includes(q) ||
      s.employee_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CalendarClock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Daftar Sesi & Pelaksanaan Psikotes</h1>
          </div>
          <p className="text-sm text-slate-500">
            Jadwalkan sesi asesmen untuk calon pelamar rekrutmen atau pegawai, pantau progres, dan lihat laporan hasil.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          Jadwalkan Sesi Baru
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Sesi</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <CalendarClock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Selesai Dinilai</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Sedang Dikerjakan</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{inProgressCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Terjadwal (Menunggu)</span>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{scheduledCount}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari peserta, token, atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">Semua Status</option>
            <option value="scheduled">Terjadwal</option>
            <option value="in_progress">Sedang Dikerjakan</option>
            <option value="completed">Selesai</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">Semua Instrumen</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Peserta & Peruntukan</th>
                <th className="py-3.5 px-4 w-36">Tipe Instrumen</th>
                <th className="py-3.5 px-4 w-44">Kode Token Akses</th>
                <th className="py-3.5 px-4 w-28 text-center">Status</th>
                <th className="py-3.5 px-4 w-44">Hasil Evaluasi</th>
                <th className="py-3.5 px-4 w-36 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat data sesi...
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada sesi psikotes yang dijadwalkan.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-slate-900">{s.participant_name}</span>
                        {s.candidate_id ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            Pelamar
                          </span>
                        ) : s.employee_id ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                            Pegawai
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            Umum
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{s.participant_email || 'Tanpa email terdaftar'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">
                        {s.test_type_code === 'mbti' ? 'MBTI (4 Sumbu)' : 'Big Five (OCEAN)'}
                      </span>
                      <span className="text-[10px] text-slate-400">Durasi: {s.duration_minutes} Menit</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {s.session_code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(getPublicExamLink(s.session_code))}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-all"
                          title="Salin Link Ujian"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Selesai
                        </span>
                      ) : s.status === 'in_progress' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" /> Dikerjakan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          <AlertCircle className="w-3 h-3" /> Terjadwal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {s.result_code ? (
                        <div>
                          <span className="font-mono font-bold text-indigo-600 block">{s.result_code}</span>
                          <span className="text-[10px] text-slate-500 line-clamp-1">{s.result_label}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum ada skor</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {s.status === 'completed' ? (
                          <Link
                            to={`/kepegawaian/psikotes/laporan/${s.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
                          >
                            <FileBarChart className="w-3.5 h-3.5" /> Laporan
                          </Link>
                        ) : (
                          <button
                            onClick={() => copyToClipboard(getPublicExamLink(s.session_code))}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                          >
                            <Share2 className="w-3.5 h-3.5" /> Salin Link
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSession(s.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-all"
                          title="Hapus Sesi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Jadwalkan Sesi Baru */}
      {modalCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Jadwalkan Sesi Asesmen Psikotes</h3>
              <button
                onClick={() => setModalCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Purpose Switch */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Peruntukan Peserta *</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setPurpose('recruitment');
                      setCreateForm({ ...createForm, candidate_id: '', employee_id: '' });
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      purpose === 'recruitment' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Pelamar Rekrutmen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPurpose('employee');
                      setCreateForm({ ...createForm, candidate_id: '', employee_id: '' });
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      purpose === 'employee' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Pegawai Aktif
                  </button>
                </div>
              </div>

              {/* Test Type */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipe Instrumen Tes *</label>
                <select
                  value={createForm.test_type_id}
                  onChange={(e) => setCreateForm({ ...createForm, test_type_id: e.target.value })}
                  required
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.duration_minutes} Menit)
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Target Selection */}
              {purpose === 'recruitment' ? (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pilih Kandidat Pelamar</label>
                  <select
                    value={createForm.candidate_id}
                    onChange={(e) => handleCandidateChange(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">-- Pilih dari database pelamar --</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.candidate_name} - {c.applied_position} ({c.selection_stage})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pilih Pegawai Aktif</label>
                  <select
                    value={createForm.employee_id}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">-- Pilih dari data pegawai --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap Peserta *</label>
                  <input
                    type="text"
                    value={createForm.participant_name}
                    onChange={(e) => setCreateForm({ ...createForm, participant_name: e.target.value })}
                    required
                    placeholder="Nama peserta..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Peserta</label>
                  <input
                    type="email"
                    value={createForm.participant_email}
                    onChange={(e) => setCreateForm({ ...createForm, participant_email: e.target.value })}
                    placeholder="peserta@gmail.com"
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Asesor / Formasi</label>
                <textarea
                  rows={2}
                  value={createForm.assessor_notes}
                  onChange={(e) => setCreateForm({ ...createForm, assessor_notes: e.target.value })}
                  placeholder="Catatan tujuan asesmen atau formasi penempatan..."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 shadow-sm"
                >
                  Generate Sesi & Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Share Token & Link Siap Dikirim */}
      {createdSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Sesi Psikotes Berhasil Dibuat!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tautan ujian publik berikut siap dikirimkan kepada peserta untuk langsung mengerjakan tanpa perlu login akun.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Nama Peserta:</span>
                <span className="font-bold text-slate-800">{createdSession.participant_name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Kode Token:</span>
                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {createdSession.session_code}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tautan Ujian Siap Salin
                </span>
                <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={getPublicExamLink(createdSession.session_code)}
                    className="w-full text-[11px] text-slate-700 bg-transparent outline-none font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(getPublicExamLink(createdSession.session_code))}
                    className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded hover:bg-indigo-700 shrink-0 flex items-center gap-1"
                  >
                    {copiedToken ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedToken ? 'Disalin' : 'Salin'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setCreatedSession(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
