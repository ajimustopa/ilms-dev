import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  ShieldCheck,
  Users,
  Settings,
  Layers,
  HelpCircle
} from 'lucide-react';
import api from '../../../../../shared/services/api';

const CATEGORY_OPTIONS = [
  { value: 'annual', label: 'Cuti Tahunan (Annual)', desc: 'Memotong saldo kuota tahunan' },
  { value: 'special', label: 'Cuti Khusus / Alasan Penting', desc: 'Melahirkan, menikah, duka, ibadah, dll.' },
  { value: 'sick', label: 'Sakit (Sick)', desc: 'Surat dokter bila ≥ 2 hari kerja' },
  { value: 'permit', label: 'Izin Pribadi (Permit)', desc: 'Keperluan mendesak' },
  { value: 'official', label: 'Dinas Luar / Tugas Resmi', desc: 'Dihitung hadir bertugas' },
  { value: 'unpaid', label: 'Cuti di Luar Tanggungan (Unpaid)', desc: 'Tanpa bayaran gaji' },
  { value: 'other', label: 'Lainnya (Other / Generic)', desc: 'Perlu verifikasi reklasifikasi HRD' }
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'gty', label: 'GTY (Guru Tetap Yayasan)' },
  { value: 'pty', label: 'PTY (Pegawai Tetap Yayasan)' },
  { value: 'gtt', label: 'GTT (Guru Tidak Tetap)' },
  { value: 'ptt', label: 'PTT (Pegawai Tidak Tetap)' },
  { value: 'honorer', label: 'Honorer / Kontrak' }
];

const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Belum Menikah (Single)' },
  { value: 'married', label: 'Menikah (Married)' },
  { value: 'divorced', label: 'Cerai Hidup (Divorced)' },
  { value: 'widowed', label: 'Cerai Mati (Widowed)' }
];

const PRESET_COLORS = [
  '#006948', '#0284c7', '#4b41e1', '#d97706', '#dc2626',
  '#7c3aed', '#059669', '#475569', '#db2777', '#0891b2'
];

