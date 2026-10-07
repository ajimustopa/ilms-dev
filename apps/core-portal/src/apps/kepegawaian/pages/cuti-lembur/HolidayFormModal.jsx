import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Building,
  Clock
} from 'lucide-react';
import api from '../../../../shared/services/api';

const HOLIDAY_TYPE_OPTIONS = [
  { value: 'national', label: 'Libur Nasional', desc: 'Resmi SKB 3 Menteri / Kepres' },
  { value: 'joint_leave', label: 'Cuti Bersama', desc: 'Cuti Bersama Resmi Pemerintah (SKB)' },
  { value: 'school_semester', label: 'Libur Semester / Sekolah', desc: 'Jeda Semester & Kalender Pendidikan' },
  { value: 'school_ramadan', label: 'Libur Ramadan / Idul Fitri', desc: 'Jeda Awal & Akhir Ramadan Sekolah' },
  { value: 'school_exam', label: 'Libur Pasca Ujian', desc: 'Jeda Evaluasi / Ujian' },
  { value: 'foundation', label: 'Milad / Agenda Yayasan', desc: 'Hari Libur Khusus Yayasan Aldepos' },
  { value: 'unit_special', label: 'Libur Khusus Satuan', desc: 'Khusus Unit Tertentu (SMP / SMA)' }
];

