import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import Payroll from './Payroll';
import {
  Wallet,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Loader2,
  X,
  FileSpreadsheet,
  RotateCw,
  AlertTriangle,
  Tag,
  Coins,
  FileText,
  Layers,
  ArrowLeftRight,
  HelpCircle,
  CheckCircle2,
  Building2,
  Search,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';

export default function Expenses() {
  const { activeSchoolUnit } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMainTab = searchParams.get('tab') === 'payroll' ? 'payroll' : 'expenses';
  const [mainTab, setMainTab] = useState(initialMainTab);

  const [expenses, setExpenses] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [fundBalances, setFundBalances] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'payroll' && mainTab !== 'payroll') {
      setMainTab('payroll');
    }
  }, [searchParams]);

  const handleMainTabChange = (t) => {
    setMainTab(t);
    if (t === 'payroll') {
      setSearchParams({ tab: 'payroll' });
    } else {
      setSearchParams({});
    }
  };

  // Filters
  const [filterBudgetStatus, setFilterBudgetStatus] = useState('all'); // 'all' | 'budgeted' | 'outside'
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    unit: 'pcs',
    unit_price: 0,
    quantity: 1,
    vendor: '',
    expense_date: new Date().toISOString().slice(0, 10),
    proof_number: '',
    budget_plan_expense_item_id: '',
    is_outside_budget: false,
    academic_year_id: '',
    fund_source_type: 'opening_pool',
    fund_source_ref_id: 0,
    fund_source_override_reason: '',
    fund_sources: null,
    notes: ''
  });

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editFormData, setEditFormData] = useState({
    item_name: '',
    unit: 'pcs',
    unit_price: 0,
    quantity: 1,
    vendor: '',
    expense_date: '',
    proof_number: '',
    budget_plan_expense_item_id: '',
    is_outside_budget: false,
    notes: '',
    edit_reason: ''
  });

  // Reassign Fund Source Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignExpense, setReassignExpense] = useState(null);
  const [reassignForm, setReassignForm] = useState({
    fund_source_type: 'opening_pool',
    fund_source_ref_id: 0,
    reason: ''
  });

  // Cancel / Soft Delete Modal State (Audit Storno Reversal)
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [expenseToCancel, setExpenseToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [availableFundGroups, setAvailableFundGroups] = useState([]);

  const fetchAvailableFundSources = async (ayId) => {
    try {
      const res = await api.get('/keuangan/fund-balances/available-sources', {
        params: { academic_year_id: ayId || selectedAcademicYearId || undefined }
      });
      if (res.data?.success) {
        setAvailableFundGroups(res.data.data?.groups || []);
      }
    } catch (err) {
      console.warn('Error fetching available fund sources:', err.message);
    }
  };

  const fetchExpensesAndBudgetItems = async () => {
    setLoading(true);
    try {
      const expParams = {};
      if (selectedAcademicYearId) expParams.academic_year_id = selectedAcademicYearId;
      if (filterBudgetStatus === 'budgeted') expParams.is_outside_budget = '0';
      if (filterBudgetStatus === 'outside') expParams.is_outside_budget = '1';

      const [expRes, budgetRes, fundRes, feeTypesRes, ayRes] = await Promise.all([
        api.get('/keuangan/expenses', { params: expParams }),
        api.get('/keuangan/budget-plans').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/fund-balances').catch(() => ({ data: { data: { funds: [] } } })),
        api.get('/keuangan/fee-types?is_active=true').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/academic-years').catch(() => null)
          || api.get('/akademik/academic-years').catch(() => null)
      ]);

      setExpenses(expRes.data?.data || []);
      setFundBalances(fundRes.data?.data?.funds || []);
      setFeeTypes(feeTypesRes.data?.data || []);

      const yearsList = ayRes?.data?.data || ayRes?.data?.academic_years || [];
      setAcademicYears(yearsList);
      if (yearsList.length > 0 && !selectedAcademicYearId) {
        const activeYear = yearsList.find(y => y.is_active) || yearsList[0];
        setSelectedAcademicYearId(String(activeYear.id));
        setFormData(prev => ({ ...prev, academic_year_id: activeYear.id }));
        fetchAvailableFundSources(activeYear.id);
      } else if (selectedAcademicYearId) {
        fetchAvailableFundSources(selectedAcademicYearId);
      }

      // Ambil seluruh expense items dari rencana anggaran aktif
      const plans = budgetRes.data?.data || [];
      const allItems = [];
      for (const p of plans) {
        if (p.expense_items && Array.isArray(p.expense_items)) {
          p.expense_items.forEach(it => {
            allItems.push({
              ...it,
              plan_title: p.title,
              academic_year_id: p.academic_year_id
            });
          });
        }
      }
      setBudgetItems(allItems);
    } catch (err) {
      console.error('Error fetching expenses/budget items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesAndBudgetItems();
  }, [activeSchoolUnit, selectedAcademicYearId, filterBudgetStatus]);

  // Handler saat memilih item RAPBS di modal catat pengeluaran
  const handleSelectBudgetItem = (itemId) => {
    if (!itemId) {
      setFormData(prev => ({
        ...prev,
        budget_plan_expense_item_id: '',
        is_outside_budget: true
      }));
      return;
    }

    const item = budgetItems.find(x => x.id === parseInt(itemId, 10));
    if (!item) return;

    let defaultFundType = 'opening_pool';
    let defaultFundRefId = 0;
    if (item.fund_source_fee_type_id) {
      defaultFundType = 'fee_type';
      defaultFundRefId = item.fund_source_fee_type_id;
    } else if (item.fund_source_income_item_id) {
      defaultFundType = 'transaction_category';
      defaultFundRefId = item.fund_source_income_item_id;
    }

    let parsedSources = null;
    if (item.fund_sources) {
      try {
        parsedSources = typeof item.fund_sources === 'string'
          ? JSON.parse(item.fund_sources)
          : item.fund_sources;
      } catch (e) {}
    }

    setFormData(prev => ({
      ...prev,
      budget_plan_expense_item_id: itemId,
      is_outside_budget: false,
      item_name: item.name || item.item_name || prev.item_name,
      unit: item.unit || prev.unit || 'pcs',
      unit_price: parseFloat(item.unit_price || item.planned_amount || prev.unit_price || 0),
      quantity: parseFloat(item.quantity || prev.quantity || 1),
      fund_source_type: defaultFundType,
      fund_source_ref_id: defaultFundRefId,
      fund_sources: parsedSources,
      academic_year_id: item.academic_year_id || prev.academic_year_id
    }));
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        academic_year_id: Number(formData.academic_year_id || selectedAcademicYearId || 2),
        budget_plan_expense_item_id: formData.is_outside_budget ? null : (formData.budget_plan_expense_item_id || null)
      };

      const res = await api.post('/keuangan/expenses', payload);
      alert('Pengeluaran berhasil dicatat & jurnal otomatis telah dibukukan!');
      if (res.data?.data?.budget_warning) {
        alert(res.data.data.budget_warning);
      }
      setModalOpen(false);
      fetchExpensesAndBudgetItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (expense) => {
    setEditingExpense(expense);
    setEditFormData({
      item_name: expense.item_name || '',
      unit: expense.unit || 'pcs',
      unit_price: parseFloat(expense.unit_price || 0),
      quantity: parseFloat(expense.quantity || 1),
      vendor: expense.vendor || '',
      expense_date: expense.expense_date || '',
      proof_number: expense.proof_number || '',
      budget_plan_expense_item_id: expense.budget_plan_expense_item_id || '',
      is_outside_budget: Boolean(expense.is_outside_budget),
      notes: expense.notes || '',
      edit_reason: ''
    });
    setEditModalOpen(true);
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;
    setSubmitting(true);
    try {
      const payload = {
        ...editFormData,
        budget_plan_expense_item_id: editFormData.is_outside_budget ? null : (editFormData.budget_plan_expense_item_id || null)
      };
      await api.put(`/keuangan/expenses/${editingExpense.id}`, payload);
      alert('Pengeluaran belanja berhasil diperbarui.');
      setEditModalOpen(false);
      fetchExpensesAndBudgetItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReassign = (expense) => {
    setReassignExpense(expense);
    setReassignForm({
      fund_source_type: expense.fund_source_type || 'opening_pool',
      fund_source_ref_id: expense.fund_source_ref_id || 0,
      reason: ''
    });
    setReassignModalOpen(true);
  };

  const handleReassignFundSource = async (e) => {
    e.preventDefault();
    if (!reassignExpense) return;
    setSubmitting(true);
    try {
      await api.patch(`/keuangan/expenses/${reassignExpense.id}/fund-source`, reassignForm);
      alert('Sumber dana belanja berhasil dialokasikan ulang ke kantong baru!');
      setReassignModalOpen(false);
      fetchExpensesAndBudgetItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal merealokasi sumber dana');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Storno Reversal Confirmation Modal
  const handleOpenCancelModal = (expense) => {
    setExpenseToCancel(expense);
    setCancellationReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancelExpense = async (e) => {
    e.preventDefault();
    if (!expenseToCancel) return;
    if (!cancellationReason.trim()) {
      alert('Alasan pembatalan/penghapusan pengeluaran wajib diisi.');
      return;
    }

    setCancelling(true);
    try {
      const res = await api.delete(`/keuangan/expenses/${expenseToCancel.id}`, {
        data: { deleted_reason: cancellationReason }
      });
      alert(res.data?.message || 'Pengeluaran berhasil dibatalkan dan jurnal pembalik (storno) telah diterbitkan.');
      setCancelModalOpen(false);
      setExpenseToCancel(null);
      fetchExpensesAndBudgetItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan pengeluaran');
    } finally {
      setCancelling(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchItem = exp.item_name && exp.item_name.toLowerCase().includes(q);
        const matchVendor = exp.vendor && exp.vendor.toLowerCase().includes(q);
        const matchKwt = exp.proof_number && exp.proof_number.toLowerCase().includes(q);
        if (!matchItem && !matchVendor && !matchKwt) return false;
      }
      return true;
    });
  }, [expenses, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Tab Switcher: Belanja Operasional vs Payroll */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => handleMainTabChange('expenses')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
            mainTab === 'expenses'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Belanja Operasional & Pengadaan (RAPBS)</span>
        </button>

        <button
          type="button"
          onClick={() => handleMainTabChange('payroll')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
            mainTab === 'payroll'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Penggajian Pegawai (Payroll)</span>
        </button>
      </div>

      {mainTab === 'payroll' ? (
        <Payroll isEmbedded={true} />
      ) : (
        <div className="space-y-6">
          {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Pengeluaran & Belanja Sekolah
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan realisasi belanja fleksibel terhubung RAPBS, akomodasi pos non-budgeted, dan jurnal pembalik audit-compliant
          </p>
        </div>

        {/* Global Multi-Tenant Info */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 bg-slate-100 rounded-xl font-medium text-slate-700 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            {activeSchoolUnit?.name || 'Seluruh Satuan'}
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl font-medium">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>T.A.:</span>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="bg-transparent font-bold focus:outline-none cursor-pointer"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({
                item_name: '',
                unit: 'pcs',
                unit_price: 0,
                quantity: 1,
                vendor: '',
                expense_date: new Date().toISOString().slice(0, 10),
                proof_number: '',
                budget_plan_expense_item_id: '',
                is_outside_budget: false,
                academic_year_id: selectedAcademicYearId,
                fund_source_type: 'opening_pool',
                fund_source_ref_id: 0,
                fund_source_override_reason: '',
                fund_sources: null,
                notes: ''
              });
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700">Status Anggaran:</span>
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterBudgetStatus('all')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                filterBudgetStatus === 'all' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({expenses.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterBudgetStatus('budgeted')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                filterBudgetStatus === 'budgeted' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Rencana RAPBS
            </button>
            <button
              type="button"
              onClick={() => setFilterBudgetStatus('outside')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                filterBudgetStatus === 'outside' ? 'bg-amber-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚠️ Di Luar RAPBS
            </button>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama barang, vendor, atau kwitansi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Table List Expenses */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            Daftar Realisasi Pengeluaran & Belanja ({filteredExpenses.length})
          </span>
          <button
            type="button"
            onClick={fetchExpensesAndBudgetItems}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Muat Ulang</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs">Memuat daftar belanja...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic">
            Belum ada transaksi pengeluaran pada kriteria filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Tanggal & Bukti</th>
                  <th className="px-4 py-3">Item Belanja / Vendor</th>
                  <th className="px-4 py-3">Status Anggaran</th>
                  <th className="px-4 py-3">Sumber Dana</th>
                  <th className="px-4 py-3 text-right">Volume</th>
                  <th className="px-4 py-3 text-right">Harga Satuan</th>
                  <th className="px-4 py-3 text-right">Total Realisasi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-slate-700 font-medium">{exp.expense_date}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {exp.proof_number ? `Bukti: ${exp.proof_number}` : `ID: #${exp.id}`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{exp.item_name}</p>
                      <p className="text-[11px] text-slate-500">{exp.vendor || 'Tanpa Vendor'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {exp.is_outside_budget ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Di Luar RAPBS
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Rencana RAPBS
                          </span>
                          <p className="text-[10px] text-slate-500 truncate max-w-[140px]" title={exp.budget_item_name}>
                            {exp.budget_item_name || 'Item RAPBS'}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {exp.fund_sources ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-[10px] border border-blue-200">
                          Multi-Sumber Dana
                        </span>
                      ) : (
                        <span className="text-[11px]">
                          {exp.actual_fund_fee_name || exp.actual_fund_cat_name || exp.default_fund_source_name || 'Opening Pool'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {parseFloat(exp.quantity)} {exp.unit || ''}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {formatCurrency(exp.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(exp.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Ubah Rincian Realisasi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReassign(exp)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Realokasi Sumber Dana"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCancelModal(exp)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Batalkan Pengeluaran & Terbitkan Storno"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: CATAT PENGELUARAN (RAPBS ATAU NON-BUDGETED)       */}
      {/* ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">Catat Realisasi Pengeluaran & Belanja</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              {/* Opsi Budget: Rencana RAPBS vs Non-Budgeted */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Kesesuaian Anggaran:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_outside_budget}
                      onChange={(e) => {
                        const isOutside = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          is_outside_budget: isOutside,
                          budget_plan_expense_item_id: isOutside ? '' : prev.budget_plan_expense_item_id
                        }));
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="font-semibold text-amber-800 text-xs">
                      Pengeluaran di Luar Rencana RAPBS (Non-Budgeted)
                    </span>
                  </label>
                </div>

                {!formData.is_outside_budget ? (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Pilih Item Rencana Anggaran RAPBS *
                    </label>
                    <select
                      value={formData.budget_plan_expense_item_id}
                      onChange={(e) => handleSelectBudgetItem(e.target.value)}
                      required={!formData.is_outside_budget}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800"
                    >
                      <option value="">-- Pilih Mata Anggaran Belanja RAPBS --</option>
                      {budgetItems.map((bi) => (
                        <option key={bi.id} value={bi.id}>
                          {bi.name || bi.item_name} (Pagu: {formatCurrency(bi.planned_amount || bi.total_price)})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      * Nominal & rincian belanja tetap dapat disesuaikan dengan realisasi faktur riil di bawah.
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      Belanja ini dicatat sebagai <b>di luar pagu RAPBS</b> dan akan ditandai khusus pada laporan serapan anggaran.
                    </span>
                  </div>
                )}
              </div>

              {/* Rincian Belanja Riil */}
              <div className="space-y-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Barang / Keperluan Belanja *</label>
                  <input
                    type="text"
                    value={formData.item_name}
                    onChange={(e) => setFormData(p => ({ ...p, item_name: e.target.value }))}
                    required
                    placeholder="Contoh: Kertas HVS F4 70gr Sinar Dunia"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Volume *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.quantity}
                      onChange={(e) => setFormData(p => ({ ...p, quantity: e.target.value }))}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Satuan</label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData(p => ({ ...p, unit: e.target.value }))}
                      placeholder="rim/dus/pcs"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Harga Satuan (Rp) *</label>
                    <input
                      type="number"
                      value={formData.unit_price}
                      onChange={(e) => setFormData(p => ({ ...p, unit_price: e.target.value }))}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-100/80 rounded-xl flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Total Realisasi Pengeluaran:</span>
                  <span className="text-emerald-700 text-sm font-mono">
                    {formatCurrency((parseFloat(formData.quantity) || 0) * (parseFloat(formData.unit_price) || 0))}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Vendor / Toko Penyedia</label>
                    <input
                      type="text"
                      value={formData.vendor}
                      onChange={(e) => setFormData(p => ({ ...p, vendor: e.target.value }))}
                      placeholder="Nama toko / rekanan"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Tanggal Belanja *</label>
                    <input
                      type="date"
                      value={formData.expense_date}
                      onChange={(e) => setFormData(p => ({ ...p, expense_date: e.target.value }))}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">No. Bukti / Kwitansi / Faktur</label>
                  <input
                    type="text"
                    value={formData.proof_number}
                    onChange={(e) => setFormData(p => ({ ...p, proof_number: e.target.value }))}
                    placeholder="Contoh: INV-2026-088"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                {/* Peruntukan Tahun Ajaran */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Peruntukan Tahun Ajaran *
                  </label>
                  <select
                    value={formData.academic_year_id || selectedAcademicYearId || ''}
                    onChange={(e) => {
                      const newAyId = Number(e.target.value);
                      setFormData(p => ({ ...p, academic_year_id: newAyId }));
                      fetchAvailableFundSources(newAyId);
                    }}
                    required
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        Tahun Ajaran {ay.name} {ay.is_active ? '(Tahun Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    * Aliran dana dan beban belanja dibukukan pada konteks tahun ajaran yang dipilih, meskipun tanggal kalender belanja berbeda.
                  </p>
                </div>

                {/* Pemilihan Pos Alokasi Sumber Dana */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pos Alokasi Sumber Dana *</label>
                  <select
                    value={`${formData.fund_source_type}:${formData.fund_source_ref_id}:${formData.fund_source_scope || 'current'}:${formData.target_academic_year_id || ''}`}
                    onChange={(e) => {
                      const [t, r, scope, targetAy] = e.target.value.split(':');
                      setFormData(p => ({
                        ...p,
                        fund_source_type: t,
                        fund_source_ref_id: Number(r),
                        fund_source_scope: scope,
                        target_academic_year_id: targetAy ? Number(targetAy) : undefined,
                        fund_source_academic_year_id: targetAy ? Number(targetAy) : undefined
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableFundGroups.map((grp, gIdx) => (
                      <optgroup key={gIdx} label={grp.group_title}>
                        {grp.options.map((opt) => (
                          <option
                            key={opt.key}
                            value={`${opt.fund_type}:${opt.fund_ref_id}:${opt.scope || 'current'}:${opt.target_academic_year_id || ''}`}
                          >
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {availableFundGroups.length === 0 && (
                      <>
                        <option value="opening_pool:0:current:">Saldo Awal Kas (Opening Pool)</option>
                        {feeTypes.map((ft) => (
                          <option key={ft.id} value={`fee_type:${ft.id}:current:`}>
                            Dana {ft.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    * Dapat memilih belanja dibebankan dari pos dana tahun berjalan atau menggunakan saldo bawaan tahun sebelumnya.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Catatan / Keterangan Tambahan</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Rincian tambahan..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold shadow-xs"
                >
                  {submitting ? 'Memproses...' : 'Simpan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: UBAH RINCIAN PENGELUARAN                         */}
      {/* ========================================================= */}
      {editModalOpen && editingExpense && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Ubah Realisasi Pengeluaran #{editingExpense.id}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Barang / Belanja *</label>
                <input
                  type="text"
                  value={editFormData.item_name}
                  onChange={(e) => setEditFormData(p => ({ ...p, item_name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Volume</label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData(p => ({ ...p, quantity: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={editFormData.unit}
                    onChange={(e) => setEditFormData(p => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Harga Satuan</label>
                  <input
                    type="number"
                    value={editFormData.unit_price}
                    onChange={(e) => setEditFormData(p => ({ ...p, unit_price: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Alasan Pengubahan (Edit Reason) *</label>
                <input
                  type="text"
                  placeholder="Wajib diisi untuk audit log..."
                  value={editFormData.edit_reason}
                  onChange={(e) => setEditFormData(p => ({ ...p, edit_reason: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-950 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-xs"
                >
                  {submitting ? 'Memproses...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: KONFIRMASI PEMBATALAN / STORNO REVERSAL          */}
      {/* ========================================================= */}
      {cancelModalOpen && expenseToCancel && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-slate-800 text-sm">Konfirmasi Pembatalan Belanja (Storno)</h3>
              </div>
              <button onClick={() => setCancelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Item Belanja:</span>
                <span className="font-bold text-slate-800">{expenseToCancel.item_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Nominal:</span>
                <span className="font-bold font-mono text-rose-700">{formatCurrency(expenseToCancel.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tgl Transaksi:</span>
                <span className="font-mono text-slate-700">{expenseToCancel.expense_date}</span>
              </div>
            </div>

            {/* Audit Notice */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Kepatuhan Standar Akuntansi & Audit Trail:
              </p>
              <p>
                Sistem akan menerbitkan <b>Jurnal Pembalik (Storno Reversal Entry)</b> pada Buku Besar untuk mendebit kembali kas dan mengkredit beban, serta mengembalikan saldo ke kantong dana asal secara utuh.
              </p>
            </div>

            <form onSubmit={handleConfirmCancelExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Alasan Pembatalan / Penghapusan *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Wajib mencantumkan alasan pembatalan resmi..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {cancelling ? 'Membatalkan...' : 'Batalkan Belanja & Terbitkan Storno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: REALOKASI SUMBER DANA BELANJA                    */}
      {/* ========================================================= */}
      {reassignModalOpen && reassignExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-indigo-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-indigo-600">
                <ArrowLeftRight className="w-5 h-5" />
                <h3 className="font-bold text-slate-800 text-sm">Realokasi Pos Alokasi Sumber Dana</h3>
              </div>
              <button onClick={() => setReassignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Item Belanja:</span>
                <span className="font-bold text-slate-800">{reassignExpense.item_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Nominal:</span>
                <span className="font-bold font-mono text-slate-900">{formatCurrency(reassignExpense.total_amount)}</span>
              </div>
            </div>

            <form onSubmit={handleReassignFundSource} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Pindah ke Pos Alokasi Sumber Dana Baru *
                </label>
                <select
                  value={`${reassignForm.fund_source_type}:${reassignForm.fund_source_ref_id}`}
                  onChange={(e) => {
                    const [t, r] = e.target.value.split(':');
                    setReassignForm(p => ({ ...p, fund_source_type: t, fund_source_ref_id: Number(r) }));
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {availableFundGroups.map((grp, gIdx) => (
                    <optgroup key={gIdx} label={grp.group_title}>
                      {grp.options.map((opt) => (
                        <option key={opt.key} value={`${opt.fund_type}:${opt.fund_ref_id}`}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {availableFundGroups.length === 0 && (
                    <>
                      <option value="opening_pool:0">Saldo Awal Kas (Opening Pool)</option>
                      {feeTypes.map((ft) => (
                        <option key={ft.id} value={`fee_type:${ft.id}`}>
                          Dana {ft.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Alasan Realokasi Sumber Dana *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Realokasi beban ke dana BOS / Saldo Bawaan Tahun Lalu..."
                  value={reassignForm.reason}
                  onChange={(e) => setReassignForm(p => ({ ...p, reason: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {submitting ? 'Memproses...' : 'Konfirmasi Realokasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
