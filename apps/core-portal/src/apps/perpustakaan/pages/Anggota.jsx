import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Users,
  Plus,
  History,
  CreditCard,
  UserCheck,
  Calendar,
  GraduationCap,
  Briefcase,
  Loader2
} from 'lucide-react';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import Drawer from '../../../shared/components/Drawer';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import StatusPill from '../../../shared/components/StatusPill';

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

  // History Drawer
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
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

  const handleSearch = (text) => {
    setSearch(text);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleOpenRegister = () => {
    setErrorMsg(null);
    setFormData({
      ref_type: 'student',
      ref_id: '',
      member_card_number: `LIB-${Date.now().toString().slice(-6)}`,
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
        ...formData,
        ref_id: Number(formData.ref_id),
        max_loan_limit: Number(formData.max_loan_limit) || 3,
        card_valid_until: formData.card_valid_until || undefined,
      };

      await api.post('/api/v1/perpustakaan/members', payload);
      setRegisterModalOpen(false);
      fetchMembers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal mendaftarkan kartu anggota');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistory = async (member) => {
    setSelectedMember(member);
    setHistoryDrawerOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/api/v1/perpustakaan/loans?member_id=${member.id}`);
      setLoanHistory(res.data?.data?.items || []);
    } catch (err) {
      console.error('Failed to load loan history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Nama Anggota & ID',
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
            {row.ref_type === 'student' ? <GraduationCap className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
          </div>
          <div>
            <div className="font-semibold text-slate-800 leading-snug">{row.full_name || val || '-'}</div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              ID #{row.id} • {row.ref_type === 'student' ? 'Santri/Siswa' : 'Guru/Pegawai'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'member_card_number',
      label: 'No. Kartu Anggota',
      render: (val) => <span className="font-mono font-bold text-slate-800">{val || '-'}</span>
    },
    {
      key: 'loan_status',
      label: 'Pinjaman Aktif / Limit',
      render: (_, row) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 tnum">{row.active_loans_count || 0}</span>
          <span className="text-slate-400"> / {row.max_loan_limit || 3} Buku</span>
        </div>
      )
    },
    {
      key: 'card_valid_until',
      label: 'Masa Berlaku',
      render: (val) => (
        <span className="text-xs text-slate-600 font-mono">
          {val ? new Date(val).toLocaleDateString('id-ID') : 'Aktif Permanen'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      type: 'status',
      width: '100px'
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      sticky: 'right',
      width: '100px',
      render: (_, member) => (
        <button
          type="button"
          onClick={() => handleOpenHistory(member)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
          title="Lihat Riwayat Pinjaman"
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-snug">
            Data Anggota Perpustakaan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola nomor kartu pustaka, kuota peminjaman santri/staf, dan riwayat sirkulasi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenRegister}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Daftar Anggota Baru</span>
        </button>
      </div>

      {/* FilterBar Standar */}
      <FilterBar
        searchValue={search}
        onSearchChange={handleSearch}
        searchPlaceholder="Cari nama, no kartu, atau ID..."
        onReset={() => {
          setSearch('');
          setSelectedRefType('');
          setSelectedStatus('');
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        hasActiveFilters={Boolean(selectedRefType || selectedStatus || search)}
        filters={
          <>
            <select
              value={selectedRefType}
              onChange={(e) => {
                setSelectedRefType(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">Semua Tipe Anggota</option>
              <option value="student">Santri / Siswa</option>
              <option value="employee">Guru / Pegawai</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="suspended">Ditangguhkan / Denda</option>
              <option value="expired">Kedaluwarsa</option>
            </select>
          </>
        }
        actions={
          <span className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800 tnum">{pagination.total}</span> anggota
          </span>
        }
      />

      {/* Generic DataTable */}
      <DataTable
        columns={columns}
        data={members}
        loading={loading}
        density="compact"
        emptyTitle="Belum Ada Anggota Terdaftar"
        emptyDescription="Anggota perpustakaan belum didaftarkan atau tidak cocok dengan kriteria pencarian."
        emptyAction={
          <button
            type="button"
            onClick={handleOpenRegister}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrasi Anggota Pertama</span>
          </button>
        }
        pagination={{
          currentPage: pagination.page,
          totalItems: pagination.total,
          pageSize: pagination.per_page,
          onPageChange: (newPage) => setPagination((prev) => ({ ...prev, page: newPage }))
        }}
      />

      {/* Modal Registrasi Anggota Baru */}
      <Modal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        title="Registrasi Kartu Anggota Baru"
        subtitle="Hubungkan profil santri atau guru dengan nomor kartu perpustakaan."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRegisterModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleRegisterSubmit}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Terbitkan Kartu Anggota</span>
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {errorMsg && (
            <FlatAlertBanner
              variant="danger"
              title="Gagal Mendaftarkan Anggota"
              description={errorMsg}
            />
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Anggota
                </label>
                <select
                  value={formData.ref_type}
                  onChange={(e) => setFormData({ ...formData, ref_type: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="student">Santri / Siswa</option>
                  <option value="employee">Guru / Pegawai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Referensi (Siswa/Pegawai)
                </label>
                <input
                  type="number"
                  required
                  value={formData.ref_id}
                  onChange={(e) => setFormData({ ...formData, ref_id: e.target.value })}
                  placeholder="ID Siswa/Pegawai"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Kartu Anggota (Barcode ID)
              </label>
              <input
                type="text"
                required
                value={formData.member_card_number}
                onChange={(e) => setFormData({ ...formData, member_card_number: e.target.value })}
                placeholder="LIB-2026-..."
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batas Maks Pinjaman Buku
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.max_loan_limit}
                  onChange={(e) => setFormData({ ...formData, max_loan_limit: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
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
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Drawer Riwayat Pinjaman Anggota */}
      <Drawer
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        title="Riwayat Sirkulasi Pinjaman"
        subtitle={selectedMember ? `${selectedMember.full_name} (${selectedMember.member_card_number})` : ''}
        size="md"
      >
        <div className="space-y-3">
          {loadingHistory ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            </div>
          ) : loanHistory.length > 0 ? (
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden bg-white">
              {loanHistory.map((loan) => (
                <div key={loan.id} className="p-3 text-xs hover:bg-slate-50/70 transition space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{loan.book_title}</span>
                    <StatusPill
                      variant={
                        loan.loan_status === 'returned'
                          ? 'success'
                          : loan.loan_status === 'overdue'
                          ? 'danger'
                          : 'info'
                      }
                    >
                      {loan.loan_status}
                    </StatusPill>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="font-mono">Eksemplar: {loan.copy_code}</span>
                    <span>
                      Pinjam: {loan.borrowed_at ? new Date(loan.borrowed_at).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              Belum ada riwayat transaksi peminjaman untuk anggota ini.
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
