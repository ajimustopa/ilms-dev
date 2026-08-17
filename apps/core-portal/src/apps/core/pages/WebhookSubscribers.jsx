import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Webhook,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  X,
  Save,
  Copy,
  Loader2,
  AlertCircle
} from 'lucide-react';

const availableEvents = [
  { code: 'account.created', label: 'Akun Dibuat' },
  { code: 'account.updated', label: 'Akun Diubah' },
  { code: 'account.status_changed', label: 'Status Akun Berubah' },
  { code: 'school_unit.created', label: 'Satuan Pendidikan Dibuat' },
  { code: 'school_unit.updated', label: 'Satuan Pendidikan Diubah' },
  { code: 'role.assigned', label: 'Penugasan Role Berubah' },
];

export default function WebhookSubscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State Add/Edit
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  // Modal State Rotate Secret
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [activeSecret, setActiveSecret] = useState({ appName: '', secret: '' });

  const [formData, setFormData] = useState({
    application_name: '',
    endpoint_url: '',
    subscribed_events: ['account.created'],
    status: 'active',
  });

  const fetchSubscribers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/core/webhooks/subscribers', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
      });

      if (res.data?.success && res.data.data) {
        setSubscribers(res.data.data);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal memuat daftar subscriber webhook'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSubscribers();
  };

  const handleOpenAdd = () => {
    setEditingSub(null);
    setFormError('');
    setFormData({
      application_name: '',
      endpoint_url: '',
      subscribed_events: ['account.created'],
      status: 'active',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (sub) => {
    setEditingSub(sub);
    setFormError('');
    setFormData({
      application_name: sub.application_name,
      endpoint_url: sub.endpoint_url,
      subscribed_events: Array.isArray(sub.subscribed_events) ? sub.subscribed_events : [],
      status: sub.status,
    });
    setShowModal(true);
  };

  const handleToggleEvent = (code) => {
    setFormData((prev) => {
      const exists = prev.subscribed_events.includes(code);
      return {
        ...prev,
        subscribed_events: exists
          ? prev.subscribed_events.filter((e) => e !== code)
          : [...prev.subscribed_events, code],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      if (editingSub) {
        await api.put(`/core/webhooks/subscribers/${editingSub.id}`, {
          endpoint_url: formData.endpoint_url.trim(),
          subscribed_events: formData.subscribed_events,
          status: formData.status,
        });
        setShowModal(false);
        fetchSubscribers();
      } else {
        const res = await api.post('/core/webhooks/subscribers', {
          application_name: formData.application_name.trim().toLowerCase(),
          endpoint_url: formData.endpoint_url.trim(),
          subscribed_events: formData.subscribed_events,
          status: formData.status,
        });

        setShowModal(false);
        if (res.data?.success && res.data.data?.secret_key) {
          setActiveSecret({
            appName: formData.application_name,
            secret: res.data.data.secret_key,
          });
          setShowSecretModal(true);
        }
        fetchSubscribers();
      }
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal menyimpan subscriber webhook'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRotateSecret = async (sub) => {
    if (confirm(`Rotasi secret key untuk aplikasi '${sub.application_name}'? Token lama tidak akan berlaku lagi.`)) {
      try {
        const res = await api.post(`/core/webhooks/subscribers/${sub.id}/rotate-secret`);
        if (res.data?.success && res.data.data?.new_secret_key) {
          setActiveSecret({
            appName: sub.application_name,
            secret: res.data.data.new_secret_key,
          });
          setShowSecretModal(true);
          fetchSubscribers();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal merotasi secret key');
      }
    }
  };

  const handleDelete = async (sub) => {
    if (confirm(`Apakah Anda yakin ingin menghapus subscriber '${sub.application_name}'?`)) {
      try {
        await api.delete(`/core/webhooks/subscribers/${sub.id}`);
        fetchSubscribers();
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus subscriber webhook');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Webhook Subscribers Management</h2>
          <p className="text-xs text-slate-500">
            Daftar 13 aplikasi satelit yang berlangganan event perubahan data dari Core Service.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSubscribers}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Daftarkan Subscriber</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama aplikasi atau URL endpoint..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition shrink-0"
        >
          Cari
        </button>
      </form>

      {/* Table Subscribers */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th className="px-5 py-3">Nama Aplikasi</th>
              <th className="px-5 py-3">Endpoint Webhook URL</th>
              <th className="px-5 py-3">Event yang Dilanggan</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-5 py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Memuat data subscriber...</span>
                </td>
              </tr>
            ) : subscribers.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-5 py-8 text-center text-slate-400">
                  Tidak ada subscriber webhook yang sesuai
                </td>
              </tr>
            ) : (
              subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-5 py-3.5 font-semibold text-slate-800 uppercase tracking-wide">
                    {sub.application_name}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                    {sub.endpoint_url}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(sub.subscribed_events) &&
                        sub.subscribed_events.map((ev, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-mono font-medium"
                          >
                            {ev}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        sub.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {sub.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleRotateSecret(sub)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Rotasi Secret
                    </button>
                    <button
                      onClick={() => handleOpenEdit(sub)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(sub)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit Subscriber */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingSub ? `Edit Subscriber: ${editingSub.application_name}` : 'Daftarkan Aplikasi Subscriber Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Aplikasi Satelit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingSub}
                  placeholder="mis. akademik, kepegawaian, keuangan"
                  value={formData.application_name}
                  onChange={(e) => setFormData({ ...formData, application_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Endpoint Webhook Penerima <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://akademik.aldeposibs.com/api/v1/webhooks/core"
                  value={formData.endpoint_url}
                  onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Event yang Ingin Dilanggan ({formData.subscribed_events.length} Dipilih)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {availableEvents.map((ev) => {
                    const isChecked = formData.subscribed_events.includes(ev.code);
                    return (
                      <label
                        key={ev.code}
                        className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEvent(ev.code)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-0"
                        />
                        <div>
                          <div className="font-mono text-[10px]">{ev.code}</div>
                          <div className="text-[10px] text-slate-400">{ev.label}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Berlangganan
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="active">Aktif (Kirim Webhook)</option>
                  <option value="inactive">Nonaktif (Pause Pengiriman)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Subscriber</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tampilkan Secret Key Baru */}
      {showSecretModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Kunci Rahasia Webhook (Secret Key)</h3>
              <button
                onClick={() => setShowSecretModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 mt-4">
              <p className="text-xs text-slate-600">
                Secret key untuk aplikasi <strong className="uppercase">{activeSecret.appName}</strong> telah
                dihasilkan. Simpan kunci ini untuk verifikasi signature payload.
              </p>

              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs flex items-center justify-between break-all">
                <span>{activeSecret.secret}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeSecret.secret);
                    alert('Secret key disalin ke clipboard!');
                  }}
                  className="p-1 hover:text-white text-emerald-300 ml-2"
                  title="Salin Secret Key"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSecretModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl"
                >
                  Saya Sudah Menyimpannya
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