export default function HolidayFormModal({
  isOpen,
  onClose,
  holiday = null,
  activeSchoolUnit = null,
  onSuccess
}) {
  const isEdit = Boolean(holiday?.id);

  const [form, setForm] = useState({
    name: '',
    holiday_type: 'national',
    start_date: '',
    end_date: '',
    school_unit_id: '',
    is_off_day: true,
    applies_to: 'all_employees',
    target_schedule_ids: [],
    deducts_annual_leave: false,
    date_rule: 'floating',
    review_status: 'confirmed',
    notes: ''
  });

  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;

    if (holiday) {
      setForm({
        name: holiday.name || '',
        holiday_type: holiday.holiday_type || 'national',
        start_date: holiday.start_date || '',
        end_date: holiday.end_date || holiday.start_date || '',
        school_unit_id: holiday.school_unit_id ? String(holiday.school_unit_id) : '',
        is_off_day: holiday.is_off_day !== undefined ? Boolean(holiday.is_off_day) : true,
        applies_to: holiday.applies_to || 'all_employees',
        target_schedule_ids: holiday.target_schedule_ids || [],
        deducts_annual_leave: Boolean(holiday.deducts_annual_leave),
        date_rule: holiday.date_rule || 'floating',
        review_status: holiday.review_status || 'confirmed',
        notes: holiday.notes || ''
      });
    } else {
      const todayStr = new Date().toISOString().slice(0, 10);
      setForm({
        name: '',
        holiday_type: 'national',
        start_date: todayStr,
        end_date: todayStr,
        school_unit_id: activeSchoolUnit?.id ? String(activeSchoolUnit.id) : '',
        is_off_day: true,
        applies_to: 'all_employees',
        target_schedule_ids: [],
        deducts_annual_leave: false,
        date_rule: 'floating',
        review_status: 'confirmed',
        notes: ''
      });
    }
    setErrorMsg('');
    setFieldErrors({});

    // Fetch work schedules for targeting
    const fetchSchedules = async () => {
      setLoadingSchedules(true);
      try {
        const res = await api.get('/kepegawaian/work-schedules');
        if (res.data?.success) {
          setSchedules(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch work schedules:', err);
      } finally {
        setLoadingSchedules(false);
      }
    };
    fetchSchedules();
  }, [isOpen, holiday, activeSchoolUnit]);

  if (!isOpen) return null;

  const handleToggleSchedule = (schedId) => {
    setForm(prev => {
      const current = prev.target_schedule_ids || [];
      if (current.includes(schedId)) {
        return { ...prev, target_schedule_ids: current.filter(id => id !== schedId) };
      } else {
        return { ...prev, target_schedule_ids: [...current, schedId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setFieldErrors({});

    // Client-side quick check
    if (!form.name.trim()) {
      setErrorMsg('Nama hari libur wajib diisi');
      setIsSubmitting(false);
      return;
    }

    if (form.end_date && form.end_date < form.start_date) {
      setErrorMsg('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
      setFieldErrors({ end_date: 'Tanggal selesai tidak valid' });
      setIsSubmitting(false);
      return;
    }

    if (form.applies_to === 'schedules' && form.target_schedule_ids.length === 0) {
      setErrorMsg('Pilih minimal satu jadwal kerja target bila berlaku untuk jadwal tertentu');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      holiday_type: form.holiday_type,
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
      school_unit_id: form.school_unit_id ? Number(form.school_unit_id) : null,
      is_off_day: form.is_off_day,
      applies_to: form.applies_to,
      target_schedule_ids: form.applies_to === 'schedules' ? form.target_schedule_ids : [],
      deducts_annual_leave: form.deducts_annual_leave,
      date_rule: form.date_rule,
      review_status: form.review_status,
      notes: form.notes.trim() || null
    };

    try {
      if (isEdit) {
        await api.put(`/kepegawaian/holidays/${holiday.id}`, payload);
      } else {
        await api.post('/kepegawaian/holidays', payload);
      }
      onSuccess?.(isEdit ? 'Hari libur berhasil diperbarui' : 'Hari libur berhasil ditambahkan');
      onClose();
    } catch (err) {
      const resp = err.response?.data;
      setErrorMsg(resp?.message || 'Gagal menyimpan hari libur');
      if (Array.isArray(resp?.errors)) {
        const fErrors = {};
        resp.errors.forEach(e => {
          if (e.field) fErrors[e.field] = e.message;
        });
        setFieldErrors(fErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {isEdit ? 'Ubah Hari Libur & Agenda' : 'Tambah Hari Libur Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Konfigurasi kalender libur nasional, cuti bersama, dan jadwal sekolah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Nama Libur */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Hari Libur / Agenda *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Tahun Baru 2026 Masehi, Libur Semester Gasal..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full p-2.5 text-sm border ${fieldErrors.name ? 'border-red-400 bg-red-50/30' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800`}
            />
            {fieldErrors.name && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.name}</p>}
          </div>

          {/* Grid: Jenis Libur & Cakupan Satuan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori / Jenis Libur *
              </label>
              <select
                value={form.holiday_type}
                onChange={(e) => setForm({ ...form, holiday_type: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {HOLIDAY_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.desc})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cakupan Satuan Pendidikan
              </label>
              <select
                value={form.school_unit_id}
                onChange={(e) => setForm({ ...form, school_unit_id: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Semua Satuan (Global Yayasan & Nasional)</option>
                <option value="1">SMP IT Aldepos Islamic Boarding School</option>
                <option value="2">SMA IT Aldepos Islamic Boarding School</option>
              </select>
            </div>
          </div>

          {/* Grid: Tanggal Mulai & Tanggal Selesai */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Mulai *
              </label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    start_date: val,
                    end_date: prev.end_date && prev.end_date < val ? val : (prev.end_date || val)
                  }));
                }}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Selesai (Inklusif) *
              </label>
              <input
                type="date"
                required
                min={form.start_date}
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className={`w-full p-2.5 text-sm border ${fieldErrors.end_date ? 'border-red-400 bg-red-50/30' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800`}
              />
            </div>
          </div>

          {/* Checkboxes: Hari Bebas Kerja & Potong Saldo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_off_day}
                onChange={(e) => setForm({ ...form, is_off_day: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">Hari Bebas Kerja (Off-Day)</span>
                <span className="text-slate-500 text-[11px]">Pegawai tidak diwajibkan presensi pada hari ini</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.deducts_annual_leave}
                onChange={(e) => setForm({ ...form, deducts_annual_leave: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">Memotong Saldo Cuti Tahunan</span>
                <span className="text-slate-500 text-[11px]">Khusus Cuti Bersama yang ditetapkan memotong kuota tahunan</span>
              </div>
            </label>
          </div>

          {/* Aturan Tanggal & Status Review */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Aturan Tanggal Tahunan
              </label>
              <select
                value={form.date_rule}
                onChange={(e) => setForm({ ...form, date_rule: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="fixed_date">Fixed Date (Tanggal Sama Setiap Tahun, misal 17 Agustus)</option>
                <option value="floating">Floating (Tanggal Hijriah / Bergeser Setiap Tahun)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Validitas
              </label>
              <select
                value={form.review_status}
                onChange={(e) => setForm({ ...form, review_status: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="confirmed">Dikonfirmasi (Aktif & Berlaku di Presensi)</option>
                <option value="draft_needs_review">Draft Perlu Ditinjau (Belum Efektif)</option>
              </select>
            </div>
          </div>

          {/* Sasaran Pegawai / Jadwal Kerja */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Sasaran Berlaku Libur
            </label>
            <div className="flex gap-4 mb-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="applies_to"
                  value="all_employees"
                  checked={form.applies_to === 'all_employees'}
                  onChange={() => setForm({ ...form, applies_to: 'all_employees', target_schedule_ids: [] })}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Semua Pegawai (Seluruh Jadwal)</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="applies_to"
                  value="schedules"
                  checked={form.applies_to === 'schedules'}
                  onChange={() => setForm({ ...form, applies_to: 'schedules' })}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Jadwal Kerja Tertentu (Misal: Guru Pengajar Saja)</span>
              </label>
            </div>

            {/* Work schedules picker if applies_to === 'schedules' */}
            {form.applies_to === 'schedules' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-semibold text-slate-600 block">
                  Pilih Jadwal Kerja yang Libur (Pegawai di jadwal lain tetap bekerja):
                </span>
                {loadingSchedules ? (
                  <div className="text-xs text-slate-400 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat daftar jadwal kerja...
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-1">
                    Belum ada jadwal kerja terdaftar.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {schedules.map(sched => (
                      <label key={sched.id} className="flex items-center gap-2 text-xs text-slate-700 hover:bg-white p-1.5 rounded-lg transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.target_schedule_ids.includes(sched.id)}
                          onChange={() => handleToggleSchedule(sched.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="font-medium">{sched.name}</span>
                        <span className="text-[10px] text-slate-400">({sched.schedule_type || 'Massal'})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Catatan / Dasar SK */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan / Dasar SK
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: SKB 3 Menteri No. 855/2025, Kalender Akademik Disdik 2026/2027..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEdit ? 'Simpan Perubahan' : 'Tambah Hari Libur'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
