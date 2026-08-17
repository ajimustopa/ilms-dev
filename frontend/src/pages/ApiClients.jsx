import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  KeyRound,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  Copy,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function ApiClients() {
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' | 'rate-limits'
  const [clients, setClients] = useState([]);
  const [rateRules, setRateRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal State Client
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [newKeyModal, setNewKeyModal] = useState(null);

  // Modal State Rate Limit
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    api_client_id: '',
    endpoint: '/api/v1/*',
    limit_per_minute: 100,
  });

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [clientsRes, rulesRes] = await Promise.all([
        api.get('/api-clients'),
        api.get('/rate-limit-rules'),
      ]);

      if (clientsRes.data?.success && clientsRes.data.data) {
        setClients(clientsRes.data.data);
      }
      if (rulesRes.data?.success && rulesRes.data.data) {
        setRateRules(rulesRes.data.data);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal memuat data API client dan aturan rate limit'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Add Client
  const handleAddClient = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const res = await api.post('/api-clients', {
        client_name: clientName.trim(),
      });

      if (res.data?.success && res.data.data) {
        setShowClientModal(false);
        setNewKeyModal({
          name: res.data.data.client_name,
          key: res.data.data.api_key,
        });
        setClientName('');
        fetchData();
      }
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal mendaftarkan API client'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Client Status
  const handleToggleClientStatus = async (client) => {
    const nextStatus = client.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/api-clients/${client.id}/status`, { status: nextStatus });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status API client');
    }
  };

  // Handle Add/Edit Rate Limit
  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        api_client_id: ruleForm.api_client_id ? Number(ruleForm.api_client_id) : null,
        endpoint: ruleForm.endpoint.trim(),
        limit_per_minute: Number(ruleForm.limit_per_minute),
      };

      if (editingRule) {
        await api.put(`/rate-limit-rules/${editingRule.id}`, payload);
      } else {
        await api.post('/rate-limit-rules', payload);
      }

      setShowRuleModal(false);
      fetchData();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal menyimpan aturan rate limit'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (rule) => {
    if (confirm(`Hapus aturan rate limit untuk endpoint '${rule.endpoint}'?`)) {
      try {
        await api.delete(`/rate-limit-rules/${rule.id}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus aturan rate limit');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">API Gateway & Rate Limiting</h2>
          <p className="text-xs text-slate-500">
            Manajemen API Key untuk service-to-service 13 aplikasi satelit dan batas kuota request per menit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {activeTab === 'clients' ? (
            <button
              onClick={() => {
                setFormError('');
                setShowClientModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Client</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingRule(null);
                setFormError('');
                setRuleForm({ api_client_id: '', endpoint: '/api/v1/*', limit_per_minute: 100 });
                setShowRuleModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Aturan Limit</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeTab === 'clients'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          API Clients ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab('rate-limits')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeTab === 'rate-limits'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Rate Limit Rules ({rateRules.length})
        </button>
      </div>

      {/* Tab 1: API Clients */}
      {activeTab === 'clients' && (
        <>
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <span className="text-xs">Memuat data client...</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              Belum ada API client terdaftar
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <button
                        onClick={() => handleToggleClientStatus(c)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition ${
                          c.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {c.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">{c.client_name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">Hash: {c.api_key_hash?.substring(0, 16)}...</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>ID #{c.id}</span>
                    <span>Terdaftar: {new Date(c.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Rate Limit Rules */}
      {activeTab === 'rate-limits' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Target Endpoint</th>
                <th className="px-5 py-3">Klien Target</th>
                <th className="px-5 py-3">Batas Permintaan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-5 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Memuat aturan rate limit...</span>
                  </td>
                </tr>
              ) : rateRules.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-5 py-8 text-center text-slate-400">
                    Belum ada aturan rate limit terdaftar
                  </td>
                </tr>
              ) : (
                rateRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-800">
                      {rule.endpoint}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-700">
                        {rule.client_name || 'Global / Anonymous'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-emerald-700">
                      {rule.limit_per_minute} req / menit
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingRule(rule);
                          setFormError('');
                          setRuleForm({
                            api_client_id: rule.api_client_id ? String(rule.api_client_id) : '',
                            endpoint: rule.endpoint,
                            limit_per_minute: rule.limit_per_minute,
                          });
                          setShowRuleModal(true);
                        }}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule)}
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
      )}

      {/* Modal Add Client */}
      {showClientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Daftarkan API Client Baru</h3>
              <button
                onClick={() => setShowClientModal(false)}
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

            <form onSubmit={handleAddClient} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Klien / Satelit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mis. sarpras_service, perpustakaan_service"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Generate API Key</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tampilkan API Key Baru */}
      {newKeyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">API Key Berhasil Dibuat</h3>
              <button
                onClick={() => setNewKeyModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 mt-4">
              <p className="text-xs text-slate-600">
                Kunci API untuk <strong>{newKeyModal.name}</strong> hanya ditampilkan <strong>satu kali ini</strong>.
                Simpan di file <code>.env</code> aplikasi satelit Anda.
              </p>

              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs flex items-center justify-between break-all">
                <span>{newKeyModal.key}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newKeyModal.key);
                    alert('API Key disalin ke clipboard!');
                  }}
                  className="p-1 hover:text-white text-emerald-300 ml-2"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewKeyModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Rate Limit */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingRule ? 'Edit Aturan Rate Limit' : 'Tambah Aturan Rate Limit'}
              </h3>
              <button
                onClick={() => setShowRuleModal(false)}
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

            <form onSubmit={handleRuleSubmit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Klien Sasaran
                </label>
                <select
                  value={ruleForm.api_client_id}
                  onChange={(e) => setRuleForm({ ...ruleForm, api_client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">Global / Anonymous</option>
                  {clients.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.client_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Endpoint <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="/api/v1/..."
                  value={ruleForm.endpoint}
                  onChange={(e) => setRuleForm({ ...ruleForm, endpoint: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batas Request Per Menit <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={ruleForm.limit_per_minute}
                  onChange={(e) => setRuleForm({ ...ruleForm, limit_per_minute: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Simpan Aturan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
