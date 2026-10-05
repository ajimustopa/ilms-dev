import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import {
  BookOpenCheck,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import StatusPill from '../../../shared/components/StatusPill';

export default function CapaianHafalan() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Input Setoran
  const [formData, setFormData] = useState({
    student_ref_id: '1',
    juz: 1,
    page_start: 1,
    page_end: 5,
    record_date: new Date().toISOString().slice(0, 10),
    tajwid_score: 85,
    notes: ''
  });

  // Form Verifikasi
  const [verifyStatus, setVerifyStatus] = useState('verified');
  const [verifyNotes, setVerifyNotes] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/alquran/records');
      setRecords(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat data setoran hafalan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const openCreateModal = () => {
    setFormData({
      student_ref_id: '1',
      juz: 1,
      page_start: 1,
      page_end: 5,
      record_date: new Date().toISOString().slice(0, 10),
      tajwid_score: 85,
      notes: ''
    });
    setError(null);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        student_ref_id: Number(formData.student_ref_id),
        juz: Number(formData.juz),
        page_start: formData.page_start ? Number(formData.page_start) : null,
        page_end: formData.page_end ? Number(formData.page_end) : null,
        tajwid_score: formData.tajwid_score ? parseFloat(formData.tajwid_score) : null
      };

      await api.post('/alquran/records', payload);
      setShowCreateModal(false);
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan setoran hafalan');
    } finally {
      setSubmitting(false);
    }
  };

  const openVerifyModal = (record) => {
    setSelectedRecord(record);
    setVerifyStatus('verified');
    setVerifyNotes(record.notes || '');
    setError(null);
    setShowVerifyModal(true);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setError(null);
    setSubmitting(true);

    try {
      await api.patch(`/alquran/records/${selectedRecord.id}/verify`, {
        verification_status: verifyStatus,
        notes: verifyNotes
      });
      setShowVerifyModal(false);
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memverifikasi setoran');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        search === '' ||
        String(r.student_ref_id).toLowerCase().includes(search.toLowerCase()) ||
        String(r.juz).includes(search) ||
        (r.notes && r.notes.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' || r.verification_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const columns = [
    {
      key: 'student_ref_id',
      label: 'Santri / Siswa',
      render: (val) => (
        <div>
          <div className="font-semibold text-slate-800">Santri ID #{val}</div>
          <div className="text-[11px] font-mono text-slate-400">NIS / ID: {val}</div>
        </div>
      )
    },
    {
      key: 'juz',
      label: 'Juz & Halaman',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800">Juz {val}</span>
          <span className="text-slate-400 text-xs ml-1.5 font-mono">
            (Hal. {row.page_start || 1} - {row.page_end || 5})
          </span>
        </div>
      )
    },
    {
      key: 'record_date',
      label: 'Tgl Setoran',
      type: 'date',
      render: (val) => (
        <span className="text-xs text-slate-600 font-mono">
          {val ? new Date(val).toLocaleDateString('id-ID') : '-'}
        </span>
      )
    },
    {
      key: 'tajwid_score',
      label: 'Nilai Tajwid',
      type: 'number',
      render: (val) => (
        <span className="font-bold font-mono text-slate-800 tnum">
          {val != null ? val : '-'}
        </span>
      )
    },
    {
      key: 'verification_status',
      label: 'Status Verifikasi',
      type: 'status',
      width: '130px'
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      sticky: 'right',
      width: '110px',
      render: (_, record) => (
        <div className="flex items-center justify-end">
          {record.verification_status === 'pending' ? (
            <button
              type="button"
              onClick={() => openVerifyModal(record)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer border border-emerald-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verifikasi</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openVerifyModal(record)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
            >
              Edit Status
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-snug">
            Capaian & Setoran Hafalan Al-Qur'an
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log harian setoran tahfidz, nilai tajwid, kelancaran, dan approval asatidz/musyrif.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Input Setoran Baru</span>
        </button>
      </div>

      {/* FilterBar Standar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari ID santri, juz, atau catatan..."
        onReset={() => {
          setSearch('');
          setStatusFilter('all');
        }}
        hasActiveFilters={Boolean(statusFilter !== 'all' || search)}
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="all">Semua Status Verifikasi</option>
            <option value="pending">Menunggu Verifikasi (Pending)</option>
            <option value="verified">Terverifikasi (Lulus)</option>
            <option value="rejected">Ditolak / Ulangi</option>
          </select>
        }
        actions={
          <span className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800 tnum">{filteredRecords.length}</span> setoran
          </span>
        }
      />

      {/* Generic DataTable */}
      <DataTable
        columns={columns}
        data={filteredRecords}
        loading={loading}
        density="compact"
        emptyTitle="Belum Ada Setoran Hafalan"
        emptyDescription="Catatan setoran hafalan santri belum tersedia atau tidak sesuai dengan filter."
        emptyAction={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Input Setoran Pertama</span>
          </button>
        }
      />

      {/* Modal Input Setoran Baru */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Input Setoran Hafalan Baru"
        subtitle="Catat capaian hafalan harian santri dan penilaian kualitas tajwid."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleCreateSubmit}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Setoran</span>
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {error && (
            <FlatAlertBanner
              variant="danger"
              title="Gagal Menyimpan Setoran"
              description={error}
            />
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Santri / Siswa
                </label>
                <input
                  type="number"
                  required
                  value={formData.student_ref_id}
                  onChange={(e) => setFormData({ ...formData, student_ref_id: e.target.value })}
                  placeholder="Contoh: 101"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Juz Al-Qur'an (1 - 30)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={formData.juz}
                  onChange={(e) => setFormData({ ...formData, juz: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Halaman Awal
                </label>
                <input
                  type="number"
                  min="1"
                  max="604"
                  value={formData.page_start}
                  onChange={(e) => setFormData({ ...formData, page_start: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Halaman Akhir
                </label>
                <input
                  type="number"
                  min="1"
                  max="604"
                  value={formData.page_end}
                  onChange={(e) => setFormData({ ...formData, page_end: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Setoran
                </label>
                <input
                  type="date"
                  required
                  value={formData.record_date}
                  onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nilai Tajwid (Skala 100)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.tajwid_score}
                  onChange={(e) => setFormData({ ...formData, tajwid_score: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Evaluasi / Makhraj
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Catatan mad thabi'i, ghunnah, atau kelancaran hafalan..."
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal Verifikasi Setoran */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Verifikasi Setoran Hafalan"
        subtitle={selectedRecord ? `Santri #${selectedRecord.student_ref_id} — Juz ${selectedRecord.juz}` : ''}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowVerifyModal(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleVerifySubmit}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Status</span>
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Keputusan Musyrif
            </label>
            <select
              value={verifyStatus}
              onChange={(e) => setVerifyStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="verified">Disetujui / Lulus (Verified)</option>
              <option value="rejected">Ditolak / Ulangi (Rejected)</option>
              <option value="pending">Tangguhkan (Pending)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan untuk Santri / Wali
            </label>
            <textarea
              rows={2}
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              placeholder="Berikan masukan tajwid dan kelancaran..."
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
