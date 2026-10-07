import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatNumber, formatDate } from '../../../shared/utils/formatters';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import { isCashierOnlyUser } from '../../../shared/utils/authHelper';
import {
  ScanBarcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Wallet,
  Coins,
  QrCode,
  User,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Printer,
  Search,
  Receipt,
  X,
  Calendar,
  Tag,
  ShieldCheck,
  ShieldAlert,
  Boxes,
  Package,
  ImageIcon,
  Delete,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Smartphone,
  History,
  Edit3,
  FileText,
  Clock,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  DollarSign,
  UserCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Maximize2,
  Minimize2,
  Camera,
  ShoppingBag,
  Layers,
  Radio,
  SlidersHorizontal,
  ChevronLeft,
  Store,
  LayoutGrid,
  ScanLine,
  CreditCard,
  LogOut,
  FlipHorizontal,
  Zap,
  ZapOff
} from 'lucide-react';

export default function TransaksiPenjualan() {
  const { user, logout } = useAuth();
  const isCashierOnly = useMemo(() => isCashierOnlyUser(user), [user]);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'history'

  // Full Screen & Focus Mode State
  const [isFullscreenFocus, setIsFullscreenFocus] = useState(false);
  const [mobileCartDrawerOpen, setMobileCartDrawerOpen] = useState(false);
  const [liveClock, setLiveClock] = useState('');

  // Master Data
  const [products, setProducts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // TAB 1: STATE KASIR POS
  // ==========================================
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [cart, setCart] = useState([]);

  // Buyer Info
  const [buyerType, setBuyerType] = useState('student'); // 'student' | 'non_student'
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'cash' | 'qris'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [childPin, setChildPin] = useState('');
  const [showPinMask, setShowPinMask] = useState(true);
  const [buyerName, setBuyerName] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState('');

  // Camera Scanner Modal State (Android, Tablet, Mobile & Desktop)
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [scannerMode, setScannerMode] = useState('auto'); // 'auto' | 'product' | 'student'
  const [continuousScan, setContinuousScan] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scannerManualInput, setScannerManualInput] = useState('');
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Status & Modals POS
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successReceipt, setSuccessReceipt] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalError, setPinModalError] = useState(null);
  const [scanAlert, setScanAlert] = useState(null);

  const barcodeInputRef = useRef(null);

  // ==========================================
  // TAB 2: STATE RIWAYAT & REVISI TRANSAKSI
  // ==========================================
  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [filterCashier, setFilterCashier] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFilterPreset, setDateFilterPreset] = useState('7days'); // '7days' | 'today' | '30days' | 'all' | 'custom'
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });
  const [dateTo, setDateTo] = useState(() => getLocalDateString());

  // Modal Detail / Struk Riwayat
  const [selectedHistoryReceipt, setSelectedHistoryReceipt] = useState(null);

  // Modal Revisi Transaksi
  const [reviseModalOpen, setReviseModalOpen] = useState(false);
  const [revisingTx, setRevisingTx] = useState(null);
  const [reviseItems, setReviseItems] = useState([]);
  const [reviseDiscount, setReviseDiscount] = useState(0);
  const [revisePaymentMethod, setRevisePaymentMethod] = useState('wallet');
  const [reviseBuyerName, setReviseBuyerName] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [reviseSubmitting, setReviseSubmitting] = useState(false);
  const [reviseError, setReviseError] = useState(null);
  const [selectedAddProduct, setSelectedAddProduct] = useState('');

  // Modal Audit Riwayat Revisi
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditTx, setAuditTx] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // ==========================================
  // STATE KONFIGURASI AKUNTANSI POS
  // ==========================================
  const [accountingConfig, setAccountingConfig] = useState(null);
  const [accountingConfigModalOpen, setAccountingConfigModalOpen] = useState(false);
  const [accountingConfigLoading, setAccountingConfigLoading] = useState(false);
  const [accountingConfigSaving, setAccountingConfigSaving] = useState(false);
  const [editConfigForm, setEditConfigForm] = useState({});
  const [posBankStatements, setPosBankStatements] = useState([]);
  const [selectedCashAccountOverride, setSelectedCashAccountOverride] = useState('');
  const [selectedBankStatementId, setSelectedBankStatementId] = useState('');
  const [selectedFundSourceOverride, setSelectedFundSourceOverride] = useState('');
  const [showAccountingAccordion, setShowAccountingAccordion] = useState(false);

  // Live Clock Updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to Fullscreen Change event (e.g. if user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreenFocus(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreenFocus = () => {
    if (!isFullscreenFocus) {
      setIsFullscreenFocus(true);
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullscreenFocus(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // ==========================================
  // FETCH DATA
  // ==========================================
  const fetchAccountingConfig = async () => {
    setAccountingConfigLoading(true);
    try {
      const res = await api.get('/kantin/pos/accounting-config');
      setAccountingConfig(res.data?.data || null);
      if (res.data?.data?.settings) {
        setEditConfigForm(res.data.data.settings);
      }
    } catch (err) {
      console.warn('Gagal memuat konfigurasi akuntansi POS:', err);
    } finally {
      setAccountingConfigLoading(false);
    }
  };

  const saveAccountingConfig = async (e) => {
    if (e) e.preventDefault();
    setAccountingConfigSaving(true);
    try {
      const res = await api.put('/kantin/pos/accounting-config', editConfigForm);
      setAccountingConfig(res.data?.data || null);
      setAccountingConfigModalOpen(false);
      setScanAlert({
        type: 'product',
        message: '✅ Konfigurasi akun akuntansi POS berhasil disimpan!'
      });
      setTimeout(() => setScanAlert(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal menyimpan konfigurasi akuntansi POS');
    } finally {
      setAccountingConfigSaving(false);
    }
  };

  const fetchPosBankStatements = async (cashAccId) => {
    const accId = cashAccId || accountingConfig?.settings?.cash_account_id_bank;
    if (!accId) {
      setPosBankStatements([]);
      return;
    }
    try {
      const res = await api.get(`/kantin/pos/bank-statements?cash_account_id=${accId}`);
      setPosBankStatements(res.data?.data || []);
    } catch (err) {
      console.warn('Gagal mengambil mutasi bank POS:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProd, resStu] = await Promise.all([
        api.get('/kantin/vendor-products?status=active'),
        api.get('/kantin/canteen-students?status=active')
      ]);
      setProducts(resProd.data?.data || []);
      const stuList = resStu.data?.data || [];
      setStudents(stuList);

      // Sinkronkan data selectedStudent jika sedang terpilih agar saldo & kuota ter-update
      setSelectedStudent(prev => {
        if (!prev) return null;
        const updated = stuList.find(s => String(s.student_id || s.id) === String(prev.student_id || prev.id));
        return updated || prev;
      });
    } catch (err) {
      console.error('Error fetching POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = {};
      if (dateFilterPreset === 'today') {
        const today = getLocalDateString();
        params.date_from = today;
        params.date_to = today;
      } else if (dateFilterPreset === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.date_from = getLocalDateString(d);
        params.date_to = getLocalDateString();
      } else if (dateFilterPreset === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.date_from = getLocalDateString(d);
        params.date_to = getLocalDateString();
      } else if (dateFilterPreset === 'custom') {
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
      }

      if (filterPaymentMethod !== 'all') params.payment_method = filterPaymentMethod;
      if (filterStatus !== 'all') params.status = filterStatus;

      const res = await api.get('/kantin/sales-transactions', { params });
      setHistoryList(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchHistory();
    fetchAccountingConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, dateFilterPreset, dateFrom, dateTo, filterPaymentMethod, filterStatus]);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  // Product categories list
  const productCategories = useMemo(() => {
    const cats = new Set();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['all', ...Array.from(cats)];
  }, [products]);

  // Student options for live search
  const studentOptions = useMemo(() => {
    return (students || []).map((s) => {
      const limitStr = s.daily_spending_limit !== null && s.daily_spending_limit !== undefined
        ? ` • Sisa Limit: ${formatRupiah(s.remaining_daily_limit || 0)}/${formatRupiah(s.daily_spending_limit)}`
        : ' • Bebas Limit';
      return {
        value: String(s.student_id || s.id),
        label: s.student_name || s.name || 'Santri',
        sublabel: `${s.nipd ? `NIPD: ${s.nipd} • ` : ''}${s.class_group_name || 'Santri'} • Saldo: ${formatRupiah(s.wallet_balance || 0)}${limitStr}`,
      };
    });
  }, [students]);

  // ==========================================
  // POS OPERATIONAL HANDLERS
  // ==========================================
  const getExpiryBadge = (expiredAt) => {
    if (!expiredAt) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exp = new Date(expiredAt);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Kadaluarsa (${formatDate(expiredAt)})`,
        className: 'bg-rose-100 text-rose-800 border border-rose-200 font-bold'
      };
    }
    if (diffDays <= 7) {
      return {
        label: `Exp ${diffDays} hari (${formatDate(expiredAt)})`,
        className: 'bg-amber-100 text-amber-800 border border-amber-200 font-bold'
      };
    }
    return {
      label: `Exp: ${formatDate(expiredAt)}`,
      className: 'bg-slate-100 text-slate-700'
    };
  };

  // ==========================================
  // AUDIO & SCANNER TANGAN (USB / BLUETOOTH)
  // ==========================================
  const playScanBeep = (type = 'student') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      if (type === 'student') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
      } else if (type === 'product') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
      }
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio playback restrictions ignore
    }
  };

  const processScanCode = (code, explicitMode = null) => {
    if (!code || !code.trim()) return false;
    let trimmed = code.trim();
    const activeMode = explicitMode || scannerMode || 'auto';

    // 0. Parse QR payload if encoded as URL or JSON
    let extractedNipd = null;
    let extractedId = null;
    let extractedBarcode = null;
    let extractedProductId = null;

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        extractedNipd = parsed.nipd || parsed.nis || null;
        extractedId = parsed.student_id || null;
        extractedBarcode = parsed.barcode || null;
        extractedProductId = parsed.product_id || parsed.vendor_product_id || parsed.id || null;
      } catch (e) {}
    } else if (trimmed.includes('http://') || trimmed.includes('https://')) {
      try {
        const url = new URL(trimmed);
        extractedNipd = url.searchParams.get('nipd') || url.searchParams.get('nis') || null;
        extractedId = url.searchParams.get('student_id') || null;
        extractedBarcode = url.searchParams.get('barcode') || null;
        extractedProductId = url.searchParams.get('product_id') || url.searchParams.get('id') || null;
        if (!extractedNipd && !extractedId && !extractedBarcode && !extractedProductId) {
          const parts = url.pathname.split('/').filter(Boolean);
          const lastPart = parts[parts.length - 1];
          if (lastPart) trimmed = decodeURIComponent(lastPart);
        }
      } catch (e) {}
    }

    // Strip common prefixes if any (e.g. BARCODE:, PROD:, STU:)
    let cleanTrimmed = trimmed;
    if (cleanTrimmed.includes(':')) {
      const parts = cleanTrimmed.split(':');
      if (parts[1]) cleanTrimmed = parts[1].trim();
    }
    const cleanLower = cleanTrimmed.toLowerCase();

    // Helper: Cari Barcode / Produk
    const matchProduct = () => {
      return products.find(p => {
        if (extractedBarcode && String(p.barcode || '').trim().toLowerCase() === String(extractedBarcode).trim().toLowerCase()) return true;
        if (extractedProductId && String(p.id) === String(extractedProductId).trim()) return true;

        const pBarcode = String(p.barcode || '').trim().toLowerCase();
        const pId = String(p.id);

        return (
          (pBarcode && pBarcode === cleanLower) ||
          (pBarcode && pBarcode === trimmed.toLowerCase()) ||
          (pBarcode && (cleanLower.endsWith(pBarcode) || cleanLower.startsWith(pBarcode))) ||
          (cleanLower === `prod-${pId}`) ||
          (cleanLower === `prd-${pId}`) ||
          (cleanLower === `item-${pId}`) ||
          (cleanLower === `p-${pId}`) ||
          (pId === cleanTrimmed && (products.length <= 100 || cleanTrimmed.length <= 3))
        );
      });
    };

    // Helper: Cari Kartu Santri / NIPD
    const matchStudent = () => {
      return students.find(s => {
        if (extractedNipd && (String(s.nipd) === String(extractedNipd) || String(s.nis) === String(extractedNipd))) return true;
        if (extractedId && String(s.student_id) === String(extractedId)) return true;

        return (
          (s.qr_code && s.qr_code.toLowerCase() === cleanLower) ||
          (s.nipd && String(s.nipd).toLowerCase() === cleanLower) ||
          (s.nis && String(s.nis).toLowerCase() === cleanLower) ||
          String(s.student_id) === cleanTrimmed ||
          (s.rfid_card_number && s.rfid_card_number.toLowerCase() === cleanLower) ||
          cleanLower.includes(`stu-${s.student_id}`) ||
          cleanLower.includes(`nis-${s.nis}`) ||
          cleanLower.includes(`cantin-${s.nis}`) ||
          cleanLower.includes(`nipd-${s.nipd}`)
        );
      });
    };

    // 1. JIKA MODE KHUSUS: PRODUK
    if (activeMode === 'product') {
      const prod = matchProduct();
      if (prod) {
        if (prod.current_stock <= 0) {
          playScanBeep('error');
          setBarcodeInput('');
          setSearchProduct('');
          setScanAlert({
            type: 'error',
            message: `⚠️ Stok Habis: Produk "${prod.product_name}" saat ini memiliki stok 0.`
          });
          setTimeout(() => setScanAlert(null), 4000);
          return false;
        }
        playScanBeep('product');
        addToCart(prod);
        setBarcodeInput('');
        setSearchProduct('');
        setScanAlert({
          type: 'product',
          message: `🛒 Produk Ditambahkan: ${prod.product_name} (+1)`
        });
        setTimeout(() => setScanAlert(null), 3000);
        return true;
      }
      alert(`Barcode produk "${trimmed}" tidak ditemukan dalam katalog.`);
      setBarcodeInput('');
      return false;
    }

    // 2. JIKA MODE KHUSUS: SANTRI
    if (activeMode === 'student') {
      const stu = matchStudent();
      if (stu) {
        playScanBeep('student');
        setSelectedStudent(stu);
        setBuyerType('student');
        setPaymentMethod('wallet');
        setBarcodeInput('');
        setSearchProduct('');
        setScanAlert({
          type: 'student',
          message: `🎯 Kartu Santri Terdeteksi: ${stu.student_name} (${stu.class_group_name || 'Santri'}) • Saldo: ${formatRupiah(stu.wallet_balance || 0)}`
        });
        setTimeout(() => setScanAlert(null), 6000);
        return true;
      }
      alert(`QR Code santri "${trimmed}" tidak cocok dengan data santri aktif.`);
      setBarcodeInput('');
      return false;
    }

    // 3. JIKA MODE AUTO (DETEKSI PRODUK ATAU SANTRI)
    const matchedProduct = matchProduct();
    if (matchedProduct) {
      if (matchedProduct.current_stock <= 0) {
        playScanBeep('error');
        setBarcodeInput('');
        setSearchProduct('');
        setScanAlert({
          type: 'error',
          message: `⚠️ Stok Habis: Produk "${matchedProduct.product_name}" saat ini memiliki stok 0.`
        });
        setTimeout(() => setScanAlert(null), 4000);
        return false;
      }

      playScanBeep('product');
      addToCart(matchedProduct);
      setBarcodeInput('');
      setSearchProduct('');
      setScanAlert({
        type: 'product',
        message: `🛒 Produk Ditambahkan: ${matchedProduct.product_name} (+1)`
      });
      setTimeout(() => setScanAlert(null), 3000);
      return true;
    }

    const matchedStudent = matchStudent();
    if (matchedStudent) {
      playScanBeep('student');
      setSelectedStudent(matchedStudent);
      setBuyerType('student');
      setPaymentMethod('wallet');
      setBarcodeInput('');
      setSearchProduct('');
      setScanAlert({
        type: 'student',
        message: `🎯 Kartu Santri Terdeteksi: ${matchedStudent.student_name} (${matchedStudent.class_group_name || 'Santri'}) • Saldo: ${formatRupiah(matchedStudent.wallet_balance || 0)}`
      });
      setTimeout(() => setScanAlert(null), 6000);
      return true;
    }

    alert(`Barcode / QR "${trimmed}" tidak cocok dengan produk maupun kartu santri.`);
    setBarcodeInput('');
    return false;
  };

  // Global Keydown Listener untuk Scanner Tangan (Handheld USB / Bluetooth Laser Barcode & QR Reader)
  useEffect(() => {
    let scanBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e) => {
      if (activeTab !== 'pos') return;

      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Scanner sends Enter at the end of barcode scan
      if (e.key === 'Enter') {
        if (scanBuffer.length >= 2) {
          const codeToProcess = scanBuffer.trim();
          scanBuffer = '';
          if (activeEl === barcodeInputRef.current) return;
          e.preventDefault();
          processScanCode(codeToProcess);
        }
        scanBuffer = '';
        return;
      }

      // Ignore single modifier keys (Shift, Ctrl, Alt, Meta, CapsLock, etc.)
      if (e.key.length > 1) return;

      // If typed slowly by human (> 300ms) and not focused on scanner, clear stale buffer
      if (timeDiff > 300) {
        scanBuffer = '';
      }

      scanBuffer += e.key;
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeTab, products, students, cart, scannerMode]);

  const handleBarcodeSubmit = (e) => {
    if (e) e.preventDefault();
    const query = (barcodeInput || searchProduct || '').trim();
    if (!query) return;
    processScanCode(query);
  };

  // Camera QR Scanner Functions & Android WebRTC Lifecycle
  const startCameraScanner = (mode = 'auto') => {
    setScannerMode(mode);
    setScannerManualInput('');
    setCameraError(null);
    setCameraScannerOpen(true);
  };

  const stopCameraScanner = () => {
    setCameraScannerOpen(false);
    setCameraError(null);
  };

  const toggleTorch = async () => {
    if (!cameraStreamRef.current) return;
    const track = cameraStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Gagal mengatur lampu senter/torch:', err);
    }
  };

  const flipCamera = () => {
    setCameraFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Effect Lifecycle Kamera WebRTC + Barcode/QR Detector (Android, iOS, & Desktop)
  useEffect(() => {
    let isCancelled = false;

    const stopStream = () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {}
        });
        cameraStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setTorchOn(false);
      setHasTorch(false);
    };

    if (!cameraScannerOpen) {
      stopStream();
      return;
    }

    const initCamera = async () => {
      setCameraLoading(true);
      setCameraError(null);

      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Browser ini tidak mendukung akses kamera langsung. Silakan gunakan Chrome/Edge Android terbaru atau masukkan NIPD/Barcode manual.');
        setCameraLoading(false);
        return;
      }

      stopStream();

      try {
        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: cameraFacingMode },
              width: { ideal: 1280, min: 480 },
              height: { ideal: 720, min: 480 }
            }
          });
        } catch (firstErr) {
          console.warn('getUserMedia ideal facingMode fallback:', firstErr);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true
          });
        }

        if (isCancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        cameraStreamRef.current = stream;

        // Cek kemampuan senter / flashlight
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
          const capabilities = videoTrack.getCapabilities();
          if (capabilities.torch) {
            setHasTorch(true);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          videoRef.current.setAttribute('muted', 'true');
          videoRef.current.muted = true;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Video play warning:', playErr);
          }
        }

        setCameraLoading(false);

        // Inisialisasi BarcodeDetector jika didukung
        let detector = null;
        if ('BarcodeDetector' in window) {
          try {
            let formats = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'];
            if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
              const supported = await window.BarcodeDetector.getSupportedFormats();
              formats = formats.filter(f => supported.includes(f));
            }
            detector = new window.BarcodeDetector({ formats: formats.length > 0 ? formats : ['qr_code'] });
          } catch (e) {
            try {
              detector = new window.BarcodeDetector();
            } catch (err) {}
          }
        }

        // Loop Scanning dengan Debounce dan Continuous Multi-Scan
        let isDetecting = false;
        let lastScannedValue = '';
        let lastScannedTime = 0;

        scanIntervalRef.current = setInterval(async () => {
          if (isCancelled || isDetecting || !videoRef.current) return;
          if (videoRef.current.readyState < 2) return; // HAVE_CURRENT_DATA

          if (detector) {
            isDetecting = true;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && !isCancelled) {
                const rawValue = barcodes[0].rawValue;
                const now = Date.now();
                if (rawValue && rawValue.trim()) {
                  const val = rawValue.trim();
                  // Cegah scan berulang pada kode yang sama dalam 1.8 detik
                  if (val === lastScannedValue && now - lastScannedTime < 1800) {
                    // Ignore duplicate
                  } else {
                    lastScannedValue = val;
                    lastScannedTime = now;

                    const isStudentMode = scannerMode === 'student';
                    const isContinuous = continuousScan && scannerMode !== 'student';

                    if (!isContinuous || isStudentMode) {
                      stopStream();
                      setCameraScannerOpen(false);
                    }

                    processScanCode(val, scannerMode);
                    return;
                  }
                }
              }
            } catch (detErr) {
              // Ignore single frame detect errors
            } finally {
              isDetecting = false;
            }
          }
        }, 200);

      } catch (err) {
        if (isCancelled) return;
        console.error('Camera access error:', err);
        setCameraLoading(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('Izin akses kamera ditolak. Silakan berikan izin kamera pada setelan peramban / browser Android.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError('Kamera tidak ditemukan pada perangkat ini.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraError('Kamera sedang digunakan oleh aplikasi lain.');
        } else {
          setCameraError(err.message || 'Gagal memulai akses kamera perangkat.');
        }
      }
    };

    initCamera();

    return () => {
      isCancelled = true;
      stopStream();
    };
  }, [cameraScannerOpen, cameraFacingMode, scannerMode, continuousScan]);

  const addToCart = (product, specificBatch = null) => {
    if (product.current_stock <= 0) {
      alert(`Stok untuk produk "${product.product_name}" habis!`);
      return;
    }

    const batch = specificBatch || product.active_batch || product.receipt_batches?.[0] || null;
    const batchItemId = batch?.goods_receipt_item_id || null;

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(item => item.id === product.id && item.goods_receipt_item_id === batchItemId);
      if (existingIdx !== -1) {
        const currentItem = prevCart[existingIdx];
        if (currentItem.qty >= product.current_stock) {
          alert(`Maksimal stok tersedia: ${product.current_stock}`);
          return prevCart;
        }
        return prevCart.map((item, idx) =>
          idx === existingIdx ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        const salePrice = (batch?.sale_price !== undefined && batch?.sale_price !== null)
          ? Number(batch.sale_price)
          : ((product.sale_price !== undefined && product.sale_price !== null) ? Number(product.sale_price) : 0);

        return [
          ...prevCart,
          {
            ...product,
            qty: 1,
            price: salePrice,
            cost_price: batch?.cost_price || product.cost_price || 0,
            goods_receipt_id: batch?.goods_receipt_id || null,
            goods_receipt_item_id: batch?.goods_receipt_item_id || null,
            receipt_date: batch?.receipt_date || product.latest_receipt_date || null,
            invoice_number: batch?.invoice_number || product.latest_invoice_number || null,
            batch_number: batch?.batch_number || product.active_batch_number || null,
            expired_at: batch?.expired_at || product.active_expired_at || null,
            image_url: product.image_url || null,
            receipt_batches: product.receipt_batches || []
          }
        ];
      }
    });
  };

  const reduceFromCart = (productId) => {
    setCart((prevCart) => {
      // Find the last item with this product id (LIFO order for batches)
      let foundIdx = -1;
      for (let i = prevCart.length - 1; i >= 0; i--) {
        if (prevCart[i].id === productId) {
          foundIdx = i;
          break;
        }
      }

      if (foundIdx === -1) return prevCart;

      const currentItem = prevCart[foundIdx];
      if (currentItem.qty > 1) {
        return prevCart.map((item, idx) =>
          idx === foundIdx ? { ...item, qty: item.qty - 1 } : item
        );
      } else {
        return prevCart.filter((_, idx) => idx !== foundIdx);
      }
    });
  };

  const updateCartQty = (cartIndex, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter((_, idx) => idx !== cartIndex));
    } else {
      const targetItem = cart[cartIndex];
      const prod = products.find(p => p.id === targetItem?.id);
      if (prod && newQty > prod.current_stock) {
        alert(`Maksimal stok tersedia: ${prod.current_stock}`);
        return;
      }
      setCart(prev => prev.map((item, idx) => idx === cartIndex ? { ...item, qty: newQty } : item));
    }
  };

  const totalCartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const totalGross = cart.reduce((sum, item) => sum + (item.qty * (Number(item.price) || 0)), 0);
  const finalTotal = Math.max(0, totalGross - (parseFloat(discountAmount) || 0));
  const cashReceivedNum = Number(cashReceived) || 0;
  const cashChange = paymentMethod === 'cash' ? Math.max(0, cashReceivedNum - finalTotal) : 0;

  const handleNumpadPress = (val) => {
    setPinModalError(null);
    if (val === 'clear') {
      setChildPin('');
    } else if (val === 'backspace') {
      setChildPin(prev => prev.slice(0, -1));
    } else if (childPin.length < 6) {
      setChildPin(prev => prev + val);
    }
  };

  const executeCheckout = async (pinToUse = childPin) => {
    setError(null);
    setPinModalError(null);

    if (cart.length === 0) {
      setError('Keranjang belanja masih kosong');
      return;
    }

    if (buyerType === 'student' && !selectedStudent) {
      const msg = 'Silakan pilih atau scan kartu santri terlebih dahulu';
      setError(msg);
      setPinModalError(msg);
      return;
    }

    // Validasi Limit Jajan Harian Santri
    if (buyerType === 'student' && selectedStudent) {
      const remainingLimit = selectedStudent.remaining_daily_limit !== null && selectedStudent.remaining_daily_limit !== undefined
        ? Number(selectedStudent.remaining_daily_limit)
        : null;

      if (remainingLimit !== null && finalTotal > remainingLimit) {
        const limitNominal = selectedStudent.daily_spending_limit || 0;
        const msg = `Transaksi ditolak: Total belanja (${formatRupiah(finalTotal)}) melebihi sisa kuota jajan harian santri (${formatRupiah(remainingLimit)}). Batas kuota jajan harian: ${formatRupiah(limitNominal)}.`;
        setError(msg);
        setPinModalError(msg);
        return;
      }
    }

    if (buyerType === 'student' && paymentMethod === 'wallet') {
      if (!pinToUse || pinToUse.length < 6) {
        setPinModalError('PIN Santri harus 6 digit angka.');
        setShowPinModal(true);
        return;
      }

      if (Number(selectedStudent.wallet_balance || 0) < finalTotal) {
        const msg = `Saldo dompet santri (${formatRupiah(selectedStudent.wallet_balance)}) tidak mencukupi untuk pembayaran ${formatRupiah(finalTotal)}.`;
        setError(msg);
        setPinModalError(msg);
        return;
      }
    }

    if (paymentMethod === 'cash' && cashReceivedNum < finalTotal) {
      setError(`Uang tunai diterima (${formatRupiah(cashReceivedNum)}) kurang dari total bayar (${formatRupiah(finalTotal)})`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        buyer_type: buyerType,
        student_id: buyerType === 'student' ? selectedStudent.student_id : null,
        child_pin: buyerType === 'student' && paymentMethod === 'wallet' ? pinToUse : null,
        buyer_name: buyerType === 'non_student' ? buyerName : null,
        payment_method: paymentMethod,
        discount_amount: parseFloat(discountAmount) || 0,
        cash_account_id: selectedCashAccountOverride || (paymentMethod === 'cash' ? accountingConfig?.settings?.cash_account_id_tunai : accountingConfig?.settings?.cash_account_id_bank) || null,
        bank_statement_id: selectedBankStatementId || null,
        fund_source_name: selectedFundSourceOverride || accountingConfig?.settings?.fund_source_name || null,
        cashier_name: user?.full_name || user?.username || 'Kasir',
        items: cart.map(item => ({
          vendor_product_id: item.id,
          goods_receipt_id: item.goods_receipt_id || null,
          goods_receipt_item_id: item.goods_receipt_item_id || null,
          batch_number: item.batch_number || null,
          expired_at: item.expired_at || null,
          qty: item.qty,
          sale_price: item.price,
          cost_price: item.cost_price || 0
        }))
      };

      const res = await api.post('/kantin/sales-transactions', payload);
      setSuccessReceipt({
        ...res.data.data,
        items: [...cart],
        cashier_name: user?.full_name || user?.username || 'Kasir',
        buyer_name: buyerType === 'student' ? selectedStudent.student_name : (buyerName || 'Umum'),
        cash_received: paymentMethod === 'cash' ? cashReceivedNum : null,
        cash_change: paymentMethod === 'cash' ? cashChange : null,
        transaction_at: new Date().toISOString()
      });

      // Reset Form & Refetch
      setCart([]);
      setSelectedStudent(null); // Reset santri agar transaksi berikutnya dimulai dari kondisi bersih
      setChildPin('');
      setCashReceived('');
      setDiscountAmount(0);
      setShowPinModal(false);
      setMobileCartDrawerOpen(false);
      fetchData();
      fetchHistory();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Transaksi gagal diproses';
      setError(msg);
      setPinModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = (e) => {
    e?.preventDefault();
    if (cart.length === 0) {
      setError('Keranjang belanja masih kosong');
      return;
    }

    if (buyerType === 'student' && !selectedStudent) {
      setError('Silakan pilih atau scan kartu santri terlebih dahulu.');
      return;
    }

    // Validasi Limit Jajan Harian Santri
    if (buyerType === 'student' && selectedStudent) {
      const remainingLimit = selectedStudent.remaining_daily_limit !== null && selectedStudent.remaining_daily_limit !== undefined
        ? Number(selectedStudent.remaining_daily_limit)
        : null;

      if (remainingLimit !== null && finalTotal > remainingLimit) {
        const limitNominal = selectedStudent.daily_spending_limit || 0;
        const msg = `Transaksi ditolak: Total belanja (${formatRupiah(finalTotal)}) melebihi sisa kuota jajan harian santri (${formatRupiah(remainingLimit)}). Batas kuota jajan harian: ${formatRupiah(limitNominal)}.`;
        setError(msg);
        return;
      }
    }

    if (buyerType === 'student' && paymentMethod === 'wallet') {
      setShowPinModal(true);
      setPinModalError(null);
    } else {
      executeCheckout();
    }
  };

  const filteredProducts = products.filter(p => {
    const matchQuery =
      p.product_name?.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.barcode?.includes(searchProduct) ||
      p.category?.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.latest_invoice_number?.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.active_batch_number?.toLowerCase().includes(searchProduct.toLowerCase());

    const matchCat =
      selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;

    return matchQuery && matchCat;
  });

  // ==========================================
  // TAB 2: RIWAYAT & REVISI LOGIC
  // ==========================================
  const cashiersList = useMemo(() => {
    const set = new Set();
    historyList.forEach(t => {
      if (t.cashier_name) set.add(t.cashier_name);
    });
    return Array.from(set);
  }, [historyList]);

  const filteredHistory = useMemo(() => {
    return historyList.filter(t => {
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchId = String(t.id).includes(q);
        const matchBuyer = (t.student_name || t.buyer_name || '').toLowerCase().includes(q);
        const matchNipd = String(t.nipd || t.student_id || '').toLowerCase().includes(q);
        const matchCashier = (t.cashier_name || '').toLowerCase().includes(q);
        if (!matchId && !matchBuyer && !matchNipd && !matchCashier) return false;
      }
      if (filterCashier !== 'all' && t.cashier_name !== filterCashier) {
        return false;
      }
      return true;
    });
  }, [historyList, historySearch, filterCashier]);

  const historyMetrics = useMemo(() => {
    const totalCount = filteredHistory.length;
    const totalOmzet = filteredHistory.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0);
    const totalDiscount = filteredHistory.reduce((sum, t) => sum + (parseFloat(t.discount_amount) || 0), 0);
    const totalRevised = filteredHistory.filter(t => t.is_revised || t.status === 'revised').length;
    return { totalCount, totalOmzet, totalDiscount, totalRevised };
  }, [filteredHistory]);

  const openReviseModal = (tx) => {
    setRevisingTx(tx);
    setReviseDiscount(tx.discount_amount || 0);
    setRevisePaymentMethod(tx.payment_method || 'wallet');
    setReviseBuyerName(tx.buyer_name || '');
    setRevisionReason('');
    setReviseError(null);
    setSelectedAddProduct('');

    const items = (tx.items || []).map(it => ({
      vendor_product_id: it.vendor_product_id,
      product_name: it.product_name,
      qty: it.qty,
      sale_price: parseFloat(it.sale_price) || 0,
      cost_price: parseFloat(it.cost_price) || 0,
      goods_receipt_id: it.goods_receipt_id || null,
      goods_receipt_item_id: it.goods_receipt_item_id || null,
      batch_number: it.batch_number || null,
      expired_at: it.expired_at || null
    }));
    setReviseItems(items);
    setReviseModalOpen(true);
  };

  const handleUpdateReviseItemQty = (idx, newQty) => {
    if (newQty <= 0) {
      setReviseItems(prev => prev.filter((_, i) => i !== idx));
    } else {
      setReviseItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: newQty } : it));
    }
  };

  const handleAddProductToRevise = (prodId) => {
    if (!prodId) return;
    const prod = products.find(p => String(p.id) === String(prodId));
    if (!prod) return;

    const existingIdx = reviseItems.findIndex(it => String(it.vendor_product_id) === String(prod.id));
    if (existingIdx !== -1) {
      setReviseItems(prev => prev.map((it, i) => i === existingIdx ? { ...it, qty: it.qty + 1 } : it));
    } else {
      setReviseItems(prev => [
        ...prev,
        {
          vendor_product_id: prod.id,
          product_name: prod.product_name,
          qty: 1,
          sale_price: parseFloat(prod.sale_price) || 0,
          cost_price: parseFloat(prod.cost_price) || 0,
          goods_receipt_id: prod.latest_goods_receipt_id || null,
          goods_receipt_item_id: prod.active_batch?.goods_receipt_item_id || null,
          batch_number: prod.active_batch_number || null,
          expired_at: prod.active_expired_at || null
        }
      ]);
    }
    setSelectedAddProduct('');
  };

  const reviseTotalGross = reviseItems.reduce((sum, it) => sum + (it.qty * (parseFloat(it.sale_price) || 0)), 0);
  const reviseFinalTotal = Math.max(0, reviseTotalGross - (parseFloat(reviseDiscount) || 0));
  const oldTotal = revisingTx ? parseFloat(revisingTx.total_amount) || 0 : 0;
  const reviseDiff = reviseFinalTotal - oldTotal;

  const handleExecuteRevision = async (e) => {
    e.preventDefault();
    setReviseError(null);

    if (!revisionReason.trim()) {
      setReviseError('Catatan alasan revisi transaksi wajib diisi secara jelas');
      return;
    }

    if (reviseItems.length === 0) {
      setReviseError('Item belanja tidak boleh kosong');
      return;
    }

    setReviseSubmitting(true);
    try {
      const payload = {
        revision_reason: revisionReason.trim(),
        payment_method: revisePaymentMethod,
        buyer_name: reviseBuyerName,
        discount_amount: parseFloat(reviseDiscount) || 0,
        items: reviseItems.map(it => ({
          vendor_product_id: it.vendor_product_id,
          qty: it.qty,
          sale_price: it.sale_price,
          cost_price: it.cost_price,
          goods_receipt_id: it.goods_receipt_id,
          goods_receipt_item_id: it.goods_receipt_item_id,
          batch_number: it.batch_number,
          expired_at: it.expired_at
        }))
      };

      await api.put(`/kantin/sales-transactions/${revisingTx.id}/revise`, payload);
      setReviseModalOpen(false);
      setRevisingTx(null);
      fetchHistory();
      fetchData();
    } catch (err) {
      setReviseError(err.response?.data?.message || err.message || 'Gagal menyimpan revisi transaksi');
    } finally {
      setReviseSubmitting(false);
    }
  };

  const openAuditModal = async (tx) => {
    setAuditTx(tx);
    setAuditModalOpen(true);
    setAuditLoading(true);
    try {
      const res = await api.get(`/kantin/sales-transactions/${tx.id}/revisions`);
      setAuditLogs(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className={`space-y-3 sm:space-y-4 font-sans bg-[#f1f5f9] min-h-screen p-3 sm:p-5 flex flex-col justify-start ${
      !isCashierOnly && !isFullscreenFocus ? '-m-3 sm:-m-4' : ''
    } ${
      isFullscreenFocus
        ? 'fixed inset-0 z-50 bg-[#f1f5f9] overflow-y-auto p-3 sm:p-5 m-0'
        : 'relative'
    }`}>
      {/* ======================================================== */}
      {/* TOP HEADER: POS PENJUALAN (ROYAL BLUE ENTERPRISE THEME)  */}
      {/* ======================================================== */}
      <div className="bg-[#0a4d9c] text-white rounded-2xl shadow-md p-3 sm:p-3.5 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand Store Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center backdrop-blur-xs shadow-inner">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-none">
              POS Penjualan
            </h1>
            <p className="text-[11px] text-blue-100 font-medium mt-0.5 flex items-center gap-1.5">
              <span>{user?.school_unit_name || 'Kantin Utama'}</span>
              <span>•</span>
              <span className="font-mono font-bold text-blue-200">{liveClock}</span>
            </p>
          </div>

          {/* Mobile Tab Switcher (<lg) */}
          <div className="flex lg:hidden items-center bg-white/15 p-1 rounded-xl ml-1">
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'pos' ? 'bg-white text-[#0a4d9c] shadow-xs' : 'text-white/80 hover:text-white'
              }`}
            >
              Penjualan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'history' ? 'bg-white text-[#0a4d9c] shadow-xs' : 'text-white/80 hover:text-white'
              }`}
            >
              Riwayat
            </button>
          </div>
        </div>

        {/* Center: Universal Search Bar (Pill style like reference image) */}
        <form onSubmit={handleBarcodeSubmit} className="flex-1 max-w-xl mx-auto relative hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-2.5" />
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput || searchProduct}
            onChange={(e) => {
              setBarcodeInput(e.target.value);
              setSearchProduct(e.target.value);
            }}
            placeholder="Cari produk, barcode, atau nama item..."
            className="w-full pl-10 pr-10 py-2 bg-white text-slate-800 placeholder-slate-400 rounded-full text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-300 shadow-sm"
          />
          {(barcodeInput || searchProduct) && (
            <button
              type="button"
              onClick={() => {
                setBarcodeInput('');
                setSearchProduct('');
              }}
              className="absolute right-3.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </form>

        {/* Right: Barcode Camera Button, Cashier Profile Pill, Fullscreen */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Scanner Camera Button with Dropdown/Options */}
          <div className="flex items-center bg-white/10 rounded-xl border border-white/15 p-0.5">
            <button
              type="button"
              onClick={() => startCameraScanner('auto')}
              className="px-2.5 py-1.5 hover:bg-white/20 text-white rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Scan Barcode Produk / QR Siswa dengan Kamera HP"
            >
              <Camera className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Scan Kamera</span>
            </button>
            <button
              type="button"
              onClick={() => startCameraScanner('product')}
              className="px-2 py-1.5 hover:bg-white/20 text-white/90 rounded-lg transition cursor-pointer text-[10px] font-bold hidden md:inline border-l border-white/10"
              title="Scan Khusus Produk"
            >
              📦 Produk
            </button>
            <button
              type="button"
              onClick={() => startCameraScanner('student')}
              className="px-2 py-1.5 hover:bg-white/20 text-white/90 rounded-lg transition cursor-pointer text-[10px] font-bold hidden md:inline border-l border-white/10"
              title="Scan Khusus Kartu Santri"
            >
              👤 Siswa
            </button>
          </div>

          {/* Cashier Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold">
            <div className="w-5 h-5 rounded-full bg-white text-[#0a4d9c] flex items-center justify-center font-bold text-[10px]">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold truncate max-w-[100px] sm:max-w-[130px]">{user?.full_name || user?.username || 'Kasir 01'}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </div>

          {/* POS Accounting Configuration Button (Pengelola / Admin Kantin Saja) */}
          {!isCashierOnly && (
            <button
              type="button"
              onClick={() => {
                setEditConfigForm(accountingConfig?.settings || {});
                setAccountingConfigModalOpen(true);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/15 flex items-center gap-1.5"
              title="Konfigurasi Akun Akuntansi POS, Rekening Kas & Pos Dana"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-300" />
              <span className="hidden lg:inline text-xs font-bold">Akuntansi POS</span>
            </button>
          )}

          {/* Reload / Sync Products & Stock Button */}
          <button
            type="button"
            onClick={async () => {
              await fetchData();
              setScanAlert({
                type: 'product',
                message: '⚡ Data produk & stok berhasil disinkronkan!'
              });
              setTimeout(() => setScanAlert(null), 3000);
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/15 flex items-center gap-1.5 disabled:opacity-50"
            title="Sinkronkan & Muat Ulang Data Produk & Stok"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-300' : ''}`} />
            <span className="hidden xl:inline text-xs font-bold">Sinkron Data</span>
          </button>

          {/* Fullscreen Focus Toggle */}
          <button
            type="button"
            onClick={toggleFullscreenFocus}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/15"
            title="Layar Penuh POS"
          >
            {isFullscreenFocus ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Apakah Anda yakin ingin logout dari akun kasir?')) {
                logout();
              }
            }}
            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-100 hover:text-white transition cursor-pointer border border-rose-300/30 flex items-center gap-1.5"
            title="Logout Kasir"
          >
            <LogOut className="w-4 h-4 text-rose-200" />
            <span className="hidden sm:inline text-xs font-bold">Keluar</span>
          </button>
        </div>
      </div>

      {/* Floating Scan Alert Banner */}
      {scanAlert && (
        <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between shadow-xs animate-in slide-in-from-top duration-200 ${
          scanAlert.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : scanAlert.type === 'student'
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center gap-2">
            {scanAlert.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : scanAlert.type === 'student' ? (
              <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <Package className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-bold">{scanAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanAlert(null)}
            className="text-slate-400 hover:text-slate-600 font-bold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN CONTAINER: LEFT SLIM SIDEBAR + ACTIVE TAB CONTENT   */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row items-start gap-3 sm:gap-4 w-full">
        {/* Left Vertical Slim Sidebar (Penjualan & Riwayat saja + Logout) */}
        <div className="hidden lg:flex flex-col gap-2 w-24 shrink-0 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs sticky top-3">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span>Penjualan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Riwayat</span>
          </button>

          {/* Logout from Sidebar */}
          <div className="pt-2 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Apakah Anda yakin ingin logout dari akun kasir?')) {
                  logout();
                }
              }}
              className="w-full p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
              title="Logout Kasir"
            >
              <LogOut className="w-5 h-5 text-rose-500" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Right Content Area (Active Tab Content) */}
        <div className="flex-1 min-w-0 w-full">
          {/* ======================================================== */}
          {/* TAB 1: KASIR POS (TRANSAKSI BARU)                        */}
          {/* ======================================================== */}
          {activeTab === 'pos' && (
            <div className="flex flex-col md:flex-row items-start gap-3 sm:gap-4 w-full">
              {/* Mobile Search input (<640px) */}
          <div className="block sm:hidden w-full">
            <form onSubmit={handleBarcodeSubmit} className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={barcodeInput || searchProduct}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  setSearchProduct(e.target.value);
                }}
                placeholder="Cari produk / barcode..."
                className="w-full pl-9 pr-3 py-2 bg-white text-slate-800 placeholder-slate-400 rounded-xl text-xs font-semibold border border-slate-200 focus:outline-hidden focus:border-blue-500 shadow-2xs"
              />
            </form>
          </div>

          {/* Center Product Catalog Area */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Category Filter Pills & Scan Product Button */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <div className="flex items-center gap-2">
                {productCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      selectedCategoryFilter === cat
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    {cat === 'all' ? 'Semua' : cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Reload / Refresh Stock Button in Catalog */}
                <button
                  type="button"
                  onClick={async () => {
                    await fetchData();
                    setScanAlert({
                      type: 'product',
                      message: '⚡ Data produk & stok berhasil disinkronkan!'
                    });
                    setTimeout(() => setScanAlert(null), 3000);
                  }}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Muat Ulang Stok Produk Terkini"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh Stok</span>
                </button>

                {/* Quick Scan Barcode Button */}
                <button
                  type="button"
                  onClick={() => startCameraScanner('product')}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Buka Kamera untuk Scan Barcode Produk"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Scan Barcode</span>
                </button>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                <p className="text-xs text-slate-400">Memuat katalog produk...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[720px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredProducts.map((p) => {
                  const expBadge = getExpiryBadge(p.active_expired_at);
                  const isOutOfStock = p.current_stock <= 0;
                  const cartItem = cart.find(c => c.id === p.id);

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      className={`bg-white rounded-2xl border transition-all p-3 flex flex-col justify-between relative group select-none touch-manipulation active:scale-98 shadow-xs ${
                        isOutOfStock
                          ? 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50'
                          : cartItem
                          ? 'border-blue-500 ring-2 ring-blue-400/20 shadow-sm cursor-pointer'
                          : 'border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      {/* Product Image Canvas */}
                      <div className="relative aspect-square rounded-xl bg-white mb-2.5 flex items-center justify-center border border-slate-100 p-2 overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.product_name} className="w-full h-full object-contain group-hover:scale-105 transition duration-300" />
                        ) : (
                          <Package className="w-12 h-12 text-slate-300" />
                        )}

                        {/* Cart Quantity Highlight Badge */}
                        {cartItem && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-md animate-in zoom-in-75">
                            {cartItem.qty} &times;
                          </span>
                        )}

                        {/* Stock Pill Badge */}
                        <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-xs ${
                          isOutOfStock
                            ? 'bg-rose-500 text-white'
                            : p.current_stock <= 5
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-slate-900/80 text-white backdrop-blur-xs'
                        }`}>
                          Stok: {p.current_stock}
                        </span>

                        {/* Expiry Badge */}
                        {expBadge && (
                          <span className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[8.5px] ${expBadge.className}`}>
                            {expBadge.label}
                          </span>
                        )}
                      </div>

                      {/* Product Name & Details */}
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition">
                          {p.product_name}
                        </h4>

                        {/* Price & +/- Buttons */}
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                            {formatRupiah(p.sale_price)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Minus Button */}
                            {cartItem && cartItem.qty > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  reduceFromCart(p.id);
                                }}
                                className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 flex items-center justify-center font-bold text-sm transition cursor-pointer shadow-2xs active:scale-90"
                                title="Kurangi 1 item (-)"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Plus Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isOutOfStock) addToCart(p);
                              }}
                              disabled={isOutOfStock}
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition cursor-pointer shadow-xs active:scale-90 ${
                                isOutOfStock
                                  ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              title="Tambah 1 item (+)"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: "Daftar Penjualan" (Cart & Checkout Panel) */}
          <div className="hidden md:block w-full md:w-80 lg:w-96 shrink-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 sticky top-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Daftar Penjualan</h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <ShoppingCart className="w-10 h-10 opacity-30 text-slate-400" />
                  <span>Belum ada item dipilih</span>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 last:border-b-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">{item.product_name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-slate-500 font-mono">
                          {item.qty} &times; {formatRupiah(item.price)}
                        </span>
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            type="button"
                            onClick={() => updateCartQty(idx, item.qty - 1)}
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => updateCartQty(idx, item.qty + 1)}
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        {formatRupiah(item.price * item.qty)}
                      </div>
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, 0)}
                        className="text-slate-300 hover:text-rose-500 text-xs mt-0.5 cursor-pointer"
                        title="Hapus"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Buyer Type & Selection Form */}
            <form onSubmit={handleCheckout} className="space-y-3 pt-3 border-t border-slate-100">
              {/* Tipe Pembeli Pill Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setBuyerType('student');
                    setPaymentMethod('wallet');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    buyerType === 'student'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Santri (QR)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBuyerType('non_student');
                    setPaymentMethod('cash');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    buyerType === 'non_student'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Umum</span>
                </button>
              </div>

              {/* Santri QR Card Scan / Live Search / Non-Student Name Input */}
              {buyerType === 'student' ? (
                <div className="space-y-2.5">
                  {selectedStudent ? (
                    <div className="p-3 rounded-2xl bg-blue-50/90 border border-blue-200/90 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-blue-800 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Santri Terpilih</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(null)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                        >
                          Ganti / Reset
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-blue-100 text-xs">
                        <div>
                          <div className="font-extrabold text-slate-900">{selectedStudent.student_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            NIPD: {selectedStudent.nipd || '-'} • {selectedStudent.class_group_name || 'Santri'}
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Saldo:</div>
                          <div className="text-sm font-black text-blue-700">{formatRupiah(selectedStudent.wallet_balance || 0)}</div>
                        </div>
                      </div>

                      {/* Info Kuota Batas Jajan Harian */}
                      <div className="pt-2 border-t border-blue-100/80 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-blue-600" />
                            <span>Batas Jajan Harian:</span>
                          </span>
                          <span className="font-bold text-slate-800 font-mono">
                            {selectedStudent.daily_spending_limit !== null && selectedStudent.daily_spending_limit !== undefined
                              ? `${formatRupiah(selectedStudent.daily_spending_limit)} / hari`
                              : 'Bebas Limit'}
                          </span>
                        </div>

                        {selectedStudent.daily_spending_limit !== null && selectedStudent.daily_spending_limit !== undefined && (
                          <>
                            <div className="grid grid-cols-2 gap-2 bg-white/80 p-2 rounded-xl border border-blue-100 font-mono text-[10px]">
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Terpakai Hari Ini:</span>
                                <span className="font-bold text-slate-700">{formatRupiah(selectedStudent.today_spent || 0)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Sisa Kuota:</span>
                                <span className={`font-black ${(selectedStudent.remaining_daily_limit || 0) <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                  {formatRupiah(selectedStudent.remaining_daily_limit || 0)}
                                </span>
                              </div>
                            </div>

                            {/* Progress bar kuota */}
                            {(() => {
                              const limit = Number(selectedStudent.daily_spending_limit) || 1;
                              const spent = Number(selectedStudent.today_spent) || 0;
                              const pct = Math.min(100, Math.round((spent / limit) * 100));
                              const remaining = selectedStudent.remaining_daily_limit !== null && selectedStudent.remaining_daily_limit !== undefined
                                ? Number(selectedStudent.remaining_daily_limit)
                                : 0;
                              const isOver = finalTotal > remaining;
                              return (
                                <div className="space-y-1">
                                  <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full transition-all duration-300 ${
                                        pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  {isOver && finalTotal > 0 && (
                                    <div className="p-1.5 bg-rose-100/90 border border-rose-200 rounded-lg text-rose-800 text-[10px] font-bold flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                      <span>Belanja ({formatRupiah(finalTotal)}) melebihi sisa kuota jajan!</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Live Search Santri */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Cari Santri (Live Search):
                        </label>
                        <SearchableSelect
                          options={studentOptions}
                          value={selectedStudent ? String(selectedStudent.student_id || selectedStudent.id) : ''}
                          onChange={(val) => {
                            const found = students.find((s) => String(s.student_id || s.id) === String(val));
                            if (found) {
                              setSelectedStudent(found);
                            }
                          }}
                          placeholder="🔍 Cari nama / NIPD santri..."
                          searchPlaceholder="Ketik nama atau NIPD..."
                          allowClear={true}
                        />
                      </div>

                      <div className="flex items-center gap-2 my-1">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">atau</span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>

                      {/* Scan QR Kartu */}
                      <div className="p-2.5 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 text-center space-y-1.5">
                        <div className="flex items-center justify-center gap-1.5 text-slate-800 text-xs font-bold">
                          <QrCode className="w-4 h-4 text-blue-600 animate-pulse" />
                          <span>Scan QR Kartu Santri</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Tembak QR code kartu santri dengan scanner tangan
                        </p>
                        <button
                          type="button"
                          onClick={() => startCameraScanner('student')}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-[11px] font-bold shadow-2xs transition cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Kamera HP (Scan Siswa)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Nama pembeli umum..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              )}

              {/* Metode Pembayaran */}
              <div className="grid grid-cols-3 gap-1.5">
                {buyerType === 'student' && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`py-1.5 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                      paymentMethod === 'wallet'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Wallet className="w-3 h-3" />
                    <span>Dompet</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Coins className="w-3 h-3" />
                  <span>Tunai</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('qris');
                    fetchPosBankStatements(selectedCashAccountOverride || accountingConfig?.settings?.cash_account_id_bank);
                  }}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                    paymentMethod === 'qris'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-3 h-3" />
                  <span>QRIS</span>
                </button>
              </div>

              {/* QRIS / Transfer: Pilihan Rekening Bank & Referensi Rekening Koran */}
              {paymentMethod === 'qris' && (
                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-blue-900 font-bold uppercase">Rekening Bank / QRIS Penampung</label>
                      <span className="text-[9px] text-blue-700 bg-blue-100 px-1 py-0.5 rounded font-semibold">Kas Bank</span>
                    </div>
                    <select
                      value={selectedCashAccountOverride || accountingConfig?.settings?.cash_account_id_bank || ''}
                      onChange={(e) => {
                        const newAcc = e.target.value;
                        setSelectedCashAccountOverride(newAcc);
                        if (newAcc) fetchPosBankStatements(newAcc);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-800"
                    >
                      <option value="">-- Pilih Rekening Bank --</option>
                      {accountingConfig?.cash_accounts?.filter(a => a.bank_account_number)?.map(a => (
                        <option key={a.id} value={a.id}>{a.display_label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-slate-600 font-bold uppercase">Referensi Rekening Koran (Mutasi Bank)</label>
                      <span className="text-[9px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">Rekonsiliasi</span>
                    </div>
                    <select
                      value={selectedBankStatementId}
                      onChange={(e) => setSelectedBankStatementId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
                    >
                      <option value="">-- Tanpa Tautan / Input Mandiri --</option>
                      {posBankStatements.map(stmt => (
                        <option key={stmt.id} value={stmt.id}>
                          {formatDate(stmt.transaction_date)} | {formatRupiah(stmt.amount)} - {stmt.description?.slice(0, 32)}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {posBankStatements.length > 0 ? `${posBankStatements.length} mutasi bank pending ditemukan` : 'Belum ada mutasi bank yang cocok'}
                    </p>
                  </div>
                </div>
              )}

              {/* Accordion Pratinjau Jurnal Akuntansi POS */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAccountingAccordion(!showAccountingAccordion)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition border border-slate-200/80 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Catatan Akuntansi &amp; Pos Dana</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600">
                    <span className="px-1.5 py-0.5 bg-indigo-100/60 rounded">Auto-Journal</span>
                    {showAccountingAccordion ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {showAccountingAccordion && (
                  <div className="mt-1.5 p-2.5 bg-slate-900 text-slate-200 rounded-xl space-y-1.5 text-[11px] font-mono shadow-inner animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1">
                      <span>Jurnal Double-Entry POS</span>
                      <span className="truncate max-w-[120px]">{accountingConfig?.settings?.fund_source_name || 'Pos SBU Kantin'}</span>
                    </div>

                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="truncate pr-2">
                        [DEBET] {paymentMethod === 'wallet'
                          ? `[${accountingConfig?.settings?.debit_wallet_coa_code || '20101'}] ${accountingConfig?.settings?.debit_wallet_coa_name || 'Dompet Santri'}`
                          : paymentMethod === 'cash'
                          ? `[10101] ${accountingConfig?.settings?.cash_account_name_tunai || 'Kas Tunai Kasir'}`
                          : `[10102] ${accountingConfig?.settings?.cash_account_name_bank || 'Kas Bank / QRIS'}`}
                      </span>
                      <span className="font-bold shrink-0">{formatRupiah(finalTotal)}</span>
                    </div>

                    <div className="flex items-center justify-between text-amber-300 pl-2">
                      <span className="truncate pr-2">
                        [KREDIT] [{accountingConfig?.settings?.credit_vendor_coa_code || '40501'}] {accountingConfig?.settings?.credit_vendor_coa_name || 'Utang Vendor'}
                      </span>
                      <span className="font-bold shrink-0">
                        {formatRupiah(cart.reduce((s, it) => s + (it.qty * (Number(it.cost_price) || 0)), 0))}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sky-300 pl-2">
                      <span className="truncate pr-2">
                        [KREDIT] [{accountingConfig?.settings?.credit_income_coa_code || '61800'}] {accountingConfig?.settings?.credit_income_coa_name || 'Bagi Hasil POS'}
                      </span>
                      <span className="font-bold shrink-0">
                        {formatRupiah(Math.max(0, finalTotal - cart.reduce((s, it) => s + (it.qty * (Number(it.cost_price) || 0)), 0)))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tunai: Cash Input & Kembalian */}
              {paymentMethod === 'cash' && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Uang Diterima</label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Kembalian</label>
                      <div className="w-full px-2 py-1 bg-white/70 border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-600">
                        {formatRupiah(cashChange)}
                      </div>
                    </div>
                  </div>
                  {/* Quick Cash Buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCashReceived(String(finalTotal))}
                      className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-[10px] font-bold text-blue-800 transition"
                    >
                      Uang Pas
                    </button>
                    {[5000, 10000, 20000, 50000, 100000].map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => {
                          const current = Number(cashReceived) || 0;
                          setCashReceived(String(current + nom));
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-mono text-slate-700 transition"
                      >
                        +{nom / 1000}rb
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtotal, Diskon & Total Calculation Block */}
              <div className="space-y-1.5 pt-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold">{formatRupiah(totalGross)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Diskon</span>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-20 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-right text-xs font-mono text-slate-800"
                  />
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-800">Total</span>
                  <span className="text-xl font-black text-blue-600 font-mono">
                    {formatRupiah(finalTotal)}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Big Blue Payment Button: [ 💳 Bayar > ] */}
              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-extrabold rounded-xl shadow-md shadow-blue-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Bayar</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ======================================================== */}
          {/* MOBILE / PORTRAIT FLOATING STICKY CART BAR (<768px)       */}
          {/* ======================================================== */}
          {cart.length > 0 && (
            <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 animate-in slide-in-from-bottom duration-200">
              <div className="bg-[#0a4d9c] text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold text-xs relative">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center">
                      {totalCartCount}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] text-blue-200">Total Tagihan:</div>
                    <div className="text-sm font-black text-white font-mono leading-none">
                      {formatRupiah(finalTotal)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileCartDrawerOpen(true)}
                  className="px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 text-xs font-extrabold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Bayar / Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: RIWAYAT & REVISI TRANSAKSI POS                    */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-3 sm:space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Transaksi</div>
              <div className="text-base sm:text-xl font-black text-slate-800 mt-1 flex items-center gap-1.5 font-mono">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                <span>{historyMetrics.totalCount}</span>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Omzet POS</div>
              <div className="text-base sm:text-xl font-black text-emerald-600 mt-1 font-mono truncate">
                {formatRupiah(historyMetrics.totalOmzet)}
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Diskon</div>
              <div className="text-base sm:text-xl font-black text-amber-600 mt-1 font-mono truncate">
                {formatRupiah(historyMetrics.totalDiscount)}
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Direvisi</div>
              <div className="text-base sm:text-xl font-black text-purple-600 mt-1 flex items-center gap-1.5 font-mono">
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                <span>{historyMetrics.totalRevised}</span>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              {/* Presets Tanggal */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
                {[
                  { id: 'today', label: 'Hari Ini' },
                  { id: '7days', label: '7 Hari Terakhir' },
                  { id: '30days', label: '30 Hari Terakhir' },
                  { id: 'all', label: 'Semua Data' },
                  { id: 'custom', label: 'Rentang Kustom' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDateFilterPreset(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      dateFilterPreset === p.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchHistory}
                disabled={historyLoading}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer self-end md:self-auto disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                <span>Segarkan Data</span>
              </button>
            </div>

            {/* Custom Date Filter Inputs */}
            {dateFilterPreset === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="font-semibold text-slate-500">Dari:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <span className="font-semibold text-slate-500">Sampai:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            )}

            {/* Filter Dropdowns & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
              {/* Search */}
              <div className="relative sm:col-span-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Cari ID / Santri / Kasir..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Filter Kasir */}
              <div>
                <select
                  value={filterCashier}
                  onChange={(e) => setFilterCashier(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="all">Semua Kasir POS</option>
                  {cashiersList.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Filter Metode Bayar */}
              <div>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="all">Semua Metode Bayar</option>
                  <option value="wallet">Dompet Santri (QR Card)</option>
                  <option value="cash">Tunai (Cash)</option>
                  <option value="qris">QRIS Digital</option>
                </select>
              </div>

              {/* Filter Status */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="completed">Selesai (Normal)</option>
                  <option value="revised">Direvisi</option>
                  <option value="void">Void / Batal</option>
                </select>
              </div>
            </div>
          </div>

          {/* History Data Table (Responsive on Mobile) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {historyLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                <p className="text-xs text-slate-400">Memuat riwayat transaksi POS...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Belum Ada Transaksi POS</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Tidak ada transaksi yang cocok dengan filter yang dipilih.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3.5 py-3">No. / Waktu</th>
                      <th className="px-3.5 py-3">Kasir POS</th>
                      <th className="px-3.5 py-3">Pembeli</th>
                      <th className="px-3.5 py-3 hidden sm:table-cell">Item Belanja</th>
                      <th className="px-3.5 py-3">Metode Bayar</th>
                      <th className="px-3.5 py-3 text-right">Total Bayar</th>
                      <th className="px-3.5 py-3 text-center">Status</th>
                      <th className="px-3.5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.map((t) => {
                      const itemCount = t.items?.length || 0;
                      const isRevised = t.is_revised || t.status === 'revised';

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition">
                          {/* No / Waktu */}
                          <td className="px-3.5 py-3">
                            <span className="font-mono font-bold text-slate-800 block">
                              #{t.id}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatDate(t.transaction_at)}
                            </span>
                          </td>

                          {/* Kasir POS */}
                          <td className="px-3.5 py-3">
                            <div className="flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-bold text-slate-800 truncate max-w-[100px]">{t.cashier_name || 'Kasir'}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID #{t.cashier_id || 1}
                            </span>
                          </td>

                          {/* Pembeli */}
                          <td className="px-3.5 py-3">
                            {t.buyer_type === 'student' ? (
                              <div>
                                <span className="font-bold text-slate-800 block truncate max-w-[120px]">
                                  {t.student_name || 'Santri'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {t.class_group_name || 'Kelas'} {t.nipd ? `• ${t.nipd}` : ''}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-800 block truncate max-w-[120px]">
                                  {t.buyer_name || 'Umum'}
                                </span>
                                <span className="text-[10px] text-slate-400">Umum</span>
                              </div>
                            )}
                          </td>

                          {/* Item Belanja (Desktop) */}
                          <td className="px-3.5 py-3 max-w-[180px] hidden sm:table-cell">
                            <div className="truncate font-semibold text-slate-700" title={t.items?.map(i => `${i.product_name} (${i.qty})`).join(', ')}>
                              {itemCount > 0 ? (
                                t.items.map(i => `${i.product_name} (${i.qty})`).join(', ')
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {itemCount} item
                            </span>
                          </td>

                          {/* Metode Bayar */}
                          <td className="px-3.5 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              t.payment_method === 'wallet'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : t.payment_method === 'cash'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              {t.payment_method === 'wallet' && <Wallet className="w-2.5 h-2.5" />}
                              {t.payment_method === 'cash' && <Coins className="w-2.5 h-2.5" />}
                              {t.payment_method === 'qris' && <QrCode className="w-2.5 h-2.5" />}
                              <span>{t.payment_method === 'wallet' ? 'Dompet' : (t.payment_method === 'cash' ? 'Tunai' : 'QRIS')}</span>
                            </span>
                          </td>

                          {/* Total Bayar */}
                          <td className="px-3.5 py-3 text-right">
                            <span className="font-mono font-black text-slate-900 block text-xs">
                              {formatRupiah(t.total_amount)}
                            </span>
                            {parseFloat(t.discount_amount) > 0 && (
                              <span className="text-[9px] text-amber-600 font-mono">
                                Disc: {formatRupiah(t.discount_amount)}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-3.5 py-3 text-center">
                            {isRevised ? (
                              <button
                                type="button"
                                onClick={() => openAuditModal(t)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition cursor-pointer shadow-2xs"
                                title="Klik untuk melihat riwayat revisi"
                              >
                                <RotateCcw className="w-2.5 h-2.5 text-purple-600" />
                                <span>Revisi ({t.revision_count || 1}x)</span>
                              </button>
                            ) : t.status === 'void' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                Void
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Selesai
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="px-3.5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedHistoryReceipt(t)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                title="Lihat & Cetak Struk Transaksi"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {t.status !== 'void' && (
                                <button
                                  type="button"
                                  onClick={() => openReviseModal(t)}
                                  className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Edit / Revisi Transaksi Ini"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span className="hidden sm:inline">Revisi</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE CART DRAWER / BOTTOM SHEET MODAL (Layar HP/Tablet) */}
      {/* ======================================================== */}
      {mobileCartDrawerOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 text-white rounded-t-3xl max-w-lg w-full max-h-[90vh] flex flex-col p-5 border-t border-slate-700 shadow-2xl space-y-3.5 animate-in slide-in-from-bottom duration-200">
            {/* Drawer Handle & Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Keranjang Kasir ({totalCartCount})</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileCartDrawerOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Container */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar">
              {/* Cart Items List */}
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="bg-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2 border border-slate-700">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{item.product_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatRupiah(item.price)} &times; {item.qty} = <span className="text-emerald-400 font-bold">{formatRupiah(item.price * item.qty)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, item.qty - 1)}
                        className="w-7 h-7 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs font-mono">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, item.qty + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, 0)}
                        className="p-1 text-slate-400 hover:text-rose-400 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tipe Pembeli */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Tipe Pembeli
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBuyerType('student');
                      setPaymentMethod('wallet');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      buyerType === 'student'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Santri (QR Kartu)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBuyerType('non_student');
                      setPaymentMethod('cash');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      buyerType === 'non_student'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Umum / Tamu</span>
                  </button>
                </div>
              </div>

              {/* Santri QR Card Scan / Live Search */}
              {buyerType === 'student' ? (
                <div className="space-y-2.5">
                  {selectedStudent ? (
                    <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Santri Terpilih</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(null)}
                          className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          Ganti / Reset
                        </button>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-700">
                        <div>
                          <div className="font-bold text-white">{selectedStudent.student_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            NIPD: {selectedStudent.nipd || '-'} • {selectedStudent.class_group_name || 'Santri'}
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-[9px] text-slate-400 font-bold uppercase">Saldo:</div>
                          <div className="text-sm font-black text-emerald-400">{formatRupiah(selectedStudent.wallet_balance || 0)}</div>
                        </div>
                      </div>

                      {/* Info Kuota Batas Jajan Harian (Dark Mode) */}
                      <div className="pt-2 border-t border-slate-700 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-emerald-400" />
                            <span>Batas Jajan Harian:</span>
                          </span>
                          <span className="font-bold text-slate-200 font-mono">
                            {selectedStudent.daily_spending_limit !== null && selectedStudent.daily_spending_limit !== undefined
                              ? `${formatRupiah(selectedStudent.daily_spending_limit)} / hari`
                              : 'Bebas Limit'}
                          </span>
                        </div>

                        {selectedStudent.daily_spending_limit !== null && selectedStudent.daily_spending_limit !== undefined && (
                          <>
                            <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-700/80 font-mono text-[10px]">
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Terpakai Hari Ini:</span>
                                <span className="font-bold text-slate-300">{formatRupiah(selectedStudent.today_spent || 0)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Sisa Kuota:</span>
                                <span className={`font-black ${(selectedStudent.remaining_daily_limit || 0) <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {formatRupiah(selectedStudent.remaining_daily_limit || 0)}
                                </span>
                              </div>
                            </div>

                            {/* Progress bar kuota */}
                            {(() => {
                              const limit = Number(selectedStudent.daily_spending_limit) || 1;
                              const spent = Number(selectedStudent.today_spent) || 0;
                              const pct = Math.min(100, Math.round((spent / limit) * 100));
                              const remaining = selectedStudent.remaining_daily_limit !== null && selectedStudent.remaining_daily_limit !== undefined
                                ? Number(selectedStudent.remaining_daily_limit)
                                : 0;
                              const isOver = finalTotal > remaining;
                              return (
                                <div className="space-y-1">
                                  <div className="w-full bg-slate-700/80 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full transition-all duration-300 ${
                                        pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-400'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  {isOver && finalTotal > 0 && (
                                    <div className="p-1.5 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-[10px] font-bold flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                      <span>Belanja ({formatRupiah(finalTotal)}) melebihi sisa kuota!</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Live Search Santri:
                        </label>
                        <SearchableSelect
                          options={studentOptions}
                          value={selectedStudent ? String(selectedStudent.student_id || selectedStudent.id) : ''}
                          onChange={(val) => {
                            const found = students.find((s) => String(s.student_id || s.id) === String(val));
                            if (found) {
                              setSelectedStudent(found);
                            }
                          }}
                          placeholder="🔍 Cari nama / NIPD..."
                          searchPlaceholder="Ketik nama santri..."
                          variant="dark"
                          allowClear={true}
                        />
                      </div>

                      <div className="flex items-center gap-2 my-1">
                        <div className="flex-1 h-px bg-slate-700" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">atau</span>
                        <div className="flex-1 h-px bg-slate-700" />
                      </div>

                      <div className="p-2.5 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/60 text-center space-y-1.5">
                        <div className="flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                          <QrCode className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span>Scan QR Kartu Santri</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Arahkan scanner tangan atau buka kamera
                        </p>
                        <button
                          type="button"
                          onClick={() => startCameraScanner('student')}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 hover:text-white text-[11px] font-bold transition cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Kamera HP (Scan Siswa)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nama Pembeli Umum
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Nama pembeli..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              )}

              {/* Metode Pembayaran */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {buyerType === 'student' && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wallet')}
                      className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                        paymentMethod === 'wallet' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <Wallet className="w-3 h-3" />
                      <span>Dompet QR</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                      paymentMethod === 'cash' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Coins className="w-3 h-3" />
                    <span>Tunai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                      paymentMethod === 'qris' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <QrCode className="w-3 h-3" />
                    <span>QRIS</span>
                  </button>
                </div>
              </div>

              {/* Tunai: Cash Input & Quick Buttons */}
              {paymentMethod === 'cash' && (
                <div className="p-2.5 bg-slate-800/90 border border-slate-700 rounded-xl space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold mb-0.5">Uang Diterima</label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold mb-0.5">Kembalian</label>
                      <div className="w-full px-2 py-1.5 bg-slate-900/60 rounded-lg text-xs font-mono font-bold text-emerald-400 flex items-center">
                        {formatRupiah(cashChange)}
                      </div>
                    </div>
                  </div>
                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setCashReceived(finalTotal.toString())}
                      className="text-[10px] px-2 py-1 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 font-bold rounded-md border border-emerald-800/80 transition"
                    >
                      Uang Pas
                    </button>
                    {[5000, 10000, 20000, 50000, 100000].map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => {
                          const current = Number(cashReceived) || 0;
                          setCashReceived((current + nom).toString());
                        }}
                        className="text-[10px] px-1.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-mono rounded-md border border-slate-600 transition"
                      >
                        +{nom / 1000}rb
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Summary */}
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatRupiah(totalGross)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Diskon:</span>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-16 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-right text-xs text-white"
                  />
                </div>
                <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-white">
                  <span>TOTAL BAYAR:</span>
                  <span className="text-base text-emerald-400 font-mono font-extrabold">{formatRupiah(finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{buyerType === 'student' && paymentMethod === 'wallet' ? 'Konfirmasi PIN & Bayar' : 'Selesaikan Pembayaran'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* CAMERA SCANNER MODAL (Scan Barcode / QR dengan Kamera HP) */}
      {/* ======================================================== */}
      {cameraScannerOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-sm w-full p-4 sm:p-5 text-white space-y-3.5 text-center shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold leading-tight">Scan Kamera HP</h3>
                  <p className="text-[10px] text-slate-400">
                    {cameraFacingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Torch / Flashlight Toggle if supported */}
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    title={torchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
                    className={`p-2 rounded-xl border transition ${
                      torchOn
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    {torchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </button>
                )}
                {/* Flip Camera */}
                <button
                  type="button"
                  onClick={flipCamera}
                  title="Ganti Kamera (Depan/Belakang)"
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                {/* Close Button */}
                <button
                  type="button"
                  onClick={stopCameraScanner}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-800/60 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode Target Scanner Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setScannerMode('auto')}
                className={`py-1.5 px-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  scannerMode === 'auto'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto (Semua)</span>
              </button>
              <button
                type="button"
                onClick={() => setScannerMode('product')}
                className={`py-1.5 px-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  scannerMode === 'product'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-3 h-3" />
                <span>📦 Produk</span>
              </button>
              <button
                type="button"
                onClick={() => setScannerMode('student')}
                className={`py-1.5 px-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  scannerMode === 'student'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3 h-3" />
                <span>👤 Siswa</span>
              </button>
            </div>

            {/* Video Viewport / Error State */}
            {cameraError ? (
              <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs space-y-2 text-left">
                <div className="flex items-center gap-2 font-bold text-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Kamera Tidak Dapat Dibuka</span>
                </div>
                <p className="text-[11px] leading-relaxed">{cameraError}</p>
                <div className="pt-2 border-t border-rose-900/50 text-[10px] text-rose-400">
                  💡 Tips Android: Pastikan Anda membuka melalui HTTPS / Localhost dan telah memberikan izin Kamera pada peramban Chrome/Edge.
                </div>
              </div>
            ) : (
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border border-slate-700 flex items-center justify-center shadow-inner">
                {cameraLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10 gap-2">
                    <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                    <span className="text-xs text-slate-300">Menghubungkan ke kamera...</span>
                  </div>
                )}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Scanner Target Guide Overlay */}
                <div className="absolute inset-7 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex items-center justify-center overflow-hidden">
                  {/* Corner Markers */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-md" />

                  {/* Laser Scan Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />
                </div>
              </div>
            )}

            {/* Contextual Guide Text */}
            <p className="text-[11px] text-slate-400">
              {scannerMode === 'product' && (
                <>Arahkan kamera ke <span className="text-emerald-400 font-semibold">Barcode Kemasan Produk</span>.</>
              )}
              {scannerMode === 'student' && (
                <>Arahkan kamera ke <span className="text-blue-400 font-semibold">QR Kartu Santri</span>.</>
              )}
              {scannerMode === 'auto' && (
                <>Arahkan kamera ke <span className="text-emerald-400 font-semibold">Barcode Produk</span> atau <span className="text-blue-400 font-semibold">QR Santri</span>.</>
              )}
            </p>

            {/* Continuous Multi-Scan Toggle (Product/Auto Mode) */}
            {scannerMode !== 'student' && (
              <label className="flex items-center justify-center gap-2 text-[11px] text-slate-300 cursor-pointer select-none bg-slate-950/50 py-1 rounded-lg border border-slate-800/80">
                <input
                  type="checkbox"
                  checked={continuousScan}
                  onChange={(e) => setContinuousScan(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-0 focus:outline-hidden"
                />
                <span>Scan Beruntun (Tetap buka kamera)</span>
              </label>
            )}

            {/* Manual Code Input Fallback */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (scannerManualInput.trim()) {
                    const code = scannerManualInput.trim();
                    setScannerManualInput('');
                    stopCameraScanner();
                    processScanCode(code, scannerMode);
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={scannerManualInput}
                  onChange={(e) => setScannerManualInput(e.target.value)}
                  placeholder={
                    scannerMode === 'product'
                      ? 'Ketik Barcode produk manual...'
                      : scannerMode === 'student'
                      ? 'Ketik NIPD santri manual...'
                      : 'Ketik NIPD / Barcode manual...'
                  }
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!scannerManualInput.trim()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold rounded-xl transition shrink-0"
                >
                  Terapkan
                </button>
              </form>
            </div>

            <button
              type="button"
              onClick={stopCameraScanner}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition text-slate-300"
            >
              Tutup Scanner
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL TOUCHSCREEN PIN PAD TABLET                         */}
      {/* ======================================================== */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-3.5 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-left">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Konfirmasi PIN Santri</h3>
                  <p className="text-[10px] text-slate-500">Silakan santri memasukkan 6-digit PIN</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPinModalError(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pinModalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{pinModalError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Santri:</span>
                <span className="font-bold text-slate-800">{selectedStudent?.student_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Saldo Dompet:</span>
                <span className="font-mono font-bold text-slate-700">{formatRupiah(selectedStudent?.wallet_balance || 0)}</span>
              </div>
              {selectedStudent?.daily_spending_limit !== null && selectedStudent?.daily_spending_limit !== undefined && (
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Sisa Kuota Jajan Hari Ini:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatRupiah(selectedStudent?.remaining_daily_limit || 0)} <span className="text-slate-400 font-normal">/ {formatRupiah(selectedStudent?.daily_spending_limit || 0)}</span>
                  </span>
                </div>
              )}
              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">Total Belanja:</span>
                <span className="text-sm font-extrabold text-emerald-700 font-mono">{formatRupiah(finalTotal)}</span>
              </div>
            </div>

            {/* 6-Digit PIN Dots */}
            <div className="py-1.5 space-y-1.5">
              <div className="flex items-center justify-center gap-3">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const isFilled = childPin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        isFilled
                          ? 'bg-emerald-600 ring-4 ring-emerald-100 scale-110'
                          : 'bg-slate-200 border border-slate-300'
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {childPin.length} / 6 Digit
              </p>
            </div>

            {/* Touchscreen Numpad */}
            <div className="grid grid-cols-3 gap-2 pt-1 touch-manipulation">
              {[
                { val: '1', sub: '' },
                { val: '2', sub: 'ABC' },
                { val: '3', sub: 'DEF' },
                { val: '4', sub: 'GHI' },
                { val: '5', sub: 'JKL' },
                { val: '6', sub: 'MNO' },
                { val: '7', sub: 'PQRS' },
                { val: '8', sub: 'TUV' },
                { val: '9', sub: 'WXYZ' },
              ].map((btn) => (
                <button
                  key={btn.val}
                  type="button"
                  onClick={() => handleNumpadPress(btn.val)}
                  className="h-12 sm:h-13 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 active:bg-emerald-100 active:scale-95 transition flex flex-col items-center justify-center shadow-2xs cursor-pointer select-none"
                >
                  <span className="text-lg font-extrabold text-slate-800 font-mono leading-none">{btn.val}</span>
                  {btn.sub && <span className="text-[7.5px] font-bold text-slate-400 tracking-wider mt-0.5">{btn.sub}</span>}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleNumpadPress('clear')}
                className="h-12 sm:h-13 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-slate-600 font-bold text-xs flex flex-col items-center justify-center active:scale-95 transition cursor-pointer select-none"
              >
                <span>Hapus</span>
              </button>

              <button
                type="button"
                onClick={() => handleNumpadPress('0')}
                className="h-12 sm:h-13 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 active:bg-emerald-100 active:scale-95 transition flex flex-col items-center justify-center shadow-2xs cursor-pointer select-none"
              >
                <span className="text-lg font-extrabold text-slate-800 font-mono leading-none">0</span>
              </button>

              <button
                type="button"
                onClick={() => handleNumpadPress('backspace')}
                className="h-12 sm:h-13 rounded-2xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200 text-slate-600 font-bold text-xs flex flex-col items-center justify-center active:scale-95 transition cursor-pointer select-none"
              >
                <Delete className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPinModalError(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting || childPin.length < 6}
                onClick={() => executeCheckout(childPin)}
                className="flex-2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Konfirmasi &amp; Bayar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL STRUK SETELAH CHECKOUT SUKSES                      */}
      {/* ======================================================== */}
      {successReceipt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-3.5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-slate-800">Transaksi Kasir Berhasil!</h3>
              <p className="text-xs text-slate-500 font-mono">Struk #{successReceipt.sales_transaction_id}</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                <span>Kasir POS:</span>
                <span className="font-bold text-emerald-800">{successReceipt.cashier_name || 'Kasir'}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                <span>Pembeli:</span>
                <span className="font-bold text-slate-800">{successReceipt.buyer_name}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                <span>Metode:</span>
                <span className="uppercase font-semibold text-emerald-700">{successReceipt.payment_method}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Item Belanja:</span>
                {successReceipt.items?.map((it, i) => (
                  <div key={i} className="flex justify-between items-start text-[11px] pb-1 border-b border-slate-100 last:border-0 gap-2">
                    <span className="font-bold text-slate-800 leading-tight truncate">{it.product_name}</span>
                    <span className="font-mono font-bold text-slate-700 text-right shrink-0">
                      {it.qty} &times; {formatNumber(it.price || it.sale_price || 0)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-xs font-mono">
                <span>Total Bayar:</span>
                <span className="text-emerald-700">{formatRupiah(successReceipt.total_amount)}</span>
              </div>

              {successReceipt.payment_method === 'cash' && (
                <>
                  <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                    <span>Uang Diterima:</span>
                    <span>{formatRupiah(successReceipt.cash_received || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                    <span>Kembalian:</span>
                    <span className="font-bold text-emerald-700">{formatRupiah(successReceipt.cash_change || 0)}</span>
                  </div>
                </>
              )}

              {successReceipt.wallet_balance_after !== null && (
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Sisa Saldo Santri:</span>
                  <span>{formatRupiah(successReceipt.wallet_balance_after)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={() => setSuccessReceipt(null)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL REVISI TRANSAKSI POS                               */}
      {/* ======================================================== */}
      {reviseModalOpen && revisingTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Revisi Transaksi POS #{revisingTx.id}</h3>
                  <p className="text-xs text-slate-500">
                    Kasir Awal: <span className="font-bold text-slate-700">{revisingTx.cashier_name || 'Kasir'}</span> • Pembeli: <span className="font-bold text-slate-700">{revisingTx.student_name || revisingTx.buyer_name || 'Umum'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviseModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviseError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{reviseError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteRevision} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <select
                    value={selectedAddProduct}
                    onChange={(e) => {
                      setSelectedAddProduct(e.target.value);
                      handleAddProductToRevise(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="">+ Tambah Produk Lain dari Katalog...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} - {formatRupiah(p.sale_price)} (Stok: {p.current_stock})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table Revisi */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5">Produk</th>
                      <th className="px-3 py-2.5 text-center">Qty</th>
                      <th className="px-3 py-2.5 text-right">Harga</th>
                      <th className="px-3 py-2.5 text-right">Subtotal</th>
                      <th className="px-3 py-2.5 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviseItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-bold text-slate-800">
                          {it.product_name}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateReviseItemQty(idx, it.qty - 1)}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-mono font-bold">{it.qty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateReviseItemQty(idx, it.qty + 1)}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatRupiah(it.sale_price)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                          {formatRupiah(it.qty * it.sale_price)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleUpdateReviseItemQty(idx, 0)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Perbandingan Total */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tagihan Awal</span>
                  <span className="text-xs sm:text-sm font-black text-slate-700 font-mono">{formatRupiah(oldTotal)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tagihan Baru</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono">{formatRupiah(reviseFinalTotal)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selisih Transaksi</span>
                  <span className={`text-xs sm:text-sm font-black font-mono ${
                    reviseDiff > 0 ? 'text-amber-700' : (reviseDiff < 0 ? 'text-emerald-700' : 'text-slate-700')
                  }`}>
                    {reviseDiff > 0 ? `+${formatRupiah(reviseDiff)} (Tambahan)` : (reviseDiff < 0 ? `${formatRupiah(reviseDiff)} (Kembalian)` : 'Rp0')}
                  </span>
                </div>
              </div>

              {/* Catatan Alasan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Alasan Revisi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="Jelaskan alasan perubahan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={reviseSubmitting || !revisionReason.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {reviseSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan &amp; Terapkan Revisi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL AUDIT LOG RIWAYAT REVISI                           */}
      {/* ======================================================== */}
      {auditModalOpen && auditTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-purple-100 text-purple-800">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Jejak Audit Revisi Transaksi #{auditTx.id}</h3>
                  <p className="text-xs text-slate-500">
                    Merekam seluruh riwayat perubahan data transaksi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {auditLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                <p className="text-xs text-slate-400">Memuat log revisi...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada log revisi untuk transaksi ini.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {auditLogs.map((log, idx) => (
                  <div key={log.id || idx} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full text-[10px]">
                        Revisi #{auditLogs.length - idx}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {formatDate(log.created_at)}
                      </span>
                    </div>

                    <div className="text-xs">
                      <span className="text-slate-500">Direvisi oleh: </span>
                      <strong className="text-slate-800">{log.revised_by_name || 'Petugas'}</strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
                      <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-700 mb-0.5">
                        Alasan Revisi:
                      </span>
                      <p className="italic">"{log.revision_reason}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 rounded-xl bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">Sebelumnya:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {formatRupiah(log.previous_data?.total_amount)}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          {log.previous_data?.items?.map(it => `${it.product_name} (${it.qty})`).join(', ')}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-white border border-emerald-200">
                        <span className="text-[10px] text-emerald-600 block font-bold">Sesudah:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {formatRupiah(log.new_data?.total_amount)}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          {log.new_data?.items?.map(it => `${it.product_name} (${it.qty})`).join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tutup Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DETAIL / STRUK TRANSAKSI RIWAYAT                   */}
      {/* ======================================================== */}
      {selectedHistoryReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-3.5 text-center animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-left">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Detail Struk Transaksi</h3>
                  <p className="text-[10px] text-slate-500 font-mono">No. #{selectedHistoryReceipt.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryReceipt(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                <span>Waktu:</span>
                <span className="font-bold text-slate-800">{formatDate(selectedHistoryReceipt.transaction_at)}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                <span>Kasir POS:</span>
                <span className="font-bold text-emerald-800">{selectedHistoryReceipt.cashier_name || 'Kasir'}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                <span>Pembeli:</span>
                <span className="font-bold text-slate-800">
                  {selectedHistoryReceipt.student_name || selectedHistoryReceipt.buyer_name || 'Umum'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                <span>Metode Pembayaran:</span>
                <span className="uppercase font-semibold text-emerald-700">{selectedHistoryReceipt.payment_method}</span>
              </div>

              {selectedHistoryReceipt.is_revised && (
                <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-semibold flex items-center justify-between">
                  <span>Pernah Direvisi ({selectedHistoryReceipt.revision_count || 1}x)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHistoryReceipt(null);
                      openAuditModal(selectedHistoryReceipt);
                    }}
                    className="underline text-purple-900 font-bold hover:text-purple-950"
                  >
                    Lihat Log
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 space-y-1 max-h-36 overflow-y-auto pr-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Item Belanja:</span>
                {selectedHistoryReceipt.items?.map((it, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] pb-1 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-800 truncate max-w-[200px]">
                      {it.product_name}
                    </span>
                    <span className="font-mono font-bold text-slate-700 shrink-0">
                      {it.qty} &times; {formatNumber(it.sale_price || it.price || 0)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-xs font-mono">
                <span>Total Belanja:</span>
                <span className="text-emerald-700">{formatRupiah(selectedHistoryReceipt.total_amount)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedHistoryReceipt(null)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL KONFIGURASI AKUNTANSI POS KANTIN                  */}
      {/* ======================================================== */}
      {accountingConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Pengaturan Akun Akuntansi POS</h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi default jenis kas, pos dana, dan akun debet/kredit otomatis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountingConfigModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveAccountingConfig} className="space-y-4">
              {/* Akun Kas Tunai POS */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Akun Kas Tunai POS (Kasir / Brankas) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editConfigForm.cash_account_id_tunai || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found = accountingConfig?.cash_accounts?.find(a => String(a.id) === String(id));
                    setEditConfigForm({
                      ...editConfigForm,
                      cash_account_id_tunai: id,
                      cash_account_name_tunai: found ? found.display_label : ''
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                >
                  <option value="">-- Pilih Akun Kas Tunai --</option>
                  {accountingConfig?.cash_accounts?.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.is_canteen ? '⭐ ' : ''}{a.display_label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Menampung penerimaan uang fisik dari transaksi kasir berbayar tunai
                </p>
              </div>

              {/* Akun Kas Bank / QRIS POS */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Akun Kas Bank / QRIS POS (Nontunai) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editConfigForm.cash_account_id_bank || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found = accountingConfig?.cash_accounts?.find(a => String(a.id) === String(id));
                    setEditConfigForm({
                      ...editConfigForm,
                      cash_account_id_bank: id,
                      cash_account_name_bank: found ? found.display_label : ''
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                >
                  <option value="">-- Pilih Rekening Bank / QRIS --</option>
                  {accountingConfig?.cash_accounts?.filter(a => a.bank_account_number)?.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.is_canteen ? '⭐ ' : ''}{a.display_label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Menampung penerimaan transaksi transfer bank atau QRIS
                </p>
              </div>

              {/* Akun Debet Dompet Santri */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Akun Debet Dompet / Saldo Santri <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editConfigForm.debit_wallet_coa_id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found = accountingConfig?.coas?.all?.find(c => String(c.id) === String(id));
                    setEditConfigForm({
                      ...editConfigForm,
                      debit_wallet_coa_id: id,
                      debit_wallet_coa_code: found ? found.account_code : '',
                      debit_wallet_coa_name: found ? found.account_name : ''
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                >
                  <option value="">-- Pilih Akun COA Dompet Santri --</option>
                  {accountingConfig?.coas?.wallet_debit?.map(c => (
                    <option key={c.id} value={c.id}>{c.display_label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Akun pengurang simpanan dompet santri atau piutang klaim kantin ke keuangan pusat
                </p>
              </div>

              {/* Akun Kredit Utang Vendor Titipan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Akun Kredit Utang Usaha Vendor Titipan <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editConfigForm.credit_vendor_coa_id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found = accountingConfig?.coas?.all?.find(c => String(c.id) === String(id));
                    setEditConfigForm({
                      ...editConfigForm,
                      credit_vendor_coa_id: id,
                      credit_vendor_coa_code: found ? found.account_code : '',
                      credit_vendor_coa_name: found ? found.account_name : ''
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                >
                  <option value="">-- Pilih Akun COA Utang Vendor --</option>
                  {accountingConfig?.coas?.vendor_credit?.map(c => (
                    <option key={c.id} value={c.id}>{c.display_label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Mencatat kewajiban/utang titipan bagi hasil pemilik makanan yang wajib diserahkan
                </p>
              </div>

              {/* Akun Kredit Pendapatan Bagi Hasil POS */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Akun Kredit Pendapatan Bagi Hasil POS Kantin <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editConfigForm.credit_income_coa_id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found = accountingConfig?.coas?.all?.find(c => String(c.id) === String(id));
                    setEditConfigForm({
                      ...editConfigForm,
                      credit_income_coa_id: id,
                      credit_income_coa_code: found ? found.account_code : '',
                      credit_income_coa_name: found ? found.account_name : ''
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                >
                  <option value="">-- Pilih Akun Pendapatan POS --</option>
                  {accountingConfig?.coas?.income_credit?.map(c => (
                    <option key={c.id} value={c.id}>{c.display_label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Mencatat pendapatan margin/bagi hasil bersih yang menjadi hak unit kantin
                </p>
              </div>

              {/* Pos Dana Terkait */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pos Dana Terkait
                </label>
                <input
                  type="text"
                  value={editConfigForm.fund_source_name || ''}
                  onChange={(e) => setEditConfigForm({ ...editConfigForm, fund_source_name: e.target.value })}
                  placeholder="Contoh: Pos Pendapatan & Kas Operasional SBU Kantin"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                />
              </div>

              {/* Toggle Auto Journal */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Pencatatan Jurnal Otomatis (Auto-Journal)</span>
                  <span className="text-[11px] text-slate-500">
                    Otomatis buat jurnal umum akuntansi ganda setiap transaksi POS checkout
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={editConfigForm.auto_journal !== false}
                  onChange={(e) => setEditConfigForm({ ...editConfigForm, auto_journal: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAccountingConfigModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={accountingConfigSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {accountingConfigSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Simpan Konfigurasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
