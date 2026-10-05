import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
import StatementMatchIndicator from '../../../shared/components/StatementMatchIndicator';
import { formatCurrency, formatNumber, formatDate } from '../../../shared/utils/formatters';
import {
  PackagePlus,
  Plus,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  X,
  Calendar,
  Layers,
  Store,
  ShoppingBag,
  Coins,
  Boxes,
  Sparkles,
  CheckCircle2,
  FileText,
  Clock,
  Tag,
  Copy,
  AlertTriangle,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  Settings,
  BookOpen,
  Building2,
  CreditCard,
  BadgeCheck,
  Info
} from 'lucide-react';

/**
 * Helper menghitung status kelayakan tanggal kadaluarsa
 */
export function getExpiryInfo(expired_at) {
  if (!expired_at) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expired_at);
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.round((exp - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      days: diffDays,
      label: `Kadaluarsa (${Math.abs(diffDays)} hari lalu)`,
      shortLabel: `Expired ${Math.abs(diffDays)}h lalu`,
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      isWarning: true
    };
  }
  if (diffDays === 0) {
    return {
      status: 'today',
      days: 0,
      label: 'Kadaluarsa Hari Ini!',
      shortLabel: 'Exp Hari Ini',
      badgeClass: 'bg-rose-100 text-rose-900 border border-rose-300 font-extrabold animate-pulse',
      isWarning: true
    };
  }
  if (diffDays <= 7) {
    return {
      status: 'critical',
      days: diffDays,
      label: `Kritis: Sisa ${diffDays} hari lagi`,
      shortLabel: `Exp ${diffDays} hari`,
      badgeClass: 'bg-rose-50 text-rose-800 border border-rose-200 font-bold',
      isWarning: true
    };
  }
  if (diffDays <= 30) {
    return {
      status: 'warning',
      days: diffDays,
      label: `Mendekati: Sisa ${diffDays} hari lagi`,
      shortLabel: `Exp ${diffDays} hari`,
      badgeClass: 'bg-amber-50 text-amber-900 border border-amber-300 font-bold',
      isWarning: false
    };
  }
  return {
    status: 'good',
    days: diffDays,
    label: `Aman / Layak (${diffDays} hari lagi)`,
    shortLabel: `Exp: ${String(expired_at).slice(0, 10)}`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium',
    isWarning: false
  };
}

