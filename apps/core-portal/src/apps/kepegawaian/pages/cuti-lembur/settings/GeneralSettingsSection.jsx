import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Clock,
  HelpCircle,
  Info,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import api from '../../../../../shared/services/api';

export default function GeneralSettingsSection({
  activeSchoolUnit
}) {
  const [settings, setSettings] = useState({
    flexible_employee_day_rule: 'mon_fri',
    holiday_inside_calendar_leave_counted: true,
    employee_self_cancel_approved_until_days_before: 3,
    reason_visible_to_supervisor_for_sick: false,
    overtime_self_claim_max_backdate_days: 7,
    approval_overdue_hours: 72,
    semester_ranges: [
      { name: 'Semester Ganjil 2026/2027', start_date: '2026-07-15', end_date: '2026-12-20' },
      { name: 'Semester Genap 2026/2027', start_date: '2027-01-05', end_date: '2027-06-25' }
    ]
  });

  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [setRes, thrRes] = await Promise.all([
        api.get('/kepegawaian/leave-settings'),
        api.get('/kepegawaian/absence-thresholds')
      ]);

      if (setRes.data?.success && setRes.data.data) {
        let sem = setRes.data.data.semester_ranges;
        if (typeof sem === 'string') {
          try { sem = JSON.parse(sem); } catch (e) { sem = []; }
        }
        if (!Array.isArray(sem)) sem = [];

        setSettings({
          ...setRes.data.data,
          semester_ranges: sem.length > 0 ? sem : [
            { name: 'Semester Ganjil 2026/2027', start_date: '2026-07-15', end_date: '2026-12-20' },
            { name: 'Semester Genap 2026/2027', start_date: '2027-01-05', end_date: '2027-06-25' }
          ]
        });
      }

      if (thrRes.data?.success) {
        setThresholds(thrRes.data.data || []);
      }
    } catch (err) {
      console.error('Fetch general settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSchoolUnit]);

  const handleAddSemesterRange = () => {
    setSettings((prev) => ({
      ...prev,
      semester_ranges: [
        ...prev.semester_ranges,
        { name: `Semester Baru`, start_date: '', end_date: '' }
      ]
    }));
  };

  const handleRemoveSemesterRange = (index) => {
    setSettings((prev) => ({
      ...prev,
      semester_ranges: prev.semester_ranges.filter((_, idx) => idx !== index)
    }));
  };

  const handleSemesterChange = (index, field, value) => {
    setSettings((prev) => {
      const ranges = [...prev.semester_ranges];
      ranges[index] = { ...ranges[index], [field]: value };
      return { ...prev, semester_ranges: ranges };
    });
  };

  const handleAddThreshold = () => {
    setThresholds((prev) => [
      ...prev,
      {
        id: `new_${Date.now()}`,
        school_unit_id: activeSchoolUnit?.id || 1,
        group_type: 'unit',
        group_ref_id: null,
        max_absent_count: 5,
        max_absent_percent: 20,
        is_active: true
      }
    ]);
  };

  const handleThresholdChange = (index, field, value) => {
    const updated = [...thresholds];
    updated[index] = { ...updated[index], [field]: value };
    setThresholds(updated);
  };

  const handleRemoveThreshold = (index) => {
    setThresholds((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Save module settings
      const settingsPayload = {
        flexible_employee_day_rule: settings.flexible_employee_day_rule,
        holiday_inside_calendar_leave_counted: Boolean(settings.holiday_inside_calendar_leave_counted),
        employee_self_cancel_approved_until_days_before: Number(settings.employee_self_cancel_approved_until_days_before),
        reason_visible_to_supervisor_for_sick: Boolean(settings.reason_visible_to_supervisor_for_sick),
        overtime_self_claim_max_backdate_days: Number(settings.overtime_self_claim_max_backdate_days),
        approval_overdue_hours: Number(settings.approval_overdue_hours),
        semester_ranges: settings.semester_ranges
      };

      await api.put('/kepegawaian/leave-settings', settingsPayload);

      // 2. Save thresholds
      const cleanThresholds = thresholds.map((t) => ({
        school_unit_id: Number(t.school_unit_id || 1),
        group_type: t.group_type,
        group_ref_id: t.group_ref_id ? Number(t.group_ref_id) : null,
        max_absent_count: t.max_absent_count ? Number(t.max_absent_count) : null,
        max_absent_percent: t.max_absent_percent ? Number(t.max_absent_percent) : null,
        is_active: Boolean(t.is_active)
      }));

      await api.put('/kepegawaian/absence-thresholds', { thresholds: cleanThresholds });

      setSuccessMsg('Pengaturan umum dan ambang batas berhasil disimpan');
      fetchData();
    } catch (err) {
      console.error('Save general settings error:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan pengaturan umum');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-on-surface">Konfigurasi Modul & Parameter Operasional</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Pengaturan kebijakan global, toleransi pembatalan mandiri, SLA verifikasi, dan ambang rawan personel.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs transition-all shrink-0"
        >
          {saving ? (
            <span>Menyimpan...</span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </>
          )}
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-error-container/40 border border-error/30 text-xs text-on-error-container">
          {errorMsg}
        </div>
      )}

      {/* Grid Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Parameter Operasional Cuti & Izin */}
        <div className="p-5 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-outline-variant/15 pb-3">
            <Settings className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-xs text-on-surface uppercase tracking-wider">
              Parameter Operasional Cuti & Izin
            </h4>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-on-surface mb-1">
                Aturan Hari Kerja Pegawai Fleksibel (Pelatih Ekskul / Pembina)
              </label>
              <select
                value={settings.flexible_employee_day_rule}
                onChange={(e) => setSettings({ ...settings, flexible_employee_day_rule: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
              >
                <option value="mon_fri">Senin s/d Jumat (5 Hari Kerja Default)</option>
                <option value="mon_sat">Senin s/d Sabtu (6 Hari Kerja)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-on-surface mb-1">
                Batas Hari Batal Cuti Disetujui (Self-Cancel Window)
              </label>
              <input
                type="number"
                min="0"
                value={settings.employee_self_cancel_approved_until_days_before}
                onChange={(e) => setSettings({ ...settings, employee_self_cancel_approved_until_days_before: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
              />
              <p className="text-[11px] text-outline mt-1">
                Pegawai boleh membatalkan sendiri cuti yang disetujui bila H-tanggal mulai ≥ N hari (default: 3 hari).
              </p>
            </div>

            <div>
              <label className="block font-bold text-on-surface mb-1">
                Ambang Waktu Overdue SLA Approval (Jam)
              </label>
              <input
                type="number"
                min="1"
                value={settings.approval_overdue_hours}
                onChange={(e) => setSettings({ ...settings, approval_overdue_hours: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
              />
              <p className="text-[11px] text-outline mt-1">
                Batas jam persetujuan sebelum antrean ditandai badge merah "Lewat SLA" (default: 72 jam).
              </p>
            </div>

            <div className="pt-2 space-y-2 border-t border-outline-variant/15">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                <input
                  type="checkbox"
                  checked={settings.holiday_inside_calendar_leave_counted}
                  onChange={(e) => setSettings({ ...settings, holiday_inside_calendar_leave_counted: e.target.checked })}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span className="font-semibold">Hari Libur di Dalam Cuti Mode Kalender Tetap Dihitung</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                <input
                  type="checkbox"
                  checked={settings.reason_visible_to_supervisor_for_sick}
                  onChange={(e) => setSettings({ ...settings, reason_visible_to_supervisor_for_sick: e.target.checked })}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span className="font-semibold">Alasan & Lampiran Sakit Terlihat oleh Atasan Langsung (Privasi Medis)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Card 2: Parameter Lembur */}
        <div className="p-5 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-outline-variant/15 pb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-xs text-on-surface uppercase tracking-wider">
              Parameter Lembur & Rekonsiliasi
            </h4>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-on-surface mb-1">
                Maksimal Pengajuan Mundur Klaim Lembur Mandiri (Hari)
              </label>
              <input
                type="number"
                min="0"
                value={settings.overtime_self_claim_max_backdate_days}
                onChange={(e) => setSettings({ ...settings, overtime_self_claim_max_backdate_days: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
              />
              <p className="text-[11px] text-outline mt-1">
                Batas toleransi klaim lembur susulan oleh guru/staf di portal mandiri (default: 7 hari).
              </p>
            </div>

            <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 text-xs space-y-1.5">
              <div className="font-bold text-on-surface flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Batas Lembur Tetap Kebijakan (SPEC §7.4):</span>
              </div>
              <ul className="list-disc list-inside text-on-surface-variant space-y-0.5 text-[11px]">
                <li>Maksimal Harian: 4 Jam</li>
                <li>Maksimal Mingguan: 18 Jam (Senin s/d Minggu)</li>
                <li>Maksimal Bulanan: 72 Jam</li>
                <li>Pembulatan upah: 30 menit (toleransi presensi 15 menit)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Rentang Semester */}
      <div className="p-5 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <div>
              <h4 className="font-bold text-xs text-on-surface uppercase tracking-wider">
                Kalender Rentang Semester Pendidikan
              </h4>
              <p className="text-[11px] text-on-surface-variant">
                Digunakan untuk mendefinisikan batasan periode semester akademik tahun berjalan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddSemesterRange}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container text-primary hover:bg-primary/10 text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Semester
          </button>
        </div>

        <div className="space-y-2.5">
          {settings.semester_ranges.map((sem, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-outline-variant/30 bg-surface-container-low flex flex-col sm:flex-row items-center gap-3 text-xs"
            >
              <div className="flex-1 w-full sm:w-auto">
                <label className="block text-[11px] font-bold text-on-surface mb-1">Nama Semester</label>
                <input
                  type="text"
                  required
                  value={sem.name}
                  onChange={(e) => handleSemesterChange(idx, 'name', e.target.value)}
                  placeholder="Contoh: Semester Ganjil 2026/2027"
                  className="w-full h-8 px-2.5 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface font-semibold"
                />
              </div>

              <div className="w-full sm:w-44">
                <label className="block text-[11px] font-bold text-on-surface mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  required
                  value={sem.start_date}
                  onChange={(e) => handleSemesterChange(idx, 'start_date', e.target.value)}
                  className="w-full h-8 px-2 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface"
                />
              </div>

              <div className="w-full sm:w-44">
                <label className="block text-[11px] font-bold text-on-surface mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  required
                  value={sem.end_date}
                  onChange={(e) => handleSemesterChange(idx, 'end_date', e.target.value)}
                  className="w-full h-8 px-2 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface"
                />
              </div>

              <div className="pt-4 sm:pt-4">
                <button
                  type="button"
                  onClick={() => handleRemoveSemesterRange(idx)}
                  className="p-1.5 rounded text-outline hover:text-error hover:bg-error-container/40 transition-colors"
                  title="Hapus Semester"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ambang Rawan Personel */}
      <div className="p-5 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <div>
              <h4 className="font-bold text-xs text-on-surface uppercase tracking-wider">
                Ambang Rawan Personel Ketidakhadiran (Absence Thresholds)
              </h4>
              <p className="text-[11px] text-on-surface-variant">
                Peringatan otomatis saat jumlah cuti/izin/alpa pada hari yang sama melewati batas toleransi operasional
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddThreshold}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container text-primary hover:bg-primary/10 text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Ambang
          </button>
        </div>

        <div className="space-y-2.5">
          {thresholds.length === 0 ? (
            <div className="py-6 text-center text-outline text-xs">
              Belum ada ambang rawan personel yang dikonfigurasi. Klik "Tambah Ambang" untuk membuat batasan.
            </div>
          ) : (
            thresholds.map((thr, idx) => (
              <div
                key={thr.id || idx}
                className="p-3.5 rounded-lg border border-outline-variant/30 bg-surface-container-low flex flex-col sm:flex-row items-center gap-3 text-xs"
              >
                <div className="w-full sm:w-48">
                  <label className="block text-[11px] font-bold text-on-surface mb-1">Satuan Pendidikan</label>
                  <select
                    value={thr.school_unit_id || 1}
                    onChange={(e) => handleThresholdChange(idx, 'school_unit_id', e.target.value)}
                    className="w-full h-8 px-2 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface"
                  >
                    <option value="1">Unit 1 - SMP</option>
                    <option value="2">Unit 2 - SMA</option>
                  </select>
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-[11px] font-bold text-on-surface mb-1">Target Kelompok</label>
                  <select
                    value={thr.group_type || 'unit'}
                    onChange={(e) => handleThresholdChange(idx, 'group_type', e.target.value)}
                    className="w-full h-8 px-2 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface"
                  >
                    <option value="unit">Seluruh Unit Satuan</option>
                    <option value="work_schedule">Jadwal Kerja Tertentu</option>
                  </select>
                </div>

                <div className="w-full sm:w-40">
                  <label className="block text-[11px] font-bold text-on-surface mb-1">Maks. Orang Bersamaan</label>
                  <input
                    type="number"
                    min="1"
                    value={thr.max_absent_count || ''}
                    onChange={(e) => handleThresholdChange(idx, 'max_absent_count', e.target.value)}
                    placeholder="Contoh: 5 org"
                    className="w-full h-8 px-2 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface"
                  />
                </div>

                <div className="w-full sm:w-40">
                  <label className="block text-[11px] font-bold text-on-surface mb-1">Maks. Persen (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={thr.max_absent_percent || ''}
                    onChange={(e) => handleThresholdChange(idx, 'max_absent_percent', e.target.value)}
                    placeholder="Contoh: 20%"
                    className="w-full h-8 px-2 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface"
                  />
                </div>

                <div className="pt-4 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => handleRemoveThreshold(idx)}
                    className="p-1.5 rounded text-outline hover:text-error hover:bg-error-container/40 transition-colors"
                    title="Hapus Ambang Batas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </form>
  );
}