export default function LeaveTypeFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingType,
  approvalProfiles = [],
  balancePolicies = []
}) {
  const [activeTab, setActiveTab] = useState('umum');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const isEdit = Boolean(editingType && editingType.id);
  const isSystem = Boolean(editingType?.is_system);

  const initialForm = {
    code: '',
    name: '',
    category: 'special',
    description: '',
    color: '#006948',
    sort_order: 10,
    is_active: true,
    count_mode: 'work_days',
    deducts_balance: false,
    balance_policy_id: 1,
    max_days_per_request: '',
    max_days_per_year: '',
    max_occurrences_lifetime: '',
    half_day_allowed: false,
    attachment_rule: 'optional',
    attachment_required_after_days: '',
    gender_restriction: 'any',
    eligible_employment_statuses: ['gty', 'pty'],
    eligible_marital_statuses: [],
    min_service_months: 0,
    min_notice_days: 0,
    max_backdate_days: 0,
    payroll_pay_percent: 100,
    affects_attendance_allowance: false,
    affects_discipline: false,
    attendance_status: 'permitted',
    attendance_sub_status: 'cuti',
    approval_profile_id: 1,
    visible_in_self_service: true,
    reason_required: true
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    if (editingType) {
      let empStatuses = editingType.eligible_employment_statuses;
      if (typeof empStatuses === 'string') {
        try { empStatuses = JSON.parse(empStatuses); } catch (e) { empStatuses = []; }
      }
      if (!Array.isArray(empStatuses)) empStatuses = [];

      let marStatuses = editingType.eligible_marital_statuses;
      if (typeof marStatuses === 'string') {
        try { marStatuses = JSON.parse(marStatuses); } catch (e) { marStatuses = []; }
      }
      if (!Array.isArray(marStatuses)) marStatuses = [];

      setFormData({
        code: editingType.code || '',
        name: editingType.name || '',
        category: editingType.category || 'special',
        description: editingType.description || '',
        color: editingType.color || '#006948',
        sort_order: editingType.sort_order ?? 10,
        is_active: Boolean(editingType.is_active),
        count_mode: editingType.count_mode || 'work_days',
        deducts_balance: Boolean(editingType.deducts_balance),
        balance_policy_id: editingType.balance_policy_id || 1,
        max_days_per_request: editingType.max_days_per_request ?? '',
        max_days_per_year: editingType.max_days_per_year ?? '',
        max_occurrences_lifetime: editingType.max_occurrences_lifetime ?? '',
        half_day_allowed: Boolean(editingType.half_day_allowed),
        attachment_rule: editingType.attachment_rule || 'optional',
        attachment_required_after_days: editingType.attachment_required_after_days ?? '',
        gender_restriction: editingType.gender_restriction || 'any',
        eligible_employment_statuses: empStatuses,
        eligible_marital_statuses: marStatuses,
        min_service_months: editingType.min_service_months ?? 0,
        min_notice_days: editingType.min_notice_days ?? 0,
        max_backdate_days: editingType.max_backdate_days ?? 0,
        payroll_pay_percent: editingType.payroll_pay_percent ?? 100,
        affects_attendance_allowance: Boolean(editingType.affects_attendance_allowance),
        affects_discipline: Boolean(editingType.affects_discipline),
        attendance_status: editingType.attendance_status || 'permitted',
        attendance_sub_status: editingType.attendance_sub_status || 'cuti',
        approval_profile_id: editingType.approval_profile_id || 1,
        visible_in_self_service: Boolean(editingType.visible_in_self_service ?? true),
        reason_required: Boolean(editingType.reason_required ?? true)
      });
    } else {
      setFormData(initialForm);
    }
    setErrorMsg(null);
    setActiveTab('umum');
  }, [editingType, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Invariant guards: if category changes to non-annual or count_mode to calendar_days, force deducts_balance = false
      if (field === 'category' && value !== 'annual') {
        next.deducts_balance = false;
      }
      if (field === 'count_mode' && value === 'calendar_days') {
        next.deducts_balance = false;
      }
      if (field === 'deducts_balance' && value === true) {
        if (next.category !== 'annual') next.category = 'annual';
        if (next.count_mode === 'calendar_days') next.count_mode = 'work_days';
      }
      return next;
    });
  };

  const handleToggleArrayItem = (field, itemValue) => {
    setFormData((prev) => {
      const list = Array.isArray(prev[field]) ? [...prev[field]] : [];
      const idx = list.indexOf(itemValue);
      if (idx >= 0) {
        list.splice(idx, 1);
      } else {
        list.push(itemValue);
      }
      return { ...prev, [field]: list };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...formData,
        code: formData.code.trim().toLowerCase(),
        name: formData.name.trim(),
        max_days_per_request: formData.max_days_per_request !== '' ? Number(formData.max_days_per_request) : null,
        max_days_per_year: formData.max_days_per_year !== '' ? Number(formData.max_days_per_year) : null,
        max_occurrences_lifetime: formData.max_occurrences_lifetime !== '' ? Number(formData.max_occurrences_lifetime) : null,
        attachment_required_after_days: formData.attachment_required_after_days !== '' ? Number(formData.attachment_required_after_days) : null,
        payroll_pay_percent: formData.payroll_pay_percent !== '' && formData.payroll_pay_percent !== null ? Number(formData.payroll_pay_percent) : null,
        min_service_months: Number(formData.min_service_months || 0),
        min_notice_days: Number(formData.min_notice_days || 0),
        max_backdate_days: Number(formData.max_backdate_days || 0),
        sort_order: Number(formData.sort_order || 0),
        approval_profile_id: formData.approval_profile_id ? Number(formData.approval_profile_id) : null,
        balance_policy_id: formData.deducts_balance ? Number(formData.balance_policy_id || 1) : null,
        eligible_employment_statuses: formData.eligible_employment_statuses.length > 0 ? formData.eligible_employment_statuses : null,
        eligible_marital_statuses: formData.eligible_marital_statuses.length > 0 ? formData.eligible_marital_statuses : null
      };

      if (isEdit) {
        const res = await api.put(`/kepegawaian/leave-types/${editingType.id}`, payload);
        if (res.data?.success) {
          onSuccess(res.data.data, 'Jenis cuti berhasil diperbarui');
          onClose();
        }
      } else {
        const res = await api.post('/kepegawaian/leave-types', payload);
        if (res.data?.success) {
          onSuccess(res.data.data, 'Jenis cuti baru berhasil ditambahkan');
          onClose();
        }
      }
    } catch (err) {
      console.error('Save leave type error:', err);
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan konfigurasi jenis cuti';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  // Generate Realtime "Aturan dalam Kalimat" preview for HRD
  const generateRuleSentence = () => {
    const parts = [];
    const catLabel = CATEGORY_OPTIONS.find((c) => c.value === formData.category)?.label || formData.category;
    parts.push(`Jenis **"${formData.name || 'Cuti Tanpa Nama'}"** berkategori **${catLabel}**.`);

    if (formData.count_mode === 'calendar_days') {
      parts.push(`Dihitung berdasarkan **Hari Kalender**.`);
    } else {
      parts.push(`Dihitung dalam **Hari Kerja (HK)**.`);
    }

    if (formData.deducts_balance) {
      parts.push(`**Memotong kuota saldo cuti tahunan**.`);
    } else {
      parts.push(`**Tidak memotong saldo kuota** tahunan.`);
    }

    if (formData.max_days_per_request) {
      parts.push(`Maksimal durasi **${formData.max_days_per_request} hari/pengajuan**.`);
    }
    if (formData.max_days_per_year) {
      parts.push(`Batas akumulasi **${formData.max_days_per_year} hari/tahun ajaran**.`);
    }
    if (formData.max_occurrences_lifetime) {
      parts.push(`Dibatasi maksimal **${formData.max_occurrences_lifetime} kali seumur kerja**.`);
    }

    if (formData.gender_restriction === 'female') {
      parts.push(`Khusus pegawai **Perempuan**.`);
    } else if (formData.gender_restriction === 'male') {
      parts.push(`Khusus pegawai **Laki-laki**.`);
    }

    if (formData.eligible_marital_statuses?.length > 0) {
      const mLabels = formData.eligible_marital_statuses.map(
        (m) => MARITAL_STATUS_OPTIONS.find((opt) => opt.value === m)?.label || m
      );
      parts.push(`Hanya untuk status nikah: **${mLabels.join(', ')}**.`);
    }

    if (formData.min_notice_days > 0) {
      parts.push(`Wajib diajukan minimal **H-${formData.min_notice_days}**.`);
    }
    if (formData.max_backdate_days > 0) {
      parts.push(`Toleransi pengajuan susulan maksimal **${formData.max_backdate_days} hari ke belakang**.`);
    }

    if (formData.attachment_rule === 'required') {
      parts.push(`Surat bukti / lampiran **Wajib Diunggah**.`);
    } else if (formData.attachment_rule === 'required_after_days') {
      parts.push(`Lampiran wajib bila durasi **≥ ${formData.attachment_required_after_days || 2} hari**.`);
    }

    if (formData.payroll_pay_percent !== null && formData.payroll_pay_percent !== '') {
      parts.push(`Hak gaji dibayarkan **${formData.payroll_pay_percent}%**.`);
    } else {
      parts.push(`Gaji belum ditentukan (menunggu keputusan yayasan/reklasifikasi).`);
    }

    const selectedProfile = approvalProfiles.find((p) => p.id === Number(formData.approval_profile_id));
    if (selectedProfile) {
      parts.push(`Diverifikasi melalui profil approval **${selectedProfile.name}**.`);
    }

    return parts.join(' ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm font-bold"
              style={{ backgroundColor: formData.color || '#006948' }}
            >
              {formData.code ? formData.code.slice(0, 2).toUpperCase() : 'CT'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-on-surface">
                  {isEdit ? 'Ubah Konfigurasi Jenis Cuti & Izin' : 'Tambah Jenis Cuti & Izin Baru'}
                </h2>
                {isSystem && (
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high border border-outline-variant/30 text-primary font-mono text-[11px] font-bold">
                    Sistem (Terkunci)
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant">
                Konfigurasi parameter kebijakan, kuota, syarat peserta, dan profil verifikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realtime Sentence Preview Banner */}
        <div className="px-6 py-3 bg-surface-container-low/80 border-b border-outline-variant/15 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-on-surface-variant leading-relaxed">
            <span className="font-bold text-primary mr-1">Pratinjau Aturan:</span>
            <span dangerouslySetInnerHTML={{
              __html: generateRuleSentence().replace(/\*\*(.*?)\*\*/g, '<strong class="text-on-surface font-semibold">$1</strong>')
            }} />
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-outline-variant/20 bg-surface-container-lowest gap-2 overflow-x-auto text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('umum')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'umum'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            Umum & Kategori
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hitung')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'hitung'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Hitung Hari & Kuota
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('syarat')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'syarat'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Syarat Peserta
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('waktu_lampiran')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'waktu_lampiran'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Waktu & Lampiran
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payroll_approval')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'payroll_approval'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Payroll & Approval
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-error-container/40 border border-error/30 text-on-error-container text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMsg}</div>
            </div>
          )}

          {/* TAB 1: UMUM */}
          {activeTab === 'umum' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Nama Jenis Cuti <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Contoh: Cuti Tahunan"
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Kode Unik (Snake Case) <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isSystem}
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="contoh: cuti_tahunan"
                    className={`w-full h-9 px-3 rounded-lg border font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      isSystem
                        ? 'bg-surface-container-high text-outline cursor-not-allowed border-outline-variant/30'
                        : 'bg-surface-container-low border-outline-variant/40 text-on-surface'
                    }`}
                  />
                  {isSystem && (
                    <p className="text-[11px] text-outline mt-1">Kode jenis bawaan sistem terkunci untuk konsistensi API.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Kategori Kebijakan <span className="text-error">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Urutan Tampil</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => handleChange('sort_order', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Deskripsi & Catatan Kebijakan</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Keterangan singkat regulasi cuti..."
                  className="w-full p-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Warna Label / Tag</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handleChange('color', col)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        formData.color === col ? 'scale-110 border-slate-900 shadow-sm' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-outline-variant/40 cursor-pointer bg-transparent"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-6 border-t border-outline-variant/20">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  Status Aktif (Dapat dipilih)
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface">
                  <input
                    type="checkbox"
                    checked={formData.visible_in_self_service}
                    onChange={(e) => handleChange('visible_in_self_service', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  Tampil di Portal Mandiri Guru / Staf
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: HITUNG HARI & KUOTA */}
          {activeTab === 'hitung' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Metode Perhitungan Hari <span className="text-error">*</span>
                  </label>
                  <select
                    value={formData.count_mode}
                    onChange={(e) => handleChange('count_mode', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="work_days">Hari Kerja (HK) - Libur & Akhir Pekan Tidak Dihitung</option>
                    <option value="calendar_days">Hari Kalender - Libur & Akhir Pekan Tetap Dihitung</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface p-2 rounded-lg border border-outline-variant/30 bg-surface-container-low">
                    <input
                      type="checkbox"
                      disabled={formData.category !== 'annual' || formData.count_mode === 'calendar_days'}
                      checked={formData.deducts_balance}
                      onChange={(e) => handleChange('deducts_balance', e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <span>Memotong Kuota Saldo Cuti Tahunan</span>
                  </label>
                  {formData.category !== 'annual' && (
                    <p className="text-[11px] text-outline mt-1">Invarian: Hanya kategori 'annual' yang boleh memotong saldo.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Maks. Hari per Pengajuan</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.max_days_per_request}
                    onChange={(e) => handleChange('max_days_per_request', e.target.value)}
                    placeholder="Kosongkan jika bebas"
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-[11px] text-outline mt-1">Contoh: 2 hari untuk izin pribadi</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Maks. Hari per Tahun</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.max_days_per_year}
                    onChange={(e) => handleChange('max_days_per_year', e.target.value)}
                    placeholder="Kosongkan jika bebas"
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-[11px] text-outline mt-1">Akumulasi per periode tahun ajaran</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Maks. Seumur Kerja</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_occurrences_lifetime}
                    onChange={(e) => handleChange('max_occurrences_lifetime', e.target.value)}
                    placeholder="Kosongkan jika bebas"
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-[11px] text-outline mt-1">Contoh: 1 kali untuk nikah/haji</p>
                </div>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-on-surface">Izinkan Pengajuan Setengah Hari (AM / PM)</div>
                  <div className="text-[11px] text-on-surface-variant">Bobot 0.5 hari kerja untuk pagi atau siang</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.half_day_allowed}
                  onChange={(e) => handleChange('half_day_allowed', e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* TAB 3: SYARAT PESERTA */}
          {activeTab === 'syarat' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Pembatasan Gender</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'any', label: 'Semua Gender' },
                    { value: 'female', label: 'Khusus Perempuan (Melahirkan/Keguguran)' },
                    { value: 'male', label: 'Khusus Laki-laki (Istri Melahirkan)' }
                  ].map((g) => (
                    <label
                      key={g.value}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-medium ${
                        formData.gender_restriction === g.value
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender_restriction"
                        value={g.value}
                        checked={formData.gender_restriction === g.value}
                        onChange={() => handleChange('gender_restriction', g.value)}
                        className="text-primary focus:ring-primary"
                      />
                      <span>{g.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Status Kepegawaian yang Berhak (Eligible Employment Status)
                </label>
                <p className="text-[11px] text-on-surface-variant mb-2">Pilih status yang berhak mengajukan jenis cuti ini:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EMPLOYMENT_STATUS_OPTIONS.map((st) => (
                    <label
                      key={st.value}
                      className="flex items-center gap-2 p-2 rounded-lg border border-outline-variant/30 bg-surface-container-low cursor-pointer text-xs text-on-surface"
                    >
                      <input
                        type="checkbox"
                        checked={formData.eligible_employment_statuses.includes(st.value)}
                        onChange={() => handleToggleArrayItem('eligible_employment_statuses', st.value)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                      />
                      <span>{st.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Status Pernikahan yang Berhak (Opsional)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MARITAL_STATUS_OPTIONS.map((ms) => (
                    <label
                      key={ms.value}
                      className="flex items-center gap-2 p-2 rounded-lg border border-outline-variant/30 bg-surface-container-low cursor-pointer text-xs text-on-surface"
                    >
                      <input
                        type="checkbox"
                        checked={formData.eligible_marital_statuses.includes(ms.value)}
                        onChange={() => handleToggleArrayItem('eligible_marital_statuses', ms.value)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                      />
                      <span>{ms.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Minimal Masa Kerja (Bulan)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_service_months}
                  onChange={(e) => handleChange('min_service_months', e.target.value)}
                  className="w-full max-w-xs h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-[11px] text-outline mt-1">0 = langsung berhak sejak tanggal bergabung (join_date)</p>
              </div>
            </div>
          )}

          {/* TAB 4: WAKTU & LAMPIRAN */}
          {activeTab === 'waktu_lampiran' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Minimal Lead Time / Notice (Hari Sebelumnya)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_notice_days}
                    onChange={(e) => handleChange('min_notice_days', e.target.value)}
                    placeholder="Contoh: 3 untuk H-3"
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-[11px] text-outline mt-1">0 = boleh diajukan pada hari H</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Maks. Pengajuan Mundur / Backdate (Hari)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_backdate_days}
                    onChange={(e) => handleChange('max_backdate_days', e.target.value)}
                    placeholder="Contoh: 7 untuk sakit"
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-[11px] text-outline mt-1">Toleransi input susulan untuk kejadian tak terduga</p>
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant/20">
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Aturan Lampiran / Bukti Pendukung
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { value: 'none', label: 'Tidak Diperlukan (None)', desc: 'Pengajuan tanpa berkas' },
                    { value: 'optional', label: 'Opsional (Optional)', desc: 'Boleh dilampirkan atau tidak' },
                    { value: 'required', label: 'Wajib Selalu (Required)', desc: 'Tidak bisa dikirim tanpa lampiran' },
                    { value: 'required_after_days', label: 'Wajib Jika Melewati Batas Hari', desc: 'Wajib bila durasi ≥ ambang hari' }
                  ].map((att) => (
                    <label
                      key={att.value}
                      className={`p-3 rounded-lg border cursor-pointer flex flex-col gap-0.5 ${
                        formData.attachment_rule === att.value
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="attachment_rule"
                          value={att.value}
                          checked={formData.attachment_rule === att.value}
                          onChange={() => handleChange('attachment_rule', att.value)}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-bold">{att.label}</span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant pl-6">{att.desc}</span>
                    </label>
                  ))}
                </div>

                {formData.attachment_rule === 'required_after_days' && (
                  <div className="mt-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex items-center gap-3">
                    <label className="text-xs font-bold text-on-surface">Wajib Lampiran jika Durasi ≥</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.attachment_required_after_days}
                      onChange={(e) => handleChange('attachment_required_after_days', e.target.value)}
                      placeholder="2"
                      className="w-20 h-8 px-2 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface"
                    />
                    <span className="text-xs text-on-surface-variant">Hari Kerja (Contoh: Surat Dokter untuk Sakit ≥ 2 HK)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PAYROLL & APPROVAL */}
          {activeTab === 'payroll_approval' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Persentase Gaji Dibayarkan (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.payroll_pay_percent ?? ''}
                    onChange={(e) => handleChange('payroll_pay_percent', e.target.value)}
                    placeholder="100"
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-[11px] text-outline mt-1">100 = digaji penuh; 0 = cuti tanpa gaji / unpaid</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Profil Alur Persetujuan (Approval Profile)
                  </label>
                  <select
                    value={formData.approval_profile_id || ''}
                    onChange={(e) => handleChange('approval_profile_id', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {approvalProfiles.map((prof) => (
                      <option key={prof.id} value={prof.id}>
                        {prof.name} ({prof.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-3">
                <div className="text-xs font-bold text-on-surface">Dampak Presensi & Payroll</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                    <input
                      type="checkbox"
                      checked={formData.affects_attendance_allowance}
                      onChange={(e) => handleChange('affects_attendance_allowance', e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <span>Hanguskan Tunjangan Kehadiran Hari Itu</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                    <input
                      type="checkbox"
                      checked={formData.affects_discipline}
                      onChange={(e) => handleChange('affects_discipline', e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <span>Masuk Catatan Indeks Disiplin Pegawai</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Status Presensi Terkait</label>
                  <input
                    type="text"
                    value={formData.attendance_status}
                    onChange={(e) => handleChange('attendance_status', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-[11px] text-outline mt-1">Status di tabel presensi: permitted, sick, absent</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Sub Status Presensi</label>
                  <input
                    type="text"
                    value={formData.attendance_sub_status}
                    onChange={(e) => handleChange('attendance_sub_status', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-[11px] text-outline mt-1">Sub-kategori: cuti, izin, dinas_luar, sakit</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between shrink-0">
            <div className="text-xs text-outline">
              {isEdit ? `ID Record: ${editingType.id}` : 'Record baru akan dibuat aktif secara default'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEdit ? 'Simpan Perubahan' : 'Buat Jenis Cuti'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
