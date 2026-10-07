import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  UserCheck,
  ChevronRight,
  Sparkles,
  Info,
  X
} from 'lucide-react';
import api from '../../../../../shared/services/api';

const APPROVER_SOURCE_LABELS = {
  direct_supervisor: { label: 'Atasan Langsung', desc: 'Atasan langsung terdaftar di profil pegawai (opsional bila belum ditetapkan)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  unit_head: { label: 'Kepala Sekolah', desc: 'Pejabat Kepala Sekolah aktif satuan pendidikan pemohon', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  hrd_pool: { label: 'Pool Tim HRD', desc: 'Semua admin berwenang kepegawaian.leave_requests.manage', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  yayasan_pool: { label: 'Pengurus Yayasan', desc: 'Admin Yayasan (eskalasi bila pemohon adalah KS/HRD)', color: 'bg-purple-50 text-purple-700 border-purple-200' }
};

export default function ApprovalProfilesSection({
  approvalProfiles = [],
  leaveTypes = [],
  loading = false,
  onRefresh
}) {
  const [editingProfile, setEditingProfile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [steps, setSteps] = useState([]);
  const [profileName, setProfileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleOpenEdit = (profile) => {
    setEditingProfile(profile);
    setProfileName(profile.name || '');
    // clone steps
    const currentSteps = profile.steps && profile.steps.length > 0
      ? profile.steps.map((st) => ({ ...st }))
      : [
          { step_no: 1, step_name: 'Verifikasi Atasan', approver_source: 'direct_supervisor', is_required: false, min_days_threshold: null, sla_hours: 24 },
          { step_no: 2, step_name: 'Persetujuan Kepala Sekolah', approver_source: 'unit_head', is_required: true, min_days_threshold: null, sla_hours: 48 },
          { step_no: 3, step_name: 'Persetujuan Akhir HRD', approver_source: 'hrd_pool', is_required: true, min_days_threshold: null, sla_hours: 72 }
        ];
    setSteps(currentSteps);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleAddStep = () => {
    const nextNo = steps.length + 1;
    setSteps([
      ...steps,
      {
        step_no: nextNo,
        step_name: `Langkah ${nextNo}`,
        approver_source: 'hrd_pool',
        is_required: true,
        min_days_threshold: null,
        sla_hours: 48
      }
    ]);
  };

  const handleRemoveStep = (index) => {
    if (steps.length <= 1) {
      alert('Profil persetujuan harus memiliki minimal 1 langkah.');
      return;
    }
    const updated = steps.filter((_, idx) => idx !== index).map((s, idx) => ({
      ...s,
      step_no: idx + 1
    }));
    setSteps(updated);
  };

  const handleStepChange = (index, field, value) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: profileName.trim(),
        steps: steps.map((s, idx) => ({
          step_no: idx + 1,
          step_name: s.step_name || `Langkah ${idx + 1}`,
          approver_source: s.approver_source,
          is_required: Boolean(s.is_required),
          min_days_threshold: s.min_days_threshold ? Number(s.min_days_threshold) : null,
          sla_hours: s.sla_hours ? Number(s.sla_hours) : null
        }))
      };

      const res = await api.put(`/kepegawaian/approval-profiles/${editingProfile.id}`, payload);
      if (res.data?.success) {
        setModalOpen(false);
        onRefresh();
      }
    } catch (err) {
      console.error('Save approval profile error:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan tahapan alur persetujuan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-on-surface">Matriks Profil Alur Persetujuan (Approval Profiles)</h3>
          <p className="text-xs text-on-surface-variant">
            Konfigurasi rantai hierarki persetujuan berjenjang: Atasan Langsung, Kepala Sekolah, dan Pool HRD.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-outline">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat data profil persetujuan...</span>
          </div>
        ) : (
          approvalProfiles.map((profile) => {
            // find linked leave types
            const linkedTypes = leaveTypes.filter(
              (t) => t.approval_profile_id === profile.id || (t.approval_profile_name === profile.name)
            );

            return (
              <div
                key={profile.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 bg-surface-container-low border-b border-outline-variant/15 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-on-surface">{profile.name}</h4>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                          {profile.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {profile.steps?.length || 0} Tahapan Persetujuan
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(profile)}
                      className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors"
                      title="Ubah Rantai Persetujuan"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Steps Chain */}
                  <div className="p-4 space-y-3">
                    <div className="text-[11px] font-bold text-outline uppercase tracking-wider">
                      Tahapan Rantai Verifikasi:
                    </div>

                    <div className="space-y-2 relative">
                      {profile.steps && profile.steps.map((st, idx) => {
                        const sourceInfo = APPROVER_SOURCE_LABELS[st.approver_source] || {
                          label: st.approver_source,
                          color: 'bg-slate-50 text-slate-700 border-slate-200'
                        };

                        return (
                          <div
                            key={st.id || idx}
                            className="p-2.5 rounded-lg border border-outline-variant/20 bg-surface-container-low/40 flex items-start gap-2.5 text-xs"
                          >
                            <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                              {st.step_no}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-on-surface flex items-center justify-between">
                                <span className="truncate">{st.step_name}</span>
                                {st.is_required ? (
                                  <span className="text-[10px] text-primary font-bold">Wajib</span>
                                ) : (
                                  <span className="text-[10px] text-outline font-normal">Opsional</span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${sourceInfo.color}`}>
                                  {sourceInfo.label}
                                </span>
                                {st.sla_hours && (
                                  <span className="text-[10px] text-outline flex items-center gap-0.5 font-medium">
                                    <Clock className="w-2.5 h-2.5" /> SLA {st.sla_hours}j
                                  </span>
                                )}
                                {st.min_days_threshold && (
                                  <span className="text-[10px] text-amber-700 font-medium">
                                    ≥ {st.min_days_threshold} hari
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Linked Types Badges */}
                <div className="p-3.5 bg-surface-container-low/30 border-t border-outline-variant/15 text-xs">
                  <div className="text-[11px] font-bold text-outline uppercase tracking-wider mb-2">
                    Digunakan oleh {linkedTypes.length} Jenis Cuti:
                  </div>
                  {linkedTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {linkedTypes.map((lt) => (
                        <span
                          key={lt.id}
                          className="px-2 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface text-[11px] font-medium"
                        >
                          {lt.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-outline italic">Belum ada jenis cuti yang menggunakan profil ini</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Profile Modal */}
      {modalOpen && editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col max-h-[90vh] overflow-hidden my-auto">
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-on-surface">Ubah Tahapan Profil Persetujuan</h3>
                <p className="text-xs text-on-surface-variant font-mono">{editingProfile.code}</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-error-container/40 border border-error/30 text-xs text-on-error-container flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Nama Profil</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Daftar Tahapan Berjenjang ({steps.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-primary hover:bg-primary/10 text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Tahap
                  </button>
                </div>

                {steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-low space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-on-primary font-bold text-[11px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          required
                          value={st.step_name}
                          onChange={(e) => handleStepChange(idx, 'step_name', e.target.value)}
                          placeholder="Nama Tahap Persetujuan"
                          className="h-8 px-2.5 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="p-1 rounded text-outline hover:text-error transition-colors"
                        title="Hapus Tahap Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-on-surface mb-1">Sumber Verifikator</label>
                        <select
                          value={st.approver_source}
                          onChange={(e) => handleStepChange(idx, 'approver_source', e.target.value)}
                          className="w-full h-8 px-2 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface"
                        >
                          <option value="direct_supervisor">Atasan Langsung Pegawai</option>
                          <option value="unit_head">Kepala Sekolah (KS)</option>
                          <option value="hrd_pool">Pool Tim HRD</option>
                          <option value="yayasan_pool">Pengurus Yayasan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-on-surface mb-1">Target SLA (Jam)</label>
                        <input
                          type="number"
                          min="1"
                          value={st.sla_hours || ''}
                          onChange={(e) => handleStepChange(idx, 'sla_hours', e.target.value)}
                          placeholder="Contoh: 48"
                          className="w-full h-8 px-2 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-on-surface mb-1">Ambang Min. Durasi (Hari)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={st.min_days_threshold || ''}
                          onChange={(e) => handleStepChange(idx, 'min_days_threshold', e.target.value)}
                          placeholder="Semua durasi"
                          className="w-full h-8 px-2 rounded border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                        <input
                          type="checkbox"
                          checked={st.is_required}
                          onChange={(e) => handleStepChange(idx, 'is_required', e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span>Langkah Wajib (Jika opsional dan belum ada atasan, dapat dilewati otomatis)</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-outline-variant/30 text-on-surface-variant text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
