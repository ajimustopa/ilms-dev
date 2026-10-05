import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import LoadingSkeleton from '../../../shared/components/LoadingSkeleton';
import EmptyState from '../../../shared/components/EmptyState';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField, { isoToDmy } from '../../../shared/components/DatePickerField';
import {
  UserPlus,
  Eye,
  FileCheck2,
  Wallet,
  KeyRound,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Receipt,
  Search,
  Filter,
  Check,
  X,
  CalendarDays,
  School,
  Layers,
  Sparkles,
  Building2,
  User,
  GraduationCap,
  Clock,
  ExternalLink,
  CreditCard,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import AcademicYearSelector from '../components/AcademicYearSelector';
import {
  PpdbStageBadge,
  PpdbStageProgressBar,
  PpdbStageDetailTimeline
} from '../components/PpdbStageStepper';

export default function Registrants() {
  const { activeSchoolUnit, schoolUnits: authSchoolUnits } = useAuth();
  const outletContext = useOutletContext() || {};
  const selectedAcademicYear = outletContext.selectedAcademicYear || localStorage.getItem('aldepos_ppdb_selected_academic_year') || '2026/2027';
  const setSelectedAcademicYear = outletContext.setSelectedAcademicYear;
  const academicYears = outletContext.academicYears || [];
  const isGabungan = outletContext.isGabungan ?? (!activeSchoolUnit || activeSchoolUnit.id === 'all' || activeSchoolUnit.is_foundation);

  const [loading, setLoading] = useState(true);
  const [registrants, setRegistrants] = useState([]);
  const [waves, setWaves] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [schoolUnitsList, setSchoolUnitsList] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [waveFilter, setWaveFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(selectedAcademicYear);

  // Sync yearFilter when global selectedAcademicYear changes
  useEffect(() => {
    if (selectedAcademicYear) {
      setYearFilter(selectedAcademicYear);
    }
  }, [selectedAcademicYear]);

  // Listen to global academic year changes broadcast
  useEffect(() => {
    const handleYearChange = (e) => {
      if (e.detail) {
        setYearFilter(e.detail);
      }
    };
    window.addEventListener('aldepos_ppdb_academic_year_changed', handleYearChange);
    return () => window.removeEventListener('aldepos_ppdb_academic_year_changed', handleYearChange);
  }, []);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRegistrant, setSelectedRegistrant] = useState(null);
  const [detailTab, setDetailTab] = useState('stages'); // 'stages' | 'bio' | 'docs' | 'bill'
  const [isDeclaring, setIsDeclaring] = useState(false);

  // Registrant Form State
  const [regForm, setRegForm] = useState({
    satuan_pendidikan_id: '',
    psb_process_id: '',
    psb_group_id: '',
    full_name: '',
    gender: 'L',
    nisn: '',
    birth_place: '',
    birth_date: '',
    address: '',
    previous_school_name: '',
    previous_school_address: '',
    father_name: '',
    mother_name: '',
    parent_contact: ''
  });

  // Cashier Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    cash_account_id: '',
    amount_paid: 350000,
    payment_method: 'cash',
    notes: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  // Document Upload State
  const [docType, setDocType] = useState('kk');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docNotes, setDocNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [regRes, wavesRes, progsRes, cashRes, unitsRes] = await Promise.all([
        api.get('/psb/registrants', {
          params: {
            search: search || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            psb_group_id: waveFilter !== 'all' ? waveFilter : undefined,
            target_academic_year: yearFilter !== 'all' ? yearFilter : undefined
          }
        }),
        api.get('/psb/waves'),
        api.get('/psb/programs'),
        api.get('/psb/lookups/cash-accounts'),
        api.get('/core/school-units').catch(() => ({ data: { data: [] } }))
      ]);

      const rawReg = regRes.data?.data;
      const registrantsList = Array.isArray(rawReg) ? rawReg : (rawReg?.items || []);
      setRegistrants(registrantsList);
      setWaves(wavesRes.data?.data || []);
      setPrograms(progsRes.data?.data || []);
      setCashAccounts(cashRes.data?.data || []);

      const fetchedUnits = unitsRes.data?.data?.items || (Array.isArray(unitsRes.data?.data) ? unitsRes.data.data : []);
      if (fetchedUnits.length > 0) {
        setSchoolUnitsList(fetchedUnits);
      } else if (authSchoolUnits && authSchoolUnits.length > 0) {
        setSchoolUnitsList(authSchoolUnits);
      }
    } catch (err) {
      console.error('Gagal memuat data pendaftar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSchoolUnit, statusFilter, waveFilter, yearFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  // Dropdown Options Helpers
  const schoolUnitOptions = useMemo(() => {
    return schoolUnitsList.map(unit => ({
      value: unit.id,
      label: unit.name,
      badge: unit.level?.toUpperCase(),
      badgeClass: 'bg-indigo-100 text-indigo-800 font-bold',
      sublabel: unit.address || `Satuan Pendidikan ${unit.level}`
    }));
  }, [schoolUnitsList]);

  const filteredProgramOptions = useMemo(() => {
    let filtered = programs;
    // Jika konteks gabungan dan user memilih unit sekolah di form
    if (isGabungan && regForm.satuan_pendidikan_id) {
      const matchUnit = filtered.filter(p => !p.satuan_pendidikan_id || Number(p.satuan_pendidikan_id) === Number(regForm.satuan_pendidikan_id));
      if (matchUnit.length > 0) filtered = matchUnit;
    }
    // Filter sesuai tahun ajaran terkait
    const targetYear = yearFilter !== 'all' ? yearFilter : selectedAcademicYear;
    if (targetYear) {
      const matchYear = filtered.filter(p => p.target_academic_year === targetYear);
      if (matchYear.length > 0) filtered = matchYear;
    }
    return filtered.map(p => ({
      value: p.id,
      label: p.name,
      badge: p.target_academic_year ? `TA ${p.target_academic_year}` : undefined,
      badgeClass: 'bg-emerald-100 text-emerald-800 font-bold',
      sublabel: p.description ? p.description.slice(0, 50) : `Status: ${p.status}`
    }));
  }, [programs, isGabungan, regForm.satuan_pendidikan_id, yearFilter, selectedAcademicYear]);

  const filteredWaveOptions = useMemo(() => {
    let filtered = waves;
    if (regForm.psb_process_id) {
      const progWaves = filtered.filter(w => Number(w.psb_process_id) === Number(regForm.psb_process_id));
      if (progWaves.length > 0) filtered = progWaves;
    }
    return filtered.map(w => {
      const fee = Number(w.registration_fee || 0);
      return {
        value: w.id,
        label: w.name,
        badge: `Gelombang ${w.wave_number || 1}`,
        badgeClass: 'bg-teal-100 text-teal-800 font-bold',
        sublabel: fee > 0 ? `Biaya Formulir: Rp ${fee.toLocaleString('id-ID')}` : (w.description || 'Gelombang pendaftaran')
      };
    });
  }, [waves, regForm.psb_process_id]);

  const genderOptions = [
    { value: 'L', label: 'Laki-laki (Ikhwan / Putra)', badge: 'L', badgeClass: 'bg-blue-100 text-blue-700 font-bold', sublabel: 'Santri Putra' },
    { value: 'P', label: 'Perempuan (Akhwat / Putri)', badge: 'P', badgeClass: 'bg-pink-100 text-pink-700 font-bold', sublabel: 'Santri Putri' }
  ];

  const academicYearsList = academicYears.length > 0
    ? academicYears
    : [
        { id: 1, name: '2026/2027', is_active: true },
        { id: 2, name: '2025/2026', is_active: false },
        { id: 3, name: '2024/2025', is_active: false }
      ];

  // Submit Registrant Form
  const handleSaveRegistrant = async (e) => {
    e.preventDefault();
    try {
      const targetUnitId = isGabungan
        ? (regForm.satuan_pendidikan_id || schoolUnitsList[0]?.id || 1)
        : (activeSchoolUnit?.id || 1);

      if (!regForm.full_name?.trim()) return alert('Nama lengkap calon santri wajib diisi');
      if (!regForm.parent_contact?.trim()) return alert('Nomor kontak orang tua / WhatsApp wajib diisi');

      const payload = {
        ...regForm,
        satuan_pendidikan_id: Number(targetUnitId),
        psb_process_id: Number(regForm.psb_process_id || filteredProgramOptions[0]?.value || programs[0]?.id),
        psb_group_id: regForm.psb_group_id ? Number(regForm.psb_group_id) : undefined
      };

      const res = await api.post('/psb/registrants', payload);
      alert(`Calon murid berhasil didaftarkan!\nNomor Registrasi: ${res.data?.data?.registration_number}`);
      setFormModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mendaftarkan calon murid');
    }
  };

  // Open Detail Modal
  const openDetail = async (reg) => {
    try {
      const res = await api.get(`/psb/registrants/${reg.id}`);
      setSelectedRegistrant(res.data?.data);
      setDetailTab('stages');
      setPaymentSuccess(null);
      setDetailModalOpen(true);
    } catch (err) {
      alert('Gagal memuat detail calon murid');
    }
  };

  // Declare as Prospective Student (Calon Siswa Siap Rombel)
  const handleDeclareProspective = async () => {
    if (!selectedRegistrant) return;
    if (!confirm(`Nyatakan ${selectedRegistrant.full_name} resmi sebagai Calon Siswa (siap dimasukkan ke dalam rombel kelas)?`)) return;
    try {
      setIsDeclaring(true);
      await api.post(`/psb/registrants/${selectedRegistrant.id}/declare-prospective`, {
        notes: 'Dinyatakan resmi sebagai Calon Siswa definitif (Siap dimasukkan ke dalam rombel kelas)'
      });
      alert('Calon santri berhasil dinyatakan sebagai Calon Siswa definitif!');
      await openDetail(selectedRegistrant);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menetapkan calon siswa');
    } finally {
      setIsDeclaring(false);
    }
  };

  // Create Portal Account for Student
  const handleCreateAccount = async () => {
    if (!selectedRegistrant) return;
    try {
      const res = await api.post(`/psb/registrants/${selectedRegistrant.id}/create-account`);
      alert(`Akun portal santri berhasil dibuat!\nUsername: ${res.data?.data?.username}\nPassword Sementara: ${res.data?.data?.temporary_password}`);
      openDetail(selectedRegistrant);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat akun');
    }
  };

  // Upload Document
  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!docFileUrl) return alert('Masukkan URL dokumen berkas');
    try {
      await api.post(`/psb/registrants/${selectedRegistrant.id}/documents`, {
        document_type: docType,
        document_name: docType.toUpperCase(),
        file_url: docFileUrl,
        notes: docNotes
      });
      setDocFileUrl('');
      setDocNotes('');
      openDetail(selectedRegistrant);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal upload berkas');
    }
  };

  // Verify Document
  const handleVerifyDoc = async (docId, status) => {
    try {
      await api.put(`/psb/registrants/${selectedRegistrant.id}/documents/${docId}/verify`, {
        verification_status: status
      });
      openDetail(selectedRegistrant);
    } catch (err) {
      alert('Gagal memverifikasi dokumen');
    }
  };

  // Pay Registration Bill
  const handlePayRegistrationBill = async (e) => {
    e.preventDefault();
    try {
      setPaymentLoading(true);
      const res = await api.post(`/psb/registrants/${selectedRegistrant.id}/pay-bill`, {
        cash_account_id: paymentForm.cash_account_id || cashAccounts[0]?.id || 1,
        amount_paid: Number(paymentForm.amount_paid),
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes
      });
      setPaymentSuccess(res.data?.data);
      openDetail(selectedRegistrant);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat pembayaran');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Data Calon Santri & Pendaftar PSB
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              TA {yearFilter !== 'all' ? yearFilter : 'Semua'}
            </span>
            {isGabungan && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                Gabungan Yayasan
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan formulir pendaftaran, verifikasi berkas digital, kasir formulir & akun akses santri
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const initialUnitId = isGabungan
              ? (schoolUnitsList[0]?.id || '')
              : (activeSchoolUnit?.id || '');
            
            // Program yang cocok
            const targetYear = yearFilter !== 'all' ? yearFilter : selectedAcademicYear;
            const relevantProgs = programs.filter(p => {
              const matchYear = !targetYear || p.target_academic_year === targetYear;
              const matchUnit = !initialUnitId || !p.satuan_pendidikan_id || Number(p.satuan_pendidikan_id) === Number(initialUnitId);
              return matchYear && matchUnit;
            });
            const defProg = relevantProgs[0] || programs[0];
            const relevantWaves = waves.filter(w => !defProg?.id || Number(w.psb_process_id) === Number(defProg.id));
            const defWave = relevantWaves[0] || waves[0];

            setRegForm({
              satuan_pendidikan_id: initialUnitId,
              psb_process_id: defProg?.id || '',
              psb_group_id: defWave?.id || '',
              full_name: '',
              gender: 'L',
              nisn: '',
              birth_place: '',
              birth_date: '',
              address: '',
              previous_school_name: '',
              previous_school_address: '',
              father_name: '',
              mother_name: '',
              parent_contact: ''
            });
            setFormModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Daftarkan Calon Santri</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-[240px] max-w-md relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, NISN, no registrasi..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Dropdown Tahun Ajaran */}
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
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
          >
            <option value="all">Semua Tahapan PPDB</option>
            <option value="registered">Tahap 1: Registrasi Baru</option>
            <option value="registration_fee_paid">Tahap 2: Biaya Formulir Lunas</option>
            <option value="document_verified">Tahap 2: Berkas Terverifikasi</option>
            <option value="tested">Tahap 3: Testing / Selesai Ujian</option>
            <option value="accepted">Tahap 4: Dinyatakan Lulus</option>
            <option value="waitlisted">Tahap 4: Cadangan</option>
            <option value="rejected">Tahap 4: Tidak Lulus</option>
            <option value="enrolled">Tahap 5: Uang Pangkal Lunas</option>
            <option value="prospective_student">Tahap 6: Calon Siswa (Siap Rombel)</option>
            <option value="placed">Tahap 7: Siswa Aktif (Rombel)</option>
            <option value="withdrawn">Mengundurkan Diri</option>
          </select>

          <select
            value={waveFilter}
            onChange={e => setWaveFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            <option value="all">Semua Gelombang</option>
            {waves.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <LoadingSkeleton type="table" rows={8} />
      ) : registrants.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">No. Registrasi</th>
                  <th className="py-3 px-4">Nama Lengkap Santri</th>
                  <th className="py-3 px-3 text-center">L/P</th>
                  <th className="py-3 px-4">NISN</th>
                  <th className="py-3 px-4">Asal Sekolah</th>
                  <th className="py-3 px-4">Kontak Orang Tua</th>
                  <th className="py-3 px-4">Tahapan PPDB</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrants.map(reg => (
                  <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">{reg.registration_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{reg.full_name}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        reg.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {reg.gender}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{reg.nisn || '-'}</td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]">{reg.previous_school_name || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{reg.parent_contact || '-'}</td>
                    <td className="py-3 px-4">
                      <PpdbStageBadge stageInfo={reg.stage_info} status={reg.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(reg)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold text-xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail & Alur</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="Tidak Ada Calon Santri" description="Tidak ada calon santri yang sesuai kriteria pencarian atau filter saat ini." />
      )}

      {/* MODAL: Formulir Pendaftaran Calon Santri Baru */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Formulir Pendaftaran Calon Santri Baru"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveRegistrant} className="space-y-4 text-xs">
          {/* Header Info Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">Pendaftaran Santri Baru {yearFilter !== 'all' ? `TA ${yearFilter}` : ''}</div>
                <div className="text-[11px] text-slate-500">Nomor registrasi unik akan otomatis dibuatkan oleh sistem.</div>
              </div>
            </div>
            {isGabungan && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold uppercase shrink-0">
                Mode Gabungan Yayasan
              </span>
            )}
          </div>

          {/* Section 1: Konteks & Jalur Pendaftaran */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Konteks Satuan & Program PSB</span>
            </div>

            {/* Pilihan Satuan Pendidikan jika konteks Gabungan */}
            {isGabungan && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-indigo-900">
                    <School className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Satuan Pendidikan Terkait *</span>
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                    Wajib Dipilih untuk Konteks Gabungan
                  </span>
                </label>
                <SearchableSelect
                  options={schoolUnitOptions}
                  value={regForm.satuan_pendidikan_id}
                  onChange={(val) => {
                    const newUnitId = val;
                    const targetYear = yearFilter !== 'all' ? yearFilter : selectedAcademicYear;
                    const relevantProgs = programs.filter(p => {
                      const matchYear = !targetYear || p.target_academic_year === targetYear;
                      const matchUnit = !newUnitId || !p.satuan_pendidikan_id || Number(p.satuan_pendidikan_id) === Number(newUnitId);
                      return matchYear && matchUnit;
                    });
                    const newProgId = relevantProgs[0]?.id || programs[0]?.id || '';
                    const relevantWaves = waves.filter(w => !newProgId || Number(w.psb_process_id) === Number(newProgId));
                    setRegForm(prev => ({
                      ...prev,
                      satuan_pendidikan_id: newUnitId,
                      psb_process_id: newProgId,
                      psb_group_id: relevantWaves[0]?.id || waves[0]?.id || ''
                    }));
                  }}
                  placeholder="-- Pilih Satuan Pendidikan --"
                  searchPlaceholder="Ketik untuk mencari unit sekolah..."
                  accentColor="indigo"
                  allowClear={false}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Program PSB Target *</span>
                </label>
                <SearchableSelect
                  options={filteredProgramOptions}
                  value={regForm.psb_process_id}
                  onChange={(val) => {
                    const newProgId = val;
                    const relevantWaves = waves.filter(w => !newProgId || Number(w.psb_process_id) === Number(newProgId));
                    setRegForm(prev => ({
                      ...prev,
                      psb_process_id: newProgId,
                      psb_group_id: relevantWaves[0]?.id || waves[0]?.id || ''
                    }));
                  }}
                  placeholder="-- Pilih Program PSB --"
                  searchPlaceholder="Ketik untuk mencari program..."
                  accentColor="emerald"
                  allowClear={false}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-teal-600" />
                  <span>Gelombang Pendaftaran *</span>
                </label>
                <SearchableSelect
                  options={filteredWaveOptions}
                  value={regForm.psb_group_id}
                  onChange={(val) => setRegForm(prev => ({ ...prev, psb_group_id: val }))}
                  placeholder="-- Pilih Gelombang --"
                  searchPlaceholder="Ketik untuk mencari gelombang..."
                  accentColor="emerald"
                  allowClear={false}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Biodata Calon Santri */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Biodata Calon Santri</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Santri *</label>
                <input
                  type="text"
                  required
                  value={regForm.full_name}
                  onChange={e => setRegForm({ ...regForm, full_name: e.target.value })}
                  placeholder="Nama lengkap calon santri sesuai akta"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin *</label>
                <SearchableSelect
                  options={genderOptions}
                  value={regForm.gender}
                  onChange={(val) => setRegForm({ ...regForm, gender: val })}
                  placeholder="Pilih Jenis Kelamin..."
                  accentColor="emerald"
                  allowClear={false}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NISN (10 Digit)</label>
                <input
                  type="text"
                  value={regForm.nisn}
                  onChange={e => setRegForm({ ...regForm, nisn: e.target.value })}
                  placeholder="Contoh: 0081234567"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={regForm.birth_place}
                  onChange={e => setRegForm({ ...regForm, birth_place: e.target.value })}
                  placeholder="Kota / Kabupaten"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                <DatePickerField
                  value={regForm.birth_date}
                  onChange={(isoStr) => setRegForm(prev => ({ ...prev, birth_date: isoStr }))}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alamat Domisili Lengkap</label>
              <textarea
                rows={2}
                value={regForm.address}
                onChange={e => setRegForm({ ...regForm, address: e.target.value })}
                placeholder="Alamat domisili tempat tinggal santri..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section 3: Data Asal Sekolah */}
          <div className="space-y-3 pt-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-emerald-600" />
              <span>Data Asal Sekolah</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Asal Sekolah</label>
                <input
                  type="text"
                  value={regForm.previous_school_name}
                  onChange={e => setRegForm({ ...regForm, previous_school_name: e.target.value })}
                  placeholder="Contoh: SDIT Nurul Fikri Bogor (Opsional)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Asal Sekolah</label>
                <input
                  type="text"
                  value={regForm.previous_school_address}
                  onChange={e => setRegForm({ ...regForm, previous_school_address: e.target.value })}
                  placeholder="Kota / Wilayah asal sekolah (Opsional)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Data Orang Tua / Kontak */}
          <div className="space-y-3 pt-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Data Orang Tua / Wali</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Ayah Kandung</label>
                <input
                  type="text"
                  value={regForm.father_name}
                  onChange={e => setRegForm({ ...regForm, father_name: e.target.value })}
                  placeholder="Nama ayah kandung (Opsional)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Ibu Kandung</label>
                <input
                  type="text"
                  value={regForm.mother_name}
                  onChange={e => setRegForm({ ...regForm, mother_name: e.target.value })}
                  placeholder="Nama ibu kandung (Opsional)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kontak Orang Tua / WA <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regForm.parent_contact}
                  onChange={e => setRegForm({ ...regForm, parent_contact: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Simpan & Daftarkan Santri</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Detail Calon Santri (Tabs: Bio, Docs, Bill) */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedRegistrant ? `${selectedRegistrant.full_name} (${selectedRegistrant.registration_number})` : 'Detail Calon Santri'}
        maxWidth="max-w-3xl"
      >
        {selectedRegistrant && (
          <div className="space-y-4 text-xs">
            {/* Header Mini Stepper 7 Tahapan PPDB */}
            <PpdbStageProgressBar stageInfo={selectedRegistrant.stage_info} />

            {/* Tab Header */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              {[
                { id: 'stages', label: 'Alur & Status 7 Tahap PPDB' },
                { id: 'bio', label: 'Biodata & Akun Portal' },
                { id: 'docs', label: `Berkas Digital (${selectedRegistrant.documents?.length || 0})` },
                { id: 'bill', label: 'Kasir & Keuangan PPDB' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDetailTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    detailTab === t.id
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB STAGES (7 Tahapan PPDB) */}
            {detailTab === 'stages' && (
              <PpdbStageDetailTimeline
                stageInfo={selectedRegistrant.stage_info}
                registrant={selectedRegistrant}
                onDeclareProspective={handleDeclareProspective}
                onNavigateToBill={() => setDetailTab('bill')}
                isDeclaring={isDeclaring}
              />
            )}

            {/* TAB BIO */}
            {detailTab === 'bio' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400">Nomor Registrasi</span>
                    <div className="font-mono font-bold text-emerald-800 text-sm mt-0.5">{selectedRegistrant.registration_number}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Jenis Kelamin</span>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedRegistrant.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">NISN</span>
                    <div className="font-mono text-slate-800 mt-0.5">{selectedRegistrant.nisn || '-'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Status Saat Ini</span>
                    <div className="mt-0.5"><StatusPill status={selectedRegistrant.status} /></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-100 space-y-2">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1">Data Asal Sekolah</h4>
                    <p><span className="text-slate-400">Nama Sekolah:</span> <span className="font-medium">{selectedRegistrant.previous_school_name || '-'}</span></p>
                    <p><span className="text-slate-400">Alamat Sekolah:</span> <span className="font-medium">{selectedRegistrant.previous_school_address || '-'}</span></p>
                    <p><span className="text-slate-400">Alamat Domisili:</span> <span className="font-medium">{selectedRegistrant.address || '-'}</span></p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 space-y-2">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1">Data Orang Tua</h4>
                    <p><span className="text-slate-400">Ayah:</span> <span className="font-medium">{selectedRegistrant.father_name || '-'}</span></p>
                    <p><span className="text-slate-400">Ibu:</span> <span className="font-medium">{selectedRegistrant.mother_name || '-'}</span></p>
                    <p><span className="text-slate-400">No. Kontak / WA:</span> <span className="font-medium font-mono text-emerald-700">{selectedRegistrant.parent_contact || '-'}</span></p>
                  </div>
                </div>

                {/* Akun Portal Calon Murid */}
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-indigo-600" />
                      <span>Akun Portal Santri Mandiri</span>
                    </h4>
                    <p className="text-xs text-indigo-700/80 mt-0.5">
                      {selectedRegistrant.user_account_id
                        ? `Akun aktif (User ID: ${selectedRegistrant.user_account_id})`
                        : 'Calon santri belum memiliki akun login portal mandiri.'}
                    </p>
                  </div>
                  {!selectedRegistrant.user_account_id && (
                    <button
                      type="button"
                      onClick={handleCreateAccount}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Buat Akun Portal
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB DOCS */}
            {detailTab === 'docs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Berkas & Dokumen Persyaratan Digital</h4>
                </div>

                {/* Form Upload Berkas */}
                <form onSubmit={handleAddDocument} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-3">
                  <div className="w-56">
                    <SearchableSelect
                      options={[
                        { value: 'kk', label: 'Kartu Keluarga (KK)', badge: 'KK', badgeClass: 'bg-blue-100 text-blue-800' },
                        { value: 'akta', label: 'Akta Kelahiran', badge: 'Akta', badgeClass: 'bg-emerald-100 text-emerald-800' },
                        { value: 'ijazah', label: 'Ijazah / SKL', badge: 'Ijazah', badgeClass: 'bg-indigo-100 text-indigo-800' },
                        { value: 'foto', label: 'Pas Foto 3x4', badge: 'Foto', badgeClass: 'bg-amber-100 text-amber-800' },
                        { value: 'raport', label: 'Buku Raport', badge: 'Raport', badgeClass: 'bg-teal-100 text-teal-800' }
                      ]}
                      value={docType}
                      onChange={val => setDocType(val)}
                      placeholder="Pilih Dokumen..."
                      accentColor="emerald"
                      allowClear={false}
                    />
                  </div>
                  <input
                    type="url"
                    required
                    value={docFileUrl}
                    onChange={e => setDocFileUrl(e.target.value)}
                    placeholder="URL file berkas (Google Drive / S3 / Cloud)"
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                </form>

                {/* Tabel Dokumen */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Jenis Dokumen</th>
                        <th className="p-2.5">File Link</th>
                        <th className="p-2.5">Status Verifikasi</th>
                        <th className="p-2.5 text-right">Aksi Panitia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRegistrant.documents && selectedRegistrant.documents.length > 0 ? (
                        selectedRegistrant.documents.map(doc => (
                          <tr key={doc.id}>
                            <td className="p-2.5 font-bold text-slate-800 uppercase">{doc.document_type}</td>
                            <td className="p-2.5">
                              <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-emerald-700 font-medium underline truncate max-w-[150px] inline-block">
                                Lihat Berkas
                              </a>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                doc.verification_status === 'verified'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : (doc.verification_status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800')
                              }`}>
                                {doc.verification_status || 'Pending'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleVerifyDoc(doc.id, 'verified')}
                                  className="p-1 rounded text-emerald-700 hover:bg-emerald-50 transition-colors"
                                  title="Verifikasi Valid"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleVerifyDoc(doc.id, 'rejected')}
                                  className="p-1 rounded text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Tolak Berkas"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">Belum ada dokumen yang diunggah.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB BILL & KEUANGAN PPDB */}
            {detailTab === 'bill' && (
              <div className="space-y-5">
                {/* Banner Sinkronisasi Modul Keuangan */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-emerald-600 text-white">
                        <Wallet className="w-4 h-4" />
                      </span>
                      <h4 className="font-bold text-emerald-950 text-sm">Sinkronisasi Kasir & Tagihan Modul Keuangan</h4>
                    </div>
                    <p className="text-xs text-slate-600 max-w-xl">
                      Status verifikasi pembayaran Biaya Formulir Pendaftaran (Tahap 2) dan Uang Pangkal (Tahap 5) sepenuhnya mengacu pada pencatatan kas masuk oleh Bendahara di modul Keuangan PPDB Billing.
                    </p>
                  </div>
                  <a
                    href="/keuangan/ppdb-billing"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                  >
                    <span>Loket Keuangan PPDB</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* 1. BIAYA FORMULIR PENDAFTARAN (TAHAP 2) */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-slate-800 text-sm">1. Biaya Formulir Pendaftaran (Tahap 2 PPDB)</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      selectedRegistrant.registration_bill?.is_paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedRegistrant.registration_bill?.is_paid ? 'LUNAS (Tercatat di Keuangan)' : 'BELUM LUNAS - Menunggu Pembayaran'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400">Nominal Tagihan:</span>
                      <div className="font-bold text-slate-800 text-base mt-0.5">
                        Rp {Number(selectedRegistrant.registration_bill?.amount || 350000).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Jumlah Terbayar:</span>
                      <div className="font-bold text-emerald-700 text-base mt-0.5">
                        Rp {Number(selectedRegistrant.registration_bill?.paid_amount || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Sisa Tagihan:</span>
                      <div className="font-bold text-slate-700 text-base mt-0.5">
                        Rp {Math.max(0, Number(selectedRegistrant.registration_bill?.amount || 350000) - Number(selectedRegistrant.registration_bill?.paid_amount || 0)).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  {/* Form Kasir Pembayaran jika belum lunas */}
                  {!selectedRegistrant.registration_bill?.is_paid && (
                    <form onSubmit={handlePayRegistrationBill} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                          <Wallet className="w-4 h-4 text-emerald-700" />
                          <span>Pencatatan Cepat Kas Masuk Biaya Pendaftaran</span>
                        </h4>
                        <span className="text-[11px] text-emerald-700 font-medium">Otomatis masuk ke Buku Kas Keuangan</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Rekening Kas / Bank Penerima *</label>
                          <SearchableSelect
                            options={cashAccounts.map(ca => ({
                              value: ca.id,
                              label: `${ca.account_name} (${ca.bank_name || 'Kas Tunai'})`,
                              badge: ca.bank_name || 'Kas',
                              badgeClass: 'bg-emerald-100 text-emerald-800 font-bold',
                              sublabel: ca.account_number ? `No: ${ca.account_number}` : 'Akun Kas Keuangan'
                            }))}
                            value={paymentForm.cash_account_id || (cashAccounts[0]?.id || '')}
                            onChange={val => setPaymentForm({ ...paymentForm, cash_account_id: val })}
                            placeholder="Pilih Rekening Kas..."
                            accentColor="emerald"
                            allowClear={false}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                          <SearchableSelect
                            options={[
                              { value: 'cash', label: 'Tunai (Kasir)', badge: 'Tunai', badgeClass: 'bg-teal-100 text-teal-800' },
                              { value: 'bank_transfer', label: 'Transfer Bank', badge: 'Bank', badgeClass: 'bg-blue-100 text-blue-800' },
                              { value: 'qris', label: 'QRIS / Online', badge: 'QRIS', badgeClass: 'bg-purple-100 text-purple-800' }
                            ]}
                            value={paymentForm.payment_method}
                            onChange={val => setPaymentForm({ ...paymentForm, payment_method: val })}
                            placeholder="Pilih Metode..."
                            accentColor="emerald"
                            allowClear={false}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={paymentLoading}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>{paymentLoading ? 'Memproses Transaksi...' : 'Catat Pembayaran Lunas & Terbitkan Kuitansi'}</span>
                      </button>
                    </form>
                  )}

                  {/* Bukti Kuitansi Sukses */}
                  {paymentSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-900 space-y-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Pembayaran Berhasil Dicatat!</span>
                      </span>
                      <p className="text-xs">Nomor Kuitansi Resmi: <span className="font-mono font-bold">{paymentSuccess.receipt_number}</span></p>
                    </div>
                  )}

                  {/* Riwayat Pembayaran Biaya Pendaftaran */}
                  {selectedRegistrant.registration_bill?.payments && selectedRegistrant.registration_bill.payments.length > 0 ? (
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 text-xs">Riwayat Pembayaran Kasir (Formulir)</h5>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">No. Kuitansi</th>
                              <th className="p-2.5">Tanggal</th>
                              <th className="p-2.5">Nominal</th>
                              <th className="p-2.5">Metode</th>
                              <th className="p-2.5">Kas/Bank</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedRegistrant.registration_bill.payments.map(p => (
                              <tr key={p.id}>
                                <td className="p-2.5 font-mono font-bold text-emerald-800">{p.receipt_number}</td>
                                <td className="p-2.5 text-slate-600">{p.payment_date}</td>
                                <td className="p-2.5 font-bold text-slate-800">Rp {Number(p.amount_paid).toLocaleString('id-ID')}</td>
                                <td className="p-2.5 uppercase text-slate-500">{p.payment_method}</td>
                                <td className="p-2.5 text-slate-600">{p.account_name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-3 rounded-lg bg-slate-50 text-slate-400 text-xs">
                      Belum ada transaksi pembayaran formulir yang dicatat oleh kasir.
                    </div>
                  )}
                </div>

                {/* 2. BIAYA UANG PANGKAL / DAFTAR ULANG (TAHAP 5) */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-slate-800 text-sm">2. Biaya Uang Pangkal / Masuk (Tahap 5 PPDB)</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      selectedRegistrant.enrollment_fee_bill?.is_paid
                        ? 'bg-emerald-100 text-emerald-800'
                        : (selectedRegistrant.enrollment_fee_bill?.is_min_paid
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800')
                    }`}>
                      {selectedRegistrant.enrollment_fee_bill?.is_paid
                        ? 'LUNAS LENGKAP (Tercatat di Keuangan)'
                        : (selectedRegistrant.enrollment_fee_bill?.is_min_paid
                            ? 'TERBAYAR SEBAGIAN (Cicilan Tercatat)'
                            : 'BELUM ADA PEMBAYARAN - Menunggu Pencatatan Kasir')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400">Total Skema Uang Pangkal:</span>
                      <div className="font-bold text-slate-800 text-base mt-0.5">
                        Rp {Number(selectedRegistrant.enrollment_fee_bill?.amount || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Terbayar ke Kasir:</span>
                      <div className="font-bold text-emerald-700 text-base mt-0.5">
                        Rp {Number(selectedRegistrant.enrollment_fee_bill?.paid_amount || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Sisa Tagihan Uang Pangkal:</span>
                      <div className="font-bold text-slate-700 text-base mt-0.5">
                        Rp {Number(selectedRegistrant.enrollment_fee_bill?.remaining_balance || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  {/* Rincian Komponen Tagihan Uang Pangkal jika ada */}
                  {selectedRegistrant.enrollment_fee_bill?.bills && selectedRegistrant.enrollment_fee_bill.bills.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 text-xs">Rincian Komponen Uang Pangkal</h5>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Komponen Biaya</th>
                              <th className="p-2.5">Nominal</th>
                              <th className="p-2.5">Terbayar</th>
                              <th className="p-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedRegistrant.enrollment_fee_bill.bills.map((b) => (
                              <tr key={b.id}>
                                <td className="p-2.5 font-medium text-slate-800">{b.fee_type_name || b.description || 'Komponen Uang Pangkal'}</td>
                                <td className="p-2.5 font-bold text-slate-700">Rp {Number(b.amount || 0).toLocaleString('id-ID')}</td>
                                <td className="p-2.5 font-bold text-emerald-700">Rp {Number(b.paid_amount || 0).toLocaleString('id-ID')}</td>
                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    b.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {b.status === 'paid' ? 'LUNAS' : (Number(b.paid_amount) > 0 ? 'SEBAGIAN' : 'BELUM DIBAYAR')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Riwayat Pembayaran Uang Pangkal oleh Bendahara */}
                  {selectedRegistrant.enrollment_fee_bill?.payments && selectedRegistrant.enrollment_fee_bill.payments.length > 0 ? (
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 text-xs">Riwayat Pembayaran Kasir (Uang Pangkal)</h5>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">No. Kuitansi</th>
                              <th className="p-2.5">Tanggal</th>
                              <th className="p-2.5">Nominal</th>
                              <th className="p-2.5">Metode</th>
                              <th className="p-2.5">Kas/Bank</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedRegistrant.enrollment_fee_bill.payments.map((p) => (
                              <tr key={p.id}>
                                <td className="p-2.5 font-mono font-bold text-emerald-800">{p.receipt_number}</td>
                                <td className="p-2.5 text-slate-600">{p.payment_date}</td>
                                <td className="p-2.5 font-bold text-slate-800">Rp {Number(p.amount_paid).toLocaleString('id-ID')}</td>
                                <td className="p-2.5 uppercase text-slate-500">{p.payment_method}</td>
                                <td className="p-2.5 text-slate-600">{p.account_name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Belum ada pembayaran uang pangkal yang tercatat oleh Bendahara.</p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Status Tahap 5 (Membayar Uang Pangkal) dan Tahap 6 (Calon Siswa) dipersyaratkan memiliki catatan transaksi riil kas masuk di Keuangan PPDB Billing.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tombol Pintasan ke Keuangan PPDB Billing */}
                  <div className="pt-2 flex justify-end">
                    <a
                      href="/keuangan/ppdb-billing"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Input Pembayaran Uang Pangkal di Keuangan</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
