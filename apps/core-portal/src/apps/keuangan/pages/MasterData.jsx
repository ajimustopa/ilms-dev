import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  FolderTree,
  Wallet,
  BookOpen,
  Receipt,
  Tags,
  Percent,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  Search
} from 'lucide-react';

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('cash_accounts'); // cash_accounts, coa, fee_types, categories, fee_adjustments
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [cashAccounts, setCashAccounts] = useState([]);
  const [coaList, setCoaList] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [feeAdjustments, setFeeAdjustments] = useState([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchTabData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (activeTab === 'cash_accounts') {
        const res = await api.get('/keuangan/cash-accounts');
        setCashAccounts(res.data?.data || []);
      } else if (activeTab === 'coa') {
        const res = await api.get('/keuangan/chart-of-accounts');
        setCoaList(res.data?.data || []);
      } else if (activeTab === 'fee_types') {
        const res = await api.get('/keuangan/fee-types');
        setFeeTypes(res.data?.data || []);
      } else if (activeTab === 'categories') {
        const res = await api.get('/keuangan/transaction-categories');
        setCategories(res.data?.data || []);
      } else if (activeTab === 'fee_adjustments') {
        const res = await api.get('/keuangan/student-fee-adjustments');
        setFeeAdjustments(res.data?.data || []);
      }
    } catch (err) {
      console.error('Error loading master data:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabData();
    setSearchQuery('');
  }, [activeTab]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedItem(null);
    if (activeTab === 'cash_accounts') {
      setFormData({ name: '', account_kind: 'cash', bank_name: '', bank_account_number: '', is_active: true });
    } else if (activeTab === 'coa') {
      setFormData({ account_code: '', account_name: '', account_group: 'asset', is_active: true });
    } else if (activeTab === 'fee_types') {
      setFormData({ name: '', billing_pattern: 'monthly', default_amount: 350000 });
    } else if (activeTab === 'categories') {
      setFormData({ name: '', category_type: 'income', is_active: true });
    } else if (activeTab === 'fee_adjustments') {
      setFormData({
        student_id: 1,
        fee_type_id: feeTypes[0]?.id || 1,
        adjustment_kind: 'waiver',
        waiver_type: 'Beasiswa Prestasi',
        waiver_percentage: 50,
        override_amount: '',
        notes: ''
      });
    }
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setFormData({ ...item });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      if (activeTab === 'cash_accounts') await api.delete(`/keuangan/cash-accounts/${id}`);
      else if (activeTab === 'coa') await api.delete(`/keuangan/chart-of-accounts/${id}`);
      else if (activeTab === 'fee_types') await api.delete(`/keuangan/fee-types/${id}`);
      else if (activeTab === 'categories') await api.delete(`/keuangan/transaction-categories/${id}`);
      else if (activeTab === 'fee_adjustments') await api.delete(`/keuangan/student-fee-adjustments/${id}`);
      fetchTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus data');
    }
  };

  const handleApproveAdjustment = async (id) => {
    try {
      await api.patch(`/keuangan/student-fee-adjustments/${id}/approve`);
      fetchTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyetujui beasiswa');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let endpoint = '';
      if (activeTab === 'cash_accounts') endpoint = '/keuangan/cash-accounts';
      else if (activeTab === 'coa') endpoint = '/keuangan/chart-of-accounts';
      else if (activeTab === 'fee_types') endpoint = '/keuangan/fee-types';
      else if (activeTab === 'categories') endpoint = '/keuangan/transaction-categories';
      else if (activeTab === 'fee_adjustments') endpoint = '/keuangan/student-fee-adjustments';

      if (modalMode === 'create') {
        await api.post(endpoint, formData);
      } else {
        await api.put(`${endpoint}/${selectedItem.id}`, formData);
      }
      setModalOpen(false);
      fetchTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Data Master Keuangan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengaturan kas & bank, bagan akun (COA), jenis tagihan biaya, kategori transaksi & beasiswa
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Data Baru</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {[
          { id: 'cash_accounts', label: 'Jenis Kas & Bank', icon: Wallet },
          { id: 'coa', label: 'Bagan Akun (COA)', icon: BookOpen },
          { id: 'fee_types', label: 'Jenis Biaya Tagihan', icon: Receipt },
          { id: 'categories', label: 'Kategori Transaksi', icon: Tags },
          { id: 'fee_adjustments', label: 'Keringanan & Beasiswa', icon: Percent },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari data..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Total: <span className="font-semibold text-slate-700">
            {activeTab === 'cash_accounts' && cashAccounts.length}
            {activeTab === 'coa' && coaList.length}
            {activeTab === 'fee_types' && feeTypes.length}
            {activeTab === 'categories' && categories.length}
            {activeTab === 'fee_adjustments' && feeAdjustments.length}
          </span> data
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. TAB JENIS KAS & BANK */}
            {activeTab === 'cash_accounts' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Akun Kas</th>
                    <th className="px-5 py-3">Jenis</th>
                    <th className="px-5 py-3">Nama Bank / No. Rekening</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashAccounts.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{item.name}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {item.account_kind}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {item.bank_name ? `${item.bank_name} - ${item.bank_account_number}` : '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.is_active ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">Aktif</span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">Non-aktif</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button type="button" onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-emerald-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. TAB BAGAN AKUN (COA) */}
            {activeTab === 'coa' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Kode Akun</th>
                    <th className="px-5 py-3">Nama Akun (COA)</th>
                    <th className="px-5 py-3">Kelompok Akun</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coaList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-700">{item.account_code}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{item.account_name}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {item.account_group}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {item.is_active ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">Aktif</span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">Non-aktif</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button type="button" onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-emerald-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. TAB JENIS BIAYA */}
            {activeTab === 'fee_types' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Jenis Biaya</th>
                    <th className="px-5 py-3">Pola Penagihan</th>
                    <th className="px-5 py-3">Akun Pendapatan (COA)</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feeTypes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{item.name}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {item.billing_pattern}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{item.revenue_account_name || 'Pendapatan SPP Siswa'}</td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button type="button" onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-emerald-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. TAB KATEGORI TRANSAKSI */}
            {activeTab === 'categories' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Kategori</th>
                    <th className="px-5 py-3">Jenis Mutasi</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{item.name}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.category_type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {item.category_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {item.is_active ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">Aktif</span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">Non-aktif</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button type="button" onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-emerald-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 5. TAB BEASISWA / KERINGANAN */}
            {activeTab === 'fee_adjustments' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Siswa</th>
                    <th className="px-5 py-3">Jenis Tagihan</th>
                    <th className="px-5 py-3">Bentuk Keringanan</th>
                    <th className="px-5 py-3">Potongan / Nominal</th>
                    <th className="px-5 py-3">Status Pengajuan</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feeAdjustments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{item.student_name || `Siswa ID ${item.student_id}`}</td>
                      <td className="px-5 py-3.5 text-slate-700">{item.fee_type_name || 'SPP Bulanan'}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">
                          {item.waiver_type || item.adjustment_kind}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {item.waiver_percentage ? `${item.waiver_percentage}% Diskon` : formatCurrency(item.override_amount || item.waiver_amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.status === 'approved' ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Disetujui
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">
                            Menunggu Persetujuan
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        {item.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleApproveAdjustment(item.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold"
                          >
                            Setujui
                          </button>
                        )}
                        <button type="button" onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">
                {modalMode === 'create' ? 'Tambah Data' : 'Ubah Data'} &bull; {activeTab.replace('_', ' ').toUpperCase()}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Form Input Dinamis Berdasarkan Tab */}
              {activeTab === 'cash_accounts' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Akun Kas</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Kas Utama Bendahara"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kas</label>
                    <select
                      value={formData.account_kind || 'cash'}
                      onChange={(e) => setFormData({ ...formData, account_kind: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="cash">Kas Tunai (Cash)</option>
                      <option value="bank">Rekening Bank</option>
                    </select>
                  </div>
                  {formData.account_kind === 'bank' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Bank</label>
                        <input
                          type="text"
                          value={formData.bank_name || ''}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          placeholder="BCA / BSI / Mandiri"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Rekening</label>
                        <input
                          type="text"
                          value={formData.bank_account_number || ''}
                          onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                          placeholder="1234567890"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {activeTab === 'coa' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Akun (COA)</label>
                    <input
                      type="text"
                      required
                      value={formData.account_code || ''}
                      onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                      placeholder="Contoh: 1-100"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Akun</label>
                    <input
                      type="text"
                      required
                      value={formData.account_name || ''}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      placeholder="Contoh: Kas Utama"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kelompok Akun</label>
                    <select
                      value={formData.account_group || 'asset'}
                      onChange={(e) => setFormData({ ...formData, account_group: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="asset">Aset / Harta (Asset)</option>
                      <option value="liability">Kewajiban / Hutang (Liability)</option>
                      <option value="equity">Modal / Ekuitas (Equity)</option>
                      <option value="revenue">Pendapatan (Revenue)</option>
                      <option value="expense">Beban / Pengeluaran (Expense)</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'fee_types' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Jenis Biaya</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: SPP Bulanan"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pola Penagihan</label>
                    <select
                      value={formData.billing_pattern || 'monthly'}
                      onChange={(e) => setFormData({ ...formData, billing_pattern: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="monthly">Bulanan (Monthly)</option>
                      <option value="yearly">Tahunan (Yearly)</option>
                      <option value="one_time">Sekali Bayar (One Time)</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
