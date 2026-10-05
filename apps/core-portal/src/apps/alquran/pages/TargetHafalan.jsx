import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import StatusPill from '../../../shared/components/StatusPill';

export default function TargetHafalan() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    class_ref_id: '1',
    period_label: 'Semester Ganjil 2026/2027',
    target_type: 'juz',
    target_value: 2,
    notes: ''
  });

  const fetchTargets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/alquran/targets');
      setTargets(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat target hafalan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const openCreateModal = () => {
    setEditingTarget(null);
    setFormData({
      class_ref_id: '1',
      period_label: 'Semester Ganjil 2026/2027',
      target_type: 'juz',
      target_value: 2,
      notes: ''
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (target) => {
    setEditingTarget(target);
    setFormData({
      class_ref_id: target.class_ref_id || '1',
      period_label: target.period_label || '',
      target_type: target.target_type || 'juz',
      target_value: target.target_value || 1,
      notes: target.notes || ''
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        class_ref_id: Number(formData.class_ref_id),
        target_value: Number(formData.target_value)
      };

      if (editingTarget) {
        await api.put(`/alquran/targets/${editingTarget.id}`, payload);
      } else {
        await api.post('/alquran/targets', payload);
      }

      setShowModal(false);
      fetchTargets();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan target hafalan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (target) => {
    if (!window.confirm(`Hapus target hafalan kelas #${target.class_ref_id}?`)) return;

    try {
      await api.delete(`/alquran/targets/${target.id}`);
      fetchTargets();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal menghapus target');
    }
  };

  const filteredTargets = useMemo(() => {
    return targets.filter((t) => {
      return (
        search === '' ||
        String(t.class_ref_id).includes(search) ||
        (t.period_label && t.period_label.toLowerCase().includes(search.toLowerCase())) ||
        (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()))
      );
    });
  }, [targets, search]);

  const columns = [
    {
      key: 'class_ref_id',
      label: 'Rombel / Kelas',
      render: (val) => (
        <div>
          <div className="font-semibold text-slate-800">Kelas ID #{val}</div>
          <div className="text-[11px] text-slate-400">Rombel Santri</div>
        </div>
      )
    },
    {
      key: 'period_label',
      label: 'Tahun Ajaran / Semester',
      render: (val) => <span className="font-medium text-slate-700">{val}</span>
    },
    {
      key: 'target_value',
      label: 'Target Capaian',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 font-mono tnum">{val}</span>
          <span className="text-slate-500 text-xs ml-1 uppercase">{row.target_type || 'Juz'}</span>
        </div>
      )
    },
    {
      key: 'notes',
      label: 'Keterangan Kurikulum',
      render: (val) => <span className="text-slate-500">{val || '-'}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: () => <StatusPill variant="success">Aktif Berjalan</StatusPill>
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      sticky: 'right',
      width: '100px',
      render: (_, target) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEditModal(target)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Edit Target"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(target)}
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Hapus Target"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
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
            Target Capaian Hafalan Al-Qur'an
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penetapan standar minimum hafalan juz per tingkatan rombel kelas & semester.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Target Kelas</span>
        </button>
      </div>

      {/* FilterBar Standar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari ID kelas atau periode semester..."
        actions={
          <span className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800 tnum">{filteredTargets.length}</span> target
          </span>
        }
      />

      {/* Generic DataTable */}
      <DataTable
        columns={columns}
        data={filteredTargets}
        loading={loading}
        density="compact"
        emptyTitle="Belum Ada Target Hafalan"
        emptyDescription="Standar target hafalan kelas belum ditetapkan untuk periode ini."
        emptyAction={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tetapkan Target Pertama</span>
          </button>
        }
      />

      {/* Modal Tambah / Edit Target */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTarget ? 'Edit Target Hafalan' : 'Tetapkan Target Hafalan Baru'}
        subtitle="Tentukan batas minimum juz yang wajib diselesaikan santri dalam satu semester."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Target</span>
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {error && (
            <FlatAlertBanner
              variant="danger"
              title="Gagal Menyimpan Target"
              description={error}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Rombel / Kelas
                </label>
                <input
                  type="number"
                  required
                  value={formData.class_ref_id}
                  onChange={(e) => setFormData({ ...formData, class_ref_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Satuan Target
                </label>
                <select
                  value={formData.target_type}
                  onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="juz">Juz Penuh</option>
                  <option value="page">Halaman (Mushaf)</option>
                  <option value="surah">Surah Tertentu</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Periode / Semester
                </label>
                <input
                  type="text"
                  required
                  value={formData.period_label}
                  onChange={(e) => setFormData({ ...formData, period_label: e.target.value })}
                  placeholder="Semester Ganjil 2026/2027"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Target (Nilai)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keterangan / Catatan Tambahan
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Misal: Wajib menyelesaikan Juz 30 dan Juz 29..."
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
