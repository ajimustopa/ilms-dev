import React, { useState } from 'react';
import {
  X,
  Copy,
  Calendar,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function HolidayCopyYearModal({
  isOpen,
  onClose,
  selectedYear = '2026',
  activeSchoolUnit = null,
  onSuccess
}) {
  const currentYearNum = parseInt(selectedYear, 10) || 2026;
  const [fromYear, setFromYear] = useState(String(currentYearNum - 1));
  const [toYear, setToYear] = useState(String(currentYearNum));
  const [schoolUnitId, setSchoolUnitId] = useState(activeSchoolUnit?.id ? String(activeSchoolUnit.id) : '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCopy = async (e) => {
    e.preventDefault();
    if (fromYear === toYear) {
      setErrorMsg('Tahun asal dan tahun tujuan tidak boleh sama');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.post('/kepegawaian/holidays/copy-year', {
        from_year: Number(fromYear),
        to_year: Number(toYear),
        school_unit_id: schoolUnitId ? Number(schoolUnitId) : null
      });

      if (res.data?.success) {
        onSuccess?.(res.data.message || `Berhasil menyalin hari libur ke tahun ${toYear}`);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyalin hari libur antar tahun');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Salin Kalender dari Tahun Lalu
              </h3>
              <p className="text-xs text-slate-500">
                Duplikasi daftar hari libur & agenda tahun sebelumnya secara instan
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

        {/* Body */}
        <form onSubmit={handleCopy} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Policy Information Box */}
          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-2 text-xs text-blue-900">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Aturan Penyesuaian Status Duplikasi (SPEC §10.4):</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-blue-800">
              <li>
                <b>Fixed Date</b> (Hari bertanggal tetap seperti 17 Agustus atau 1 Januari) disalin dengan status <span className="font-semibold text-emerald-700">Dikonfirmasi (Aktif)</span>.
              </li>
              <li>
                <b>Floating Date</b> (Hari bergeser seperti Idul Fitri, Isra Miraj, atau Cuti Bersama) disalin sebagai <span className="font-semibold text-amber-700">Draft Perlu Ditinjau</span> agar HRD dapat mengoreksi tanggal resminya.
              </li>
              <li>
                Data yang sudah ada pada tahun tujuan tidak akan ditimpa (aman dari duplikasi).
              </li>
            </ul>
          </div>

          {/* Grid: From Year & To Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahun Asal (Sumber) *
              </label>
              <select
                value={fromYear}
                onChange={(e) => setFromYear(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2024">Tahun 2024</option>
                <option value="2025">Tahun 2025</option>
                <option value="2026">Tahun 2026</option>
                <option value="2027">Tahun 2027</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahun Tujuan *
              </label>
              <select
                value={toYear}
                onChange={(e) => setToYear(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2025">Tahun 2025</option>
                <option value="2026">Tahun 2026</option>
                <option value="2027">Tahun 2027</option>
                <option value="2028">Tahun 2028</option>
              </select>
            </div>
          </div>

          {/* Satuan Pendidikan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Satuan Pendidikan
            </label>
            <select
              value={schoolUnitId}
              onChange={(e) => setSchoolUnitId(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Satuan (Global Yayasan &amp; Unit)</option>
              <option value="1">SMP IT Aldepos Islamic Boarding School</option>
              <option value="2">SMA IT Aldepos Islamic Boarding School</option>
            </select>
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
              disabled={isSubmitting || fromYear === toYear}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyalin Data...</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin ke Tahun {toYear}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
