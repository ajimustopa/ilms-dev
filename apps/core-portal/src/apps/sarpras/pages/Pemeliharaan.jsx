import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Wrench,
  Plus,
  Edit2,
  Loader2
} from 'lucide-react';

export default function Pemeliharaan() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [targetRequest, setTargetRequest] = useState(null);
  const [updateData, setUpdateData] = useState({ repair_status: 'diproses', cost: '' });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('repair_status', selectedStatus);

      const res = await api.get(`/sarpras/maintenance-requests?${params.toString()}`);
      if (res.data?.success) {
        setRequests(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching maintenance:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetsAndRooms = async () => {
    try {
      const [astRes, rmsRes] = await Promise.all([
        api.get('/sarpras/assets'),
        api.get('/sarpras/rooms')
      ]);
      if (astRes.data?.success) setAssets(astRes.data.data || []);
      if (rmsRes.data?.success) setRooms(rmsRes.data.data || []);
    } catch (err) {
      console.error('Error fetching assets/rooms:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchAssetsAndRooms();
  }, [selectedStatus]);

  const openCreateModal = () => {
    setFormData({
      asset_id: '',
      facility_room_id: '',
      reported_by: user?.ref_type === 'employee' ? user?.ref_id : 1,
      damage_report: ''
    });
    setCreateModalOpen(true);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/sarpras/maintenance-requests', formData);
      setMessage({ type: 'emerald', title: 'Berhasil', text: 'Laporan kerusakan fasilitas berhasil dikirim' });
      setCreateModalOpen(false);
      fetchRequests();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateModal = (req) => {
    setTargetRequest(req);
    setUpdateData({
      repair_status: req.repair_status === 'dilaporkan' ? 'diproses' : req.repair_status,
      cost: req.cost || ''
    });
    setUpdateModalOpen(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (updateData.repair_status === 'ditutup') {
        await api.post(`/sarpras/maintenance-requests/${targetRequest.id}/close`, {
          cost: updateData.cost ? Number(updateData.cost) : null
        });
        setMessage({ type: 'emerald', title: 'Berhasil', text: 'Tiket perbaikan berhasil ditutup' });
      } else {
        await api.put(`/sarpras/maintenance-requests/${targetRequest.id}`, {
          repair_status: updateData.repair_status,
          cost: updateData.cost ? Number(updateData.cost) : null
        });
        setMessage({ type: 'emerald', title: 'Berhasil', text: 'Status penanganan berhasil diperbarui' });
      }
      setUpdateModalOpen(false);
      fetchRequests();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered requests by search
  const filteredRequests = useMemo(() => {
    if (!search) return requests;
    const q = search.toLowerCase();
    return requests.filter(r =>
      r.asset_name?.toLowerCase().includes(q) ||
      r.asset_code?.toLowerCase().includes(q) ||
      r.room_name?.toLowerCase().includes(q) ||
      r.damage_report?.toLowerCase().includes(q)
    );
  }, [requests, search]);

  const columns = useMemo(() => [
    {
      key: 'object',
      header: 'Objek / Aset Rusak',
      sortable: true,
      render: (row) => (
        <div>
          {row.asset_name ? (
            <div>
              <span className="font-semibold text-slate-800">{row.asset_name}</span>
              <span className="text-[11px] font-mono font-bold text-slate-700 block">{row.asset_code}</span>
            </div>
          ) : row.room_name ? (
            <span className="font-semibold text-slate-800">Ruangan: {row.room_name}</span>
          ) : (
            <span className="font-mono text-slate-500 font-bold">Tiket #{row.id}</span>
          )}
        </div>
      )
    },
    {
      key: 'damage_report',
      header: 'Deskripsi Kerusakan',
      render: (row) => <span className="text-slate-600 line-clamp-2">{row.damage_report}</span>
    },
    {
      key: 'cost',
      header: 'Biaya Servis',
      sortable: true,
      align: 'right',
      className: 'num-cell font-medium text-slate-700',
      render: (row) => row.cost ? formatCurrency(row.cost) : '-'
    },
    {
      key: 'repair_status',
      header: 'Status',
      align: 'center',
      className: 'w-28 text-center',
      render: (row) => <StatusPill status={row.repair_status || 'dilaporkan'} />
    },
    {
      key: 'created_at',
      header: 'Waktu Lapor',
      sortable: true,
      className: 'w-28 text-slate-500 text-xs',
      render: (row) => formatDate(row.created_at)
    },
    {
      key: 'actions',
      header: 'Tindak Lanjut',
      align: 'right',
      sticky: 'right',
      className: 'w-28 text-right bg-white',
      render: (row) => (
        <button
          type="button"
          onClick={() => openUpdateModal(row)}
          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-slate-700 font-semibold text-xs transition inline-flex items-center gap-1"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Update</span>
        </button>
      )
    }
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pemeliharaan & Perbaikan Sarpras</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan kerusakan barang/ruangan, tindak lanjut penanganan teknisi, dan pencatatan biaya servis
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Lapor Kerusakan</span>
        </button>
      </div>

      {message && (
        <FlatAlertBanner
          variant={message.type}
          title={message.title}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </FlatAlertBanner>
      )}

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama aset, kode, atau kerusakan..."
        filters={[
          {
            id: 'status',
            label: 'Status Tiket',
            type: 'select',
            value: selectedStatus,
            defaultValue: '',
            options: [
              { label: 'Semua Status Tiket', value: '' },
              { label: 'Dilaporkan (Baru)', value: 'dilaporkan' },
              { label: 'Sedang Diproses / Servis', value: 'diproses' },
              { label: 'Selesai Dikerjakan', value: 'selesai' },
              { label: 'Ditutup / Selesai', value: 'ditutup' }
            ]
          }
        ]}
        onFilterChange={(_, val) => setSelectedStatus(val)}
        onReset={() => { setSearch(''); setSelectedStatus(''); }}
      />

      {/* Maintenance Table */}
      <DataTable
        columns={columns}
        data={filteredRequests}
        loading={loading}
        emptyTitle="Tidak Ada Tiket Kerusakan"
        emptyDescription="Seluruh sarana dan prasarana dalam kondisi baik, tidak ada laporan kerusakan aktif."
      />

      {/* Modal Lapor Kerusakan */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Lapor Kerusakan Sarana / Aset"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-lapor-rusak"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Kirim Laporan</span>
            </button>
          </div>
        }
      >
        <form id="form-lapor-rusak" onSubmit={handleCreateRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Aset (Barang Rusak)</label>
            <select
              value={formData.asset_id || ''}
              onChange={(e) => setFormData({ ...formData, asset_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            >
              <option value="">-- Atau Pilih Ruangan di Bawah --</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>)}
            </select>
          </div>

          {!formData.asset_id && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ruangan / Fasilitas Rusak</label>
              <select
                value={formData.facility_room_id || ''}
                onChange={(e) => setFormData({ ...formData, facility_room_id: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              >
                <option value="">-- Pilih Ruangan --</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name} ({r.room_code})</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Kerusakan & Gejala *</label>
            <textarea
              required
              rows={3}
              value={formData.damage_report || ''}
              onChange={(e) => setFormData({ ...formData, damage_report: e.target.value })}
              placeholder="Jelaskan bagian yang rusak atau kendala yang dialami..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </form>
      </Modal>

      {/* Modal Update Tindak Lanjut */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Tindak Lanjut Pemeliharaan"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setUpdateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-update-rusak"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
            >
              Simpan Status
            </button>
          </div>
        }
      >
        <div className="mb-4 text-xs text-slate-500">
          Laporan: <strong className="text-slate-800">{targetRequest?.damage_report}</strong>
        </div>

        <form id="form-update-rusak" onSubmit={handleUpdateStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status Penanganan *</label>
            <select
              value={updateData.repair_status}
              onChange={(e) => setUpdateData({ ...updateData, repair_status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
            >
              <option value="dilaporkan">Dilaporkan (Menunggu)</option>
              <option value="diproses">Sedang Dikerjakan / Diservis</option>
              <option value="selesai">Selesai Perbaikan</option>
              <option value="ditutup">Tutup Tiket (Final)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Total Biaya Perbaikan (Rp)</label>
            <input
              type="number"
              value={updateData.cost || ''}
              onChange={(e) => setUpdateData({ ...updateData, cost: e.target.value })}
              placeholder="Contoh: 250000"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
