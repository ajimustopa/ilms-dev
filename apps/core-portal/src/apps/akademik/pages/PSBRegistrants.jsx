import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  Users2,
  Plus,
  Search,
  Filter,
  Eye,
  KeyRound,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
  CalendarDays,
  Sparkles,
  DollarSign,
  Send
} from 'lucide-react';

export default function PSBRegistrants() {
  const { activeSchoolUnit } = useAuth();
  const navigate = useNavigate();

  const [registrants, setRegistrants] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [feeGroups, setFeeGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    psb_process_id: '',
    psb_group_id: '',
    status: '',
    source: '',
    search: ''
  });

  // Modal State Tambah Manual
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    psb_process_id: '',
    satuan_pendidikan_id: '',
    psb_group_id: '',
    full_name: '',
    nisn: '',
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

  // Modal Assign Group & Fee
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState(null);
  const [assignForm, setAssignForm] = useState({
    psb_group_id: '',
    fee_group_id: ''
  });
  const [savingAssign, setSavingAssign] = useState(false);

  // Modal Akun Result
  const [accountResultModal, setAccountResultModal] = useState(null);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchProcesses();
    fetchFeeGroups();
  }, []);

  useEffect(() => {
    fetchRegistrants();
  }, [filters, activeSchoolUnit]);

  useEffect(() => {
    if (filters.psb_process_id) {
      api.get('/akademik/psb-groups', { params: { psb_process_id: filters.psb_process_id } })
        .then((res) => setGroups(res.data?.data || []))
        .catch(() => setGroups([]));
    } else {
      setGroups([]);
    }
  }, [filters.psb_process_id]);

  const fetchProcesses = async () => {
    try {
      const res = await api.get('/akademik/psb-processes');
      const list = res.data?.data || [];
      setProcesses(list);
      if (list.length > 0 && !filters.psb_process_id) {
        const active = list.find((p) => p.status === 'open') || list[0];
        setFilters((prev) => ({ ...prev, psb_process_id: String(active.id) }));
      }
    } catch (err) {
      console.warn('Failed to load processes:', err);
    }
  };

  const fetchFeeGroups = async () => {
    try {
      const res = await api.get('/keuangan/fee-groups').catch(() => ({ data: { data: [] } }));
      const list = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
      setFeeGroups(list);
    } catch (err) {
      console.warn('Failed to load fee groups:', err);
    }
  };

  const fetchRegistrants = async () => {
    try {
      setLoading(true);
      const params = {
        psb_process_id: filters.psb_process_id || undefined,
        satuan_pendidikan_id: activeSchoolUnit?.id || undefined,
        psb_group_id: filters.psb_group_id || undefined,
        status: filters.status || undefined,
        source: filters.source || undefined,
        search: filters.search || undefined
      };
      const res = await api.get('/akademik/psb-registrants', { params });
      setRegistrants(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load registrants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenManualModal = () => {
    setManualForm({
      psb_process_id: filters.psb_process_id || (processes[0]?.id ? String(processes[0].id) : ''),
      satuan_pendidikan_id: activeSchoolUnit?.id || 1,
      psb_group_id: '',
      full_name: '',
      nisn: '',
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
    setManualModalOpen(true);
  };

  const handleSubmitManual = async (e) => {
    e.preventDefault();
    setSavingManual(true);
    setErrorMsg('');

    try {
      const res = await api.post('/akademik/psb-registrants', manualForm);
      setSuccessMsg('Calon murid berhasil didaftarkan secara manual!');
      setManualModalOpen(false);
      fetchRegistrants();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mendaftarkan calon murid');
    } finally {
      setSavingManual(false);
    }
  };

  const handleCreateAccount = async (regId) => {
    try {
      const res = await api.post(`/akademik/psb-registrants/${regId}/create-account`);
      setAccountResultModal(res.data?.data);
      fetchRegistrants();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat akun calon murid');
    }
  };

  const handleOpenAssignModal = (reg) => {
    setSelectedReg(reg);
    setAssignForm({
      psb_group_id: reg.psb_group_id ? String(reg.psb_group_id) : '',
      fee_group_id: reg.fee_group_id ? String(reg.fee_group_id) : ''
    });
    setAssignModalOpen(true);
  };

  const handleSubmitAssign = async (e) => {
    e.preventDefault();
    if (!selectedReg) return;
    setSavingAssign(true);
    try {
      await api.put(`/akademik/psb-registrants/${selectedReg.id}`, {
        psb_group_id: assignForm.psb_group_id ? Number(assignForm.psb_group_id) : null,
        fee_group_id: assignForm.fee_group_id ? Number(assignForm.fee_group_id) : null
      });
      setSuccessMsg('Penetapan kelompok & kelompok biaya berhasil diperbarui!');
      setAssignModalOpen(false);
      fetchRegistrants();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menetapkan kelompok');
    } finally {
      setSavingAssign(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'placed':
        return { text: 'Diterima Definitif', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'test_passed':
        return { text: 'Lulus Tes', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'testing':
        return { text: 'Tahap Tes', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'test_failed':
        return { text: 'Belum Lulus Tes', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'rejected':
        return { text: 'Ditolak', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { text: 'Terdaftar', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-2xl">
              <Users2 className="w-6 h-6" />
            </div>
            <span>Pendataan Calon Murid & Pendaftar PSB</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar seluruh calon murid yang masuk melalui website publik PPDB maupun pendaftaran offline manual oleh panitia.
          </p>
        </div>

        <button
          onClick={handleOpenManualModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-md shadow-teal-900/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Input Pendaftar Manual</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Periode PSB</label>
          <select
            value={filters.psb_process_id}
            onChange={(e) => setFilters({ ...filters, psb_process_id: e.target.value })}
            className="w-full text-xs rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {processes.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.target_academic_year})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Gelombang / Jalur</label>
          <select
            value={filters.psb_group_id}
            onChange={(e) => setFilters({ ...filters, psb_group_id: e.target.value })}
            className="w-full text-xs rounded-xl border border-slate-200 p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Semua Gelombang</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status Pendaftar</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full text-xs rounded-xl border border-slate-200 p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Semua Status</option>
            <option value="registered">Terdaftar (Registered)</option>
            <option value="testing">Tahap Tes (Testing)</option>
            <option value="test_passed">Lulus Tes (Test Passed)</option>
            <option value="test_failed">Belum Lulus (Test Failed)</option>
            <option value="placed">Diterima & Ditempatkan (Placed)</option>
            <option value="rejected">Ditolak (Rejected)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sumber Daftar</label>
          <select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            className="w-full text-xs rounded-xl border border-slate-200 p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Semua Sumber</option>
            <option value="public_website">Website Utama (PPDB Online)</option>
            <option value="manual_admin">Manual Offline (Panitia)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Cari Nama / No. Reg</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Ketik nama / no reg..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Registrants Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">No. Registrasi</th>
                <th className="py-3.5 px-4">Nama Calon Santri</th>
                <th className="py-3.5 px-4">Gender</th>
                <th className="py-3.5 px-4">Gelombang & Biaya</th>
                <th className="py-3.5 px-4">Status Tahapan</th>
                <th className="py-3.5 px-4">Akun Portal</th>
                <th className="py-3.5 px-4">Sumber</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Memuat data calon murid...</span>
                  </td>
                </tr>
              ) : registrants.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400">
                    Tidak ada data pendaftar yang cocok dengan filter di atas.
                  </td>
                </tr>
              ) : (
                registrants.map((r) => {
                  const badge = getStatusBadge(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                        {r.registration_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/akademik/psb/pendataan/${r.id}`}
                          className="font-bold text-slate-900 hover:text-teal-600 transition block"
                        >
                          {r.full_name}
                        </Link>
                        <div className="text-[10px] text-slate-400">
                          {r.previous_school_name || 'Asal sekolah belum diisi'} • NISN: {r.nisn || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        {r.candidate_gender === 'L' ? (
                          <span className="text-blue-600">Laki-laki</span>
                        ) : (
                          <span className="text-pink-600">Perempuan</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-[11px]">
                          {r.psb_group_name || <span className="text-slate-400 italic">Belum di-assign</span>}
                        </div>
                        <div className="text-[10px] text-teal-600 font-medium">
                          {r.fee_group_name_snapshot || 'Biaya Standar'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.text}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {r.user_account_id ? (
                          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Aktif (#{r.user_account_id})
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCreateAccount(r.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md border border-amber-200 transition"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Buat Akun</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[10px] text-slate-500">
                        {r.source === 'public_website' ? 'Web PPDB' : 'Manual'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenAssignModal(r)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="Assign Kelompok & Biaya"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            to={`/akademik/psb/pendataan/${r.id}`}
                            className="p-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 transition"
                            title="Lihat Detail Lengkap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
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

      {/* Modal Tambah Manual */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Input Manual Pendaftar Baru</h3>
              <button onClick={() => setManualModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitManual} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Calon Murid *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.full_name}
                    onChange={(e) => setManualForm({ ...manualForm, full_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    placeholder="Nama sesuai akta"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NISN</label>
                  <input
                    type="text"
                    value={manualForm.nisn}
                    onChange={(e) => setManualForm({ ...manualForm, nisn: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    placeholder="10 digit nomor NISN"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin *</label>
                  <select
                    value={manualForm.candidate_gender}
                    onChange={(e) => setManualForm({ ...manualForm, candidate_gender: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-bold"
                  >
                    <option value="L">Laki-laki (Ikhwan)</option>
                    <option value="P">Perempuan (Akhwat)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={manualForm.candidate_birth_place}
                    onChange={(e) => setManualForm({ ...manualForm, candidate_birth_place: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={manualForm.candidate_birth_date}
                    onChange={(e) => setManualForm({ ...manualForm, candidate_birth_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Asal Sekolah Sebelumnya</label>
                  <input
                    type="text"
                    value={manualForm.previous_school_name}
                    onChange={(e) => setManualForm({ ...manualForm, previous_school_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    placeholder="SDIT / SMP sebelumnya"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Ayah</label>
                  <input
                    type="text"
                    value={manualForm.father_name}
                    onChange={(e) => setManualForm({ ...manualForm, father_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. Kontak WhatsApp Ortu *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.parent_contact}
                    onChange={(e) => setManualForm({ ...manualForm, parent_contact: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    placeholder="0812-xxxx-xxxx"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-teal-900/20"
                >
                  {savingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Daftarkan Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assign Kelompok & Biaya */}
      {assignModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">
                Plotting Gelombang & Biaya: {selectedReg.full_name}
              </h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitAssign} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Kelompok / Gelombang</label>
                <select
                  value={assignForm.psb_group_id}
                  onChange={(e) => setAssignForm({ ...assignForm, psb_group_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">-- Pilih Gelombang --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} (Kuota: {g.quota})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Kelompok Biaya (Fee Group)</label>
                <select
                  value={assignForm.fee_group_id}
                  onChange={(e) => setAssignForm({ ...assignForm, fee_group_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">-- Standar Biaya Unit --</option>
                  {feeGroups.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} (Rp {Number(f.amount || 0).toLocaleString('id-ID')})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAssign}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-teal-900/20"
                >
                  {savingAssign ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Result Akun Terbentuk */}
      {accountResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-sm w-full p-6 border border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Akun Portal Calon Murid Dibuat!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Kredensial ini digunakan santri untuk masuk ke Portal Calon Murid.
              </p>
            </div>

            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-2 text-xs font-mono text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Username:</span>
                <span className="font-bold text-white">{accountResultModal.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Password:</span>
                <span className="font-bold text-amber-300">{accountResultModal.password}</span>
              </div>
            </div>

            <button
              onClick={() => setAccountResultModal(null)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
            >
              Tutup & Salin Info
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
