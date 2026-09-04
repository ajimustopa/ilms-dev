import React, { useState, useEffect, useMemo } from 'react';
import { X, FolderInput, ArrowRight, AlertCircle, RefreshCw, CheckCircle2, Layers } from 'lucide-react';
import SearchableSelect from '../../../../shared/components/SearchableSelect';
import api from '../../../../shared/services/api';

/**
 * MoveProgramModal
 * Modal untuk memindahkan Program Kerja / Program Strategis ke Sub-Bidang lainnya.
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - program: object (data program yang ingin dipindahkan)
 * - domains: array of domains
 * - subdomains: array of subdomains
 * - onSuccess: () => void
 */
export default function MoveProgramModal({
  isOpen,
  onClose,
  program,
  domains = [],
  subdomains = [],
  onSuccess,
}) {
  const [selectedSubId, setSelectedSubId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const programId = program?.id || program?.program_id;
  const programCode = program?.code || program?.program_code || '';
  const programName = program?.name || program?.program_name || '';
  const currentDomainName = program?.domain_name || program?.direct_domain_name || '-';
  const currentSubdomainName = program?.subdomain_name || program?.direct_subdomain_name || 'Umum / Lintas Sub-Bidang';
  const currentSubdomainId = program?.subdomain_id || program?.direct_subdomain_id || null;

  useEffect(() => {
    if (isOpen && program) {
      setSelectedSubId(currentSubdomainId ? String(currentSubdomainId) : '');
      setErrorMsg('');
      setLoading(false);
    }
  }, [isOpen, program, currentSubdomainId]);

  // Options for SearchableSelect
  const subdomainOptions = useMemo(() => {
    return subdomains.map((s) => {
      const d = domains.find((dom) => Number(dom.id) === Number(s.domain_id));
      const isCurrent = Number(s.id) === Number(currentSubdomainId);
      return {
        value: String(s.id),
        label: s.name,
        sublabel: d ? `Bidang: ${d.name}` : `Bidang #${s.domain_id}`,
        badge: isCurrent ? 'Saat Ini' : (d?.code || `BID-${d?.order_index || d?.id || ''}`),
        badgeClass: isCurrent ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-50 text-blue-700 border-blue-200',
      };
    });
  }, [subdomains, domains, currentSubdomainId]);

  const targetSubdomain = useMemo(() => {
    return subdomains.find((s) => String(s.id) === String(selectedSubId));
  }, [subdomains, selectedSubId]);

  const targetDomain = useMemo(() => {
    if (!targetSubdomain) return null;
    return domains.find((d) => Number(d.id) === Number(targetSubdomain.domain_id));
  }, [domains, targetSubdomain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!programId) return;
    if (!selectedSubId) {
      setErrorMsg('Silakan pilih Sub-Bidang tujuan.');
      return;
    }

    if (Number(selectedSubId) === Number(currentSubdomainId)) {
      setErrorMsg('Sub-Bidang tujuan sama dengan lokasi saat ini. Silakan pilih Sub-Bidang yang berbeda.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await api.post(`/manajemen/rips/programs/${programId}/move`, {
        subdomain_id: Number(selectedSubId),
        domain_id: targetSubdomain?.domain_id ? Number(targetSubdomain.domain_id) : undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error moving program:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memindahkan program ke sub-bidang target.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !program) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Pindahkan Sub-Bidang Program</h3>
              <p className="text-xs text-slate-400">Pindahkan program kerja ke unit sub-bidang lainnya</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Program info banner */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                {programCode}
              </span>
              <span className="text-xs font-bold text-white leading-snug">
                {programName}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div>
                <span className="text-[11px] text-slate-500 block uppercase font-semibold">Lokasi Saat Ini:</span>
                <span className="font-medium text-slate-300">
                  {currentDomainName} &rsaquo; <strong className="text-amber-400 font-bold">{currentSubdomainName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Target Subdomain Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Pilih Sub-Bidang Tujuan <span className="text-rose-400">*</span>
            </label>
            <SearchableSelect
              value={selectedSubId}
              onChange={(val) => {
                setSelectedSubId(val || '');
                setErrorMsg('');
              }}
              placeholder="-- Pilih Sub-Bidang Baru --"
              searchPlaceholder="Cari nama sub-bidang atau bidang..."
              options={subdomainOptions}
              className="w-full"
            />
            <p className="text-[11px] text-slate-500">
              Program akan secara otomatis dialihkan ke kelompok Sub-Bidang dan Bidang yang Anda pilih.
            </p>
          </div>

          {/* Preview Destination */}
          {targetSubdomain && (
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-slate-300 space-y-1 animate-fadeIn">
              <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pratinjau Lokasi Baru:</span>
              </div>
              <div className="pl-5 text-[11.5px]">
                <div>Bidang: <strong className="text-white">{targetDomain?.name || '-'}</strong></div>
                <div>Sub-Bidang: <strong className="text-amber-300">{targetSubdomain.name}</strong></div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading || !selectedSubId || Number(selectedSubId) === Number(currentSubdomainId)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memindahkan...</span>
                </>
              ) : (
                <>
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Pindahkan Program</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
