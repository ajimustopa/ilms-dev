import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Calendar,
  Percent,
  History,
  AlertTriangle,
  Save,
  RefreshCw,
  CheckCircle2,
  Info,
  Layers,
  Settings,
  Plus,
  Trash2,
  Clock,
  Sparkles
} from 'lucide-react';
import api from '../../../../../shared/services/api';

export default function LeavePoliciesSection({ activeSchoolUnit }) {
  const [policies, setPolicies] = useState([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  const fetchPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/kepegawaian/leave-balance-policies');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setPolicies(res.data.data);
        if (res.data.data.length > 0) {
          const current = selectedPolicyId
            ? res.data.data.find((p) => p.id === selectedPolicyId) || res.data.data[0]
            : res.data.data[0];
          setSelectedPolicyId(current.id);
          setFormData({
            ...current,
            rules: current.rules || []
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch leave balance policies:', err);
      setError(err.response?.data?.message || 'Gagal memuat kebijakan saldo cuti');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [activeSchoolUnit]);

  const handleSelectPolicy = (policy) => {
    setSelectedPolicyId(policy.id);
    setFormData({
      ...policy,
      rules: policy.rules || []
    });
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRuleChange = (index, field, value) => {
    setFormData((prev) => {
      const nextRules = [...prev.rules];
      nextRules[index] = {
        ...nextRules[index],
        [field]: value
      };
      return { ...prev, rules: nextRules };
    });
  };

  const handleAddRule = () => {
    setFormData((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        {
          employment_status: 'KONTRAK',
          days: 12,
          min_service_months: 12,
          priority: 10
        }
      ]
    }));
  };

  const handleRemoveRule = (index) => {
    setFormData((prev) => {
      const nextRules = prev.rules.filter((_, i) => i !== index);
      return { ...prev, rules: nextRules };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData || !selectedPolicyId) return;

    setSaving(true);
    setError(null);
    try {
      const res = await api.put(`/kepegawaian/leave-balance-policies/${selectedPolicyId}`, formData);
      if (res.data?.success) {
        setToast('Kebijakan saldo cuti dan aturan jatah berhasil diperbarui');
        fetchPolicies();
        setTimeout(() => setToast(null), 4000);
      }
    } catch (err) {
      console.error('Failed to update leave balance policy:', err);
      setError(err.response?.data?.message || 'Gagal menyimpan perubahan kebijakan saldo');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !formData) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 flex flex-col items-center justify-center min-h-[320px] text-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-sm font-semibold text-on-surface">Memuat Kebijakan & Aturan Jatah Cuti...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Warning Notice Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-on-surface flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-amber-900">Perhatian: Pengaturan Kebijakan & Jatah Saldo Cuti</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Perubahan parameter siklus periode, batas prorata, carry-over, atau tabel jatah hari akan memengaruhi kalkulasi
            jatah pegawai saat penetapan massal (bulk assign) dan penutupan periode. Pastikan kebijakan telah diselaraskan
            dengan Surat Keputusan (SK) Yayasan Aldepos.
          </p>
        </div>
      </div>

      {/* Policy Selector (if multiple) */}
      {policies.length > 1 && (
        <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
          <span className="text-xs font-bold text-on-surface-variant mr-2">Pilih Kebijakan:</span>
          {policies.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPolicy(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedPolicyId === p.id
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {formData && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* SIKLUS & PRORATA */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/20">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-bold text-on-surface">Siklus Periode & Prorata</h3>
                <p className="text-[11px] text-on-surface-variant">Penetapan tahun kalender atau tahun ajaran dan aturan prorata pegawai baru</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Bulan Awal Siklus Periode <span className="text-error">*</span>
                </label>
                <select
                  value={formData.period_start_month}
                  onChange={(e) => handleChange('period_start_month', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary text-on-surface outline-none font-medium"
                >
                  <option value={7}>Juli (Tahun Ajaran Juli s/d Juni)</option>
                  <option value={1}>Januari (Tahun Kalender Januari s/d Desember)</option>
                </select>
                <p className="text-[10px] text-on-surface-variant mt-1">Standar Yayasan Aldepos: Siklus Juli (Tahun Ajaran).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Metode Prorata Masuk <span className="text-error">*</span>
                </label>
                <select
                  value={formData.proration_mode || 'monthly'}
                  onChange={(e) => handleChange('proration_mode', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary text-on-surface outline-none font-medium"
                >
                  <option value="monthly">Bulanan (Dihitung dari sisa bulan dalam periode)</option>
                  <option value="full">Penuh (Langsung dapat hak penuh)</option>
                  <option value="none">Tidak Ada (0 hari sampai periode berikutnya)</option>
                </select>
                <p className="text-[10px] text-on-surface-variant mt-1">Metode pembagian jatah untuk pegawai yang mulai bekerja di tengah periode.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Batas Tanggal Masuk (Cutoff Day) <span className="text-error">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.proration_join_day_cutoff ?? 15}
                    onChange={(e) => handleChange('proration_join_day_cutoff', parseInt(e.target.value, 10) || 15)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary text-on-surface outline-none font-medium"
                  />
                  <span className="text-xs text-on-surface-variant shrink-0">Tanggal</span>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">Masuk sebelum/pada tanggal ini dihitung mendapat jatah bulan bersangkutan (default: 15).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Aturan Pembulatan Prorata <span className="text-error">*</span>
                </label>
                <select
                  value={formData.rounding || 'floor_half'}
                  onChange={(e) => handleChange('rounding', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary text-on-surface outline-none font-medium"
                >
                  <option value="floor_half">Bulatkan ke Bawah kelipatan 0.5 (Contoh: 4.8 → 4.5)</option>
                  <option value="nearest_half">Terdekat kelipatan 0.5 (Contoh: 4.8 → 5.0)</option>
                  <option value="ceil_half">Bulatkan ke Atas kelipatan 0.5 (Contoh: 4.2 → 4.5)</option>
                  <option value="none">Tanpa Pembulatan (Desimal asli)</option>
                </select>
                <p className="text-[10px] text-on-surface-variant mt-1">Aturan pembulatan hasil bagi hari cuti prorata.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Syarat Masa Kerja Minimum <span className="text-error">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.min_service_months_for_eligibility ?? 12}
                    onChange={(e) => handleChange('min_service_months_for_eligibility', parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary text-on-surface outline-none font-medium"
                  />
                  <span className="text-xs text-on-surface-variant shrink-0">Bulan</span>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">Masa kerja sebelum pegawai berhak atas cuti tahunan (default: 12 bulan / UU Ketenagakerjaan).</p>
              </div>
            </div>
          </div>

          {/* CARRY OVER & MINUS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Carry Over Policy */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Carry Over (Sisa Cuti Lalu)</h3>
                    <p className="text-[11px] text-on-surface-variant">Aturan peralihan sisa saldo ke periode berikutnya</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.carry_over_enabled)}
                    onChange={(e) => handleChange('carry_over_enabled', e.target.checked ? 1 : 0)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-container-highest after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {formData.carry_over_enabled ? (
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">
                      Batas Maksimal Carry Over
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={formData.carry_over_max_days ?? 6}
                        onChange={(e) => handleChange('carry_over_max_days', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary text-on-surface outline-none font-medium"
                      />
                      <span className="text-xs text-on-surface-variant shrink-0">Hari</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-1">Maksimal sisa hari yang dialihkan (default: 6 hari).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">
                      Masa Berlaku Kedaluwarsa
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={formData.carry_over_expiry_months ?? 3}
                        onChange={(e) => handleChange('carry_over_expiry_months', parseInt(e.target.value, 10) || 3)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary text-on-surface outline-none font-medium"
                      />
                      <span className="text-xs text-on-surface-variant shrink-0">Bulan</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-1">Berlaku sampai N bulan dalam periode baru (default: 3 bulan / s.d. 30 Sept).</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface-container-low text-xs text-on-surface-variant text-center">
                  Carry over dinonaktifkan. Seluruh sisa cuti pada akhir periode akan hangus (forfeited).
                </div>
              )}
            </div>

            {/* Negative Balance Policy */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Saldo Negatif (Minus)</h3>
                    <p className="text-[11px] text-on-surface-variant">Izin pengambilan cuti mendahului saldo tersedia</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.allow_negative)}
                    onChange={(e) => handleChange('allow_negative', e.target.checked ? 1 : 0)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-container-highest after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {formData.allow_negative ? (
                <div className="pt-1">
                  <label className="block text-xs font-bold text-on-surface mb-1.5">
                    Batas Maksimal Defisit (Minus)
                  </label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={formData.negative_limit_days ?? 0}
                      onChange={(e) => handleChange('negative_limit_days', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary text-on-surface outline-none font-medium"
                    />
                    <span className="text-xs text-on-surface-variant shrink-0">Hari</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1">Jumlah hari maksimal saldo boleh defisit / kasbon cuti.</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface-container-low text-xs text-on-surface-variant text-center">
                  Saldo negatif dilarang. Pengajuan cuti yang melebihi saldo tersedia akan otomatis ditolak sistem.
                </div>
              )}
            </div>
          </div>

          {/* TABEL ATURAN JATAH PER STATUS KEPEGAWAIAN */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Tabel Aturan Jatah per Status Kepegawaian</h3>
                  <p className="text-[11px] text-on-surface-variant">Penentuan jatah standar hari cuti berdasarkan status kerja pegawai</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddRule}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Aturan Status</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30 text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Status Kepegawaian</th>
                    <th className="py-3 px-4">Jatah Hari Standar</th>
                    <th className="py-3 px-4">Min. Masa Kerja (Bulan)</th>
                    <th className="py-3 px-4">Prioritas</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {formData.rules && formData.rules.length > 0 ? (
                    formData.rules.map((rule, idx) => (
                      <tr key={rule.id || idx} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={rule.employment_status || ''}
                            onChange={(e) => handleRuleChange(idx, 'employment_status', e.target.value.toUpperCase())}
                            placeholder="GTY / PTY / KONTRAK / HONOR"
                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus:border-primary text-on-surface outline-none"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 max-w-[120px]">
                            <input
                              type="number"
                              min="0"
                              max="60"
                              step="0.5"
                              value={rule.days ?? 12}
                              onChange={(e) => handleRuleChange(idx, 'days', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus:border-primary text-on-surface outline-none"
                            />
                            <span className="text-xs text-on-surface-variant">Hari</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 max-w-[120px]">
                            <input
                              type="number"
                              min="0"
                              max="120"
                              value={rule.min_service_months ?? 12}
                              onChange={(e) => handleRuleChange(idx, 'min_service_months', parseInt(e.target.value, 10) || 0)}
                              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus:border-primary text-on-surface outline-none"
                            />
                            <span className="text-xs text-on-surface-variant">Bulan</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={rule.priority ?? 10}
                            onChange={(e) => handleRuleChange(idx, 'priority', parseInt(e.target.value, 10) || 10)}
                            className="w-20 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus:border-primary text-on-surface outline-none"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRule(idx)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Hapus Aturan Status"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-on-surface-variant text-xs">
                        Belum ada aturan jatah khusus status. Sistem akan menggunakan nilai dasar kebijakan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Button Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={fetchPolicies}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-outline-variant/50 text-on-surface hover:bg-surface-container-low text-xs font-bold transition-colors"
            >
              Batal / Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Kebijakan Saldo'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
