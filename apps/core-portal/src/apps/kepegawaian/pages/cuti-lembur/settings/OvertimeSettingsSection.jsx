import React, { useState, useEffect } from 'react';
import {
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Info,
  Loader2,
  Sliders,
  Shield,
  Layers,
  Coins
} from 'lucide-react';
import api from '../../../../../shared/services/api';

const STATUS_OPTIONS = [
  { id: 'GTY', label: 'Guru Tetap Yayasan (GTY)' },
  { id: 'PTY', label: 'Pegawai Tetap Yayasan (PTY)' },
  { id: 'GTT', label: 'Guru Tidak Tetap (GTT)' },
  { id: 'PTT', label: 'Pegawai Tidak Tetap (PTT)' },
  { id: 'KONTRAK', label: 'Karyawan Kontrak' },
  { id: 'HONORER', label: 'Tenaga Honorer' },
  { id: 'MAGANG', label: 'Magang / PKL' }
];

export default function OvertimeSettingsSection({ activeSchoolUnit }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: 'Kebijakan Lembur Standar Yayasan',
    calc_method: 'flat_hourly',
    flat_hourly_rate: '',
    wage_divisor: 173,
    rounding_minutes: 30,
    min_payable_minutes: 30,
    max_hours_per_day: 4.0,
    max_hours_per_week: 18.0,
    max_hours_per_month: 72.0,
    eligible_employment_statuses: ['GTY', 'PTY']
  });

  const [tiers, setTiers] = useState([
    { day_type: 'workday', from_hour: 0, to_hour: 1, multiplier: 1.5 },
    { day_type: 'workday', from_hour: 1, to_hour: null, multiplier: 2.0 },
    { day_type: 'weekend', from_hour: 0, to_hour: 7, multiplier: 2.0 },
    { day_type: 'weekend', from_hour: 7, to_hour: null, multiplier: 3.0 },
    { day_type: 'holiday', from_hour: 0, to_hour: 7, multiplier: 2.0 },
    { day_type: 'holiday', from_hour: 7, to_hour: null, multiplier: 3.0 }
  ]);

  const fetchSettings = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      let q = '';
      if (activeSchoolUnit?.id) q = `?school_unit_id=${activeSchoolUnit.id}`;
      const res = await api.get(`/kepegawaian/overtime-settings${q}`);
      if (res.data?.success && res.data?.data) {
        const { policy, tiers: fetchedTiers } = res.data.data;
        if (policy) {
          setForm({
            name: policy.name || 'Kebijakan Lembur Standar Yayasan',
            calc_method: policy.calc_method || 'flat_hourly',
            flat_hourly_rate: policy.flat_hourly_rate != null ? String(policy.flat_hourly_rate) : '',
            wage_divisor: policy.wage_divisor || 173,
            rounding_minutes: policy.rounding_minutes || 30,
            min_payable_minutes: policy.min_payable_minutes || 30,
            max_hours_per_day: policy.max_hours_per_day != null ? parseFloat(policy.max_hours_per_day) : 4.0,
            max_hours_per_week: policy.max_hours_per_week != null ? parseFloat(policy.max_hours_per_week) : 18.0,
            max_hours_per_month: policy.max_hours_per_month != null ? parseFloat(policy.max_hours_per_month) : 72.0,
            eligible_employment_statuses: Array.isArray(policy.eligible_employment_statuses)
              ? policy.eligible_employment_statuses
              : ['GTY', 'PTY']
          });
        }
        if (Array.isArray(fetchedTiers) && fetchedTiers.length > 0) {
          setTiers(fetchedTiers.map(t => ({
            id: t.id,
            day_type: t.day_type,
            from_hour: parseFloat(t.from_hour) || 0,
            to_hour: t.to_hour != null ? parseFloat(t.to_hour) : null,
            multiplier: parseFloat(t.multiplier) || 1.0
          })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch overtime settings:', err);
      setErrorMessage(err.response?.data?.message || 'Gagal memuat konfigurasi lembur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [activeSchoolUnit]);

  const handleStatusToggle = (statusId) => {
    setForm(prev => {
      const current = prev.eligible_employment_statuses || [];
      const exists = current.includes(statusId);
      const updated = exists ? current.filter(s => s !== statusId) : [...current, statusId];
      return { ...prev, eligible_employment_statuses: updated };
    });
  };

  const handleAddTier = (dayType = 'workday') => {
    setTiers(prev => [
      ...prev,
      { day_type: dayType, from_hour: 0, to_hour: null, multiplier: 1.5 }
    ]);
  };

  const handleTierChange = (index, field, value) => {
    setTiers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveTier = (index) => {
    setTiers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    try {
      const payload = {
        school_unit_id: activeSchoolUnit?.id || null,
        name: form.name.trim(),
        calc_method: form.calc_method,
        flat_hourly_rate: form.flat_hourly_rate !== '' ? parseFloat(form.flat_hourly_rate) : null,
        wage_divisor: parseInt(form.wage_divisor, 10) || 173,
        rounding_minutes: parseInt(form.rounding_minutes, 10) || 30,
        min_payable_minutes: parseInt(form.min_payable_minutes, 10) || 30,
        max_hours_per_day: parseFloat(form.max_hours_per_day) || 4.0,
        max_hours_per_week: parseFloat(form.max_hours_per_week) || 18.0,
        max_hours_per_month: parseFloat(form.max_hours_per_month) || 72.0,
        eligible_employment_statuses: form.eligible_employment_statuses,
        tiers: tiers.map(t => ({
          day_type: t.day_type,
          from_hour: parseFloat(t.from_hour) || 0,
          to_hour: t.to_hour !== '' && t.to_hour != null ? parseFloat(t.to_hour) : null,
          multiplier: parseFloat(t.multiplier) || 1.0
        }))
      };

      const res = await api.put('/kepegawaian/overtime-settings', payload);
      if (res.data?.success) {
        setToastMessage('Pengaturan aturan lembur berhasil disimpan.');
        setTimeout(() => setToastMessage(null), 4000);
        fetchSettings();
      } else {
        setErrorMessage(res.data?.message || 'Gagal menyimpan aturan lembur');
      }
    } catch (err) {
      console.error('Failed to update overtime settings:', err);
      setErrorMessage(err.response?.data?.message || 'Gagal menyimpan aturan lembur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
        <p className="text-xs">Memuat konfigurasi lembur...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            &times;
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Header & General Policy Card */}
      <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant/20">
          <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Kebijakan &amp; Tarif Lembur</h3>
            <p className="text-xs text-on-surface-variant">Metode perhitungan upah dan formula pembulatan lembur</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface">Nama Kebijakan Lembur</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface">Metode Kalkulasi Upah</label>
            <select
              value={form.calc_method}
              onChange={(e) => setForm({ ...form, calc_method: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none"
            >
              <option value="flat_hourly">Tarif Flat per Jam (Flat Hourly Rate)</option>
              <option value="monthly_wage_divisor">Pembagi Gaji Pokok Bulanan (1/173 x Gaji)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
              <span>Tarif Flat per Jam (Rp)</span>
              <span className="text-[10px] text-on-surface-variant font-normal">(Boleh dikosongkan)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-outline">Rp</span>
              <input
                type="number"
                step="1000"
                min="0"
                placeholder="Misal: 35000 (Kosongkan bila belum ada tarif)"
                value={form.flat_hourly_rate}
                onChange={(e) => setForm({ ...form, flat_hourly_rate: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none font-semibold"
              />
            </div>
            <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-1">
              <Info className="w-3.5 h-3.5 text-secondary shrink-0" />
              <span>Estimasi upah menampilkan <strong>" — "</strong> jika tarif flat ini dikosongkan.</span>
            </p>
          </div>

          {form.calc_method === 'monthly_wage_divisor' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface">Pembagi Upah Bulanan (Jam)</label>
              <input
                type="number"
                min="1"
                max="300"
                value={form.wage_divisor}
                onChange={(e) => setForm({ ...form, wage_divisor: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none"
              />
              <p className="text-[11px] text-on-surface-variant">Standar Depnaker: 173 jam</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface">Pembulatan Waktu (Menit)</label>
            <select
              value={form.rounding_minutes}
              onChange={(e) => setForm({ ...form, rounding_minutes: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none"
            >
              <option value="15">15 Menit</option>
              <option value="30">30 Menit (Standar)</option>
              <option value="60">60 Menit (1 Jam Penuh)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface">Minimal Menit Terbayar</label>
            <input
              type="number"
              min="0"
              max="120"
              value={form.min_payable_minutes}
              onChange={(e) => setForm({ ...form, min_payable_minutes: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none"
            />
            <p className="text-[11px] text-on-surface-variant">Durasi di bawah menit ini diabaikan (0 jam)</p>
          </div>
        </div>
      </div>

      {/* 2. Overtime Limits (SOP Yayasan) */}
      <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant/20">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Batas Maksimal Jam Lembur (SOP)</h3>
            <p className="text-xs text-on-surface-variant">Batas akumulasi jam lembur per individu untuk mencegah kelelahan kerja</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface">Maks. Harian (Jam)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="24"
              value={form.max_hours_per_day}
              onChange={(e) => setForm({ ...form, max_hours_per_day: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none"
            />
            <span className="text-[10px] text-on-surface-variant">Default: 4.0 Jam / Hari</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface">Maks. Mingguan (Jam)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="100"
              value={form.max_hours_per_week}
              onChange={(e) => setForm({ ...form, max_hours_per_week: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none"
            />
            <span className="text-[10px] text-on-surface-variant">Default: 18.0 Jam / Minggu</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface">Maks. Bulanan (Jam)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="300"
              value={form.max_hours_per_month}
              onChange={(e) => setForm({ ...form, max_hours_per_month: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none"
            />
            <span className="text-[10px] text-on-surface-variant">Default: 72.0 Jam / Bulan</span>
          </div>
        </div>
      </div>

      {/* 3. Eligible Employment Statuses */}
      <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant/20">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Kelayakan Status Kepegawaian</h3>
            <p className="text-xs text-on-surface-variant">Status kepegawaian yang berhak menerima penugasan &amp; klaim lembur</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {STATUS_OPTIONS.map(opt => {
            const checked = (form.eligible_employment_statuses || []).includes(opt.id);
            return (
              <label
                key={opt.id}
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 cursor-pointer transition-all ${
                  checked
                    ? 'bg-secondary-fixed/15 border-secondary text-on-surface font-semibold'
                    : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleStatusToggle(opt.id)}
                  className="rounded text-secondary focus:ring-secondary border-outline-variant/60"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 4. Multiplier Tiers Table */}
      <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-secondary flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-headline-md text-sm font-bold text-on-surface">Tingkat Pengali Upah Lembur (Tiers)</h3>
              <p className="text-xs text-on-surface-variant">Konfigurasi pengali tarif berdasarkan jenis hari &amp; rentang jam lembur</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddTier('workday')}
              className="px-2.5 py-1.5 rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface-container text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tier Kerja</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddTier('weekend')}
              className="px-2.5 py-1.5 rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface-container text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tier Akhir Pekan</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddTier('holiday')}
              className="px-2.5 py-1.5 rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface-container text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tier Libur</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/30 text-on-surface-variant font-bold">
                <th className="py-2.5 px-3">Jenis Hari</th>
                <th className="py-2.5 px-3">Dari Jam Ke-</th>
                <th className="py-2.5 px-3">Sampai Jam Ke-</th>
                <th className="py-2.5 px-3">Pengali (x)</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {tiers.map((tier, idx) => (
                <tr key={idx} className="hover:bg-surface-container-low/50">
                  <td className="py-2 px-3">
                    <select
                      value={tier.day_type}
                      onChange={(e) => handleTierChange(idx, 'day_type', e.target.value)}
                      className="px-2 py-1 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs font-semibold"
                    >
                      <option value="workday">Hari Kerja (Workday)</option>
                      <option value="weekend">Akhir Pekan (Weekend)</option>
                      <option value="holiday">Hari Libur (Holiday)</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={tier.from_hour}
                      onChange={(e) => handleTierChange(idx, 'from_hour', parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs font-semibold"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Seterusnya"
                      value={tier.to_hour != null ? tier.to_hour : ''}
                      onChange={(e) => handleTierChange(idx, 'to_hour', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                      className="w-24 px-2 py-1 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="10"
                        value={tier.multiplier}
                        onChange={(e) => handleTierChange(idx, 'multiplier', parseFloat(e.target.value) || 1.0)}
                        className="w-20 px-2 py-1 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs font-bold text-secondary"
                      />
                      <span className="font-bold text-on-surface-variant">x</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(idx)}
                      className="p-1 rounded text-outline hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Hapus Tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 active:scale-98"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan Konfigurasi...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan Lembur</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
