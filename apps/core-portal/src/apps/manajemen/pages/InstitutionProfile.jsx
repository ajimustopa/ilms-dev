import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import DatePickerField from '../components/shared/DatePickerField';
import {
  Building2,
  School,
  FileText,
  FileCheck,
  Stamp,
  PenTool,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Eye,
  Check,
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

export default function InstitutionProfile() {
  const { user, schoolUnits, activeSchoolUnit } = useAuth();

  // Context Switcher: 'foundation' | 'school_unit'
  const [contextType, setContextType] = useState('foundation');
  const [selectedUnitId, setSelectedUnitId] = useState(activeSchoolUnit?.id || (schoolUnits?.[0]?.id || 1));

  // Active Tab
  const [activeTab, setActiveTab] = useState('base_profile'); // 'base_profile' | 'legal_docs' | 'letterheads' | 'stamps' | 'signatures'

  // Data States
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [docTypes, setDocTypes] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Modals & Forms
  const [modalType, setModalType] = useState(null); // 'doc' | 'letterhead' | 'stamp' | 'signature' | 'doc_type'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);

  // Sync with user's activeSchoolUnit on mount if available
  useEffect(() => {
    if (activeSchoolUnit?.id) {
      setSelectedUnitId(activeSchoolUnit.id);
    }
  }, [activeSchoolUnit]);

  // Fetch summary and supporting data
  const fetchData = async () => {
    try {
      setLoading(true);
      const ownerId = contextType === 'foundation' ? 1 : selectedUnitId;
      const res = await api.get(`/manajemen/institution-profile/summary?owner_type=${contextType}&owner_id=${ownerId}`);
      if (res.data?.success) {
        setSummaryData(res.data.data);
      }

      // Fetch master doc types
      const typesRes = await api.get('/manajemen/institution-profile/document-types');
      if (typesRes.data?.success) {
        setDocTypes(typesRes.data.data);
      }

      // Fetch employees for signature selection (optional from kepegawaian)
      try {
        const empRes = await api.get(`/kepegawaian/employees?limit=100${contextType === 'school_unit' ? `&school_unit_id=${selectedUnitId}` : ''}`);
        if (empRes.data?.success && empRes.data.data?.items) {
          setEmployees(empRes.data.data.items);
        }
      } catch (e) {
        // Fallback gracefully if kepegawaian endpoint has different query
      }
    } catch (err) {
      console.error('Error fetching institution profile summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [contextType, selectedUnitId]);

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    const ownerId = contextType === 'foundation' ? 1 : selectedUnitId;
    const payload = {
      ...formData,
      owner_type: contextType,
      owner_id: ownerId,
    };

    try {
      if (modalType === 'doc') {
        if (editingItem) {
          await api.put(`/manajemen/institution-profile/legal-documents/${editingItem.id}`, payload);
        } else {
          await api.post('/manajemen/institution-profile/legal-documents', payload);
        }
      } else if (modalType === 'letterhead') {
        if (editingItem) {
          await api.put(`/manajemen/institution-profile/letterheads/${editingItem.id}`, payload);
        } else {
          await api.post('/manajemen/institution-profile/letterheads', payload);
        }
      } else if (modalType === 'stamp') {
        if (editingItem) {
          await api.put(`/manajemen/institution-profile/stamps/${editingItem.id}`, payload);
        } else {
          await api.post('/manajemen/institution-profile/stamps', payload);
        }
      } else if (modalType === 'signature') {
        if (editingItem) {
          await api.put(`/manajemen/institution-profile/signatures/${editingItem.id}`, payload);
        } else {
          await api.post('/manajemen/institution-profile/signatures', payload);
        }
      }

      setModalType(null);
      setEditingItem(null);
      setFormData({});
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Action
  const handleDelete = async (type, id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      if (type === 'doc') await api.delete(`/manajemen/institution-profile/legal-documents/${id}`);
      if (type === 'letterhead') await api.delete(`/manajemen/institution-profile/letterheads/${id}`);
      if (type === 'stamp') await api.delete(`/manajemen/institution-profile/stamps/${id}`);
      if (type === 'signature') await api.delete(`/manajemen/institution-profile/signatures/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus data');
    }
  };

  // Set Default Action
  const handleSetDefault = async (type, id) => {
    try {
      if (type === 'letterhead') await api.patch(`/manajemen/institution-profile/letterheads/${id}/set-default`);
      if (type === 'stamp') await api.patch(`/manajemen/institution-profile/stamps/${id}/set-default`);
      if (type === 'signature') await api.patch(`/manajemen/institution-profile/signatures/${id}/set-default`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status default');
    }
  };

  const baseProfile = summaryData?.base_profile || {};
  const legalDocs = summaryData?.legal_documents || [];
  const letterheads = summaryData?.letterheads || [];
  const stamps = summaryData?.stamps || [];
  const signatures = summaryData?.signatures || [];
  const stats = summaryData?.stats || {};

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Context Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/60 border border-indigo-400/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Profil Lembaga & Legalitas</h1>
                <p className="text-slate-400 text-sm">
                  Kelola dokumen legalitas resmi, kop surat dinamis, cap stempel, dan specimen tanda tangan pejabat
                </p>
              </div>
            </div>
          </div>

          {/* Context Selector Toggle */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setContextType('foundation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                contextType === 'foundation'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Tingkat Yayasan
            </button>

            <button
              type="button"
              onClick={() => setContextType('school_unit')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                contextType === 'school_unit'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <School className="w-4 h-4" />
              Satuan Pendidikan
            </button>

            {contextType === 'school_unit' && (
              <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Pilih Satuan:</span>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500 font-bold"
                >
                  {schoolUnits?.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.level})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Expiry Alert Banner if any doc expiring soon or expired */}
        {(stats.expired_legal_docs > 0 || stats.expiring_legal_docs > 0) && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-sm text-amber-200">
                <span className="font-semibold">Peringatan Masa Berlaku: </span>
                {stats.expired_legal_docs > 0 && (
                  <span className="text-rose-400 font-medium mr-2">{stats.expired_legal_docs} dokumen telah kadaluarsa.</span>
                )}
                {stats.expiring_legal_docs > 0 && (
                  <span className="text-amber-300 font-medium">{stats.expiring_legal_docs} dokumen akan kadaluarsa dalam waktu &lt; 30 hari.</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setActiveTab('legal_docs')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition"
            >
              Periksa Dokumen
            </button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('base_profile')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'base_profile'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-950/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Profil Dasar (Core)
        </button>

        <button
          onClick={() => setActiveTab('legal_docs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'legal_docs'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-950/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Dokumen Legalitas ({legalDocs.length})
        </button>

        <button
          onClick={() => setActiveTab('letterheads')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'letterheads'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-950/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Kop Surat ({letterheads.length})
        </button>

        <button
          onClick={() => setActiveTab('stamps')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'stamps'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-950/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Stamp className="w-4 h-4" />
          Cap Stempel ({stamps.length})
        </button>

        <button
          onClick={() => setActiveTab('signatures')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'signatures'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-950/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <PenTool className="w-4 h-4" />
          Tanda Tangan Pejabat ({signatures.length})
        </button>
      </div>

      {/* TAB 1: PROFIL DASAR */}
      {activeTab === 'base_profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  Informasi Data Induk (Read-Only)
                </h2>
                <p className="text-xs text-slate-400">
                  Data dasar dikelola secara terpusat pada Modul Core Service
                </p>
              </div>

              <Link
                to={contextType === 'foundation' ? '/core/foundation' : '/core/school-units'}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-semibold border border-slate-700 transition shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Edit di Core Service
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-500 font-medium">Nama Lembaga / Satuan</span>
                <p className="text-sm font-semibold text-white mt-1">{baseProfile.name || '-'}</p>
              </div>

              {contextType === 'school_unit' && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-xs text-slate-500 font-medium">Jenjang Pendidikan & NPSN</span>
                  <p className="text-sm font-semibold text-white mt-1">
                    {baseProfile.level || '-'} {baseProfile.npsn ? `• NPSN: ${baseProfile.npsn}` : ''}
                  </p>
                </div>
              )}

              {contextType === 'foundation' && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-xs text-slate-500 font-medium">Ketua Yayasan</span>
                  <p className="text-sm font-semibold text-white mt-1">{baseProfile.chairman_name || '-'}</p>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-500 font-medium">Email Resmi</span>
                <p className="text-sm font-semibold text-white mt-1">{baseProfile.email || '-'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-500 font-medium">Nomor Telepon</span>
                <p className="text-sm font-semibold text-white mt-1">{baseProfile.phone_number || '-'}</p>
              </div>

              <div className="md:col-span-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-500 font-medium">Alamat Lengkap</span>
                <p className="text-sm font-semibold text-white mt-1">{baseProfile.address || '-'}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
            <div>
              <h3 className="text-md font-bold text-white flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Kelengkapan Profil Manajemen
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-xs text-slate-400">Dokumen Legalitas</span>
                  <span className="text-xs font-bold text-white px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                    {stats.total_legal_docs || 0} Terunggah
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-xs text-slate-400">Kop Surat Aktif</span>
                  <span className="text-xs font-bold text-white px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                    {summaryData?.defaults?.letterhead ? 'Siap Digunakan' : 'Belum Ditetapkan'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-xs text-slate-400">Cap Stempel Digital</span>
                  <span className="text-xs font-bold text-white px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                    {summaryData?.defaults?.stamp ? 'Tersedia' : 'Belum Ada'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-xs text-slate-400">Specimen Tanda Tangan</span>
                  <span className="text-xs font-bold text-white px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                    {summaryData?.defaults?.signature ? summaryData.defaults.signature.position_title : 'Belum Ada'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900/30 to-violet-900/30 border border-indigo-500/20 text-xs text-indigo-200">
              Data kelengkapan ini akan dihubungkan secara otomatis saat menerbitkan dokumen SK, RIPS, RKJM, RKT, maupun laporan akreditasi pada modul Manajemen.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOKUMEN LEGALITAS */}
      {activeTab === 'legal_docs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-400" />
                Dokumen Legalitas & Perizinan Resmi
              </h2>
              <p className="text-xs text-slate-400">
                Pencatatan Akta Notaris, SK Kemenkumham, Izin Operasional, Akreditasi, dan Sertifikat
              </p>
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                setFormData({ legal_document_type_id: docTypes[0]?.id || '', status: 'berlaku' });
                setModalType('doc');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
            >
              <Plus className="w-4 h-4" />
              Tambah Dokumen Legalitas
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Jenis Dokumen</th>
                  <th className="py-3 px-4">Nomor Dokumen / SK</th>
                  <th className="py-3 px-4">Instansi Penerbit</th>
                  <th className="py-3 px-4">Masa Berlaku</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">File</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {legalDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Belum ada dokumen legalitas yang ditambahkan.
                    </td>
                  </tr>
                ) : (
                  legalDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-semibold text-white">
                        {doc.legal_document_type_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {doc.document_number || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {doc.issuing_authority || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="text-slate-300">
                            {doc.issued_date ? new Date(doc.issued_date).toLocaleDateString('id-ID') : '-'} s/d{' '}
                            {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('id-ID') : 'Selamanya'}
                          </div>
                          {doc.is_expired && (
                            <span className="inline-block text-[10px] text-rose-400 font-bold">
                              Sudah Kadaluarsa
                            </span>
                          )}
                          {doc.is_expiring_soon && !doc.is_expired && (
                            <span className="inline-block text-[10px] text-amber-400 font-bold">
                              Kadaluarsa &lt; 30 Hari
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.status === 'berlaku'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : doc.status === 'kadaluarsa'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {doc.file_url ? (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Lihat File
                          </a>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingItem(doc);
                            setFormData({
                              legal_document_type_id: doc.legal_document_type_id,
                              document_number: doc.document_number,
                              issuing_authority: doc.issuing_authority,
                              issued_date: doc.issued_date ? doc.issued_date.substring(0, 10) : '',
                              expiry_date: doc.expiry_date ? doc.expiry_date.substring(0, 10) : '',
                              file_url: doc.file_url,
                              status: doc.status,
                              notes: doc.notes,
                            });
                            setModalType('doc');
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('doc', doc.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                        >
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

      {/* TAB 3: KOP SURAT */}
      {activeTab === 'letterheads' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Daftar Template Kop Surat
              </h2>
              <p className="text-xs text-slate-400">
                Template HTML header kop surat resmi untuk penerbitan dokumen SK & laporan
              </p>
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  name: `Kop Surat Resmi ${contextType === 'foundation' ? 'Yayasan' : 'Sekolah'}`,
                  header_html: `<div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 8px; font-family: Arial, sans-serif;">\n  <h2 style="margin: 0; font-size: 16pt; font-weight: bold; text-transform: uppercase;">${baseProfile.name || 'ALDEPOS ISLAMIC BOARDING SCHOOL'}</h2>\n  <p style="margin: 4px 0; font-size: 10pt;">${baseProfile.address || 'Jl. Raya Aldepos, Sukabumi'}</p>\n  <p style="margin: 2px 0; font-size: 9pt;">Telp: ${baseProfile.phone_number || '-'} | Email: ${baseProfile.email || '-'}</p>\n</div>`,
                  is_default: letterheads.length === 0 ? 1 : 0,
                });
                setModalType('letterhead');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
            >
              <Plus className="w-4 h-4" />
              Tambah Kop Surat
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {letterheads.length === 0 ? (
              <div className="md:col-span-2 py-8 text-center text-slate-500">
                Belum ada template kop surat yang dibuat.
              </div>
            ) : (
              letterheads.map((lh) => (
                <div
                  key={lh.id}
                  className={`p-5 rounded-2xl bg-slate-950 border transition flex flex-col justify-between space-y-4 ${
                    lh.is_default ? 'border-indigo-500 shadow-lg shadow-indigo-950/40' : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-bold text-white text-sm flex items-center gap-2">
                        {lh.name}
                        {lh.is_default === 1 && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold border border-indigo-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Default
                          </span>
                        )}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem(lh);
                            setFormData({
                              name: lh.name,
                              logo_file_url: lh.logo_file_url,
                              header_html: lh.header_html,
                              is_default: lh.is_default,
                            });
                            setModalType('letterhead');
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('letterhead', lh.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Preview Box */}
                    <div
                      className="p-4 rounded-xl bg-white text-black text-xs overflow-x-auto shadow-inner min-h-[100px]"
                      dangerouslySetInnerHTML={{ __html: lh.header_html || '<p class="text-slate-400 italic">Header HTML kosong</p>' }}
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Diperbarui: {new Date(lh.updated_at).toLocaleDateString('id-ID')}
                    </span>

                    {lh.is_default !== 1 && (
                      <button
                        onClick={() => handleSetDefault('letterhead', lh.id)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Jadikan Default
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CAP STEMPEL */}
      {activeTab === 'stamps' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Stamp className="w-5 h-5 text-indigo-400" />
                Daftar Cap Stempel Resmi
              </h2>
              <p className="text-xs text-slate-400">
                Penyimpanan master cap stempel digital dan basah untuk validasi dokumen penerbitan
              </p>
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  name: `Stempel Resmi ${contextType === 'foundation' ? 'Yayasan' : 'Sekolah'}`,
                  stamp_type: 'digital',
                  image_file_url: '',
                  is_default: stamps.length === 0 ? 1 : 0,
                });
                setModalType('stamp');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
            >
              <Plus className="w-4 h-4" />
              Tambah Cap Stempel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {stamps.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500">
                Belum ada cap stempel yang ditambahkan.
              </div>
            ) : (
              stamps.map((st) => (
                <div
                  key={st.id}
                  className={`p-5 rounded-2xl bg-slate-950 border transition flex flex-col justify-between space-y-4 ${
                    st.is_default ? 'border-indigo-500 shadow-lg shadow-indigo-950/40' : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">{st.name}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 uppercase">
                        {st.stamp_type}
                      </span>
                    </div>

                    {/* Stamp Image Preview */}
                    <div className="w-full h-36 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-3 overflow-hidden">
                      {st.image_file_url ? (
                        <img
                          src={st.image_file_url}
                          alt={st.name}
                          className="max-h-full max-w-full object-contain filter drop-shadow"
                        />
                      ) : (
                        <Stamp className="w-12 h-12 text-slate-700" />
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    {st.is_default === 1 ? (
                      <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Default
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault('stamp', st.id)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Set Default
                      </button>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingItem(st);
                          setFormData({
                            name: st.name,
                            stamp_type: st.stamp_type,
                            image_file_url: st.image_file_url,
                            is_default: st.is_default,
                          });
                          setModalType('stamp');
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete('stamp', st.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TANDA TANGAN PEJABAT */}
      {activeTab === 'signatures' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <PenTool className="w-5 h-5 text-indigo-400" />
                Specimen Tanda Tangan Pejabat
              </h2>
              <p className="text-xs text-slate-400">
                Spesimen tanda tangan digital pejabat berwenang untuk disematkan pada dokumen resmi
              </p>
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  position_title: contextType === 'foundation' ? 'Ketua Yayasan' : 'Kepala Sekolah',
                  signature_image_url: '',
                  is_default: signatures.length === 0 ? 1 : 0,
                });
                setModalType('signature');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
            >
              <Plus className="w-4 h-4" />
              Tambah Specimen
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {signatures.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500">
                Belum ada specimen tanda tangan yang ditambahkan.
              </div>
            ) : (
              signatures.map((sig) => (
                <div
                  key={sig.id}
                  className={`p-5 rounded-2xl bg-slate-950 border transition flex flex-col justify-between space-y-4 ${
                    sig.is_default ? 'border-indigo-500 shadow-lg shadow-indigo-950/40' : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white">{sig.position_title}</h4>
                        <p className="text-xs text-slate-400">
                          {sig.employee_id ? `Pegawai ID #${sig.employee_id}` : 'Pejabat Penandatangan'}
                        </p>
                      </div>

                      {sig.is_default === 1 && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold border border-indigo-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>

                    {/* Signature Preview */}
                    <div className="w-full h-36 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-3 overflow-hidden">
                      {sig.signature_image_url ? (
                        <img
                          src={sig.signature_image_url}
                          alt={sig.position_title}
                          className="max-h-full max-w-full object-contain filter invert contrast-200"
                        />
                      ) : (
                        <PenTool className="w-12 h-12 text-slate-700" />
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {sig.is_default !== 1 ? (
                      <button
                        onClick={() => handleSetDefault('signature', sig.id)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Jadikan Default
                      </button>
                    ) : (
                      <span className="text-slate-500">Penandatangan Utama</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingItem(sig);
                          setFormData({
                            employee_id: sig.employee_id,
                            position_title: sig.position_title,
                            signature_image_url: sig.signature_image_url,
                            is_default: sig.is_default,
                          });
                          setModalType('signature');
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete('signature', sig.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {modalType && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingItem ? 'Edit Data' : 'Tambah Data'} -{' '}
                {modalType === 'doc'
                  ? 'Dokumen Legalitas'
                  : modalType === 'letterhead'
                  ? 'Kop Surat'
                  : modalType === 'stamp'
                  ? 'Cap Stempel'
                  : 'Specimen Tanda Tangan'}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-white transition text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* DOC MODAL */}
              {modalType === 'doc' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Jenis Dokumen Legalitas</label>
                    <select
                      value={formData.legal_document_type_id || ''}
                      onChange={(e) => setFormData({ ...formData, legal_document_type_id: e.target.value })}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    >
                      {docTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nomor Dokumen / SK</label>
                    <input
                      type="text"
                      value={formData.document_number || ''}
                      onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                      placeholder="Contoh: AHU-0012345.AH.01.04.Tahun 2020"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Instansi Penerbit</label>
                    <input
                      type="text"
                      value={formData.issuing_authority || ''}
                      onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                      placeholder="Contoh: Kemenkumham RI / Dinas Pendidikan"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tanggal Terbit</label>
                      <DatePickerField
                        value={formData.issued_date || ''}
                        onChange={(iso) => setFormData({ ...formData, issued_date: iso })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tanggal Kadaluarsa (Jika Ada)</label>
                      <DatePickerField
                        value={formData.expiry_date || ''}
                        min={formData.issued_date || undefined}
                        onChange={(iso) => setFormData({ ...formData, expiry_date: iso })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status Dokumen</label>
                    <select
                      value={formData.status || 'berlaku'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="berlaku">Berlaku Aktif</option>
                      <option value="kadaluarsa">Kadaluarsa</option>
                      <option value="dalam_proses">Dalam Proses Perpanjangan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">URL File Dokumen (PDF / Scan)</label>
                    <input
                      type="text"
                      value={formData.file_url || ''}
                      onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                      placeholder="https://... atau /uploads/..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              {/* LETTERHEAD MODAL */}
              {modalType === 'letterhead' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nama Template Kop Surat</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Contoh: Kop Surat Resmi Yayasan 2026"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Template Header HTML</label>
                    <textarea
                      rows={6}
                      value={formData.header_html || ''}
                      onChange={(e) => setFormData({ ...formData, header_html: e.target.value })}
                      placeholder="<div>...</div>"
                      className="w-full font-mono bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="lh_default"
                      checked={formData.is_default === 1 || formData.is_default === true}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked ? 1 : 0 })}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="lh_default" className="text-xs text-slate-300">
                      Jadikan Kop Surat Default untuk entitas ini
                    </label>
                  </div>
                </>
              )}

              {/* STAMP MODAL */}
              {modalType === 'stamp' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nama Cap Stempel</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Contoh: Stempel Resmi Yayasan"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipe Stempel</label>
                    <select
                      value={formData.stamp_type || 'digital'}
                      onChange={(e) => setFormData({ ...formData, stamp_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="digital">Digital (Transparan PNG)</option>
                      <option value="basah">Basah (Scan Fisik)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">URL Gambar Stempel (PNG / SVG Transparan)</label>
                    <input
                      type="text"
                      value={formData.image_file_url || ''}
                      onChange={(e) => setFormData({ ...formData, image_file_url: e.target.value })}
                      required
                      placeholder="https://.../stempel.png"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="st_default"
                      checked={formData.is_default === 1 || formData.is_default === true}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked ? 1 : 0 })}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="st_default" className="text-xs text-slate-300">
                      Jadikan Stempel Default
                    </label>
                  </div>
                </>
              )}

              {/* SIGNATURE MODAL */}
              {modalType === 'signature' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Jabatan Tercetak</label>
                    <input
                      type="text"
                      value={formData.position_title || ''}
                      onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                      required
                      placeholder="Contoh: Kepala Sekolah / Ketua Yayasan"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pilih Pegawai Penandatangan (Opsional)</label>
                    <select
                      value={formData.employee_id || ''}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Pilih Pegawai --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name || emp.full_name} ({emp.nip || emp.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">URL Gambar Tanda Tangan (PNG Transparan)</label>
                    <input
                      type="text"
                      value={formData.signature_image_url || ''}
                      onChange={(e) => setFormData({ ...formData, signature_image_url: e.target.value })}
                      placeholder="https://.../signature.png"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sig_default"
                      checked={formData.is_default === 1 || formData.is_default === true}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked ? 1 : 0 })}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="sig_default" className="text-xs text-slate-300">
                      Jadikan Penandatangan Default
                    </label>
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
