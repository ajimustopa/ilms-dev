import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  MapPin,
  CreditCard,
  Users2,
  GraduationCap,
  Briefcase,
  FileCheck,
  FileText,
  ClipboardList,
  AlertTriangle,
  Banknote,
  FolderArchive,
  Calendar,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Building2,
  Phone,
  Mail,
  ExternalLink,
  Upload,
  Check,
  Tag
} from 'lucide-react';
import api from '../../../shared/services/api';

export default function DetailPegawai() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('biodata');
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sub Data States
  const [addressList, setAddressList] = useState([]);
  const [bankAccountList, setBankAccountList] = useState([]);
  const [familyList, setFamilyList] = useState([]);
  const [educationList, setEducationList] = useState([]);
  const [workExpList, setWorkExpList] = useState([]);
  const [positionHistory, setPositionHistory] = useState([]);
  const [warningLetterList, setWarningLetterList] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [documentChecklists, setDocumentChecklists] = useState([]);
  const [retirementPlan, setRetirementPlan] = useState(null);
  const [jobPositions, setJobPositions] = useState([]);

  // Modal States
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    address_type: 'ktp',
    street: '',
    rt: '',
    rw: '',
    hamlet: '',
    village: '',
    district: '',
    city: '',
    province: '',
    postal_code: ''
  });

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [bankForm, setBankForm] = useState({
    bank_id: '',
    bank_name: 'BCA',
    account_number: '',
    account_holder_name: ''
  });

  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [familyForm, setFamilyForm] = useState({
    relation: 'spouse',
    name: '',
    birth_place: '',
    birth_date: '',
    marriage_date: '',
    occupation: ''
  });

  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [selectedEdu, setSelectedEdu] = useState(null);
  const [eduForm, setEduForm] = useState({
    record_type: 'education',
    education_level: 'S1',
    major: '',
    institution_name: '',
    graduation_year: '',
    training_name: '',
    organizer: '',
    event_start_date: '',
    event_end_date: '',
    proficiency_level: '',
    certificate_number: '',
    certificate_file_url: ''
  });

  const [isWorkExpModalOpen, setIsWorkExpModalOpen] = useState(false);
  const [selectedWorkExp, setSelectedWorkExp] = useState(null);
  const [workExpForm, setWorkExpForm] = useState({
    organization_name: '',
    role_title: '',
    start_date: '',
    end_date: ''
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    document_type: 'pengangkatan',
    position_id: '',
    rank: '',
    document_number: '',
    validity_years: 1,
    evaluation_note: '',
    effective_date: '',
    end_date: ''
  });

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningForm, setWarningForm] = useState({
    warning_date: '',
    letter_number: '',
    description: ''
  });

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docForm, setDocForm] = useState({
    document_name: '',
    status: 'available',
    file_url: '',
    notes: ''
  });

  const [isRetirementModalOpen, setIsRetirementModalOpen] = useState(false);
  const [retirementForm, setRetirementForm] = useState({
    retirement_date: '',
    retirement_type: 'Pensiun Normal BUP'
  });

  const fetchEmployeeDetail = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [
        empRes,
        addrRes,
        bankRes,
        famRes,
        eduRes,
        workRes,
        posRes,
        warnRes,
        payRes,
        docRes,
        retRes,
        allPosRes
      ] = await Promise.allSettled([
        api.get(`/kepegawaian/employees/${id}`),
        api.get(`/kepegawaian/employees/${id}/addresses`),
        api.get(`/kepegawaian/employees/${id}/bank-accounts`),
        api.get(`/kepegawaian/employees/${id}/family-members`),
        api.get(`/kepegawaian/employees/${id}/education-trainings`),
        api.get(`/kepegawaian/employees/${id}/work-experiences`),
        api.get(`/kepegawaian/employees/${id}/position-history`),
        api.get(`/kepegawaian/employees/${id}/warning-letters`),
        api.get(`/kepegawaian/employees/${id}/payroll-history`),
        api.get(`/kepegawaian/employees/${id}/document-checklists`),
        api.get(`/kepegawaian/employees/${id}/retirement-plan`),
        api.get('/kepegawaian/job-positions')
      ]);

      if (empRes.status === 'fulfilled' && empRes.value.data?.data) {
        setEmployee(empRes.value.data.data);
      }
      if (addrRes.status === 'fulfilled' && addrRes.value.data?.data) {
        setAddressList(addrRes.value.data.data);
      }
      if (bankRes.status === 'fulfilled' && bankRes.value.data?.data) {
        setBankAccountList(Array.isArray(bankRes.value.data.data) ? bankRes.value.data.data : [bankRes.value.data.data]);
      }
      if (famRes.status === 'fulfilled' && famRes.value.data?.data) {
        setFamilyList(famRes.value.data.data);
      }
      if (eduRes.status === 'fulfilled' && eduRes.value.data?.data) {
        setEducationList(eduRes.value.data.data);
      }
      if (workRes.status === 'fulfilled' && workRes.value.data?.data) {
        setWorkExpList(workRes.value.data.data);
      }
      if (posRes.status === 'fulfilled' && posRes.value.data?.data) {
        setPositionHistory(posRes.value.data.data);
      }
      if (warnRes.status === 'fulfilled' && warnRes.value.data?.data) {
        setWarningLetterList(warnRes.value.data.data);
      }
      if (payRes.status === 'fulfilled' && payRes.value.data?.data) {
        setPayrollHistory(payRes.value.data.data);
      }
      if (docRes.status === 'fulfilled' && docRes.value.data?.data) {
        setDocumentChecklists(docRes.value.data.data);
      }
      if (retRes.status === 'fulfilled' && retRes.value.data?.data) {
        setRetirementPlan(retRes.value.data.data);
      } else {
        setRetirementPlan(null);
      }
      if (allPosRes.status === 'fulfilled' && allPosRes.value.data?.data) {
        setJobPositions(allPosRes.value.data.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat detail data pegawai');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetail();
  }, [id]);

  // Submit Helper
  const handleGenericSubmit = async (apiCall, successText, modalCloseFn) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await apiCall();
      if (res.data?.success) {
        setSuccessMsg(successText);
        modalCloseFn();
        fetchEmployeeDetail();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memproses permintaan');
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Alamat Handlers
  const openAddAddressModal = (type = 'ktp') => {
    setSelectedAddress(null);
    setAddressForm({
      address_type: type,
      street: '',
      rt: '',
      rw: '',
      hamlet: '',
      village: '',
      district: '',
      city: '',
      province: '',
      postal_code: ''
    });
    setIsAddressModalOpen(true);
  };

  const openEditAddressModal = (addr) => {
    setSelectedAddress(addr);
    setAddressForm({ ...addr });
    setIsAddressModalOpen(true);
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    if (selectedAddress) {
      handleGenericSubmit(
        () => api.put(`/kepegawaian/addresses/${selectedAddress.id}`, addressForm),
        'Alamat berhasil diperbarui',
        () => setIsAddressModalOpen(false)
      );
    } else {
      handleGenericSubmit(
        () => api.post(`/kepegawaian/employees/${id}/addresses`, addressForm),
        'Alamat baru berhasil ditambahkan',
        () => setIsAddressModalOpen(false)
      );
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Hapus alamat ini?')) return;
    try {
      await api.delete(`/kepegawaian/addresses/${addrId}`);
      setSuccessMsg('Alamat berhasil dihapus');
      fetchEmployeeDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus alamat');
    }
  };

  // 2. Bank Account Handlers (1:N)
  const openAddBankModal = () => {
    setSelectedBank(null);
    setBankForm({
      bank_id: '',
      bank_name: 'BCA',
      account_number: '',
      account_holder_name: employee?.full_name || ''
    });
    setIsBankModalOpen(true);
  };

  const openEditBankModal = (bank) => {
    setSelectedBank(bank);
    setBankForm({ ...bank });
    setIsBankModalOpen(true);
  };

  const handleBankSubmit = (e) => {
    e.preventDefault();
    if (selectedBank) {
      handleGenericSubmit(
        () => api.put(`/kepegawaian/bank-accounts/${selectedBank.id}`, bankForm),
        'Data rekening berhasil diperbarui',
        () => setIsBankModalOpen(false)
      );
    } else {
      handleGenericSubmit(
        () => api.post(`/kepegawaian/employees/${id}/bank-accounts`, bankForm),
        'Rekening bank baru berhasil ditambahkan',
        () => setIsBankModalOpen(false)
      );
    }
  };

  const handleDeleteBank = async (bankId) => {
    if (!window.confirm('Hapus rekening bank ini?')) return;
    try {
      await api.delete(`/kepegawaian/bank-accounts/${bankId}`);
      setSuccessMsg('Rekening bank berhasil dihapus');
      fetchEmployeeDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus rekening bank');
    }
  };

  // 3. Family Handlers
  const openAddFamilyModal = () => {
    setSelectedFamily(null);
    setFamilyForm({
      relation: 'spouse',
      name: '',
      birth_place: '',
      birth_date: '',
      marriage_date: '',
      occupation: ''
    });
    setIsFamilyModalOpen(true);
  };

  const openEditFamilyModal = (fam) => {
    setSelectedFamily(fam);
    setFamilyForm({ ...fam });
    setIsFamilyModalOpen(true);
  };

  const handleFamilySubmit = (e) => {
    e.preventDefault();
    if (selectedFamily) {
      handleGenericSubmit(
        () => api.put(`/kepegawaian/family-members/${selectedFamily.id}`, familyForm),
        'Data keluarga berhasil diperbarui',
        () => setIsFamilyModalOpen(false)
      );
    } else {
      handleGenericSubmit(
        () => api.post(`/kepegawaian/employees/${id}/family-members`, familyForm),
        'Anggota keluarga baru berhasil ditambahkan',
        () => setIsFamilyModalOpen(false)
      );
    }
  };

  const handleDeleteFamily = async (famId) => {
    if (!window.confirm('Hapus data anggota keluarga ini?')) return;
    try {
      await api.delete(`/kepegawaian/family-members/${famId}`);
      setSuccessMsg('Data anggota keluarga berhasil dihapus');
      fetchEmployeeDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus data keluarga');
    }
  };

  // 4. Education & Training Handlers
  const openAddEduModal = () => {
    setSelectedEdu(null);
    setEduForm({
      record_type: 'education',
      education_level: 'S1',
      major: '',
      institution_name: '',
      graduation_year: '',
      training_name: '',
      organizer: '',
      event_start_date: '',
      event_end_date: '',
      proficiency_level: '',
      certificate_number: '',
      certificate_file_url: ''
    });
    setIsEduModalOpen(true);
  };

  const openEditEduModal = (edu) => {
    setSelectedEdu(edu);
    setEduForm({ ...edu });
    setIsEduModalOpen(true);
  };

  const handleEduSubmit = (e) => {
    e.preventDefault();
    if (selectedEdu) {
      handleGenericSubmit(
        () => api.put(`/kepegawaian/education-trainings/${selectedEdu.id}`, eduForm),
        'Data pendidikan/keahlian berhasil diperbarui',
        () => setIsEduModalOpen(false)
      );
    } else {
      handleGenericSubmit(
        () => api.post(`/kepegawaian/employees/${id}/education-trainings`, eduForm),
        'Data pendidikan/keahlian baru berhasil ditambahkan',
        () => setIsEduModalOpen(false)
      );
    }
  };

  const handleDeleteEdu = async (eduId) => {
    if (!window.confirm('Hapus data pendidikan/diklat ini?')) return;
    try {
      await api.delete(`/kepegawaian/education-trainings/${eduId}`);
      setSuccessMsg('Data berhasil dihapus');
      fetchEmployeeDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus data');
    }
  };

  // 5. Work Experience Handlers
  const openAddWorkExpModal = () => {
    setSelectedWorkExp(null);
    setWorkExpForm({
      organization_name: '',
      role_title: '',
      start_date: '',
      end_date: ''
    });
    setIsWorkExpModalOpen(true);
  };

  const openEditWorkExpModal = (work) => {
    setSelectedWorkExp(work);
    setWorkExpForm({ ...work });
    setIsWorkExpModalOpen(true);
  };

  const handleWorkExpSubmit = (e) => {
    e.preventDefault();
    if (selectedWorkExp) {
      handleGenericSubmit(
        () => api.put(`/kepegawaian/work-experiences/${selectedWorkExp.id}`, workExpForm),
        'Pengalaman kerja berhasil diperbarui',
        () => setIsWorkExpModalOpen(false)
      );
    } else {
      handleGenericSubmit(
        () => api.post(`/kepegawaian/employees/${id}/work-experiences`, workExpForm),
        'Pengalaman kerja baru berhasil ditambahkan',
        () => setIsWorkExpModalOpen(false)
      );
    }
  };

  const handleDeleteWorkExp = async (workId) => {
    if (!window.confirm('Hapus riwayat pengalaman kerja ini?')) return;
    try {
      await api.delete(`/kepegawaian/work-experiences/${workId}`);
      setSuccessMsg('Pengalaman kerja berhasil dihapus');
      fetchEmployeeDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus pengalaman kerja');
    }
  };

  // 6. Position History / SK / SPK / Penugasan Handlers
  const openAddHistoryModal = (type = 'pengangkatan') => {
    setHistoryForm({
      document_type: type,
      position_id: employee?.current_position?.id || employee?.current_position_id || '',
      rank: employee?.current_rank || '',
      document_number: '',
      validity_years: 1,
      evaluation_note: '',
      effective_date: new Date().toISOString().split('T')[0],
      end_date: ''
    });
    setIsHistoryModalOpen(true);
  };

  const handleHistorySubmit = (e) => {
    e.preventDefault();
    handleGenericSubmit(
      () => api.post(`/kepegawaian/employees/${id}/position-history`, historyForm),
      'Riwayat karir/dokumen berhasil ditambahkan',
      () => setIsHistoryModalOpen(false)
    );
  };

  // 7. Warning Letter Handlers
  const openAddWarningModal = () => {
    setWarningForm({
      warning_date: new Date().toISOString().split('T')[0],
      letter_number: '',
      description: ''
    });
    setIsWarningModalOpen(true);
  };

  const handleWarningSubmit = (e) => {
    e.preventDefault();
    handleGenericSubmit(
      () => api.post(`/kepegawaian/employees/${id}/warning-letters`, warningForm),
      'Surat Peringatan berhasil diterbitkan',
      () => setIsWarningModalOpen(false)
    );
  };

  const handleDeleteWarning = async (wId) => {
    if (!window.confirm('Hapus surat peringatan ini?')) return;
    try {
      await api.delete(`/kepegawaian/warning-letters/${wId}`);
      setSuccessMsg('Surat peringatan berhasil dihapus');
      fetchEmployeeDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus surat peringatan');
    }
  };

  // 8. Document Checklist Handlers
  const openEditDocModal = (doc) => {
    setSelectedDoc(doc);
    setDocForm({
      document_name: doc.document_name,
      status: doc.status,
      file_url: doc.file_url || '',
      notes: doc.notes || ''
    });
    setIsDocModalOpen(true);
  };

  const handleDocSubmit = (e) => {
    e.preventDefault();
    if (selectedDoc) {
      handleGenericSubmit(
        () => api.put(`/kepegawaian/document-checklists/${selectedDoc.id}`, docForm),
        'Status berkas berhasil diperbarui',
        () => setIsDocModalOpen(false)
      );
    }
  };

  const toggleDocStatus = async (doc) => {
    const nextStatus = doc.status === 'available' ? 'not_available' : 'available';
    try {
      await api.put(`/kepegawaian/document-checklists/${doc.id}`, { status: nextStatus });
      fetchEmployeeDetail();
    } catch (err) {
      setErrorMsg('Gagal memperbarui status berkas');
    }
  };

  // Filtered History Lists
  const pengangkatanList = positionHistory.filter(h => h.document_type === 'pengangkatan');
  const spkList = positionHistory.filter(h => h.document_type === 'spk');
  const penugasanList = positionHistory.filter(h => h.document_type === 'penugasan');

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
        <span>Memuat data lengkap pegawai...</span>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Pegawai Tidak Ditemukan</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">Data pegawai dengan ID {id} tidak ditemukan.</p>
        <Link to="/kepegawaian/employees" className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl">
          Kembali ke Daftar Pegawai
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: 'biodata', label: 'Biodata & Kontak', icon: User },
    { key: 'alamat', label: 'Alamat KTP & Domisili', icon: MapPin },
    { key: 'rekening', label: 'Rekening Bank', icon: CreditCard, count: bankAccountList.length },
    { key: 'keluarga', label: 'Keluarga', icon: Users2, count: familyList.length },
    { key: 'pendidikan', label: 'Pendidikan & Keahlian', icon: GraduationCap, count: educationList.length },
    { key: 'karir', label: 'Pengalaman Kerja', icon: Briefcase, count: workExpList.length },
    { key: 'pengangkatan', label: 'Riwayat Pengangkatan', icon: FileCheck, count: pengangkatanList.length },
    { key: 'spk', label: 'Riwayat SPK', icon: FileText, count: spkList.length },
    { key: 'penugasan', label: 'Riwayat Penugasan', icon: ClipboardList, count: penugasanList.length },
    { key: 'sp', label: 'Riwayat SP', icon: AlertTriangle, count: warningLetterList.length },
    { key: 'gaji', label: 'Riwayat Gaji', icon: Banknote, count: payrollHistory.length },
    { key: 'berkas', label: 'Kelengkapan Berkas', icon: FolderArchive, count: documentChecklists.filter(d => d.status === 'available').length }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3.5">
          <Link
            to="/kepegawaian/employees"
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 transition shadow-2xs"
            title="Kembali ke Daftar Pegawai"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                {employee.full_name}{employee.academic_title ? `, ${employee.academic_title}` : ''}
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {employee.employee_number}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                {employee.employment_status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>Jabatan: <strong>{employee.current_position?.name || 'Belum Ditugaskan'}</strong></span>
              {employee.current_rank && <span>&bull; Golongan: <strong>{employee.current_rank}</strong></span>}
              {employee.age !== null && <span>&bull; Usia: <strong>{employee.age} Tahun</strong></span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              employee.account_status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            ● Status: {employee.account_status}
          </span>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation Bar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Cards */}

      {/* 1. TAB: BIODATA & KONTAK */}
      {activeTab === 'biodata' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Biodata Pribadi & Kontak</h3>
            <p className="text-xs text-slate-400">Informasi identitas dasar pegawai standar Dapodik</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Nomor Pegawai / NIP Yayasan</span>
              <div className="font-semibold text-slate-800 mt-1">{employee.employee_number || '-'}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Nomor Induk Kependudukan (NIK)</span>
              <div className="font-semibold text-slate-800 mt-1">{employee.nik || '-'}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">NUPTK</span>
              <div className="font-semibold text-slate-800 mt-1">{employee.nuptk || '-'}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">NIP Resmi (Khusus PNS)</span>
              <div className="font-semibold text-slate-800 mt-1">{employee.nip || '-'}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Nama Lengkap & Gelar</span>
              <div className="font-semibold text-slate-800 mt-1">
                {employee.full_name}{employee.academic_title ? `, ${employee.academic_title}` : ''}
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Nama Ibu Kandung</span>
              <div className="font-semibold text-slate-800 mt-1">{employee.mother_name || '-'}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Kewarganegaraan</span>
              <div className="font-semibold text-slate-800 mt-1">{employee.citizenship || 'Indonesia'}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Tempat & Tanggal Lahir</span>
              <div className="font-semibold text-slate-800 mt-1">
                {employee.birth_place || '-'}, {employee.birth_date ? employee.birth_date.split('T')[0] : '-'}
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Jenis Kelamin</span>
              <div className="font-semibold text-slate-800 mt-1 capitalize">{employee.gender || '-'}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Agama</span>
              <div className="font-semibold text-slate-800 mt-1">{employee.religion || '-'}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Status Pernikahan</span>
              <div className="font-semibold text-slate-800 mt-1 capitalize">{employee.marital_status || 'single'}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">No. Telepon / WhatsApp</span>
              <div className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{employee.phone_number || '-'}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Alamat Email</span>
              <div className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{employee.email || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB: ALAMAT KTP & DOMISILI */}
      {activeTab === 'alamat' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Alamat Sesuai KTP & Alamat Domisili</h3>
              <p className="text-xs text-slate-400">Rincian jalan, RT, RW, dusun, kelurahan, kecamatan, kab/kota, provinsi, kode pos</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openAddAddressModal('ktp')}
                disabled={addressList.some(a => a.address_type === 'ktp')}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 transition"
              >
                + Set Alamat KTP
              </button>
              <button
                onClick={() => openAddAddressModal('domisili')}
                disabled={addressList.some(a => a.address_type === 'domisili')}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition"
              >
                + Set Alamat Domisili
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['ktp', 'domisili'].map((type) => {
              const addr = addressList.find(a => a.address_type === type);
              return (
                <div key={type} className="bg-white rounded-xl border border-slate-100 shadow-xs p-5 relative">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-bold text-slate-800 uppercase">
                        {type === 'ktp' ? 'Alamat Sesuai KTP' : 'Alamat Domisili / Tempat Tinggal'}
                      </h4>
                    </div>
                    {addr && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditAddressModal(addr)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                          title="Edit Alamat"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                          title="Hapus Alamat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {addr ? (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium">Alamat Jalan</span>
                        <div className="font-semibold text-slate-800 mt-0.5">{addr.street || '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">RT / RW</span>
                        <div className="font-semibold text-slate-800 mt-0.5">{addr.rt || '-'} / {addr.rw || '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Dusun / Lingkungan</span>
                        <div className="font-semibold text-slate-800 mt-0.5">{addr.hamlet || '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Desa / Kelurahan</span>
                        <div className="font-semibold text-slate-800 mt-0.5">{addr.village || '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Kecamatan</span>
                        <div className="font-semibold text-slate-800 mt-0.5">{addr.district || '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Kabupaten / Kota</span>
                        <div className="font-semibold text-slate-800 mt-0.5">{addr.city || '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Provinsi</span>
                        <div className="font-semibold text-slate-800 mt-0.5">{addr.province || '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Kode Pos</span>
                        <div className="font-semibold text-slate-800 mt-0.5">{addr.postal_code || '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Kewarganegaraan</span>
                        <div className="font-semibold text-slate-800 mt-0.5">{employee.citizenship || 'Indonesia'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <p>Alamat {type.toUpperCase()} belum diisi.</p>
                      <button
                        onClick={() => openAddAddressModal(type)}
                        className="mt-2 text-indigo-600 font-semibold hover:underline"
                      >
                        + Tambah Alamat {type.toUpperCase()}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TAB: DATA REKENING BANK (1:N) */}
      {activeTab === 'rekening' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Data Rekening Bank Pegawai</h3>
              <p className="text-xs text-slate-400">Daftar nomor rekening bank tabungan / payroll pegawai (bisa lebih dari satu)</p>
            </div>
            <button
              onClick={openAddBankModal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rekening</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccountList.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-xl border border-slate-100 text-center text-slate-400 text-xs">
                <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">Belum ada data rekening bank yang terdaftar</p>
                <button onClick={openAddBankModal} className="mt-2 text-indigo-600 font-semibold hover:underline">
                  + Tambah Rekening Pertama
                </button>
              </div>
            ) : (
              bankAccountList.map((b) => (
                <div key={b.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                      {b.bank_name} {b.bank_id ? `(${b.bank_id})` : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditBankModal(b)} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteBank(b.id)} className="p-1 rounded-md text-rose-400 hover:text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="my-4">
                    <div className="text-xs text-slate-400">Nomor Rekening</div>
                    <div className="text-base font-mono font-bold text-slate-800 tracking-wider mt-0.5">{b.account_number}</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">a.n. {b.account_holder_name}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. TAB: DATA KELUARGA */}
      {activeTab === 'keluarga' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Susunan Keluarga Pegawai</h3>
              <p className="text-xs text-slate-400">Daftar pasangan (suami/istri) & anak kandung/tiri/angkat</p>
            </div>
            <button
              onClick={openAddFamilyModal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Anggota Keluarga</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Hubungan</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Tempat & Tanggal Lahir</th>
                  <th className="py-3 px-4">Tanggal Menikah</th>
                  <th className="py-3 px-4">Pekerjaan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {familyList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      Belum ada data anggota keluarga.
                    </td>
                  </tr>
                ) : (
                  familyList.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          f.relation === 'spouse' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {f.relation === 'spouse' ? 'Pasangan' : 'Anak'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{f.name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {f.birth_place || '-'}, {f.birth_date ? f.birth_date.split('T')[0] : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {f.marriage_date ? f.marriage_date.split('T')[0] : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{f.occupation || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditFamilyModal(f)} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteFamily(f.id)} className="p-1 rounded-md text-rose-400 hover:text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB: PENDIDIKAN & KEAHLIAN */}
      {activeTab === 'pendidikan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Riwayat Pendidikan, Diklat & Sertifikasi Keahlian</h3>
              <p className="text-xs text-slate-400">Pendidikan formal, sertifikasi pendidik, dan pelatihan profesi</p>
            </div>
            <button
              onClick={openAddEduModal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Riwayat</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Jenjang / Nama Kegiatan</th>
                  <th className="py-3 px-4">Jurusan / Keahlian</th>
                  <th className="py-3 px-4">Institusi / Penyelenggara</th>
                  <th className="py-3 px-4">Tahun / Periode</th>
                  <th className="py-3 px-4">No. Sertifikat</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {educationList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      Belum ada riwayat pendidikan/keahlian terdaftar.
                    </td>
                  </tr>
                ) : (
                  educationList.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {e.record_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {e.record_type === 'education' ? e.education_level : e.training_name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{e.major || e.proficiency_level || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{e.institution_name || e.organizer || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {e.graduation_year || (e.event_start_date ? `${e.event_start_date.split('T')[0]}` : '-')}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{e.certificate_number || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditEduModal(e)} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteEdu(e.id)} className="p-1 rounded-md text-rose-400 hover:text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB: PENGALAMAN KERJA / RIWAYAT KARIR */}
      {activeTab === 'karir' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Riwayat Karir & Pengalaman Kerja Eksternal</h3>
              <p className="text-xs text-slate-400">Unit kerja / instansi sebelumnya, posisi tugas, dan periode kerja</p>
            </div>
            <button
              onClick={openAddWorkExpModal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Riwayat Karir</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Unit Kerja (Instansi / Perusahaan)</th>
                  <th className="py-3 px-4">Tugas / Jabatan</th>
                  <th className="py-3 px-4">Awal Kerja</th>
                  <th className="py-3 px-4">Akhir Kerja</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workExpList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      Belum ada catatan pengalaman kerja eksternal.
                    </td>
                  </tr>
                ) : (
                  workExpList.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-800">{w.organization_name}</td>
                      <td className="py-3 px-4 text-slate-700">{w.role_title}</td>
                      <td className="py-3 px-4 text-slate-600">{w.start_date ? w.start_date.split('T')[0] : '-'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {w.end_date ? w.end_date.split('T')[0] : <span className="text-emerald-600 font-semibold">Masih Berjalan</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditWorkExpModal(w)} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteWorkExp(w.id)} className="p-1 rounded-md text-rose-400 hover:text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB: RIWAYAT PENGANGKATAN PEGAWAI */}
      {activeTab === 'pengangkatan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Riwayat Pengangkatan Pegawai</h3>
              <p className="text-xs text-slate-400">Tanggal pengangkatan, status pengangkatan, nomor SK, periode berlaku, dan lama SK</p>
            </div>
            <button
              onClick={() => openAddHistoryModal('pengangkatan')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah SK Pengangkatan</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Tanggal Pengangkatan (TMT)</th>
                  <th className="py-3 px-4">Status / Jabatan</th>
                  <th className="py-3 px-4">No. SK Pengangkatan</th>
                  <th className="py-3 px-4">Periode Berlaku</th>
                  <th className="py-3 px-4">Lama SK (TST)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pengangkatanList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      Belum ada catatan riwayat SK pengangkatan.
                    </td>
                  </tr>
                ) : (
                  pengangkatanList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-800">{p.effective_date ? p.effective_date.split('T')[0] : '-'}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {p.position_name || '-'} {p.rank ? `(${p.rank})` : ''}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{p.document_number || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{p.validity_years ? `${p.validity_years} Tahun` : '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{p.end_date ? p.end_date.split('T')[0] : 'Seterusnya'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB: RIWAYAT SPK */}
      {activeTab === 'spk' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Riwayat Surat Perjanjian Kerja (SPK)</h3>
              <p className="text-xs text-slate-400">Tanggal SPK, status pengangkatan, no. SPK, periode berlaku (tahun), dan lama SPK</p>
            </div>
            <button
              onClick={() => openAddHistoryModal('spk')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah SPK Baru</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Tanggal SPK</th>
                  <th className="py-3 px-4">Status / Jabatan</th>
                  <th className="py-3 px-4">No. SPK</th>
                  <th className="py-3 px-4">Periode Berlaku</th>
                  <th className="py-3 px-4">Lama SPK (TST)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {spkList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      Belum ada catatan SPK yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  spkList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-800">{s.effective_date ? s.effective_date.split('T')[0] : '-'}</td>
                      <td className="py-3 px-4 text-slate-700">{s.position_name || '-'}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{s.document_number || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{s.validity_years ? `${s.validity_years} Tahun` : '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{s.end_date ? s.end_date.split('T')[0] : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. TAB: RIWAYAT PENUGASAN */}
      {activeTab === 'penugasan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Riwayat Penugasan Tambahan & Khusus</h3>
              <p className="text-xs text-slate-400">TMT, nomor SK penugasan, rincian tugas, TST, dan catatan penilaian</p>
            </div>
            <button
              onClick={() => openAddHistoryModal('penugasan')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Penugasan</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">TMT (Mulai Tugas)</th>
                  <th className="py-3 px-4">No. SK Penugasan</th>
                  <th className="py-3 px-4">Tugas / Peran</th>
                  <th className="py-3 px-4">TST (Selesai Tugas)</th>
                  <th className="py-3 px-4">Penilaian / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {penugasanList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      Belum ada catatan riwayat penugasan khusus.
                    </td>
                  </tr>
                ) : (
                  penugasanList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-800">{t.effective_date ? t.effective_date.split('T')[0] : '-'}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{t.document_number || '-'}</td>
                      <td className="py-3 px-4 text-slate-700">{t.position_name || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{t.end_date ? t.end_date.split('T')[0] : <span className="text-emerald-600">Aktif</span>}</td>
                      <td className="py-3 px-4 text-slate-600 italic">{t.evaluation_note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 10. TAB: RIWAYAT SURAT PERINGATAN (SP) */}
      {activeTab === 'sp' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Riwayat Surat Peringatan (SP)</h3>
              <p className="text-xs text-slate-400">Catatan sanksi disiplin dan surat peringatan yang pernah diterima</p>
            </div>
            <button
              onClick={openAddWarningModal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan SP Baru</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Tanggal SP</th>
                  <th className="py-3 px-4">No. SP</th>
                  <th className="py-3 px-4">Uraian / Deskripsi</th>
                  <th className="py-3 px-4">Penerbit SP</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warningLetterList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      Tidak ada catatan surat peringatan (Pegawai disiplin & bersih).
                    </td>
                  </tr>
                ) : (
                  warningLetterList.map((sp) => (
                    <tr key={sp.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-800">{sp.warning_date ? sp.warning_date.split('T')[0] : '-'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-600">{sp.letter_number}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{sp.description || '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{sp.issuer_name || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDeleteWarning(sp.id)} className="p-1 rounded-md text-rose-400 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 11. TAB: RIWAYAT GAJI */}
      {activeTab === 'gaji' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Riwayat Penetapan & Pembayaran Gaji</h3>
              <p className="text-xs text-slate-400">Rincian gaji pokok, tunjangan jabatan, kehadiran, konsumsi, istri, anak, dan total gaji bersih</p>
            </div>
            <Link
              to="/kepegawaian/payroll"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
            >
              Buka Modul Payroll →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Periode</th>
                  <th className="py-3 px-4 text-right">Gapok</th>
                  <th className="py-3 px-4 text-right">Tunj. Jabatan</th>
                  <th className="py-3 px-4 text-right">Tunj. Hadir</th>
                  <th className="py-3 px-4 text-right">Tunj. Konsumsi</th>
                  <th className="py-3 px-4 text-right">Tunj. Istri/Anak</th>
                  <th className="py-3 px-4 text-right font-bold text-indigo-700">Total Bersih</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {payrollHistory.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400 font-sans text-xs">
                      Belum ada riwayat penggajian pada periode aktif.
                    </td>
                  </tr>
                ) : (
                  payrollHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-sans font-bold text-slate-800">
                        {p.period_month}/{p.period_year}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">Rp {Number(p.gapok).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right text-slate-700">Rp {Number(p.tunjangan_jabatan).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right text-slate-700">Rp {Number(p.tunjangan_kehadiran).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right text-slate-700">Rp {Number(p.tunjangan_konsumsi).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right text-slate-700">Rp {(Number(p.tunjangan_istri) + Number(p.tunjangan_anak)).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-600 font-sans text-xs">Rp {Number(p.total_salary).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {p.period_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 12. TAB: KELENGKAPAN BERKAS */}
      {activeTab === 'berkas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Kelengkapan Berkas Wajib Pegawai</h3>
              <p className="text-xs text-slate-400">Monitoring status ketersediaan & upload dokumen (KTP, KK, Akta, Ijazah SD–S3)</p>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              Terkumpul: <span className="text-emerald-600 font-bold">{documentChecklists.filter(d => d.status === 'available').length}</span> / {documentChecklists.length} Berkas
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documentChecklists.map((doc) => {
              const isAvailable = doc.status === 'available';
              return (
                <div key={doc.id} className="bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderArchive className={`w-4 h-4 ${isAvailable ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <h4 className="text-xs font-bold text-slate-800">{doc.document_name}</h4>
                      </div>
                      <button
                        onClick={() => toggleDocStatus(doc)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {isAvailable ? '✓ Tersedia' : '✕ Belum Ada'}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 min-h-6">
                      {doc.notes || (isAvailable ? 'Dokumen telah terverifikasi di arsip.' : 'Belum diunggah / diserahkan.')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
                    {doc.file_url ? (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Lihat Berkas</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Tidak ada link file</span>
                    )}

                    <button
                      onClick={() => openEditDocModal(doc)}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-semibold text-[11px] transition"
                    >
                      Kelola Berkas
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS SECTION                                           */}
      {/* ======================================================== */}

      {/* Modal Alamat */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {selectedAddress ? 'Edit Alamat Pegawai' : 'Tambah Alamat Pegawai'}
              </h3>
              <button onClick={() => setIsAddressModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddressSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Alamat *</label>
                <select
                  disabled={!!selectedAddress}
                  value={addressForm.address_type}
                  onChange={(e) => setAddressForm({ ...addressForm, address_type: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="ktp">Alamat Sesuai KTP</option>
                  <option value="domisili">Alamat Domisili</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Jalan / No Rumah</label>
                <input
                  type="text"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                  placeholder="Jl. Mawar No. 12"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">RT</label>
                  <input
                    type="text"
                    value={addressForm.rt}
                    onChange={(e) => setAddressForm({ ...addressForm, rt: e.target.value })}
                    placeholder="001"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">RW</label>
                  <input
                    type="text"
                    value={addressForm.rw}
                    onChange={(e) => setAddressForm({ ...addressForm, rw: e.target.value })}
                    placeholder="005"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dusun / Lingkungan</label>
                  <input
                    type="text"
                    value={addressForm.hamlet}
                    onChange={(e) => setAddressForm({ ...addressForm, hamlet: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Desa / Kelurahan</label>
                  <input
                    type="text"
                    value={addressForm.village}
                    onChange={(e) => setAddressForm({ ...addressForm, village: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kecamatan</label>
                  <input
                    type="text"
                    value={addressForm.district}
                    onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kabupaten / Kota</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Provinsi</label>
                  <input
                    type="text"
                    value={addressForm.province}
                    onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Pos</label>
                  <input
                    type="text"
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                    placeholder="16720"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Alamat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rekening Bank */}
      {isBankModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {selectedBank ? 'Edit Data Rekening Bank' : 'Tambah Rekening Bank Baru'}
              </h3>
              <button onClick={() => setIsBankModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBankSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama / Lembaga Bank *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. BCA, BSI, Bank Mandiri, BNI"
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode / ID Bank (Opsional)</label>
                <input
                  type="text"
                  placeholder="mis. 014 (BCA), 451 (BSI)"
                  value={bankForm.bank_id}
                  onChange={(e) => setBankForm({ ...bankForm, bank_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Rekening *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. 8920123456"
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rekening Atas Nama (Pemilik) *</label>
                <input
                  type="text"
                  required
                  value={bankForm.account_holder_name}
                  onChange={(e) => setBankForm({ ...bankForm, account_holder_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Rekening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Kelengkapan Berkas */}
      {isDocModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Kelola Berkas: {selectedDoc.document_name}</h3>
              <button onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDocSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Ketersediaan</label>
                <select
                  value={docForm.status}
                  onChange={(e) => setDocForm({ ...docForm, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="available">Tersedia (Sudah Ada / Terverifikasi)</option>
                  <option value="not_available">Belum Ada (Belum Dikumpulkan)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tautan / URL Berkas (Cloud / Storage)</label>
                <input
                  type="url"
                  placeholder="https://storage.aldepos.sch.id/files/ktp.pdf"
                  value={docForm.file_url}
                  onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Verifikasi</label>
                <textarea
                  rows="2"
                  placeholder="mis. Asli telah diperiksa oleh HRD pada 10 Mei 2026"
                  value={docForm.notes}
                  onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Perbarui Status Berkas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Pengangkatan / SPK / Penugasan */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800 capitalize">
                Tambah Riwayat {historyForm.document_type}
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleHistorySubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {historyForm.document_type === 'spk' ? 'Tanggal SPK *' : 'Tanggal Pengangkatan / TMT *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={historyForm.effective_date}
                    onChange={(e) => setHistoryForm({ ...historyForm, effective_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {historyForm.document_type === 'spk' ? 'Nomor SPK *' : 'Nomor SK *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="mis. 024/SK-YYS/V/2026"
                    value={historyForm.document_number}
                    onChange={(e) => setHistoryForm({ ...historyForm, document_number: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jabatan / Posisi Penugasan</label>
                <select
                  value={historyForm.position_id}
                  onChange={(e) => setHistoryForm({ ...historyForm, position_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Pilih Jabatan</option>
                  {jobPositions.map((pos) => (
                    <option key={pos.id} value={pos.id}>{pos.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Periode Berlaku (Tahun)</label>
                  <input
                    type="number"
                    min="1"
                    value={historyForm.validity_years}
                    onChange={(e) => setHistoryForm({ ...historyForm, validity_years: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lama SK / TST (Selesai)</label>
                  <input
                    type="date"
                    value={historyForm.end_date}
                    onChange={(e) => setHistoryForm({ ...historyForm, end_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {historyForm.document_type === 'penugasan' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Penilaian / Catatan Tugas</label>
                  <textarea
                    rows="2"
                    placeholder="Uraian hasil penilaian pelaksanaan penugasan..."
                    value={historyForm.evaluation_note}
                    onChange={(e) => setHistoryForm({ ...historyForm, evaluation_note: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Riwayat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Surat Peringatan (SP) */}
      {isWarningModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Terbitkan Surat Peringatan (SP)</h3>
              <button onClick={() => setIsWarningModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWarningSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal SP *</label>
                  <input
                    type="date"
                    required
                    value={warningForm.warning_date}
                    onChange={(e) => setWarningForm({ ...warningForm, warning_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor SP *</label>
                  <input
                    type="text"
                    required
                    placeholder="mis. SP/001/V/2026"
                    value={warningForm.letter_number}
                    onChange={(e) => setWarningForm({ ...warningForm, letter_number: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Uraian / Deskripsi Pelanggaran</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Uraian detail latar belakang penerbitan SP..."
                  value={warningForm.description}
                  onChange={(e) => setWarningForm({ ...warningForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWarningModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Menerbitkan...' : 'Terbitkan SP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pengalaman Kerja */}
      {isWorkExpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {selectedWorkExp ? 'Edit Pengalaman Kerja' : 'Tambah Pengalaman Kerja'}
              </h3>
              <button onClick={() => setIsWorkExpModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWorkExpSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit Kerja (Instansi / Lembaga) *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. SMA Bintang Harapan"
                  value={workExpForm.organization_name}
                  onChange={(e) => setWorkExpForm({ ...workExpForm, organization_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tugas / Posisi Kerja *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. Guru Matematika / Staf TU"
                  value={workExpForm.role_title}
                  onChange={(e) => setWorkExpForm({ ...workExpForm, role_title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Awal Kerja (Mulai)</label>
                  <input
                    type="date"
                    value={workExpForm.start_date}
                    onChange={(e) => setWorkExpForm({ ...workExpForm, start_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Akhir Kerja (Selesai)</label>
                  <input
                    type="date"
                    value={workExpForm.end_date}
                    onChange={(e) => setWorkExpForm({ ...workExpForm, end_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWorkExpModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Pengalaman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Anggota Keluarga */}
      {isFamilyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {selectedFamily ? 'Edit Anggota Keluarga' : 'Tambah Anggota Keluarga'}
              </h3>
              <button onClick={() => setIsFamilyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFamilySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hubungan Keluarga *</label>
                <select
                  value={familyForm.relation}
                  onChange={(e) => setFamilyForm({ ...familyForm, relation: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="spouse">Pasangan (Suami / Istri)</option>
                  <option value="child">Anak</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={familyForm.name}
                  onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={familyForm.birth_place}
                    onChange={(e) => setFamilyForm({ ...familyForm, birth_place: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={familyForm.birth_date}
                    onChange={(e) => setFamilyForm({ ...familyForm, birth_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {familyForm.relation === 'spouse' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tanggal Menikah</label>
                    <input
                      type="date"
                      value={familyForm.marriage_date}
                      onChange={(e) => setFamilyForm({ ...familyForm, marriage_date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pekerjaan Pasangan</label>
                    <input
                      type="text"
                      placeholder="mis. Guru / Swasta / PNS"
                      value={familyForm.occupation}
                      onChange={(e) => setFamilyForm({ ...familyForm, occupation: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFamilyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Data Keluarga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pendidikan / Diklat */}
      {isEduModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {selectedEdu ? 'Edit Riwayat Pendidikan / Keahlian' : 'Tambah Riwayat Pendidikan / Keahlian'}
              </h3>
              <button onClick={() => setIsEduModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEduSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Riwayat *</label>
                <select
                  value={eduForm.record_type}
                  onChange={(e) => setEduForm({ ...eduForm, record_type: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="education">Pendidikan Formal</option>
                  <option value="training">Pelatihan / Diklat</option>
                  <option value="certification">Sertifikasi Profesi</option>
                  <option value="skill">Keahlian Khusus</option>
                </select>
              </div>

              {eduForm.record_type === 'education' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenjang Pendidikan *</label>
                    <select
                      value={eduForm.education_level}
                      onChange={(e) => setEduForm({ ...eduForm, education_level: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="SD">SD / Sederajat</option>
                      <option value="SMP">SMP / MTs</option>
                      <option value="SMA">SMA / SMK / MA</option>
                      <option value="D3">Diploma (D3)</option>
                      <option value="S1">Sarjana (S1)</option>
                      <option value="S2">Magister (S2)</option>
                      <option value="S3">Doktor (S3)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jurusan / Program Studi</label>
                    <input
                      type="text"
                      placeholder="mis. Pendidikan Matematika"
                      value={eduForm.major}
                      onChange={(e) => setEduForm({ ...eduForm, major: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Pelatihan / Keahlian *</label>
                  <input
                    type="text"
                    required
                    placeholder="mis. Pelatihan Kurikulum Merdeka / Sertifikasi Pendidik"
                    value={eduForm.training_name}
                    onChange={(e) => setEduForm({ ...eduForm, training_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Institusi / Penyelenggara</label>
                  <input
                    type="text"
                    value={eduForm.institution_name || eduForm.organizer}
                    onChange={(e) => setEduForm({ ...eduForm, institution_name: e.target.value, organizer: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Lulus / Selesai</label>
                  <input
                    type="number"
                    placeholder="2020"
                    value={eduForm.graduation_year}
                    onChange={(e) => setEduForm({ ...eduForm, graduation_year: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Sertifikat / Ijazah</label>
                <input
                  type="text"
                  placeholder="mis. DN-01/D-SD/13/0012345"
                  value={eduForm.certificate_number}
                  onChange={(e) => setEduForm({ ...eduForm, certificate_number: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEduModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Riwayat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
