import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import LoadingSkeleton from '../../../shared/components/LoadingSkeleton';
import EmptyState from '../../../shared/components/EmptyState';
import {
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Building,
  CreditCard,
  Plus,
  Search,
  Eye,
  FileText,
  CornerDownRight,
  ShieldAlert,
  ArrowRight,
  CalendarDays
} from 'lucide-react';
import AcademicYearSelector from '../components/AcademicYearSelector';

export default function Withdrawals() {
  const { activeSchoolUnit } = useAuth();
  const outletContext = useOutletContext() || {};
  const selectedAcademicYear = outletContext.selectedAcademicYear || localStorage.getItem('aldepos_ppdb_selected_academic_year') || '2026/2027';
  const setSelectedAcademicYear = outletContext.setSelectedAcademicYear;
  const contextAcademicYears = outletContext.academicYears || [];

  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Lookups
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [cashAccounts, setCashAccounts] = useState([]);

  // Modal 1: Pengajuan Pengunduran Diri
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [candidateList, setCandidateList] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [refundEstimate, setRefundEstimate] = useState(null);
  const [applyForm, setApplyForm] = useState({
    reason: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    document_url: '',
    notes: ''
  });

  // Modal 2: Review / Approval
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'approved', // 'approved' | 'rejected'
    approval_notes: '',
    final_refund_amount: 0
  });

  // Modal 3: Pencairan Dana Kasir (Disbursement)
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [disburseForm, setDisburseForm] = useState({
    cash_account_id: '',
    payment_method: 'transfer',
    reference_no: '',
    notes: 'Pencairan Pengembalian Dana (Refund) PSB'
  });

  useEffect(() => {
    fetchInitial();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (selectedProgramId) {
      loadWithdrawals();
    }
  }, [selectedProgramId, statusFilter]);

  const fetchInitial = async () => {
    try {
      setLoading(true);
      const [resProg, resAccounts] = await Promise.all([
        api.get('/api/v1/psb/programs'),
        api.get('/api/v1/psb/lookups/cash-accounts')
      ]);
      const progs = resProg.data?.data || [];
      setPrograms(progs);
      if (progs.length > 0 && !selectedProgramId) {
        setSelectedProgramId(progs[0].id);
      }
      setCashAccounts(resAccounts.data?.data || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/psb/withdrawals', {
        params: {
          psb_program_id: selectedProgramId,
          status: statusFilter === 'all' ? undefined : statusFilter
        }
      });
      setWithdrawals(res.data?.data || []);
    } catch (err) {
      console.error('Error loading withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open apply modal and fetch candidate list
  const handleOpenApplyModal = async () => {
    try {
      const res = await api.get('/api/v1/psb/registrants', {
        params: { psb_program_id: selectedProgramId, limit: 100 }
      });
      const list = res.data?.data || [];
      // Candidates who paid registration or enrollment
      setCandidateList(list.filter((c) => c.status !== 'withdrawn' && c.status !== 'mundur'));
      if (list.length > 0) {
        setSelectedCandidateId(list[0].id);
        fetchRefundEstimate(list[0].id);
      }
      setApplyForm({
        reason: '',
        bank_name: 'BCA',
        bank_account_number: '',
        bank_account_holder: '',
        document_url: '',
        notes: ''
      });
      setApplyModalOpen(true);
    } catch (err) {
      alert('Gagal memuat daftar calon siswa');
    }
  };

  const fetchRefundEstimate = async (registrantId) => {
    if (!registrantId) return;
    try {
      const res = await api.get(`/api/v1/psb/registrants/${registrantId}/refund-estimate`);
      setRefundEstimate(res.data?.data);
    } catch (err) {
      console.error('Error getting refund estimate:', err);
      setRefundEstimate(null);
    }
  };

  const handleCandidateChange = (candId) => {
    setSelectedCandidateId(candId);
    fetchRefundEstimate(candId);
  };

  const handleSubmitApply = async (e) => {
    e.preventDefault();
    if (!selectedCandidateId) {
      alert('Pilih santri/murid terlebih dahulu');
      return;
    }
    try {
      await api.post(`/api/v1/psb/registrants/${selectedCandidateId}/withdraw`, applyForm);
      setApplyModalOpen(false);
      alert('Pengajuan pengunduran diri berhasil dicatat dan menunggu approval pimpinan!');
      loadWithdrawals();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengajukan pengunduran diri');
    }
  };

  // Open review modal
  const handleOpenReviewModal = (item) => {
    setSelectedWithdrawal(item);
    setReviewForm({
      status: 'approved',
      approval_notes: '',
      final_refund_amount: Number(item.estimated_refund_amount || 0)
    });
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/v1/psb/withdrawals/${selectedWithdrawal.id}/review`, reviewForm);
      setReviewModalOpen(false);
      alert(
        reviewForm.status === 'approved'
          ? 'Pengunduran diri disetujui! Slot kuota rombel kelas berhasil dilepaskan secara otomatis.'
          : 'Pengajuan pengunduran diri ditolak.'
      );
      loadWithdrawals();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui status pengunduran diri');
    }
  };

  // Open disbursement modal
  const handleOpenDisburseModal = (item) => {
    setSelectedWithdrawal(item);
    setDisburseForm({
      cash_account_id: cashAccounts[0]?.id || '',
      payment_method: 'transfer',
      reference_no: `REF-OUT-${Date.now().toString().slice(-6)}`,
      notes: `Pengembalian dana (refund) untuk ${item.full_name} (${item.registration_number})`
    });
    setDisburseModalOpen(true);
  };

  const handleSubmitDisburse = async (e) => {
    e.preventDefault();
    if (!disburseForm.cash_account_id) {
      alert('Pilih akun kas/bank pengeluaran');
      return;
    }
    try {
      await api.post(`/api/v1/psb/withdrawals/${selectedWithdrawal.id}/disburse`, disburseForm);
      setDisburseModalOpen(false);
      alert('Pencairan dana refund berhasil dicatat sebagai Kas Keluar di modul Keuangan!');
      loadWithdrawals();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses pencairan dana refund');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Summary counts
  const totalSubmissions = withdrawals.length;
  const pendingReviews = withdrawals.filter((w) => w.status === 'submitted' || w.status === 'pending').length;
  const approvedCount = withdrawals.filter((w) => w.status === 'approved').length;
  const disbursedTotal = withdrawals
    .filter((w) => w.status === 'disbursed')
    .reduce((acc, curr) => acc + Number(curr.refund_amount || curr.estimated_refund_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-slate-800 to-rose-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold tracking-wider uppercase mb-1">
            <UserMinus className="w-4 h-4" />
            <span>Tahap 7 Penerimaan Siswa Baru</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Pengunduran Diri & Pengembalian Dana (Refund)
          </h1>
          <p className="text-rose-100 text-xs mt-1 max-w-2xl">
            Akomodasi calon santri yang mengundurkan diri, hitung estimasi pengembalian dana berbasis cutoff hari tersisa, pelepasan otomatis kuota rombel kelas Akademik, serta pencairan kas keluar di Keuangan.
          </p>
        </div>

        {/* Selectors (Tahun Ajaran & Program) */}
        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 flex flex-wrap items-center gap-3">
          <AcademicYearSelector
            value={selectedAcademicYear}
            onChange={(ny) => {
              if (setSelectedAcademicYear) setSelectedAcademicYear(ny);
              localStorage.setItem('aldepos_ppdb_selected_academic_year', ny);
              window.dispatchEvent(new CustomEvent('aldepos_ppdb_academic_year_changed', { detail: ny }));
            }}
            years={contextAcademicYears}
            variant="banner"
          />

          <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
            <div className="text-xs text-rose-200 font-medium hidden sm:inline">Program:</div>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="bg-slate-900 text-white text-xs font-semibold rounded-lg px-3 py-1.5 border border-rose-500/40 focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
            >
              {programs
                .filter(p => !selectedAcademicYear || p.target_academic_year === selectedAcademicYear || programs.length <= 1)
                .map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs">
            <span>Total Pengajuan</span>
            <UserMinus className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
            {totalSubmissions}
          </div>
          <span className="text-[10px] text-slate-400">Seluruh permohonan mundur</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center text-amber-600 text-xs font-semibold">
            <span>Menunggu Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{pendingReviews}</div>
          <span className="text-[10px] text-slate-400">Butuh persetujuan pimpinan</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center text-emerald-600 text-xs font-semibold">
            <span>Disetujui (Approved)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{approvedCount}</div>
          <span className="text-[10px] text-slate-400">Kuota rombel telah dilepas</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center text-rose-600 text-xs font-semibold">
            <span>Refund Dicairkan</span>
            <DollarSign className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 mt-2">
            {formatCurrency(disbursedTotal)}
          </div>
          <span className="text-[10px] text-slate-400">Tercatat di Kas Keluar</span>
        </div>
      </div>

      {/* Main Table & Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Daftar Permohonan Pengunduran Diri
            </h2>
            <p className="text-xs text-slate-500">
              Kelola status review pimpinan dan eksekusi pencairan pengembalian dana melalui kasir.
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="submitted">Menunggu Review</option>
              <option value="approved">Disetujui (Siap Dicairkan)</option>
              <option value="disbursed">Sudah Dicairkan</option>
              <option value="rejected">Ditolak</option>
            </select>

            <button
              onClick={handleOpenApplyModal}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Input Pengunduran Diri</span>
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : withdrawals.length === 0 ? (
          <EmptyState
            icon={UserMinus}
            title="Tidak Ada Pengajuan Pengunduran Diri"
            description="Belum ada santri/calon murid yang mengajukan pengunduran diri pada program ini."
            actionLabel="Ajukan Pengunduran Diri"
            onAction={handleOpenApplyModal}
          />
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">No. Registrasi</th>
                  <th className="py-3 px-4">Nama Santri / Calon Siswa</th>
                  <th className="py-3 px-4">Alasan Mundur</th>
                  <th className="py-3 px-4">Rekening Tujuan Refund</th>
                  <th className="py-3 px-4 text-center">Estimasi Refund</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">
                      {w.registration_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{w.full_name}</div>
                      <div className="text-[11px] text-slate-400">
                        Total Biaya Masuk: {formatCurrency(w.total_paid || 0)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {w.reason}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {w.bank_name} - {w.bank_account_number}
                      </div>
                      <div className="text-[11px] text-slate-400">a.n. {w.bank_account_holder}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="font-bold text-slate-800 dark:text-slate-100">
                        {formatCurrency(w.refund_amount || w.estimated_refund_amount || 0)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ({w.refund_percentage || 0}% Cutoff)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          w.status === 'disbursed'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : w.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : w.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {w.status === 'disbursed'
                          ? 'DICAIRKAN'
                          : w.status === 'approved'
                          ? 'DISETUJUI'
                          : w.status === 'rejected'
                          ? 'DITOLAK'
                          : 'MENUNGGU REVIEW'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {w.status === 'submitted' || w.status === 'pending' ? (
                        <button
                          onClick={() => handleOpenReviewModal(w)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-semibold shadow-sm"
                        >
                          Review Approval
                        </button>
                      ) : null}

                      {w.status === 'approved' && (
                        <button
                          onClick={() => handleOpenDisburseModal(w)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold shadow-sm inline-flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Cairkan Dana</span>
                        </button>
                      )}

                      {w.status === 'disbursed' && (
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                          Ref: {w.disbursement_reference || 'Selesai'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Input Pengunduran Diri Baru */}
      {/* ========================================================================= */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title="Form Pengajuan Pengunduran Diri Santri"
        size="lg"
      >
        <form onSubmit={handleSubmitApply} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Santri / Calon Murid
            </label>
            <select
              value={selectedCandidateId}
              onChange={(e) => handleCandidateChange(e.target.value)}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              required
            >
              <option value="">-- Pilih Calon Siswa --</option>
              {candidateList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.registration_number} - {c.full_name} ({c.gender === 'L' ? 'L' : 'P'})
                </option>
              ))}
            </select>
          </div>

          {/* Live Refund Estimate Box */}
          {refundEstimate && (
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CornerDownRight className="w-4 h-4 text-rose-600" />
                <span>Kalkulasi Otomatis Kebijakan Pengembalian Dana (Refund)</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400">Total Biaya Masuk:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(refundEstimate.total_paid || 0)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Batas Waktu / Cutoff:</span>
                  <div className="font-bold text-amber-600">
                    {refundEstimate.days_before_cutoff || 0} Hari Tersisa
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Estimasi Pengembalian:</span>
                  <div className="font-extrabold text-emerald-600 text-sm">
                    {formatCurrency(refundEstimate.estimated_refund_amount || 0)}{' '}
                    <span className="text-[10px] font-normal">
                      ({refundEstimate.refund_percentage || 0}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Pengunduran Diri (Wajib)
            </label>
            <textarea
              value={applyForm.reason}
              onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              rows="2"
              placeholder="Contoh: Mengikuti perpindahan tugas orang tua ke luar kota / diterima di sekolah kedinasan"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Bank Tujuan
              </label>
              <input
                type="text"
                value={applyForm.bank_name}
                onChange={(e) => setApplyForm({ ...applyForm, bank_name: e.target.value })}
                placeholder="BCA / Mandiri / BSI"
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Rekening
              </label>
              <input
                type="text"
                value={applyForm.bank_account_number}
                onChange={(e) => setApplyForm({ ...applyForm, bank_account_number: e.target.value })}
                placeholder="1234567890"
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Pemilik Rekening
              </label>
              <input
                type="text"
                value={applyForm.bank_account_holder}
                onChange={(e) => setApplyForm({ ...applyForm, bank_account_holder: e.target.value })}
                placeholder="Sesuai buku tabungan"
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              URL Dokumen Surat Pengunduran Diri (Opsional)
            </label>
            <input
              type="text"
              value={applyForm.document_url}
              onChange={(e) => setApplyForm({ ...applyForm, document_url: e.target.value })}
              placeholder="https://..."
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setApplyModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded shadow-sm"
            >
              Kirim Permohonan
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Review / Approval Pimpinan */}
      {/* ========================================================================= */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Review & Keputusan Pengunduran Diri"
      >
        <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-100">
              {selectedWithdrawal?.full_name} ({selectedWithdrawal?.registration_number})
            </div>
            <div className="text-slate-500">
              Alasan: <span className="italic">{selectedWithdrawal?.reason}</span>
            </div>
            <div className="text-slate-500">
              Rekening:{' '}
              <strong>
                {selectedWithdrawal?.bank_name} {selectedWithdrawal?.bank_account_number}
              </strong>{' '}
              a.n. {selectedWithdrawal?.bank_account_holder}
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-amber-800 dark:text-amber-300">
              <strong>Peringatan Pelepasan Kuota:</strong> Jika permohonan disetujui, sistem akan secara otomatis melepaskan slot kuota rombel kelas Akademik dan memperbarui status siswa menjadi nonaktif/keluar.
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Keputusan
            </label>
            <select
              value={reviewForm.status}
              onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-bold"
            >
              <option value="approved">SETUJUI (APPROVED) & LEPAS KUOTA</option>
              <option value="rejected">TOLAK PERMOHONAN (REJECTED)</option>
            </select>
          </div>

          {reviewForm.status === 'approved' && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nominal Akhir Pengembalian Dana Disetujui (Rp)
              </label>
              <input
                type="number"
                value={reviewForm.final_refund_amount}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, final_refund_amount: Number(e.target.value) })
                }
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-bold text-emerald-600 text-sm"
                required
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Alasan Keputusan
            </label>
            <textarea
              value={reviewForm.approval_notes}
              onChange={(e) => setReviewForm({ ...reviewForm, approval_notes: e.target.value })}
              rows="2"
              placeholder="Catatan dari panitia / pimpinan yayasan..."
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setReviewModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded shadow-sm"
            >
              Simpan Keputusan
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Pencairan Dana Kasir (Disbursement Keuangan) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={disburseModalOpen}
        onClose={() => setDisburseModalOpen(false)}
        title="Pencairan Kasir Pengembalian Dana (Refund)"
      >
        <form onSubmit={handleSubmitDisburse} className="space-y-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-100">
                {selectedWithdrawal?.full_name}
              </div>
              <div className="text-slate-500 font-mono">
                {selectedWithdrawal?.bank_name} {selectedWithdrawal?.bank_account_number}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400">Total Refund Cair</span>
              <div className="text-base font-black text-rose-600">
                {formatCurrency(
                  selectedWithdrawal?.refund_amount || selectedWithdrawal?.estimated_refund_amount || 0
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sumber Akun Kas / Bank Pengeluaran (Keuangan)
            </label>
            <select
              value={disburseForm.cash_account_id}
              onChange={(e) => setDisburseForm({ ...disburseForm, cash_account_id: e.target.value })}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              required
            >
              <option value="">-- Pilih Akun Kas/Bank --</option>
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name} ({a.bank_name || 'Kas Tunai'})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Akan dicatat otomatis sebagai Pengeluaran (Expense) operasional refund di buku kas Keuangan.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={disburseForm.payment_method}
                onChange={(e) => setDisburseForm({ ...disburseForm, payment_method: e.target.value })}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              >
                <option value="transfer">Transfer Bank</option>
                <option value="cash">Tunai / Kasir</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Referensi Bukti Transfer
              </label>
              <input
                type="text"
                value={disburseForm.reference_no}
                onChange={(e) => setDisburseForm({ ...disburseForm, reference_no: e.target.value })}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Pengeluaran
            </label>
            <input
              type="text"
              value={disburseForm.notes}
              onChange={(e) => setDisburseForm({ ...disburseForm, notes: e.target.value })}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDisburseModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-sm"
            >
              Eksekusi Pencairan Dana
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