export default function PenerimaanBarang() {
  const [receipts, setReceipts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);
  const [loadingBankStatements, setLoadingBankStatements] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'titipan' | 'belanja_sendiri'
  const [expiryFilter, setExpiryFilter] = useState('all'); // 'all' | 'warning' | 'good'
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Accounting Config State
  const [accountingConfig, setAccountingConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    cash_account_id_tunai: '',
    cash_account_name_tunai: '',
    cash_account_id_bank: '',
    cash_account_name_bank: '',
    inventory_coa_id: '',
    inventory_coa_code: '',
    inventory_coa_name: '',
    consignment_inventory_coa_id: '',
    consignment_inventory_coa_code: '',
    consignment_inventory_coa_name: '',
    consignment_payable_coa_id: '',
    consignment_payable_coa_code: '',
    consignment_payable_coa_name: '',
    trade_payable_coa_id: '',
    trade_payable_coa_code: '',
    trade_payable_coa_name: '',
    cash_coa_id: '',
    cash_coa_code: '',
    cash_coa_name: '',
    bank_coa_id: '',
    bank_coa_code: '',
    bank_coa_name: '',
    fund_source_name: 'Pos Pengadaan Stok & Pembelian SBU Kantin',
    auto_journal: true
  });
  const [configSuccessMsg, setConfigSuccessMsg] = useState(null);
  const [configErrorMsg, setConfigErrorMsg] = useState(null);

  // Helper generate No. Batch / Lot otomatis
  const generateBatchNumber = (dateStr, seq = 1) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    const month = String(isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1).padStart(2, '0');
    const day = String(isNaN(d.getTime()) ? new Date().getDate() : d.getDate()).padStart(2, '0');
    const dateFormatted = `${year}${month}${day}`;
    const seqFormatted = String(seq).padStart(2, '0');
    return `LOT-${dateFormatted}-${seqFormatted}`;
  };

  // Helper generate No. Surat Jalan / Faktur otomatis
  const generateInvoiceNumber = (dateStr, receiptsList = receipts) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    const month = String(isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1).padStart(2, '0');
    const day = String(isNaN(d.getTime()) ? new Date().getDate() : d.getDate()).padStart(2, '0');
    const dateCompact = `${year}${month}${day}`;

    const datePrefix = `${year}-${month}-${day}`;
    const countSameDay = (receiptsList || []).filter(r => (r.receipt_date || '').startsWith(datePrefix)).length + 1;
    const seq = String(countSameDay).padStart(3, '0');
    return `SJ-${dateCompact}-${seq}`;
  };

  // Form State
  const [receiptType, setReceiptType] = useState('titipan'); // 'titipan' | 'belanja_sendiri'
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'transfer' | 'credit'
  const [selectedCashAccountId, setSelectedCashAccountId] = useState('');
  const [selectedBankStatementId, setSelectedBankStatementId] = useState('');
  const [fundSourceName, setFundSourceName] = useState('Pos Pengadaan Stok & Pembelian SBU Kantin');
  const [note, setNote] = useState('');
  const [items, setItems] = useState([
    {
      vendor_product_id: '',
      qty: 10,
      cost_price: 0,
      sale_price: 0,
      batch_number: generateBatchNumber(new Date().toISOString().slice(0, 10), 1),
      expired_at: ''
    }
  ]);

  const fetchAccountingConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await api.get('/kantin/goods-receipts/accounting-config');
      const data = res.data?.data;
      if (data) {
        setAccountingConfig(data);
        if (data.cash_accounts) {
          setCashAccounts(data.cash_accounts);
        }
        if (data.settings) {
          setConfigForm({
            cash_account_id_tunai: data.settings.cash_account_id_tunai ? String(data.settings.cash_account_id_tunai) : '',
            cash_account_name_tunai: data.settings.cash_account_name_tunai || '',
            cash_account_id_bank: data.settings.cash_account_id_bank ? String(data.settings.cash_account_id_bank) : '',
            cash_account_name_bank: data.settings.cash_account_name_bank || '',
            inventory_coa_id: data.settings.inventory_coa_id ? String(data.settings.inventory_coa_id) : '',
            inventory_coa_code: data.settings.inventory_coa_code || '',
            inventory_coa_name: data.settings.inventory_coa_name || '',
            consignment_inventory_coa_id: data.settings.consignment_inventory_coa_id ? String(data.settings.consignment_inventory_coa_id) : '',
            consignment_inventory_coa_code: data.settings.consignment_inventory_coa_code || '',
            consignment_inventory_coa_name: data.settings.consignment_inventory_coa_name || '',
            consignment_payable_coa_id: data.settings.consignment_payable_coa_id ? String(data.settings.consignment_payable_coa_id) : '',
            consignment_payable_coa_code: data.settings.consignment_payable_coa_code || '',
            consignment_payable_coa_name: data.settings.consignment_payable_coa_name || '',
            trade_payable_coa_id: data.settings.trade_payable_coa_id ? String(data.settings.trade_payable_coa_id) : '',
            trade_payable_coa_code: data.settings.trade_payable_coa_code || '',
            trade_payable_coa_name: data.settings.trade_payable_coa_name || '',
            cash_coa_id: data.settings.cash_coa_id ? String(data.settings.cash_coa_id) : '',
            cash_coa_code: data.settings.cash_coa_code || '',
            cash_coa_name: data.settings.cash_coa_name || '',
            bank_coa_id: data.settings.bank_coa_id ? String(data.settings.bank_coa_id) : '',
            bank_coa_code: data.settings.bank_coa_code || '',
            bank_coa_name: data.settings.bank_coa_name || '',
            fund_source_name: data.settings.fund_source_name || 'Pos Pengadaan Stok & Pembelian SBU Kantin',
            auto_journal: data.settings.auto_journal !== undefined ? data.settings.auto_journal : true
          });
          if (data.settings.fund_source_name) {
            setFundSourceName(data.settings.fund_source_name);
          }
          if (data.settings.cash_account_id_tunai && !selectedCashAccountId) {
            setSelectedCashAccountId(String(data.settings.cash_account_id_tunai));
          }
        }
      }
    } catch (err) {
      console.warn('Gagal memuat konfigurasi akuntansi penerimaan barang:', err.message);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveAccountingConfig = async (e) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    setConfigErrorMsg(null);
    setConfigSuccessMsg(null);
    try {
      const res = await api.put('/kantin/goods-receipts/accounting-config', configForm);
      const data = res.data?.data;
      if (data) {
        setAccountingConfig(data);
      }
      setConfigSuccessMsg('✅ Konfigurasi default akuntansi penerimaan barang berhasil disimpan!');
      setTimeout(() => {
        setShowConfigModal(false);
        setConfigSuccessMsg(null);
      }, 1500);
    } catch (err) {
      setConfigErrorMsg(err.response?.data?.message || err.message || 'Gagal menyimpan konfigurasi akuntansi');
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchBankStatements = async (cashAccId = null) => {
    setLoadingBankStatements(true);
    try {
      const params = {};
      if (cashAccId) params.cash_account_id = cashAccId;
      const res = await api.get('/kantin/goods-receipts/bank-statements', { params });
      setBankStatements(res.data?.data || []);
    } catch (err) {
      console.warn('Gagal memuat rekening koran:', err);
    } finally {
      setLoadingBankStatements(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRec, resVen, resProd] = await Promise.all([
        api.get('/kantin/goods-receipts'),
        api.get('/kantin/vendors?status=active'),
        api.get('/kantin/vendor-products?status=active')
      ]);
      setReceipts(resRec.data?.data || []);
      setVendors(resVen.data?.data || []);
      setProducts(resProd.data?.data || []);

      if (resVen.data?.data?.length > 0 && !selectedVendorId) {
        setSelectedVendorId(resVen.data.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching goods receipts data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAccountingConfig();
  }, []);

  // Dropdown options yang diformat untuk SearchableSelect
  const vendorOptions = useMemo(() => {
    return vendors.map(v => ({
      value: v.id,
      label: v.vendor_name,
      sublabel: v.contact ? `Kontak: ${v.contact}` : (v.address || undefined),
      badge: (v.vendor_type || 'konsinyasi') === 'beli_putus' 
        ? 'Beli Putus (Suplier)' 
        : (v.canteen_share_pct ? `Konsinyasi ${v.canteen_share_pct}%` : 'Konsinyasi'),
      badgeClass: (v.vendor_type || 'konsinyasi') === 'beli_putus'
        ? 'bg-blue-50 text-blue-700 border border-blue-200'
        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    }));
  }, [vendors]);

  const productOptions = useMemo(() => {
    const filtered = selectedVendorId
      ? products.filter(p => String(p.vendor_id) === String(selectedVendorId))
      : products;

    return filtered.map(p => ({
      value: p.id,
      label: p.product_name,
      sublabel: `Stok saat ini: ${p.current_stock || 0} ${p.unit || 'pcs'} • HPP: Rp ${formatNumber(p.cost_price || 0)}`,
      badge: p.category || undefined,
      badgeClass: 'bg-slate-100 text-slate-700'
    }));
  }, [products, selectedVendorId]);

  const openCreateModal = () => {
    setReceiptType('titipan');
    const firstVendorId = vendors[0]?.id || '';
    setSelectedVendorId(firstVendorId);
    const today = new Date().toISOString().slice(0, 10);
    setReceiptDate(today);
    setInvoiceNumber(generateInvoiceNumber(today, receipts));
    setPaymentMethod('cash');
    setSelectedCashAccountId(accountingConfig?.settings?.cash_account_id_tunai ? String(accountingConfig.settings.cash_account_id_tunai) : '');
    setSelectedBankStatementId('');
    setFundSourceName(accountingConfig?.settings?.fund_source_name || 'Pos Pengadaan Stok & Pembelian SBU Kantin');
    setNote('');

    const vendorProds = firstVendorId
      ? products.filter(p => String(p.vendor_id) === String(firstVendorId))
      : products;
    const defaultProd = vendorProds[0];

    setItems([{
      vendor_product_id: defaultProd ? defaultProd.id : '',
      qty: 10,
      cost_price: defaultProd ? Number(defaultProd.cost_price) || 0 : 0,
      sale_price: defaultProd ? Number(defaultProd.sale_price) || 0 : 0,
      batch_number: generateBatchNumber(today, 1),
      expired_at: ''
    }]);

    setError(null);
    setShowModal(true);
  };

  const handleReceiptDateChange = (newDate) => {
    setReceiptDate(newDate);
    if (newDate) {
      if (!invoiceNumber || /^SJ-\d{8}-\d+/.test(invoiceNumber)) {
        setInvoiceNumber(generateInvoiceNumber(newDate, receipts));
      }

      setItems(prev => prev.map((item, idx) => {
        if (!item.batch_number || /^LOT-\d{8}-\d+/.test(item.batch_number)) {
          const suffix = item.batch_number?.match(/-B\d+$/)?.[0] || '';
          return {
            ...item,
            batch_number: `${generateBatchNumber(newDate, idx + 1)}${suffix}`
          };
        }
        return item;
      }));
    }
  };

  const handleVendorChange = (newVendorId) => {
    setSelectedVendorId(newVendorId);
    const vendorProds = products.filter(p => String(p.vendor_id) === String(newVendorId));
    const defaultProd = vendorProds[0];

    setItems(prev => prev.map((it, idx) => {
      const belongs = vendorProds.some(p => String(p.id) === String(it.vendor_product_id));
      if (belongs) {
        return {
          ...it,
          batch_number: it.batch_number || generateBatchNumber(receiptDate, idx + 1)
        };
      }
      return {
        ...it,
        vendor_product_id: defaultProd ? defaultProd.id : '',
        cost_price: defaultProd ? Number(defaultProd.cost_price) || 0 : 0,
        sale_price: defaultProd ? Number(defaultProd.sale_price) || 0 : 0,
        batch_number: it.batch_number || generateBatchNumber(receiptDate, idx + 1)
      };
    }));
  };

  const handleAddItemRow = () => {
    const vendorProds = selectedVendorId
      ? products.filter(p => String(p.vendor_id) === String(selectedVendorId))
      : products;
    const defaultProd = vendorProds[0];
    const nextSeq = items.length + 1;
    setItems(prev => [
      ...prev,
      {
        vendor_product_id: defaultProd ? defaultProd.id : '',
        qty: 10,
        cost_price: defaultProd ? Number(defaultProd.cost_price) || 0 : 0,
        sale_price: defaultProd ? Number(defaultProd.sale_price) || 0 : 0,
        batch_number: generateBatchNumber(receiptDate, nextSeq),
        expired_at: ''
      }
    ]);
  };

  const handleDuplicateBatchRow = (idx) => {
    const source = items[idx];
    const nextSeq = items.length + 1;
    const duplicateBatch = source.batch_number
      ? (source.batch_number.includes('-B') 
          ? source.batch_number.replace(/-B(\d+)$/, (_, n) => `-B${Number(n) + 1}`) 
          : `${source.batch_number}-B2`)
      : generateBatchNumber(receiptDate, nextSeq);

    setItems(prev => [
      ...prev.slice(0, idx + 1),
      {
        vendor_product_id: source.vendor_product_id,
        qty: source.qty || 10,
        cost_price: source.cost_price || 0,
        sale_price: source.sale_price || 0,
        batch_number: duplicateBatch,
        expired_at: ''
      },
      ...prev.slice(idx + 1)
    ]);
  };

  const handleRemoveItemRow = (idx) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'vendor_product_id') {
        const prod = products.find(p => String(p.id) === String(value));
        if (prod) {
          if (prod.cost_price !== undefined) updated.cost_price = Number(prod.cost_price) || 0;
          if (prod.sale_price !== undefined) updated.sale_price = Number(prod.sale_price) || 0;
        }
      }
      return updated;
    }));
  };

  // Ringkasan kalkulasi modal
  const summary = useMemo(() => {
    let totalQty = 0;
    let totalCost = 0;
    let totalSale = 0;

    items.forEach(it => {
      const q = Number(it.qty) || 0;
      const c = Number(it.cost_price) || 0;
      const s = Number(it.sale_price) || 0;
      totalQty += q;
      totalCost += q * c;
      totalSale += q * s;
    });

    return {
      itemCount: items.length,
      totalQty,
      totalCost,
      totalSale,
      potentialProfit: totalSale - totalCost
    };
  }, [items]);

  // Resolved Live Dynamic Debit & Credit COAs
  const selectedCashAccount = cashAccounts.find(c => String(c.id) === String(selectedCashAccountId));

  const activeDebitCoa = useMemo(() => {
    if (receiptType === 'titipan') {
      return {
        code: accountingConfig?.settings?.consignment_inventory_coa_code || '10302',
        name: accountingConfig?.settings?.consignment_inventory_coa_name || 'Persediaan Konsinyasi Titipan'
      };
    }
    return {
      code: accountingConfig?.settings?.inventory_coa_code || '10301',
      name: accountingConfig?.settings?.inventory_coa_name || 'Persediaan Barang Dagangan Kantin'
    };
  }, [receiptType, accountingConfig]);

  const activeCreditCoa = useMemo(() => {
    if (receiptType === 'titipan') {
      return {
        code: accountingConfig?.settings?.consignment_payable_coa_code || '20102',
        name: accountingConfig?.settings?.consignment_payable_coa_name || 'Hutang Konsinyasi Titipan Vendor'
      };
    }
    if (paymentMethod === 'credit') {
      return {
        code: accountingConfig?.settings?.trade_payable_coa_code || '20100',
        name: accountingConfig?.settings?.trade_payable_coa_name || 'Hutang Usaha Dagang Kantin'
      };
    }
    if (paymentMethod === 'transfer' || selectedCashAccount?.account_kind === 'bank') {
      return {
        code: accountingConfig?.settings?.bank_coa_code || '10102',
        name: accountingConfig?.settings?.bank_coa_name || 'Kas Bank BNI Kantin'
      };
    }
    return {
      code: accountingConfig?.settings?.cash_coa_code || '10101',
      name: accountingConfig?.settings?.cash_coa_name || 'Kas Tunai Kasir'
    };
  }, [receiptType, paymentMethod, selectedCashAccount, accountingConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const validItems = items.filter(it => it.vendor_product_id && Number(it.qty) > 0);
      if (validItems.length === 0) {
        throw new Error('Pilih minimal 1 produk dengan jumlah lebih dari 0.');
      }

      const payload = {
        receipt_type: receiptType,
        vendor_id: selectedVendorId ? Number(selectedVendorId) : null,
        invoice_number: invoiceNumber || undefined,
        receipt_date: receiptDate,
        payment_method: receiptType === 'titipan' ? 'consignment' : paymentMethod,
        cash_account_id: (receiptType === 'belanja_sendiri' && paymentMethod !== 'credit' && selectedCashAccountId) ? Number(selectedCashAccountId) : null,
        bank_statement_id: (receiptType === 'belanja_sendiri' && paymentMethod === 'transfer' && selectedBankStatementId) ? Number(selectedBankStatementId) : null,
        notes: note.trim() || null,
        items: validItems.map(item => ({
          vendor_product_id: Number(item.vendor_product_id),
          qty: Number(item.qty),
          cost_price: parseFloat(item.cost_price) || 0,
          sale_price: parseFloat(item.sale_price) || 0,
          batch_number: item.batch_number ? String(item.batch_number).trim() : null,
          expired_at: item.expired_at || null
        }))
      };

      const res = await api.post('/kantin/goods-receipts', payload);
      const resData = res.data?.data;
      const jrnInfo = resData?.journal_number ? ` [Jurnal: ${resData.journal_number}]` : '';

      setSuccessMessage(`Penerimaan barang berhasil dicatat (${validItems.length} baris produk & batch masuk)${jrnInfo}.`);
      setShowModal(false);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan penerimaan barang');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = receipts.filter(r => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      r.vendor?.toLowerCase().includes(q) ||
      r.invoice_number?.toLowerCase().includes(q) ||
      r.receipt_number?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q) ||
      r.journal_number?.toLowerCase().includes(q) ||
      r.cash_account_name?.toLowerCase().includes(q) ||
      r.items?.some(it => 
        it.product_name?.toLowerCase().includes(q) ||
        it.batch_number?.toLowerCase().includes(q)
      );

    const matchType = filterType === 'all' || r.receipt_type === filterType;

    let matchExpiry = true;
    if (expiryFilter === 'warning') {
      matchExpiry = r.items?.some(it => {
        const exp = getExpiryInfo(it.expired_at);
        return exp && exp.isWarning;
      });
    } else if (expiryFilter === 'good') {
      matchExpiry = r.items?.every(it => {
        const exp = getExpiryInfo(it.expired_at);
        return !exp || exp.status === 'good';
      });
    }

    return matchSearch && matchType && matchExpiry;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-600" />
            <span>Penerimaan Barang Masuk &amp; Kontrol Akuntansi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan pasokan barang konsinyasi &amp; belanja mandiri lengkap dengan pencatatan akuntansi otomatis (double-entry) dan pelacakan batch expired (FEFO).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Tombol Setelan Akuntansi Penerimaan */}
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-emerald-600" />
            <span>Setelan Akuntansi Penerimaan</span>
            {accountingConfig?.settings?.auto_journal && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" title="Auto-Journal Aktif" />
            )}
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Penerimaan Barang</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <FlatAlertBanner
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari faktur, jurnal, produk, vendor, batch..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">Semua Jenis Pasokan</option>
            <option value="titipan">Titipan Konsinyasi</option>
            <option value="belanja_sendiri">Belanja Mandiri</option>
          </select>

          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">Semua Status Kadaluarsa</option>
            <option value="warning">⚠️ Ada Item Kritis / Kadaluarsa</option>
            <option value="good">✓ Semua Item Aman / Layak</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium shrink-0">
          Total: <span className="font-bold text-slate-700">{filtered.length}</span> Dokumen Penerimaan
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data penerimaan barang...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">No. Dokumen &amp; Jurnal</th>
                  <th className="px-4 py-3">Jenis Pasokan</th>
                  <th className="px-4 py-3">Vendor / Suplier</th>
                  <th className="px-4 py-3">Akuntansi &amp; Kas</th>
                  <th className="px-4 py-3 min-w-[280px]">Rincian Item &amp; Batch</th>
                  <th className="px-4 py-3 text-right">Total Nilai HPP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const isInitialStock = r.invoice_number?.startsWith('RCV-AWAL');
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[12px]">{r.invoice_number || r.receipt_number || `#RCV-${r.id}`}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {r.receipt_date ? String(r.receipt_date).slice(0, 10) : '-'}
                          </span>
                          {r.journal_number ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {r.journal_number}
                            </span>
                          ) : isInitialStock ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Stok Awal
                            </span>
                          ) : null}
                          {r.bank_statement_id && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              RK #{r.bank_statement_id}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            r.receipt_type === 'titipan'
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-blue-50 text-blue-900 border border-blue-200'
                          }`}
                        >
                          {r.receipt_type === 'titipan' ? (
                            <>
                              <Store className="w-3 h-3 text-amber-600" />
                              <span>Titipan Konsinyasi</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3 h-3 text-blue-600" />
                              <span>Belanja Mandiri</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800 align-top">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold">{r.vendor || 'Pengadaan Mandiri'}</span>
                        </div>
                      </td>

                      {/* Kolom Akuntansi & Kas */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          {(r.debit_coa_code || r.credit_coa_code) ? (
                            <div className="flex items-center gap-1 text-[9px] font-mono">
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 py-0.2 rounded font-bold">
                                Dr: {r.debit_coa_code || '10301'}
                              </span>
                              <span>→</span>
                              <span className="bg-rose-50 text-rose-800 border border-rose-200 px-1 py-0.2 rounded font-bold">
                                Cr: {r.credit_coa_code || (r.receipt_type === 'titipan' ? '20102' : '10101')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">COA Terstandar</span>
                          )}
                          {r.cash_account_name && (
                            <span className="text-[10px] text-slate-600 font-medium truncate max-w-[140px]">
                              {r.cash_account_name}
                            </span>
                          )}
                          {r.fund_source_name && (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded w-fit truncate max-w-[140px]">
                              {r.fund_source_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rincian Produk & Batch Expiry */}
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1.5">
                          {r.items?.map((it, idx) => {
                            const expInfo = getExpiryInfo(it.expired_at);
                            return (
                              <div
                                key={idx}
                                className="text-[11px] text-slate-700 bg-slate-50/90 p-2 rounded-xl border border-slate-200/80 flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <strong className="text-slate-900 font-bold">{it.product_name}</strong>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-mono text-[10px] font-bold">
                                      {it.qty} {it.unit || 'pcs'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                                    <span>HPP: Rp {formatNumber(it.cost_price)}</span>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-bold">Jual: Rp {formatNumber(it.sale_price)}</span>
                                  </div>
                                </div>

                                <div className="flex items-center flex-wrap gap-2 pt-0.5 border-t border-slate-200/40 text-[10px]">
                                  {it.batch_number && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono border border-slate-200">
                                      Batch: <strong>{it.batch_number}</strong>
                                    </span>
                                  )}

                                  {expInfo ? (
                                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${expInfo.badgeClass}`}>
                                      <CalendarDays className="w-3 h-3" />
                                      <span>{expInfo.label}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Tanpa Tanggal Expired</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Total Nilai HPP */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 align-top text-[12px]">
                        Rp {formatNumber(r.total_cost_amount || (r.items?.reduce((acc, it) => acc + (Number(it.qty || 0) * Number(it.cost_price || 0)), 0)) || 0)}
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400 italic">
                      {receipts.length === 0 ? 'Belum ada catatan penerimaan barang' : 'Tidak ada dokumen yang cocok dengan filter'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL SETELAN AKUNTANSI PENERIMAAN BARANG */}
      {/* ========================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Setelan Akuntansi Penerimaan Barang</h3>
                  <p className="text-[11px] text-slate-500">
                    Konfigurasi akun persediaan, hutang konsinyasi/dagang, kas/bank default, dan pos dana
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {configErrorMsg && <FlatAlertBanner type="danger" message={configErrorMsg} />}
            {configSuccessMsg && <FlatAlertBanner type="success" message={configSuccessMsg} />}

            <form onSubmit={handleSaveAccountingConfig} className="space-y-4 text-xs">
              {/* Seksi 1: Kas & Bank Default */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Rekening Kas &amp; Bank Pembayaran Default</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kas Tunai Default</label>
                    <SearchableSelect
                      options={accountingConfig?.cash_accounts?.map(c => ({
                        value: String(c.id),
                        label: c.display_label || c.name,
                        sublabel: c.account_kind === 'bank' ? 'Rekening Bank' : 'Kas Tunai'
                      })) || []}
                      value={String(configForm.cash_account_id_tunai)}
                      onChange={(val) => {
                        const acc = accountingConfig?.cash_accounts?.find(c => String(c.id) === String(val));
                        setConfigForm(prev => ({
                          ...prev,
                          cash_account_id_tunai: val,
                          cash_account_name_tunai: acc?.display_label || acc?.name || ''
                        }));
                      }}
                      placeholder="-- Pilih Kas Tunai --"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rekening Bank Default</label>
                    <SearchableSelect
                      options={accountingConfig?.cash_accounts?.map(c => ({
                        value: String(c.id),
                        label: c.display_label || c.name,
                        sublabel: c.bank_account_number ? `No: ${c.bank_account_number}` : 'Kas'
                      })) || []}
                      value={String(configForm.cash_account_id_bank)}
                      onChange={(val) => {
                        const acc = accountingConfig?.cash_accounts?.find(c => String(c.id) === String(val));
                        setConfigForm(prev => ({
                          ...prev,
                          cash_account_id_bank: val,
                          cash_account_name_bank: acc?.display_label || acc?.name || ''
                        }));
                      }}
                      placeholder="-- Pilih Rekening Bank --"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 2: Bagan Akun (COA) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Akun Akuntansi Terkait (Persediaan &amp; Hutang)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Akun Persediaan Beli Putus (10301)
                    </label>
                    <SearchableSelect
                      options={accountingConfig?.coas?.inventory?.map(c => ({
                        value: String(c.id),
                        label: `[${c.account_code}] ${c.account_name}`,
                        sublabel: `Grup: ${c.account_group || 'Aset'}`
                      })) || []}
                      value={String(configForm.inventory_coa_id)}
                      onChange={(val) => {
                        const coa = accountingConfig?.coas?.all?.find(c => String(c.id) === String(val));
                        setConfigForm(prev => ({
                          ...prev,
                          inventory_coa_id: val,
                          inventory_coa_code: coa?.account_code || '',
                          inventory_coa_name: coa?.account_name || ''
                        }));
                      }}
                      placeholder="-- Pilih COA Persediaan Beli Putus --"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Akun Persediaan Konsinyasi Titipan (10302)
                    </label>
                    <SearchableSelect
                      options={accountingConfig?.coas?.consignment_inventory?.map(c => ({
                        value: String(c.id),
                        label: `[${c.account_code}] ${c.account_name}`,
                        sublabel: `Grup: ${c.account_group || 'Aset'}`
                      })) || []}
                      value={String(configForm.consignment_inventory_coa_id)}
                      onChange={(val) => {
                        const coa = accountingConfig?.coas?.all?.find(c => String(c.id) === String(val));
                        setConfigForm(prev => ({
                          ...prev,
                          consignment_inventory_coa_id: val,
                          consignment_inventory_coa_code: coa?.account_code || '',
                          consignment_inventory_coa_name: coa?.account_name || ''
                        }));
                      }}
                      placeholder="-- Pilih COA Persediaan Titipan --"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Akun Hutang Konsinyasi Vendor (20102 / 40501)
                    </label>
                    <SearchableSelect
                      options={accountingConfig?.coas?.consignment_payable?.map(c => ({
                        value: String(c.id),
                        label: `[${c.account_code}] ${c.account_name}`,
                        sublabel: `Grup: ${c.account_group || 'Liabilitas'}`
                      })) || []}
                      value={String(configForm.consignment_payable_coa_id)}
                      onChange={(val) => {
                        const coa = accountingConfig?.coas?.all?.find(c => String(c.id) === String(val));
                        setConfigForm(prev => ({
                          ...prev,
                          consignment_payable_coa_id: val,
                          consignment_payable_coa_code: coa?.account_code || '',
                          consignment_payable_coa_name: coa?.account_name || ''
                        }));
                      }}
                      placeholder="-- Pilih COA Hutang Konsinyasi --"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Akun Hutang Dagang Tempo (20100)
                    </label>
                    <SearchableSelect
                      options={accountingConfig?.coas?.trade_payable?.map(c => ({
                        value: String(c.id),
                        label: `[${c.account_code}] ${c.account_name}`,
                        sublabel: `Grup: ${c.account_group || 'Liabilitas'}`
                      })) || []}
                      value={String(configForm.trade_payable_coa_id)}
                      onChange={(val) => {
                        const coa = accountingConfig?.coas?.all?.find(c => String(c.id) === String(val));
                        setConfigForm(prev => ({
                          ...prev,
                          trade_payable_coa_id: val,
                          trade_payable_coa_code: coa?.account_code || '',
                          trade_payable_coa_name: coa?.account_name || ''
                        }));
                      }}
                      placeholder="-- Pilih COA Hutang Usaha --"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 3: Pos Dana & Auto-Journal */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pos Dana &amp; Otomatisasi Jurnal</span>
                </h4>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Pos Dana Terkait</label>
                  <input
                    type="text"
                    required
                    value={configForm.fund_source_name}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, fund_source_name: e.target.value }))}
                    placeholder="Contoh: Pos Pengadaan Stok & Pembelian SBU Kantin"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-emerald-500 transition"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">Posting Otomatis Jurnal (Auto-Journal)</span>
                    <span className="text-[11px] text-slate-500">
                      Otomatis catat jurnal umum ganda ke pembukuan SBU Kantin saat penerimaan barang dicatat
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={configForm.auto_journal}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, auto_journal: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  disabled={savingConfig}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Simpan Konfigurasi Akuntansi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL INPUT PENERIMAAN BARANG */}
      {/* ========================================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[94vh] shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden my-auto transition-all">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
                  <PackagePlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Catat Penerimaan Barang &amp; Kontrol Akuntansi</h3>
                  <p className="text-[11px] text-emerald-100/90 font-normal">
                    Penerimaan pasokan barang titipan &amp; beli putus dengan pencatatan akuntansi ganda otomatis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Seksi 1: Metadata Dokumen Pasokan */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Informasi Dokumen &amp; Jenis Pasokan</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Tentukan jenis dan metode pembayaran pasokan</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Segmented Radio: Jenis Pasokan */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Jenis Pasokan Barang <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setReceiptType('titipan')}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition cursor-pointer ${
                            receiptType === 'titipan'
                              ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Store className={`w-4 h-4 ${receiptType === 'titipan' ? 'text-amber-600' : 'text-slate-400'}`} />
                          <div className="text-left">
                            <p className="leading-tight">Titipan Konsinyasi</p>
                            <span className="text-[10px] font-normal text-slate-500">Mitra titip jual bagi hasil</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setReceiptType('belanja_sendiri')}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition cursor-pointer ${
                            receiptType === 'belanja_sendiri'
                              ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <ShoppingBag className={`w-4 h-4 ${receiptType === 'belanja_sendiri' ? 'text-blue-600' : 'text-slate-400'}`} />
                          <div className="text-left">
                            <p className="leading-tight">Belanja Mandiri / Beli Putus</p>
                            <span className="text-[10px] font-normal text-slate-500">Kantin belanja kulakan stok</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Metode Pembayaran (khusus Beli Putus) */}
                    {receiptType === 'belanja_sendiri' && (
                      <div className="sm:col-span-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
                        <label className="block text-xs font-bold text-blue-900">
                          Metode Pembayaran Pembelian Stok
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethod('cash');
                              setSelectedCashAccountId(accountingConfig?.settings?.cash_account_id_tunai ? String(accountingConfig.settings.cash_account_id_tunai) : '');
                            }}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              paymentMethod === 'cash'
                                ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs'
                                : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                            }`}
                          >
                            <Coins className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Kas Tunai</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethod('transfer');
                              const bankAccId = accountingConfig?.settings?.cash_account_id_bank ? String(accountingConfig.settings.cash_account_id_bank) : '';
                              setSelectedCashAccountId(bankAccId);
                              fetchBankStatements(bankAccId);
                            }}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              paymentMethod === 'transfer'
                                ? 'bg-white text-blue-800 border-blue-500 shadow-xs'
                                : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                            <span>Transfer Bank</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethod('credit');
                              setSelectedCashAccountId('');
                              setSelectedBankStatementId('');
                            }}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              paymentMethod === 'credit'
                                ? 'bg-white text-purple-800 border-purple-500 shadow-xs'
                                : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                            <span>Tempo / Hutang</span>
                          </button>
                        </div>

                        {/* Rekening Kas / Bank Pembayar */}
                        {paymentMethod !== 'credit' && (
                          <div className="pt-2">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              {paymentMethod === 'transfer' ? 'Rekening Bank Pembayar' : 'Rekening Kas Tunai Pembayar'}
                            </label>
                            <SearchableSelect
                              options={cashAccounts.map(c => ({
                                value: String(c.id),
                                label: c.display_label || c.name,
                                sublabel: c.account_kind === 'bank' ? 'Rekening Bank' : 'Kas Tunai'
                              }))}
                              value={String(selectedCashAccountId)}
                              onChange={(val) => {
                                setSelectedCashAccountId(val);
                                if (paymentMethod === 'transfer') fetchBankStatements(val);
                              }}
                              placeholder="-- Pilih Rekening Kas / Bank --"
                            />
                          </div>
                        )}

                        {/* Referensi Rekening Koran (Mutasi Debet Pengeluaran) */}
                        {paymentMethod === 'transfer' && (
                          <div className="pt-1 space-y-1.5">
                            <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                <span>Referensi Mutasi Rekening Koran (Pengeluaran Bank)</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
                            </label>

                            <SearchableSelect
                              options={bankStatements.map(b => ({
                                value: String(b.id),
                                label: `${b.bank_name || 'Bank'} • Rp ${formatNumber(b.amount)} (${b.transaction_date ? String(b.transaction_date).slice(0, 10) : '-'})`,
                                sublabel: `${b.reference_number ? `[Ref: ${b.reference_number}] ` : ''}${b.description || 'Mutasi Debet Pengeluaran'}`
                              }))}
                              value={String(selectedBankStatementId)}
                              onChange={(val) => setSelectedBankStatementId(val)}
                              placeholder="-- Cari & Pilih Mutasi Rekening Koran --"
                              allowClear={true}
                              isLoading={loadingBankStatements}
                              emptyText={loadingBankStatements ? 'Memuat mutasi...' : 'Tidak ada mutasi pengeluaran bank yang tersedia'}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Vendor Dropdown */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pilih Mitra Vendor / Suplier Pemasok <span className="text-rose-500">*</span></span>
                      </label>
                      <SearchableSelect
                        options={vendorOptions}
                        value={selectedVendorId}
                        onChange={handleVendorChange}
                        placeholder="-- Pilih Vendor / Suplier --"
                        searchPlaceholder="Cari vendor atau suplier..."
                        accentColor="emerald"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tanggal Penerimaan <span className="text-rose-500">*</span></span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">DD/MM/YYYY</span>
                      </label>
                      <DatePickerField
                        value={receiptDate}
                        onChange={handleReceiptDateChange}
                        placeholder="DD/MM/YYYY"
                        required
                        className="w-full"
                        inputClassName="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>No. Surat Jalan / Faktur (Opsional)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setInvoiceNumber(generateInvoiceNumber(receiptDate, receipts))}
                          className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline cursor-pointer"
                          title="Generate ulang No. Surat Jalan otomatis"
                        >
                          Otomatis
                        </button>
                      </label>
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder={`Contoh: ${generateInvoiceNumber(receiptDate, receipts)}`}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Seksi 2: Daftar Item Produk Masuk & Multi-Batch Expiry */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-emerald-600" />
                        <span>Daftar Produk &amp; Batch Kadaluarsa ({items.length} Baris)</span>
                      </label>
                      <p className="text-[10px] text-slate-500">
                        Hanya menampilkan katalog produk yang terdaftar untuk vendor yang dipilih ({productOptions.length} produk tersedia).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris Produk</span>
                    </button>
                  </div>

                  {selectedVendorId && productOptions.length === 0 && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold">Vendor ini belum memiliki katalog produk terdaftar:</strong>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Silakan daftarkan produk untuk vendor ini terlebih dahulu melalui menu <strong>Katalog Produk</strong> agar bisa dipilih pada penerimaan barang.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    {items.map((row, idx) => {
                      const rowTotalCost = (Number(row.qty) || 0) * (Number(row.cost_price) || 0);
                      const expInfo = getExpiryInfo(row.expired_at);

                      return (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50/90 hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-2xs space-y-3 transition"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-700">Item / Batch #{idx + 1}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono font-bold text-emerald-800">
                                Subtotal HPP: Rp {formatNumber(rowTotalCost)}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleDuplicateBatchRow(idx)}
                                className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                                title="Tambah batch kadaluarsa berbeda untuk produk yang sama"
                              >
                                <Copy className="w-3 h-3 text-blue-600" />
                                <span>+ Batch Baru</span>
                              </button>

                              {items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(idx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Hapus baris ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-12">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                                Pilih Produk <span className="text-rose-500">*</span>
                              </label>
                              <SearchableSelect
                                options={productOptions}
                                value={row.vendor_product_id}
                                onChange={(val) => handleItemChange(idx, 'vendor_product_id', val)}
                                placeholder="-- Cari & Pilih Produk --"
                                searchPlaceholder="Ketik nama produk..."
                                accentColor="emerald"
                                required
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                                Jumlah (Qty) <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="number"
                                min={1}
                                required
                                value={row.qty}
                                onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                                Harga Beli (HPP)
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 font-bold">Rp</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={100}
                                  required
                                  value={row.cost_price}
                                  onChange={(e) => handleItemChange(idx, 'cost_price', e.target.value)}
                                  className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                                Harga Jual Kasir
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[11px] text-emerald-600 font-bold">Rp</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={100}
                                  required
                                  value={row.sale_price}
                                  onChange={(e) => handleItemChange(idx, 'sale_price', e.target.value)}
                                  className="w-full pl-8 pr-2 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-mono font-bold text-emerald-800 focus:outline-hidden focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="sm:col-span-3">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Tag className="w-3 h-3 text-slate-400" />
                                  <span>No. Batch / Lot</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleItemChange(idx, 'batch_number', generateBatchNumber(receiptDate, idx + 1))}
                                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline cursor-pointer"
                                  title="Generate ulang No. Batch otomatis"
                                >
                                  Otomatis
                                </button>
                              </label>
                              <input
                                type="text"
                                value={row.batch_number || ''}
                                onChange={(e) => handleItemChange(idx, 'batch_number', e.target.value)}
                                placeholder={`Contoh: ${generateBatchNumber(receiptDate, idx + 1)}`}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3 text-emerald-600" />
                                  <span>Tgl. Kadaluarsa</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal">DD/MM/YYYY</span>
                              </label>
                              <DatePickerField
                                value={row.expired_at || ''}
                                onChange={(iso) => handleItemChange(idx, 'expired_at', iso)}
                                placeholder="DD/MM/YYYY"
                                className="w-full"
                                inputClassName="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          {expInfo && (
                            <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-medium">Status Kelayakan Produk:</span>
                              <span className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${expInfo.badgeClass}`}>
                                {expInfo.status === 'good' ? (
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                )}
                                <span>{expInfo.label}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Seksi 3: Dynamic Double-Entry Accounting Preview */}
                <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 via-slate-50 to-emerald-50/40 border border-emerald-200/80 rounded-xl space-y-2 text-[11px] shadow-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-900 border-b border-emerald-200/60 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      <span>Catatan Akuntansi Otomatis (Double-Entry Bookkeeping)</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-mono font-bold">
                      {accountingConfig?.settings?.auto_journal ? 'Auto-Journal Aktif' : 'Pencatatan Manual'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-slate-600 text-[10px]">
                    {/* Kolom Debet */}
                    <div className="p-2.5 rounded-lg bg-white/90 border border-emerald-200/70 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-700 font-bold uppercase text-[9px] tracking-wider">
                          [Dr] Akun Debet:
                        </span>
                        <span className="font-mono text-[9px] bg-emerald-100/70 text-emerald-800 px-1 py-0.2 rounded font-bold">
                          COA {activeDebitCoa.code}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 block text-[11px] leading-tight">
                        {activeDebitCoa.name}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800 font-bold block">
                        Rp {formatNumber(summary.totalCost)}
                      </span>
                    </div>

                    {/* Kolom Kredit */}
                    <div className="p-2.5 rounded-lg bg-white/90 border border-rose-200/70 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-rose-700 font-bold uppercase text-[9px] tracking-wider">
                          [Cr] Akun Kredit:
                        </span>
                        <span className="font-mono text-[9px] bg-rose-100/70 text-rose-800 px-1 py-0.2 rounded font-bold">
                          COA {activeCreditCoa.code}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 block text-[11px] leading-tight">
                        {activeCreditCoa.name}
                      </span>
                      <span className="text-[10px] font-mono text-rose-800 font-bold block">
                        Rp {formatNumber(summary.totalCost)}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-emerald-900 font-medium pt-1 flex items-center justify-between border-t border-emerald-200/60">
                    <span>Pos Sumber Dana:</span>
                    <span className="font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded truncate max-w-[240px]">
                      {fundSourceName || 'Pos Pengadaan Stok & Pembelian SBU Kantin'}
                    </span>
                  </div>
                </div>

                {/* Seksi 4: Ringkasan Nilai Penerimaan */}
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Qty Masuk</span>
                      <span className="font-bold text-slate-800 font-mono text-sm">{summary.totalQty} Unit</span>
                    </div>
                    <div className="h-6 w-px bg-emerald-200/60" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Nilai Pembelian (HPP)</span>
                      <span className="font-bold text-emerald-800 font-mono text-sm">
                        Rp {formatNumber(summary.totalCost)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Estimasi Nilai Omzet Jual</span>
                    <span className="font-bold text-slate-700 font-mono">
                      Rp {formatNumber(summary.totalSale)}
                    </span>
                  </div>
                </div>

                {/* Seksi 5: Catatan Dokumen */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Penerimaan / Keterangan Pasokan
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Contoh: Pasokan roti pagi, kondisi kemasan baik..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500 font-medium">
                  {summary.itemCount} Baris Item/Batch • Total <strong className="text-emerald-700 font-mono">Rp {formatNumber(summary.totalCost)}</strong>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Simpan Penerimaan Barang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
