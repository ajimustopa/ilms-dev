import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  Shield,
  Search,
  ArrowRight,
  X,
  RotateCcw
} from 'lucide-react';
import api from '../../../../../shared/services/api';

export default function UnitApproversAndDelegationsSection({
  activeSchoolUnit,
  employees = []
}) {
  const [activeTab, setActiveTab] = useState('approvers'); // 'approvers' | 'delegations'
  const [approvers, setApprovers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [delegations, setDelegations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [approverModalOpen, setApproverModalOpen] = useState(false);
  const [delegationModalOpen, setDelegationModalOpen] = useState(false);

  // Form states
  const [approverForm, setApproverForm] = useState({
    school_unit_id: '',
    employee_id: '',
    valid_from: '',
    valid_to: ''
  });

  const [delegationForm, setDelegationForm] = useState({
    school_unit_id: '',
    delegator_employee_id: '',
    delegate_employee_id: '',
    scope: 'all',
    valid_from: '',
    valid_to: '',
    reason: ''
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchApproverData = async () => {
    setLoading(true);
    try {
      const [appRes, sugRes, delRes] = await Promise.all([
        api.get('/kepegawaian/unit-approvers'),
        api.get('/kepegawaian/unit-approvers/suggestions').catch(() => ({ data: { data: [] } })),
        api.get('/kepegawaian/approval-delegations')
      ]);

      if (appRes.data?.success) setApprovers(appRes.data.data || []);
      if (sugRes.data?.success) setSuggestions(sugRes.data.data || []);
      if (delRes.data?.success) setDelegations(delRes.data.data || []);
    } catch (err) {
      console.error('Fetch approvers & delegations error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproverData();
  }, [activeSchoolUnit]);

  // Set default dates for forms
  const openNewApprover = (preset = null) => {
    const today = new Date().toISOString().slice(0, 10);
    setApproverForm({
      school_unit_id: preset?.school_unit_id || activeSchoolUnit?.id || 1,
      employee_id: preset?.employee_id || '',
      valid_from: today,
      valid_to: ''
    });
    setErrorMsg(null);
    setApproverModalOpen(true);
  };

  const openNewDelegation = () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    setDelegationForm({
      school_unit_id: activeSchoolUnit?.id || 1,
      delegator_employee_id: '',
      delegate_employee_id: '',
      scope: 'all',
      valid_from: today,
      valid_to: nextWeek,
      reason: ''
    });
    setErrorMsg(null);
    setDelegationModalOpen(true);
  };

  const handleSaveApprover = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        school_unit_id: Number(approverForm.school_unit_id),
        employee_id: Number(approverForm.employee_id),
        valid_from: approverForm.valid_from,
        valid_to: approverForm.valid_to || null
      };

      const res = await api.post('/kepegawaian/unit-approvers', payload);
      if (res.data?.success) {
        setApproverModalOpen(false);
        setSuccessMsg('Penetapan Kepala Sekolah berhasil disimpan');
        fetchApproverData();
      }
    } catch (err) {
      console.error('Save approver error:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan penetapan Kepala Sekolah');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApprover = async (id, name) => {
    if (!window.confirm(`Hapus penetapan Kepala Sekolah untuk "${name}"?`)) return;
    try {
      const res = await api.delete(`/kepegawaian/unit-approvers/${id}`);
      if (res.data?.success) {
        fetchApproverData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus penetapan');
    }
  };

  const handleSaveDelegation = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    if (delegationForm.delegator_employee_id === delegationForm.delegate_employee_id) {
      setErrorMsg('Pemberi delegasi dan penerima delegasi tidak boleh orang yang sama.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        school_unit_id: Number(delegationForm.school_unit_id),
        delegator_employee_id: Number(delegationForm.delegator_employee_id),
        delegate_employee_id: Number(delegationForm.delegate_employee_id),
        scope: delegationForm.scope,
        valid_from: delegationForm.valid_from,
        valid_to: delegationForm.valid_to,
        reason: delegationForm.reason.trim()
      };

      const res = await api.post('/kepegawaian/approval-delegations', payload);
      if (res.data?.success) {
        setDelegationModalOpen(false);
        setSuccessMsg('Delegasi persetujuan berhasil dibuat');
        fetchApproverData();
      }
    } catch (err) {
      console.error('Save delegation error:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal membuat delegasi persetujuan');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeDelegation = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin mencabut wewenang delegasi ini?')) return;
    try {
      const res = await api.delete(`/kepegawaian/approval-delegations/${id}`);
      if (res.data?.success) {
        fetchApproverData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencabut delegasi');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('approvers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'approvers'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Penetapan Kepala Sekolah (KS)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest/30 text-[10px]">
              {approvers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delegations')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'delegations'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Delegasi Persetujuan Aktif</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest/30 text-[10px]">
              {delegations.filter((d) => d.is_active && !d.revoked_at).length}
            </span>
          </button>
        </div>

        {activeTab === 'approvers' ? (
          <button
            type="button"
            onClick={() => openNewApprover()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tetapkan KS Baru</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={openNewDelegation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Delegasi Baru</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* TAB 1: KEPALA SEKOLAH */}
      {activeTab === 'approvers' && (
        <div className="space-y-5">
          {/* Suggestions Box */}
          {suggestions.length > 0 && (
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Saran Otomatis Pejabat Struktural Level 1 (Belum Ditetapkan):</span>
              </div>
              <p className="text-[11px] text-blue-700">
                Sistem mendeteksi pejabat pemegang jabatan Level 1 (Kepala Sekolah) dari master data kepegawaian. Klik untuk menetapkan secara resmi:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-2.5 rounded-lg bg-white border border-blue-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{sug.full_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {sug.position_name} • Unit {sug.school_unit_id}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openNewApprover({ school_unit_id: sug.school_unit_id, employee_id: sug.id })}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                    >
                      Tetapkan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table Approvers */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant/15 flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface">Daftar Penetapan Kepala Sekolah Aktif & Riwayat</span>
              <span className="text-[11px] text-outline font-medium">SPEC §6.1 • Explicit Unit Approver</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-container-low/60 border-b border-outline-variant/20 text-[11px] font-bold text-outline uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Satuan Pendidikan</th>
                    <th className="py-3 px-3">Nama Pejabat Kepala Sekolah</th>
                    <th className="py-3 px-3">Peran Approval</th>
                    <th className="py-3 px-3">Periode Berlaku</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-outline">
                        Memuat data penetapan...
                      </td>
                    </tr>
                  ) : approvers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-outline">
                        Belum ada Kepala Sekolah yang ditetapkan di tabel school_unit_approvers.
                      </td>
                    </tr>
                  ) : (
                    approvers.map((app) => {
                      const isValidNow = (!app.valid_to || new Date(app.valid_to) >= new Date());
                      return (
                        <tr key={app.id} className="hover:bg-surface-container-low/50">
                          <td className="py-3 px-4 font-bold text-on-surface">
                            Satuan ID: {app.school_unit_id}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-on-surface">{app.full_name || `Pegawai #${app.employee_id}`}</div>
                            <div className="text-[11px] text-outline font-mono">{app.nip || app.employee_number || ''}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                              {app.approver_role || 'unit_head'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 font-medium">
                              <span>{app.valid_from ? String(app.valid_from).slice(0, 10) : '—'}</span>
                              <span className="text-outline">s/d</span>
                              <span>{app.valid_to ? String(app.valid_to).slice(0, 10) : 'Seterusnya'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isValidNow ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isValidNow ? 'Berlaku' : 'Kadaluarsa'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteApprover(app.id, app.full_name)}
                              className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/40 transition-colors"
                              title="Hapus Penetapan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DELEGASI */}
      {activeTab === 'delegations' && (
        <div className="space-y-4">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant/15 flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface">Daftar Pendelegasian Wewenang Persetujuan</span>
              <span className="text-[11px] text-outline">Aturan Depth-1 • Non-Re-delegasi</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-container-low/60 border-b border-outline-variant/20 text-[11px] font-bold text-outline uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Pemberi Delegasi</th>
                    <th className="py-3 px-3">Penerima Delegasi</th>
                    <th className="py-3 px-3">Cakupan Wewenang</th>
                    <th className="py-3 px-3">Periode Berlaku</th>
                    <th className="py-3 px-3">Alasan</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-outline">
                        Memuat data delegasi...
                      </td>
                    </tr>
                  ) : delegations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-outline">
                        Belum ada riwayat delegasi persetujuan.
                      </td>
                    </tr>
                  ) : (
                    delegations.map((del) => {
                      const isRevoked = Boolean(del.revoked_at);
                      const isExpired = new Date(del.valid_to) < new Date();
                      const isCurrentlyActive = del.is_active && !isRevoked && !isExpired;

                      return (
                        <tr key={del.id} className="hover:bg-surface-container-low/50">
                          <td className="py-3 px-4">
                            <div className="font-bold text-on-surface">{del.delegator_name || `Pegawai #${del.delegator_employee_id}`}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-primary flex items-center gap-1">
                              <ArrowRight className="w-3 h-3 text-outline" />
                              <span>{del.delegate_name || `Pegawai #${del.delegate_employee_id}`}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-surface-container border text-[11px] font-bold uppercase">
                              {del.scope || 'all'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium">
                            {String(del.valid_from).slice(0, 10)} s/d {String(del.valid_to).slice(0, 10)}
                          </td>
                          <td className="py-3 px-3 text-on-surface-variant max-w-xs truncate">
                            {del.reason || '—'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isCurrentlyActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : isRevoked
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isCurrentlyActive ? 'Aktif' : isRevoked ? 'Dicabut' : 'Berakhir'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isCurrentlyActive && (
                              <button
                                type="button"
                                onClick={() => handleRevokeDelegation(del.id)}
                                className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition-colors"
                              >
                                Cabut
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Approver */}
      {approverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden">
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">Tetapkan Kepala Sekolah Satuan Pendidikan</h3>
              <button onClick={() => setApproverModalOpen(false)}>
                <X className="w-5 h-5 text-outline" />
              </button>
            </div>

            <form onSubmit={handleSaveApprover} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-error-container/40 border border-error/30 text-xs text-on-error-container">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Satuan Pendidikan</label>
                <select
                  value={approverForm.school_unit_id}
                  onChange={(e) => setApproverForm({ ...approverForm, school_unit_id: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
                >
                  <option value="1">Unit 1 - SMP Aldepos</option>
                  <option value="2">Unit 2 - SMA Aldepos</option>
                  <option value="3">Unit 3 - Pesantren / IBS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Pilih Pegawai Kepala Sekolah</label>
                <select
                  required
                  value={approverForm.employee_id}
                  onChange={(e) => setApproverForm({ ...approverForm, employee_id: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
                >
                  <option value="">-- Pilih Pegawai --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.nip || emp.employee_number || `ID ${emp.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Berlaku Dari</label>
                  <input
                    type="date"
                    required
                    value={approverForm.valid_from}
                    onChange={(e) => setApproverForm({ ...approverForm, valid_from: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Berlaku Sampai (Opsional)</label>
                  <input
                    type="date"
                    value={approverForm.valid_to}
                    onChange={(e) => setApproverForm({ ...approverForm, valid_to: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setApproverModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-outline-variant/30 text-xs font-semibold text-on-surface-variant"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold shadow-xs"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Penetapan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Delegasi */}
      {delegationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden">
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">Buat Delegasi Wewenang Approval</h3>
              <button onClick={() => setDelegationModalOpen(false)}>
                <X className="w-5 h-5 text-outline" />
              </button>
            </div>

            <form onSubmit={handleSaveDelegation} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-error-container/40 border border-error/30 text-xs text-on-error-container">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Pemberi Delegasi (Delegator)</label>
                <select
                  required
                  value={delegationForm.delegator_employee_id}
                  onChange={(e) => setDelegationForm({ ...delegationForm, delegator_employee_id: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
                >
                  <option value="">-- Pilih Pejabat / Atasan --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.nip || emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Penerima Delegasi (Delegate)</label>
                <select
                  required
                  value={delegationForm.delegate_employee_id}
                  onChange={(e) => setDelegationForm({ ...delegationForm, delegate_employee_id: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
                >
                  <option value="">-- Pilih Penerima Wewenang --</option>
                  {employees
                    .filter((emp) => String(emp.id) !== String(delegationForm.delegator_employee_id))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.nip || emp.employee_number})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Cakupan Wewenang</label>
                  <select
                    value={delegationForm.scope}
                    onChange={(e) => setDelegationForm({ ...delegationForm, scope: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
                  >
                    <option value="all">Semua (Cuti & Lembur)</option>
                    <option value="leave">Hanya Cuti & Izin</option>
                    <option value="overtime">Hanya Lembur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Satuan Pendidikan</label>
                  <select
                    value={delegationForm.school_unit_id}
                    onChange={(e) => setDelegationForm({ ...delegationForm, school_unit_id: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
                  >
                    <option value="1">Unit 1 - SMP</option>
                    <option value="2">Unit 2 - SMA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Dari Tanggal</label>
                  <input
                    type="date"
                    required
                    value={delegationForm.valid_from}
                    onChange={(e) => setDelegationForm({ ...delegationForm, valid_from: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    required
                    value={delegationForm.valid_to}
                    onChange={(e) => setDelegationForm({ ...delegationForm, valid_to: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Alasan Pendelegasian</label>
                <textarea
                  rows={2}
                  required
                  value={delegationForm.reason}
                  onChange={(e) => setDelegationForm({ ...delegationForm, reason: e.target.value })}
                  placeholder="Contoh: Sedang tugas dinas luar kota / cuti tahunan"
                  className="w-full p-2 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setDelegationModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-outline-variant/30 text-xs font-semibold text-on-surface-variant"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold shadow-xs"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Delegasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
