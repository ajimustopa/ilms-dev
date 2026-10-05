import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import LoadingSkeleton from '../../../shared/components/LoadingSkeleton';
import EmptyState from '../../../shared/components/EmptyState';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
import {
  Plus,
  Calendar,
  CalendarDays,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  Users2,
  Building2,
  Filter,
  Sparkles,
  GraduationCap,
  Info
} from 'lucide-react';
import AcademicYearSelector from '../components/AcademicYearSelector';

export default function Programs() {
  const { activeSchoolUnit, schoolUnits = [] } = useAuth();
  const outletContext = useOutletContext() || {};
  const selectedAcademicYear = outletContext.selectedAcademicYear || localStorage.getItem('aldepos_ppdb_selected_academic_year') || '2026/2027';
  const setSelectedAcademicYear = outletContext.setSelectedAcademicYear;

  const isConsolidated = !activeSchoolUnit || activeSchoolUnit.id === 'all' || Boolean(activeSchoolUnit.is_foundation);

  const [activeTab, setActiveTab] = useState('programs'); // 'programs' | 'waves'
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [waves, setWaves] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [feeSchemes, setFeeSchemes] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [yearFilter, setYearFilter] = useState(selectedAcademicYear);
  const [unitFilter, setUnitFilter] = useState('all'); // Filter lokal per unit saat di mode gabungan ('all' | unit_id)

  useEffect(() => {
    if (selectedAcademicYear) {
      setYearFilter(selectedAcademicYear);
    }
  }, [selectedAcademicYear]);

  // Reset local unitFilter saat activeSchoolUnit berubah
  useEffect(() => {
    setUnitFilter('all');
  }, [activeSchoolUnit]);

  // Modals state
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [programForm, setProgramForm] = useState({
    name: '',
    target_academic_year: '2026/2027',
    target_academic_year_id: null,
    satuan_pendidikan_id: '',
    context_type: 'satuan',
    start_date: '',
    end_date: '',
    status: 'open'
  });

  const [waveModalOpen, setWaveModalOpen] = useState(false);
  const [editingWave, setEditingWave] = useState(null);
  const [waveForm, setWaveForm] = useState({
    psb_process_id: '',
    name: '',
    wave_number: 1,
    start_date: '',
    end_date: '',
    description: '',
    is_active: 1
  });

  // Modal Kuota Rombel
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaProgram, setQuotaProgram] = useState(null);
  const [quotasData, setQuotasData] = useState([]);

  const loadData = async (filterUnit = null) => {
    try {
      setLoading(true);
      const params = {};
      const activeFilter = filterUnit !== null ? filterUnit : unitFilter;

      if (!isConsolidated && activeSchoolUnit?.id) {
        params.satuan_pendidikan_id = activeSchoolUnit.id;
      } else if (isConsolidated && activeFilter !== 'all') {
        params.satuan_pendidikan_id = activeFilter;
      }

      const [progsRes, wavesRes, classesRes, schemesRes, yearsRes] = await Promise.all([
        api.get('/psb/programs', { params }),
        api.get('/psb/waves', { params }),
        api.get('/psb/lookups/class-groups', { params }),
        api.get('/psb/lookups/fee-schemes'),
        api.get('/psb/lookups/academic-years').catch(() => ({ data: { data: [] } }))
      ]);

      const progs = progsRes.data?.data || [];
      setPrograms(progs);
      if (progs.length > 0 && !selectedProgram) {
        setSelectedProgram(progs[0]);
      }
      setWaves(wavesRes.data?.data || []);
      setClassGroups(classesRes.data?.data || []);
      setFeeSchemes(schemesRes.data?.data || []);
      setAcademicYears(yearsRes.data?.data || []);
    } catch (err) {
      console.error('Gagal memuat data program & kuota:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUnitChange = () => {
      loadData();
    };
    window.addEventListener('aldepos:school-unit-changed', handleUnitChange);
    return () => {
      window.removeEventListener('aldepos:school-unit-changed', handleUnitChange);
    };
  }, [activeSchoolUnit, unitFilter]);

  // Deduplikasi Tahun Ajaran berdasarkan nama (mencegah duplicate key di lintas unit sekolah)
  const uniqueAcademicYears = useMemo(() => {
    const map = new Map();
    academicYears.forEach(ay => {
      if (ay.name && !map.has(ay.name)) {
        map.set(ay.name, ay);
      }
    });
    return Array.from(map.values());
  }, [academicYears]);

  // Dropdown Options dengan deteksi ketersediaan Tahun Ajaran
  const academicYearOptions = useMemo(() => {
    const existingYearsMap = new Map();
    programs.forEach(p => {
      if (p.target_academic_year && (!editingProgram || p.id !== editingProgram.id)) {
        existingYearsMap.set(p.target_academic_year, p.name);
      }
    });

    const dynamicList = uniqueAcademicYears.map(ay => {
      const yearName = ay.name || String(ay.id);
      const isAktif = Boolean(ay.is_active);
      const existingProgName = existingYearsMap.get(yearName);

      if (existingProgName) {
        return {
          value: yearName,
          label: `Tahun Ajaran ${yearName}`,
          badge: 'Sudah Ada Program',
          badgeClass: 'bg-amber-100 text-amber-800 font-bold',
          sublabel: `Telah memiliki: "${existingProgName}"`
        };
      }

      return {
        value: yearName,
        label: `Tahun Ajaran ${yearName}`,
        badge: isAktif ? 'Aktif (Tersedia)' : 'Tersedia',
        badgeClass: isAktif ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-700',
        sublabel: isAktif
          ? 'Tahun ajaran aktif di Modul Akademik'
          : (ay.start_date && ay.end_date ? `Periode: ${ay.start_date.substring(0, 4)} - ${ay.end_date.substring(0, 4)} (Modul Akademik)` : 'Dapat dibuka untuk program baru')
      };
    });

    const defaults = [
      { value: '2027/2028', label: 'Tahun Ajaran 2027/2028', badge: 'Tersedia', badgeClass: 'bg-emerald-100 text-emerald-800 font-bold', sublabel: 'Periode pendaftaran mendatang' },
      { value: '2026/2027', label: 'Tahun Ajaran 2026/2027', badge: existingYearsMap.has('2026/2027') ? 'Sudah Ada Program' : 'Tersedia', badgeClass: existingYearsMap.has('2026/2027') ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-emerald-100 text-emerald-800 font-bold', sublabel: existingYearsMap.has('2026/2027') ? 'Program PSB sudah ada' : 'Penerimaan periode baru' },
      { value: '2025/2026', label: 'Tahun Ajaran 2025/2026', badge: existingYearsMap.has('2025/2026') ? 'Sudah Ada Program' : undefined, badgeClass: existingYearsMap.has('2025/2026') ? 'bg-slate-100 text-slate-600' : undefined, sublabel: 'Tahun berjalan' }
    ];

    if (dynamicList.length === 0) return defaults;

    if (programForm.target_academic_year && !dynamicList.some(o => o.value === programForm.target_academic_year)) {
      const isRegistered = existingYearsMap.has(programForm.target_academic_year);
      dynamicList.unshift({
        value: programForm.target_academic_year,
        label: `Tahun Ajaran ${programForm.target_academic_year}`,
        badge: isRegistered ? 'Sudah Ada Program' : 'Terpilih',
        badgeClass: isRegistered ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-emerald-100 text-emerald-800 font-bold',
        sublabel: isRegistered ? 'Program PSB sudah ada' : 'Tahun ajaran terdaftar'
      });
    }
    return dynamicList;
  }, [uniqueAcademicYears, programForm.target_academic_year, programs, editingProgram]);

  // Deteksi konflik program per tahun ajaran secara realtime
  const selectedYearConflict = useMemo(() => {
    if (!programModalOpen) return null;
    const targetAy = programForm.target_academic_year;
    if (!targetAy) return null;

    const conflict = programs.find(p => {
      if (editingProgram && p.id === editingProgram.id) return false;
      return p.target_academic_year === targetAy;
    });

    return conflict || null;
  }, [programModalOpen, programForm.target_academic_year, programs, editingProgram]);

  const statusOptions = useMemo(() => [
    {
      value: 'open',
      label: 'Buka / Aktif (Pendaftaran Buka)',
      sublabel: 'Program tampil & aktif menerima pendaftaran baru',
      badge: 'Buka',
      badgeClass: 'bg-emerald-100 text-emerald-800 font-bold'
    },
    {
      value: 'draft',
      label: 'Draft (Persiapan)',
      sublabel: 'Belum dibuka untuk pendaftaran publik',
      badge: 'Draft',
      badgeClass: 'bg-slate-100 text-slate-700 font-bold'
    },
    {
      value: 'closed',
      label: 'Closed (Tutup Pendaftaran)',
      sublabel: 'Pendaftaran program telah berakhir',
      badge: 'Tutup',
      badgeClass: 'bg-rose-100 text-rose-800 font-bold'
    }
  ], []);

  // Handle Create / Edit Program
  const handleSaveProgram = async (e) => {
    e.preventDefault();
    try {
      if (editingProgram) {
        await api.put(`/psb/programs/${editingProgram.id}`, programForm);
      } else {
        await api.post('/psb/programs', programForm);
      }
      setProgramModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan program PSB');
    }
  };

  const handleDeleteProgram = async (prog) => {
    const regCount = prog.registrants_count || 0;
    let confirmMsg = `Yakin ingin menghapus program "${prog.name}"?`;
    let force = false;

    if (regCount > 0) {
      confirmMsg = `Program "${prog.name}" tercatat memiliki ${regCount} data pendaftar (termasuk data dummy/uji coba terdahulu).\n\nApakah Anda yakin ingin menghapus program ini beserta data pendaftar draf tersebut?`;
      force = true;
    }

    if (!window.confirm(confirmMsg)) return;
    try {
      await api.delete(`/psb/programs/${prog.id}${force ? '?force=true' : ''}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus program PSB');
    }
  };

  // Helper opsi jenjang tingkat kelas berdasarkan unit
  const getGradeOptionsForUnit = (unitId) => {
    const unit = schoolUnits.find(u => Number(u.id) === Number(unitId));
    const name = ((unit?.name || '') + ' ' + (unit?.level || '')).toUpperCase();
    if (name.includes('SMA') || name.includes('MA') || name.includes('SMK') || name.includes('ALIYAH')) {
      return [
        { value: '10', label: 'Tingkat 10 (Kelas Utama Baru)' },
        { value: '11', label: 'Tingkat 11 (Santri Pindahan)' },
        { value: '12', label: 'Tingkat 12 (Santri Pindahan)' }
      ];
    }
    if (name.includes('SMP') || name.includes('MTS') || name.includes('TSANAWIYAH')) {
      return [
        { value: '7', label: 'Tingkat 7 (Kelas Utama Baru)' },
        { value: '8', label: 'Tingkat 8 (Santri Pindahan)' },
        { value: '9', label: 'Tingkat 9 (Santri Pindahan)' }
      ];
    }
    if (name.includes('SD') || name.includes('MI')) {
      return [
        { value: '1', label: 'Tingkat 1 (Kelas Masuk Baru)' },
        { value: '2', label: 'Tingkat 2' },
        { value: '3', label: 'Tingkat 3' },
        { value: '4', label: 'Tingkat 4' },
        { value: '5', label: 'Tingkat 5' },
        { value: '6', label: 'Tingkat 6' }
      ];
    }
    return [
      { value: '7', label: 'Tingkat 7 (SMP)' },
      { value: '10', label: 'Tingkat 10 (SMA)' },
      { value: '8', label: 'Tingkat 8' },
      { value: '9', label: 'Tingkat 9' },
      { value: '11', label: 'Tingkat 11' },
      { value: '12', label: 'Tingkat 12' }
    ];
  };

  // Handle Kuota Rombel per Program (Model Hybrid: Tingkat Kelas & Gender L/P)
  const openQuotaModal = async (prog) => {
    setQuotaProgram(prog);
    try {
      const detail = await api.get(`/psb/programs/${prog.id}`);
      const existingQuotas = detail.data?.data?.class_quotas || [];

      // Dapatkan unit sekolah terkait program
      const progUnits = prog.units && prog.units.length > 0 
        ? prog.units 
        : (prog.associated_unit_ids?.length > 0
          ? schoolUnits.filter(u => prog.associated_unit_ids.includes(Number(u.id)))
          : (prog.satuan_pendidikan_id 
              ? schoolUnits.filter(u => Number(u.id) === Number(prog.satuan_pendidikan_id))
              : schoolUnits));

      if (existingQuotas.length > 0) {
        const mapped = existingQuotas.map((eq, idx) => ({
          _key: `quota_${eq.id || idx}_${Date.now()}_${Math.random()}`,
          id: eq.id,
          satuan_pendidikan_id: eq.satuan_pendidikan_id || (progUnits[0]?.id || 1),
          grade_level: eq.grade_level ? String(eq.grade_level) : '7',
          planned_classes_count: Number(eq.planned_classes_count) || 2,
          class_group_id: eq.class_group_id ? String(eq.class_group_id) : '',
          quota_male: Number(eq.quota_male) || 0,
          quota_female: Number(eq.quota_female) || 0,
          total_quota: (Number(eq.quota_male) || 0) + (Number(eq.quota_female) || 0),
          notes: eq.notes || ''
        }));
        setQuotasData(mapped);
      } else {
        // Baris awal otomatis sesuai unit program
        const initialRows = [];
        if (progUnits.length > 0) {
          progUnits.forEach((u, uIdx) => {
            const uName = ((u.name || '') + ' ' + (u.level || '')).toUpperCase();
            const defaultGrade = (uName.includes('SMA') || uName.includes('MA') || uName.includes('SMK') || uName.includes('ALIYAH')) ? '10' : '7';
            initialRows.push({
              _key: `new_${u.id}_${uIdx}_${Date.now()}`,
              satuan_pendidikan_id: u.id,
              grade_level: defaultGrade,
              planned_classes_count: 2,
              class_group_id: '',
              quota_male: 30,
              quota_female: 30,
              total_quota: 60,
              notes: 'Rencana 2 rombel (1 Ikhwan, 1 Akhwat)'
            });
          });
        } else {
          initialRows.push({
            _key: `new_default_${Date.now()}`,
            satuan_pendidikan_id: schoolUnits[0]?.id || 1,
            grade_level: '7',
            planned_classes_count: 2,
            class_group_id: '',
            quota_male: 30,
            quota_female: 30,
            total_quota: 60,
            notes: 'Rencana 2 rombel @ 30 santri'
          });
        }
        setQuotasData(initialRows);
      }
      setQuotaModalOpen(true);
    } catch (err) {
      console.error('Gagal memuat konfigurasi kuota program:', err);
      alert('Gagal memuat konfigurasi kuota');
    }
  };

  const handleAddQuotaRow = () => {
    const progUnits = quotaProgram?.units?.length > 0 
      ? quotaProgram.units 
      : (quotaProgram?.associated_unit_ids?.length > 0
        ? schoolUnits.filter(u => quotaProgram.associated_unit_ids.includes(Number(u.id)))
        : schoolUnits);
    const defaultUnitId = progUnits[0]?.id || schoolUnits[0]?.id || 1;
    const defaultGrade = getGradeOptionsForUnit(defaultUnitId)[0]?.value || '7';

    setQuotasData(prev => [
      ...prev,
      {
        _key: `row_${Date.now()}_${Math.random()}`,
        satuan_pendidikan_id: defaultUnitId,
        grade_level: defaultGrade,
        planned_classes_count: 2,
        class_group_id: '',
        quota_male: 30,
        quota_female: 30,
        total_quota: 60,
        notes: ''
      }
    ]);
  };

  const handleRemoveQuotaRow = (idx) => {
    if (quotasData.length <= 1) {
      alert('Minimal harus ada 1 baris konfigurasi kuota.');
      return;
    }
    setQuotasData(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveQuotas = async () => {
    try {
      const payload = quotasData.map(q => {
        const male = Number(q.quota_male) || 0;
        const female = Number(q.quota_female) || 0;
        return {
          satuan_pendidikan_id: Number(q.satuan_pendidikan_id),
          grade_level: String(q.grade_level).trim(),
          planned_classes_count: Number(q.planned_classes_count) || 1,
          class_group_id: q.class_group_id ? Number(q.class_group_id) : null,
          quota_male: male,
          quota_female: female,
          total_quota: male + female,
          notes: q.notes || null
        };
      });

      await api.put(`/psb/programs/${quotaProgram.id}`, {
        class_quotas: payload
      });
      setQuotaModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan konfigurasi kuota');
    }
  };

  // Handle Save Wave
  const handleSaveWave = async (e) => {
    e.preventDefault();
    try {
      if (editingWave) {
        await api.put(`/psb/waves/${editingWave.id}`, waveForm);
      } else {
        await api.post('/psb/waves', waveForm);
      }
      setWaveModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan gelombang');
    }
  };

  const handleDeleteWave = async (id) => {
    if (!window.confirm('Yakin ingin menghapus gelombang ini?')) return;
    try {
      await api.delete(`/psb/waves/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus gelombang');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Program, Kuota Rombel & Gelombang PSB
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi penerimaan santri baru per tahun ajaran, kuota gender L/P rombel, dan jalur gelombang pendaftaran
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl self-start sm:self-auto">
          {[
            { id: 'programs', label: 'Program & Kuota Rombel', icon: Layers },
            { id: 'waves', label: 'Gelombang Pendaftaran', icon: Calendar },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton type="table" rows={6} />
      ) : (
        <>
          {/* TAB 1: PROGRAM PSB & KUOTA ROMBEL */}
          {activeTab === 'programs' && (
            <div className="space-y-4">
              {/* Konteks Satuan Pendidikan Banner */}
              <div className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all ${
                isConsolidated
                  ? 'bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50 border-indigo-200/80'
                  : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-200/80'
              }`}>
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`p-2.5 rounded-xl shadow-xs text-white shrink-0 ${isConsolidated ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Konteks Aktif:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                        isConsolidated
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isConsolidated ? 'Pusat Yayasan (Data Gabungan Seluruh Satuan)' : `${activeSchoolUnit?.name || 'Satuan Terpilih'} (${activeSchoolUnit?.level || 'Unit'})`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {isConsolidated
                        ? 'Menampilkan seluruh program PSB dan kuota rombel yang dikonsolidasikan dari semua satuan pendidikan di bawah naungan Yayasan Aldepos.'
                        : `Menampilkan hanya program PSB dan kuota rombel kelas yang terdaftar khusus pada satuan pendidikan ${activeSchoolUnit?.name}.`}
                    </p>
                  </div>
                </div>

                {/* Filter Satuan Pendidikan Cepat jika di Mode Gabungan */}
                {isConsolidated && schoolUnits.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 bg-white/90 backdrop-blur-xs p-1.5 rounded-xl border border-indigo-100 self-stretch sm:self-auto justify-end">
                    <span className="text-[11px] font-semibold text-slate-500 px-1">Filter Unit:</span>
                    <button
                      type="button"
                      onClick={() => setUnitFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        unitFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Semua Satuan
                    </button>
                    {schoolUnits.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUnitFilter(String(u.id))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          String(unitFilter) === String(u.id)
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {u.level || u.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar (Total & Academic Year Selector & Create Button) */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500">
                    Ditemukan {programs.filter(p => yearFilter === 'all' || p.target_academic_year === yearFilter).length} Program PSB
                  </span>
                  <div className="pl-3 border-l border-slate-200">
                    <AcademicYearSelector
                      value={yearFilter}
                      onChange={(ny) => {
                        setYearFilter(ny);
                        if (ny !== 'all' && setSelectedAcademicYear) {
                          setSelectedAcademicYear(ny);
                          localStorage.setItem('aldepos_ppdb_selected_academic_year', ny);
                        }
                      }}
                      years={academicYears}
                      allowAll={true}
                      allLabel="Semua Tahun Ajaran"
                      variant="filter"
                      dropdownAlign="left"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    // Cari tahun ajaran yang belum memiliki program
                    const registeredYears = new Set(programs.map(p => p.target_academic_year));
                    const nextAvailableAy = academicYears.find(ay => ay.name && !registeredYears.has(ay.name));
                    const fallbackYear = nextAvailableAy ? nextAvailableAy.name : '2027/2028';
                    const defaultUnitId = !isConsolidated ? activeSchoolUnit?.id : (unitFilter !== 'all' ? unitFilter : '');

                    setEditingProgram(null);
                    setProgramForm({
                      name: `PSB Periode ${fallbackYear}`,
                      target_academic_year: fallbackYear,
                      target_academic_year_id: nextAvailableAy ? nextAvailableAy.id : null,
                      satuan_pendidikan_id: defaultUnitId ? String(defaultUnitId) : '',
                      context_type: defaultUnitId ? 'satuan' : 'yayasan',
                      start_date: '',
                      end_date: '',
                      status: 'open'
                    });
                    setProgramModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Membuka program penerimaan santri baru untuk tahun ajaran baru berikutnya"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buka PSB Tahun Ajaran Baru</span>
                </button>
              </div>

              {/* Banner Panduan Arsitektur 1 Program per Tahun Ajaran */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-blue-50/40 border border-emerald-200/80 rounded-2xl flex items-start gap-3 text-slate-700 shadow-2xs">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-950">
                    Tata Kelola PPDB Pesantren IBS Aldepos:
                  </p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Setiap tahun ajaran mewadahi <strong>1 Program PSB Induk</strong>. Anda tidak perlu menambah program baru di tahun ajaran yang sama. Untuk tahapan pendaftaran bertahap (Early Bird, Reguler, Afirmasi), gunakan tab <strong>Gelombang Pendaftaran</strong>, dan atur alokasi daya tampung santri melalui <strong>Atur Kuota Rombel</strong>.
                  </p>
                </div>
              </div>

              {/* Grid Kartu Program */}
              {programs.filter(prog => yearFilter === 'all' || prog.target_academic_year === yearFilter).length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="Tidak Ada Program PSB Ditemukan"
                  description={
                    isConsolidated
                      ? "Belum ada program PSB yang terdaftar di tahun ajaran atau satuan pendidikan terpilih."
                      : `Belum ada program PSB yang terdaftar untuk ${activeSchoolUnit?.name || 'satuan pendidikan terpilih'}.`
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {programs
                    .filter(prog => yearFilter === 'all' || prog.target_academic_year === yearFilter)
                    .map(prog => (
                    <div key={prog.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              prog.status === 'open' || prog.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : prog.status === 'closed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              {prog.status === 'open' || prog.status === 'active' ? 'Buka' : prog.status === 'closed' ? 'Tutup' : 'Draft'}
                            </span>

                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              prog.context_type === 'yayasan' || prog.is_consolidated
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-teal-50 text-teal-700 border border-teal-200'
                            }`}>
                              {prog.unit_label || 'Satuan Pendidikan'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const matchAy = academicYears.find(ay => ay.name === prog.target_academic_year || ay.id === prog.target_academic_year_id);
                                setEditingProgram(prog);
                                setProgramForm({
                                  name: prog.name,
                                  target_academic_year: prog.target_academic_year,
                                  target_academic_year_id: prog.target_academic_year_id || (matchAy ? matchAy.id : null),
                                  satuan_pendidikan_id: prog.satuan_pendidikan_id ? String(prog.satuan_pendidikan_id) : (prog.associated_unit_ids?.[0] ? String(prog.associated_unit_ids[0]) : ''),
                                  context_type: prog.context_type || (prog.is_consolidated ? 'yayasan' : 'satuan'),
                                  start_date: prog.start_date || '',
                                  end_date: prog.end_date || '',
                                  status: prog.status
                                });
                                setProgramModalOpen(true);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-emerald-700 transition-colors"
                              title="Edit Program"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProgram(prog)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                              title="Hapus Program"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{prog.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">Tahun Ajaran Target: <span className="font-semibold text-slate-700">{prog.target_academic_year}</span></p>

                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 rounded-lg bg-slate-50">
                            <span className="text-[10px] text-slate-400">Total Kuota</span>
                            <div className="font-extrabold text-slate-800 mt-0.5">{prog.total_quota || 0}</div>
                          </div>
                          <div className="p-2 rounded-lg bg-blue-50">
                            <span className="text-[10px] text-blue-500 font-semibold">Putra (L)</span>
                            <div className="font-extrabold text-blue-900 mt-0.5">{prog.total_quota_male || 0}</div>
                          </div>
                          <div className="p-2 rounded-lg bg-pink-50">
                            <span className="text-[10px] text-pink-500 font-semibold">Putri (P)</span>
                            <div className="font-extrabold text-pink-900 mt-0.5">{prog.total_quota_female || 0}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">{prog.waves_count} Gelombang • {prog.registrants_count} Pendaftar</span>
                        <button
                          type="button"
                          onClick={() => openQuotaModal(prog)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Atur Kuota Rombel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GELOMBANG PENDAFTARAN */}
          {activeTab === 'waves' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Gelombang Pendaftaran (Waves)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Atur biaya pendaftaran formulir dan skema biaya masuk per gelombang</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingWave(null);
                    setWaveForm({
                      psb_process_id: programs[0]?.id || '',
                      name: '',
                      wave_number: (waves.length || 0) + 1,
                      start_date: '',
                      end_date: '',
                      description: '',
                      is_active: 1
                    });
                    setWaveModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Gelombang</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                      <th className="pb-3">Gel.</th>
                      <th className="pb-3">Nama Gelombang</th>
                      <th className="pb-3">Program PSB</th>
                      <th className="pb-3">Periode</th>
                      <th className="pb-3">Keterangan</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {waves.map(wave => (
                      <tr key={wave.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-bold text-slate-700">{wave.wave_number}</td>
                        <td className="py-3 font-semibold text-slate-900">{wave.name}</td>
                        <td className="py-3">
                          <div className="font-semibold text-slate-800">
                            {wave.program_name || programs.find(p => p.id === wave.psb_process_id)?.name || '-'}
                          </div>
                          {wave.target_academic_year && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              T.A. {wave.target_academic_year}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-500">{wave.start_date || '-'} s.d {wave.end_date || '-'}</td>
                        <td className="py-3 text-slate-600 max-w-xs truncate">{wave.description || '-'}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            wave.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {wave.is_active ? 'Aktif' : 'Tutup'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingWave(wave);
                                setWaveForm({
                                  psb_process_id: wave.psb_process_id,
                                  name: wave.name,
                                  wave_number: wave.wave_number,
                                  start_date: wave.start_date || '',
                                  end_date: wave.end_date || '',
                                  description: wave.description || '',
                                  is_active: wave.is_active ? 1 : 0
                                });
                                setWaveModalOpen(true);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-emerald-700 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWave(wave.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
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
            </div>
          )}

        </>
      )}

      {/* MODAL: Buka / Edit Program PSB */}
      <Modal
        isOpen={programModalOpen}
        onClose={() => setProgramModalOpen(false)}
        title={editingProgram ? 'Edit Program PSB' : 'Buka PSB Tahun Ajaran Baru'}
        subtitle={
          editingProgram
            ? 'Perbarui informasi dan periode tanggal program PSB'
            : 'Membuka program penerimaan santri baru untuk periode tahun ajaran baru'
        }
        size="lg"
      >
        <form onSubmit={handleSaveProgram} className="space-y-4 text-xs pb-1">
          {/* Peringatan Konflik Tahun Ajaran (Jika sudah terdaftar) */}
          {selectedYearConflict && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-amber-950">
                  Tahun Ajaran {programForm.target_academic_year} Sudah Memiliki Program PSB!
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Program <strong>"{selectedYearConflict.name}"</strong> sudah terdaftar untuk tahun ajaran ini. Sesuai tata kelola sistem, setiap tahun ajaran hanya diperbolehkan memiliki 1 program induk. Silakan pilih tahun ajaran baru berikutnya atau tutup form ini untuk mengelola program yang telah ada.
                </p>
              </div>
            </div>
          )}

          {/* Konteks Satuan Pendidikan Target */}
          {isConsolidated ? (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Konteks Satuan Pendidikan <span className="text-rose-500">*</span>
              </label>
              <select
                value={programForm.satuan_pendidikan_id || 'all'}
                onChange={e => {
                  const val = e.target.value;
                  setProgramForm(prev => ({
                    ...prev,
                    satuan_pendidikan_id: val === 'all' ? '' : val,
                    context_type: val === 'all' ? 'yayasan' : 'satuan'
                  }));
                }}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition shadow-2xs cursor-pointer font-medium"
              >
                <option value="all">Pusat Yayasan (Gabungan Seluruh Satuan)</option>
                {schoolUnits.map(u => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name} ({u.level || 'Satuan'})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Pilih apakah program berlaku gabungan seluruh satuan pendidikan atau khusus untuk satu unit sekolah
              </span>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Satuan Pendidikan Terpilih</span>
                <span className="font-bold text-emerald-950 text-sm">{activeSchoolUnit?.name} ({activeSchoolUnit?.level || 'Unit'})</span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full">
                Terkunci Sesuai Konteks
              </span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nama Program PSB <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={programForm.name}
              onChange={e => setProgramForm({ ...programForm, name: e.target.value })}
              placeholder="Contoh: PSB Periode 2027/2028 Terpadu"
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition shadow-2xs"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Nama resmi program penerimaan santri/siswa baru
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tahun Ajaran Target <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                options={academicYearOptions}
                value={programForm.target_academic_year}
                onChange={val => {
                  const match = academicYears.find(ay => ay.name === val || String(ay.id) === String(val));
                  setProgramForm(prev => ({
                    ...prev,
                    target_academic_year: val,
                    target_academic_year_id: match ? match.id : null
                  }));
                }}
                placeholder="Pilih Tahun Ajaran"
                accentColor="emerald"
                searchPlaceholder="Cari tahun ajaran (Modul Akademik)..."
                allowClear={false}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Merujuk ke data Tahun Ajaran di Modul Akademik
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Status Publikasi Program
              </label>
              <SearchableSelect
                options={statusOptions}
                value={programForm.status}
                onChange={val => setProgramForm(prev => ({ ...prev, status: val }))}
                placeholder="Pilih Status"
                accentColor="emerald"
                allowClear={false}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Buka/tutup akses pendaftaran santri baru
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tanggal Mulai Pembukaan
              </label>
              <DatePickerField
                value={programForm.start_date}
                onChange={(isoStr) => setProgramForm(prev => ({ ...prev, start_date: isoStr || '' }))}
                placeholder="Pilih Tanggal Mulai"
                className="w-full"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Format: DD/MM/YYYY (Kalender)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tanggal Batas Selesai
              </label>
              <DatePickerField
                value={programForm.end_date}
                onChange={(isoStr) => setProgramForm(prev => ({ ...prev, end_date: isoStr || '' }))}
                placeholder="Pilih Tanggal Selesai"
                className="w-full"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Batas akhir seluruh tahapan program PSB
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setProgramModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={Boolean(selectedYearConflict)}
              className={`px-5 py-2 rounded-xl text-white font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                selectedYearConflict
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer hover:shadow'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{editingProgram ? 'Simpan Perubahan' : 'Buka Program Tahun Baru'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Konfigurasi Kuota Tingkat & Rombel (Model Hybrid Gender L/P) */}
      <Modal
        isOpen={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        title={`Konfigurasi Kuota Penerimaan Santri - ${quotaProgram?.name || ''}`}
        subtitle={`Tahun Ajaran Target: ${quotaProgram?.target_academic_year || ''} • Penentuan alokasi kuota per tingkat kelas dan gender (Ikhwan & Akhwat)`}
        size="wide"
      >
        <div className="space-y-4 text-xs">
          {/* Info Banner Edukatif */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-blue-950">
                Alur Penetapan Kuota PSB Pesantren Aldepos (Model Hybrid):
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Di tahap perencanaan ini, kuota ditetapkan per <strong>Tingkat Kelas Masuk</strong> & <strong>Gender (Putra/Putri)</strong> untuk menyesuaikan kapasitas asrama dan estimasi rombel. Penempatan santri ke <em>nama rombel definitif</em> dapat dilakukan nanti saat santri dinyatakan lulus dan melunasi biaya di menu <strong>Enrollment</strong>.
              </p>
            </div>
          </div>

          {/* Action Tambah Baris */}
          <div className="flex items-center justify-between">
            <div className="text-slate-600 font-medium">
              Daftar Alokasi Kuota Tingkat Kelas ({quotasData.length} baris):
            </div>
            <button
              type="button"
              onClick={handleAddQuotaRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors cursor-pointer border border-emerald-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tingkat / Unit</span>
            </button>
          </div>

          {/* Tabel Kuota Interaktif */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Satuan Pendidikan</th>
                  <th className="p-2.5">Tingkat Kelas</th>
                  <th className="p-2.5 text-center">Rencana Rombel</th>
                  <th className="p-2.5 text-center text-blue-700 bg-blue-50/50">
                    <span className="flex items-center justify-center gap-1">
                      <span>👦 Putra (L)</span>
                    </span>
                  </th>
                  <th className="p-2.5 text-center text-pink-700 bg-pink-50/50">
                    <span className="flex items-center justify-center gap-1">
                      <span>👧 Putri (P)</span>
                    </span>
                  </th>
                  <th className="p-2.5 text-center font-bold text-slate-800">Total Kuota</th>
                  <th className="p-2.5">Rombel Fisik (Opsional)</th>
                  <th className="p-2.5 text-center w-12">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {quotasData.map((q, idx) => {
                  const unitOptions = quotaProgram?.units?.length > 0 
                    ? quotaProgram.units 
                    : (quotaProgram?.associated_unit_ids?.length > 0
                      ? schoolUnits.filter(u => quotaProgram.associated_unit_ids.includes(Number(u.id)))
                      : schoolUnits);

                  const gradeOptions = getGradeOptionsForUnit(q.satuan_pendidikan_id);
                  const relevantClasses = classGroups.filter(cg => Number(cg.satuan_pendidikan_id) === Number(q.satuan_pendidikan_id));
                  const avgPerClass = q.planned_classes_count > 0 ? Math.round(q.total_quota / q.planned_classes_count) : q.total_quota;

                  return (
                    <tr key={q._key || idx} className="hover:bg-slate-50/80 transition-colors">
                      {/* Satuan Pendidikan */}
                      <td className="p-2.5">
                        {unitOptions.length > 1 ? (
                          <select
                            value={q.satuan_pendidikan_id}
                            onChange={e => {
                              const newUnitId = Number(e.target.value);
                              const newGrades = getGradeOptionsForUnit(newUnitId);
                              const updated = [...quotasData];
                              updated[idx].satuan_pendidikan_id = newUnitId;
                              updated[idx].grade_level = newGrades[0]?.value || '7';
                              updated[idx].class_group_id = '';
                              setQuotasData(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                          >
                            {unitOptions.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.level})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-semibold text-slate-800">
                            {unitOptions[0]?.name || `Unit #${q.satuan_pendidikan_id}`}
                          </span>
                        )}
                      </td>

                      {/* Tingkat Kelas */}
                      <td className="p-2.5">
                        <select
                          value={q.grade_level}
                          onChange={e => {
                            const updated = [...quotasData];
                            updated[idx].grade_level = e.target.value;
                            setQuotasData(updated);
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                        >
                          {gradeOptions.map(g => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Rencana Jumlah Rombel */}
                      <td className="p-2.5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={q.planned_classes_count}
                            onChange={e => {
                              const val = Math.max(1, Number(e.target.value) || 1);
                              const updated = [...quotasData];
                              updated[idx].planned_classes_count = val;
                              setQuotasData(updated);
                            }}
                            className="w-14 px-2 py-1 rounded-lg border border-slate-200 text-center font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                          />
                          <span className="text-[10px] text-slate-400 font-medium">kelas</span>
                        </div>
                      </td>

                      {/* Kuota Putra (L) */}
                      <td className="p-2.5 text-center bg-blue-50/20">
                        <input
                          type="number"
                          min="0"
                          value={q.quota_male}
                          onChange={e => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            const updated = [...quotasData];
                            updated[idx].quota_male = val;
                            updated[idx].total_quota = val + Number(updated[idx].quota_female || 0);
                            setQuotasData(updated);
                          }}
                          className="w-16 px-2 py-1 rounded-lg border border-blue-300 bg-blue-50/60 text-center font-extrabold text-blue-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs"
                        />
                      </td>

                      {/* Kuota Putri (P) */}
                      <td className="p-2.5 text-center bg-pink-50/20">
                        <input
                          type="number"
                          min="0"
                          value={q.quota_female}
                          onChange={e => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            const updated = [...quotasData];
                            updated[idx].quota_female = val;
                            updated[idx].total_quota = Number(updated[idx].quota_male || 0) + val;
                            setQuotasData(updated);
                          }}
                          className="w-16 px-2 py-1 rounded-lg border border-pink-300 bg-pink-50/60 text-center font-extrabold text-pink-900 focus:outline-hidden focus:ring-1 focus:ring-pink-500 shadow-2xs"
                        />
                      </td>

                      {/* Total Kuota */}
                      <td className="p-2.5 text-center">
                        <div className="font-extrabold text-sm text-emerald-800">
                          {q.total_quota}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          ~{avgPerClass}/rombel
                        </span>
                      </td>

                      {/* Rombel Fisik (Opsional) */}
                      <td className="p-2.5">
                        <select
                          value={q.class_group_id || ''}
                          onChange={e => {
                            const updated = [...quotasData];
                            updated[idx].class_group_id = e.target.value;
                            setQuotasData(updated);
                          }}
                          className="w-full max-w-[180px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-600 focus:outline-hidden focus:border-emerald-500"
                        >
                          <option value="">- Ditentukan saat Enrollment -</option>
                          {relevantClasses.map(cg => (
                            <option key={cg.id} value={cg.id}>
                              {cg.name} (Kapasitas: {cg.capacity || 30})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Aksi Hapus */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveQuotaRow(idx)}
                          disabled={quotasData.length <= 1}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            quotasData.length <= 1
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Hapus baris kuota ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Ringkasan Akumulatif Kuota */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <span className="text-[10px] text-slate-500 font-medium">Total Daya Tampung</span>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">
                {quotasData.reduce((acc, q) => acc + (Number(q.total_quota) || 0), 0)} <span className="text-xs font-normal text-slate-500">Santri</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-center">
              <span className="text-[10px] text-blue-700 font-medium">👦 Kuota Putra (Ikhwan)</span>
              <div className="text-base font-extrabold text-blue-900 mt-0.5">
                {quotasData.reduce((acc, q) => acc + (Number(q.quota_male) || 0), 0)} <span className="text-xs font-normal text-blue-600">Santri</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-pink-50/80 border border-pink-200/80 text-center">
              <span className="text-[10px] text-pink-700 font-medium">👧 Kuota Putri (Akhwat)</span>
              <div className="text-base font-extrabold text-pink-900 mt-0.5">
                {quotasData.reduce((acc, q) => acc + (Number(q.quota_female) || 0), 0)} <span className="text-xs font-normal text-pink-600">Santri</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-center">
              <span className="text-[10px] text-emerald-700 font-medium">Rencana Total Rombel</span>
              <div className="text-base font-extrabold text-emerald-900 mt-0.5">
                {quotasData.reduce((acc, q) => acc + (Number(q.planned_classes_count) || 0), 0)} <span className="text-xs font-normal text-emerald-600">Kelas</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setQuotaModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveQuotas}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm hover:shadow cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Konfigurasi Kuota</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Tambah/Edit Gelombang */}
      <Modal
        isOpen={waveModalOpen}
        onClose={() => setWaveModalOpen(false)}
        title={editingWave ? 'Edit Gelombang Pendaftaran' : 'Tambah Gelombang Baru'}
        subtitle="Atur jalur/gelombang pendaftaran, periode tanggal pendaftaran, dan keterangan."
        size="lg"
      >
        <form onSubmit={handleSaveWave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Program PSB <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              options={programs.map(p => ({
                value: p.id,
                label: p.name,
                sublabel: `T.A. ${p.target_academic_year}`
              }))}
              value={waveForm.psb_process_id}
              onChange={val => setWaveForm(prev => ({ ...prev, psb_process_id: val }))}
              placeholder="Pilih Program PSB"
              accentColor="emerald"
              allowClear={false}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nama Gelombang <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={waveForm.name}
              onChange={e => setWaveForm({ ...waveForm, name: e.target.value })}
              placeholder="Contoh: Gelombang 1 - Reguler"
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tanggal Buka Gelombang
              </label>
              <DatePickerField
                value={waveForm.start_date}
                onChange={(isoStr) => setWaveForm(prev => ({ ...prev, start_date: isoStr || '' }))}
                placeholder="Pilih Tanggal Buka"
                className="w-full"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Format: DD/MM/YYYY (Kalender)
              </span>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tanggal Tutup Gelombang
              </label>
              <DatePickerField
                value={waveForm.end_date}
                onChange={(isoStr) => setWaveForm(prev => ({ ...prev, end_date: isoStr || '' }))}
                placeholder="Pilih Tanggal Tutup"
                className="w-full"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Format: DD/MM/YYYY (Kalender)
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Keterangan Gelombang
            </label>
            <textarea
              rows={3}
              value={waveForm.description}
              onChange={e => setWaveForm({ ...waveForm, description: e.target.value })}
              placeholder="Catatan atau keterangan khusus gelombang pendaftaran (opsional)..."
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition shadow-2xs"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Skema biaya keuangan pendaftaran akan ditetapkan per pendaftar pada tahap berikutnya.
            </span>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setWaveModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm hover:shadow cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Gelombang</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
