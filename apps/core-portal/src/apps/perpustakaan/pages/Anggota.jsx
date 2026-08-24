import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Users,
  Plus,
  Search,
  Filter,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  History,
  CreditCard,
  UserCheck,
  Calendar,
  GraduationCap,
  Briefcase,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Anggota() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, per_page: 10, total: 0, total_pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRefType, setSelectedRefType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Register Modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    ref_type: 'student',
    ref_id: '',
    member_card_number: '',
    max_loan_limit: 3,
    card_valid_until: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loanHistory, setLoanHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [pagination.page, selectedRefType, selectedStatus]);

  const fetchMembers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('per_page', pagination.per_page);
      if (search) params.append('search', search);
      if (selectedRefType) params.append('ref_type', selectedRefType);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/api/v1/perpustakaan/members?${params.toString()}`);
      setMembers(res.data?.data?.items || []);
      if (res.data?.data?.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal memuat data anggota');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchMembers();
  };

  const handleOpenRegister = () => {
    setErrorMsg(null);
    setFormData({
      ref_type: 'student',
      ref_id: '',
      member_card_number: '',
      max_loan_limit: 3,
      card_valid_until: '',
    });
    setRegisterModalOpen(true);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        ref_type: formData.ref_type,
        ref_id: Number(formData.ref_id),
        member_card_number: formData.member_card_number || undefined,
        max_loan_limit: Number(formData.max_loan_limit) || 3,
        card_valid_until: formData.card_valid_until || undefined,
      };

      await api.post('/api/v1/perpustakaan/members', payload);
      setRegisterModalOpen(false);
      fetchMembers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal mendaftarkan anggota');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (member) => {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? 'mengaktifkan' : 'menonaktifkan';
    if (!window.confirm(`Yakin ingin ${actionText} keanggotaan ${member.member_name}?`)) return;

    try {
      await api.patch(`/api/v1/perpustakaan/members/${member.id}/status`, {
        status: newStatus,
      });
      fetchMembers();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal mengubah status');
    }
  };

  const handleOpenHistory = async (member) => {
    setSelectedMember(member);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/api/v1/perpustakaan/members/${member.id}/loan-history`);
      setLoanHistory(res.data?.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl tracking-tight">
            Data Anggota Perpustakaan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar santri dan pegawai yang terdaftar sebagai pemegang kartu perpustakaan.
          </p>
        </div>

        <button
          onClick={handleOpenRegister}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Daftarkan Anggota Baru</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari berdasarkan nomor kartu anggota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-teal-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedRefType}
              onChange={(e) => {
                setSelectedRefType(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-teal-500"
            >
              <option value="">Semua Tipe</option>
              <option value="student">Santri / Siswa</option>
              <option value="employee">Guru / Pegawai</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-teal-500"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
          </div>
        </form>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Tidak ada data anggota ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">No. Kartu</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Tipe Anggota</th>
                  <th className="py-3 px-4 text-center">Batas Maks. Pinjam</th>
                  <th className="py-3 px-4">Masa Berlaku</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {m.member_card_number || `ANG-${m.id}`}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div>{m.member_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Ref ID #{m.ref_id} ({m.ref_type === 'student' ? 'Akademik' : 'Kepegawaian'})
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.ref_type === 'student'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                        }`}
                      >
                        {m.ref_type === 'student' ? (
                          <>
                            <GraduationCap className="w-3 h-3" />
                            <span>Santri</span>
                          </>
                        ) : (
                          <>
                            <Briefcase className="w-3 h-3" />
                            <span>Pegawai</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                      {m.max_loan_limit} buku
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {m.card_valid_until
                        ? new Date(m.card_valid_until).toLocaleDateString('id-ID')
                        : 'Tidak Terbatas'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          m.status === 'active'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                            : 'bg-rose-50 text-rose-600 border border-rose-200/60'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenHistory(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition cursor-pointer"
                          title="Riwayat Peminjaman"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(m)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            m.status === 'active'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={m.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {m.status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan halaman <span className="font-bold text-slate-800">{pagination.page}</span> dari{' '}
            <span className="font-bold text-slate-800">{pagination.total_pages || 1}</span> (Total: {pagination.total} anggota)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Daftarkan Anggota Baru */}
      {registerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span>Daftarkan Anggota Baru</span>
              </h2>
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipe Anggota
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ref_type: 'student', max_loan_limit: 3 })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      formData.ref_type === 'student'
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Santri / Siswa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ref_type: 'employee', max_loan_limit: 5 })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      formData.ref_type === 'employee'
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Guru / Pegawai</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Referensi {formData.ref_type === 'student' ? 'Siswa (Database Akademik)' : 'Pegawai (Database Kepegawaian)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={formData.ref_id}
                  onChange={(e) => setFormData({ ...formData, ref_id: e.target.value })}
                  placeholder={`Masukkan ID ${formData.ref_type === 'student' ? 'Siswa' : 'Pegawai'}`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Kartu Anggota (Opsional / Otomatis)
                </label>
                <input
                  type="text"
                  value={formData.member_card_number}
                  onChange={(e) => setFormData({ ...formData, member_card_number: e.target.value })}
                  placeholder="misal: ANG-S-1-0005"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batas Maksimal Pinjam
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_loan_limit}
                    onChange={(e) => setFormData({ ...formData, max_loan_limit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Masa Berlaku Kartu
                  </label>
                  <input
                    type="date"
                    value={formData.card_valid_until}
                    onChange={(e) => setFormData({ ...formData, card_valid_until: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Daftarkan Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Peminjaman Anggota */}
      {historyModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-teal-600" />
                  <span>Riwayat Peminjaman Buku</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {selectedMember.member_name} ({selectedMember.member_card_number})
                </p>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              {loadingHistory ? (
                <div className="py-16 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                </div>
              ) : loanHistory.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  Belum ada riwayat peminjaman buku untuk anggota ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {loanHistory.map((loan) => (
                    <div
                      key={loan.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{loan.book_title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="font-mono">{loan.copy_code}</span>
                          <span>•</span>
                          <span>Dipinjam: {new Date(loan.borrowed_at).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            loan.loan_status === 'returned'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : loan.loan_status === 'overdue'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-amber-50 text-amber-600 border border-amber-200'
                          }`}
                        >
                          {loan.loan_status}
                        </span>
                        {loan.returned_at && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Kembali: {new Date(loan.returned_at).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right shrink-0">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
