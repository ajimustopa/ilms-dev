import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Wrench,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Loader2,
  Check,
  Clock
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
      if (res.data.success) {
        setRequests(res.data.data);
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
      if (astRes.data.success) setAssets(astRes.data.data);
      if (rmsRes.data.success) setRooms(rmsRes.data.data);
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
      setMessage({ type: 'success', text: 'Laporan kerusakan fasilitas berhasil dikirim' });
      setCreateModalOpen(false);
      fetchRequests();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
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
        setMessage({ type: 'success', text: 'Tiket perbaikan berhasil ditutup' });
      } else {
        await api.put(`/sarpras/maintenance-requests/${targetRequest.id}`, {
          repair_status: updateData.repair_status,
          cost: updateData.cost ? Number(updateData.cost) : null
        });
        setMessage({ type: 'success', text: 'Status penanganan berhasil diperbarui' });
      }
      setUpdateModalOpen(false);
      fetchRequests();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

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
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md shadow-rose-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Lapor Kerusakan</span>
        </button>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold ml-4">&times;</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="w-48">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
          >
            <option value="">Semua Status Tiket</option>
            <option value="dilaporkan">Dilaporkan (Baru)</option>
            <option value="diproses">Sedang Diproses / Servis</option>
            <option value="selesai">Selesai Dikerjakan</option>
            <option value="ditutup">Ditutup / Selesai</option>
          </select>
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Objek / Aset Rusak</th>
                <th className="px-4 py-3">Deskripsi Kerusakan</th>
                <th className="px-4 py-3 text-right">Biaya Servis</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Waktu Lapor</th>
                <th className="px-4 py-3 text-right">Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {req.asset_name ? (
                        <div>
                          <span>{req.asset_name}</span>
                          <span className="text-[10px] font-mono text-indigo-600 block">{req.asset_code}</span>
                        </div>
                      ) : req.room_name ? (
                        <span>Ruangan: {req.room_name}</span>
                      ) : (
                        `Tiket #${req.id}`
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">{req.damage_report}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {req.cost ? `Rp ${Number(req.cost).toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        req.repair_status === 'ditutup' || req.repair_status === 'selesai'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : req.repair_status === 'diproses'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {req.repair_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openUpdateModal(req)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-700 font-semibold text-[11px] transition inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Update</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                    Tidak ada tiket pemeliharaan / laporan kerusakan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lapor Kerusakan */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative">
            <h3 className="text-base font-bold text-slate-900 mb-4">Lapor Kerusakan Sarana / Aset</h3>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Aset (Barang Rusak)</label>
                <select
                  value={formData.asset_id || ''}
                  onChange={(e) => setFormData({ ...formData, asset_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
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
                    className="w-full px-3 py-2 border rounded-xl text-xs"
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
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
                >
                  Kirim Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Update Tindak Lanjut */}
      {updateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">Tindak Lanjut Pemeliharaan</h3>
            <p className="text-xs text-slate-500 mb-4">
              Laporan: {targetRequest?.damage_report}
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Penanganan *</label>
                <select
                  value={updateData.repair_status}
                  onChange={(e) => setUpdateData({ ...updateData, repair_status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
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
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpdateModalOpen(false)}
                  className="px-4 py-2 border text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
