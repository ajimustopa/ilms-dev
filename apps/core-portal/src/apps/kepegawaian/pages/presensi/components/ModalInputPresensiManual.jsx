import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Sparkles,
  ShieldCheck,
  Building2,
  Calendar,
  LogIn,
  LogOut,
  Upload,
  FileText,
  RotateCcw
} from 'lucide-react';

const TODAY_STR = new Date().toISOString().split('T')[0];

export default function ModalInputPresensiManual({
  isOpen,
  onClose,
  employees = [],
  onSaveSingle,
  onSaveBulk,
  activeSchoolUnitId
}) {
  const [tab, setTab] = useState('single'); // 'single' | 'bulk'
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Single Form State
  const [singleSearch, setSingleSearch] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [singleForm, setSingleForm] = useState({
    employee_id: '',
    attendance_date: TODAY_STR,
    status: 'present',
    sub_status: 'Hadir (Manual)',
    check_in_time: '07:00',
    check_out_time: '16:00',
    reason: '',
    notes: '',
    overwrite: false
  });

  // Bulk Form State
  const [bulkUnitFilter, setBulkUnitFilter] = useState('');
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  const [bulkForm, setBulkForm] = useState({
    attendance_date: TODAY_STR,
    status: 'duty_travel',
    sub_status: 'Dinas Luar',
    check_in_time: '07:30',
    check_out_time: '15:30',
    reason: '',
    overwrite: true
  });

  // Filtered employees for single picker
  const filteredSingleEmployees = useMemo(() => {
    if (!singleSearch.trim()) return employees;
    const s = singleSearch.toLowerCase();
    return employees.filter(
      (e) =>
        (e.full_name && e.full_name.toLowerCase().includes(s)) ||
        (e.employee_number && e.employee_number.includes(s)) ||
        (e.job_title && e.job_title.toLowerCase().includes(s))
    );
  }, [employees, singleSearch]);

  // Selected employee object for single tab
  const selectedEmployee = useMemo(() => {
    return employees.find((e) => String(e.id) === String(singleForm.employee_id)) || null;
  }, [employees, singleForm.employee_id]);

  // Filtered employees for bulk picker
  const filteredBulkEmployees = useMemo(() => {
    if (!bulkUnitFilter) return employees;
    return employees.filter((e) => String(e.school_unit_id) === String(bulkUnitFilter));
  }, [employees, bulkUnitFilter]);

  if (!isOpen) return null;

  // Helper Initials
  const getInitials = (name) => {
    if (!name) return 'P';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const applyPresetNormal = () => {
    setSingleForm((prev) => ({
      ...prev,
      check_in_time: '07:00',
      check_out_time: '16:00'
    }));
  };

  const handleResetSingle = () => {
    setSingleForm({
      employee_id: '',
      attendance_date: TODAY_STR,
      status: 'present',
      sub_status: 'Hadir (Manual)',
      check_in_time: '07:00',
      check_out_time: '16:00',
      reason: '',
      notes: '',
      overwrite: false
    });
    setSingleSearch('');
    setErrorMsg('');
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!singleForm.employee_id) {
      setErrorMsg('Pilih salah satu pegawai terlebih dahulu.');
      return;
    }
    if (!singleForm.reason.trim()) {
      setErrorMsg('Alasan input manual wajib diisi untuk kebutuhan audit.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await onSaveSingle({
        ...singleForm,
        check_in_time: singleForm.check_in_time ? `${singleForm.check_in_time}:00` : null,
        check_out_time: singleForm.check_out_time ? `${singleForm.check_out_time}:00` : null,
        school_unit_id: selectedEmployee?.school_unit_id || activeSchoolUnitId || 1
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan presensi manual');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (bulkSelectedIds.length === 0) {
      setErrorMsg('Pilih minimal satu pegawai untuk input presensi masal.');
      return;
    }
    if (!bulkForm.reason.trim()) {
      setErrorMsg('Agenda / alasan rekonsiliasi massal wajib diisi.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await onSaveBulk({
        employee_ids: bulkSelectedIds,
        ...bulkForm,
        check_in_time: bulkForm.check_in_time ? `${bulkForm.check_in_time}:00` : null,
        check_out_time: bulkForm.check_out_time ? `${bulkForm.check_out_time}:00` : null,
        school_unit_id: activeSchoolUnitId || 1
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan presensi masal');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBulkSelectAll = () => {
    if (bulkSelectedIds.length === filteredBulkEmployees.length) {
      setBulkSelectedIds([]);
    } else {
      setBulkSelectedIds(filteredBulkEmployees.map((e) => e.id));
    }
  };

  const toggleBulkSelect = (id) => {
    setBulkSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      {/* Modal Dialog Card (Matching Stitch aldepos_input_presensi_manual_modal) */}
      <div className="relative w-full max-w-[760px] bg-white rounded-2xl shadow-2xl flex flex-col my-auto overflow-hidden border border-slate-200">
        {/* Top Color Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-sky-600"></div>

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3 bg-white flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs mt-0.5 border border-emerald-200">
              <Calendar className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Input Presensi Manual
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Koreksi HRIS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tambahkan atau koreksi log kehadiran pegawai secara manual untuk pencatatan resmi yayasan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tab Switcher (Pill Style) */}
        <div className="px-6 pb-2 pt-1 bg-white">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('single')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                tab === 'single'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4 text-emerald-600" />
              <span>Satu Pegawai</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('bulk')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                tab === 'bulk'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-sky-600" />
              <span>Massal (Banyak Pegawai)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                Batch
              </span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-6 mt-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Content 1: Satu Pegawai */}
        {tab === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="px-6 py-4 space-y-4 max-h-[calc(85vh-200px)] overflow-y-auto text-xs">
            {/* 1. Searchable Employee Selection Card */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 flex items-center justify-between">
                <span>Pilih Pegawai <span className="text-rose-600">*</span></span>
                <span className="text-[11px] text-slate-400 font-normal">Ketik Nama atau NIP</span>
              </label>

              {selectedEmployee ? (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                      {getInitials(selectedEmployee.full_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {selectedEmployee.full_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
                          {selectedEmployee.employment_status || 'Tetap (GTY)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono truncate">
                        <span>NIP. {selectedEmployee.employee_number || '-'}</span>
                        <span>&bull;</span>
                        <span className="text-slate-700">{selectedEmployee.job_title || 'Tenaga Pendidik'}</span>
                        <span>&bull;</span>
                        <span className="text-emerald-700 font-semibold">{selectedEmployee.school_unit_name || 'Aldepos'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSingleForm({ ...singleForm, employee_id: '' });
                      setIsEmployeeDropdownOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Ganti Pegawai"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={singleSearch}
                      onChange={(e) => {
                        setSingleSearch(e.target.value);
                        setIsEmployeeDropdownOpen(true);
                      }}
                      onFocus={() => setIsEmployeeDropdownOpen(true)}
                      placeholder="Cari nama pegawai atau NIP..."
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Dropdown Results List */}
                  {isEmployeeDropdownOpen && (
                    <div className="absolute top-11 left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 p-1">
                      {filteredSingleEmployees.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-xs">
                          Pegawai tidak ditemukan
                        </div>
                      ) : (
                        filteredSingleEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            onClick={() => {
                              setSingleForm({ ...singleForm, employee_id: String(emp.id) });
                              setIsEmployeeDropdownOpen(false);
                            }}
                            className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                              {getInitials(emp.full_name)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{emp.full_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {emp.employee_number || 'No NIP'} &bull; {emp.job_title || 'Staf'}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Tanggal Presensi & Status Kehadiran (Grid 2 Kolom) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tanggal */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800 flex items-center gap-1">
                  <span>Tanggal Presensi <span className="text-rose-600">*</span></span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    required
                    value={singleForm.attendance_date}
                    onChange={(e) => setSingleForm({ ...singleForm, attendance_date: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">Format resmi pelaporan kalender akademik</span>
              </div>

              {/* Status Kehadiran */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800 flex items-center gap-1">
                  <span>Status Kehadiran <span className="text-rose-600">*</span></span>
                </label>
                <select
                  value={singleForm.status}
                  onChange={(e) => {
                    const st = e.target.value;
                    let sub = 'Hadir (Manual)';
                    if (st === 'sick') sub = 'Sakit (Surat Dokter)';
                    else if (st === 'permitted') sub = 'Izin Resmi';
                    else if (st === 'duty_travel') sub = 'Dinas Luar Yayasan';
                    else if (st === 'leave') sub = 'Cuti Tahunan / Bersalin';
                    else if (st === 'absent') sub = 'Alpa (Tanpa Keterangan)';
                    setSingleForm({ ...singleForm, status: st, sub_status: sub });
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="present">Hadir (Manual)</option>
                  <option value="permitted">Izin Resmi</option>
                  <option value="sick">Sakit (Dengan Keterangan)</option>
                  <option value="duty_travel">Dinas Luar Yayasan</option>
                  <option value="leave">Cuti Tahunan / Bersalin</option>
                  <option value="absent">Alpa (Tanpa Keterangan)</option>
                </select>
                <span className="text-[10px] text-emerald-700 font-medium">Terverifikasi manual oleh pengawas HRD</span>
              </div>
            </div>

            {/* 3. Jam Kerja & Durasi (Grid 2 Kolom) + Quick Preset */}
            {(singleForm.status === 'present' || singleForm.status === 'duty_travel') && (
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Jam Kerja &amp; Durasi</span>
                  </span>
                  <button
                    type="button"
                    onClick={applyPresetNormal}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-emerald-700 border border-slate-200 hover:bg-emerald-50 text-[10px] font-semibold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Preset: Jam Normal (07:00 - 16:00)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                      <LogIn className="w-3 h-3 text-emerald-600" />
                      <span>Jam Masuk (Check-In)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="07:00"
                      value={singleForm.check_in_time}
                      onChange={(e) => setSingleForm({ ...singleForm, check_in_time: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                      <LogOut className="w-3 h-3 text-slate-500" />
                      <span>Jam Pulang (Check-Out)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="16:00"
                      value={singleForm.check_out_time}
                      onChange={(e) => setSingleForm({ ...singleForm, check_out_time: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. Textarea Alasan (Wajib) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 flex items-center justify-between">
                <span>Alasan Input Manual <span className="text-rose-600">*</span></span>
                <span className="text-[10px] text-slate-400">Wajib diisi</span>
              </label>
              <textarea
                required
                rows={2}
                value={singleForm.reason}
                onChange={(e) => setSingleForm({ ...singleForm, reason: e.target.value })}
                placeholder="Tuliskan alasan detail (contoh: Terkendala jaringan internet saat presensi mandiri, surat sakit dokter klinik terlampir)..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            {/* 5. Checkbox Mode Timpa (Overwrite) */}
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/80">
              <input
                type="checkbox"
                id="overwrite-check"
                checked={singleForm.overwrite}
                onChange={(e) => setSingleForm({ ...singleForm, overwrite: e.target.checked })}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="overwrite-check" className="text-xs text-slate-700 cursor-pointer select-none">
                Timpa data jika pegawai sudah memiliki catatan presensi pada tanggal ini.
              </label>
            </div>

            {/* 6. Info Audit Alert Note */}
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200/80 text-sky-900 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold">Catatan Audit Kepegawaian:</span> Rekonsiliasi data ini akan ditandai secara permanen dengan label <code className="font-mono bg-white px-1 rounded text-sky-900 border border-sky-200">[MANUAL_HR]</code> dan terekam dalam audit trail untuk kebutuhan pelaporan yayasan.
              </div>
            </div>

            {/* Modal Footer Action Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetSingle}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Form</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Presensi</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Tab Content 2: Massal (Batch) */
          <form onSubmit={handleBulkSubmit} className="px-6 py-4 space-y-4 max-h-[calc(85vh-200px)] overflow-y-auto text-xs">
            {/* Batch Settings Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tanggal Kegiatan */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold">Tanggal Kegiatan *</label>
                <input
                  type="date"
                  required
                  value={bulkForm.attendance_date}
                  onChange={(e) => setBulkForm({ ...bulkForm, attendance_date: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Status Massal */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold">Status Massal</label>
                <select
                  value={bulkForm.status}
                  onChange={(e) => setBulkForm({ ...bulkForm, status: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="duty_travel">Dinas Luar / Penugasan Bersama</option>
                  <option value="present">Hadir Bersama (Rapat Kerja / Workshop)</option>
                  <option value="permitted">Izin Bersama / Acara Yayasan</option>
                </select>
              </div>

              {/* Rentang Waktu */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold">Rentang Waktu</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={bulkForm.check_in_time}
                    onChange={(e) => setBulkForm({ ...bulkForm, check_in_time: e.target.value })}
                    placeholder="07:30"
                    className="w-full h-9 px-2 text-center rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <input
                    type="text"
                    value={bulkForm.check_out_time}
                    onChange={(e) => setBulkForm({ ...bulkForm, check_out_time: e.target.value })}
                    placeholder="15:30"
                    className="w-full h-9 px-2 text-center rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Filter & Selection Box */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs">Pilih Penerima Presensi:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {bulkSelectedIds.length} Pegawai Terpilih
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Satuan Pendidikan Filter */}
                  <select
                    value={bulkUnitFilter}
                    onChange={(e) => setBulkUnitFilter(e.target.value)}
                    className="h-8 px-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none"
                  >
                    <option value="">Semua Satuan (Gabungan)</option>
                    <option value="1">SMA ALDEPOS</option>
                    <option value="2">SMP ALDEPOS</option>
                    <option value="3">SD ALDEPOS</option>
                    <option value="4">TK &amp; Playgroup</option>
                  </select>

                  <button
                    type="button"
                    onClick={toggleBulkSelectAll}
                    className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
                  >
                    {bulkSelectedIds.length === filteredBulkEmployees.length ? 'Batal Semua' : 'Pilih Semua'}
                  </button>
                </div>
              </div>

              {/* Multi-Selected Matrix / Checklist */}
              <div className="bg-white p-2.5 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 shadow-2xs">
                {filteredBulkEmployees.map((emp) => {
                  const isChecked = bulkSelectedIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 rounded-md cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBulkSelect(emp.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <span className="font-semibold text-slate-800 truncate">{emp.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {emp.employee_number || 'NIP -'} &bull; {emp.job_title || 'Staf'}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Alasan Penugasan Massal */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 flex items-center gap-1">
                <span>Agenda / Alasan Rekonsiliasi Massal <span className="text-rose-600">*</span></span>
              </label>
              <textarea
                required
                rows={2}
                value={bulkForm.reason}
                onChange={(e) => setBulkForm({ ...bulkForm, reason: e.target.value })}
                placeholder="Contoh: Pelaksanaan Workshop Kurikulum & Rapat Kerja Tahunan Guru di Aula Utama..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            {/* Modal Footer Action Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setBulkSelectedIds([])}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batal Pilih</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || bulkSelectedIds.length === 0}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Presensi Massal ({bulkSelectedIds.length})</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
