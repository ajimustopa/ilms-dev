import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  Tags,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  Search,
  History,
  Power,
  RotateCw,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  Percent,
  Gift,
  Calendar,
  Building2,
  School,
  Filter,
  Copy,
  Sparkles,
  CheckSquare,
  Square
} from 'lucide-react';

export default function FeeSchemes() {
  const { activeSchoolUnit } = useAuth();
  const [schemes, setSchemes] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState(() => {
    try {
      const saved = localStorage.getItem('keuangan_fee_schemes_selected_ay');
      return saved !== null ? saved : 'all';
    } catch {
      return 'all';
    }
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSchemeId, setExpandedSchemeId] = useState(null);

  // Modal State Tambah / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    academic_year_id: 1,
    items: [],
    edit_reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal State Duplikasi Skema Lintas Tahun Ajaran
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [sourceYearId, setSourceYearId] = useState('');
  const [targetYearId, setTargetYearId] = useState('');
  const [sourceSchemesList, setSourceSchemesList] = useState([]);
  const [loadingSourceSchemes, setLoadingSourceSchemes] = useState(false);
  const [selectedSourceSchemeIds, setSelectedSourceSchemeIds] = useState([]);
  const [rateAdjustmentPercentage, setRateAdjustmentPercentage] = useState(0);
  const [copyConflictMode, setCopyConflictMode] = useState('create_copy'); // 'create_copy' | 'skip_existing' | 'overwrite_existing'
  const [submittingDuplicate, setSubmittingDuplicate] = useState(false);
  const [duplicateSuccessMsg, setDuplicateSuccessMsg] = useState('');

  // Modal State Riwayat Audit
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isYayasan = !activeSchoolUnit || activeSchoolUnit.id === 'all' || activeSchoolUnit.is_foundation || activeSchoolUnit.id === null;

  // Persist selectedYearId whenever it changes
  useEffect(() => {
    try {
      if (selectedYearId !== undefined && selectedYearId !== null) {
        localStorage.setItem('keuangan_fee_schemes_selected_ay', String(selectedYearId));
      }
    } catch (e) {
      console.warn('Gagal menyimpan pilihan tahun ajaran ke localStorage:', e);
    }
  }, [selectedYearId]);

  useEffect(() => {
    fetchInitialData();
  }, [activeSchoolUnit, selectedYearId]);

  const fetchInitialData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Ambil Tahun Ajaran dari modul akademik
      let yearsList = [];
      try {
        const ayParams = {};
        if (activeSchoolUnit && activeSchoolUnit.id && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
          ayParams.satuan_pendidikan_id = activeSchoolUnit.id;
        }
        const ayRes = await api.get('/akademik/academic-years', { params: ayParams });
        yearsList = ayRes.data?.data || ayRes.data?.academic_years || [];
      } catch (e) {
        // Fallback internal
      }
      
      // Deduplikasi Tahun Ajaran berdasarkan nama (menghilangkan duplikasi nama T.A. lintas unit sekolah)
      const uniqueYearsMap = new Map();
      yearsList.forEach((y) => {
        const nameKey = (y.name || '').trim();
        if (!nameKey) return;
        const existing = uniqueYearsMap.get(nameKey);
        if (!existing) {
          uniqueYearsMap.set(nameKey, y);
        } else if (y.is_active && !existing.is_active) {
          // prioritaskan data yang aktif
          uniqueYearsMap.set(nameKey, y);
        }
      });
      yearsList = Array.from(uniqueYearsMap.values());
      
      // Urutkan tahun ajaran secara descending berdasarkan nama (misal: 2026/2027, 2025/2026, 2024/2025)
      yearsList.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

      if (yearsList.length === 0) {
        yearsList = [
          { id: 2, name: '2026/2027', is_active: 1 },
          { id: 1, name: '2025/2026', is_active: 0 },
          { id: 3, name: '2024/2025', is_active: 0 }
        ];
      }
      setAcademicYears(yearsList);

      // Pastikan jika localStorage memiliki nilai yang tersimpan, kita tetap pertahankan
      const savedAy = localStorage.getItem('keuangan_fee_schemes_selected_ay');
      if (savedAy && savedAy !== selectedYearId) {
        setSelectedYearId(savedAy);
      }

      // 2. Ambil Jenis Biaya (fee_types) untuk form rincian
      const feeTypesRes = await api.get('/keuangan/fee-types');
      setFeeTypes(feeTypesRes.data?.data || []);

      // 3. Ambil Daftar Skema Biaya
      const params = {};
      const currentYearFilter = savedAy || selectedYearId;
      if (currentYearFilter && currentYearFilter !== 'all') {
        params.academic_year_id = currentYearFilter;
      }
      const schemesRes = await api.get('/keuangan/fee-schemes', { params });
      setSchemes(schemesRes.data?.data || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data skema biaya');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedScheme(null);

    // Default ke tahun ajaran aktif atau tahun ajaran yang sedang difilter
    const activeYear = academicYears.find(y => y.is_active) || academicYears[0];
    const defaultYearId = selectedYearId !== 'all' ? Number(selectedYearId) : (activeYear ? activeYear.id : 1);

    // Siapkan default items dari seluruh fee_types aktif (default 0)
    const initialItems = feeTypes.map((ft) => ({
      fee_type_id: ft.id,
      fee_type_name: ft.name,
      billing_pattern: ft.billing_pattern,
      value_type: 'fixed_amount',
      value: 0
    }));

    setFormData({
      code: '',
      name: '',
      description: '',
      academic_year_id: defaultYearId,
      items: initialItems,
      edit_reason: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (scheme) => {
    setModalMode('edit');
    setSelectedScheme(scheme);

    // Map items yang sudah ada atau gabungkan dengan fee_types yang tersedia
    const existingItemMap = {};
    scheme.items?.forEach((it) => {
      existingItemMap[it.fee_type_id] = it;
    });

    const mappedItems = feeTypes.map((ft) => {
      const existing = existingItemMap[ft.id];
      return {
        fee_type_id: ft.id,
        fee_type_name: ft.name,
        billing_pattern: ft.billing_pattern,
        value_type: existing?.value_type || 'fixed_amount',
        value: existing ? parseFloat(existing.value) : 0
      };
    });

    setFormData({
      code: scheme.code,
      name: scheme.name,
      description: scheme.description || '',
      academic_year_id: scheme.academic_year_id,
      items: mappedItems,
      edit_reason: ''
    });
    setModalOpen(true);
  };

  const handleItemChange = (index, field, val) => {
    const nextItems = [...formData.items];
    nextItems[index][field] = val;
    if (field === 'value_type' && val === 'waiver_full') {
      nextItems[index].value = 0;
    }
    setFormData({ ...formData, items: nextItems });
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    if (!formData.academic_year_id) {
      alert('Tahun ajaran wajib dipilih');
      return;
    }
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await api.post('/keuangan/fee-schemes', formData);
        alert('Skema biaya pendidikan berhasil dibuat!');
      } else {
        if (!formData.edit_reason) {
          alert('Alasan perubahan (edit_reason) wajib diisi saat mengubah skema');
          setSubmitting(false);
          return;
        }
        await api.put(`/keuangan/fee-schemes/${selectedScheme.id}`, formData);
        alert('Skema biaya pendidikan berhasil diperbarui!');
      }
      setModalOpen(false);
      fetchInitialData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan skema biaya');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (scheme) => {
    const nextStatus = !scheme.is_active;
    const actionText = nextStatus ? 'mengaktifkan' : 'menonaktifkan';
    if (!window.confirm(`Apakah Anda yakin ingin ${actionText} skema "${scheme.name}"?`)) {
      return;
    }

    try {
      await api.patch(`/keuangan/fee-schemes/${scheme.id}/status`, { is_active: nextStatus });
      fetchInitialData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status skema');
    }
  };

  // ============================================================
  // DUPLIKASI SKEMA LINTAS TAHUN AJARAN & CLONE SKEMA
  // ============================================================
  const fetchSourceSchemes = async (srcId, preselectedIds = null) => {
    if (!srcId || srcId === 'all') {
      setSourceSchemesList([]);
      setSelectedSourceSchemeIds([]);
      return;
    }
    setLoadingSourceSchemes(true);
    try {
      const res = await api.get('/keuangan/fee-schemes', {
        params: { academic_year_id: srcId }
      });
      const list = res.data?.data || [];
      setSourceSchemesList(list);
      if (preselectedIds && preselectedIds.length > 0) {
        setSelectedSourceSchemeIds(preselectedIds);
      } else {
        setSelectedSourceSchemeIds(list.map((s) => s.id));
      }
    } catch (e) {
      console.error('Error fetching source schemes:', e);
    } finally {
      setLoadingSourceSchemes(false);
    }
  };

  const openDuplicateModal = () => {
    const targetY = selectedYearId !== 'all' ? selectedYearId : (academicYears[0]?.id || 1);
    const defaultSource = academicYears.find((y) => String(y.id) !== String(targetY)) || academicYears[0];
    const srcId = String(defaultSource?.id || 1);
    const tgtId = String(targetY);

    setSourceYearId(srcId);
    setTargetYearId(tgtId);
    setRateAdjustmentPercentage(0);
    setCopyConflictMode('create_copy');
    setDuplicateSuccessMsg('');
    setDuplicateModalOpen(true);
    fetchSourceSchemes(srcId);
  };

  const handleDuplicateSingleScheme = (scheme) => {
    const srcAyId = scheme.academic_year_id
      ? String(scheme.academic_year_id)
      : (selectedYearId !== 'all' ? selectedYearId : String(academicYears[0]?.id || 1));
    const tgtAyId = srcAyId;

    setSourceYearId(srcAyId);
    setTargetYearId(tgtAyId);
    setSelectedSourceSchemeIds([scheme.id]);
    setRateAdjustmentPercentage(0);
    setCopyConflictMode('create_copy');
    setDuplicateSuccessMsg('');
    setDuplicateModalOpen(true);
    fetchSourceSchemes(srcAyId, [scheme.id]);
  };

  const handleExecuteDuplicate = async (e) => {
    e.preventDefault();
    if (selectedSourceSchemeIds.length === 0) {
      alert('Pilih minimal 1 skema biaya untuk diduplikasi');
      return;
    }
    if (String(sourceYearId) === String(targetYearId) && copyConflictMode === 'overwrite_existing') {
      alert('Duplikasi pada Tahun Ajaran yang sama harus menggunakan opsi Buat Salinan Baru');
      return;
    }

    setSubmittingDuplicate(true);
    try {
      const res = await api.post('/keuangan/fee-schemes/duplicate', {
        source_academic_year_id: sourceYearId,
        target_academic_year_id: targetYearId,
        scheme_ids: selectedSourceSchemeIds,
        adjustment_percentage: parseFloat(rateAdjustmentPercentage || 0),
        copy_mode: copyConflictMode
      });

      setDuplicateSuccessMsg(res.data?.message || 'Skema biaya berhasil diduplikasi');

      // Set context filter ke Tahun Ajaran Sasaran
      setSelectedYearId(String(targetYearId));
      fetchInitialData();

      setTimeout(() => {
        setDuplicateModalOpen(false);
        setDuplicateSuccessMsg('');
      }, 1200);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menduplikat skema biaya');
    } finally {
      setSubmittingDuplicate(false);
    }
  };

  const openHistoryModal = async (scheme) => {
    setHistoryItem(scheme);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryLogs([]);

    try {
      const res = await api.get('/keuangan/finance-audit-logs', {
        params: {
          entity_type: 'fee_scheme',
          entity_id: scheme.id
        }
      });
      setHistoryLogs(res.data?.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat riwayat perubahan');
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const calculateSchemeTotals = (items = []) => {
    let totalFixed = 0;
    let monthlyFixed = 0;
    let yearlyFixed = 0;
    let incidentalFixed = 0;
    let nonMonthlyFixed = 0;
    let waiverCount = 0;
    let discountCount = 0;

    items.forEach((it) => {
      const val = parseFloat(it.value) || 0;
      if (it.value_type === 'fixed_amount') {
        totalFixed += val;
        const pattern = (it.billing_pattern || '').toLowerCase();
        if (pattern === 'monthly') {
          monthlyFixed += val;
        } else if (pattern === 'yearly') {
          yearlyFixed += val;
          nonMonthlyFixed += val;
        } else if (pattern === 'incidental' || pattern === 'one_time') {
          incidentalFixed += val;
          nonMonthlyFixed += val;
        } else {
          // any other non-monthly or custom pattern
          nonMonthlyFixed += val;
        }
      } else if (it.value_type === 'waiver_full') {
        waiverCount += 1;
      } else if (it.value_type === 'percentage_of_reference') {
        discountCount += 1;
      }
    });

    return {
      totalFixed,
      monthlyFixed,
      yearlyFixed,
      incidentalFixed,
      nonMonthlyFixed,
      waiverCount,
      discountCount
    };
  };

  const filteredSchemes = schemes.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Tags className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">Skema Biaya Pendidikan</h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isYayasan
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}
              >
                {isYayasan ? <Building2 className="w-3 h-3 text-emerald-600" /> : <School className="w-3 h-3 text-indigo-600" />}
                <span>{isYayasan ? 'Konteks: Pusat Yayasan' : `Konteks: ${activeSchoolUnit?.name || 'Satuan'}`}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Template skema tarif SPP &amp; biaya sekolah per tahun ajaran (Reguler, Beasiswa Prestasi, Anak Karyawan, dsb.)
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={fetchInitialData}
              title="Sinkronkan Data"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </button>
            <button
              type="button"
              onClick={openDuplicateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplikat dari T.A. Lain</span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Skema Baru
            </button>
          </div>
        </div>

        {/* Top Summary Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Skema</span>
              <p className="text-lg font-black text-slate-800 mt-0.5">{schemes.length} <span className="text-xs font-normal text-slate-400">Template</span></p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
              <Tags className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rata-rata Bulanan</span>
              <p className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                {formatCurrency(
                  schemes.length
                    ? schemes.reduce((acc, s) => acc + (calculateSchemeTotals(s.items).monthlyFixed), 0) / schemes.length
                    : 0
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Santri Terpetakan</span>
              <p className="text-lg font-black text-slate-800 mt-0.5">
                {schemes.reduce((acc, s) => acc + (s.assigned_students_count || 0), 0)} <span className="text-xs font-normal text-slate-400">Santri</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tahun Ajaran Filter</span>
              <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                {selectedYearId === 'all'
                  ? 'Semua T.A.'
                  : `T.A. ${academicYears.find(y => String(y.id) === String(selectedYearId))?.name || selectedYearId}`}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar with Academic Year Context */}
        <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau kode skema..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* Selector Context Tahun Ajaran */}
          <div className="w-full md:w-72">
            <SearchableSelect
              options={[
                { value: 'all', label: 'Semua T.A.' },
                ...academicYears.map((ay) => ({
                  value: String(ay.id),
                  label: `T.A. ${ay.name} ${ay.is_active ? '(Aktif)' : ''}`
                }))
              ]}
              value={String(selectedYearId)}
              onChange={(val) => setSelectedYearId(val)}
              placeholder="Pilih Tahun Ajaran..."
              searchPlaceholder="Cari tahun ajaran..."
            />
          </div>

        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Schemes List Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <span className="text-xs">Memuat skema biaya...</span>
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <Tags className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">Belum Ada Skema Biaya</p>
          <p className="text-xs text-slate-400 mt-1">Buat template skema pertama Anda untuk memudahkan penetapan biaya massal santri.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSchemes.map((scheme) => {
            const isExpanded = expandedSchemeId === scheme.id;
            const totals = calculateSchemeTotals(scheme.items);

            return (
              <div
                key={scheme.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:border-slate-300 transition"
              >
                {/* Scheme Header Row */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
                  <div className="flex items-start gap-3.5 flex-1">
                    <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-mono font-bold text-xs shrink-0">
                      {scheme.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-800">{scheme.name}</h3>
                        <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          <Calendar className="w-3 h-3 text-indigo-600" />
                          {scheme.academic_year_name || `T.A. ${scheme.academic_year_id}`}
                        </span>
                        {scheme.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <XCircle className="w-3 h-3" /> Non-aktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{scheme.description || 'Tidak ada deskripsi'}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 flex-wrap">
                        <span className="font-semibold text-slate-700">
                          {scheme.items_count || 0} Pos Biaya Terdaftar
                        </span>
                        <span>&bull;</span>
                        <span className="text-emerald-700 font-medium">
                          {scheme.assigned_students_count || 0} Santri Menggunakan
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total Biaya per Skema */}
                  <div className="flex flex-col items-start lg:items-end justify-center bg-emerald-50/50 border border-emerald-200/70 rounded-xl px-4 py-2.5 min-w-[220px] shrink-0">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                      Total Biaya Skema
                    </span>
                    <span className="text-base font-black font-mono text-emerald-800">
                      {formatCurrency(totals.totalFixed)}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium mt-0.5 flex-wrap justify-end">
                      {totals.monthlyFixed > 0 && (
                        <span>Bulanan: <strong className="text-slate-800 font-mono">{formatCurrency(totals.monthlyFixed)}</strong></span>
                      )}
                      {totals.nonMonthlyFixed > 0 && (
                        <span>{totals.monthlyFixed > 0 ? '• ' : ''}Non-Bulanan: <strong className="text-slate-800 font-mono">{formatCurrency(totals.nonMonthlyFixed)}</strong></span>
                      )}
                      {totals.waiverCount > 0 && (
                        <span className="text-emerald-700 font-semibold bg-emerald-100/80 px-1 rounded">
                          {totals.waiverCount} Bebas Biaya
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Button */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <button
                      type="button"
                      onClick={() => setExpandedSchemeId(isExpanded ? null : scheme.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      {isExpanded ? (
                        <>Tutup Rincian <ChevronUp className="w-3.5 h-3.5" /></>
                      ) : (
                        <>Lihat Rincian <ChevronDown className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(scheme)}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      title="Ubah Skema"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateSingleScheme(scheme)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Duplikat Skema Ini"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(scheme)}
                      className={`p-1.5 rounded-lg transition ${
                        scheme.is_active
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={scheme.is_active ? 'Nonaktifkan Skema' : 'Aktifkan Skema'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openHistoryModal(scheme)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Riwayat Audit Trail"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Items Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Pos Biaya Pendidikan</th>
                          <th className="px-3 py-2">Siklus Tagihan</th>
                          <th className="px-3 py-2">Tipe Penetapan</th>
                          <th className="px-3 py-2 text-right">Nilai / Tarif Skema</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scheme.items?.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-3 py-4 text-center text-slate-400">
                              Belum ada rincian pos biaya pada skema ini.
                            </td>
                          </tr>
                        ) : (
                          scheme.items.map((it) => (
                            <tr key={it.id} className="hover:bg-white transition">
                              <td className="px-3 py-2.5 font-semibold text-slate-800">{it.fee_type_name}</td>
                              <td className="px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  it.billing_pattern === 'monthly'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : it.billing_pattern === 'yearly'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  {it.billing_pattern === 'monthly'
                                    ? 'Bulanan'
                                    : it.billing_pattern === 'yearly'
                                    ? 'Tahunan'
                                    : 'Insidental / Sekali Bayar'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                {it.value_type === 'fixed_amount' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    Nominal Pasti
                                  </span>
                                )}
                                {it.value_type === 'percentage_of_reference' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Diskon {it.value}% dari Acuan
                                  </span>
                                )}
                                {it.value_type === 'waiver_full' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Bebas Biaya (100%)
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                                {it.value_type === 'fixed_amount' && formatCurrency(it.value)}
                                {it.value_type === 'percentage_of_reference' && `Diskon ${it.value}%`}
                                {it.value_type === 'waiver_full' && 'Rp 0 (Gratis)'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {scheme.items?.length > 0 && (
                        <tfoot className="bg-slate-100/80 font-bold border-t border-slate-200 text-xs">
                          <tr>
                            <td colSpan="3" className="px-3 py-2.5 text-slate-700 text-right">
                              Total Akumulasi Biaya Skema:
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-700">
                              {formatCurrency(totals.totalFixed)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Skema Biaya */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Tags className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">
                  {modalMode === 'create' ? 'Tambah Skema Biaya Baru' : `Ubah Skema: ${selectedScheme?.name}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Skema *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: BEASISWA_50"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Skema *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Beasiswa Daerah Prestasi 50%"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran *</label>
                  <SearchableSelect
                    options={academicYears.map((ay) => ({
                      value: ay.id,
                      label: `T.A. ${ay.name} ${ay.is_active ? '(Aktif)' : ''}`,
                      sublabel: ay.is_active ? 'Tahun Ajaran Berjalan' : undefined
                    }))}
                    value={formData.academic_year_id}
                    onChange={(val) => setFormData({ ...formData, academic_year_id: Number(val) })}
                    placeholder="-- Pilih Tahun Ajaran --"
                    searchPlaceholder="Cari tahun ajaran..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi / Catatan Syarat</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan kriteria penerima skema biaya..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Rincian Pos Biaya */}
              <div className="pt-2 space-y-3">
                {/* Live Realtime Total Summary Box */}
                {(() => {
                  const formTotals = calculateSchemeTotals(formData.items);
                  return (
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-2xl p-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Total Realtime Skema Biaya
                          </span>
                          <h3 className="text-xl font-black font-mono text-emerald-950 mt-0.5">
                            {formatCurrency(formTotals.totalFixed)}
                          </h3>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Akumulasi otomatis seluruh tarif nominal pasti pada skema ini
                          </p>
                        </div>

                        <div className="flex sm:flex-col items-start sm:items-end gap-1 text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200/60">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="text-[11px] text-slate-500">Bulanan:</span>
                            <strong className="font-mono font-bold text-emerald-900">{formatCurrency(formTotals.monthlyFixed)}</strong>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="text-[11px] text-slate-500">Non-Bulanan:</span>
                            <strong className="font-mono font-bold text-slate-800">{formatCurrency(formTotals.nonMonthlyFixed)}</strong>
                          </div>
                          {(formTotals.waiverCount > 0 || formTotals.discountCount > 0) && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px]">
                              {formTotals.waiverCount > 0 && (
                                <span className="bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded font-semibold">
                                  {formTotals.waiverCount} Bebas Biaya
                                </span>
                              )}
                              {formTotals.discountCount > 0 && (
                                <span className="bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded font-semibold">
                                  {formTotals.discountCount} Diskon Persen
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Matriks Nilai Tarif per Pos Biaya
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {formData.items?.length || 0} Pos Biaya Terdaftar
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Pos Biaya</th>
                        <th className="px-3 py-2.5">Siklus</th>
                        <th className="px-3 py-2.5">Tipe Penetapan</th>
                        <th className="px-3 py-2.5 text-right">Nominal / Nilai (Rp / %)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition">
                          <td className="px-3 py-2.5 font-semibold text-slate-800">
                            {item.fee_type_name}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              item.billing_pattern === 'monthly'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : item.billing_pattern === 'yearly'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {item.billing_pattern === 'monthly'
                                ? 'Bulanan'
                                : item.billing_pattern === 'yearly'
                                ? 'Tahunan'
                                : 'Insidental / Sekali Bayar'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={item.value_type}
                              onChange={(e) => handleItemChange(idx, 'value_type', e.target.value)}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                              <option value="fixed_amount">Nominal Pasti (Rp)</option>
                              <option value="percentage_of_reference">Potongan Persen (%)</option>
                              <option value="waiver_full">Bebas Biaya (100%)</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {item.value_type === 'waiver_full' ? (
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                Gratis 100%
                              </span>
                            ) : (
                              <div className="inline-flex flex-col items-end">
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  value={item.value}
                                  onChange={(e) => handleItemChange(idx, 'value', e.target.value)}
                                  className="w-32 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-right focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                                {item.value_type === 'fixed_amount' && (
                                  <span className="text-[10px] text-emerald-700 font-mono font-semibold mt-0.5">
                                    {formatCurrency(parseFloat(item.value) || 0)}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {formData.items?.length > 0 && (
                      <tfoot className="bg-slate-100/80 font-bold border-t border-slate-200 text-xs">
                        <tr>
                          <td colSpan="3" className="px-3 py-2.5 text-slate-700 text-right">
                            Total Akumulasi Realtime Skema:
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-800 text-sm">
                            {formatCurrency(calculateSchemeTotals(formData.items).totalFixed)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {modalMode === 'edit' && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-amber-800 mb-1">
                    Alasan Perubahan Skema (Wajib Audit Trail) *
                  </label>
                  <textarea
                    required
                    rows="2"
                    value={formData.edit_reason}
                    onChange={(e) => setFormData({ ...formData, edit_reason: e.target.value })}
                    placeholder="Wajib jelaskan alasan revisi skema..."
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {modalMode === 'create' ? 'Simpan Skema' : 'Perbarui Skema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Audit Trail */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Riwayat Perubahan: {historyItem?.name} ({historyItem?.code})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {historyLoading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs">Memuat log perubahan...</span>
                </div>
              ) : historyLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Belum ada catatan riwayat perubahan.</p>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="relative flex items-start gap-4 pl-8">
                      <div className="absolute left-2 top-1.5 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white -translate-x-1/2" />
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 w-full text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-700 uppercase font-mono text-[10px]">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.occurred_at || log.created_at).toLocaleString('id-ID')}
                          </span>
                        </div>
                        {log.data_after?.edit_reason && (
                          <p className="text-slate-700 bg-white p-2 rounded border border-slate-100 mt-1">
                            <span className="font-semibold text-slate-500">Alasan: </span>
                            {log.data_after.edit_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DUPLIKASI SKEMA BIAYA LINTAS TAHUN AJARAN */}
      {/* ============================================================ */}
      {duplicateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <span>Duplikat Skema Biaya dari Tahun Ajaran Lain</span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </h2>
                  <p className="text-xs text-slate-400">
                    Salin paket tarif & rincian biaya pendidikan secara instan antar Tahun Ajaran
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteDuplicate} className="p-6 space-y-5 text-xs">
              {duplicateSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{duplicateSuccessMsg}</span>
                </div>
              )}

              {/* Grid Source & Target AY Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block font-bold text-slate-700">
                    1. Tahun Ajaran Asal (Sumber):
                  </label>
                  <select
                    value={sourceYearId}
                    onChange={(e) => {
                      setSourceYearId(e.target.value);
                      fetchSourceSchemes(e.target.value);
                    }}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs"
                    required
                  >
                    <option value="">-- Pilih Tahun Ajaran Asal --</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        T.A. {ay.name} {ay.is_active ? '★ (Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Skema biaya dari tahun ini yang akan dijadikan cetak biru (template).
                  </p>
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-2">
                  <label className="block font-bold text-indigo-900">
                    2. Tahun Ajaran Tujuan (Sasaran):
                  </label>
                  <select
                    value={targetYearId}
                    onChange={(e) => setTargetYearId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 text-xs"
                    required
                  >
                    <option value="">-- Pilih Tahun Ajaran Tujuan --</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        T.A. {ay.name} {ay.is_active ? '★ (Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-indigo-700/70">
                    Tahun ajaran baru tempat skema duplikat akan diterbitkan.
                  </p>
                </div>
              </div>

              {/* Source Schemes Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span>3. Pilih Skema Biaya yang Ingin Disalin</span>
                    <span className="text-slate-400 font-normal">
                      ({selectedSourceSchemeIds.length} dari {sourceSchemesList.length} terpilih)
                    </span>
                  </label>

                  {sourceSchemesList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSourceSchemeIds.length === sourceSchemesList.length) {
                          setSelectedSourceSchemeIds([]);
                        } else {
                          setSelectedSourceSchemeIds(sourceSchemesList.map((s) => s.id));
                        }
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      {selectedSourceSchemeIds.length === sourceSchemesList.length
                        ? 'Batalkan Semua'
                        : 'Pilih Semua'}
                    </button>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden max-h-56 overflow-y-auto bg-slate-50/50 p-2 space-y-1.5">
                  {loadingSourceSchemes ? (
                    <div className="p-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>Memuat skema biaya dari Tahun Ajaran Asal...</span>
                    </div>
                  ) : sourceSchemesList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      {sourceYearId
                        ? 'Tidak ada skema biaya yang ditemukan pada Tahun Ajaran Asal ini.'
                        : 'Silakan pilih Tahun Ajaran Asal terlebih dahulu.'}
                    </div>
                  ) : (
                    sourceSchemesList.map((s) => {
                      const isChecked = selectedSourceSchemeIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedSourceSchemeIds(selectedSourceSchemeIds.filter((id) => id !== s.id));
                            } else {
                              setSelectedSourceSchemeIds([...selectedSourceSchemeIds, s.id]);
                            }
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-white border-indigo-400 shadow-2xs'
                              : 'bg-white/60 border-slate-200 hover:bg-white opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent onClick
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <div>
                              <div className="font-bold text-slate-800 flex items-center gap-2">
                                <span>{s.name}</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                                  {s.code}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {s.items_count || s.items?.length || 0} Komponen Biaya
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <div className="font-bold text-slate-800 text-xs">
                              {formatCurrency(s.total_amount || 0)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              <span>Bulanan: <strong className="text-emerald-700">{formatCurrency(s.monthly_amount || 0)}</strong></span>
                              {s.non_monthly_amount > 0 && (
                                <span className="ml-1.5">&bull; Non-Bulanan: <strong className="text-slate-800">{formatCurrency(s.non_monthly_amount || 0)}</strong></span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Rate Adjustment Option */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    4. Penyesuaian / Kenaikan Tarif (% Kenaikan):
                  </label>
                  <span className="font-mono font-bold text-indigo-600 text-xs">
                    {rateAdjustmentPercentage > 0 ? `+${rateAdjustmentPercentage}%` : `${rateAdjustmentPercentage}%`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="-50"
                    max="100"
                    step="1"
                    value={rateAdjustmentPercentage}
                    onChange={(e) => setRateAdjustmentPercentage(parseFloat(e.target.value || 0))}
                    className="flex-1 accent-indigo-600"
                  />
                  <div className="w-24">
                    <input
                      type="number"
                      value={rateAdjustmentPercentage}
                      onChange={(e) => setRateAdjustmentPercentage(parseFloat(e.target.value || 0))}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold text-xs"
                      placeholder="0 %"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Gunakan 0% jika nominal biaya tetap sama. Jika diisi +10%, seluruh pos biaya bertipe nominal tetap akan dinaikkan 10% secara otomatis.
                </p>
              </div>

              {/* Conflict Mode Option */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-700">
                  5. Jika Kode/Nama Skema Sudah Ada di Tahun Ajaran Tujuan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition text-xs ${
                      copyConflictMode === 'create_copy'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="copy_conflict_mode"
                      value="create_copy"
                      checked={copyConflictMode === 'create_copy'}
                      onChange={(e) => setCopyConflictMode(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Buat Salinan Baru</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition text-xs ${
                      copyConflictMode === 'skip_existing'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="copy_conflict_mode"
                      value="skip_existing"
                      checked={copyConflictMode === 'skip_existing'}
                      onChange={(e) => setCopyConflictMode(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Lewati (Skip)</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition text-xs ${
                      copyConflictMode === 'overwrite_existing'
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="copy_conflict_mode"
                      value="overwrite_existing"
                      checked={copyConflictMode === 'overwrite_existing'}
                      onChange={(e) => setCopyConflictMode(e.target.value)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>Timpa Rincian</span>
                  </label>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDuplicateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingDuplicate || selectedSourceSchemeIds.length === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submittingDuplicate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Duplikat {selectedSourceSchemeIds.length} Skema Biaya</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
