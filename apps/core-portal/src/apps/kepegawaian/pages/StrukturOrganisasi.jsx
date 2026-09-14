import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Network,
  ListOrdered,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  ChevronRight,
  Building
} from 'lucide-react';
import api from '../../../shared/services/api';

export default function StrukturOrganisasi() {
  const { activeSchoolUnit } = useAuth();
  const [activeTab, setActiveTab] = useState('tree');
  const [positionsTree, setPositionsTree] = useState([]);
  const [flatPositions, setFlatPositions] = useState([]);
  const [dukList, setDukList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    level: 1,
    parent_position_id: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const schoolId = activeSchoolUnit?.id || 1;
      const [treeRes, flatRes, dukRes] = await Promise.allSettled([
        api.get(`/kepegawaian/job-positions/tree?school_unit_id=${schoolId}`),
        api.get(`/kepegawaian/job-positions?school_unit_id=${schoolId}`),
        api.get(`/kepegawaian/duk-pangkat?school_unit_id=${schoolId}`)
      ]);

      if (treeRes.status === 'fulfilled' && treeRes.value.data?.data) {
        setPositionsTree(treeRes.value.data.data);
      }
      if (flatRes.status === 'fulfilled' && flatRes.value.data?.data) {
        setFlatPositions(flatRes.value.data.data);
      }
      if (dukRes.status === 'fulfilled' && dukRes.value.data?.data) {
        setDukList(dukRes.value.data.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat struktur organisasi / DUK');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSchoolUnit]);

  const openCreateModal = () => {
    setIsEdit(false);
    setSelectedId(null);
    setFormData({
      name: '',
      level: 1,
      parent_position_id: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (pos) => {
    setIsEdit(true);
    setSelectedId(pos.id);
    setFormData({
      name: pos.name,
      level: pos.level || 1,
      parent_position_id: pos.parent_position_id || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        school_unit_id: activeSchoolUnit?.id || 1,
        name: formData.name.trim(),
        level: parseInt(formData.level, 10),
        parent_position_id: formData.parent_position_id ? parseInt(formData.parent_position_id, 10) : null
      };

      if (isEdit) {
        await api.put(`/kepegawaian/job-positions/${selectedId}`, payload);
        setSuccessMsg('Jabatan berhasil diperbarui');
      } else {
        await api.post('/kepegawaian/job-positions', payload);
        setSuccessMsg('Jabatan baru berhasil ditambahkan');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data jabatan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus jabatan ini?')) return;
    try {
      await api.delete(`/kepegawaian/job-positions/${id}`);
      setSuccessMsg('Jabatan berhasil dihapus');
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus jabatan');
    }
  };

  // Render recursive tree node
  const renderTreeNode = (node, depth = 0) => {
    return (
      <div key={node.id} className="space-y-2">
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
            depth === 0
              ? 'bg-indigo-50/80 border-indigo-200'
              : depth === 1
              ? 'bg-slate-50 border-slate-200 ml-6'
              : 'bg-white border-slate-200 ml-12'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                depth === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {node.level || 1}
            </div>
            <div>
              <div className="font-bold text-slate-800 text-xs">{node.name}</div>
              <div className="text-[10px] text-slate-400">
                Level Hierarki: {node.level} {node.parent_position_id ? `&bull; Parent #ID ${node.parent_position_id}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openEditModal(node)}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 transition"
              title="Edit Jabatan"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(node.id)}
              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition"
              title="Hapus Jabatan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="space-y-2 border-l-2 border-slate-200 ml-3 pl-2">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Struktur Organisasi & DUK Pangkat</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hierarki jabatan struktural dan Daftar Urut Kepangkatan pegawai
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition text-xs shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jabatan</span>
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-3 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('tree')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'tree' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Bagan Struktur Organisasi ({flatPositions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('duk')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'duk' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Daftar Urut Kepangkatan (DUK) ({dukList.length})</span>
        </button>
      </div>

      {/* Tab 1: Bagan Pohon Jabatan */}
      {activeTab === 'tree' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Hierarki Atasan & Bawahan ({activeSchoolUnit?.name || 'Satuan Pendidikan'})
          </h3>

          {loading ? (
            <div className="py-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              <span>Memuat struktur hierarki...</span>
            </div>
          ) : positionsTree.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Belum ada jabatan yang dibuat untuk satuan pendidikan ini
            </div>
          ) : (
            <div className="space-y-3">
              {positionsTree.map((rootNode) => renderTreeNode(rootNode))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: DUK Pangkat */}
      {activeTab === 'duk' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-3.5 text-center w-12">No. Urut</th>
                <th className="p-3.5">Nama Pegawai & NIP</th>
                <th className="p-3.5">Golongan Pangkat</th>
                <th className="p-3.5">Jabatan</th>
                <th className="p-3.5">TMT (Terhitung Mulai Tanggal)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dukList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    Tidak ada data pegawai aktif untuk pembuatan DUK
                  </td>
                </tr>
              ) : (
                dukList.map((item) => (
                  <tr key={item.urutan} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 text-center font-bold text-indigo-700">{item.urutan}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{item.full_name}{item.academic_title ? `, ${item.academic_title}` : ''}</div>
                      <div className="text-[10px] text-slate-400">NIP: {item.nip || '-'} &bull; {item.employee_number}</div>
                    </td>
                    <td className="p-3.5 font-bold text-indigo-700">{item.golongan}</td>
                    <td className="p-3.5 font-medium text-slate-700">{item.position_name}</td>
                    <td className="p-3.5 font-mono text-slate-600">
                      {typeof item.tmt === 'string' && item.tmt.includes('T') ? item.tmt.split('T')[0] : item.tmt}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah / Edit Jabatan */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                {isEdit ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Jabatan *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. Kepala Tata Usaha"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tingkat Hierarki (Level)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <span className="text-[10px] text-slate-400">1 = Pimpinan Tertinggi di Satuan Pendidikan</span>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Atasan Langsung (Parent)</label>
                <select
                  value={formData.parent_position_id}
                  onChange={(e) => setFormData({ ...formData, parent_position_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Tidak Ada (Top Level)</option>
                  {flatPositions
                    .filter((p) => !isEdit || p.id !== selectedId)
                    .map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name} (Level {pos.level})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-semibold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
