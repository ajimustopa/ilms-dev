import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import DatePickerField from '../../../shared/components/DatePickerField';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatNumber, formatPercentage, formatDate } from '../../../shared/utils/formatters';
import {
  CreditCard,
  Plus,
  Printer,
  Edit2,
  Receipt,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
  Eye,
  AlertCircle,
  RotateCw,
  Building2,
  Calendar,
  Layers,
  TrendingUp,
  FileText,
  History,
  Info,
  GraduationCap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sliders,
  Settings2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HelpCircle,
  Coins,
  Percent,
  UserCheck
} from 'lucide-react';

const MONTH_NAMES = {
  1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
  5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
  9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
};

export const formatDateToDMY = (dateInput) => formatDate(dateInput);

export function terbilang(n) {
  const bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const num = Math.floor(Math.abs(Number(n) || 0));
  if (num < 12) return bilangan[num];
  if (num < 20) return `${terbilang(num - 10)} Belas`;
  if (num < 100) return `${terbilang(Math.floor(num / 10))} Puluh ${terbilang(num % 10)}`.trim();
  if (num < 200) return `Seratus ${terbilang(num - 100)}`.trim();
  if (num < 1000) return `${terbilang(Math.floor(num / 100))} Ratus ${terbilang(num % 100)}`.trim();
  if (num < 2000) return `Seribu ${terbilang(num - 1000)}`.trim();
  if (num < 1000000) return `${terbilang(Math.floor(num / 1000))} Ribu ${terbilang(num % 1000)}`.trim();
  if (num < 1000000000) return `${terbilang(Math.floor(num / 1000000))} Juta ${terbilang(num % 1000000)}`.trim();
  if (num < 1000000000000) return `${terbilang(Math.floor(num / 1000000000))} Miliar ${terbilang(num % 1000000000)}`.trim();
  return `${terbilang(Math.floor(num / 1000000000000))} Triliun ${terbilang(num % 1000000000000)}`.trim();
}

/**
 * Daftar Palet Warna Tematik & Elegan untuk setiap jenis komponen tagihan.
 */
const FEE_TYPE_PALETTES = [
  // 0: Blue (SPP / Bulanan)
  { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500', badgeBg: 'bg-blue-100' },
  // 1: Emerald (Pangkal / Pembangunan / Infaq Gedung / Sarpras)
  { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500', badgeBg: 'bg-emerald-100' },
  // 2: Purple / Violet (Buku / Kitab / Modul / LKS)
  { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500', badgeBg: 'bg-purple-100' },
  // 3: Rose / Pink (Seragam / Atribut)
  { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500', badgeBg: 'bg-rose-100' },
  // 4: Sky / Cyan (Ujian / Evaluasi / PTS / PAS)
  { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-500', badgeBg: 'bg-sky-100' },
  // 5: Amber (Tunggakan TP Lalu)
  { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-300', dot: 'bg-amber-500', badgeBg: 'bg-amber-100' },
  // 6: Teal (Kegiatan / Ekstrakurikuler / Outing)
  { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-500', badgeBg: 'bg-teal-100' },
  // 7: Orange (Asrama / Catering / Makan)
  { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500', badgeBg: 'bg-orange-100' },
  // 8: Fuchsia / Magenta (Wisuda / Kelulusan / Ijazah)
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-800', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500', badgeBg: 'bg-fuchsia-100' },
  // 9: Indigo (Daftar Ulang / Registrasi)
  { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500', badgeBg: 'bg-indigo-100' }
];

/**
 * Helper pemetaan warna spesifik & konsisten untuk setiap jenis/komponen tagihan.
 */
export function getFeeTypeColorStyle(name = '', code = '', id = null) {
  const cleanName = String(name || '').trim().toLowerCase();
  const cleanCode = String(code || '').trim().toLowerCase();

  // 1. Tunggakan TP Lalu / Arrears
  if (cleanCode === 'arrears_previous_year' || cleanName.includes('tunggakan') || cleanCode.includes('arrear')) {
    return FEE_TYPE_PALETTES[5]; // Amber
  }

  // 2. SPP / Iuran Bulanan / Syahriah / Monthly
  if (cleanCode.includes('spp') || cleanName.includes('spp') || cleanName.includes('syahriah') || cleanName.includes('iuran bulanan') || cleanCode === 'monthly') {
    return FEE_TYPE_PALETTES[0]; // Blue
  }

  // 3. Uang Pangkal / Pembangunan / Infaq Gedung / Sarpras / Fasilitas / PPDB
  if (
    cleanName.includes('pangkal') ||
    cleanName.includes('pembangunan') ||
    cleanName.includes('gedung') ||
    cleanName.includes('infaq') ||
    cleanName.includes('sarpras') ||
    cleanCode.includes('building') ||
    cleanCode.includes('development') ||
    cleanCode.includes('registration') ||
    cleanName.includes('daftar baru')
  ) {
    return FEE_TYPE_PALETTES[1]; // Emerald
  }

  // 4. Buku / Kitab / Modul / LKS / Lembar Kerja
  if (cleanName.includes('buku') || cleanName.includes('kitab') || cleanName.includes('modul') || cleanName.includes('lks') || cleanCode.includes('book')) {
    return FEE_TYPE_PALETTES[2]; // Purple
  }

  // 5. Seragam / Atribut / Pakaian
  if (cleanName.includes('seragam') || cleanName.includes('atribut') || cleanName.includes('kaos') || cleanName.includes('jas') || cleanName.includes('jilbab') || cleanCode.includes('uniform')) {
    return FEE_TYPE_PALETTES[3]; // Rose
  }

  // 6. Ujian / UTS / UAS / PAS / PAT / PTS / Asesmen / Munaqasyah / Evaluasi
  if (
    cleanName.includes('ujian') ||
    cleanName.includes('uts') ||
    cleanName.includes('uas') ||
    cleanName.includes('pas') ||
    cleanName.includes('pat') ||
    cleanName.includes('pts') ||
    cleanName.includes('asesmen') ||
    cleanName.includes('munaqasyah') ||
    cleanCode.includes('exam')
  ) {
    return FEE_TYPE_PALETTES[4]; // Sky
  }

  // 7. Kegiatan / Ekstrakurikuler / Outing / Field Trip / Rihlah / Kemah
  if (cleanName.includes('kegiatan') || cleanName.includes('ekstra') || cleanName.includes('outing') || cleanName.includes('rihlah') || cleanName.includes('kemah') || cleanCode.includes('activity')) {
    return FEE_TYPE_PALETTES[6]; // Teal
  }

  // 8. Asrama / Catering / Makan / Dapur / Boarding
  if (
    cleanName.includes('makan') ||
    cleanName.includes('catering') ||
    cleanName.includes('asrama') ||
    cleanName.includes('boarding') ||
    cleanName.includes('dapur') ||
    cleanCode.includes('catering') ||
    cleanCode.includes('boarding')
  ) {
    return FEE_TYPE_PALETTES[7]; // Orange
  }

  // 9. Wisuda / Kelulusan / Ijazah / Haflah / Akhirussanah
  if (
    cleanName.includes('wisuda') ||
    cleanName.includes('kelulusan') ||
    cleanName.includes('ijazah') ||
    cleanName.includes('haflah') ||
    cleanName.includes('akhirussanah') ||
    cleanCode.includes('graduation')
  ) {
    return FEE_TYPE_PALETTES[8]; // Fuchsia
  }

  // 10. Daftar Ulang / Registrasi Ulang / Her-Registrasi / Tahunan
  if (
    cleanName.includes('daftar ulang') ||
    cleanName.includes('registrasi ulang') ||
    cleanName.includes('her-registrasi') ||
    cleanName.includes('tahunan') ||
    cleanCode.includes('reregistration')
  ) {
    return FEE_TYPE_PALETTES[9]; // Indigo
  }

  // 11. Hash-based fallback untuk jenis tagihan kustom lainnya agar warna deterministik & bervariasi
  let hash = 0;
  const str = String(id || cleanCode || cleanName);
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % FEE_TYPE_PALETTES.length;
  }
  return FEE_TYPE_PALETTES[Math.abs(hash) % FEE_TYPE_PALETTES.length];
}

export function FeeTypeBadge({ item, name, code, id, className = '', showDot = true, size = 'sm' }) {
  const displayName = name || item?.component_display || item?.fee_type_name || item?.payment_for || item?.name || '-';
  const ftCode = code || item?.fee_type_code || '';
  const ftId = id || item?.fee_type_id || item?.id;
  const style = getFeeTypeColorStyle(displayName, ftCode, ftId);

  const sizeClass = size === 'xs'
    ? 'px-1.5 py-0.5 text-[9.5px]'
    : size === 'md'
    ? 'px-2.5 py-1 text-xs'
    : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-md border shadow-2xs transition-colors ${style.bg} ${style.text} ${style.border} ${sizeClass} ${className}`}
      title={`Komponen Biaya: ${displayName}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      )}
      <span className="truncate max-w-[220px]">{displayName}</span>
    </span>
  );
}

/**
 * Komponen Indikator Pemeriksaan Kecocokan Nominal Pembayaran vs Mutasi Rekening Koran
 */
export function StatementMatchIndicator({ inputAmount, statement, onSyncAmount, isCompact = false }) {
  if (!statement) return null;

  const inputVal = parseFloat(inputAmount) || 0;
  const statTotal = parseFloat(statement.amount) || 0;
  const statRemaining = parseFloat(statement.remaining_amount !== undefined ? statement.remaining_amount : statement.amount) || 0;

  // Keadaan / Status
  const isInputEmpty = inputVal <= 0;
  const isExactGrossMatch = Math.abs(inputVal - statTotal) < 0.01;
  const isExactRemMatch = Math.abs(inputVal - statRemaining) < 0.01;
  const isExactMatch = !isInputEmpty && (isExactGrossMatch || isExactRemMatch);
  const isPartialMatch = !isInputEmpty && inputVal < statRemaining - 0.01;
  const isOverLimit = !isInputEmpty && inputVal > statRemaining + 0.01;

  if (isCompact) {
    if (isInputEmpty) {
      return (
        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500 mt-1">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Plafon RK: <b>{formatCurrency(statRemaining)}</b></span>
          {onSyncAmount && (
            <button
              type="button"
              onClick={() => onSyncAmount(statRemaining)}
              className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer ml-1"
            >
              Isi Otomatis
            </button>
          )}
        </div>
      );
    }

    if (isExactMatch) {
      return (
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 mt-1 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>✓ Cocok 100% dengan Mutasi RK ({formatCurrency(inputVal)})</span>
        </div>
      );
    }

    if (isPartialMatch) {
      return (
        <div className="flex items-center justify-between gap-1 text-[10.5px] font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 mt-1 animate-in fade-in">
          <div className="flex items-center gap-1 min-w-0">
            <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">Parsial: {formatCurrency(inputVal)} dari sisa RK {formatCurrency(statRemaining)}</span>
          </div>
          {onSyncAmount && (
            <button
              type="button"
              onClick={() => onSyncAmount(statRemaining)}
              className="text-indigo-600 hover:text-indigo-800 underline font-black cursor-pointer shrink-0 ml-1"
              title="Samakan nominal input dengan total sisa plafon mutasi rekening koran"
            >
              Samakan
            </button>
          )}
        </div>
      );
    }

    if (isOverLimit) {
      const excess = inputVal - statRemaining;
      return (
        <div className="flex items-center justify-between gap-1 text-[10.5px] font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-300 ring-1 ring-rose-400/30 mt-1 animate-in fade-in">
          <div className="flex items-center gap-1 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 animate-pulse" />
            <span className="truncate">⚠ Melebihi plafon RK! (Maks: {formatCurrency(statRemaining)}, Lebih: +{formatCurrency(excess)})</span>
          </div>
          {onSyncAmount && (
            <button
              type="button"
              onClick={() => onSyncAmount(statRemaining)}
              className="text-rose-700 hover:text-rose-900 bg-white px-2 py-0.5 rounded border border-rose-300 underline font-black cursor-pointer shrink-0 ml-1 shadow-2xs"
              title="Sesuaikan nominal otomatis agar pas dengan sisa plafon mutasi RK"
            >
              Sesuaikan
            </button>
          )}
        </div>
      );
    }

    return null;
  }

  // Detailed Card Banner
  return (
    <div className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-all ${
      isInputEmpty
        ? 'bg-slate-50 border-slate-200 text-slate-700'
        : isExactMatch
        ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900 shadow-2xs'
        : isPartialMatch
        ? 'bg-indigo-50/95 border-indigo-200 text-indigo-900'
        : 'bg-rose-50/95 border-rose-300 text-rose-900 ring-1 ring-rose-400/30 shadow-2xs'
    }`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-bold">
          {isInputEmpty && <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />}
          {isExactMatch && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {isPartialMatch && <Info className="w-4 h-4 text-indigo-600 shrink-0" />}
          {isOverLimit && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />}

          <span>
            {isInputEmpty && 'Pemeriksaan: Nominal Pembayaran Belum Diisi'}
            {isExactMatch && 'Kecocokan Nominal: ✓ Sempurna (100% Match)'}
            {isPartialMatch && 'Kecocokan Nominal: ℹ Alokasi Parsial / Sebagian Mutasi (Valid)'}
            {isOverLimit && 'Kecocokan Nominal: ⚠ Tidak Cocok! Melebihi Plafon Mutasi RK'}
          </span>
        </div>

        {onSyncAmount && !isExactMatch && (
          <button
            type="button"
            onClick={() => onSyncAmount(statRemaining)}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1 ${
              isOverLimit
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
            }`}
          >
            <span>⚡ {isOverLimit ? 'Sesuaikan ke Plafon RK' : 'Samakan ke Plafon RK'} ({formatCurrency(statRemaining)})</span>
          </button>
        )}
      </div>

      <p className="text-[11px] leading-relaxed opacity-90 font-medium">
        {isInputEmpty && (
          <>Sisa plafon mutasi rekening koran yang siap dialokasikan sebesar <b>{formatCurrency(statRemaining)}</b>.</>
        )}
        {isExactMatch && (
          <>Nominal pembayaran yang dicatat (<b>{formatCurrency(inputVal)}</b>) cocok 100% dengan {isExactGrossMatch ? 'nominal mutasi' : 'sisa plafon'} rekening koran.</>
        )}
        {isPartialMatch && (
          <>
            Nominal diterima <b>{formatCurrency(inputVal)}</b> dari sisa plafon mutasi <b>{formatCurrency(statRemaining)}</b>. Sisa mutasi <b>{formatCurrency(statRemaining - inputVal)}</b> tetap tersimpan dan dapat digunakan pada kwitansi pembayaran santri berikutnya.
          </>
        )}
        {isOverLimit && (
          <>
            Total nominal diterima (<b>{formatCurrency(inputVal)}</b>) melebihi sisa plafon mutasi rekening koran (<b>{formatCurrency(statRemaining)}</b>) sebesar <b>+{formatCurrency(inputVal - statRemaining)}</b>. Harap sesuaikan nominal agar tidak melampaui dana mutasi bank yang sah.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Membuka Kwitansi Resmi Bertanda Tangan Digital di Tab Baru & Auto Print
 */
export function openReceiptInNewTab(receipt, unitName = 'Satuan Pendidikan Aldepos') {
  if (!receipt) return;

  const receiptNo = receipt.receipt_number || `KWT-${Date.now()}`;
  const schoolUnitName = receipt.school_unit?.name || unitName || 'Satuan Pendidikan Aldepos';
  const schoolUnitAddress = receipt.school_unit?.address || 'Jl. Abdul Fatah No.24, Tapos II, Kec. Tenjolaya, Kabupaten Bogor, Jawa Barat 16370';
  const studentName = receipt.student?.name || receipt.student_name || '-';
  const studentNis = receipt.student?.nis || receipt.nis || '-';
  const studentClass = receipt.student?.class_name || receipt.class_name || '-';
  const totalAmount = parseFloat(receipt.amount || 0);
  const words = receipt.amount_in_words || `${terbilang(totalAmount)} Rupiah`;
  const paidDate = receipt.paid_at ? String(receipt.paid_at).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const isHistorical = Boolean(receipt.is_legacy);
  const items = receipt.items && receipt.items.length > 0 ? receipt.items : [
    {
      fee_type_name: receipt.payment_for || receipt.fee_type_name || 'Pembayaran Tagihan Siswa',
      period: (receipt.period_month && Number(receipt.period_month) > 0)
        ? `${MONTH_NAMES[receipt.period_month] || receipt.period_month} ${receipt.academic_year_name || receipt.period_year || ''}`.trim()
        : (receipt.academic_year_name || receipt.period_year || '-'),
      amount: totalAmount
    }
  ];

  const verifyUrl = `https://core.aldepos.sch.id/verify/kwitansi?receipt=${encodeURIComponent(receiptNo)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up terblokir oleh browser. Izinkan pop-up untuk mencetak kwitansi.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Kwitansi Pembayaran - ${receiptNo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 36px; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
        .brand h1 { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
        .brand p { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.4; }
        .receipt-badge { text-align: right; }
        .badge-title { font-size: 16px; font-weight: 800; color: ${isHistorical ? '#d97706' : '#0284c7'}; }
        .badge-no { font-family: monospace; font-size: 13px; font-weight: 700; color: #334155; margin-top: 3px; }
        
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 12px; background: #f8fafc; padding: 14px 18px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .meta-row { display: flex; margin-bottom: 6px; }
        .meta-row:last-child { margin-bottom: 0; }
        .meta-label { width: 110px; color: #64748b; font-weight: 600; }
        .meta-val { font-weight: 700; color: #0f172a; flex: 1; }

        .historical-banner { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 10px 14px; border-radius: 10px; font-size: 11px; margin-bottom: 18px; font-weight: 600; line-height: 1.4; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th { background: #f1f5f9; color: #334155; font-weight: 700; padding: 10px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
        .text-right { text-align: right; }
        .total-row td { font-weight: 800; font-size: 13px; background: #f8fafc; border-top: 2px solid #cbd5e1; }
        
        .terbilang-box { background: #f0fdf4; border: 1px dashed #86efac; border-radius: 10px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; }
        .terbilang-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 0.5px; }
        .terbilang-text { font-weight: 700; color: #15803d; font-style: italic; margin-top: 2px; }

        .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        .digital-box { display: flex; align-items: center; gap: 14px; background: #fafafa; border: 1px solid #e5e7eb; padding: 12px; border-radius: 12px; }
        .qr-img { width: 75px; height: 75px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .digital-text h4 { font-size: 11px; font-weight: 800; color: #0f172a; }
        .digital-text p { font-size: 10px; color: #64748b; line-height: 1.3; margin-top: 2px; }
        .digital-badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-top: 4px; }
        
        .sign-box { text-align: right; font-size: 11px; }
        .sign-date { color: #64748b; }
        .sign-role { font-weight: 700; color: #0f172a; margin-top: 2px; }
        .sign-name { margin-top: 48px; font-weight: 800; color: #0f172a; letter-spacing: 2px; }

        .print-btn-bar { display: flex; justify-content: center; gap: 10px; margin-top: 24px; }
        .btn { padding: 8px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; }
        .btn-primary { background: #0284c7; color: #fff; }
        .btn-secondary { background: #e2e8f0; color: #334155; }

        @media print {
          body { background: #fff; padding: 0; }
          .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
          .print-btn-bar { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">
            <h1>${schoolUnitName}</h1>
            <p>${schoolUnitAddress}</p>
          </div>
          <div class="receipt-badge">
            <div class="badge-title">${isHistorical ? 'KWITANSI CATATAN RIWAYAT (NON-KAS)' : 'KWITANSI PEMBAYARAN RESMI'}</div>
            <div class="badge-no">${receiptNo}</div>
          </div>
        </div>

        ${isHistorical ? `
        <div class="historical-banner">
          ℹ️ <strong>Pencatatan Riwayat Saja (Non-Kas):</strong> Transaksi ini dicatat untuk memperbarui riwayat pelunasan tagihan siswa tanpa memengaruhi saldo kas/bank buku kas aktif.
        </div>
        ` : ''}

        <div class="meta-grid">
          <div>
            <div class="meta-row">
              <span class="meta-label">${receipt.is_multi_student ? 'Nama Siswa:' : 'Nama Siswa:'}</span>
              <span class="meta-val" style="font-weight: 700; color: #1e293b;">${studentName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">NIS / NIPD:</span>
              <span class="meta-val">${studentNis}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Kelas / Rombel:</span>
              <span class="meta-val">${studentClass}</span>
            </div>
          </div>
          <div>
            <div class="meta-row">
              <span class="meta-label">Tanggal Bayar:</span>
              <span class="meta-val">${paidDate}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Metode Bayar:</span>
              <span class="meta-val">${isHistorical ? 'RIWAYAT (NON-KAS)' : (receipt.payment_method || 'Tunai').toUpperCase()}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Akun Kas:</span>
              <span class="meta-val">${receipt.cash_account_name || (isHistorical ? 'Non-Kas (Catatan Riwayat)' : 'Kasir Loket')}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th>Komponen Tagihan & Keterangan</th>
              <th style="width: 140px;">Periode</th>
              <th class="text-right" style="width: 160px;">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td style="font-weight: 600;">
                  ${it.student_name ? `<span style="display:inline-block; font-size:11px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:1px 6px; border-radius:4px; margin-bottom:3px; font-weight:700;">👤 ${it.student_name}${it.student_nis ? ` (${it.student_nis})` : ''}${it.class_name ? ` - ${it.class_name}` : ''}</span><br/>` : ''}
                  ${it.fee_type_name || it.component_name || 'Tagihan Biaya'}
                </td>
                <td>${it.period || '-'}</td>
                <td class="text-right" style="font-weight: 700; font-family: monospace;">Rp ${parseFloat(it.amount || 0).toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" style="text-align: right; text-transform: uppercase;">Total Penerimaan:</td>
              <td class="text-right" style="color: #047857; font-family: monospace;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <div class="terbilang-box">
          <div class="terbilang-label">Terbilang</div>
          <div class="terbilang-text"># ${words} #</div>
        </div>

        <div class="signature-section">
          <div class="digital-box">
            <img src="${qrUrl}" alt="QR Verification" class="qr-img" />
            <div class="digital-text">
              <h4>VERIFIKASI ELEKTRONIK</h4>
              <p>Dokumen ini telah disahkan secara elektronik melalui Sistem Keuangan Aldepos.</p>
              <div class="digital-badge">&#10003; VALID & TERDAFTAR RESMI</div>
            </div>
          </div>
          <div class="sign-box">
            <div class="sign-date">Bogor, ${paidDate}</div>
            <div class="sign-role">Petugas Keuangan / Kasir,</div>
            <div class="sign-name">................................................</div>
          </div>
        </div>

        <div class="print-btn-bar">
          <button class="btn btn-primary" onclick="window.print()">&#128424; Cetak / Simpan PDF</button>
          <button class="btn btn-secondary" onclick="window.close()">Tutup Jendela</button>
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 600);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Membuka Kwitansi Resmi Bukti Kas Masuk (Penerimaan Lainnya) di Tab Baru & Auto Print
 */
export function openOtherIncomeReceiptInNewTab(receipt, unitName = 'Satuan Pendidikan Aldepos') {
  if (!receipt) return;

  const receiptNo = receipt.receipt_number || `BKM-${receipt.id || Date.now()}`;
  const schoolUnitName = receipt.school_unit?.name || unitName || 'Satuan Pendidikan Aldepos';
  const schoolUnitAddress = receipt.school_unit?.address || 'Jl. Abdul Fatah No.24, Tapos II, Kec. Tenjolaya, Kabupaten Bogor, Jawa Barat 16370';
  const payerName = receipt.payer_name || 'Hamba Allah / Penyetor Umum';
  const totalAmount = parseFloat(receipt.amount || 0);
  const words = `${terbilang(totalAmount)} Rupiah`;
  const receivedDate = receipt.received_at ? String(receipt.received_at).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const incomeName = receipt.notes || receipt.budget_income_name || receipt.category_name || 'Penerimaan Kas Lainnya';
  const cashAccountName = receipt.cash_account_name || 'Kasir / Bank Penampung';
  const creditAccountText = receipt.credit_account_name ? `${receipt.credit_account_code ? receipt.credit_account_code + ' - ' : ''}${receipt.credit_account_name}` : 'Pendapatan Lain-lain';
  const debitAccountText = receipt.debit_account_name ? `${receipt.debit_account_code ? receipt.debit_account_code + ' - ' : ''}${receipt.debit_account_name}` : 'Kas / Bank';

  const verifyUrl = `https://core.aldepos.sch.id/verify/bkm?receipt=${encodeURIComponent(receiptNo)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up terblokir oleh browser. Izinkan pop-up untuk mencetak kwitansi.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Bukti Kas Masuk - ${receiptNo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 36px; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
        .brand h1 { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
        .brand p { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.4; }
        .receipt-badge { text-align: right; }
        .badge-title { font-size: 16px; font-weight: 800; color: #059669; }
        .badge-no { font-family: monospace; font-size: 13px; font-weight: 700; color: #334155; margin-top: 3px; }
        
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 12px; background: #f8fafc; padding: 14px 18px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .meta-row { display: flex; margin-bottom: 6px; }
        .meta-row:last-child { margin-bottom: 0; }
        .meta-label { width: 130px; color: #64748b; font-weight: 600; }
        .meta-val { font-weight: 700; color: #0f172a; flex: 1; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th { background: #f1f5f9; color: #334155; font-weight: 700; padding: 10px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
        .text-right { text-align: right; }
        .total-row td { font-weight: 800; font-size: 13px; background: #f8fafc; border-top: 2px solid #cbd5e1; }
        
        .terbilang-box { background: #f0fdf4; border: 1px dashed #86efac; border-radius: 10px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; }
        .terbilang-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 0.5px; }
        .terbilang-text { font-weight: 700; color: #15803d; font-style: italic; margin-top: 2px; }

        .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        .digital-box { display: flex; align-items: center; gap: 14px; background: #fafafa; border: 1px solid #e5e7eb; padding: 12px; border-radius: 12px; }
        .qr-img { width: 75px; height: 75px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .digital-text h4 { font-size: 11px; font-weight: 800; color: #0f172a; }
        .digital-text p { font-size: 10px; color: #64748b; line-height: 1.3; margin-top: 2px; }
        .digital-badge { display: inline-block; background: #d1fae5; color: #065f46; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-top: 4px; }
        
        .sign-box { text-align: right; font-size: 11px; }
        .sign-date { color: #64748b; }
        .sign-role { font-weight: 700; color: #0f172a; margin-top: 2px; }
        .sign-name { margin-top: 48px; font-weight: 800; color: #0f172a; letter-spacing: 2px; }

        .print-btn-bar { display: flex; justify-content: center; gap: 10px; margin-top: 24px; }
        .btn { padding: 8px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; }
        .btn-primary { background: #059669; color: #fff; }
        .btn-secondary { background: #e2e8f0; color: #334155; }

        @media print {
          body { background: #fff; padding: 0; }
          .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
          .print-btn-bar { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">
            <h1>${schoolUnitName}</h1>
            <p>${schoolUnitAddress}</p>
          </div>
          <div class="receipt-badge">
            <div class="badge-title">BUKTI KAS MASUK (BKM)</div>
            <div class="badge-no">${receiptNo}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-row">
              <span class="meta-label">Diterima Dari:</span>
              <span class="meta-val" style="font-weight: 700; color: #1e293b;">${payerName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Pos Anggaran RAPBS:</span>
              <span class="meta-val">${receipt.budget_income_name || 'Di Luar Perencanaan RAPBS'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Kategori Penerimaan:</span>
              <span class="meta-val">${receipt.category_name || (receipt.source_category === 'bos_government' ? 'BOS Pemerintah' : receipt.source_category === 'grant_foundation' ? 'Subsidi / Hibah Yayasan' : receipt.source_category === 'donation_waqf' ? 'Donasi / Infaq' : 'Penerimaan Lainnya')}</span>
            </div>
          </div>
          <div>
            <div class="meta-row">
              <span class="meta-label">Tanggal Diterima:</span>
              <span class="meta-val">${receivedDate}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Rekening Kas/Bank:</span>
              <span class="meta-val">${cashAccountName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Akun Akuntansi:</span>
              <span class="meta-val">${creditAccountText}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th>Uraian / Keterangan Penerimaan</th>
              <th style="width: 180px;">Pos RAPBS / Akun Pendapatan</th>
              <th class="text-right" style="width: 160px;">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td style="font-weight: 600;">
                ${incomeName}
                ${receipt.override_reason ? `<br/><span style="font-size:10px; color:#64748b;">Catatan Akuntansi: ${receipt.override_reason}</span>` : ''}
              </td>
              <td>${receipt.budget_income_name || creditAccountText}</td>
              <td class="text-right" style="font-weight: 700; font-family: monospace;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align: right; text-transform: uppercase;">Total Kas Diterima:</td>
              <td class="text-right" style="color: #059669; font-family: monospace;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <div class="terbilang-box">
          <div class="terbilang-label">Terbilang</div>
          <div class="terbilang-text"># ${words} #</div>
        </div>

        <div class="signature-section">
          <div class="digital-box">
            <img src="${qrUrl}" alt="QR Verification" class="qr-img" />
            <div class="digital-text">
              <h4>VERIFIKASI ELEKTRONIK</h4>
              <p>Dokumen BKM ini telah dibukukan secara resmi ke Jurnal & Buku Kas Aldepos.</p>
              <div class="digital-badge">&#10003; VALID & TERDAFTAR RESMI</div>
            </div>
          </div>
          <div class="sign-box">
            <div class="sign-date">Bogor, ${receivedDate}</div>
            <div class="sign-role">Bendahara / Petugas Keuangan,</div>
            <div class="sign-name">................................................</div>
          </div>
        </div>

        <div class="print-btn-bar">
          <button class="btn btn-primary" onclick="window.print()">&#128424; Cetak / Simpan PDF</button>
          <button class="btn btn-secondary" onclick="window.close()">Tutup Jendela</button>
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 600);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function Payments() {
  const { activeSchoolUnit } = useAuth();

  // Top-Level Penerimaan Category: 'payment_receipt' | 'other_income' | 'daily_inflows'
  const [mainTab, setMainTab] = useState('payment_receipt');

  // Sub-tab di dalam Tab 1: 'bills' | 'history' | 'proofs'
  const [receiptSubTab, setReceiptSubTab] = useState('bills');

  // Academic Years Context
  const [academicYears, setAcademicYears] = useState([]);
  const [activeAcademicYearId, setActiveAcademicYearId] = useState(() => {
    try {
      return localStorage.getItem('keuangan_payments_selected_ay') ||
        localStorage.getItem('keuangan_bills_selected_ay_id') ||
        localStorage.getItem('keuangan_fee_schemes_selected_ay') ||
        '';
    } catch {
      return '';
    }
  });

  // Master Context
  const [cashAccounts, setCashAccounts] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Tagihan Pembayaran Siswa Aktif States
  const [billsList, setBillsList] = useState([]);
  const [priorArrearsList, setPriorArrearsList] = useState([]);
  const [billsOriginFilter, setBillsOriginFilter] = useState('all'); // 'all' | 'current' | 'prior_arrears'
  const [billsSearch, setBillsSearch] = useState('');
  const [billsStatusFilter, setBillsStatusFilter] = useState([]);
  const [billsClassFilter, setBillsClassFilter] = useState([]);
  const [billsFeeTypeFilter, setBillsFeeTypeFilter] = useState([]);
  const [billsSortConfig, setBillsSortConfig] = useState({ key: 'student_name', direction: 'asc' });
  const [selectedBillIds, setSelectedBillIds] = useState([]);

  const handleSortBills = (key) => {
    setBillsSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // 1.5. Tagihan Pembayaran Alumni States (Sub-Tab Baru)
  const [alumniBillsList, setAlumniBillsList] = useState([]);
  const [alumniCohorts, setAlumniCohorts] = useState([]);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [alumniStatusFilter, setAlumniStatusFilter] = useState(['with_arrears']); // multi-select array
  const [alumniCohortFilter, setAlumniCohortFilter] = useState([]);
  const [alumniAcademicYearFilter, setAlumniAcademicYearFilter] = useState([]);
  const [alumniFeeTypeFilter, setAlumniFeeTypeFilter] = useState([]);
  const [loadingAlumniBills, setLoadingAlumniBills] = useState(false);
  const [selectedAlumniBillIds, setSelectedAlumniBillIds] = useState([]);

  // 2. Riwayat Pembayaran States
  const [paymentHistoryList, setPaymentHistoryList] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState([]);
  const [historyFeeTypeFilter, setHistoryFeeTypeFilter] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 3. Bukti Transfer States
  const [proofs, setProofs] = useState([]);
  const [proofFilter, setProofFilter] = useState('pending');
  const [previewProof, setPreviewProof] = useState(null);

  // 4. Modal Catat Pembayaran States
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentTotalAmount, setPaymentTotalAmount] = useState('');
  const [paymentMethodType, setPaymentMethodType] = useState('cash');
  const [isHistoricalOnly, setIsHistoricalOnly] = useState(false);
  const [targetCashAccountId, setTargetCashAccountId] = useState('');
  const [bankStatementId, setBankStatementId] = useState('');
  const [bankStatementsOptions, setBankStatementsOptions] = useState([]);
  const [loadingBankStatements, setLoadingBankStatements] = useState(false);
  const [blockedStatementModal, setBlockedStatementModal] = useState(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [studentBillsForRecord, setStudentBillsForRecord] = useState([]);
  const [recordBillsSearch, setRecordBillsSearch] = useState('');
  const [billAllocations, setBillAllocations] = useState({});
  const [billDiscounts, setBillDiscounts] = useState({});
  const [billRuleOverrides, setBillRuleOverrides] = useState({});
  const [loadingStudentBills, setLoadingStudentBills] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Modal Edit Aturan Jurnal Per-Tagihan States
  const [editingBillRule, setEditingBillRule] = useState(null);
  const [billRuleCustomConfigs, setBillRuleCustomConfigs] = useState({});
  const [tempRuleModalState, setTempRuleModalState] = useState({
    ruleId: '',
    debitAccountId: '',
    creditAccountId: '',
    cashAccountId: '',
    discountRuleId: '',
    discountDebitAccountId: '',
    discountCreditAccountId: ''
  });

  // Accounting Rule & Account Override States inside Modal Catat Pembayaran
  const [transactionRules, setTransactionRules] = useState([]);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [showAccountingOverride, setShowAccountingOverride] = useState(false);
  const [overrideRuleId, setOverrideRuleId] = useState('');
  const [overrideDebitAccountId, setOverrideDebitAccountId] = useState('');
  const [overrideCreditAccountId, setOverrideCreditAccountId] = useState('');
  const [overrideAccountReason, setOverrideAccountReason] = useState('');

  // 5. Modal Edit Koreksi States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPaymentToEdit, setSelectedPaymentToEdit] = useState(null);
  const [loadingEditDetails, setLoadingEditDetails] = useState(false);
  const [editSelectedStudentIds, setEditSelectedStudentIds] = useState([]);
  const [editStudentBills, setEditStudentBills] = useState([]);
  const [editBillsSearch, setEditBillsSearch] = useState('');
  const [editBillAllocations, setEditBillAllocations] = useState({});
  const [editBillDiscounts, setEditBillDiscounts] = useState({});
  const [editForm, setEditForm] = useState({
    amount: '',
    paid_at: '',
    cash_account_id: '',
    payment_method: 'cash',
    is_historical: false,
    notes: '',
    correction_reason: '',
    bank_statement_id: '',
    transaction_mapping_id: '',
    override_debit_account_id: '',
    override_credit_account_id: '',
    override_cash_account_id: ''
  });
  const [editBankStatementsOptions, setEditBankStatementsOptions] = useState([]);
  const [loadingEditBankStatements, setLoadingEditBankStatements] = useState(false);
  const [showEditAccountingOverride, setShowEditAccountingOverride] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Kwitansi Modal
  const [activeReceiptData, setActiveReceiptData] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // 6. Penerimaan Lainnya (Non-Siswa & RAPBS) States
  const [rapbsSourcesData, setRapbsSourcesData] = useState({ summary: {}, sources: [] });
  const [rapbsSources, setRapbsSources] = useState([]);
  const [otherIncomesList, setOtherIncomesList] = useState([]);
  const [fundBalancesOptions, setFundBalancesOptions] = useState([]);
  const [loadingOtherIncome, setLoadingOtherIncome] = useState(false);
  
  // Filter States Penerimaan Lainnya
  const [otherIncomeSearch, setOtherIncomeSearch] = useState('');
  const [otherIncomeCategoryFilter, setOtherIncomeCategoryFilter] = useState('all');
  const [otherIncomeRapbsFilter, setOtherIncomeRapbsFilter] = useState('all');
  const [otherIncomeCashFilter, setOtherIncomeCashFilter] = useState('all');
  const [otherIncomeStartDate, setOtherIncomeStartDate] = useState('');
  const [otherIncomeEndDate, setOtherIncomeEndDate] = useState('');
  
  // Modal States Penerimaan Lainnya
  const [otherIncomeModalOpen, setOtherIncomeModalOpen] = useState(false);
  const [editOtherIncomeModalOpen, setEditOtherIncomeModalOpen] = useState(false);
  const [detailOtherIncomeModalOpen, setDetailOtherIncomeModalOpen] = useState(false);
  const [selectedOtherIncomeForDetail, setSelectedOtherIncomeForDetail] = useState(null);
  const [selectedOtherIncomeForEdit, setSelectedOtherIncomeForEdit] = useState(null);
  const [savingOtherIncome, setSavingOtherIncome] = useState(false);

  // Rekening Koran & Metode Pembayaran untuk Penerimaan Kas Lainnya
  const [otherIncomePaymentMethod, setOtherIncomePaymentMethod] = useState('cash'); // 'cash' | 'bank_transfer'
  const [otherIncomeBankStatementsOptions, setOtherIncomeBankStatementsOptions] = useState([]);
  const [loadingOtherIncomeBankStatements, setLoadingOtherIncomeBankStatements] = useState(false);

  const [editOtherIncomePaymentMethod, setEditOtherIncomePaymentMethod] = useState('cash'); // 'cash' | 'bank_transfer'
  const [editOtherIncomeBankStatementsOptions, setEditOtherIncomeBankStatementsOptions] = useState([]);
  const [loadingEditOtherIncomeBankStatements, setLoadingEditOtherIncomeBankStatements] = useState(false);

  // Form State Tambah Penerimaan Lainnya
  const [otherIncomeForm, setOtherIncomeForm] = useState({
    payer_name: '',
    notes: '',
    amount: '',
    received_at: new Date().toISOString().slice(0, 10),
    source_category: 'other',
    budget_plan_income_item_id: '',
    cash_account_id: '',
    bank_statement_id: '',
    fund_balance_id: '',
    use_default_accounting_rule: true,
    transaction_mapping_id: '',
    override_debit_account_id: '',
    override_credit_account_id: '',
    override_reason: ''
  });

  // Form State Edit Penerimaan Lainnya
  const [editOtherIncomeForm, setEditOtherIncomeForm] = useState({
    id: null,
    receipt_number: '',
    payer_name: '',
    notes: '',
    amount: '',
    received_at: '',
    source_category: 'other',
    budget_plan_income_item_id: '',
    cash_account_id: '',
    bank_statement_id: '',
    fund_balance_id: '',
    use_default_accounting_rule: true,
    transaction_mapping_id: '',
    override_debit_account_id: '',
    override_credit_account_id: '',
    override_reason: ''
  });

  // 7. Rekapitulasi Kas Masuk States
  const [inflowsData, setInflowsData] = useState({ summary: {}, inflows: [], pagination: {} });
  const [loadingInflows, setLoadingInflows] = useState(false);
  const [inflowStartDate, setInflowStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [inflowEndDate, setInflowEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [inflowCategoryFilter, setInflowCategoryFilter] = useState('all');
  const [inflowSearch, setInflowSearch] = useState('');

  // Initial Master Data
  useEffect(() => {
    fetchMasterContext();

    const handleReload = () => {
      fetchMasterContext();
      if (receiptSubTab === 'bills') fetchBillsData();
      else if (receiptSubTab === 'alumni_bills') fetchAlumniBillsData();
      else if (receiptSubTab === 'history') fetchPaymentHistoryData();
      else if (receiptSubTab === 'proofs') fetchProofsData();
    };

    window.addEventListener('keuangan:reload', handleReload);
    return () => {
      window.removeEventListener('keuangan:reload', handleReload);
    };
  }, [activeSchoolUnit]);

  // Load section data based on active tab
  useEffect(() => {
    if (mainTab === 'payment_receipt') {
      if (receiptSubTab === 'bills') {
        fetchBillsData();
      } else if (receiptSubTab === 'alumni_bills') {
        fetchAlumniBillsData();
      } else if (receiptSubTab === 'history') {
        fetchPaymentHistoryData();
      } else if (receiptSubTab === 'proofs') {
        fetchProofsData();
      }
      // Always prefetch alumni bills data so the badge count in the sub-tab switcher is always current
      fetchAlumniBillsData();
    } else if (mainTab === 'other_income') {
      fetchOtherIncomeData();
    } else if (mainTab === 'daily_inflows') {
      fetchAllInflowsData();
    }
  }, [
    activeSchoolUnit,
    mainTab,
    receiptSubTab,
    activeAcademicYearId,
    inflowStartDate,
    inflowEndDate,
    inflowCategoryFilter,
    historyStartDate,
    historyEndDate,
    historyMethodFilter,
    otherIncomeSearch,
    otherIncomeCategoryFilter,
    otherIncomeRapbsFilter,
    otherIncomeCashFilter,
    otherIncomeStartDate,
    otherIncomeEndDate
  ]);

  // Fetch Siswa Berhak Bayar (Siswa Aktif, Siswa Baru/Pindahan T.A. Depan, & Alumni Bertunggakan)
  const fetchEligibleStudents = async (ayId = activeAcademicYearId) => {
    try {
      let params = {};
      if (ayId) params.academic_year_id = ayId;
      if (activeSchoolUnit && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
        params.satuan_pendidikan_id = activeSchoolUnit.id;
      }
      const res = await api.get('/keuangan/payments/eligible-students', { params });
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setEligibleStudents(data);

      setAllStudents(prev => {
        const map = new Map(prev.map(item => [item.id, item]));
        data.forEach(item => map.set(item.id, item));
        return Array.from(map.values());
      });
    } catch (err) {
      console.error('Error fetching eligible students for payment modal:', err);
    }
  };

  // Save selected academic year to localStorage for persistence
  useEffect(() => {
    if (activeAcademicYearId) {
      try {
        localStorage.setItem('keuangan_payments_selected_ay', String(activeAcademicYearId));
        // Sinkronkan juga key umum agar modul tagihan & skema selaras
        localStorage.setItem('keuangan_bills_selected_ay_id', String(activeAcademicYearId));
        localStorage.setItem('keuangan_fee_schemes_selected_ay', String(activeAcademicYearId));
      } catch (e) {
        console.warn('Storage warning in Payments:', e);
      }
      fetchEligibleStudents(activeAcademicYearId);
    }
  }, [activeAcademicYearId, activeSchoolUnit]);

  const fetchMasterContext = async () => {
    try {
      let ayParams = {};
      if (activeSchoolUnit && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
        ayParams.satuan_pendidikan_id = activeSchoolUnit.id;
      }

      let stdParams = { limit: 1000 };
      if (activeSchoolUnit && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
        stdParams.satuan_pendidikan_id = activeSchoolUnit.id;
      }

      const [ayRes, cashRes, rulesRes, coaRes, ftRes, stdRes] = await Promise.allSettled([
        api.get('/akademik/academic-years', { params: ayParams }),
        api.get('/keuangan/cash-accounts'),
        api.get('/keuangan/transaction-account-mappings'),
        api.get('/keuangan/chart-of-accounts'),
        api.get('/keuangan/fee-types'),
        api.get('/akademik/students', { params: stdParams })
      ]);

      let yearsList = [];
      if (ayRes.status === 'fulfilled' && ayRes.value?.data) {
        yearsList = ayRes.value.data?.data || ayRes.value.data?.academic_years || (Array.isArray(ayRes.value.data) ? ayRes.value.data : []);
      }

      // Robust fallback jika query dengan satuan_pendidikan_id kosong / gagal
      if (yearsList.length === 0) {
        try {
          const fallback1 = await api.get('/akademik/academic-years').catch(() => null);
          const fallback2 = fallback1 || await api.get('/keuangan/master-data/academic-years').catch(() => null);
          const fallback3 = fallback2 || await api.get('/akademik/internal/academic-years').catch(() => null);
          if (fallback3?.data) {
            yearsList = fallback3.data?.data || fallback3.data?.academic_years || (Array.isArray(fallback3.data) ? fallback3.data : []);
          }
        } catch (e) {
          console.warn('Fallback academic years error:', e);
        }
      }

      // Deduplikasi berdasarkan nama tahun ajaran agar tidak ada nama yang ganda di dropdown
      const uniqueMap = new Map();
      yearsList.forEach((y) => {
        const nameKey = (y.name || '').trim();
        if (!nameKey) return;
        const existing = uniqueMap.get(nameKey);
        if (!existing) {
          uniqueMap.set(nameKey, y);
        } else if (y.is_active && !existing.is_active) {
          uniqueMap.set(nameKey, y);
        }
      });
      const ays = Array.from(uniqueMap.values());
      ays.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

      setAcademicYears(ays);

      if (ays.length > 0) {
        setActiveAcademicYearId(prev => {
          const stored = (() => {
            try {
              return localStorage.getItem('keuangan_payments_selected_ay') ||
                localStorage.getItem('keuangan_bills_selected_ay_id') ||
                localStorage.getItem('keuangan_fee_schemes_selected_ay') ||
                '';
            } catch {
              return '';
            }
          })();
          const preferredId = prev || stored;
          const found = ays.find(y => String(y.id) === String(preferredId));
          if (found) return String(found.id);
          const currentYear = ays.find(y => y.is_active) || ays[0];
          return String(currentYear.id);
        });
      }

      // Cash accounts
      if (cashRes.status === 'fulfilled') {
        const accs = cashRes.value.data?.data || (Array.isArray(cashRes.value.data) ? cashRes.value.data : []);
        setCashAccounts(accs);
        if (accs.length > 0) {
          setTargetCashAccountId(String(accs[0].id));
          setOtherIncomeForm(prev => ({ ...prev, cash_account_id: accs[0].id }));
        }
      }

      // Transaction Rules
      if (rulesRes.status === 'fulfilled') {
        setTransactionRules(rulesRes.value.data?.data || (Array.isArray(rulesRes.value.data) ? rulesRes.value.data : []));
      }

      // COA
      if (coaRes.status === 'fulfilled') {
        setChartOfAccounts(coaRes.value.data?.data || (Array.isArray(coaRes.value.data) ? coaRes.value.data : []));
      }

      // Fee Types
      if (ftRes.status === 'fulfilled') {
        setFeeTypes(ftRes.value.data?.data || (Array.isArray(ftRes.value.data) ? ftRes.value.data : []));
      }

      // Students
      if (stdRes.status === 'fulfilled' && stdRes.value?.data) {
        const rawStudents = stdRes.value.data?.data || (Array.isArray(stdRes.value.data) ? stdRes.value.data : []);
        const formatted = rawStudents.map(s => ({
          id: s.id,
          name: s.full_name || s.name || `Siswa #${s.id}`,
          nis: s.nipd || s.nis || s.nisn || '-',
          class_name: s.class_name || s.class_group_name || ''
        }));
        setAllStudents(prev => {
          const map = new Map(prev.map(item => [item.id, item]));
          formatted.forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Error fetching master context:', err);
    }
  };

  const activeAyObj = useMemo(() => {
    return academicYears.find(y => String(y.id) === String(activeAcademicYearId));
  }, [academicYears, activeAcademicYearId]);

  // Derived Accounting Rules & Overrides for Modal Catat Pembayaran
  const paymentRulesOptions = useMemo(() => {
    const relevant = transactionRules.filter(r => 
      r.is_active && (
        r.transaction_type === 'penambahan_kas' || 
        (r.transaction_code && (r.transaction_code.includes('payment') || r.transaction_code.includes('piutang') || r.transaction_code.includes('penerimaan'))) ||
        r.transaction_code === 'student_bill_payment'
      )
    );
    return relevant.length > 0 ? relevant : transactionRules;
  }, [transactionRules]);

  const coaOptions = useMemo(() => {
    return chartOfAccounts.map(c => {
      const code = c.account_code || c.account_number || c.code || '';
      const name = c.account_name || c.name || '';
      return {
        value: String(c.id),
        label: `[${code}] ${name}`,
        sublabel: `Grup: ${c.account_group?.toUpperCase() || '-'} | Saldo Normal: ${c.normal_balance?.toUpperCase() || '-'}`,
        badge: c.account_group?.toUpperCase() || 'AKUN',
        badgeClass: c.account_group === 'harta' || c.account_group === 'kas' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-slate-100 text-slate-800'
      };
    });
  }, [chartOfAccounts]);

  const cashAccountSelectOptions = useMemo(() => {
    return [
      { value: '', label: '-- Otomatis Sesuai Kas Transaksi Utama --', sublabel: 'Mengikuti akun kas/bank yang dipilih pada form pembayaran utama' },
      ...cashAccounts.map(a => ({
        value: String(a.id),
        label: a.name,
        sublabel: `${a.account_kind === 'bank' ? (a.bank_name || 'Bank') : 'Kas Tunai'} | No: ${a.bank_account_number || a.account_number || '-'}`,
        badge: a.account_kind === 'bank' ? 'BANK' : 'TUNAI',
        badgeClass: a.account_kind === 'bank' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }))
    ];
  }, [cashAccounts]);

  const ruleSelectOptions = useMemo(() => {
    return paymentRulesOptions.map(r => {
      const dCoa = chartOfAccounts.find(c => String(c.id) === String(r.debit_account_id));
      const kCoa = chartOfAccounts.find(c => String(c.id) === String(r.credit_account_id));
      const dLabel = dCoa ? `[${dCoa.account_code || dCoa.account_number}] ${dCoa.account_name || dCoa.name}` : '-';
      const kLabel = kCoa ? `[${kCoa.account_code || kCoa.account_number}] ${kCoa.account_name || kCoa.name}` : '-';
      return {
        value: String(r.id),
        label: r.transaction_label || r.transaction_code,
        sublabel: `Debit: ${dLabel} | Kredit: ${kLabel}`,
        badge: r.transaction_code || 'RULE',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
      };
    });
  }, [paymentRulesOptions, chartOfAccounts]);

  // Pilihan Aturan Transaksi Diskon / Potongan (Non-Kas)
  const discountRulesOptions = useMemo(() => {
    const relevant = transactionRules.filter(r => 
      r.is_active && (
        r.transaction_type === 'non_kas' || 
        (r.transaction_code && (r.transaction_code.includes('discount') || r.transaction_code.includes('potongan') || r.transaction_code.includes('keringanan'))) ||
        r.transaction_code === 'student_bill_discount'
      )
    );
    return relevant.length > 0 ? relevant : transactionRules;
  }, [transactionRules]);

  const discountRuleSelectOptions = useMemo(() => {
    return discountRulesOptions.map(r => {
      const dCoa = chartOfAccounts.find(c => String(c.id) === String(r.debit_account_id));
      const kCoa = chartOfAccounts.find(c => String(c.id) === String(r.credit_account_id));
      const dLabel = dCoa ? `[${dCoa.account_code || dCoa.account_number}] ${dCoa.account_name || dCoa.name}` : '-';
      const kLabel = kCoa ? `[${kCoa.account_code || kCoa.account_number}] ${kCoa.account_name || kCoa.name}` : '-';
      return {
        value: String(r.id),
        label: r.transaction_label || r.transaction_code,
        sublabel: `Debit: ${dLabel} | Kredit: ${kLabel}`,
        badge: r.transaction_code || 'DISCOUNT RULE',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
      };
    });
  }, [discountRulesOptions, chartOfAccounts]);

  const editCashAccountOptions = useMemo(() => {
    return cashAccounts
      .filter(a => {
        if (editForm.payment_method === 'cash') {
          return a.account_kind === 'cash' || (!a.account_kind && (a.name?.toLowerCase().includes('tunai') || a.name?.toLowerCase().includes('kas')));
        }
        return a.account_kind === 'bank';
      })
      .map(a => ({
        value: String(a.id),
        label: a.name,
        sublabel: `${a.account_kind === 'bank' ? (a.bank_name || 'Bank') : 'Kas Tunai'} | No: ${a.bank_account_number || a.account_number || '-'}`,
        badge: a.account_kind === 'bank' ? 'BANK' : 'TUNAI',
        badgeClass: a.account_kind === 'bank' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }));
  }, [cashAccounts, editForm.payment_method]);

  const editActiveDebitCoa = useMemo(() => {
    const id = editForm.override_debit_account_id ||
      (transactionRules.find(r => String(r.id) === String(editForm.transaction_mapping_id))?.debit_account_id);
    return chartOfAccounts.find(c => String(c.id) === String(id));
  }, [editForm.override_debit_account_id, editForm.transaction_mapping_id, transactionRules, chartOfAccounts]);

  const editActiveCreditCoa = useMemo(() => {
    const id = editForm.override_credit_account_id ||
      (transactionRules.find(r => String(r.id) === String(editForm.transaction_mapping_id))?.credit_account_id);
    return chartOfAccounts.find(c => String(c.id) === String(id));
  }, [editForm.override_credit_account_id, editForm.transaction_mapping_id, transactionRules, chartOfAccounts]);

  const getBillAccountingConfig = (bill) => {
    if (!bill) {
      return {
        ruleId: '',
        rule: null,
        debitAccountId: '',
        debitCoa: null,
        creditAccountId: '',
        creditCoa: null,
        cashAccountId: '',
        cashAcc: null,
        feeTypeObj: null,
        isCustomized: false,
        discountRuleId: '',
        discountRule: null,
        discountDebitAccountId: '',
        discountDebitCoa: null,
        discountCreditAccountId: '',
        discountCreditCoa: null,
        isDiscountCustomized: false
      };
    }
    const custom = billRuleCustomConfigs[bill.id];
    const ft = feeTypes.find(f => f.id === bill.fee_type_id) || null;

    // 1. Determine Payment Rule ID
    let ruleId = custom?.ruleId;
    if (!ruleId) {
      if (billRuleOverrides[bill.id]) {
        ruleId = String(billRuleOverrides[bill.id]);
      } else if (ft && ft.payment_account_mapping_id) {
        ruleId = String(ft.payment_account_mapping_id);
      } else if (bill.fee_type_code) {
        const matched = transactionRules.find(r =>
          r.transaction_code === `payment_${bill.fee_type_code}` ||
          r.transaction_code.includes(bill.fee_type_code)
        );
        if (matched) ruleId = String(matched.id);
      }
      if (!ruleId && overrideRuleId) ruleId = String(overrideRuleId);
      if (!ruleId) {
        const defaultRule = transactionRules.find(r => r.transaction_code === 'student_bill_payment') || paymentRulesOptions[0];
        if (defaultRule) ruleId = String(defaultRule.id);
      }
    }

    const rule = transactionRules.find(r => String(r.id) === String(ruleId)) || null;

    // 2. Determine Payment Debit Account (Kas/Bank)
    const debitAccountId = (custom?.debitAccountId !== undefined && custom?.debitAccountId !== '')
      ? custom.debitAccountId
      : (rule?.debit_account_id ? String(rule.debit_account_id) : '');
    const debitCoa = chartOfAccounts.find(c => String(c.id) === String(debitAccountId)) || null;

    // 3. Determine Payment Credit Account (Piutang Usaha Siswa)
    const creditAccountId = (custom?.creditAccountId !== undefined && custom?.creditAccountId !== '')
      ? custom.creditAccountId
      : (rule?.credit_account_id ? String(rule.credit_account_id) : '');
    const creditCoa = chartOfAccounts.find(c => String(c.id) === String(creditAccountId)) || null;

    // 4. Determine Cash Account
    const cashAccountId = (custom?.cashAccountId !== undefined && custom?.cashAccountId !== '')
      ? custom.cashAccountId
      : (rule?.cash_account_id ? String(rule.cash_account_id) : (targetCashAccountId || ''));
    const cashAcc = cashAccounts.find(a => String(a.id) === String(cashAccountId)) || null;

    // ============================================================
    // DISCOUNT ACCOUNTING RULE CONFIGURATION (Non-Kas)
    // ============================================================
    let discountRuleId = custom?.discountRuleId;
    if (!discountRuleId) {
      if (ft && ft.payment_discount_account_mapping_id) {
        discountRuleId = String(ft.payment_discount_account_mapping_id);
      } else if (ft && ft.billing_discount_account_mapping_id) {
        discountRuleId = String(ft.billing_discount_account_mapping_id);
      } else if (bill.fee_type_id) {
        const matched = transactionRules.find(r =>
          r.related_fee_type_id === bill.fee_type_id &&
          (r.transaction_code.includes('discount') || r.transaction_code.includes('potongan'))
        );
        if (matched) discountRuleId = String(matched.id);
      }
      if (!discountRuleId) {
        const defaultDiscountRule = transactionRules.find(r => r.transaction_code === 'student_bill_discount' || r.transaction_code.includes('discount'));
        if (defaultDiscountRule) discountRuleId = String(defaultDiscountRule.id);
      }
    }

    const discountRule = transactionRules.find(r => String(r.id) === String(discountRuleId)) || null;

    // Discount Debit Account (Potongan/Diskon Pendapatan Siswa)
    const discountDebitAccountId = (custom?.discountDebitAccountId !== undefined && custom?.discountDebitAccountId !== '')
      ? custom.discountDebitAccountId
      : (discountRule?.debit_account_id ? String(discountRule.debit_account_id) : '');
    const discountDebitCoa = chartOfAccounts.find(c => String(c.id) === String(discountDebitAccountId)) || null;

    // Discount Credit Account (Piutang Siswa)
    const discountCreditAccountId = (custom?.discountCreditAccountId !== undefined && custom?.discountCreditAccountId !== '')
      ? custom.discountCreditAccountId
      : (discountRule?.credit_account_id ? String(discountRule.credit_account_id) : '');
    const discountCreditCoa = chartOfAccounts.find(c => String(c.id) === String(discountCreditAccountId)) || null;

    const isCustomized = Boolean(custom?.isCustom);
    const isDiscountCustomized = Boolean(custom?.isDiscountCustom);

    return {
      ruleId: ruleId || '',
      rule,
      debitAccountId,
      debitCoa,
      creditAccountId,
      creditCoa,
      cashAccountId,
      cashAcc,
      feeTypeObj: ft,
      isCustomized,
      discountRuleId: discountRuleId || '',
      discountRule,
      discountDebitAccountId,
      discountDebitCoa,
      discountCreditAccountId,
      discountCreditCoa,
      isDiscountCustomized
    };
  };

  // Helper untuk Menghitung Diskon & Tagihan Bersih Per-Baris
  const getBillDiscountInfo = (bill, customDiscounts = null) => {
    if (!bill) {
      return { enabled: false, type: 'percent', percent: '', amount: '', reason: '', discountAmount: 0, netBill: 0, effectiveRem: 0 };
    }
    const mapToUse = customDiscounts || billDiscounts;
    const disc = mapToUse[bill.id] || { enabled: false, type: 'percent', percent: '', amount: '', reason: '' };
    const billTotal = parseFloat(bill.amount || 0);
    const billPaid = parseFloat(bill.total_paid_other !== undefined ? bill.total_paid_other : (bill.total_paid || 0));

    let discountAmount = 0;
    if (disc.enabled) {
      if (disc.type === 'percent') {
        const pct = parseFloat(disc.percent || 0);
        if (pct > 0) {
          discountAmount = Math.min(billTotal, (billTotal * pct) / 100);
        }
      } else {
        const amt = parseFloat(disc.amount || 0);
        if (amt > 0) {
          discountAmount = Math.min(billTotal, amt);
        }
      }
    }

    const netBill = Math.max(0, billTotal - discountAmount);
    const effectiveRem = Math.max(0, netBill - billPaid);

    return {
      enabled: Boolean(disc.enabled),
      type: disc.type || 'percent',
      percent: disc.percent !== undefined ? disc.percent : '',
      amount: disc.amount !== undefined ? disc.amount : '',
      reason: disc.reason || '',
      discountAmount,
      netBill,
      effectiveRem
    };
  };

  const handleToggleDiscount = (billId) => {
    setBillDiscounts(prev => {
      const current = prev[billId] || { enabled: false, type: 'percent', percent: '', amount: '', reason: '' };
      const nextEnabled = !current.enabled;
      return {
        ...prev,
        [billId]: {
          ...current,
          enabled: nextEnabled,
          type: current.type || 'percent',
          percent: current.percent || '',
          amount: current.amount || '',
          reason: current.reason || ''
        }
      };
    });
  };

  const handleDiscountTypeChange = (billId, newType) => {
    setBillDiscounts(prev => {
      const current = prev[billId] || { enabled: true, type: 'percent', percent: '', amount: '', reason: '' };
      const bill = studentBillsForRecord.find(b => String(b.id) === String(billId));
      const billTotal = parseFloat(bill?.amount || 0);

      let nextPercent = current.percent;
      let nextAmount = current.amount;

      if (newType === 'percent' && parseFloat(current.amount || 0) > 0 && billTotal > 0) {
        nextPercent = Math.min(100, Math.round((parseFloat(current.amount) / billTotal) * 100 * 100) / 100);
      } else if (newType === 'nominal' && parseFloat(current.percent || 0) > 0 && billTotal > 0) {
        nextAmount = Math.min(billTotal, Math.round((billTotal * parseFloat(current.percent)) / 100));
      }

      return {
        ...prev,
        [billId]: {
          ...current,
          type: newType,
          percent: nextPercent,
          amount: nextAmount
        }
      };
    });
  };

  const handleDiscountValueChange = (billId, value) => {
    setBillDiscounts(prev => {
      const current = prev[billId] || { enabled: true, type: 'percent', percent: '', amount: '', reason: '' };
      const bill = studentBillsForRecord.find(b => String(b.id) === String(billId));
      const billTotal = parseFloat(bill?.amount || 0);

      if (current.type === 'percent') {
        const numVal = Math.min(100, Math.max(0, parseFloat(value) || 0));
        const calcNominal = billTotal > 0 ? (billTotal * numVal) / 100 : 0;
        return {
          ...prev,
          [billId]: {
            ...current,
            percent: value,
            amount: calcNominal > 0 ? calcNominal : ''
          }
        };
      } else {
        const numVal = Math.min(billTotal, Math.max(0, parseFloat(value) || 0));
        const calcPct = billTotal > 0 ? (numVal / billTotal) * 100 : 0;
        return {
          ...prev,
          [billId]: {
            ...current,
            amount: value,
            percent: calcPct > 0 ? (Math.round(calcPct * 100) / 100) : ''
          }
        };
      }
    });
  };

  const handleDiscountReasonChange = (billId, reason) => {
    setBillDiscounts(prev => ({
      ...prev,
      [billId]: {
        ...(prev[billId] || { enabled: true, type: 'percent', percent: '', amount: '' }),
        reason
      }
    }));
  };

  // Edit Modal Handlers for Bills & Discounts
  const filteredStudentBillsForEdit = useMemo(() => {
    if (!editBillsSearch.trim()) return editStudentBills;
    const s = editBillsSearch.toLowerCase().trim();
    return editStudentBills.filter(b =>
      b.component_display?.toLowerCase().includes(s) ||
      b.fee_type_name?.toLowerCase().includes(s) ||
      b.period_display?.toLowerCase().includes(s) ||
      b.academic_year_name?.toLowerCase().includes(s) ||
      b.student_name?.toLowerCase().includes(s) ||
      String(b.nis || '').toLowerCase().includes(s)
    );
  }, [editStudentBills, editBillsSearch]);

  const editTotalAllocatedAmount = useMemo(() => {
    return Object.values(editBillAllocations).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [editBillAllocations]);

  const editUnallocatedAmount = useMemo(() => {
    const total = parseFloat(editForm.amount) || 0;
    return total - editTotalAllocatedAmount;
  }, [editForm.amount, editTotalAllocatedAmount]);

  const handleEditAllocationChange = (billId, value) => {
    const num = parseFloat(value) || 0;
    setEditBillAllocations(prev => ({
      ...prev,
      [billId]: num
    }));
  };

  const handleEditPayFullRow = (bill) => {
    const discInfo = getBillDiscountInfo(bill, editBillDiscounts);
    const targetRem = discInfo.effectiveRem;
    setEditBillAllocations(prev => ({
      ...prev,
      [bill.id]: targetRem
    }));
  };

  const handleEditAutoAllocateFifo = () => {
    const total = parseFloat(editForm.amount) || 0;
    if (total <= 0) {
      alert('Masukkan Total Nominal Pembayaran terlebih dahulu sebelum mengalokasikan otomatis.');
      return;
    }

    let remainingToAllocate = total;
    const newAllocations = {};

    editStudentBills.forEach(bill => {
      if (remainingToAllocate <= 0) return;
      const discInfo = getBillDiscountInfo(bill, editBillDiscounts);
      const billRemaining = discInfo.effectiveRem;
      if (billRemaining <= 0) return;

      const take = Math.min(billRemaining, remainingToAllocate);
      newAllocations[bill.id] = take;
      remainingToAllocate -= take;
    });

    setEditBillAllocations(newAllocations);
  };

  const handleEditToggleDiscount = (billId) => {
    setEditBillDiscounts(prev => {
      const current = prev[billId] || { enabled: false, type: 'percent', percent: '', amount: '', reason: '' };
      const nextEnabled = !current.enabled;
      return {
        ...prev,
        [billId]: {
          ...current,
          enabled: nextEnabled,
          type: current.type || 'percent',
          percent: current.percent || '',
          amount: current.amount || '',
          reason: current.reason || ''
        }
      };
    });
  };

  const handleEditDiscountTypeChange = (billId, newType) => {
    setEditBillDiscounts(prev => {
      const current = prev[billId] || { enabled: true, type: 'percent', percent: '', amount: '', reason: '' };
      const bill = editStudentBills.find(b => String(b.id) === String(billId));
      const billTotal = parseFloat(bill?.amount || 0);

      let nextPercent = current.percent;
      let nextAmount = current.amount;

      if (newType === 'percent' && parseFloat(current.amount || 0) > 0 && billTotal > 0) {
        nextPercent = Math.min(100, Math.round((parseFloat(current.amount) / billTotal) * 100 * 100) / 100);
      } else if (newType === 'nominal' && parseFloat(current.percent || 0) > 0 && billTotal > 0) {
        nextAmount = Math.min(billTotal, Math.round((billTotal * parseFloat(current.percent)) / 100));
      }

      return {
        ...prev,
        [billId]: {
          ...current,
          type: newType,
          percent: nextPercent,
          amount: nextAmount
        }
      };
    });
  };

  const handleEditDiscountValueChange = (billId, value) => {
    setEditBillDiscounts(prev => {
      const current = prev[billId] || { enabled: true, type: 'percent', percent: '', amount: '', reason: '' };
      const bill = editStudentBills.find(b => String(b.id) === String(billId));
      const billTotal = parseFloat(bill?.amount || 0);

      if (current.type === 'percent') {
        const numVal = Math.min(100, Math.max(0, parseFloat(value) || 0));
        const calcNominal = billTotal > 0 ? (billTotal * numVal) / 100 : 0;
        return {
          ...prev,
          [billId]: {
            ...current,
            percent: value,
            amount: calcNominal > 0 ? calcNominal : ''
          }
        };
      } else {
        const numVal = Math.min(billTotal, Math.max(0, parseFloat(value) || 0));
        const calcPct = billTotal > 0 ? (numVal / billTotal) * 100 : 0;
        return {
          ...prev,
          [billId]: {
            ...current,
            amount: value,
            percent: calcPct > 0 ? (Math.round(calcPct * 100) / 100) : ''
          }
        };
      }
    });
  };

  const handleEditDiscountReasonChange = (billId, reason) => {
    setEditBillDiscounts(prev => ({
      ...prev,
      [billId]: {
        ...(prev[billId] || { enabled: true, type: 'percent', percent: '', amount: '' }),
        reason
      }
    }));
  };

  const handleEditAddStudent = async (studentId) => {
    const sId = String(studentId);
    if (!editSelectedStudentIds.includes(sId)) {
      const newIds = [...editSelectedStudentIds, sId];
      setEditSelectedStudentIds(newIds);
      try {
        const res = await api.get('/keuangan/student-bills', {
          params: {
            student_id: sId,
            academic_year_id: activeAcademicYearId || undefined,
            for_payments: true
          }
        });
        const studentObj = allStudents.find(s => String(s.id) === sId);
        const mapped = (res.data?.data || []).map(b => ({
          ...b,
          student_id: b.student_id || parseInt(sId, 10),
          student_name: b.student_name || studentObj?.name,
          nis: b.nis || studentObj?.nis,
          class_name: b.class_name || studentObj?.class_name,
          orig_alloc: 0,
          total_paid_other: parseFloat(b.total_paid || 0)
        }));
        setEditStudentBills(prev => {
          const existingIds = new Set(prev.map(b => String(b.id)));
          const toAdd = mapped.filter(b => !existingIds.has(String(b.id)));
          return [...prev, ...toAdd];
        });
      } catch (err) {
        console.error('Error adding student bills in edit modal:', err);
      }
    }
  };

  const handleEditRemoveStudent = (studentId) => {
    const sId = String(studentId);
    if (editSelectedStudentIds.length <= 1) {
      alert('Minimal 1 siswa harus tetap dipilih.');
      return;
    }
    const newIds = editSelectedStudentIds.filter(id => id !== sId);
    setEditSelectedStudentIds(newIds);
    setEditStudentBills(prev => prev.filter(b => String(b.student_id) !== sId));
  };

  const openEditBillRuleModal = (bill) => {
    const cfg = getBillAccountingConfig(bill);
    setEditingBillRule(bill);
    setTempRuleModalState({
      ruleId: cfg.ruleId,
      debitAccountId: cfg.debitAccountId,
      creditAccountId: cfg.creditAccountId,
      cashAccountId: cfg.cashAccountId,
      discountRuleId: cfg.discountRuleId,
      discountDebitAccountId: cfg.discountDebitAccountId,
      discountCreditAccountId: cfg.discountCreditAccountId
    });
  };

  const handleModalRuleChange = (newRuleId) => {
    const r = transactionRules.find(item => String(item.id) === String(newRuleId));
    setTempRuleModalState(prev => ({
      ...prev,
      ruleId: newRuleId || '',
      debitAccountId: r?.debit_account_id ? String(r.debit_account_id) : prev.debitAccountId,
      creditAccountId: r?.credit_account_id ? String(r.credit_account_id) : prev.creditAccountId,
      cashAccountId: r?.cash_account_id ? String(r.cash_account_id) : prev.cashAccountId
    }));
  };

  const handleModalDiscountRuleChange = (newDiscountRuleId) => {
    const r = transactionRules.find(item => String(item.id) === String(newDiscountRuleId));
    setTempRuleModalState(prev => ({
      ...prev,
      discountRuleId: newDiscountRuleId || '',
      discountDebitAccountId: r?.debit_account_id ? String(r.debit_account_id) : prev.discountDebitAccountId,
      discountCreditAccountId: r?.credit_account_id ? String(r.credit_account_id) : prev.discountCreditAccountId
    }));
  };

  const handleSaveBillRuleModal = () => {
    if (!editingBillRule) return;
    setBillRuleCustomConfigs(prev => ({
      ...prev,
      [editingBillRule.id]: {
        ruleId: tempRuleModalState.ruleId,
        debitAccountId: tempRuleModalState.debitAccountId,
        creditAccountId: tempRuleModalState.creditAccountId,
        cashAccountId: tempRuleModalState.cashAccountId,
        discountRuleId: tempRuleModalState.discountRuleId,
        discountDebitAccountId: tempRuleModalState.discountDebitAccountId,
        discountCreditAccountId: tempRuleModalState.discountCreditAccountId,
        isCustom: true
      }
    }));
    setEditingBillRule(null);
  };

  const handleResetBillRuleToDefault = () => {
    if (!editingBillRule) return;
    setBillRuleCustomConfigs(prev => {
      const updated = { ...prev };
      delete updated[editingBillRule.id];
      return updated;
    });
    setEditingBillRule(null);
  };

  const getBillDefaultRuleId = (bill) => {
    const cfg = getBillAccountingConfig(bill);
    return cfg?.ruleId || '';
  };

  const targetCashAccountOptions = useMemo(() => {
    return cashAccounts
      .filter(a => {
        if (paymentMethodType === 'cash') {
          return a.account_kind === 'cash' || (!a.account_kind && (a.name?.toLowerCase().includes('tunai') || a.name?.toLowerCase().includes('kas')));
        }
        return a.account_kind === 'bank';
      })
      .map(a => ({
        value: String(a.id),
        label: a.name,
        sublabel: `${a.account_kind === 'bank' ? (a.bank_name || 'Bank') : 'Kas Tunai'} | No: ${a.bank_account_number || a.account_number || '-'}`,
        badge: a.account_kind === 'bank' ? 'BANK' : 'TUNAI',
        badgeClass: a.account_kind === 'bank' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }));
  }, [cashAccounts, paymentMethodType]);

  const allocatedBills = useMemo(() => {
    return studentBillsForRecord.filter(b => parseFloat(billAllocations[b.id] || 0) > 0);
  }, [studentBillsForRecord, billAllocations]);

  const filteredStudentBillsForRecord = useMemo(() => {
    if (!recordBillsSearch.trim()) return studentBillsForRecord;
    const q = recordBillsSearch.toLowerCase().trim();
    return studentBillsForRecord.filter((b) => {
      const comp = (b.component_display || b.fee_type_name || '').toLowerCase();
      const sName = (b.student_name || '').toLowerCase();
      const nis = (b.nis || '').toLowerCase();
      const code = (b.fee_type_code || '').toLowerCase();
      const period = (b.period_display || b.period || '').toLowerCase();
      const year = (b.academic_year_name || '').toLowerCase();
      const notes = (b.notes || '').toLowerCase();
      const amt = String(b.amount || '');
      const rem = String(b.remaining_amount || '');
      return (
        comp.includes(q) ||
        sName.includes(q) ||
        nis.includes(q) ||
        code.includes(q) ||
        period.includes(q) ||
        year.includes(q) ||
        notes.includes(q) ||
        amt.includes(q) ||
        rem.includes(q)
      );
    });
  }, [studentBillsForRecord, recordBillsSearch]);

  const detectedRule = useMemo(() => {
    if (overrideRuleId) {
      return transactionRules.find(r => String(r.id) === String(overrideRuleId)) || null;
    }
    if (allocatedBills.length > 0) {
      const primaryRuleId = getBillDefaultRuleId(allocatedBills[0]);
      if (primaryRuleId) {
        const matched = transactionRules.find(r => String(r.id) === String(primaryRuleId));
        if (matched) return matched;
      }
    }
    return (
      transactionRules.find(r => r.transaction_code === 'student_bill_payment') ||
      paymentRulesOptions[0] ||
      null
    );
  }, [overrideRuleId, allocatedBills, billRuleOverrides, billRuleCustomConfigs, feeTypes, transactionRules, paymentRulesOptions]);

  const appliedDebitAccount = useMemo(() => {
    if (overrideDebitAccountId) {
      return chartOfAccounts.find(c => String(c.id) === String(overrideDebitAccountId)) || null;
    }
    const selectedCash = cashAccounts.find(a => String(a.id) === String(targetCashAccountId));
    if (selectedCash && selectedCash.account_id) {
      const matchedCoa = chartOfAccounts.find(c => String(c.id) === String(selectedCash.account_id));
      if (matchedCoa) return matchedCoa;
    }
    if (detectedRule?.debit_account_id) {
      return chartOfAccounts.find(c => String(c.id) === String(detectedRule.debit_account_id)) || null;
    }
    return chartOfAccounts.find(c => c.account_group === 'harta' && c.normal_balance === 'debit') || null;
  }, [overrideDebitAccountId, targetCashAccountId, cashAccounts, chartOfAccounts, detectedRule]);

  const appliedCreditAccount = useMemo(() => {
    if (overrideCreditAccountId) {
      return chartOfAccounts.find(c => String(c.id) === String(overrideCreditAccountId)) || null;
    }
    if (detectedRule?.credit_account_id) {
      return chartOfAccounts.find(c => String(c.id) === String(detectedRule.credit_account_id)) || null;
    }
    return chartOfAccounts.find(c => c.account_group === 'piutang' || c.normal_balance === 'kredit') || null;
  }, [overrideCreditAccountId, detectedRule, chartOfAccounts]);

  const isAccountingOverridden = Boolean(
    overrideRuleId || overrideDebitAccountId || overrideCreditAccountId
  );

  // 1. Fetch Student Bills (Siswa Aktif) & Tunggakan Tahun Ajaran Sebelumnya
  const fetchBillsData = async () => {
    setLoading(true);
    try {
      const [billsRes, arrearsRes] = await Promise.allSettled([
        api.get('/keuangan/student-bills', {
          params: {
            academic_year_id: activeAcademicYearId || undefined,
            exclude_arrears: true,
            for_payments: true,
            active_students_only: true
          }
        }),
        api.get('/keuangan/student-bills', {
          params: {
            academic_year_id: activeAcademicYearId || undefined,
            prior_arrears_only: true,
            for_payments: true,
            active_students_only: true
          }
        })
      ]);

      const data = (billsRes.status === 'fulfilled' && billsRes.value?.data?.data) || [];
      const arrearsData = (arrearsRes.status === 'fulfilled' && arrearsRes.value?.data?.data) || [];

      setBillsList(data);
      setPriorArrearsList(arrearsData);

      const studentMap = {};
      [...data, ...arrearsData].forEach(b => {
        if (b.student_id && !studentMap[b.student_id]) {
          studentMap[b.student_id] = {
            id: b.student_id,
            name: b.student_name,
            nis: b.nis,
            class_name: b.class_name
          };
        }
      });
      setAllStudents(prev => {
        const map = new Map(prev.map(s => [s.id, s]));
        Object.values(studentMap).forEach(s => map.set(s.id, s));
        return Array.from(map.values());
      });
    } catch (err) {
      console.error('Error fetching bills & arrears:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1.5 Fetch Alumni Bills (Santri Alumni & Tunggakan Kelulusan)
  const fetchAlumniBillsData = async () => {
    setLoadingAlumniBills(true);
    try {
      const res = await api.get('/keuangan/student-bills/alumni', {
        params: {
          academic_year_id: activeAcademicYearId || undefined,
          status: 'all'
        }
      });
      const data = res.data?.data || {};
      const alumniList = data.alumni || [];
      setAlumniCohorts(data.cohorts || []);

      const flatBills = [];
      const studentMap = {};

      alumniList.forEach(alumnus => {
        const studentId = alumnus.id;
        const studentName = alumnus.full_name || alumnus.name || `Siswa ID #${studentId}`;
        const nis = alumnus.nipd || alumnus.nis || '-';
        const gradYear = alumnus.graduation_academic_year_name
          ? `Lulus T.A. ${alumnus.graduation_academic_year_name}`
          : (alumnus.graduation_year || alumnus.cohort_name || (alumnus.last_class_name ? `${alumnus.last_class_name} (Lulus)` : 'Alumni'));
        const lastClass = alumnus.last_class_name || alumnus.class_name || '-';

        if (!studentMap[studentId]) {
          studentMap[studentId] = {
            id: studentId,
            name: studentName,
            nis: nis,
            class_name: `Alumni (${gradYear})`
          };
        }

        const bills = alumnus.bills || [];
        if (bills.length > 0) {
          bills.forEach(b => {
            flatBills.push({
              ...b,
              student_id: studentId,
              student_name: studentName,
              nis: nis,
              graduation_year_display: gradYear,
              last_class_name: lastClass,
              academic_year_name: b.academic_year_name || (b.period_year ? `T.A. ${b.period_year}` : '-')
            });
          });
        }
      });

      setAlumniBillsList(flatBills);

      setAllStudents(prev => {
        const map = new Map(prev.map(s => [s.id, s]));
        Object.values(studentMap).forEach(s => map.set(s.id, s));
        return Array.from(map.values());
      });
    } catch (err) {
      console.error('Error fetching alumni bills data:', err);
    } finally {
      setLoadingAlumniBills(false);
    }
  };

  // 2. Fetch Payment History
  const fetchPaymentHistoryData = async () => {
    setLoadingHistory(true);
    try {
      const params = {
        academic_year_id: activeAcademicYearId || undefined,
        start_date: historyStartDate || undefined,
        end_date: historyEndDate || undefined,
        payment_method: historyMethodFilter !== 'all' ? historyMethodFilter : undefined
      };
      const res = await api.get('/keuangan/bill-payments', { params });
      setPaymentHistoryList(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching payment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 3. Fetch Transfer Proofs
  const fetchProofsData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/keuangan/bill-payment-proofs');
      setProofs(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching proofs:', err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Fetch Other Incomes (Penerimaan Lainnya)
  const fetchOtherIncomeData = async () => {
    setLoadingOtherIncome(true);
    try {
      const params = {
        academic_year_id: activeAcademicYearId || undefined,
        search: otherIncomeSearch || undefined,
        source_category: otherIncomeCategoryFilter !== 'all' ? otherIncomeCategoryFilter : undefined,
        budget_plan_income_item_id: otherIncomeRapbsFilter !== 'all' ? otherIncomeRapbsFilter : undefined,
        cash_account_id: otherIncomeCashFilter !== 'all' ? otherIncomeCashFilter : undefined,
        start_date: otherIncomeStartDate || undefined,
        end_date: otherIncomeEndDate || undefined
      };

      const [rapbsRes, incRes, fundRes] = await Promise.allSettled([
        api.get(`/keuangan/other-incomes/rapbs-sources${activeAcademicYearId ? `?academic_year_id=${activeAcademicYearId}` : ''}`),
        api.get('/keuangan/other-incomes', { params }),
        api.get('/keuangan/fund-balances/available-sources', { params: { academic_year_id: activeAcademicYearId || undefined } })
      ]);

      if (rapbsRes.status === 'fulfilled' && rapbsRes.value?.data?.data) {
        const rapbsData = rapbsRes.value.data.data;
        setRapbsSourcesData(rapbsData);
        setRapbsSources(rapbsData.sources || []);
      }

      if (incRes.status === 'fulfilled' && incRes.value?.data?.data) {
        setOtherIncomesList(incRes.value.data.data || []);
      }

      if (fundRes.status === 'fulfilled' && fundRes.value?.data?.data) {
        setFundBalancesOptions(fundRes.value.data.data?.groups || []);
      }
    } catch (err) {
      console.error('Error fetching other incomes data:', err);
    } finally {
      setLoadingOtherIncome(false);
    }
  };

  // Handler Perubahan Pos RAPBS pada Penerimaan Lainnya
  const handleOtherIncomeRapbsSelect = (bpiiId, isEdit = false) => {
    const setForm = isEdit ? setEditOtherIncomeForm : setOtherIncomeForm;

    if (!bpiiId) {
      // Memilih: Di Luar Perencanaan RAPBS (Penerimaan Bebas)
      setForm(prev => {
        const cat = prev.source_category || 'other';
        let matchedRuleCode = 'other_income_general';
        if (cat === 'bos_government') matchedRuleCode = 'other_income_bos';
        else if (cat === 'grant_foundation') matchedRuleCode = 'other_income_subsidi_yayasan';
        else if (cat === 'donation_waqf') matchedRuleCode = 'other_income_donasi_wakaf';
        else if (cat === 'business_unit') matchedRuleCode = 'other_income_sewa_kantin';
        else if (cat === 'facility_rental') matchedRuleCode = 'other_income_sewa_fasilitas';
        else if (cat === 'bank_interest') matchedRuleCode = 'other_income_jasa_giro';

        const defaultRule = transactionRules.find(r => r.transaction_code === matchedRuleCode) ||
          transactionRules.find(r => r.transaction_code === 'other_income_general') ||
          transactionRules.find(r => r.transaction_type === 'penambahan_kas');

        const selectedCash = cashAccounts.find(a => String(a.id) === String(prev.cash_account_id)) || cashAccounts[0];

        return {
          ...prev,
          budget_plan_income_item_id: '',
          fund_balance_id: '',
          transaction_mapping_id: defaultRule ? String(defaultRule.id) : prev.transaction_mapping_id,
          override_credit_account_id: defaultRule?.credit_account_id ? String(defaultRule.credit_account_id) : prev.override_credit_account_id,
          override_debit_account_id: selectedCash?.account_id ? String(selectedCash.account_id) : (defaultRule?.debit_account_id ? String(defaultRule.debit_account_id) : prev.override_debit_account_id)
        };
      });
      return;
    }

    const bpItem = rapbsSources.find(s => String(s.id) === String(bpiiId));
    if (!bpItem) return;

    // 1. Tentukan Rekening Kas/Bank Penampung
    const currentCashId = isEdit ? editOtherIncomeForm.cash_account_id : otherIncomeForm.cash_account_id;
    let targetCashId = bpItem.cash_account_id ? String(bpItem.cash_account_id) : (currentCashId || (cashAccounts[0] ? String(cashAccounts[0].id) : ''));
    const selectedCash = cashAccounts.find(a => String(a.id) === String(targetCashId));

    // 2. Tentukan Kantong Dana Terkait (Otomatis terhubung ke Pos RAPBS)
    let targetFundBalanceId = String(bpItem.id);
    for (const grp of fundBalancesOptions) {
      const found = grp.options?.find(opt => String(opt.fund_ref_id) === String(bpItem.id));
      if (found) {
        targetFundBalanceId = String(found.fund_ref_id);
        break;
      }
    }

    // 3. Tentukan Aturan Transaksi Kas Masuk yang Cocok
    let matchedRuleCode = 'other_income_general';
    if (bpItem.source_category === 'bos_government') matchedRuleCode = 'other_income_bos';
    else if (bpItem.source_category === 'grant_foundation') matchedRuleCode = 'other_income_subsidi_yayasan';
    else if (bpItem.source_category === 'donation_waqf') matchedRuleCode = 'other_income_donasi_wakaf';
    else if (bpItem.source_category === 'business_unit') matchedRuleCode = 'other_income_sewa_kantin';
    else if (bpItem.source_category === 'facility_rental') matchedRuleCode = 'other_income_sewa_fasilitas';
    else if (bpItem.source_category === 'bank_interest') matchedRuleCode = 'other_income_jasa_giro';

    let matchedRule = transactionRules.find(r => r.transaction_code === matchedRuleCode);
    if (!matchedRule && bpItem.credit_account_id) {
      matchedRule = transactionRules.find(r => String(r.credit_account_id) === String(bpItem.credit_account_id));
    }
    if (!matchedRule) {
      matchedRule = transactionRules.find(r => r.transaction_code === 'other_income_general') || transactionRules.find(r => r.transaction_type === 'penambahan_kas');
    }

    // 4. Tentukan Akun Debet Kas & Akun Kredit Pendapatan
    const debitAccId = selectedCash?.account_id ? String(selectedCash.account_id) : (matchedRule?.debit_account_id ? String(matchedRule.debit_account_id) : '');
    const creditAccId = bpItem.credit_account_id ? String(bpItem.credit_account_id) : (matchedRule?.credit_account_id ? String(matchedRule.credit_account_id) : '');

    // 5. Default nama penyetor sesuai kategori pos jika form masih kosong
    let defaultPayer = '';
    if (bpItem.source_category === 'bos_government') defaultPayer = 'Kemendikbudristek / BOS';
    else if (bpItem.source_category === 'grant_foundation') defaultPayer = 'Yayasan Aldepos';

    setForm(prev => {
      const isAutoNote = !prev.notes || prev.notes.trim() === '' || rapbsSources.some(s => s.name === prev.notes);
      return {
        ...prev,
        budget_plan_income_item_id: String(bpItem.id),
        source_category: bpItem.source_category || 'other',
        cash_account_id: targetCashId,
        fund_balance_id: targetFundBalanceId,
        transaction_mapping_id: matchedRule ? String(matchedRule.id) : prev.transaction_mapping_id,
        override_credit_account_id: creditAccId || prev.override_credit_account_id,
        override_debit_account_id: debitAccId || prev.override_debit_account_id,
        notes: isAutoNote ? bpItem.name : prev.notes,
        payer_name: (!prev.payer_name && defaultPayer) ? defaultPayer : prev.payer_name
      };
    });
  };

  // Handler Perubahan Rekening Kas / Bank Penampung
  const handleOtherIncomeCashAccountChange = (cashAccId, isEdit = false) => {
    const setForm = isEdit ? setEditOtherIncomeForm : setOtherIncomeForm;
    const selectedCash = cashAccounts.find(a => String(a.id) === String(cashAccId));
    setForm(prev => ({
      ...prev,
      cash_account_id: cashAccId,
      // Sinkronkan akun kas akuntansi (Debet) dengan rekening kas/bank penampung yang dipilih
      override_debit_account_id: selectedCash?.account_id ? String(selectedCash.account_id) : prev.override_debit_account_id
    }));
  };

  // Handler Perubahan Kategori Sumber Penerimaan Bebas (Unbudgeted)
  const handleOtherIncomeSourceCategoryChange = (cat, isEdit = false) => {
    const setForm = isEdit ? setEditOtherIncomeForm : setOtherIncomeForm;
    let matchedRuleCode = 'other_income_general';
    if (cat === 'bos_government') matchedRuleCode = 'other_income_bos';
    else if (cat === 'grant_foundation') matchedRuleCode = 'other_income_subsidi_yayasan';
    else if (cat === 'donation_waqf') matchedRuleCode = 'other_income_donasi_wakaf';
    else if (cat === 'business_unit') matchedRuleCode = 'other_income_sewa_kantin';
    else if (cat === 'facility_rental') matchedRuleCode = 'other_income_sewa_fasilitas';
    else if (cat === 'bank_interest') matchedRuleCode = 'other_income_jasa_giro';

    const matchedRule = transactionRules.find(r => r.transaction_code === matchedRuleCode) ||
      transactionRules.find(r => r.transaction_code === 'other_income_general') ||
      transactionRules.find(r => r.transaction_type === 'penambahan_kas');

    setForm(prev => {
      const selectedCash = cashAccounts.find(a => String(a.id) === String(prev.cash_account_id));
      return {
        ...prev,
        source_category: cat,
        transaction_mapping_id: matchedRule ? String(matchedRule.id) : prev.transaction_mapping_id,
        override_credit_account_id: matchedRule?.credit_account_id ? String(matchedRule.credit_account_id) : prev.override_credit_account_id,
        override_debit_account_id: selectedCash?.account_id ? String(selectedCash.account_id) : (matchedRule?.debit_account_id ? String(matchedRule.debit_account_id) : prev.override_debit_account_id)
      };
    });
  };

  // Helper format variasi tanggal untuk live search mutasi rekening koran
  const formatStatementDatesForSearch = (isoDateStr) => {
    if (!isoDateStr) return [];
    const dateObj = new Date(isoDateStr);
    if (isNaN(dateObj.getTime())) {
      const s = String(isoDateStr).slice(0, 10);
      return [s];
    }
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const d = dateObj.getDate();
    const mIndex = dateObj.getMonth();

    const indoMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const indoMonthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const engMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const engMonthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthNameIndo = indoMonths[mIndex];
    const monthShortIndo = indoMonthsShort[mIndex];
    const monthNameEng = engMonths[mIndex];
    const monthShortEng = engMonthsShort[mIndex];

    return [
      `${yyyy}-${mm}-${dd}`,
      `${dd}/${mm}/${yyyy}`,
      `${dd}-${mm}-${yyyy}`,
      `${dd}.${mm}.${yyyy}`,
      `${d}/${mIndex + 1}/${yyyy}`,
      `${d}-${mIndex + 1}-${yyyy}`,
      `${d} ${monthNameIndo} ${yyyy}`,
      `${d} ${monthShortIndo} ${yyyy}`,
      `${monthNameIndo} ${yyyy}`,
      `${monthShortIndo} ${yyyy}`,
      `${d} ${monthNameEng} ${yyyy}`,
      `${d} ${monthShortEng} ${yyyy}`,
      monthNameIndo,
      monthShortIndo,
      monthNameEng
    ];
  };

  // Standard Option Mapper untuk Mutasi Rekening Koran (Kaya Pencarian & Komprehensif)
  const mapBankStatementOption = (r, pDate, currentBsId = '') => {
    const desc = r.description || r.mutation_description || 'Mutasi Masuk';
    const refNo = r.journal_number || r.reference_number || r.reconciliation_notes || r.import_batch_id || '';
    const rkDate = r.transaction_date ? String(r.transaction_date).slice(0, 10) : '';
    const isExactDate = pDate && rkDate === pDate;
    const isCurrentLinked = currentBsId && String(r.id) === String(currentBsId);
    const totalPlafon = parseFloat(r.amount || 0);
    const allocatedAmt = parseFloat(r.allocated_amount || 0);
    const remainingAmt = r.remaining_amount !== undefined ? parseFloat(r.remaining_amount) : Math.max(0, totalPlafon - allocatedAmt);
    const isFullyAllocated = Boolean(r.is_reconciled) || (remainingAmt <= 0.01 && totalPlafon > 0);
    const isPartial = !isFullyAllocated && allocatedAmt > 0 && remainingAmt > 0.01;

    const bankName = r.bank_name || r.cash_account_name || '';
    const bankAccNo = r.bank_account_number || '';
    const bankPrefix = bankName ? `[${bankName}] ` : '';

    let badgeText = isCurrentLinked ? '📌 LINKED' : (isExactDate ? '⭐ TGL COCOK' : 'KREDIT');
    let badgeStyle = isCurrentLinked
      ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold'
      : (isExactDate ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-indigo-50 text-indigo-700');

    if (!isCurrentLinked && isPartial) {
      badgeText = isExactDate ? '⭐ TGL COCOK | SISA' : '⚡ SISA PLAFON';
      badgeStyle = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
    }

    if (!isCurrentLinked && isFullyAllocated) {
      badgeText = '⛔ HABIS TERPAKAI';
      badgeStyle = 'bg-rose-100 text-rose-800 border border-rose-300 font-bold';
    }

    const labelText = isCurrentLinked
      ? `[DITAUTKAN] ${bankPrefix}${formatCurrency(totalPlafon)} - ${desc}`
      : isFullyAllocated
      ? `[HABIS TERPAKAI] ${bankPrefix}${formatCurrency(totalPlafon)} - ${desc}`
      : isPartial
      ? `${bankPrefix}Sisa: ${formatCurrency(remainingAmt)} (Plafon: ${formatCurrency(totalPlafon)}) - ${desc}`
      : `${bankPrefix}${formatCurrency(totalPlafon)} - ${desc}`;

    const sublabelText = isFullyAllocated && !isCurrentLinked
      ? `Tgl: ${rkDate || '-'} | Ref: ${refNo || '-'} | ${bankName ? `${bankName}${bankAccNo ? ` (${bankAccNo})` : ''} | ` : ''}Plafon: ${formatCurrency(totalPlafon)} (Teralokasi: ${formatCurrency(allocatedAmt)}) • Habis`
      : `Tgl: ${rkDate || '-'} | Ref: ${refNo || '-'} | ${bankName ? `${bankName}${bankAccNo ? ` (${bankAccNo})` : ''} | ` : ''}Plafon: ${formatCurrency(totalPlafon)}${allocatedAmt > 0 ? ` (Teralokasi: ${formatCurrency(allocatedAmt)})` : ''}`;

    const dateVariations = formatStatementDatesForSearch(r.transaction_date);

    const searchTerms = [
      refNo,
      r.journal_number,
      r.reference_number,
      r.reconciliation_notes,
      r.import_batch_id,
      desc,
      r.description,
      r.mutation_description,
      bankName,
      bankAccNo,
      r.cash_account_name,
      String(r.amount || ''),
      String(totalPlafon),
      String(remainingAmt),
      String(allocatedAmt),
      formatCurrency(totalPlafon),
      formatCurrency(remainingAmt),
      `#${r.id}`,
      String(r.id),
      ...dateVariations
    ].filter(Boolean);

    return {
      value: String(r.id),
      label: labelText,
      sublabel: sublabelText,
      badge: badgeText,
      badgeClass: badgeStyle,
      amount: totalPlafon,
      allocated_amount: allocatedAmt,
      remaining_amount: remainingAmt,
      rawDate: rkDate,
      desc: desc,
      refNo: refNo,
      journal_number: r.journal_number,
      reference_number: r.reference_number,
      reconciliation_notes: r.reconciliation_notes,
      import_batch_id: r.import_batch_id,
      cash_account_id: r.cash_account_id,
      cash_account_name: bankName,
      bank_name: bankName,
      bank_account_number: bankAccNo,
      searchTerms: searchTerms,
      isExactDate,
      disabled: isFullyAllocated && !isCurrentLinked,
      isFullyAllocated: isFullyAllocated && !isCurrentLinked,
      disabledReason: `Mutasi rekening koran (${desc}) sebesar ${formatCurrency(totalPlafon)} sudah habis terpakai (teralokasi penuh ${formatCurrency(allocatedAmt)}). Tidak dapat dipilih untuk transaksi baru.`
    };
  };

  // Live Fetch Mutasi Rekening Koran untuk Tambah Penerimaan Kas Lainnya
  const fetchOtherIncomeBankStatements = async (accId, pDate) => {
    setLoadingOtherIncomeBankStatements(true);
    try {
      const params = {
        dc_type: 'credit',
        no_pagination: true,
        sort_by: 'transaction_date',
        sort_dir: 'desc'
      };
      if (accId) {
        params.cash_account_id = accId;
      }
      const res = await api.get('/keuangan/bank-statements', { params });
      let rows = res.data?.data?.statements || (Array.isArray(res.data?.data) ? res.data.data : []);

      // Jika memfilter dengan accId spesifik dan hasilnya kosong, panggil fallback semua mutasi bank
      if (rows.length === 0 && accId) {
        try {
          const allRes = await api.get('/keuangan/bank-statements', {
            params: {
              dc_type: 'credit',
              no_pagination: true,
              sort_by: 'transaction_date',
              sort_dir: 'desc'
            }
          });
          const allRows = allRes.data?.data?.statements || (Array.isArray(allRes.data?.data) ? allRes.data.data : []);
          if (allRows.length > 0) {
            rows = allRows;
          }
        } catch (_) {}
      }

      const opts = rows.map(r => mapBankStatementOption(r, pDate));

      opts.sort((a, b) => {
        if (!a.disabled && b.disabled) return -1;
        if (a.disabled && !b.disabled) return 1;
        if (a.isExactDate && !b.isExactDate) return -1;
        if (!a.isExactDate && b.isExactDate) return 1;
        return (b.rawDate || '').localeCompare(a.rawDate || '');
      });

      setOtherIncomeBankStatementsOptions(opts);
    } catch (err) {
      console.error('Error fetching bank statements for other income:', err);
      setOtherIncomeBankStatementsOptions([]);
    } finally {
      setLoadingOtherIncomeBankStatements(false);
    }
  };

  // Live Fetch Mutasi Rekening Koran untuk Edit Penerimaan Kas Lainnya
  const fetchEditOtherIncomeBankStatements = async (accId, pDate, currentBsId = '') => {
    setLoadingEditOtherIncomeBankStatements(true);
    try {
      const params = {
        dc_type: 'credit',
        no_pagination: true,
        sort_by: 'transaction_date',
        sort_dir: 'desc'
      };
      if (accId) {
        params.cash_account_id = accId;
      }
      const res = await api.get('/keuangan/bank-statements', { params });
      let rows = res.data?.data?.statements || (Array.isArray(res.data?.data) ? res.data.data : []);

      if (rows.length === 0 && accId) {
        try {
          const allRes = await api.get('/keuangan/bank-statements', {
            params: {
              dc_type: 'credit',
              no_pagination: true,
              sort_by: 'transaction_date',
              sort_dir: 'desc'
            }
          });
          const allRows = allRes.data?.data?.statements || (Array.isArray(allRes.data?.data) ? allRes.data.data : []);
          if (allRows.length > 0) {
            rows = allRows;
          }
        } catch (_) {}
      }

      if (currentBsId && !rows.some(r => String(r.id) === String(currentBsId))) {
        try {
          const singleRes = await api.get(`/keuangan/bank-statements/${currentBsId}`);
          const singleRow = singleRes.data?.data;
          if (singleRow) {
            rows = [singleRow, ...rows];
          }
        } catch (_) {}
      }

      const opts = rows.map(r => mapBankStatementOption(r, pDate, currentBsId));

      opts.sort((a, b) => {
        if (!a.disabled && b.disabled) return -1;
        if (a.disabled && !b.disabled) return 1;
        if (a.isExactDate && !b.isExactDate) return -1;
        if (!a.isExactDate && b.isExactDate) return 1;
        return (b.rawDate || '').localeCompare(a.rawDate || '');
      });

      setEditOtherIncomeBankStatementsOptions(opts);
    } catch (err) {
      console.error('Error fetching edit bank statements for other income:', err);
      setEditOtherIncomeBankStatementsOptions([]);
    } finally {
      setLoadingEditOtherIncomeBankStatements(false);
    }
  };

  // Handler Pemilihan Mutasi Rekening Koran untuk Penerimaan Kas Lainnya
  const handleOtherIncomeBankStatementSelect = (val, isEdit = false) => {
    const setForm = isEdit ? setEditOtherIncomeForm : setOtherIncomeForm;
    const opts = isEdit ? editOtherIncomeBankStatementsOptions : otherIncomeBankStatementsOptions;

    setForm(prev => {
      if (!val) {
        return {
          ...prev,
          bank_statement_id: ''
        };
      }
      const opt = opts.find(o => String(o.value) === String(val));
      if (!opt) return { ...prev, bank_statement_id: val };

      const remainingAmount = opt.remaining_amount !== undefined ? opt.remaining_amount : opt.amount;
      const autoNotes = (!prev.notes || prev.notes.trim() === '') ? opt.desc : prev.notes;

      // Otomatis sinkronkan rekening kas penampung jika mutasi berasal dari bank tertentu
      const targetCashAccId = opt.cash_account_id ? String(opt.cash_account_id) : prev.cash_account_id;
      const selectedCash = cashAccounts.find(a => String(a.id) === String(targetCashAccId));

      return {
        ...prev,
        bank_statement_id: val,
        cash_account_id: targetCashAccId,
        override_debit_account_id: selectedCash?.account_id ? String(selectedCash.account_id) : prev.override_debit_account_id,
        received_at: opt.rawDate || prev.received_at,
        amount: remainingAmount > 0 ? String(remainingAmount) : prev.amount,
        notes: autoNotes
      };
    });
  };

  // Live fetch mutasi RK untuk Tambah Penerimaan Lainnya
  useEffect(() => {
    if (otherIncomeModalOpen && otherIncomePaymentMethod === 'bank_transfer') {
      fetchOtherIncomeBankStatements(otherIncomeForm.cash_account_id, otherIncomeForm.received_at);
    } else {
      setOtherIncomeBankStatementsOptions([]);
    }
  }, [otherIncomeModalOpen, otherIncomePaymentMethod, otherIncomeForm.cash_account_id, otherIncomeForm.received_at]);

  // Live fetch mutasi RK untuk Edit Penerimaan Lainnya
  useEffect(() => {
    if (editOtherIncomeModalOpen && editOtherIncomePaymentMethod === 'bank_transfer') {
      fetchEditOtherIncomeBankStatements(editOtherIncomeForm.cash_account_id, editOtherIncomeForm.received_at, editOtherIncomeForm.bank_statement_id);
    } else {
      setEditOtherIncomeBankStatementsOptions([]);
    }
  }, [editOtherIncomeModalOpen, editOtherIncomePaymentMethod, editOtherIncomeForm.cash_account_id, editOtherIncomeForm.received_at, editOtherIncomeForm.bank_statement_id]);

  // 5. Fetch Inflows Timeline
  const fetchAllInflowsData = async () => {
    setLoadingInflows(true);
    try {
      const params = {
        start_date: inflowStartDate,
        end_date: inflowEndDate,
        academic_year_id: activeAcademicYearId || undefined,
        category: inflowCategoryFilter !== 'all' ? inflowCategoryFilter : undefined,
        search: inflowSearch || undefined
      };
      const res = await api.get('/keuangan/payments/all-inflows', { params });
      if (res.data?.success) {
        setInflowsData(res.data.data || { summary: {}, inflows: [], pagination: {} });
      }
    } catch (err) {
      console.error('Error fetching all inflows:', err);
    } finally {
      setLoadingInflows(false);
    }
  };

  // Bank Statements Live Search (Saat Non-Tunai pada Pembayaran Siswa)
  useEffect(() => {
    if (paymentMethodType === 'bank_transfer') {
      fetchBankStatementsForDate(targetCashAccountId, paymentDate);
    } else {
      setBankStatementsOptions([]);
      setBankStatementId('');
    }
  }, [paymentMethodType, targetCashAccountId, paymentDate]);

  const fetchBankStatementsForDate = async (accId, pDate) => {
    setLoadingBankStatements(true);
    try {
      const params = {
        dc_type: 'credit',
        no_pagination: true,
        sort_by: 'transaction_date',
        sort_dir: 'desc'
      };
      if (accId) {
        params.cash_account_id = accId;
      }
      const res = await api.get('/keuangan/bank-statements', { params });
      let rows = res.data?.data?.statements || (Array.isArray(res.data?.data) ? res.data.data : []);

      if (rows.length === 0 && accId) {
        try {
          const allRes = await api.get('/keuangan/bank-statements', {
            params: {
              dc_type: 'credit',
              no_pagination: true,
              sort_by: 'transaction_date',
              sort_dir: 'desc'
            }
          });
          const allRows = allRes.data?.data?.statements || (Array.isArray(allRes.data?.data) ? allRes.data.data : []);
          if (allRows.length > 0) {
            rows = allRows;
          }
        } catch (_) {}
      }

      const opts = rows.map(r => mapBankStatementOption(r, pDate));

      opts.sort((a, b) => {
        if (!a.disabled && b.disabled) return -1;
        if (a.disabled && !b.disabled) return 1;
        if (a.isExactDate && !b.isExactDate) return -1;
        if (!a.isExactDate && b.isExactDate) return 1;
        return (b.rawDate || '').localeCompare(a.rawDate || '');
      });

      setBankStatementsOptions(opts);
    } catch (err) {
      console.error('Error fetching bank statements for date:', err);
      setBankStatementsOptions([]);
    } finally {
      setLoadingBankStatements(false);
    }
  };

  // Memilih Siswa & Memuat Tagihan (Mendukung Multi-Siswa / Saudara dalam 1 Kwitansi)
  const handleStudentChange = async (studentId) => {
    setSelectedStudentId(studentId);
    setSelectedStudentIds(studentId ? [String(studentId)] : []);
    setBillAllocations({});
    setBillRuleOverrides({});
    setRecordBillsSearch('');
    if (!studentId) {
      setStudentBillsForRecord([]);
      return;
    }

    setLoadingStudentBills(true);
    try {
      const studentObj = allStudents.find(s => String(s.id) === String(studentId));
      // Memuat tagihan siswa untuk tahun ajaran terpilih + tunggakan tahun sebelumnya yang belum lunas
      const res = await api.get('/keuangan/student-bills', {
        params: {
          student_id: studentId,
          academic_year_id: activeAcademicYearId || undefined,
          for_payments: true
        }
      });
      const allBills = (res.data?.data || []).map(b => ({
        ...b,
        student_id: b.student_id || parseInt(studentId, 10),
        student_name: b.student_name || studentObj?.name,
        nis: b.nis || studentObj?.nis,
        class_name: b.class_name || studentObj?.class_name
      }));
      const unpaidFirst = allBills.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0));
      setStudentBillsForRecord(unpaidFirst.length > 0 ? unpaidFirst : allBills);
    } catch (err) {
      console.error('Error fetching student bills for record modal:', err);
    } finally {
      setLoadingStudentBills(false);
    }
  };

  // Tambah Siswa Lain / Saudara ke Transaksi yang Sama (1 Kwitansi & 1 Rekening Koran)
  const handleAddAdditionalStudent = async (studentId) => {
    if (!studentId || selectedStudentIds.includes(String(studentId))) return;

    const newStudentIds = [...selectedStudentIds, String(studentId)];
    setSelectedStudentIds(newStudentIds);
    if (!selectedStudentId) {
      setSelectedStudentId(String(studentId));
    }

    setLoadingStudentBills(true);
    try {
      const studentObj = allStudents.find(s => String(s.id) === String(studentId));
      const res = await api.get('/keuangan/student-bills', {
        params: {
          student_id: studentId,
          academic_year_id: activeAcademicYearId || undefined,
          for_payments: true
        }
      });
      const newBills = (res.data?.data || []).map(b => ({
        ...b,
        student_id: b.student_id || parseInt(studentId, 10),
        student_name: b.student_name || studentObj?.name,
        nis: b.nis || studentObj?.nis,
        class_name: b.class_name || studentObj?.class_name
      }));
      const unpaidNewBills = newBills.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0));
      const billsToAdd = unpaidNewBills.length > 0 ? unpaidNewBills : newBills;

      setStudentBillsForRecord(prev => {
        const existingBillIds = new Set(prev.map(b => String(b.id)));
        const filteredNew = billsToAdd.filter(b => !existingBillIds.has(String(b.id)));
        return [...prev, ...filteredNew];
      });
    } catch (err) {
      console.error('Error fetching additional student bills:', err);
    } finally {
      setLoadingStudentBills(false);
    }
  };
  const handleAddStudent = handleAddAdditionalStudent;

  // Hapus Siswa dari Transaksi Pembayaran Bersama
  const handleRemoveStudent = (studentIdToRemove) => {
    const updated = selectedStudentIds.filter(id => String(id) !== String(studentIdToRemove));
    setSelectedStudentIds(updated);
    setSelectedStudentId(updated.length > 0 ? updated[0] : '');

    // Hapus tagihan milik siswa ini dari list dan alokasi
    setStudentBillsForRecord(prev => {
      const remaining = prev.filter(b => String(b.student_id) !== String(studentIdToRemove));
      return remaining;
    });

    setBillAllocations(prev => {
      const next = { ...prev };
      studentBillsForRecord
        .filter(b => String(b.student_id) === String(studentIdToRemove))
        .forEach(b => {
          delete next[b.id];
        });
      return next;
    });
  };

  // Selection Handlers untuk Tagihan Siswa Aktif
  const handleToggleSelectAllBills = () => {
    const payableBills = filteredBills.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0));
    if (payableBills.length === 0) return;
    const allSelected = payableBills.every(b => selectedBillIds.includes(b.id));
    if (allSelected) {
      const payableSet = new Set(payableBills.map(b => b.id));
      setSelectedBillIds(prev => prev.filter(id => !payableSet.has(id)));
    } else {
      setSelectedBillIds(prev => {
        const set = new Set([...prev, ...payableBills.map(b => b.id)]);
        return Array.from(set);
      });
    }
  };

  const handleToggleSelectBill = (billId) => {
    setSelectedBillIds(prev => {
      if (prev.includes(billId)) {
        return prev.filter(id => id !== billId);
      } else {
        return [...prev, billId];
      }
    });
  };

  // Selection Handlers untuk Tagihan Alumni
  const handleToggleSelectAllAlumniBills = () => {
    const payableBills = filteredAlumniBills.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0));
    if (payableBills.length === 0) return;
    const allSelected = payableBills.every(b => selectedAlumniBillIds.includes(b.id));
    if (allSelected) {
      const payableSet = new Set(payableBills.map(b => b.id));
      setSelectedAlumniBillIds(prev => prev.filter(id => !payableSet.has(id)));
    } else {
      setSelectedAlumniBillIds(prev => {
        const set = new Set([...prev, ...payableBills.map(b => b.id)]);
        return Array.from(set);
      });
    }
  };

  const handleToggleSelectAlumniBill = (billId) => {
    setSelectedAlumniBillIds(prev => {
      if (prev.includes(billId)) {
        return prev.filter(id => id !== billId);
      } else {
        return [...prev, billId];
      }
    });
  };

  // Open modal Catat Pembayaran (Mendukung Single Bill maupun Multiple Selected Bills)
  const handleOpenRecordModal = async (presetStudentId = null, presetBill = null, presetBills = null) => {
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethodType('cash');
    setIsHistoricalOnly(false);
    setPaymentNotes('');
    setBankStatementId('');
    setBillRuleOverrides({});
    setBillRuleCustomConfigs({});
    setEditingBillRule(null);
    setRecordBillsSearch('');
    setBillDiscounts({});

    // Reset accounting overrides
    setShowAccountingOverride(false);
    setOverrideRuleId('');
    setOverrideDebitAccountId('');
    setOverrideCreditAccountId('');
    setOverrideAccountReason('');

    const defaultCash = cashAccounts.find(a => a.account_kind === 'cash') || cashAccounts[0];
    if (defaultCash) setTargetCashAccountId(String(defaultCash.id));

    fetchEligibleStudents(activeAcademicYearId);

    // KASUS A: Pembayaran Banyak Tagihan Terpilih Sekaligus (Multi-Select)
    if (Array.isArray(presetBills) && presetBills.length > 0) {
      const studentIds = [...new Set(presetBills.map(b => String(b.student_id)).filter(Boolean))];
      setSelectedStudentIds(studentIds);
      setSelectedStudentId(studentIds[0] || '');

      let totalAlloc = 0;
      const allocMap = {};
      presetBills.forEach(b => {
        const rem = b.remaining_amount !== undefined ? parseFloat(b.remaining_amount) : parseFloat(b.amount || 0);
        allocMap[b.id] = rem;
        totalAlloc += rem;
      });
      setBillAllocations(allocMap);
      setPaymentTotalAmount(String(totalAlloc));

      setRecordModalOpen(true);
      setLoadingStudentBills(true);

      try {
        const allPromises = studentIds.map(sId =>
          api.get('/keuangan/student-bills', {
            params: {
              student_id: sId,
              academic_year_id: activeAcademicYearId || undefined,
              for_payments: true
            }
          })
        );
        const responses = await Promise.all(allPromises);
        let combinedBills = [];
        responses.forEach((res, idx) => {
          const sId = studentIds[idx];
          const studentObj = allStudents.find(s => String(s.id) === String(sId));
          const mapped = (res.data?.data || []).map(b => ({
            ...b,
            student_id: b.student_id || parseInt(sId, 10),
            student_name: b.student_name || studentObj?.name,
            nis: b.nis || studentObj?.nis,
            class_name: b.class_name || studentObj?.class_name
          }));
          combinedBills = [...combinedBills, ...mapped];
        });

        const existingIds = new Set(combinedBills.map(b => String(b.id)));
        presetBills.forEach(pb => {
          if (!existingIds.has(String(pb.id))) {
            combinedBills.push(pb);
          }
        });

        const unpaidFirst = combinedBills.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0));
        setStudentBillsForRecord(unpaidFirst.length > 0 ? unpaidFirst : combinedBills);
      } catch (err) {
        console.error('Error fetching bills for multi-selected students:', err);
        setStudentBillsForRecord(presetBills);
      } finally {
        setLoadingStudentBills(false);
      }
      return;
    }

    // KASUS B: Pembayaran Single Siswa / Single Tagihan
    if (presetStudentId) {
      handleStudentChange(String(presetStudentId));
    } else {
      setSelectedStudentId('');
      setSelectedStudentIds([]);
      setStudentBillsForRecord([]);
      setBillAllocations({});
    }

    if (presetBill) {
      const rem = presetBill.remaining_amount !== undefined ? presetBill.remaining_amount : presetBill.amount;
      setPaymentTotalAmount(String(rem));
      setBillAllocations({ [presetBill.id]: rem });
    } else {
      setPaymentTotalAmount('');
    }

    setRecordModalOpen(true);
  };

  // Close Record Modal with selection reset
  const handleCloseRecordModal = () => {
    setRecordModalOpen(false);
    setSelectedBillIds([]);
    setSelectedAlumniBillIds([]);
    setSelectedStudentId('');
    setSelectedStudentIds([]);
    setStudentBillsForRecord([]);
    setBillAllocations({});
    setBillDiscounts({});
    setPaymentTotalAmount('');
    setBankStatementId('');
  };

  // Close Edit Modal with selection reset
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedBillIds([]);
    setSelectedAlumniBillIds([]);
    setSelectedPaymentToEdit(null);
    setEditSelectedStudentIds([]);
    setEditStudentBills([]);
    setEditBillAllocations({});
    setEditBillDiscounts({});
  };

  // Alokasi Per Baris Tagihan
  const handleAllocationChange = (billId, value) => {
    const num = parseFloat(value) || 0;
    setBillAllocations(prev => ({
      ...prev,
      [billId]: num
    }));
  };

  // Quick Action: Bayar Penuh Baris Tagihan (mempertimbangkan diskon)
  const handlePayFullRow = (bill) => {
    const discInfo = getBillDiscountInfo(bill);
    const targetRem = discInfo.effectiveRem;
    setBillAllocations(prev => ({
      ...prev,
      [bill.id]: targetRem
    }));
  };

  // Auto Allocate FIFO (mempertimbangkan diskon)
  const handleAutoAllocateFifo = () => {
    const total = parseFloat(paymentTotalAmount) || 0;
    if (total <= 0) {
      alert('Masukkan Total Nominal Pembayaran terlebih dahulu sebelum mengalokasikan otomatis.');
      return;
    }

    let remainingToAllocate = total;
    const newAllocations = {};

    studentBillsForRecord.forEach(bill => {
      if (remainingToAllocate <= 0) return;
      const discInfo = getBillDiscountInfo(bill);
      const billRemaining = discInfo.effectiveRem;
      if (billRemaining <= 0) return;

      const take = Math.min(billRemaining, remainingToAllocate);
      newAllocations[bill.id] = take;
      remainingToAllocate -= take;
    });

    setBillAllocations(newAllocations);
  };

  // Total Teralokasi
  const totalAllocatedAmount = useMemo(() => {
    return Object.values(billAllocations).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [billAllocations]);

  // Sisa Belum Teralokasi
  const unallocatedAmount = useMemo(() => {
    const total = parseFloat(paymentTotalAmount) || 0;
    return total - totalAllocatedAmount;
  }, [paymentTotalAmount, totalAllocatedAmount]);

  // Submit Catat Pembayaran
  const handleSavePayment = async (printImmediately = false) => {
    if (!selectedStudentId) {
      alert('Silakan pilih Siswa terlebih dahulu.');
      return;
    }

    const total = parseFloat(paymentTotalAmount) || 0;

    const allocationsArray = studentBillsForRecord
      .filter(b => {
        const allocAmt = parseFloat(billAllocations[b.id] || 0);
        const discInfo = getBillDiscountInfo(b);
        return allocAmt > 0 || (discInfo.enabled && discInfo.discountAmount > 0);
      })
      .map(bill => {
        const allocAmt = parseFloat(billAllocations[bill.id] || 0);
        const discInfo = getBillDiscountInfo(bill);
        const cfg = getBillAccountingConfig(bill);
        return {
          student_bill_id: parseInt(bill.id, 10),
          amount: allocAmt,
          has_discount: discInfo.enabled && discInfo.discountAmount > 0,
          discount_amount: discInfo.enabled ? discInfo.discountAmount : 0,
          discount_type: discInfo.type,
          discount_percentage: discInfo.type === 'percent' ? parseFloat(discInfo.percent || 0) : undefined,
          discount_reason: discInfo.reason || undefined,
          discount_mapping_id: (!isHistoricalOnly && cfg?.discountRuleId) ? parseInt(cfg.discountRuleId, 10) : undefined,
          override_discount_debit_account_id: (!isHistoricalOnly && cfg?.discountDebitAccountId) ? parseInt(cfg.discountDebitAccountId, 10) : undefined,
          override_discount_credit_account_id: (!isHistoricalOnly && cfg?.discountCreditAccountId) ? parseInt(cfg.discountCreditAccountId, 10) : undefined,
          transaction_mapping_id: (!isHistoricalOnly && cfg?.ruleId) ? parseInt(cfg.ruleId, 10) : undefined,
          override_debit_account_id: (!isHistoricalOnly && cfg?.debitAccountId) ? parseInt(cfg.debitAccountId, 10) : undefined,
          override_credit_account_id: (!isHistoricalOnly && cfg?.creditAccountId) ? parseInt(cfg.creditAccountId, 10) : undefined,
          override_cash_account_id: (!isHistoricalOnly && cfg?.cashAccountId) ? parseInt(cfg.cashAccountId, 10) : undefined
        };
      });

    if (allocationsArray.length === 0) {
      alert('Silakan alokasikan nominal pembayaran atau tetapkan diskon pada setidaknya satu pos tagihan.');
      return;
    }

    const totalDiscounts = allocationsArray.reduce((sum, a) => sum + (a.discount_amount || 0), 0);

    if (total <= 0 && totalAllocatedAmount <= 0 && totalDiscounts <= 0) {
      alert('Masukkan nominal pembayaran atau diskon yang valid.');
      return;
    }

    if (totalAllocatedAmount > 0 && Math.abs(unallocatedAmount) > 0.01) {
      if (!window.confirm(`Perhatian: Total teralokasi (Rp ${totalAllocatedAmount.toLocaleString('id-ID')}) tidak sama dengan Total Pembayaran (Rp ${total.toLocaleString('id-ID')}). Ada selisih Rp ${unallocatedAmount.toLocaleString('id-ID')}. Tetap lanjutkan penyimpanan?`)) {
        return;
      }
    }

    setSavingPayment(true);
    try {
      const payload = {
        allocations: allocationsArray,
        student_bill_id: allocationsArray[0].student_bill_id,
        amount: totalAllocatedAmount,
        paid_at: paymentDate,
        cash_account_id: isHistoricalOnly ? undefined : (targetCashAccountId ? parseInt(targetCashAccountId, 10) : undefined),
        payment_method: isHistoricalOnly ? 'historical' : paymentMethodType,
        is_legacy: isHistoricalOnly,
        is_historical_only: isHistoricalOnly,
        historical_cash_note: isHistoricalOnly ? 'Pencatatan Riwayat Saja (Non-Kas / Tanpa Mutasi Saldo)' : undefined,
        notes: paymentNotes || (isHistoricalOnly ? 'Pencatatan Riwayat Saja (Non-Kas)' : undefined),
        bank_statement_id: (!isHistoricalOnly && bankStatementId) ? parseInt(bankStatementId, 10) : undefined,
        transaction_mapping_id: (!isHistoricalOnly && overrideRuleId) ? parseInt(overrideRuleId, 10) : undefined,
        override_debit_account_id: (!isHistoricalOnly && overrideDebitAccountId) ? parseInt(overrideDebitAccountId, 10) : undefined,
        override_credit_account_id: (!isHistoricalOnly && overrideCreditAccountId) ? parseInt(overrideCreditAccountId, 10) : undefined,
        override_reason: (!isHistoricalOnly && isAccountingOverridden) ? (overrideAccountReason || 'Penyesuaian akun transaksi loket kasir') : undefined
      };

      const res = await api.post('/keuangan/bill-payments', payload);
      const createdData = res.data?.data;

      if (isHistoricalOnly) {
        alert(`Pencatatan riwayat pembayaran berhasil disimpan! Tagihan siswa telah diperbarui menjadi LUNAS/terbayar tanpa memengaruhi saldo kas/bank buku kas.`);
      } else {
        alert(`Pembayaran & penetapan diskon berhasil dicatat! Kwitansi resmi #${createdData?.receipt_number || ''} telah diproses dan jurnal otomatis telah dibukukan.`);
      }
      handleCloseRecordModal();

      fetchBillsData();
      fetchAlumniBillsData();
      if (receiptSubTab === 'history') fetchPaymentHistoryData();

      if (printImmediately && createdData?.id) {
        handleViewAndPrintReceipt(createdData.id, true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan pembayaran');
    } finally {
      setSavingPayment(false);
    }
  };

  // View & Print Receipt
  const handleViewAndPrintReceipt = async (paymentId, openNewTab = false) => {
    try {
      const res = await api.get(`/keuangan/bill-payments/${paymentId}/receipt`);
      const rData = res.data?.data;
      if (openNewTab) {
        openReceiptInNewTab(rData, activeSchoolUnit?.name);
      } else {
        setActiveReceiptData(rData);
        setReceiptModalOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat kwitansi pembayaran');
    }
  };

  // Fetch Bank Statements for Edit Modal
  const fetchEditBankStatements = async (accId, pDate, currentBsId = '') => {
    if (!accId) {
      setEditBankStatementsOptions([]);
      return;
    }
    setLoadingEditBankStatements(true);
    try {
      const res = await api.get('/keuangan/bank-statements', {
        params: {
          cash_account_id: accId,
          dc_type: 'credit',
          no_pagination: true,
          sort_by: 'transaction_date',
          sort_dir: 'desc'
        }
      });
      let rows = res.data?.data?.statements || (Array.isArray(res.data?.data) ? res.data.data : []);
      
      // If currentBsId is specified but not present in rows, fetch it explicitly
      if (currentBsId && !rows.some(r => String(r.id) === String(currentBsId))) {
        try {
          const singleRes = await api.get(`/keuangan/bank-statements/${currentBsId}`);
          const singleRow = singleRes.data?.data;
          if (singleRow) {
            rows = [singleRow, ...rows];
          }
        } catch (_) {}
      }

      const opts = rows.map(r => {
        const desc = r.description || r.mutation_description || 'Mutasi Masuk';
        const refNo = r.journal_number || r.reference_number || r.reconciliation_notes || r.import_batch_id || '';
        const rkDate = r.transaction_date ? String(r.transaction_date).slice(0, 10) : '';
        const isExactDate = pDate && rkDate === pDate;
        const isCurrentLinked = String(r.id) === String(currentBsId);
        const totalPlafon = parseFloat(r.amount || 0);
        const allocatedAmt = parseFloat(r.allocated_amount || 0);
        const remainingAmt = r.remaining_amount !== undefined ? parseFloat(r.remaining_amount) : Math.max(0, totalPlafon - allocatedAmt);
        const isFullyAllocated = Boolean(r.is_reconciled) || (remainingAmt <= 0.01 && totalPlafon > 0);
        const isPartial = !isFullyAllocated && allocatedAmt > 0 && remainingAmt > 0.01;

        let badgeText = isCurrentLinked ? '📌 LINKED SAAT INI' : (isExactDate ? '⭐ TGL COCOK' : 'KREDIT');
        let badgeStyle = isCurrentLinked ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold' : (isExactDate ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-indigo-50 text-indigo-700');

        if (!isCurrentLinked && isPartial) {
          badgeText = isExactDate ? '⭐ TGL COCOK | SISA' : '⚡ SISA PLAFON';
          badgeStyle = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
        }

        if (!isCurrentLinked && isFullyAllocated) {
          badgeText = '⛔ HABIS TERPAKAI';
          badgeStyle = 'bg-rose-100 text-rose-800 border border-rose-300 font-bold';
        }

        const labelText = isCurrentLinked
          ? `[LINKED SAAT INI] ${formatCurrency(totalPlafon)} - ${desc}`
          : (!isCurrentLinked && isFullyAllocated)
          ? `[HABIS TERPAKAI] ${formatCurrency(totalPlafon)} - ${desc}`
          : isPartial
          ? `Sisa: ${formatCurrency(remainingAmt)} (Plafon: ${formatCurrency(totalPlafon)}) - ${desc}`
          : `${formatCurrency(totalPlafon)} - ${desc}`;

        const sublabelText = (!isCurrentLinked && isFullyAllocated)
          ? `Tgl: ${rkDate || '-'} | Ref: ${refNo || '-'} | Plafon: ${formatCurrency(totalPlafon)} (Teralokasi Penuh: ${formatCurrency(allocatedAmt)}) • Saldo Sisa: Rp 0`
          : `Tgl: ${rkDate || '-'} | Ref: ${refNo || '-'} | Plafon: ${formatCurrency(totalPlafon)}${allocatedAmt > 0 ? ` (Teralokasi: ${formatCurrency(allocatedAmt)})` : ''}`;

        const searchTerms = [
          refNo,
          r.journal_number,
          r.reference_number,
          r.reconciliation_notes,
          r.import_batch_id,
          desc,
          r.description,
          r.mutation_description,
          String(r.amount || ''),
          String(totalPlafon),
          String(remainingAmt),
          rkDate
        ].filter(Boolean);

        return {
          value: String(r.id),
          label: labelText,
          sublabel: sublabelText,
          badge: badgeText,
          badgeClass: badgeStyle,
          amount: totalPlafon,
          allocated_amount: allocatedAmt,
          remaining_amount: remainingAmt,
          rawDate: rkDate,
          desc: desc,
          refNo: refNo,
          journal_number: r.journal_number,
          reference_number: r.reference_number,
          searchTerms: searchTerms,
          isExactDate,
          isCurrentLinked,
          disabled: isFullyAllocated && !isCurrentLinked,
          isFullyAllocated: isFullyAllocated && !isCurrentLinked,
          disabledReason: `Mutasi rekening koran (${desc}) sebesar ${formatCurrency(totalPlafon)} sudah habis terpakai (teralokasi penuh ${formatCurrency(allocatedAmt)}). Tidak dapat dipilih.`
        };
      });

      opts.sort((a, b) => {
        if (a.isCurrentLinked && !b.isCurrentLinked) return -1;
        if (!a.isCurrentLinked && b.isCurrentLinked) return 1;
        if (!a.disabled && b.disabled) return -1;
        if (a.disabled && !b.disabled) return 1;
        if (a.isExactDate && !b.isExactDate) return -1;
        if (!a.isExactDate && b.isExactDate) return 1;
        return (b.rawDate || '').localeCompare(a.rawDate || '');
      });

      setEditBankStatementsOptions(opts);
    } catch (err) {
      console.error('Error fetching edit bank statements:', err);
      setEditBankStatementsOptions([]);
    } finally {
      setLoadingEditBankStatements(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = async (payment) => {
    setSelectedPaymentToEdit(payment);
    setShowEditAccountingOverride(false);
    setEditModalOpen(true);
    setLoadingEditDetails(true);
    setEditBillsSearch('');

    try {
      const res = await api.get(`/keuangan/bill-payments/${payment.id}`);
      const pData = res.data?.data || payment;
      setSelectedPaymentToEdit(pData);

      const paidIso = pData.paid_at_formatted || (pData.paid_at ? String(pData.paid_at).slice(0, 10) : new Date().toISOString().slice(0, 10));
      const cashAccId = pData.cash_account_id ? String(pData.cash_account_id) : (cashAccounts.length > 0 ? String(cashAccounts[0].id) : '');
      const method = pData.payment_method || 'cash';
      const bsId = pData.bank_statement_id ? String(pData.bank_statement_id) : '';

      const rawItems = pData.items && pData.items.length > 0 ? pData.items : [pData];
      const initialAllocMap = {};
      const initialDiscMap = {};
      const rawStudentIds = pData.all_student_ids && pData.all_student_ids.length > 0 
        ? pData.all_student_ids.map(String) 
        : [String(pData.student_id)];
      const studentIds = [...new Set(rawStudentIds.filter(Boolean))];

      setEditSelectedStudentIds(studentIds);

      rawItems.forEach(item => {
        const bId = item.student_bill_id || item.id;
        initialAllocMap[bId] = parseFloat(item.amount || 0);

        if (parseFloat(item.bill_discount_amount || item.discount_amount || 0) > 0) {
          initialDiscMap[bId] = {
            enabled: true,
            type: item.bill_discount_type || 'nominal',
            percent: item.bill_discount_percentage !== undefined ? String(item.bill_discount_percentage) : '',
            amount: String(item.bill_discount_amount || item.discount_amount || ''),
            reason: item.bill_discount_reason || ''
          };
        }
      });

      setEditBillAllocations(initialAllocMap);
      setEditBillDiscounts(initialDiscMap);

      setEditForm({
        amount: pData.total_amount !== undefined ? String(pData.total_amount) : String(pData.amount || ''),
        paid_at: paidIso,
        cash_account_id: cashAccId,
        payment_method: method,
        is_historical: Boolean(pData.is_legacy),
        notes: pData.notes || '',
        correction_reason: '',
        bank_statement_id: bsId,
        transaction_mapping_id: '',
        override_debit_account_id: '',
        override_credit_account_id: '',
        override_cash_account_id: ''
      });

      if (method === 'bank_transfer' && cashAccId) {
        fetchEditBankStatements(cashAccId, paidIso, bsId);
      }

      // Fetch student bills for all students involved
      const allPromises = studentIds.map(sId =>
        api.get('/keuangan/student-bills', {
          params: {
            student_id: sId,
            academic_year_id: activeAcademicYearId || undefined,
            for_payments: true
          }
        })
      );
      const responses = await Promise.all(allPromises);
      let combinedBills = [];
      responses.forEach((resp, idx) => {
        const sId = studentIds[idx];
        const studentObj = allStudents.find(s => String(s.id) === String(sId));
        const mapped = (resp.data?.data || []).map(b => {
          const origAlloc = initialAllocMap[b.id] || 0;
          return {
            ...b,
            student_id: b.student_id || parseInt(sId, 10),
            student_name: b.student_name || studentObj?.name,
            nis: b.nis || studentObj?.nis,
            class_name: b.class_name || studentObj?.class_name,
            orig_alloc: origAlloc,
            total_paid_other: Math.max(0, parseFloat(b.total_paid || 0) - origAlloc)
          };
        });
        combinedBills = [...combinedBills, ...mapped];
      });

      // Ensure any bill present in rawItems is in the list
      const existingIds = new Set(combinedBills.map(b => String(b.id)));
      rawItems.forEach(item => {
        const bId = String(item.student_bill_id || item.id);
        if (!existingIds.has(bId)) {
          const origAlloc = parseFloat(item.amount || 0);
          combinedBills.push({
            id: item.student_bill_id || item.id,
            student_id: item.student_id,
            student_name: item.student_name,
            nis: item.nis,
            class_name: item.class_name,
            fee_type_id: item.fee_type_id,
            fee_type_name: item.fee_type_name,
            fee_type_code: item.fee_type_code,
            component_display: item.component_display,
            period_display: item.period_display,
            academic_year_id: item.academic_year_id,
            academic_year_name: item.academic_year_name,
            amount: item.bill_amount || item.amount,
            total_paid: item.total_paid || item.amount,
            orig_alloc: origAlloc,
            total_paid_other: Math.max(0, (parseFloat(item.total_paid || item.amount) || 0) - origAlloc),
            status: item.status || 'partially_paid'
          });
        }
      });

      setEditStudentBills(combinedBills);
    } catch (err) {
      console.error('Gagal mengambil detail pembayaran:', err);
      alert('Gagal memuat detail tagihan untuk koreksi: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingEditDetails(false);
    }
  };

  const handleEditRuleChange = (newRuleId) => {
    const r = transactionRules.find(item => String(item.id) === String(newRuleId));
    setEditForm(prev => ({
      ...prev,
      transaction_mapping_id: newRuleId || '',
      override_debit_account_id: r?.debit_account_id ? String(r.debit_account_id) : prev.override_debit_account_id,
      override_credit_account_id: r?.credit_account_id ? String(r.credit_account_id) : prev.override_credit_account_id,
      override_cash_account_id: r?.cash_account_id ? String(r.cash_account_id) : prev.override_cash_account_id
    }));
  };

  // Submit Edit Koreksi Pembayaran
  const handleSaveEdit = async (andPrintReceipt = false) => {
    if (!editForm.correction_reason.trim()) {
      alert('Alasan koreksi wajib diisi untuk menjaga integritas audit transaksi.');
      return;
    }

    const total = parseFloat(editForm.amount) || 0;

    const allocationsArray = editStudentBills
      .filter(b => {
        const allocAmt = parseFloat(editBillAllocations[b.id] || 0);
        const discInfo = getBillDiscountInfo(b, editBillDiscounts);
        return allocAmt > 0 || (discInfo.enabled && discInfo.discountAmount > 0);
      })
      .map(bill => {
        const allocAmt = parseFloat(editBillAllocations[bill.id] || 0);
        const discInfo = getBillDiscountInfo(bill, editBillDiscounts);
        const cfg = getBillAccountingConfig(bill);
        return {
          student_bill_id: parseInt(bill.id, 10),
          amount: allocAmt,
          has_discount: discInfo.enabled && discInfo.discountAmount > 0,
          discount_amount: discInfo.enabled ? discInfo.discountAmount : 0,
          discount_type: discInfo.type,
          discount_percentage: discInfo.type === 'percent' ? parseFloat(discInfo.percent || 0) : undefined,
          discount_reason: discInfo.reason || undefined,
          discount_mapping_id: (!editForm.is_historical && cfg?.discountRuleId) ? parseInt(cfg.discountRuleId, 10) : undefined,
          override_discount_debit_account_id: (!editForm.is_historical && cfg?.discountDebitAccountId) ? parseInt(cfg.discountDebitAccountId, 10) : undefined,
          override_discount_credit_account_id: (!editForm.is_historical && cfg?.discountCreditAccountId) ? parseInt(cfg.discountCreditAccountId, 10) : undefined,
          transaction_mapping_id: (!editForm.is_historical && cfg?.ruleId) ? parseInt(cfg.ruleId, 10) : undefined,
          override_debit_account_id: (!editForm.is_historical && cfg?.debitAccountId) ? parseInt(cfg.debitAccountId, 10) : undefined,
          override_credit_account_id: (!editForm.is_historical && cfg?.creditAccountId) ? parseInt(cfg.creditAccountId, 10) : undefined,
          override_cash_account_id: (!editForm.is_historical && cfg?.cashAccountId) ? parseInt(cfg.cashAccountId, 10) : undefined
        };
      });

    if (allocationsArray.length === 0) {
      alert('Silakan alokasikan nominal pembayaran atau tetapkan diskon pada setidaknya satu pos tagihan.');
      return;
    }

    if (editTotalAllocatedAmount > 0 && Math.abs(editUnallocatedAmount) > 0.01) {
      if (!window.confirm(`Perhatian: Total teralokasi (Rp ${editTotalAllocatedAmount.toLocaleString('id-ID')}) tidak sama dengan Total Pembayaran (Rp ${total.toLocaleString('id-ID')}). Ada selisih Rp ${editUnallocatedAmount.toLocaleString('id-ID')}. Tetap lanjutkan penyimpanan koreksi?`)) {
        return;
      }
    }

    setSavingEdit(true);
    try {
      const payload = {
        allocations: allocationsArray,
        amount: editTotalAllocatedAmount,
        paid_at: editForm.paid_at,
        cash_account_id: editForm.is_historical ? null : (editForm.cash_account_id ? parseInt(editForm.cash_account_id, 10) : null),
        payment_method: editForm.is_historical ? 'historical' : editForm.payment_method,
        is_historical: editForm.is_historical,
        is_legacy: editForm.is_historical,
        notes: editForm.notes,
        correction_reason: editForm.correction_reason.trim(),
        bank_statement_id: (!editForm.is_historical && editForm.payment_method === 'bank_transfer' && editForm.bank_statement_id) ? parseInt(editForm.bank_statement_id, 10) : null
      };

      await api.patch(`/keuangan/bill-payments/${selectedPaymentToEdit.id}`, payload);
      alert('Koreksi pembayaran berhasil disimpan & dicatat ke riwayat audit!');
      handleCloseEditModal();
      fetchPaymentHistoryData();
      fetchBillsData();
      fetchAlumniBillsData();

      if (andPrintReceipt) {
        handleViewAndPrintReceipt(selectedPaymentToEdit.id, true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengoreksi pembayaran');
    } finally {
      setSavingEdit(false);
    }
  };

  // Student Options for SearchableSelect (Hanya Siswa Aktif, Siswa Baru/Pindahan T.A. Depan, dan Alumni Bertunggakan)
  const studentSelectOptions = useMemo(() => {
    const list = eligibleStudents.length > 0 ? eligibleStudents : allStudents;
    return list.map(s => {
      let badgeLabel = s.badge || s.class_name || 'Aktif';
      let badgeClassStyle = s.badgeClass || 'bg-indigo-50 text-indigo-700 border-indigo-200';

      if (!s.badge) {
        if (s.category === 'alumni_arrears') {
          badgeLabel = 'Alumni (Tunggakan)';
          badgeClassStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
        } else if (s.category === 'new_student') {
          badgeLabel = 'Siswa Baru (T.A. Depan)';
          badgeClassStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
        } else if (s.category === 'transfer') {
          badgeLabel = 'Pindahan';
          badgeClassStyle = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
        }
      }

      return {
        value: String(s.id),
        label: s.name || `Siswa ID #${s.id}`,
        sublabel: `NIS: ${s.nis || '-'} | Status: ${s.class_name || '-'}`,
        badge: badgeLabel,
        badgeClass: badgeClassStyle
      };
    });
  }, [eligibleStudents, allStudents]);

  // Unique Classes for Filter (Active Students)
  const uniqueClasses = useMemo(() => {
    const list = billsList.map(b => b.class_name).filter(Boolean);
    return ['all', ...new Set(list)];
  }, [billsList]);

  // Unique Cohorts / Graduation Years for Filter (Alumni)
  const uniqueAlumniCohorts = useMemo(() => {
    const list = alumniBillsList.map(b => b.graduation_year_display).filter(Boolean);
    return ['all', ...new Set(list)];
  }, [alumniBillsList]);

  // Unique Origin Academic Years for Filter (Alumni Arrears)
  const uniqueAlumniAcademicYears = useMemo(() => {
    const list = alumniBillsList.map(b => b.academic_year_name).filter(Boolean);
    return ['all', ...new Set(list)];
  }, [alumniBillsList]);

  // Combined Bills for Table Display based on Origin Filter
  const combinedBillsList = useMemo(() => {
    if (billsOriginFilter === 'current') return billsList;
    if (billsOriginFilter === 'prior_arrears') return priorArrearsList;
    return [...billsList, ...priorArrearsList];
  }, [billsOriginFilter, billsList, priorArrearsList]);

  // Distinct Fee Types Options for Component Filter
  const feeTypeFilterOptions = useMemo(() => {
    const map = new Map();
    feeTypes.forEach((ft) => {
      if (ft.id && ft.name) {
        map.set(String(ft.id), ft.name);
      }
    });
    [...billsList, ...priorArrearsList].forEach((b) => {
      if (b.fee_type_id && (b.fee_type_name || b.component_display)) {
        map.set(String(b.fee_type_id), b.component_display || b.fee_type_name);
      }
    });
    alumniBillsList.forEach((b) => {
      if (b.fee_type_id && (b.fee_type_name || b.component_display)) {
        map.set(String(b.fee_type_id), b.component_display || b.fee_type_name);
      }
    });
    paymentHistoryList.forEach((p) => {
      if (p.fee_type_id && (p.fee_type_name || p.payment_for)) {
        map.set(String(p.fee_type_id), p.fee_type_name || p.payment_for);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [feeTypes, billsList, priorArrearsList, alumniBillsList, paymentHistoryList]);

  // Dropdown options untuk filter multi-select
  const billStatusOptions = useMemo(() => [
    { value: 'unpaid', label: 'Belum Lunas (Unpaid)', badge: 'BELUM', badgeClass: 'bg-rose-50 text-rose-700 font-semibold' },
    { value: 'partially_paid', label: 'Sebagian (Partially Paid)', badge: 'SEBAGIAN', badgeClass: 'bg-amber-50 text-amber-700 font-semibold' },
    { value: 'paid', label: 'Lunas (Paid)', badge: 'LUNAS', badgeClass: 'bg-emerald-50 text-emerald-700 font-semibold' }
  ], []);

  const feeTypeSelectOptions = useMemo(() => {
    return feeTypeFilterOptions.map(ft => ({
      value: String(ft.id),
      label: ft.name
    }));
  }, [feeTypeFilterOptions]);

  const classSelectOptions = useMemo(() => {
    return uniqueClasses.filter(c => c !== 'all').map(c => ({
      value: c,
      label: `Kelas ${c}`
    }));
  }, [uniqueClasses]);

  const alumniStatusOptions = useMemo(() => [
    { value: 'with_arrears', label: '★ Menunggak (Sisa > 0)', badge: 'TUNGGAKAN', badgeClass: 'bg-amber-100 text-amber-900 font-bold' },
    { value: 'unpaid', label: 'Belum Lunas (Unpaid)', badge: 'BELUM', badgeClass: 'bg-rose-50 text-rose-700 font-semibold' },
    { value: 'partially_paid', label: 'Sebagian (Partially Paid)', badge: 'SEBAGIAN', badgeClass: 'bg-amber-50 text-amber-700 font-semibold' },
    { value: 'paid', label: 'Lunas (Paid)', badge: 'LUNAS', badgeClass: 'bg-emerald-50 text-emerald-700 font-semibold' }
  ], []);

  const alumniCohortSelectOptions = useMemo(() => {
    return uniqueAlumniCohorts.filter(c => c !== 'all').map(c => ({
      value: c,
      label: c
    }));
  }, [uniqueAlumniCohorts]);

  const alumniAySelectOptions = useMemo(() => {
    return uniqueAlumniAcademicYears.filter(y => y !== 'all').map(y => ({
      value: y,
      label: y
    }));
  }, [uniqueAlumniAcademicYears]);

  const historyMethodOptions = useMemo(() => [
    { value: 'cash', label: 'Tunai (Kasir Loket)', badge: 'TUNAI', badgeClass: 'bg-emerald-50 text-emerald-700 font-semibold' },
    { value: 'bank_transfer', label: 'Non-Tunai (Transfer Bank)', badge: 'BANK', badgeClass: 'bg-indigo-50 text-indigo-700 font-semibold' },
    { value: 'historical', label: 'Riwayat (Non-Kas)', badge: 'RIWAYAT', badgeClass: 'bg-amber-50 text-amber-800 font-semibold' }
  ], []);

  // Dropdown options untuk Penerimaan Kas Lainnya (SearchableSelect)
  const otherIncomeCashAccountOptions = useMemo(() => {
    return cashAccounts.map(a => {
      const isBank = a.account_kind === 'bank';
      const rekDetail = isBank
        ? `No. Rek: ${a.bank_account_number || a.account_number || '-'} (${a.bank_name || 'Bank'})`
        : 'Kas Tunai / Loket';
      const coaCode = a.account_code ? `[${a.account_code}] ` : '';
      return {
        value: String(a.id),
        label: `${coaCode}${a.name}`,
        sublabel: `${rekDetail} • ${isBank ? 'Bank' : 'Kas Tunai'}`,
        badge: isBank ? 'BANK' : 'KAS',
        badgeClass: isBank ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
      };
    });
  }, [cashAccounts]);

  const otherIncomeFundBalanceSelectOptions = useMemo(() => {
    const result = [];
    fundBalancesOptions.forEach(g => {
      (g.options || []).forEach(opt => {
        result.push({
          value: String(opt.fund_ref_id),
          label: opt.name,
          sublabel: `Kategori: ${g.group_title || 'Kantong Dana'} • Saldo: ${formatCurrency(opt.balance || 0)}`,
          badge: g.group_title || 'Kantong Dana',
          badgeClass: 'bg-slate-100 text-slate-700 font-medium'
        });
      });
    });
    return result;
  }, [fundBalancesOptions]);

  const otherIncomeRapbsOptions = useMemo(() => {
    return rapbsSources.map(s => ({
      value: String(s.id),
      label: s.name,
      sublabel: `Pagu: ${formatCurrency(s.planned_amount || 0)} | Realisasi: ${formatCurrency(s.total_realized || 0)}${s.account_code ? ` | COA: [${s.account_code}]` : ''}`,
      badge: s.source_category_label || s.source_category || 'RAPBS',
      badgeClass: 'bg-indigo-50 text-indigo-700 font-bold'
    }));
  }, [rapbsSources]);

  const otherIncomeCategoryOptions = useMemo(() => [
    { value: 'other', label: 'Penerimaan Lain-Lain (Umum)', sublabel: 'Penerimaan operasional / non-operasional umum' },
    { value: 'bos_government', label: 'BOS / Bantuan Pemerintah', sublabel: 'BOS Reguler, Kinerja, Afirmasi, DAK' },
    { value: 'grant_foundation', label: 'Subsidi / Bantuan Yayasan', sublabel: 'Alokasi dana atau hibah langsung dari yayasan' },
    { value: 'donation_waqf', label: 'Donasi, Infaq & Wakaf', sublabel: 'Sumbangan sukarela masyarakat, wali santri, donatur' },
    { value: 'business_unit', label: 'Unit Usaha, Kantin & Koperasi', sublabel: 'Bagi hasil atau keuntungan unit usaha mandiri' },
    { value: 'facility_rental', label: 'Sewa Gedung / Fasilitas', sublabel: 'Penyewaan lapangan, auditorium, lab, kendaraan' },
    { value: 'bank_interest', label: 'Jasa Giro / Bunga Bank', sublabel: 'Pendapatan bunga rekening bank penampung' }
  ], []);

  const otherIncomeTransactionRuleOptions = useMemo(() => {
    const rules = transactionRules.filter(r => r.transaction_type === 'penambahan_kas' || (r.transaction_code && r.transaction_code.includes('income')));
    return rules.map(r => ({
      value: String(r.id),
      label: r.transaction_label || r.transaction_code,
      sublabel: `Kode: ${r.transaction_code || '-'} | Debit: ${r.debit_account_code || r.debit_account_id || '-'} | Kredit: ${r.credit_account_code || r.credit_account_id || '-'}`,
      badge: 'ATURAN',
      badgeClass: 'bg-emerald-50 text-emerald-700 font-medium'
    }));
  }, [transactionRules]);

  const otherIncomeDebitCoaOptions = useMemo(() => {
    const coas = chartOfAccounts.filter(a => a.account_group === 'harta' || a.account_group === 'kas' || (a.account_code && a.account_code.startsWith('1')));
    return coas.map(a => ({
      value: String(a.id),
      label: `[${a.account_code}] ${a.account_name}`,
      sublabel: `Tipe: ${a.account_type || 'Asset'} • Grup: ${a.account_group || 'Kas/Bank'}`,
      badge: a.account_code,
      badgeClass: 'bg-slate-100 text-slate-700 font-mono'
    }));
  }, [chartOfAccounts]);

  const otherIncomeCreditCoaOptions = useMemo(() => {
    const coas = chartOfAccounts.filter(a => a.account_group === 'pendapatan' || (a.account_code && (a.account_code.startsWith('6') || a.account_code.startsWith('4'))));
    return coas.map(a => ({
      value: String(a.id),
      label: `[${a.account_code}] ${a.account_name}`,
      sublabel: `Tipe: ${a.account_type || 'Revenue'} • Grup: ${a.account_group || 'Pendapatan'}`,
      badge: a.account_code,
      badgeClass: 'bg-emerald-50 text-emerald-700 font-mono'
    }));
  }, [chartOfAccounts]);

  // Filtered Bills List (Active Students) - Mendukung Multi-Select
  const filteredBills = useMemo(() => {
    let list = combinedBillsList.filter(b => {
      if (b.student_status && ['calon', 'pendaftaran', 'ppdb', 'batal', 'keluar', 'dikeluarkan'].includes(String(b.student_status).toLowerCase())) {
        return false;
      }

      // Filter Multi-Status
      if (Array.isArray(billsStatusFilter) && billsStatusFilter.length > 0) {
        if (!billsStatusFilter.includes(b.status)) return false;
      } else if (typeof billsStatusFilter === 'string' && billsStatusFilter !== 'all') {
        if (b.status !== billsStatusFilter) return false;
      }

      // Filter Multi-Rombel
      if (Array.isArray(billsClassFilter) && billsClassFilter.length > 0) {
        if (!billsClassFilter.includes(b.class_name)) return false;
      } else if (typeof billsClassFilter === 'string' && billsClassFilter !== 'all') {
        if (b.class_name !== billsClassFilter) return false;
      }

      // Filter Multi-Komponen Biaya
      if (Array.isArray(billsFeeTypeFilter) && billsFeeTypeFilter.length > 0) {
        const ftIds = billsFeeTypeFilter.map(String);
        const bFtId = String(b.fee_type_id || '');
        const bFtName = String(b.fee_type_name || b.component_display || '').toLowerCase();
        const matches = ftIds.some(id => id === bFtId || id.toLowerCase() === bFtName);
        if (!matches) return false;
      } else if (typeof billsFeeTypeFilter === 'string' && billsFeeTypeFilter !== 'all') {
        const bFtId = String(b.fee_type_id || '');
        const bFtName = String(b.fee_type_name || b.component_display || '').toLowerCase();
        if (bFtId !== String(billsFeeTypeFilter) && bFtName !== String(billsFeeTypeFilter).toLowerCase()) {
          return false;
        }
      }

      // Search Query
      if (billsSearch.trim()) {
        const q = billsSearch.toLowerCase();
        const sName = String(b.student_name || '').toLowerCase();
        const nis = String(b.nis || '').toLowerCase();
        const rombel = String(b.class_name || '').toLowerCase();
        const comp = String(b.component_display || b.fee_type_name || '').toLowerCase();
        if (!sName.includes(q) && !nis.includes(q) && !rombel.includes(q) && !comp.includes(q)) {
          return false;
        }
      }
      return true;
    });

    if (billsSortConfig.key) {
      list.sort((a, b) => {
        let aVal = a[billsSortConfig.key];
        let bVal = b[billsSortConfig.key];

        if (['amount', 'total_paid', 'remaining_amount'].includes(billsSortConfig.key)) {
          let aNum = 0;
          let bNum = 0;
          if (billsSortConfig.key === 'remaining_amount') {
            aNum = a.remaining_amount !== undefined ? parseFloat(a.remaining_amount || 0) : parseFloat(a.amount || 0);
            bNum = b.remaining_amount !== undefined ? parseFloat(b.remaining_amount || 0) : parseFloat(b.amount || 0);
          } else if (billsSortConfig.key === 'total_paid') {
            aNum = parseFloat(a.total_paid || a.paid_amount || 0);
            bNum = parseFloat(b.total_paid || b.paid_amount || 0);
          } else {
            aNum = parseFloat(aVal || 0);
            bNum = parseFloat(bVal || 0);
          }
          return billsSortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        if (['bill_date', 'due_date'].includes(billsSortConfig.key)) {
          const aTime = aVal ? new Date(aVal).getTime() : 0;
          const bTime = bVal ? new Date(bVal).getTime() : 0;
          return billsSortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
        }

        if (billsSortConfig.key === 'component_display') {
          aVal = a.component_display || a.fee_type_name || '';
          bVal = b.component_display || b.fee_type_name || '';
        }

        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();
        if (aStr < bStr) return billsSortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return billsSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [combinedBillsList, billsStatusFilter, billsClassFilter, billsFeeTypeFilter, billsSearch, billsSortConfig]);

  // Filtered Alumni Bills List - Mendukung Multi-Select
  const filteredAlumniBills = useMemo(() => {
    return alumniBillsList.filter(b => {
      // Filter Multi-Status
      if (Array.isArray(alumniStatusFilter) && alumniStatusFilter.length > 0) {
        const hasWithArrears = alumniStatusFilter.includes('with_arrears');
        const otherStatuses = alumniStatusFilter.filter(s => s !== 'with_arrears');
        
        let matches = false;
        if (hasWithArrears && (b.remaining_amount > 0 || (b.remaining_amount === undefined && b.amount > 0)) && b.status !== 'paid') {
          matches = true;
        }
        if (otherStatuses.length > 0 && otherStatuses.includes(b.status)) {
          matches = true;
        }
        if (!matches) return false;
      } else if (typeof alumniStatusFilter === 'string') {
        if (alumniStatusFilter === 'with_arrears') {
          if (b.status === 'paid' || (b.remaining_amount !== undefined && b.remaining_amount <= 0)) return false;
        } else if (alumniStatusFilter !== 'all') {
          if (b.status !== alumniStatusFilter) return false;
        }
      }

      // Filter Multi-Tahun Lulus
      if (Array.isArray(alumniCohortFilter) && alumniCohortFilter.length > 0) {
        if (!alumniCohortFilter.includes(b.graduation_year_display)) return false;
      } else if (typeof alumniCohortFilter === 'string' && alumniCohortFilter !== 'all') {
        if (b.graduation_year_display !== alumniCohortFilter) return false;
      }

      // Filter Multi-T.A. Asal Tunggakan
      if (Array.isArray(alumniAcademicYearFilter) && alumniAcademicYearFilter.length > 0) {
        if (!alumniAcademicYearFilter.includes(b.academic_year_name)) return false;
      } else if (typeof alumniAcademicYearFilter === 'string' && alumniAcademicYearFilter !== 'all') {
        if (b.academic_year_name !== alumniAcademicYearFilter) return false;
      }

      // Filter Multi-Komponen Biaya
      if (Array.isArray(alumniFeeTypeFilter) && alumniFeeTypeFilter.length > 0) {
        const ftIds = alumniFeeTypeFilter.map(String);
        const bFtId = String(b.fee_type_id || '');
        const bFtName = String(b.fee_type_name || b.component_display || '').toLowerCase();
        const matches = ftIds.some(id => id === bFtId || id.toLowerCase() === bFtName);
        if (!matches) return false;
      } else if (typeof alumniFeeTypeFilter === 'string' && alumniFeeTypeFilter !== 'all') {
        const bFtId = String(b.fee_type_id || '');
        const bFtName = String(b.fee_type_name || b.component_display || '').toLowerCase();
        if (bFtId !== String(alumniFeeTypeFilter) && bFtName !== String(alumniFeeTypeFilter).toLowerCase()) {
          return false;
        }
      }

      if (alumniSearch.trim()) {
        const q = alumniSearch.toLowerCase();
        const sName = String(b.student_name || '').toLowerCase();
        const nis = String(b.nis || '').toLowerCase();
        const grad = String(b.graduation_year_display || '').toLowerCase();
        const ay = String(b.academic_year_name || '').toLowerCase();
        const comp = String(b.fee_type_name || b.component_display || '').toLowerCase();
        if (!sName.includes(q) && !nis.includes(q) && !grad.includes(q) && !ay.includes(q) && !comp.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [alumniBillsList, alumniStatusFilter, alumniCohortFilter, alumniAcademicYearFilter, alumniFeeTypeFilter, alumniSearch]);

  // Filtered Payment History - Mendukung Multi-Select
  const filteredHistory = useMemo(() => {
    return paymentHistoryList.filter(p => {
      // Filter Multi-Komponen Biaya
      if (Array.isArray(historyFeeTypeFilter) && historyFeeTypeFilter.length > 0) {
        const ftIds = historyFeeTypeFilter.map(String);
        const pFtId = String(p.fee_type_id || '');
        const pFtName = String(p.fee_type_name || p.payment_for || '').toLowerCase();
        const matches = ftIds.some(id => id === pFtId || pFtName.includes(id.toLowerCase()));
        if (!matches) return false;
      } else if (typeof historyFeeTypeFilter === 'string' && historyFeeTypeFilter !== 'all') {
        const pFtId = String(p.fee_type_id || '');
        const pFtName = String(p.fee_type_name || p.payment_for || '').toLowerCase();
        if (pFtId !== String(historyFeeTypeFilter) && !pFtName.includes(String(historyFeeTypeFilter).toLowerCase())) {
          return false;
        }
      }

      // Filter Multi-Metode Bayar
      if (Array.isArray(historyMethodFilter) && historyMethodFilter.length > 0) {
        const pMethod = p.is_legacy ? 'historical' : (p.payment_method || 'cash');
        if (!historyMethodFilter.includes(pMethod)) return false;
      } else if (typeof historyMethodFilter === 'string' && historyMethodFilter !== 'all') {
        const pMethod = p.is_legacy ? 'historical' : (p.payment_method || 'cash');
        if (pMethod !== historyMethodFilter) return false;
      }

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const sName = String(p.student_name || '').toLowerCase();
        const nis = String(p.nis || '').toLowerCase();
        const rec = String(p.receipt_number || '').toLowerCase();
        const rombel = String(p.class_name || '').toLowerCase();
        const notes = String(p.notes || '').toLowerCase();
        const pFor = String(p.payment_for || p.fee_type_name || '').toLowerCase();
        if (!sName.includes(q) && !nis.includes(q) && !rec.includes(q) && !rombel.includes(q) && !notes.includes(q) && !pFor.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [paymentHistoryList, historyFeeTypeFilter, historyMethodFilter, historySearch]);

  // Summary Metrics Active Students (Tahun Ajaran Terkait)
  const billsSummary = useMemo(() => {
    const totalAmount = billsList.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
    const totalPaid = billsList.reduce((acc, b) => acc + parseFloat(b.total_paid || 0), 0);
    const totalPaidCash = billsList.reduce((acc, b) => acc + parseFloat(b.total_paid_cash !== undefined ? b.total_paid_cash : (b.total_paid || 0)), 0);
    const totalPaidHistorical = billsList.reduce((acc, b) => acc + parseFloat(b.total_paid_historical || 0), 0);
    const totalDiscount = billsList.reduce((acc, b) => acc + parseFloat(b.discount_amount || 0), 0);
    const totalRemaining = billsList.reduce((acc, b) => acc + parseFloat(b.remaining_amount || 0), 0);
    const unpaidCount = billsList.filter(b => b.status !== 'paid').length;
    const discountCount = billsList.filter(b => parseFloat(b.discount_amount || 0) > 0).length;
    const historicalCount = billsList.filter(b => parseFloat(b.total_paid_historical || 0) > 0).length;
    return { totalAmount, totalPaid, totalPaidCash, totalPaidHistorical, totalDiscount, totalRemaining, unpaidCount, discountCount, historicalCount };
  }, [billsList]);

  // Summary Metrics Tunggakan Tahun Ajaran Sebelumnya
  const priorArrearsSummary = useMemo(() => {
    const totalAmount = priorArrearsList.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
    const totalPaid = priorArrearsList.reduce((acc, b) => acc + parseFloat(b.total_paid || 0), 0);
    const totalPaidCash = priorArrearsList.reduce((acc, b) => acc + parseFloat(b.total_paid_cash !== undefined ? b.total_paid_cash : (b.total_paid || 0)), 0);
    const totalPaidHistorical = priorArrearsList.reduce((acc, b) => acc + parseFloat(b.total_paid_historical || 0), 0);
    const totalDiscount = priorArrearsList.reduce((acc, b) => acc + parseFloat(b.discount_amount || 0), 0);
    const totalRemaining = priorArrearsList.reduce((acc, b) => acc + parseFloat(b.remaining_amount || 0), 0);
    const unpaidCount = priorArrearsList.filter(b => b.status !== 'paid').length;
    const discountCount = priorArrearsList.filter(b => parseFloat(b.discount_amount || 0) > 0).length;
    const historicalCount = priorArrearsList.filter(b => parseFloat(b.total_paid_historical || 0) > 0).length;
    return { totalAmount, totalPaid, totalPaidCash, totalPaidHistorical, totalDiscount, totalRemaining, unpaidCount, discountCount, historicalCount };
  }, [priorArrearsList]);

  // Summary Metrics Alumni
  const alumniSummary = useMemo(() => {
    const totalAmount = alumniBillsList.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
    const totalPaid = alumniBillsList.reduce((acc, b) => acc + parseFloat(b.paid_amount || b.total_paid || 0), 0);
    const totalDiscount = alumniBillsList.reduce((acc, b) => acc + parseFloat(b.discount_amount || 0), 0);
    const totalRemaining = alumniBillsList.reduce((acc, b) => acc + parseFloat(b.remaining_amount !== undefined ? b.remaining_amount : (b.amount || 0)), 0);
    const unpaidCount = alumniBillsList.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0)).length;
    const discountCount = alumniBillsList.filter(b => parseFloat(b.discount_amount || 0) > 0).length;
    const uniqueAlumniWithArrears = new Set(
      alumniBillsList.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0)).map(b => b.student_id)
    ).size;
    return { totalAmount, totalPaid, totalDiscount, totalRemaining, unpaidCount, discountCount, uniqueAlumniWithArrears };
  }, [alumniBillsList]);

  return (
    <div className="space-y-4">
      {/* Header Halaman Utama */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <CreditCard className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              Pusat Penerimaan Kas & Kasir Loket
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Loket penerimaan kas terpadu: Tagihan Siswa Aktif, Alumni, Riwayat Pembayaran, dan Penerimaan Lainnya (Non-Siswa &amp; RAPBS)
            </p>
          </div>
        </div>

        {/* Multi-Tenant & Dropdown Tahun Ajaran Konteks Operasi */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Satuan Pendidikan Info */}
          <span className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold text-xs text-slate-700 flex items-center gap-1.5 border border-slate-200/80">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{activeSchoolUnit?.name || 'Seluruh Satuan'}</span>
          </span>

          {/* Dropdown Tahun Ajaran Konteks */}
          <div className="flex items-center bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg p-1 transition">
            <div className="flex items-center gap-1.5 pl-2 pr-1 text-slate-700 font-bold text-xs shrink-0">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">T.A.:</span>
            </div>
            <div className="min-w-[170px] sm:min-w-[195px]">
              <SearchableSelect
                options={academicYears.map((ay) => ({
                  value: String(ay.id),
                  label: `T.A. ${ay.name}`,
                  sublabel: ay.is_active ? 'Tahun Ajaran Berjalan (Aktif)' : 'Tahun Ajaran Arsip',
                  badge: ay.is_active ? 'Aktif' : 'Arsip',
                  badgeClass: ay.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600'
                }))}
                value={String(activeAcademicYearId || '')}
                onChange={(val) => setActiveAcademicYearId(String(val))}
                placeholder="Pilih Tahun Ajaran"
                searchPlaceholder="Cari tahun ajaran..."
                accentColor="indigo"
                allowClear={false}
                variant="header-white"
                menuMinWidth="230px"
              />
            </div>
          </div>

          {mainTab === 'other_income' ? (
            <button
              type="button"
              onClick={() => {
                setOtherIncomeForm({
                  payer_name: '',
                  notes: '',
                  amount: '',
                  received_at: new Date().toISOString().slice(0, 10),
                  source_category: 'other',
                  budget_plan_income_item_id: '',
                  cash_account_id: cashAccounts.length > 0 ? String(cashAccounts[0].id) : '',
                  fund_balance_id: '',
                  use_default_accounting_rule: true,
                  transaction_mapping_id: '',
                  override_debit_account_id: '',
                  override_credit_account_id: '',
                  override_reason: ''
                });
                setOtherIncomeModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Penerimaan Lainnya</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenRecordModal()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Pembayaran</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setMainTab('payment_receipt')}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            mainTab === 'payment_receipt'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>1. Penerimaan Pembayaran</span>
          {proofs.filter(p => p.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-400 text-amber-950 rounded-full text-[10px] font-bold">
              {proofs.filter(p => p.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setMainTab('other_income')}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            mainTab === 'other_income'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>2. Penerimaan Lainnya</span>
          {otherIncomesList.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              mainTab === 'other_income' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {otherIncomesList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setMainTab('daily_inflows')}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            mainTab === 'daily_inflows'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3. Rekapitulasi Kas Masuk</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PENERIMAAN PEMBAYARAN                                   */}
      {/* ============================================================== */}
      {mainTab === 'payment_receipt' && (
        <div className="space-y-4">
          {/* Sub-tab Switcher */}
          <div className="flex items-center justify-between bg-slate-100/80 p-1 rounded-lg border border-slate-200/80">
            <div className="flex items-center space-x-1 flex-wrap">
              <button
                type="button"
                onClick={() => setReceiptSubTab('bills')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  receiptSubTab === 'bills'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tagihan Siswa Aktif</span>
                <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-extrabold">
                  {billsSummary.unpaidCount + priorArrearsSummary.unpaidCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptSubTab('alumni_bills')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  receiptSubTab === 'alumni_bills'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tagihan Alumni & Siswa Keluar</span>
                {alumniSummary.unpaidCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    receiptSubTab === 'alumni_bills'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {alumniSummary.unpaidCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setReceiptSubTab('history')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  receiptSubTab === 'history'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5 text-emerald-600" />
                <span>Riwayat Pembayaran</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptSubTab('proofs')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  receiptSubTab === 'proofs'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Verifikasi Bukti Transfer</span>
                {proofs.filter(p => p.status === 'pending').length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black">
                    {proofs.filter(p => p.status === 'pending').length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOpenRecordModal()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Pembayaran Baru</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* SUB-TAB 1.1: TAGIHAN PEMBAYARAN                                */}
          {/* ============================================================== */}
          {receiptSubTab === 'bills' && (
            <div className="space-y-4">
              {/* Macro Summary Cards (7 Cards: Tagihan T.A. Terbit, Kas Diterima Riil, Riwayat Non-Kas, Pemotongan/Diskon, Sisa Piutang, Tunggakan T.A. Lalu, Total Kewajiban) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
                {/* Card 1: Tagihan Terbit */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/60 text-white shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Tagihan Terbit</div>
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-white tracking-tight relative z-10 truncate" title={formatCurrency(billsSummary.totalAmount)}>
                    {formatCurrency(billsSummary.totalAmount)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-indigo-200/80 font-medium">
                    <span>{formatNumber(billsList.length)} pos tagihan</span>
                    {activeAyObj?.name && (
                      <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-1.5 py-0.5 rounded">
                        {activeAyObj.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card 2: Kas Diterima (Hanya Pembayaran Riil Kasir/Bank) */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-50 to-teal-100/70 border border-emerald-300 text-emerald-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Kas Diterima</div>
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-emerald-950 tracking-tight relative z-10 truncate" title={formatCurrency(billsSummary.totalPaidCash)}>
                    {formatCurrency(billsSummary.totalPaidCash)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                    <span>Masuk kas &amp; bank</span>
                  </div>
                </div>

                {/* Card 3: Riwayat (Non-Kas / Catatan Tanpa Mutasi Saldo) */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-50 to-yellow-100/70 border border-amber-300 text-amber-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/20 rounded-full blur-xl group-hover:bg-amber-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Riwayat (Non-Kas)</div>
                    <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <History className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-amber-950 tracking-tight relative z-10 truncate" title={formatCurrency(billsSummary.totalPaidHistorical)}>
                    {formatCurrency(billsSummary.totalPaidHistorical)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-amber-800 font-medium">
                    <span>{formatNumber(billsSummary.historicalCount)} pos riwayat</span>
                  </div>
                </div>

                {/* Card 4: Pemotongan / Diskon (Keringanan Pasca-Penagihan) */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/20 via-purple-50 to-pink-100/70 border border-purple-300 text-purple-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-purple-900">Pemotongan / Diskon</div>
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-purple-950 tracking-tight relative z-10 truncate" title={formatCurrency(billsSummary.totalDiscount)}>
                    {formatCurrency(billsSummary.totalDiscount)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-purple-800 font-medium">
                    <span>{formatNumber(billsSummary.discountCount)} tagihan dipotong</span>
                  </div>
                </div>

                {/* Card 5: Sisa Piutang Berjalan */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500/20 via-rose-50 to-red-100/70 border border-rose-300 text-rose-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/20 rounded-full blur-xl group-hover:bg-rose-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-900">Sisa Piutang</div>
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-rose-950 tracking-tight relative z-10 truncate" title={formatCurrency(billsSummary.totalRemaining)}>
                    {formatCurrency(billsSummary.totalRemaining)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-rose-800 font-medium">
                    <span>{formatNumber(billsSummary.unpaidCount)} belum lunas</span>
                  </div>
                </div>

                {/* Card 6: Tunggakan T.A. Lalu */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-500/20 via-orange-50 to-amber-100/70 border border-orange-300 text-orange-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-orange-500/20 rounded-full blur-xl group-hover:bg-orange-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-orange-900">Tunggakan T.A. Lalu</div>
                    <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-orange-950 tracking-tight relative z-10 truncate" title={formatCurrency(priorArrearsSummary.totalRemaining)}>
                    {formatCurrency(priorArrearsSummary.totalRemaining)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-orange-800 font-medium">
                    <span>{formatNumber(priorArrearsSummary.unpaidCount)} pos tertunggak</span>
                  </div>
                </div>

                {/* Card 7: Total Kewajiban Siswa */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/20 via-blue-50 to-indigo-100/70 border border-blue-300 text-blue-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Total Kewajiban</div>
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <Receipt className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-blue-950 tracking-tight relative z-10 truncate" title={formatCurrency(billsSummary.totalRemaining + priorArrearsSummary.totalRemaining)}>
                    {formatCurrency(billsSummary.totalRemaining + priorArrearsSummary.totalRemaining)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-blue-800 font-medium">
                    <span>Kini + Tunggakan Lalu</span>
                  </div>
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-3.5">
                {/* Filter & Search Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama siswa, NIS, rombel, atau komponen tagihan..."
                      value={billsSearch}
                      onChange={(e) => setBillsSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Origin Switcher (Semua / T.A. Ini / Tunggakan Lalu) */}
                    <select
                      value={billsOriginFilter}
                      onChange={(e) => setBillsOriginFilter(e.target.value)}
                      className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-800 cursor-pointer shadow-2xs"
                    >
                      <option value="all">Semua Tagihan &amp; Tunggakan ({billsList.length + priorArrearsList.length})</option>
                      <option value="current">Tagihan T.A. {activeAyObj?.name || 'Ini'} ({billsList.length})</option>
                      <option value="prior_arrears">Tunggakan T.A. Lalu ({priorArrearsList.length})</option>
                    </select>

                    <div className="w-44">
                      <SearchableSelect
                        options={billStatusOptions}
                        value={billsStatusFilter}
                        onChange={(val) => setBillsStatusFilter(Array.isArray(val) ? val : (val ? [val] : []))}
                        placeholder="Semua Status"
                        searchPlaceholder="Cari status..."
                        isMulti={true}
                        allowClear={true}
                        menuMinWidth="230px"
                      />
                    </div>

                    <div className="w-52">
                      <SearchableSelect
                        options={feeTypeSelectOptions}
                        value={billsFeeTypeFilter}
                        onChange={(val) => setBillsFeeTypeFilter(Array.isArray(val) ? val : (val ? [val] : []))}
                        placeholder="Semua Komponen"
                        searchPlaceholder="Cari komponen..."
                        isMulti={true}
                        allowClear={true}
                        menuMinWidth="280px"
                      />
                    </div>

                    <div className="w-44">
                      <SearchableSelect
                        options={classSelectOptions}
                        value={billsClassFilter}
                        onChange={(val) => setBillsClassFilter(Array.isArray(val) ? val : (val ? [val] : []))}
                        placeholder="Semua Rombel"
                        searchPlaceholder="Cari rombel..."
                        isMulti={true}
                        allowClear={true}
                        menuMinWidth="220px"
                      />
                    </div>

                    {(billsStatusFilter.length > 0 || billsFeeTypeFilter.length > 0 || billsClassFilter.length > 0 || billsSearch || billsOriginFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setBillsStatusFilter([]);
                          setBillsFeeTypeFilter([]);
                          setBillsClassFilter([]);
                          setBillsSearch('');
                          setBillsOriginFilter('all');
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Reset Semua Filter"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={fetchBillsData}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition"
                      title="Refresh Data Tagihan"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Action Bar untuk Tagihan Terpilih */}
                {selectedBillIds.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 p-3 rounded-lg shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-2xs">
                        {selectedBillIds.length}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-indigo-950">
                          {selectedBillIds.length} Tagihan Siswa Dipilih
                        </div>
                        <div className="text-[11px] text-indigo-800 font-medium">
                          Total Kewajiban Terpilih: <strong className="tnum text-indigo-900 font-extrabold">{formatCurrency(
                            [...billsList, ...priorArrearsList]
                              .filter(b => selectedBillIds.includes(b.id))
                              .reduce((acc, b) => acc + (b.remaining_amount !== undefined ? parseFloat(b.remaining_amount) : parseFloat(b.amount || 0)), 0)
                          )}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedBillIds([])}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-lg transition cursor-pointer"
                      >
                        Batal Pilih
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const selectedObjs = [...billsList, ...priorArrearsList].filter(b => selectedBillIds.includes(b.id));
                          handleOpenRecordModal(null, null, selectedObjs);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Bayar {selectedBillIds.length} Tagihan Terpilih</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Table Tagihan */}
                {loading ? (
                  <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span>Memuat daftar tagihan siswa...</span>
                  </div>
                ) : filteredBills.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs italic">
                    Tidak ditemukan data tagihan yang sesuai dengan filter pencarian.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 z-10 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] select-none">
                        <tr>
                          <th className="w-10 px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={
                                filteredBills.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0)).length > 0 &&
                                filteredBills.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0)).every(b => selectedBillIds.includes(b.id))
                              }
                              onChange={handleToggleSelectAllBills}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              title="Pilih Semua Tagihan Belum Lunas di Halaman Ini"
                            />
                          </th>
                          <th
                            onClick={() => handleSortBills('student_name')}
                            className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Nama Siswa</span>
                              {billsSortConfig.key === 'student_name' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('class_name')}
                            className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Rombel</span>
                              {billsSortConfig.key === 'class_name' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('component_display')}
                            className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Komponen Tagihan</span>
                              {billsSortConfig.key === 'component_display' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('bill_date')}
                            className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Tgl Penagihan</span>
                              {billsSortConfig.key === 'bill_date' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('due_date')}
                            className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Jatuh Tempo</span>
                              {billsSortConfig.key === 'due_date' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('amount')}
                            className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Total Tagihan</span>
                              {billsSortConfig.key === 'amount' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('total_paid')}
                            className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Sudah Bayar</span>
                              {billsSortConfig.key === 'total_paid' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('remaining_amount')}
                            className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Sisa Piutang</span>
                              {billsSortConfig.key === 'remaining_amount' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('status')}
                            className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <span>Status</span>
                              {billsSortConfig.key === 'status' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th className="px-3 py-2.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredBills.map((b, bIdx) => {
                          const isSelected = selectedBillIds.includes(b.id);
                          const isPayable = b.status !== 'paid' && (b.remaining_amount === undefined || b.remaining_amount > 0 || b.amount > 0);

                          return (
                            <tr
                              key={`bill-item-${b.id}-${bIdx}`}
                              className={`transition-colors ${
                                isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="w-10 px-3 py-2.5 text-center">
                                {isPayable ? (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectBill(b.id)}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                  />
                                ) : (
                                  <span className="text-slate-300 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-bold text-slate-800 text-xs">{b.student_name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">NIS: {b.nis || '-'}</div>
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 font-semibold">{b.class_name || '-'}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <FeeTypeBadge item={b} />
                                  {(b.fee_type_code === 'arrears_previous_year' || b.fee_type_name?.toLowerCase().includes('tunggakan') || (activeAyObj && b.academic_year_name && !b.academic_year_name.includes(activeAyObj.name))) && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      Tunggakan T.A. Lalu
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap tnum">
                                {formatDateToDMY(b.bill_date || b.created_at)}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap tnum">
                                {b.due_date ? (
                                  <span className={
                                    b.status !== 'paid' && new Date(b.due_date) < new Date()
                                      ? 'text-rose-600 font-bold'
                                      : 'text-slate-600'
                                  }>
                                    {formatDateToDMY(b.due_date)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right font-bold text-slate-800 num-cell">
                                <div>{formatCurrency(b.amount)}</div>
                                {parseFloat(b.discount_amount || 0) > 0 && (
                                  <div className="text-[10px] text-purple-700 font-semibold mt-0.5" title={`Diskon / Keringanan: ${formatCurrency(b.discount_amount)}`}>
                                    Potongan: -{formatCurrency(b.discount_amount)}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right font-bold text-emerald-700 num-cell">
                                <div>{formatCurrency(b.total_paid || 0)}</div>
                                {parseFloat(b.total_paid_historical || 0) > 0 && (
                                  <div className="text-[10px] text-amber-700 font-semibold mt-0.5" title={`Pelunasan Riwayat (Non-Kas): ${formatCurrency(b.total_paid_historical)}`}>
                                    Riwayat: {formatCurrency(b.total_paid_historical)}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right font-black text-rose-600 num-cell">
                                {formatCurrency(b.remaining_amount !== undefined ? b.remaining_amount : Math.max(0, parseFloat(b.amount || 0) - parseFloat(b.discount_amount || 0) - parseFloat(b.total_paid || 0)))}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <StatusPill
                                  variant={b.status === 'paid' || (b.remaining_amount !== undefined && b.remaining_amount <= 0) ? 'success' : (b.status === 'partially_paid' || parseFloat(b.total_paid || 0) > 0) ? 'warning' : 'danger'}
                                  label={b.status === 'paid' || (b.remaining_amount !== undefined && b.remaining_amount <= 0) ? 'Lunas' : (b.status === 'partially_paid' || parseFloat(b.total_paid || 0) > 0) ? 'Sebagian' : 'Belum Lunas'}
                                />
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                {b.status !== 'paid' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRecordModal(b.student_id, b)}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1 ml-auto"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Bayar</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Lunas</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 1.1.5: TAGIHAN ALUMNI & SISWA KELUAR                   */}
          {/* ============================================================== */}
          {receiptSubTab === 'alumni_bills' && (
            <div className="space-y-4">
              {/* Macro Summary Cards Alumni (5 Cards: Total Tagihan, Sudah Diterima, Pemotongan/Diskon, Sisa Tunggakan, Menunggak) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Card 1: Total Tagihan Alumni */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/60 text-white shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Tagihan Alumni</div>
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-white tracking-tight relative z-10 truncate" title={formatCurrency(alumniSummary.totalAmount)}>
                    {formatCurrency(alumniSummary.totalAmount)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-indigo-200/80 font-medium">
                    <span>{formatNumber(alumniBillsList.length)} pos tagihan</span>
                    <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-1.5 py-0.5 rounded">
                      Alumni &amp; Keluar
                    </span>
                  </div>
                </div>

                {/* Card 2: Sudah Diterima Alumni */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-50 to-teal-100/70 border border-emerald-300 text-emerald-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Sudah Diterima</div>
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-emerald-950 tracking-tight relative z-10 truncate" title={formatCurrency(alumniSummary.totalPaid)}>
                    {formatCurrency(alumniSummary.totalPaid)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                    <span>Masuk kas &amp; bank</span>
                  </div>
                </div>

                {/* Card 3: Pemotongan / Diskon Alumni */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/20 via-purple-50 to-pink-100/70 border border-purple-300 text-purple-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-purple-900">Pemotongan / Diskon</div>
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-purple-950 tracking-tight relative z-10 truncate" title={formatCurrency(alumniSummary.totalDiscount)}>
                    {formatCurrency(alumniSummary.totalDiscount)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-purple-800 font-medium">
                    <span>{formatNumber(alumniSummary.discountCount)} pos dipotong</span>
                  </div>
                </div>

                {/* Card 4: Sisa Tunggakan Alumni */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500/20 via-rose-50 to-red-100/70 border border-rose-300 text-rose-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/20 rounded-full blur-xl group-hover:bg-rose-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-900">Sisa Tunggakan</div>
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-rose-950 tracking-tight relative z-10 truncate" title={formatCurrency(alumniSummary.totalRemaining)}>
                    {formatCurrency(alumniSummary.totalRemaining)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-rose-800 font-medium">
                    <span>Piutang tertunggak</span>
                  </div>
                </div>

                {/* Card 5: Santri Alumni Menunggak */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-50 to-orange-100/70 border border-amber-300 text-amber-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/20 rounded-full blur-xl group-hover:bg-amber-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Santri Menunggak</div>
                    <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <History className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-amber-950 tracking-tight relative z-10 truncate">
                    {alumniSummary.uniqueAlumniWithArrears} Santri
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-amber-800 font-medium">
                    <span>{formatNumber(alumniSummary.unpaidCount)} tagihan belum lunas</span>
                  </div>
                </div>
              </div>

              {/* Table Container Alumni */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-3.5">
                {/* Filter & Search Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama alumni / siswa keluar, NIS, tahun lulus, T.A. tunggakan, pos..."
                      value={alumniSearch}
                      onChange={(e) => setAlumniSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-52">
                      <SearchableSelect
                        options={alumniStatusOptions}
                        value={alumniStatusFilter}
                        onChange={(val) => setAlumniStatusFilter(Array.isArray(val) ? val : (val ? [val] : []))}
                        placeholder="Semua Status"
                        searchPlaceholder="Cari status..."
                        isMulti={true}
                        allowClear={true}
                        menuMinWidth="250px"
                      />
                    </div>

                    <div className="w-52">
                      <SearchableSelect
                        options={feeTypeSelectOptions}
                        value={alumniFeeTypeFilter}
                        onChange={(val) => setAlumniFeeTypeFilter(Array.isArray(val) ? val : (val ? [val] : []))}
                        placeholder="Semua Komponen"
                        searchPlaceholder="Cari komponen..."
                        isMulti={true}
                        allowClear={true}
                        menuMinWidth="280px"
                      />
                    </div>

                    <div className="w-44">
                      <SearchableSelect
                        options={alumniCohortSelectOptions}
                        value={alumniCohortFilter}
                        onChange={(val) => setAlumniCohortFilter(Array.isArray(val) ? val : (val ? [val] : []))}
                        placeholder="Semua Thn Lulus"
                        searchPlaceholder="Cari tahun..."
                        isMulti={true}
                        allowClear={true}
                        menuMinWidth="200px"
                      />
                    </div>

                    <div className="w-48">
                      <SearchableSelect
                        options={alumniAySelectOptions}
                        value={alumniAcademicYearFilter}
                        onChange={(val) => setAlumniAcademicYearFilter(Array.isArray(val) ? val : (val ? [val] : []))}
                        placeholder="Semua T.A. Asal"
                        searchPlaceholder="Cari tahun ajaran..."
                        isMulti={true}
                        allowClear={true}
                        menuMinWidth="220px"
                      />
                    </div>

                    {(alumniStatusFilter.length > 0 || alumniFeeTypeFilter.length > 0 || alumniCohortFilter.length > 0 || alumniAcademicYearFilter.length > 0 || alumniSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAlumniStatusFilter(['with_arrears']);
                          setAlumniFeeTypeFilter([]);
                          setAlumniCohortFilter([]);
                          setAlumniAcademicYearFilter([]);
                          setAlumniSearch('');
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Reset Filter Alumni (Kembali ke Default Menunggak)"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={fetchAlumniBillsData}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition"
                      title="Refresh Data Alumni"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Action Bar untuk Tagihan Alumni Terpilih */}
                {selectedAlumniBillIds.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 p-3 rounded-lg shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-2xs">
                        {selectedAlumniBillIds.length}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-indigo-950">
                          {selectedAlumniBillIds.length} Tagihan Alumni Dipilih
                        </div>
                        <div className="text-[11px] text-indigo-800 font-medium">
                          Total Kewajiban Terpilih: <strong className="tnum text-indigo-900 font-extrabold">{formatCurrency(
                            filteredAlumniBills
                              .filter(b => selectedAlumniBillIds.includes(b.id))
                              .reduce((acc, b) => acc + (b.remaining_amount !== undefined ? parseFloat(b.remaining_amount) : parseFloat(b.amount || 0)), 0)
                          )}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedAlumniBillIds([])}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-lg transition cursor-pointer"
                      >
                        Batal Pilih
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const selectedObjs = filteredAlumniBills.filter(b => selectedAlumniBillIds.includes(b.id));
                          handleOpenRecordModal(null, null, selectedObjs);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Bayar {selectedAlumniBillIds.length} Tagihan Alumni Terpilih</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Table Tagihan Alumni */}
                {loadingAlumniBills ? (
                  <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span>Memuat rincian tagihan &amp; tunggakan santri alumni / siswa keluar...</span>
                  </div>
                ) : filteredAlumniBills.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2 italic">
                    <GraduationCap className="w-8 h-8 text-slate-300 mb-1" />
                    <span>Tidak ditemukan data tagihan alumni / siswa keluar yang sesuai dengan filter pencarian.</span>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 z-10 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] select-none">
                        <tr>
                          <th className="w-10 px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={
                                filteredAlumniBills.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0)).length > 0 &&
                                filteredAlumniBills.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0)).every(b => selectedAlumniBillIds.includes(b.id))
                              }
                              onChange={handleToggleSelectAllAlumniBills}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              title="Pilih Semua Tagihan Alumni Belum Lunas"
                            />
                          </th>
                          <th className="px-3 py-2.5">Nama Siswa</th>
                          <th className="px-3 py-2.5">Tahun Lulus</th>
                          <th className="px-3 py-2.5">Tahun Ajaran</th>
                          <th className="px-3 py-2.5">Komponen Tagihan</th>
                          <th className="px-3 py-2.5 text-right">Total Tagihan</th>
                          <th className="px-3 py-2.5 text-right">Sudah Bayar</th>
                          <th className="px-3 py-2.5 text-right">Sisa Piutang</th>
                          <th className="px-3 py-2.5 text-center">Status</th>
                          <th className="px-3 py-2.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredAlumniBills.map((b, bIdx) => {
                          const isSelected = selectedAlumniBillIds.includes(b.id);
                          const isPayable = b.status !== 'paid' && (b.remaining_amount === undefined || b.remaining_amount > 0);

                          return (
                            <tr
                              key={`alumni-bill-item-${b.id}-${bIdx}`}
                              className={`transition-colors ${
                                isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="w-10 px-3 py-2.5 text-center">
                                {isPayable ? (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectAlumniBill(b.id)}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                  />
                                ) : (
                                  <span className="text-slate-300 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                  <span>{b.student_name}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Alumni
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">NIS: {b.nis || '-'}</div>
                              </td>
                              <td className="px-3 py-2.5 text-slate-700 font-semibold">
                                <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[11px]">
                                  {b.graduation_year_display || '-'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-slate-700 font-semibold">
                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] tnum">
                                  {b.academic_year_name || (b.period_year ? `T.A. ${b.period_year}` : '-')}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <FeeTypeBadge item={b} />
                                  {(b.fee_type_code === 'arrears_previous_year' || b.fee_type_name?.toLowerCase().includes('tunggakan')) && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      Tunggakan TP Lalu
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-bold text-slate-800 num-cell">
                                {formatCurrency(b.amount)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-bold text-emerald-700 num-cell">
                                {formatCurrency(b.paid_amount || b.total_paid || 0)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-black text-rose-600 num-cell">
                                {formatCurrency(b.remaining_amount !== undefined ? b.remaining_amount : b.amount)}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <StatusPill
                                  variant={b.status === 'paid' || (b.remaining_amount !== undefined && b.remaining_amount <= 0) ? 'success' : (b.status === 'partially_paid' || b.paid_amount > 0) ? 'warning' : 'danger'}
                                  label={b.status === 'paid' || (b.remaining_amount !== undefined && b.remaining_amount <= 0) ? 'Lunas' : (b.status === 'partially_paid' || b.paid_amount > 0) ? 'Sebagian' : 'Belum Lunas'}
                                />
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                {b.status !== 'paid' && (b.remaining_amount === undefined || b.remaining_amount > 0) ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRecordModal(b.student_id, b)}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1 ml-auto"
                                    title="Catat Pembayaran Tunggakan Alumni"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Bayar</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Lunas</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 1.2: RIWAYAT PEMBAYARAN                                */}
          {/* ============================================================== */}
          {receiptSubTab === 'history' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-3.5">
              {/* Header & Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    Riwayat Seluruh Pembayaran Tagihan Siswa
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Daftar seluruh transaksi penerimaan kas masuk siswa dengan dukungan cetak ulang kwitansi, detail, dan edit koreksi.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={fetchPaymentHistoryData}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer"
                    title="Refresh Riwayat"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Pencarian</label>
                  <input
                    type="text"
                    placeholder="No. kwitansi, siswa, NIS..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Komponen Biaya</label>
                  <SearchableSelect
                    options={feeTypeSelectOptions}
                    value={historyFeeTypeFilter}
                    onChange={(val) => setHistoryFeeTypeFilter(Array.isArray(val) ? val : (val ? [val] : []))}
                    placeholder="Semua Komponen"
                    searchPlaceholder="Cari pos biaya..."
                    isMulti={true}
                    allowClear={true}
                    menuMinWidth="260px"
                  />
                </div>
                <div>
                  <DatePickerField
                    label="Tanggal Mulai"
                    value={historyStartDate}
                    onChange={(iso) => setHistoryStartDate(iso)}
                    placeholder="DD/MM/YYYY"
                    inputClassName="bg-white"
                  />
                </div>
                <div>
                  <DatePickerField
                    label="Tanggal Selesai"
                    value={historyEndDate}
                    onChange={(iso) => setHistoryEndDate(iso)}
                    placeholder="DD/MM/YYYY"
                    inputClassName="bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Metode Bayar</label>
                  <SearchableSelect
                    options={historyMethodOptions}
                    value={historyMethodFilter}
                    onChange={(val) => setHistoryMethodFilter(Array.isArray(val) ? val : (val ? [val] : []))}
                    placeholder="Semua Metode"
                    searchPlaceholder="Cari metode..."
                    isMulti={true}
                    allowClear={true}
                    menuMinWidth="240px"
                  />
                </div>
              </div>

              {(historyFeeTypeFilter.length > 0 || historyMethodFilter.length > 0 || historyStartDate || historyEndDate || historySearch) && (
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryFeeTypeFilter([]);
                      setHistoryMethodFilter([]);
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                      setHistorySearch('');
                    }}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Reset Filter Riwayat"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset Filter Riwayat</span>
                  </button>
                </div>
              )}

              {/* Table Riwayat Pembayaran */}
              {loadingHistory ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span>Memuat riwayat pembayaran...</span>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs italic">
                  Belum ada riwayat pembayaran yang tercatat pada kriteria filter ini.
                </div>
              ) : (
                <div className="table-container">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 z-10 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] select-none">
                      <tr>
                        <th className="px-3 py-2.5">Tanggal</th>
                        <th className="px-3 py-2.5">No. Kwitansi</th>
                        <th className="px-3 py-2.5">Nama Siswa</th>
                        <th className="px-3 py-2.5">Rombel</th>
                        <th className="px-3 py-2.5">Komponen Biaya</th>
                        <th className="px-3 py-2.5 text-right">Nominal Bayar</th>
                        <th className="px-3 py-2.5">Metode / Kas</th>
                        <th className="px-3 py-2.5 text-center">Status Koreksi</th>
                        <th className="px-3 py-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredHistory.map((p, pIdx) => (
                        <tr key={`payment-hist-${p.id}-${pIdx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2.5 text-slate-600 tnum">{p.paid_at_formatted || String(p.paid_at).slice(0, 10)}</td>
                          <td className="px-3 py-2.5">
                            <span className="tnum font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                              {p.receipt_number || `ID #${p.id}`}
                            </span>
                            {p.is_legacy ? (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                  <History className="w-2.5 h-2.5 text-amber-700" /> Riwayat (Non-Kas)
                                </span>
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-800">{p.student_name}</div>
                            <div className="text-[10px] text-slate-400">NIS: {p.nis || '-'}</div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 font-semibold">{p.class_name || '-'}</td>
                          <td className="px-3 py-2.5">
                            <FeeTypeBadge item={p} />
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-700 text-sm num-cell">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-700 capitalize">
                              {p.is_legacy ? 'Riwayat / Non-Kas' : (p.payment_method === 'bank_transfer' ? 'Non-Tunai' : p.payment_method)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {p.is_legacy ? (p.historical_cash_note || 'Tanpa Mutasi Kas') : (p.cash_account_name || 'Kasir')}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {p.previous_data ? (
                              <span
                                title={`Alasan: ${p.correction_reason || '-'}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold cursor-help"
                              >
                                <Info className="w-3 h-3 text-amber-600" /> Terkoreksi
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleViewAndPrintReceipt(p.id, true)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Cetak Kwitansi di Tab Baru"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                                <span>Cetak</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleViewAndPrintReceipt(p.id, false)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Lihat Rincian Pembayaran"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(p)}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg cursor-pointer"
                                title="Edit & Koreksi Pembayaran (Wajib Alasan)"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 1.3: VERIFIKASI BUKTI TRANSFER ORANG TUA               */}
          {/* ============================================================== */}
          {receiptSubTab === 'proofs' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Antrean Verifikasi Bukti Bayar Transfer</h2>
                  <p className="text-xs text-slate-400">Verifikasi setoran bank orang tua, alokasikan pos tagihan, & terbitkan kwitansi resmi</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                  {['all', 'pending', 'verified', 'rejected'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setProofFilter(st)}
                      className={`px-3 py-1 rounded-md capitalize transition-colors cursor-pointer ${
                        proofFilter === st ? 'bg-white font-bold text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st === 'all' ? 'Semua' : st === 'pending' ? 'Menunggu' : st === 'verified' ? 'Terverifikasi' : 'Ditolak'}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Memuat antrean transfer...</div>
              ) : proofs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">Tidak ada bukti transfer dalam status ini.</div>
              ) : (
                <div className="table-container">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 z-10 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Tgl Upload</th>
                        <th className="px-3 py-2.5">Nama Siswa</th>
                        <th className="px-3 py-2.5">Bank Pengirim</th>
                        <th className="px-3 py-2.5 text-right">Nominal Transfer</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                        <th className="px-3 py-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {proofs
                        .filter((p) => proofFilter === 'all' || p.status === proofFilter)
                        .map((p, pIdx) => (
                          <tr key={`proof-row-${p.id}-${pIdx}`} className="hover:bg-slate-50/80">
                            <td className="px-3 py-2.5 text-slate-600 tnum">{p.uploaded_at ? String(p.uploaded_at).slice(0, 10) : '-'}</td>
                            <td className="px-3 py-2.5 font-bold text-slate-800">{p.student_name || `Siswa ID ${p.student_id}`}</td>
                            <td className="px-3 py-2.5 text-slate-600">{p.source_bank || '-'} a.n. {p.account_holder_name || '-'}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-900 num-cell">{formatCurrency(p.total_transfer_amount || p.amount)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <StatusPill
                                variant={p.status === 'pending' ? 'warning' : p.status === 'verified' ? 'success' : 'danger'}
                                label={p.status === 'pending' ? 'Menunggu' : p.status === 'verified' ? 'Terverifikasi' : 'Ditolak'}
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewProof(p)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  title="Lihat Bukti Transfer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {p.status === 'verified' && p.bill_payment_id && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewAndPrintReceipt(p.bill_payment_id, true)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>Kwitansi</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PENERIMAAN LAINNYA (NON-SISWA & RAPBS)                  */}
      {/* ============================================================== */}
      {mainTab === 'other_income' && (
        <div className="space-y-4">
          {/* Header Card Penerimaan Lainnya */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 mt-0.5 border border-emerald-100">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    Pusat Penerimaan Kas Lainnya (Non-Siswa &amp; RAPBS)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                    Pencatatan seluruh penerimaan kas masuk selain pembayaran siswa (BOS, Subsidi/Hibah Yayasan, Donasi, Unit Usaha, Sewa, Jasa Giro, dll) yang terintegrasi langsung ke Mata Anggaran RAPBS, Jurnal Otomatis, dan Kantong Dana.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fetchOtherIncomeData()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Refresh Data Penerimaan"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingOtherIncome ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstCash = cashAccounts[0];
                    const isBankKind = firstCash?.account_kind === 'bank';
                    const defaultRule = transactionRules.find(r => r.transaction_code === 'other_income_general') || transactionRules.find(r => r.transaction_type === 'penambahan_kas');
                    setOtherIncomePaymentMethod(isBankKind ? 'bank_transfer' : 'cash');
                    setOtherIncomeForm({
                      payer_name: '',
                      notes: '',
                      amount: '',
                      received_at: new Date().toISOString().slice(0, 10),
                      source_category: 'other',
                      budget_plan_income_item_id: '',
                      cash_account_id: firstCash ? String(firstCash.id) : '',
                      bank_statement_id: '',
                      fund_balance_id: '',
                      use_default_accounting_rule: true,
                      transaction_mapping_id: defaultRule ? String(defaultRule.id) : '',
                      override_debit_account_id: firstCash?.account_id ? String(firstCash.account_id) : (defaultRule?.debit_account_id ? String(defaultRule.debit_account_id) : ''),
                      override_credit_account_id: defaultRule?.credit_account_id ? String(defaultRule.credit_account_id) : '',
                      override_reason: ''
                    });
                    setOtherIncomeModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Catat Penerimaan Baru</span>
                </button>
              </div>
            </div>

            {/* Macro KPI Cards: Kartu & Progress Penerimaan Lainnya (Di Bagian Paling Atas) */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Target Rencana RAPBS Non-Siswa */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-indigo-50/50 to-blue-100/60 border border-indigo-200 text-indigo-950 shadow-xs relative overflow-hidden group hover:shadow-md hover:scale-[1.01] transition-all">
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                    Rencana RAPBS Non-Siswa
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2 text-lg lg:text-xl font-black text-indigo-950 tracking-tight relative z-10 truncate" title={formatCurrency(rapbsSourcesData.summary?.total_planned_rapbs || 0)}>
                  {formatCurrency(rapbsSourcesData.summary?.total_planned_rapbs || 0)}
                </div>
                <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-indigo-700 font-medium">
                  <span>Target Anggaran RAPBS</span>
                  <span className="font-bold">{rapbsSources.length} pos terdaftar</span>
                </div>
              </div>

              {/* Card 2: Total Realisasi Diterima (Pos RAPBS) + Progress Bar */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-50 to-teal-100/70 border border-emerald-300 text-emerald-950 shadow-xs relative overflow-hidden group hover:shadow-md hover:scale-[1.01] transition-all">
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                    Realisasi RAPBS Masuk
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                      {rapbsSourcesData.summary?.realization_percentage || 0}%
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-lg lg:text-xl font-black text-emerald-950 tracking-tight relative z-10 truncate" title={formatCurrency(rapbsSourcesData.summary?.total_realized_rapbs || 0)}>
                  {formatCurrency(rapbsSourcesData.summary?.total_realized_rapbs || 0)}
                </div>
                {/* Progress Bar */}
                <div className="mt-2 w-full bg-emerald-200/80 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, rapbsSourcesData.summary?.realization_percentage || 0)}%` }}
                  />
                </div>
                <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                  <span>Tercapai dari target RAPBS</span>
                  <span className="font-bold">
                    Sisa: {formatCurrency(rapbsSourcesData.summary?.total_remaining_rapbs || 0)}
                  </span>
                </div>
              </div>

              {/* Card 3: Penerimaan di Luar Rencana RAPBS */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500/20 via-sky-50 to-cyan-100/70 border border-sky-300 text-sky-950 shadow-xs relative overflow-hidden group hover:shadow-md hover:scale-[1.01] transition-all">
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-900">
                    Di Luar Rencana RAPBS
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/30 shrink-0">
                    <Info className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2 text-lg lg:text-xl font-black text-sky-950 tracking-tight relative z-10 truncate" title={formatCurrency(rapbsSourcesData.summary?.total_unbudgeted_income || 0)}>
                  {formatCurrency(rapbsSourcesData.summary?.total_unbudgeted_income || 0)}
                </div>
                <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-sky-800 font-medium">
                  <span>Penerimaan Langsung / Umum</span>
                  <span className="font-bold">{rapbsSourcesData.summary?.unbudgeted_count || 0} transaksi</span>
                </div>
              </div>

              {/* Card 4: Total Seluruh Kas Masuk Non-Siswa */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border border-emerald-800/60 text-white shadow-xs relative overflow-hidden group hover:shadow-md hover:scale-[1.01] transition-all">
                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all pointer-events-none" />
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    Total Kas Non-Siswa
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2 text-lg lg:text-xl font-black text-white tracking-tight relative z-10 truncate" title={formatCurrency(rapbsSourcesData.summary?.total_all_other_income || 0)}>
                  {formatCurrency(rapbsSourcesData.summary?.total_all_other_income || 0)}
                </div>
                <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-emerald-200/80 font-medium">
                  <span>Akumulasi Seluruh Kas Masuk</span>
                  <span className="font-bold text-emerald-300">{rapbsSourcesData.summary?.total_transactions_count || 0} total transaksi</span>
                </div>
              </div>
            </div>

            {/* Pos Anggaran RAPBS Non-Siswa Breakdown (Jika ada) */}
            {rapbsSources.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Daftar Pos Mata Anggaran RAPBS Non-Siswa &amp; Progres Realisasi</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (Pos anggaran yang tidak terkait penetapan biaya santri)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rapbsSources.map((src) => (
                    <div key={src.id} className="p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-800 text-xs line-clamp-1" title={src.name}>
                            {src.name}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="font-semibold text-slate-700">Akun:</span> {src.credit_account_name || 'Pendapatan'}
                          </span>
                        </div>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                          src.realization_percentage >= 100
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {src.realization_percentage}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            src.realization_percentage >= 100 ? 'bg-emerald-600' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.min(100, src.realization_percentage || 0)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>Pagu: <strong className="text-slate-700">{formatCurrency(src.planned_amount)}</strong></span>
                        <span>Masuk: <strong className="text-emerald-700">{formatCurrency(src.total_realized)}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Toolbar Riwayat Penerimaan Lainnya */}
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-emerald-600" />
                    <span>Daftar Riwayat Penerimaan Kas Lainnya</span>
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold">
                    {otherIncomesList.length} data
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {/* Filter Kategori */}
                  <select
                    value={otherIncomeCategoryFilter}
                    onChange={(e) => setOtherIncomeCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <option value="all">Semua Kategori Sumber</option>
                    <option value="bos_government">BOS / Pemerintah</option>
                    <option value="grant_foundation">Subsidi / Hibah Yayasan</option>
                    <option value="donation_waqf">Donasi / Infaq / Wakaf</option>
                    <option value="business_unit">Unit Usaha / Kantin</option>
                    <option value="facility_rental">Sewa Fasilitas / Gedung</option>
                    <option value="bank_interest">Jasa Giro / Bank</option>
                    <option value="other">Penerimaan Lain-Lain</option>
                  </select>

                  {/* Filter Pos RAPBS */}
                  <select
                    value={otherIncomeRapbsFilter}
                    onChange={(e) => setOtherIncomeRapbsFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 max-w-[200px] truncate"
                  >
                    <option value="all">Semua Pos Anggaran</option>
                    <option value="unbudgeted">Di Luar Rencana RAPBS</option>
                    {rapbsSources.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  {/* Filter Rekening Kas */}
                  <select
                    value={otherIncomeCashFilter}
                    onChange={(e) => setOtherIncomeCashFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 max-w-[180px] truncate"
                  >
                    <option value="all">Semua Rekening Kas/Bank</option>
                    {cashAccounts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Baris Filter Rentang Tanggal & Search */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
                {/* Search Bar */}
                <div className="lg:col-span-6 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={otherIncomeSearch}
                    onChange={(e) => setOtherIncomeSearch(e.target.value)}
                    placeholder="Cari no. kwitansi, uraian, penyetor, pos anggaran..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white transition"
                  />
                  {otherIncomeSearch && (
                    <button
                      type="button"
                      onClick={() => setOtherIncomeSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Datepicker Mulai */}
                <div className="lg:col-span-3">
                  <DatePickerField
                    value={otherIncomeStartDate}
                    onChange={(val) => setOtherIncomeStartDate(val)}
                    placeholder="Tgl Awal (DD/MM/YYYY)"
                  />
                </div>

                {/* Datepicker Selesai */}
                <div className="lg:col-span-3 flex items-center gap-2">
                  <div className="flex-1">
                    <DatePickerField
                      value={otherIncomeEndDate}
                      onChange={(val) => setOtherIncomeEndDate(val)}
                      placeholder="Tgl Akhir (DD/MM/YYYY)"
                    />
                  </div>
                  {(otherIncomeStartDate || otherIncomeEndDate || otherIncomeCategoryFilter !== 'all' || otherIncomeRapbsFilter !== 'all' || otherIncomeCashFilter !== 'all' || otherIncomeSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setOtherIncomeSearch('');
                        setOtherIncomeCategoryFilter('all');
                        setOtherIncomeRapbsFilter('all');
                        setOtherIncomeCashFilter('all');
                        setOtherIncomeStartDate('');
                        setOtherIncomeEndDate('');
                      }}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 border border-rose-200"
                      title="Reset Filter"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabel Riwayat Penerimaan Kas Lainnya */}
            <div className="mt-4">
              {loadingOtherIncome ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span>Memuat riwayat penerimaan kas lainnya...</span>
                </div>
              ) : otherIncomesList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <Coins className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">Belum ada data penerimaan kas lainnya.</p>
                  <p className="text-[11px] text-slate-400">Klik tombol "Catat Penerimaan Baru" di atas untuk mencatat penerimaan non-siswa.</p>
                </div>
              ) : (
                <div className="table-container border border-slate-200/80 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 z-10 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-3">No. BKM / Tgl</th>
                        <th className="px-3.5 py-3">Uraian &amp; Penyetor</th>
                        <th className="px-3.5 py-3">Pos RAPBS / Kategori</th>
                        <th className="px-3.5 py-3">Rekening Kas &amp; Dana</th>
                        <th className="px-3.5 py-3">Akun Akuntansi</th>
                        <th className="px-3.5 py-3 text-right">Nominal (Rp)</th>
                        <th className="px-3.5 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {otherIncomesList.map((inc, incIdx) => {
                        const isBOS = inc.source_category === 'bos_government';
                        const isYayasan = inc.source_category === 'grant_foundation';
                        const isDonation = inc.source_category === 'donation_waqf';
                        const isBusiness = inc.source_category === 'business_unit';

                        return (
                          <tr key={`other-inc-row-${inc.id}-${incIdx}`} className="hover:bg-slate-50/80 transition-colors">
                            {/* No Kwitansi & Tanggal */}
                            <td className="px-3.5 py-3 text-slate-700 tnum">
                              <span className="font-bold text-slate-900 font-mono block text-[11px]">
                                {inc.receipt_number || `BKM-${inc.id}`}
                              </span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {formatDateToDMY(inc.received_at)}
                              </span>
                            </td>

                            {/* Uraian & Penyetor */}
                            <td className="px-3.5 py-3">
                              <span className="font-bold text-slate-900 block line-clamp-1" title={inc.notes}>
                                {inc.notes || 'Penerimaan Kas'}
                              </span>
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <span className="font-semibold text-slate-700">Dari:</span> {inc.payer_name || 'Hamba Allah / Umum'}
                              </span>
                            </td>

                            {/* Pos RAPBS & Kategori */}
                            <td className="px-3.5 py-3">
                              {inc.budget_income_name ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  <Layers className="w-3 h-3 text-indigo-600" />
                                  <span className="truncate max-w-[140px]">{inc.budget_income_name}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  Di Luar RAPBS
                                </span>
                              )}
                              <span className="block text-[10px] text-slate-400 mt-1 capitalize">
                                {isBOS ? 'BOS / Pemerintah' : isYayasan ? 'Subsidi Yayasan' : isDonation ? 'Donasi / Infaq' : isBusiness ? 'Unit Usaha' : (inc.category_name || 'Penerimaan Umum')}
                              </span>
                            </td>

                            {/* Kas & Kantong Dana */}
                            <td className="px-3.5 py-3">
                              <span className="font-semibold text-slate-800 block text-xs">
                                {inc.cash_account_name || 'Kasir Loket'}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {inc.fund_balance_type ? `Kantong: ${inc.fund_balance_type}` : 'Kas Penampung'}
                              </span>
                              {inc.bank_statement_id ? (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9.5px] font-bold border border-emerald-200" title={inc.bank_statement_desc || 'Mutasi Rekening Koran'}>
                                  <span>🔗 RK Masuk</span>
                                  {inc.bank_statement_ref ? <span className="font-mono">({inc.bank_statement_ref})</span> : ''}
                                </span>
                              ) : null}
                            </td>

                            {/* Akun Akuntansi */}
                            <td className="px-3.5 py-3">
                              <span className="font-medium text-slate-700 block text-[11px]">
                                {inc.credit_account_name ? `${inc.credit_account_code ? inc.credit_account_code + ' ' : ''}${inc.credit_account_name}` : '60800 Pendapatan Lain-lain'}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[160px]">
                                {inc.rule_label || 'Kas Masuk Default'}
                              </span>
                            </td>

                            {/* Nominal */}
                            <td className="px-3.5 py-3 text-right font-black text-emerald-700 text-sm num-cell">
                              {formatCurrency(inc.amount)}
                            </td>

                            {/* Aksi */}
                            <td className="px-3.5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Lihat Detail */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOtherIncomeForDetail(inc);
                                    setDetailOtherIncomeModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title="Lihat Detail Transaksi & Jurnal"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Edit / Koreksi */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOtherIncomeForEdit(inc);
                                    const matchedCash = cashAccounts.find(a => String(a.id) === String(inc.cash_account_id));
                                    const isBankKind = Boolean(inc.bank_statement_id || matchedCash?.account_kind === 'bank');
                                    setEditOtherIncomePaymentMethod(isBankKind ? 'bank_transfer' : 'cash');
                                    setEditOtherIncomeForm({
                                      id: inc.id,
                                      receipt_number: inc.receipt_number || `BKM-${inc.id}`,
                                      payer_name: inc.payer_name || '',
                                      notes: inc.notes || '',
                                      amount: String(inc.amount || ''),
                                      received_at: inc.received_at ? String(inc.received_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
                                      source_category: inc.source_category || 'other',
                                      budget_plan_income_item_id: inc.budget_plan_income_item_id ? String(inc.budget_plan_income_item_id) : '',
                                      cash_account_id: inc.cash_account_id ? String(inc.cash_account_id) : '',
                                      bank_statement_id: inc.bank_statement_id ? String(inc.bank_statement_id) : '',
                                      fund_balance_id: inc.fund_balance_id ? String(inc.fund_balance_id) : '',
                                      use_default_accounting_rule: true,
                                      transaction_mapping_id: inc.transaction_mapping_id ? String(inc.transaction_mapping_id) : '',
                                      override_debit_account_id: inc.debit_account_id ? String(inc.debit_account_id) : (matchedCash?.account_id ? String(matchedCash.account_id) : ''),
                                      override_credit_account_id: inc.credit_account_id ? String(inc.credit_account_id) : '',
                                      override_reason: inc.override_reason || ''
                                    });
                                    setEditOtherIncomeModalOpen(true);
                                  }}
                                  className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                  title="Edit / Koreksi Penerimaan"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                {/* Cetak Kwitansi */}
                                <button
                                  type="button"
                                  onClick={() => openOtherIncomeReceiptInNewTab(inc, activeSchoolUnit?.name)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                  title="Cetak Kwitansi Bukti Kas Masuk (BKM)"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: REKAPITULASI KAS MASUK GABUNGAN                         */}
      {/* ============================================================== */}
      {mainTab === 'daily_inflows' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-3.5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800">Buku Kas & Rekapitulasi Penerimaan Gabungan</h2>
            <p className="text-xs text-slate-400">Timeline arus kas masuk terpadu dari seluruh kanal penerimaan sekolah</p>
          </div>

          {/* Macro KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Total Kas Masuk */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/60 text-white shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Total Kas Masuk</div>
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-white tracking-tight relative z-10 truncate" title={formatCurrency(inflowsData.summary?.total_amount)}>
                {formatCurrency(inflowsData.summary?.total_amount)}
              </div>
              <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-indigo-200/80 font-medium">
                <span>{formatNumber(inflowsData.summary?.total_records || 0)} transaksi penerimaan</span>
              </div>
            </div>

            {/* Card 2: Penerimaan Siswa */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-50 to-teal-100/70 border border-emerald-300 text-emerald-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Penerimaan Siswa</div>
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-emerald-950 tracking-tight relative z-10 truncate" title={formatCurrency(inflowsData.summary?.student_amount)}>
                {formatCurrency(inflowsData.summary?.student_amount)}
              </div>
              <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                <span>SPP &amp; Biaya Pendidikan</span>
              </div>
            </div>

            {/* Card 3: Penerimaan PPDB */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500/20 via-sky-50 to-cyan-100/70 border border-sky-300 text-sky-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-sky-500/20 rounded-full blur-xl group-hover:bg-sky-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-900">Penerimaan PPDB</div>
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-sky-950 tracking-tight relative z-10 truncate" title={formatCurrency(inflowsData.summary?.ppdb_amount)}>
                {formatCurrency(inflowsData.summary?.ppdb_amount)}
              </div>
              <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-sky-800 font-medium">
                <span>Calon Murid Baru</span>
              </div>
            </div>

            {/* Card 4: Sumber Lain (RAPBS) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/20 via-purple-50 to-pink-100/70 border border-purple-300 text-purple-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-900">Sumber Lain (RAPBS)</div>
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <Coins className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-purple-950 tracking-tight relative z-10 truncate" title={formatCurrency(inflowsData.summary?.other_amount)}>
                {formatCurrency(inflowsData.summary?.other_amount)}
              </div>
              <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-purple-800 font-medium">
                <span>Subsidi, BOS &amp; Non-SPP</span>
              </div>
            </div>
          </div>

          {/* Filter Timeline Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
            <div>
              <DatePickerField
                label="Tanggal Mulai"
                value={inflowStartDate}
                onChange={(iso) => setInflowStartDate(iso)}
                placeholder="DD/MM/YYYY"
                inputClassName="bg-white"
              />
            </div>
            <div>
              <DatePickerField
                label="Tanggal Selesai"
                value={inflowEndDate}
                onChange={(iso) => setInflowEndDate(iso)}
                placeholder="DD/MM/YYYY"
                inputClassName="bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kategori Kanal</label>
              <select
                value={inflowCategoryFilter}
                onChange={(e) => setInflowCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
              >
                <option value="all">Semua Penerimaan</option>
                <option value="student">Siswa Aktif</option>
                <option value="ppdb">Calon Murid PPDB</option>
                <option value="other">Sumber Lain (RAPBS)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pencarian</label>
              <input
                type="text"
                placeholder="Cari kwitansi / penyetor..."
                value={inflowSearch}
                onChange={(e) => setInflowSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAllInflowsData()}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Timeline Table */}
          {loadingInflows ? (
            <div className="py-12 text-center text-slate-400 text-xs">Memuat rekapitulasi kas masuk...</div>
          ) : (inflowsData.inflows || []).length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">Tidak ada transaksi penerimaan pada rentang tanggal ini.</div>
          ) : (
            <div className="table-container">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Tanggal</th>
                    <th className="px-3 py-2.5">No. Kwitansi</th>
                    <th className="px-3 py-2.5">Kanal Penerimaan</th>
                    <th className="px-3 py-2.5">Penyetor / Siswa</th>
                    <th className="px-3 py-2.5">Keterangan</th>
                    <th className="px-3 py-2.5">Akun Kas Masuk</th>
                    <th className="px-3 py-2.5 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {inflowsData.inflows.map((row, rIdx) => (
                    <tr key={`inflow-row-${row.source_type || 'src'}-${row.id}-${rIdx}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-slate-600 tnum">{row.transaction_date}</td>
                      <td className="px-3 py-2.5 tnum font-bold text-slate-700">{row.receipt_number || '-'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.source_type === 'student_bill_payment'
                            ? 'bg-indigo-100 text-indigo-800'
                            : row.source_type === 'ppdb_registration_payment'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {row.category_label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-800">{row.payer_info}</td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">{row.description}</td>
                      <td className="px-3 py-2.5 text-slate-600">{row.cash_account_name}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900 num-cell">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CATAT PEMBAYARAN SISWA TERPADU                        */}
      {/* ============================================================== */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-6xl xl:max-w-7xl w-full my-auto shadow-xl border border-slate-200 p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-800 text-base">Pencatatan Pembayaran Tagihan Siswa</h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      Tahun Ajaran: {activeAyObj?.name || 'Semua'}
                      {activeAyObj?.is_active ? (
                        <span className="ml-1 px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[10px] font-semibold">Aktif</span>
                      ) : (
                        <span className="ml-1 px-1.5 py-0.2 bg-slate-500 text-white rounded text-[10px] font-semibold">Arsip</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Konteks Tahun Ajaran: <strong>T.A. {activeAyObj?.name || '-'}</strong> &bull; Memuat tagihan berjalan dan tunggakan tahun sebelumnya yang belum lunas (tagihan tahun setelahnya tidak ditampilkan).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseRecordModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Baris 1: Pilihan Siswa (Mendukung Multi-Siswa / Saudara dalam 1 Kwitansi & 1 Rekening Koran) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Nama Siswa <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    💡 1 Rekening Koran / Transfer untuk &gt;1 Anak tetap diterbitkan <strong>1 Kwitansi Resmi</strong>
                  </span>
                </div>

                {/* Chips Siswa yang Dipilih */}
                {selectedStudentIds.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {selectedStudentIds.map((sid, idx) => {
                      const sObj = allStudents.find(s => String(s.id) === String(sid));
                      const sName = sObj?.name || `Siswa #${sid}`;
                      const sNis = sObj?.nis || '-';
                      const sClass = sObj?.class_name || '';
                      return (
                        <span
                          key={sid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-indigo-200 text-indigo-950 rounded-lg text-xs font-semibold shadow-2xs"
                        >
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span>{sName}</span>
                          {sNis !== '-' && <span className="text-[10px] text-slate-400">({sNis})</span>}
                          {sClass && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">{sClass}</span>}
                          {selectedStudentIds.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStudent(sid)}
                              className="ml-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Hapus siswa dari transaksi ini"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown Tambah Siswa */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <div className="md:col-span-8">
                    <SearchableSelect
                      options={studentSelectOptions.filter(opt => !selectedStudentIds.includes(opt.value))}
                      value=""
                      onChange={(val) => {
                        if (val) handleAddAdditionalStudent(val);
                      }}
                      placeholder="+ Tambah Siswa Lain / Saudara Kandung (1 Kwitansi Gabungan) --"
                      searchPlaceholder="Ketik nama siswa atau NIS..."
                      accentColor="indigo"
                      allowClear={false}
                    />
                  </div>
                  <div className="md:col-span-4 text-[11px] text-slate-500 italic">
                    {selectedStudentIds.length === 0 ? 'Pilih siswa terlebih dahulu.' : selectedStudentIds.length === 1 ? '1 Siswa Terpilih. Tambah saudara jika ada.' : `${selectedStudentIds.length} Siswa Terpilih (Kwitansi Gabungan).`}
                  </div>
                </div>
              </div>

              {/* Baris 2: Tanggal & Total Nominal Bayar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <DatePickerField
                    label="Tanggal Pembayaran *"
                    value={paymentDate}
                    onChange={(iso) => {
                      setPaymentDate(iso);
                      if (paymentMethodType === 'bank_transfer' && targetCashAccountId) {
                        fetchBankStatements(targetCashAccountId, iso, bankStatementId);
                      }
                    }}
                    placeholder="DD/MM/YYYY"
                    required={true}
                    inputClassName="bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Total Nominal Diterima (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={paymentTotalAmount}
                    onChange={(e) => setPaymentTotalAmount(e.target.value)}
                    placeholder="Contoh: 500000"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg tnum font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {parseFloat(paymentTotalAmount) > 0 && (
                    <div className="text-[10.5px] text-indigo-700 font-medium bg-indigo-50/90 px-2.5 py-1 rounded-lg border border-indigo-200/80 italic leading-snug">
                      # {terbilang(parseFloat(paymentTotalAmount))} Rupiah #
                    </div>
                  )}
                  {paymentMethodType === 'bank_transfer' && bankStatementId && (
                    <StatementMatchIndicator
                      inputAmount={paymentTotalAmount}
                      statement={bankStatementsOptions.find(o => String(o.value) === String(bankStatementId))}
                      onSyncAmount={(amt) => setPaymentTotalAmount(String(amt))}
                      isCompact={true}
                    />
                  )}
                </div>
              </div>

              {/* Opsi Pencatatan Riwayat Saja (Non-Kas) */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                isHistoricalOnly 
                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/25 shadow-xs' 
                  : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isHistoricalOnly}
                    onChange={(e) => setIsHistoricalOnly(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <History className={`w-3.5 h-3.5 ${isHistoricalOnly ? 'text-amber-600' : 'text-slate-500'}`} />
                        Catat Sebagai Riwayat Saja (Non-Kas / Tanpa Mutasi Saldo)
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isHistoricalOnly 
                          ? 'bg-amber-200 text-amber-900 border border-amber-300' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isHistoricalOnly ? '⚡ Mode Riwayat Saja Aktif' : 'Normal (Mutasi Kas Aktif)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Centang opsi ini jika pembayaran telah diselesaikan di masa lalu dan transaksi ini hanya untuk <strong>mencatat riwayat pelunasan tagihan siswa</strong> tanpa memengaruhi saldo buku kas/bank dan tanpa membukukan jurnal penerimaan baru.
                    </p>
                  </div>
                </label>
              </div>

              {/* Baris 3: Metode Bayar & Akun Kas */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                {isHistoricalOnly ? (
                  <div className="p-2.5 bg-amber-100/70 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-medium flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Mode Riwayat Saja: Pembayaran ini akan melunasi tagihan siswa tanpa memengaruhi saldo akun kas/bank dan tanpa mutasi jurnal buku kas berjalan.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-bold text-slate-700">Metode Pembayaran:</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethodType === 'cash'}
                          onChange={() => {
                            setPaymentMethodType('cash');
                            const currentAcc = cashAccounts.find(a => String(a.id) === String(targetCashAccountId));
                            if (!currentAcc || currentAcc.account_kind !== 'cash') {
                              const defaultCash = cashAccounts.find(a => a.account_kind === 'cash' && a.is_active) ||
                                                  cashAccounts.find(a => a.account_kind === 'cash') ||
                                                  cashAccounts.find(a => a.name?.toLowerCase().includes('tunai') || a.name?.toLowerCase().includes('kas'));
                              if (defaultCash) {
                                setTargetCashAccountId(String(defaultCash.id));
                              }
                            }
                          }}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Tunai (Kasir Loket)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethodType === 'bank_transfer'}
                          onChange={() => {
                            setPaymentMethodType('bank_transfer');
                            const currentAcc = cashAccounts.find(a => String(a.id) === String(targetCashAccountId));
                            if (!currentAcc || currentAcc.account_kind !== 'bank') {
                              const defaultBank = cashAccounts.find(a => a.account_kind === 'bank' && a.name?.toLowerCase().includes('penerimaan')) ||
                                                  cashAccounts.find(a => a.account_kind === 'bank' && a.is_active) ||
                                                  cashAccounts.find(a => a.account_kind === 'bank');
                              if (defaultBank) {
                                setTargetCashAccountId(String(defaultBank.id));
                              }
                            }
                          }}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Non-Tunai (Transfer Bank)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Dropdowns jika Non-Tunai / Tunai */}
                {!isHistoricalOnly && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Akun Kas / Bank Tujuan <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        options={targetCashAccountOptions}
                        value={targetCashAccountId}
                        onChange={(val) => setTargetCashAccountId(val)}
                        placeholder="-- Pilih Akun Kas / Bank --"
                        searchPlaceholder="Cari nama akun kas / bank..."
                        accentColor="indigo"
                        allowClear={false}
                      />
                    </div>

                    {/* Referensi Rekening Koran */}
                    {paymentMethodType === 'bank_transfer' && (
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                          <span>Referensi Mutasi Rekening Koran</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Multi-Transaksi / Parsial OK)</span>
                        </label>
                        <SearchableSelect
                          options={bankStatementsOptions}
                          value={bankStatementId}
                          onChange={(val) => {
                            setBankStatementId(val || '');
                            if (val) {
                              const selectedOpt = bankStatementsOptions.find(o => String(o.value) === String(val));
                              if (selectedOpt) {
                                const curTotal = parseFloat(paymentTotalAmount) || 0;
                                const fillAmount = selectedOpt.remaining_amount !== undefined ? selectedOpt.remaining_amount : selectedOpt.amount;
                                if (curTotal <= 0 && fillAmount > 0) {
                                  setPaymentTotalAmount(String(fillAmount));
                                }
                                // Auto-sinkronkan tanggal pembayaran dengan tanggal mutasi rekening koran
                                if (selectedOpt.rawDate) {
                                  setPaymentDate(selectedOpt.rawDate);
                                }
                              }
                            }
                          }}
                          onDisabledSelect={(opt) => setBlockedStatementModal(opt)}
                          placeholder="-- Pilih Rekening Koran Terkait --"
                          searchPlaceholder="Ketik nominal, no. ref, atau uraian transaksi RK..."
                          accentColor="emerald"
                          allowClear={true}
                          isLoading={loadingBankStatements}
                          emptyText="Tidak ada mutasi kredit rekening koran untuk akun bank ini"
                        />
                        {(() => {
                          const selectedOpt = bankStatementsOptions.find(o => String(o.value) === String(bankStatementId));
                          if (!selectedOpt) return null;
                          return (
                            <div className="p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[10.5px] space-y-2 text-slate-700 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between font-semibold gap-2">
                                <span className="text-emerald-900 font-bold flex items-center gap-1 min-w-0">
                                  <span>🔗 RK Terpilih:</span>
                                  <span className="truncate">{selectedOpt.desc}</span>
                                </span>
                                <span className="tnum text-emerald-800 font-bold shrink-0">
                                  Plafon: {formatCurrency(selectedOpt.amount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-500 text-[10px] gap-2">
                                <span>Tgl Mutasi Bank: <b className="text-slate-800 tnum">{selectedOpt.rawDate || '-'}</b> {selectedOpt.refNo ? `• Ref: ${selectedOpt.refNo}` : ''} • Teralokasi: <b>{formatCurrency(selectedOpt.allocated_amount || 0)}</b></span>
                                <span className="text-emerald-700 font-bold tnum shrink-0">
                                  Sisa Plafon: {formatCurrency(selectedOpt.remaining_amount || selectedOpt.amount)}
                                </span>
                              </div>
                              <StatementMatchIndicator
                                inputAmount={paymentTotalAmount}
                                statement={selectedOpt}
                                onSyncAmount={(amt) => setPaymentTotalAmount(String(amt))}
                                isCompact={false}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Baris 4: Tabel Rincian Alokasi Tagihan Siswa */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Rincian Alokasi Tagihan Siswa Terkait:
                    </label>
                    {studentBillsForRecord.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {recordBillsSearch.trim()
                          ? `${filteredStudentBillsForRecord.length} dari ${studentBillsForRecord.length} Tagihan`
                          : `${studentBillsForRecord.length} Tagihan`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {studentBillsForRecord.length > 0 && (
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={recordBillsSearch}
                          onChange={(e) => setRecordBillsSearch(e.target.value)}
                          placeholder="Cari pos, bulan, T.A, nama..."
                          className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 placeholder:text-slate-400"
                        />
                        {recordBillsSearch && (
                          <button
                            type="button"
                            onClick={() => setRecordBillsSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                            title="Bersihkan pencarian"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {studentBillsForRecord.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoAllocateFifo}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs whitespace-nowrap"
                      >
                        <span>⚡ Alokasikan Otomatis (FIFO)</span>
                      </button>
                    )}
                  </div>
                </div>

                {loadingStudentBills ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5 bg-slate-50 rounded-xl border border-slate-200">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    <span>Memuat daftar tagihan siswa...</span>
                  </div>
                ) : !selectedStudentId ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Silakan pilih siswa di atas untuk melihat daftar tagihan yang belum lunas.
                  </div>
                ) : studentBillsForRecord.length === 0 ? (
                  <div className="p-8 text-center text-emerald-700 text-xs font-semibold bg-emerald-50 rounded-xl border border-emerald-200">
                    Siswa ini tidak memiliki tagihan aktif yang belum lunas.
                  </div>
                ) : filteredStudentBillsForRecord.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
                    <Search className="w-7 h-7 text-slate-300" />
                    <p className="text-xs text-slate-500 font-medium">
                      Tidak ada tagihan yang cocok dengan kata kunci <span className="font-bold text-slate-700">"{recordBillsSearch}"</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setRecordBillsSearch('')}
                      className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-indigo-600 shadow-2xs cursor-pointer transition"
                    >
                      Reset Filter Pencarian
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[960px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="px-3 py-2.5" style={{ minWidth: '170px' }}>Komponen Tagihan</th>
                          <th className="px-3 py-2.5" style={{ minWidth: '280px' }}>Aturan Transaksi (Jurnal)</th>
                          <th className="px-2.5 py-2.5 text-center" style={{ width: '70px' }}>Diskon</th>
                          <th className="px-3 py-2.5 text-right" style={{ minWidth: '120px' }}>Tagihan</th>
                          <th className="px-3 py-2.5 text-right">Sudah Bayar</th>
                          <th className="px-3 py-2.5 text-right">Sisa Piutang</th>
                          <th className="px-3 py-2.5 text-right" style={{ width: '190px', minWidth: '180px' }}>Bayar Sekarang (Rp)</th>
                          <th className="px-3 py-2.5 text-right">Sisa Setelah Bayar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudentBillsForRecord.map((bill, bIdx) => {
                          const billTotal = parseFloat(bill.amount || 0);
                          const billPaid = parseFloat(bill.total_paid || 0);
                          const discInfo = getBillDiscountInfo(bill);
                          const allocated = parseFloat(billAllocations[bill.id] || 0);
                          const remAfter = Math.max(0, discInfo.effectiveRem - allocated);
                          const cfg = getBillAccountingConfig(bill);

                          return (
                            <tr key={`rec-bill-row-${bill.id}-${bIdx}`} className={`hover:bg-slate-50 transition ${discInfo.enabled ? 'bg-emerald-50/20' : ''}`}>
                              {/* 1. Komponen Tagihan */}
                              <td className="px-3 py-2.5 align-top">
                                <div className="flex flex-col gap-1">
                                  {selectedStudentIds.length > 1 && (
                                    <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      👤 {bill.student_name || `Siswa #${bill.student_id}`} {bill.nis && bill.nis !== '-' ? `(${bill.nis})` : ''}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <FeeTypeBadge item={bill} />
                                    {bill.academic_year_name && (() => {
                                      const curAy = activeAyObj?.name || '';
                                      const bAy = bill.academic_year_name || '';
                                      const isDiff = curAy && bAy && curAy !== bAy;
                                      const isPast = isDiff && bAy < curAy;
                                      const isFuture = isDiff && bAy > curAy;

                                      return (
                                        <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                          isPast
                                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                            : isFuture
                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        }`}>
                                          T.A. {bill.academic_year_name}
                                          {isPast && ' (Tunggakan)'}
                                        </span>
                                      );
                                    })()}
                                    {(bill.fee_type_code === 'arrears_previous_year' || bill.fee_type_name?.toLowerCase().includes('tunggakan')) && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                        Tunggakan TP Lalu
                                      </span>
                                    )}
                                  </div>
                                  {bill.period_display && (
                                    <span className="text-[10.5px] text-slate-500 font-medium">
                                      Periode: {bill.period_display}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 2. Aturan Transaksi (Jurnal) - Payment & Discount Rules */}
                              <td className="px-3 py-2.5 align-top">
                                {(() => {
                                  const ruleLabel = cfg.rule?.transaction_label || cfg.rule?.transaction_code || 'Aturan Pembayaran';
                                  const dCode = cfg.debitCoa ? `[${cfg.debitCoa.account_code || cfg.debitCoa.account_number || ''}] ${cfg.debitCoa.name || cfg.debitCoa.account_name || ''}` : 'Kas Penerimaan';
                                  const kCode = cfg.creditCoa ? `[${cfg.creditCoa.account_code || cfg.creditCoa.account_number || ''}] ${cfg.creditCoa.name || cfg.creditCoa.account_name || ''}` : 'Piutang';
                                  const dShort = cfg.debitCoa ? `${cfg.debitCoa.account_code || cfg.debitCoa.account_number || ''} ${cfg.debitCoa.account_name || cfg.debitCoa.name || ''}`.trim() : 'Kas';
                                  const kShort = cfg.creditCoa ? `${cfg.creditCoa.account_code || cfg.creditCoa.account_number || ''} ${cfg.creditCoa.account_name || cfg.creditCoa.name || ''}`.trim() : 'Piutang';
                                  const cashLabel = cfg.cashAcc?.name || (targetCashAccountId ? (cashAccounts.find(a => String(a.id) === String(targetCashAccountId))?.name || 'Kasir Default') : 'Kasir Default');
                                  const posBiayaLabel = cfg.feeTypeObj?.name || bill.fee_type_name || bill.component_display || 'Pos Alokasi Dana';

                                  // Discount Rule info
                                  const discRuleLabel = cfg.discountRule?.transaction_label || cfg.discountRule?.transaction_code || 'Aturan Diskon Siswa';
                                  const discDShort = cfg.discountDebitCoa ? `${cfg.discountDebitCoa.account_code || cfg.discountDebitCoa.account_number || ''} ${cfg.discountDebitCoa.account_name || cfg.discountDebitCoa.name || ''}`.trim() : 'Potongan Pendapatan Siswa';
                                  const discKShort = cfg.discountCreditCoa ? `${cfg.discountCreditCoa.account_code || cfg.discountCreditCoa.account_number || ''} ${cfg.discountCreditCoa.account_name || cfg.discountCreditCoa.name || ''}`.trim() : 'Piutang Siswa';

                                  return (
                                    <div className="flex flex-col gap-2 min-w-[270px] py-0.5">
                                      {/* Blok A: Aturan Pembayaran (Kas/Bank) */}
                                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/90 space-y-1.5">
                                        <div className="flex items-center justify-between gap-1.5">
                                          <div className="flex items-center gap-1 min-w-0">
                                            <span className="font-extrabold text-slate-800 text-[11px] truncate" title={ruleLabel}>
                                              💵 {ruleLabel}
                                            </span>
                                            {cfg.isCustomized ? (
                                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold rounded text-[8.5px] shrink-0">
                                                Custom
                                              </span>
                                            ) : (
                                              <span className="px-1.5 py-0.2 bg-slate-200/70 text-slate-600 rounded text-[8.5px] font-medium shrink-0">
                                                Default
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => openEditBillRuleModal(bill)}
                                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
                                            title="Ubah aturan transaksi pembayaran, diskon, akun debit/kredit, atau pos dana"
                                          >
                                            <Edit2 className="w-3 h-3 text-indigo-600" />
                                            <span>Edit</span>
                                          </button>
                                        </div>

                                        {/* Double Entry Kas */}
                                        <div className="flex flex-col gap-0.5 text-[9.5px] tnum bg-white p-1 rounded-md border border-slate-200">
                                          <div className="flex items-center gap-1 text-emerald-800 min-w-0">
                                            <span className="px-1 bg-emerald-100 text-emerald-800 font-bold rounded text-[8.5px] shrink-0 font-sans">D</span>
                                            <span className="font-semibold truncate">{dShort}</span>
                                          </div>
                                          <div className="flex items-center gap-1 text-indigo-800 min-w-0">
                                            <span className="px-1 bg-indigo-100 text-indigo-800 font-bold rounded text-[8.5px] shrink-0 font-sans">K</span>
                                            <span className="font-semibold truncate">{kShort}</span>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-1 text-[9px] leading-tight text-slate-500">
                                          <div className="truncate flex items-center gap-1 w-full" title={`Pos Dana: ${posBiayaLabel}`}>
                                            <span className="text-slate-400 font-bold shrink-0">Pos Dana:</span>
                                            <span className="font-semibold text-indigo-700 truncate">{posBiayaLabel}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Blok B: Aturan Diskon / Potongan (Non-Kas) */}
                                      {discInfo.enabled && (
                                        <div className="p-2 rounded-xl border bg-emerald-50/90 border-emerald-300 shadow-2xs animate-in fade-in duration-150">
                                          <div className="flex items-center justify-between gap-1 mb-1">
                                            <div className="flex items-center gap-1 min-w-0">
                                              <span className="font-black text-[10.5px] truncate text-emerald-950" title={discRuleLabel}>
                                                🏷️ {discRuleLabel}
                                              </span>
                                            </div>
                                            <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-black rounded text-[8.5px] shrink-0">
                                              Diskon Aktif
                                            </span>
                                          </div>

                                          <div className="flex flex-col gap-0.5 text-[9.5px] tnum bg-white/90 p-1 rounded-md border border-slate-200">
                                            <div className="flex items-center gap-1 text-emerald-800 min-w-0" title={`Debit Potongan: ${discDShort}`}>
                                              <span className="px-1 bg-emerald-100 text-emerald-800 font-bold rounded text-[8.5px] shrink-0 font-sans">D</span>
                                              <span className="font-semibold truncate">{discDShort}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-indigo-800 min-w-0" title={`Kredit Piutang: ${discKShort}`}>
                                              <span className="px-1 bg-indigo-100 text-indigo-800 font-bold rounded text-[8.5px] shrink-0 font-sans">K</span>
                                              <span className="font-semibold truncate">{discKShort}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* 3. Diskon Checkbox */}
                              <td className="px-2.5 py-2.5 align-top text-center">
                                <div className="pt-2">
                                  <label className="inline-flex flex-col items-center justify-center cursor-pointer p-1.5 rounded-xl hover:bg-emerald-100/60 transition group">
                                    <input
                                      type="checkbox"
                                      checked={discInfo.enabled}
                                      onChange={() => handleToggleDiscount(bill.id)}
                                      className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span className={`text-[9px] font-bold mt-1 transition ${discInfo.enabled ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                      {discInfo.enabled ? 'Aktif' : 'Diskon'}
                                    </span>
                                  </label>
                                </div>
                              </td>

                              {/* 4. Tagihan (Total) & Tagihan Setelah Diskon */}
                              <td className="px-3 py-2.5 align-top text-right num-cell">
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`font-bold ${discInfo.enabled && discInfo.discountAmount > 0 ? 'line-through text-slate-400 text-[11px]' : 'text-slate-800'}`}>
                                    {formatCurrency(billTotal)}
                                  </span>
                                  {discInfo.enabled && discInfo.discountAmount > 0 && (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                        Potongan: -{formatCurrency(discInfo.discountAmount)}
                                      </span>
                                      <div className="text-[11px] font-black text-indigo-950 bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-200">
                                        <span className="text-[9.5px] text-indigo-700 font-sans block font-semibold">Tagihan Bersih:</span>
                                        {formatCurrency(discInfo.netBill)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 5. Sudah Bayar */}
                              <td className="px-3 py-2.5 align-top text-right num-cell text-emerald-700 font-semibold">
                                {formatCurrency(billPaid)}
                              </td>

                              {/* 6. Sisa Piutang (Setelah Diskon) */}
                              <td className="px-3 py-2.5 align-top text-right num-cell font-bold text-rose-600">
                                <div className="flex flex-col items-end">
                                  <span>{formatCurrency(discInfo.effectiveRem)}</span>
                                  {discInfo.enabled && discInfo.discountAmount > 0 && (
                                    <span className="text-[9px] text-slate-400 font-sans font-normal">
                                      (setelah diskon)
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 7. Bayar Sekarang (Rp) & Tombol Penuh di Bawah Input */}
                              <td className="px-3 py-2.5 align-top text-right" style={{ width: '190px', minWidth: '180px' }}>
                                <div className="space-y-1.5">
                                  <input
                                    type="number"
                                    value={billAllocations[bill.id] || ''}
                                    onChange={(e) => handleAllocationChange(bill.id, e.target.value)}
                                    placeholder="0"
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-right tnum font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs shadow-2xs"
                                  />

                                  {/* Tombol Penuh tepat di bawah isian nominal */}
                                  <div className="flex items-center justify-between gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handlePayFullRow(bill)}
                                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded text-[9.5px] font-bold cursor-pointer transition shadow-2xs active:scale-95 flex items-center gap-1"
                                      title="Bayar Penuh Sisa Piutang Pos Ini (Setelah Diskon)"
                                    >
                                      <span>⚡ Penuh</span>
                                    </button>
                                    {allocated > 0 && (
                                      <span className="text-[9.5px] font-semibold text-indigo-600">
                                        {allocated >= discInfo.effectiveRem ? 'Lunas' : 'Sebagian'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Input Diskon jika Checkbox Diskon aktif */}
                                  {discInfo.enabled && (
                                    <div className="p-2 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-1.5 text-left text-[11px] shadow-xs animate-in fade-in slide-in-from-top-1 duration-150">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-emerald-950 text-[10px] flex items-center gap-1">
                                          <span>🏷️ Mode:</span>
                                        </span>
                                        <div className="inline-flex rounded-lg bg-emerald-100/80 p-0.5 text-[9.5px] font-bold">
                                          <button
                                            type="button"
                                            onClick={() => handleDiscountTypeChange(bill.id, 'percent')}
                                            className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                                              discInfo.type === 'percent'
                                                ? 'bg-emerald-700 text-white shadow-2xs'
                                                : 'text-emerald-800 hover:bg-emerald-200'
                                            }`}
                                          >
                                            % Persen
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDiscountTypeChange(bill.id, 'nominal')}
                                            className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                                              discInfo.type === 'nominal'
                                                ? 'bg-emerald-700 text-white shadow-2xs'
                                                : 'text-emerald-800 hover:bg-emerald-200'
                                            }`}
                                          >
                                            Rp Nominal
                                          </button>
                                        </div>
                                      </div>

                                      {/* Input Nilai Diskon */}
                                      <div>
                                        {discInfo.type === 'percent' ? (
                                          <div className="relative">
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="any"
                                              value={discInfo.percent}
                                              onChange={(e) => handleDiscountValueChange(bill.id, e.target.value)}
                                              placeholder="0"
                                              className="w-full pl-2 pr-6 py-1 bg-white border border-emerald-300 rounded-lg text-right tnum font-bold text-emerald-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none shadow-2xs"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700 pointer-events-none">%</span>
                                          </div>
                                        ) : (
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 pointer-events-none">Rp</span>
                                            <input
                                              type="number"
                                              min="0"
                                              max={billTotal}
                                              value={discInfo.amount}
                                              onChange={(e) => handleDiscountValueChange(bill.id, e.target.value)}
                                              placeholder="0"
                                              className="w-full pl-7 pr-2 py-1 bg-white border border-emerald-300 rounded-lg text-right tnum font-bold text-emerald-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none shadow-2xs"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* Alasan Diskon */}
                                      <input
                                        type="text"
                                        value={discInfo.reason}
                                        onChange={(e) => handleDiscountReasonChange(bill.id, e.target.value)}
                                        placeholder="Alasan diskon (opsional)..."
                                        className="w-full px-2 py-0.5 bg-white border border-emerald-200 rounded-lg text-[10px] text-slate-700 placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 8. Sisa Setelah Bayar */}
                              <td className="px-3 py-2.5 align-top text-right num-cell font-bold text-slate-800">
                                {formatCurrency(remAfter)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Baris 5: Live Allocation Indicator */}
              <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Total Diterima:</span>
                    <div className="tnum font-black text-slate-800 text-sm">
                      {formatCurrency(paymentTotalAmount || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Teralokasi:</span>
                    <div className="tnum font-black text-indigo-700 text-sm">
                      {formatCurrency(totalAllocatedAmount)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Sisa Belum Teralokasi:</span>
                  <div className={`tnum font-black text-sm ${Math.abs(unallocatedAmount) < 0.01 ? 'text-emerald-700' : unallocatedAmount > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                    {formatCurrency(unallocatedAmount)}
                  </div>
                </div>
              </div>

              {/* Baris 6: Keterangan / Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan Transaksi</label>
                <input
                  type="text"
                  placeholder="Contoh: Pembayaran SPP Juli 2025 via loket..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCloseRecordModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs cursor-pointer transition"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingPayment}
                  onClick={() => handleSavePayment(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition"
                >
                  {savingPayment ? 'Menyimpan...' : 'Simpan Pembayaran Saja'}
                </button>

                <button
                  type="button"
                  disabled={savingPayment}
                  onClick={() => handleSavePayment(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{savingPayment ? 'Memproses...' : 'Simpan & Cetak Kwitansi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* POPUP MODAL: ATUR ATURAN TRANSAKSI & JURNAL PER-TAGIHAN        */}
      {/* ============================================================== */}
      {editingBillRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-indigo-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    Aturan Transaksi & Jurnal Tagihan
                  </h3>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    Komponen: <span className="font-bold text-amber-300">{editingBillRule.component_display || editingBillRule.fee_type_name}</span>
                    {editingBillRule.student_name ? ` • Siswa: ${editingBillRule.student_name}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBillRule(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto max-h-[calc(85vh-140px)]">
              {/* 1. Pos Alokasi Dana Terkait & Ringkasan Finansial */}
              {(() => {
                const ftObj = feeTypes.find(f => f.id === editingBillRule.fee_type_id) || null;
                const posBiayaName = ftObj?.name ? `Dana ${ftObj.name}` : (editingBillRule.fee_type_name ? `Dana ${editingBillRule.fee_type_name}` : 'Pos Alokasi Dana Tagihan');
                const posBiayaCode = ftObj?.code || editingBillRule.fee_type_code || '-';
                const posBiayaCategory = ftObj?.category || (posBiayaCode.includes('spp') ? 'Rutin Bulanan' : 'Penerimaan Tagihan Siswa');
                const discInfo = getBillDiscountInfo(editingBillRule);
                const currentAlloc = parseFloat(billAllocations[editingBillRule.id] || 0);

                return (
                  <div className="p-3.5 bg-gradient-to-br from-indigo-50/90 via-slate-50 to-indigo-50/50 border border-indigo-200/80 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider">
                              Pos Alokasi Dana Terkait
                            </span>
                            <span className="px-2 py-0.2 bg-indigo-100 text-indigo-800 tnum font-bold rounded-full text-[9.5px] border border-indigo-200">
                              Kode: {posBiayaCode}
                            </span>
                            <span className="px-2 py-0.2 bg-indigo-100 text-indigo-800 font-bold rounded-full text-[9.5px] border border-indigo-200">
                              {posBiayaCategory}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-900 mt-0.5">
                            {posBiayaName}
                          </h4>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Alokasi Bayar Sekarang</span>
                        <div className="tnum font-black text-emerald-700 text-sm">
                          {formatCurrency(currentAlloc)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-indigo-100 text-[11px]">
                      <div className="bg-white/90 p-2.5 rounded-lg border border-indigo-100/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Tagihan Awal</span>
                        <div className="tnum font-bold text-slate-800 mt-0.5">
                          {formatCurrency(editingBillRule.amount)}
                        </div>
                        <span className="text-[10px] text-slate-400">Total Komponen</span>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-lg border border-indigo-100/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Diskon / Potongan</span>
                        <div className={`tnum font-bold mt-0.5 ${discInfo.discountAmount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {discInfo.discountAmount > 0 ? `-${formatCurrency(discInfo.discountAmount)}` : 'Rp 0'}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {discInfo.discountAmount > 0 ? (discInfo.type === 'percent' ? `(${discInfo.percent}%)` : '(Nominal)') : 'Tidak Ada Diskon'}
                        </span>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-lg border border-indigo-100/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Tagihan Bersih</span>
                        <div className="tnum font-bold text-slate-900 mt-0.5">
                          {formatCurrency(discInfo.netBill)}
                        </div>
                        <span className="text-[10px] text-indigo-600 font-medium">Setelah Diskon</span>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-lg border border-indigo-100/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Sisa Piutang Bersih</span>
                        <div className="tnum font-bold text-rose-600 mt-0.5">
                          {formatCurrency(discInfo.effectiveRem)}
                        </div>
                        <span className="text-[10px] text-slate-400">Sisa Ditagihkan</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ============================================================== */}
              {/* BAGIAN A: ATURAN TRANSAKSI PEMBAYARAN TAGIHAN (KAS / BANK)     */}
              {/* ============================================================== */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                      1. Aturan Transaksi Pembayaran (Kas / Bank Masuk)
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[9.5px]">
                    Mutasi Kas Aktif
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>Pilihan Aturan Transaksi Pembayaran <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-indigo-600 font-semibold">Otomatis tentukan debit & kredit</span>
                  </label>
                  <SearchableSelect
                    options={ruleSelectOptions}
                    value={tempRuleModalState.ruleId}
                    onChange={handleModalRuleChange}
                    placeholder="-- Pilih Aturan Transaksi Pembayaran --"
                    searchPlaceholder="Cari aturan transaksi pembayaran..."
                    accentColor="indigo"
                    allowClear={false}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Akun Debit (Kas / Bank) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <span>Akun Debit (Kas / Penerimaan)</span>
                    </label>
                    <SearchableSelect
                      options={coaOptions}
                      value={tempRuleModalState.debitAccountId}
                      onChange={(val) => setTempRuleModalState(prev => ({ ...prev, debitAccountId: val || '' }))}
                      placeholder="-- Pilih Akun Debit --"
                      searchPlaceholder="Cari nomor atau nama akun COA..."
                      accentColor="emerald"
                      allowClear={false}
                    />
                    <p className="text-[10px] text-slate-400">Default: Kas / Bank Penerimaan</p>
                  </div>

                  {/* Akun Kredit (Piutang Siswa) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-indigo-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      <span>Akun Kredit (Piutang Siswa)</span>
                    </label>
                    <SearchableSelect
                      options={coaOptions}
                      value={tempRuleModalState.creditAccountId}
                      onChange={(val) => setTempRuleModalState(prev => ({ ...prev, creditAccountId: val || '' }))}
                      placeholder="-- Pilih Akun Kredit --"
                      searchPlaceholder="Cari nomor atau nama akun COA..."
                      accentColor="indigo"
                      allowClear={false}
                    />
                    <p className="text-[10px] text-slate-400">Default: Piutang terkait komponen tagihan</p>
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* BAGIAN B: ATURAN TRANSAKSI DISKON / POTONGAN (NON-KAS)         */}
              {/* ============================================================== */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/90 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <h4 className="font-bold text-emerald-950 text-xs uppercase tracking-wide">
                      2. Aturan Transaksi Diskon / Potongan Tagihan
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 font-bold rounded text-[9.5px]">
                    Non-Kas (Tanpa Saldo Kas)
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>Pilihan Aturan Diskon (Discount Rule) <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Beban/Potongan Pendapatan vs Piutang</span>
                  </label>
                  <SearchableSelect
                    options={discountRuleSelectOptions}
                    value={tempRuleModalState.discountRuleId}
                    onChange={handleModalDiscountRuleChange}
                    placeholder="-- Pilih Aturan Diskon Tagihan --"
                    searchPlaceholder="Cari aturan diskon..."
                    accentColor="emerald"
                    allowClear={false}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Akun Debit Diskon (Potongan Pendapatan Siswa) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <span>Akun Debit (Potongan / Diskon Pendapatan)</span>
                    </label>
                    <SearchableSelect
                      options={coaOptions}
                      value={tempRuleModalState.discountDebitAccountId}
                      onChange={(val) => setTempRuleModalState(prev => ({ ...prev, discountDebitAccountId: val || '' }))}
                      placeholder="-- Pilih Akun Debit Potongan --"
                      searchPlaceholder="Cari nomor atau nama akun COA..."
                      accentColor="emerald"
                      allowClear={false}
                    />
                    <p className="text-[10px] text-slate-400">Default: Potongan/Diskon Pendapatan Siswa</p>
                  </div>

                  {/* Akun Kredit Diskon (Piutang Siswa) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      <span>Akun Kredit (Piutang Usaha Siswa)</span>
                    </label>
                    <SearchableSelect
                      options={coaOptions}
                      value={tempRuleModalState.discountCreditAccountId}
                      onChange={(val) => setTempRuleModalState(prev => ({ ...prev, discountCreditAccountId: val || '' }))}
                      placeholder="-- Pilih Akun Kredit Piutang --"
                      searchPlaceholder="Cari nomor atau nama akun COA..."
                      accentColor="indigo"
                      allowClear={false}
                    />
                    <p className="text-[10px] text-slate-400">Default: Piutang Usaha - Siswa</p>
                  </div>
                </div>

                <p className="text-[10.5px] text-emerald-800 bg-emerald-100/60 p-2.5 rounded-lg border border-emerald-200 leading-relaxed">
                  💡 <strong>Catatan Akuntansi:</strong> Transaksi diskon adalah penyesuaian non-kas yang mendebit akun Potongan Pendapatan dan mengkredit Piutang Siswa sebesar nominal diskon yang diberikan, sehingga tidak memerlukan mutasi akun kas/bank.
                </p>
              </div>

              {/* ============================================================== */}
              {/* BAGIAN C: PRATINJAU JURNAL GANDA LENGKAP (DOUBLE ENTRY)        */}
              {/* ============================================================== */}
              {(() => {
                const discInfo = getBillDiscountInfo(editingBillRule);
                const currentAlloc = parseFloat(billAllocations[editingBillRule.id] || 0);
                const pDebCoa = chartOfAccounts.find(c => String(c.id) === String(tempRuleModalState.debitAccountId));
                const pCredCoa = chartOfAccounts.find(c => String(c.id) === String(tempRuleModalState.creditAccountId));
                const dDebCoa = chartOfAccounts.find(c => String(c.id) === String(tempRuleModalState.discountDebitAccountId));
                const dCredCoa = chartOfAccounts.find(c => String(c.id) === String(tempRuleModalState.discountCreditAccountId));

                return (
                  <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 font-mono">
                    <div className="flex items-center justify-between text-[11px] text-indigo-300 font-bold border-b border-slate-800 pb-2 font-sans">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        Pratinjau Jurnal Ganda (Double Entry Preview)
                      </span>
                      <span className="text-slate-400 font-normal">Komponen: {editingBillRule.component_display || editingBillRule.fee_type_name}</span>
                    </div>

                    {/* Jurnal 1: Pembayaran Kas */}
                    <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans font-bold uppercase mb-1">
                        <span>1. Jurnal Penerimaan Kas Pembayaran:</span>
                        <span className="text-indigo-300">Nominal: {formatCurrency(currentAlloc)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-emerald-400">
                        <span className="truncate">
                          [D] {pDebCoa ? `[${pDebCoa.account_code || pDebCoa.account_number}] ${pDebCoa.account_name || pDebCoa.name}` : 'Kas / Bank Penerimaan'}
                        </span>
                        <span className="font-bold shrink-0 pl-2">{formatCurrency(currentAlloc)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-indigo-300 pl-4">
                        <span className="truncate">
                          [K] {pCredCoa ? `[${pCredCoa.account_code || pCredCoa.account_number}] ${pCredCoa.account_name || pCredCoa.name}` : 'Piutang Usaha Siswa'}
                        </span>
                        <span className="font-bold shrink-0 pl-2">{formatCurrency(currentAlloc)}</span>
                      </div>
                    </div>

                    {/* Jurnal 2: Diskon / Potongan Non-Kas */}
                    {discInfo.enabled && discInfo.discountAmount > 0 && (
                      <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-emerald-900/60">
                        <div className="flex items-center justify-between text-[10px] text-emerald-400 font-sans font-bold uppercase mb-1">
                          <span>2. Jurnal Diskon / Potongan Tagihan (Non-Kas):</span>
                          <span className="text-emerald-300">Nominal Diskon: {formatCurrency(discInfo.discountAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-amber-300">
                          <span className="truncate">
                            [D] {dDebCoa ? `[${dDebCoa.account_code || dDebCoa.account_number}] ${dDebCoa.account_name || dDebCoa.name}` : 'Potongan/Diskon Pendapatan Siswa'}
                          </span>
                          <span className="font-bold shrink-0 pl-2">{formatCurrency(discInfo.discountAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-indigo-300 pl-4">
                          <span className="truncate">
                            [K] {dCredCoa ? `[${dCredCoa.account_code || dCredCoa.account_number}] ${dCredCoa.account_name || dCredCoa.name}` : 'Piutang Usaha Siswa'}
                          </span>
                          <span className="font-bold shrink-0 pl-2">{formatCurrency(discInfo.discountAmount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 p-3.5 sm:p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetBillRuleToDefault}
                className="px-3.5 py-2 text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg font-bold transition-all text-xs cursor-pointer"
              >
                Reset ke Default Komponen
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBillRule(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold transition-colors text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveBillRuleModal}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all text-xs shadow-xs shadow-indigo-600/20 cursor-pointer active:scale-95"
                >
                  Simpan & Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT & KOREKSI PEMBAYARAN (AUDIT TRAIL)              */}
      {/* ============================================================== */}
      {editModalOpen && selectedPaymentToEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-6xl xl:max-w-7xl w-full my-auto shadow-xl border border-slate-200 p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col justify-between animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shadow-indigo-600/20">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-800 text-base">Koreksi & Edit Pembayaran Siswa</h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 tnum">
                      No. Kwitansi: {selectedPaymentToEdit.receipt_number || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Perbarui rincian alokasi pos tagihan, diskon, rekening kas/bank, referensi mutasi rekening koran, serta aturan jurnal & akuntansi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Context Info Banner */}
              <div className="p-3 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-indigo-50/50 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-extrabold truncate">
                      {selectedPaymentToEdit.school_unit_name || selectedPaymentToEdit.school_unit?.name || activeSchoolUnit?.name || 'Satuan Pendidikan Aldepos'}
                    </span>
                  </div>
                  <div className="md:text-right flex items-center md:justify-end gap-1.5 text-[10.5px] text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tahun Ajaran: <b className="text-slate-800">{activeAyObj?.name || 'Semua'}</b></span>
                  </div>
                </div>
              </div>

              {/* Baris 1: Pilihan Siswa (Mendukung Multi-Siswa / Saudara dalam 1 Kwitansi) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Nama Siswa Terkait <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    💡 1 Kwitansi Resmi dapat memuat &gt;1 siswa / multi-tagihan
                  </span>
                </div>

                {/* Chips Siswa yang Dipilih */}
                {editSelectedStudentIds.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {editSelectedStudentIds.map((sid, idx) => {
                      const sObj = allStudents.find(s => String(s.id) === String(sid));
                      const sName = sObj?.name || selectedPaymentToEdit.student_name || `Siswa #${sid}`;
                      const sNis = sObj?.nis || selectedPaymentToEdit.nis || '-';
                      const sClass = sObj?.class_name || selectedPaymentToEdit.class_name || '';
                      return (
                        <span
                          key={sid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-indigo-200 text-indigo-950 rounded-lg text-xs font-semibold shadow-2xs"
                        >
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span>{sName}</span>
                          {sNis !== '-' && <span className="text-[10px] text-slate-400">({sNis})</span>}
                          {sClass && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">{sClass}</span>}
                          {editSelectedStudentIds.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleEditRemoveStudent(sid)}
                              className="ml-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Hapus siswa dari transaksi koreksi ini"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown Tambah Siswa */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <div className="md:col-span-8">
                    <SearchableSelect
                      options={studentSelectOptions.filter(opt => !editSelectedStudentIds.includes(opt.value))}
                      value=""
                      onChange={(val) => {
                        if (val) handleEditAddStudent(val);
                      }}
                      placeholder="+ Tambah Siswa Lain / Saudara Kandung (1 Kwitansi Gabungan) --"
                      searchPlaceholder="Ketik nama siswa atau NIS..."
                      accentColor="indigo"
                      allowClear={false}
                    />
                  </div>
                  <div className="md:col-span-4 text-[11px] text-slate-500 italic">
                    {editSelectedStudentIds.length === 1 ? '1 Siswa Terpilih. Klik dropdown untuk menambah saudara.' : `${editSelectedStudentIds.length} Siswa Terpilih (Kwitansi Gabungan).`}
                  </div>
                </div>
              </div>

              {/* Baris 2: Tanggal & Total Nominal Bayar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <DatePickerField
                    label="Tanggal Pembayaran *"
                    value={editForm.paid_at}
                    onChange={(iso) => {
                      setEditForm(p => ({ ...p, paid_at: iso }));
                      if (editForm.payment_method === 'bank_transfer' && editForm.cash_account_id) {
                        fetchEditBankStatements(editForm.cash_account_id, iso, editForm.bank_statement_id);
                      }
                    }}
                    placeholder="DD/MM/YYYY"
                    required={true}
                    inputClassName="bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Total Nominal Diterima (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="Contoh: 500000"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg tnum font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {parseFloat(editForm.amount) > 0 && (
                    <div className="text-[10.5px] text-indigo-700 font-medium bg-indigo-50/90 px-2.5 py-1 rounded-lg border border-indigo-200/80 italic leading-snug">
                      # {terbilang(parseFloat(editForm.amount))} Rupiah #
                    </div>
                  )}
                  {editForm.payment_method === 'bank_transfer' && editForm.bank_statement_id && (
                    <StatementMatchIndicator
                      inputAmount={editForm.amount}
                      statement={editBankStatementsOptions.find(o => String(o.value) === String(editForm.bank_statement_id))}
                      onSyncAmount={(amt) => setEditForm(p => ({ ...p, amount: String(amt) }))}
                      isCompact={true}
                    />
                  )}
                </div>
              </div>

              {/* Opsi Pencatatan Riwayat Saja (Non-Kas) */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                editForm.is_historical 
                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/25 shadow-xs' 
                  : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editForm.is_historical}
                    onChange={(e) => setEditForm(p => ({ ...p, is_historical: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <History className={`w-3.5 h-3.5 ${editForm.is_historical ? 'text-amber-600' : 'text-slate-500'}`} />
                        Catat Sebagai Riwayat Saja (Non-Kas / Tanpa Mutasi Saldo)
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        editForm.is_historical 
                          ? 'bg-amber-200 text-amber-900 border border-amber-300' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {editForm.is_historical ? '⚡ Mode Riwayat Saja Aktif' : 'Normal (Mutasi Kas Aktif)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Centang opsi ini jika transaksi ini merupakan <strong>catatan riwayat pelunasan tagihan siswa</strong> tanpa memengaruhi saldo akun kas/bank dan tanpa membukukan mutasi kas berjalan.
                    </p>
                  </div>
                </label>
              </div>

              {/* Baris 3: Metode Bayar & Akun Kas / Mutasi Rekening Koran */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                {editForm.is_historical ? (
                  <div className="p-2.5 bg-amber-100/70 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-medium flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Mode Riwayat Saja: Pembayaran ini melunasi tagihan siswa tanpa memengaruhi saldo akun kas/bank.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="text-xs font-bold text-slate-700">Metode Pembayaran:</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="radio"
                          name="editPaymentMethod"
                          checked={editForm.payment_method === 'cash'}
                          onChange={() => {
                            setEditForm(p => {
                              let nextAccId = p.cash_account_id;
                              const currentAcc = cashAccounts.find(a => String(a.id) === String(nextAccId));
                              if (!currentAcc || currentAcc.account_kind !== 'cash') {
                                const defaultCash = cashAccounts.find(a => a.account_kind === 'cash' && a.is_active) ||
                                                    cashAccounts.find(a => a.account_kind === 'cash') ||
                                                    cashAccounts.find(a => a.name?.toLowerCase().includes('tunai') || a.name?.toLowerCase().includes('kas'));
                                if (defaultCash) nextAccId = String(defaultCash.id);
                              }
                              return { ...p, payment_method: 'cash', cash_account_id: nextAccId, bank_statement_id: '' };
                            });
                          }}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Tunai (Kasir Loket)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="radio"
                          name="editPaymentMethod"
                          checked={editForm.payment_method === 'bank_transfer'}
                          onChange={() => {
                            setEditForm(p => {
                              let nextAccId = p.cash_account_id;
                              const currentAcc = cashAccounts.find(a => String(a.id) === String(nextAccId));
                              if (!currentAcc || currentAcc.account_kind !== 'bank') {
                                const defaultBank = cashAccounts.find(a => a.account_kind === 'bank' && a.name?.toLowerCase().includes('penerimaan')) ||
                                                    cashAccounts.find(a => a.account_kind === 'bank' && a.is_active) ||
                                                    cashAccounts.find(a => a.account_kind === 'bank');
                                if (defaultBank) nextAccId = String(defaultBank.id);
                              }
                              if (nextAccId) {
                                fetchEditBankStatements(nextAccId, p.paid_at, p.bank_statement_id);
                              }
                              return { ...p, payment_method: 'bank_transfer', cash_account_id: nextAccId };
                            });
                          }}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Non-Tunai (Transfer Bank)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Dropdown Akun Kas & Rekening Koran jika Normal */}
                {!editForm.is_historical && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Akun Kas / Bank Masuk <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        options={editCashAccountOptions}
                        value={editForm.cash_account_id}
                        onChange={(val) => {
                          setEditForm(p => ({ ...p, cash_account_id: val || '' }));
                          if (editForm.payment_method === 'bank_transfer' && val) {
                            fetchEditBankStatements(val, editForm.paid_at, editForm.bank_statement_id);
                          }
                        }}
                        placeholder="-- Pilih Akun Kas / Bank --"
                        searchPlaceholder="Cari nama akun kas / bank..."
                        accentColor="indigo"
                        allowClear={false}
                      />
                    </div>

                    {/* Referensi Rekening Koran saat Non-Tunai */}
                    {editForm.payment_method === 'bank_transfer' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600">
                            Referensi Mutasi Rekening Koran
                          </label>
                          {editForm.bank_statement_id ? (
                            <button
                              type="button"
                              onClick={() => setEditForm(p => ({ ...p, bank_statement_id: '' }))}
                              className="text-[10.5px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                              title="Batalkan / Lepas tautan mutasi rekening koran dari pembayaran ini"
                            >
                              <X className="w-3 h-3" />
                              <span>Batalkan Referensi RK</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-normal">(Opsional / Bisa Dikosongkan)</span>
                          )}
                        </div>

                        <SearchableSelect
                          options={editBankStatementsOptions}
                          value={editForm.bank_statement_id}
                          onChange={(val) => {
                            setEditForm(p => ({ ...p, bank_statement_id: val || '' }));
                            if (val) {
                              const selectedOpt = editBankStatementsOptions.find(o => String(o.value) === String(val));
                              if (selectedOpt && selectedOpt.rawDate) {
                                setEditForm(p => ({ ...p, paid_at: selectedOpt.rawDate }));
                              }
                            }
                          }}
                          onDisabledSelect={(opt) => setBlockedStatementModal(opt)}
                          placeholder="-- Pilih / Cari Rekening Koran Terkait --"
                          searchPlaceholder="Ketik nominal, no. ref, atau uraian transaksi RK..."
                          accentColor="emerald"
                          allowClear={true}
                          isLoading={loadingEditBankStatements}
                          emptyText="Tidak ada mutasi kredit rekening koran untuk akun bank ini"
                        />

                        {(() => {
                          const selectedOpt = editBankStatementsOptions.find(o => String(o.value) === String(editForm.bank_statement_id));
                          if (selectedOpt) {
                            return (
                              <div className="p-2.5 bg-emerald-50/90 border border-emerald-200/90 rounded-xl text-[10.5px] space-y-2 text-slate-700 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between font-semibold gap-2">
                                  <span className="text-emerald-900 font-bold flex items-center gap-1 min-w-0">
                                    <span>🔗 RK Terpilih:</span>
                                    <span className="truncate">{selectedOpt.desc}</span>
                                  </span>
                                  <span className="tnum text-emerald-800 font-bold shrink-0">
                                    Plafon: {formatCurrency(selectedOpt.amount)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-500 text-[10px] gap-2">
                                  <span>Tgl Mutasi: <b className="text-slate-800 tnum">{selectedOpt.rawDate || '-'}</b> {selectedOpt.refNo ? `• Ref: ${selectedOpt.refNo}` : ''}</span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-emerald-700 font-bold tnum">
                                      Sisa Plafon: {formatCurrency(selectedOpt.remaining_amount || selectedOpt.amount)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEditForm(p => ({ ...p, bank_statement_id: '' }))}
                                      className="px-2 py-0.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 rounded text-[9.5px] font-bold cursor-pointer transition shadow-2xs"
                                      title="Lepas referensi mutasi rekening koran ini"
                                    >
                                      ✕ Lepas
                                    </button>
                                  </div>
                                </div>
                                <StatementMatchIndicator
                                  inputAmount={editForm.amount}
                                  statement={selectedOpt}
                                  onSyncAmount={(amt) => setEditForm(p => ({ ...p, amount: String(amt) }))}
                                  isCompact={false}
                                />
                              </div>
                            );
                          }

                          if (!editForm.bank_statement_id && editForm.payment_method === 'bank_transfer') {
                            return (
                              <div className="text-[10px] text-slate-400 italic px-1">
                                Transaksi ini tidak ditautkan ke mutasi rekening koran manapun. Anda dapat memilih dari daftar di atas atau membiarkannya kosong.
                              </div>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Baris 4: Tabel Rincian Alokasi Tagihan Siswa Terkait */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Rincian Alokasi Tagihan Siswa Terkait:
                    </label>
                    {editStudentBills.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {editBillsSearch.trim()
                          ? `${filteredStudentBillsForEdit.length} dari ${editStudentBills.length} Tagihan`
                          : `${editStudentBills.length} Tagihan`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {editStudentBills.length > 0 && (
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={editBillsSearch}
                          onChange={(e) => setEditBillsSearch(e.target.value)}
                          placeholder="Cari pos, bulan, T.A, nama..."
                          className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 placeholder:text-slate-400"
                        />
                        {editBillsSearch && (
                          <button
                            type="button"
                            onClick={() => setEditBillsSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                            title="Bersihkan pencarian"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {editStudentBills.length > 0 && (
                      <button
                        type="button"
                        onClick={handleEditAutoAllocateFifo}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs whitespace-nowrap"
                      >
                        <span>⚡ Alokasikan Otomatis (FIFO)</span>
                      </button>
                    )}
                  </div>
                </div>

                {loadingEditDetails ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5 bg-slate-50 rounded-xl border border-slate-200">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    <span>Memuat daftar tagihan siswa untuk koreksi...</span>
                  </div>
                ) : editStudentBills.length === 0 ? (
                  <div className="p-8 text-center text-emerald-700 text-xs font-semibold bg-emerald-50 rounded-xl border border-emerald-200">
                    Tidak ada tagihan yang ditemukan untuk siswa ini.
                  </div>
                ) : filteredStudentBillsForEdit.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
                    <Search className="w-7 h-7 text-slate-300" />
                    <p className="text-xs text-slate-500 font-medium">
                      Tidak ada tagihan yang cocok dengan kata kunci <span className="font-bold text-slate-700">"{editBillsSearch}"</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditBillsSearch('')}
                      className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-indigo-600 shadow-2xs cursor-pointer transition"
                    >
                      Reset Filter Pencarian
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[960px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="px-3 py-2.5" style={{ minWidth: '170px' }}>Komponen Tagihan</th>
                          <th className="px-3 py-2.5" style={{ minWidth: '280px' }}>Aturan Transaksi (Jurnal)</th>
                          <th className="px-2.5 py-2.5 text-center" style={{ width: '70px' }}>Diskon</th>
                          <th className="px-3 py-2.5 text-right" style={{ minWidth: '120px' }}>Tagihan</th>
                          <th className="px-3 py-2.5 text-right">Sudah Bayar Lainnya</th>
                          <th className="px-3 py-2.5 text-right">Sisa Piutang</th>
                          <th className="px-3 py-2.5 text-right" style={{ width: '190px', minWidth: '180px' }}>Bayar Sekarang (Rp)</th>
                          <th className="px-3 py-2.5 text-right">Sisa Setelah Bayar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudentBillsForEdit.map((bill, bIdx) => {
                          const billTotal = parseFloat(bill.amount || 0);
                          const billPaidOther = parseFloat(bill.total_paid_other !== undefined ? bill.total_paid_other : (bill.total_paid || 0));
                          const discInfo = getBillDiscountInfo(bill, editBillDiscounts);
                          const allocated = parseFloat(editBillAllocations[bill.id] || 0);
                          const remAfter = Math.max(0, discInfo.effectiveRem - allocated);
                          const cfg = getBillAccountingConfig(bill);

                          return (
                            <tr key={`edit-bill-row-${bill.id}-${bIdx}`} className={`hover:bg-slate-50 transition ${discInfo.enabled ? 'bg-emerald-50/20' : ''}`}>
                              {/* 1. Komponen Tagihan */}
                              <td className="px-3 py-2.5 align-top">
                                <div className="flex flex-col gap-1">
                                  {editSelectedStudentIds.length > 1 && (
                                    <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      👤 {bill.student_name || `Siswa #${bill.student_id}`} {bill.nis && bill.nis !== '-' ? `(${bill.nis})` : ''}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <FeeTypeBadge item={bill} />
                                    {bill.academic_year_name && (() => {
                                      const curAy = activeAyObj?.name || '';
                                      const bAy = bill.academic_year_name || '';
                                      const isDiff = curAy && bAy && curAy !== bAy;
                                      const isPast = isDiff && bAy < curAy;
                                      const isFuture = isDiff && bAy > curAy;

                                      return (
                                        <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                          isPast
                                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                            : isFuture
                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        }`}>
                                          T.A. {bill.academic_year_name}
                                          {isPast && ' (Tunggakan)'}
                                        </span>
                                      );
                                    })()}
                                    {(bill.fee_type_code === 'arrears_previous_year' || bill.fee_type_name?.toLowerCase().includes('tunggakan')) && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                        Tunggakan TP Lalu
                                      </span>
                                    )}
                                  </div>
                                  {bill.period_display && (
                                    <span className="text-[10.5px] text-slate-500 font-medium">
                                      Periode: {bill.period_display}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 2. Aturan Transaksi (Jurnal) */}
                              <td className="px-3 py-2.5 align-top">
                                {(() => {
                                  const ruleLabel = cfg.rule?.transaction_label || cfg.rule?.transaction_code || 'Aturan Pembayaran';
                                  const dShort = cfg.debitCoa ? `${cfg.debitCoa.account_code || cfg.debitCoa.account_number || ''} ${cfg.debitCoa.account_name || cfg.debitCoa.name || ''}`.trim() : 'Kas';
                                  const kShort = cfg.creditCoa ? `${cfg.creditCoa.account_code || cfg.creditCoa.account_number || ''} ${cfg.creditCoa.account_name || cfg.creditCoa.name || ''}`.trim() : 'Piutang';
                                  const cashLabel = cfg.cashAcc?.name || (editForm.cash_account_id ? (cashAccounts.find(a => String(a.id) === String(editForm.cash_account_id))?.name || 'Kasir Default') : 'Kasir Default');
                                  const posBiayaLabel = cfg.feeTypeObj?.name || bill.fee_type_name || bill.component_display || 'Pos Alokasi Dana';

                                  const discRuleLabel = cfg.discountRule?.transaction_label || cfg.discountRule?.transaction_code || 'Aturan Diskon Siswa';
                                  const discDShort = cfg.discountDebitCoa ? `${cfg.discountDebitCoa.account_code || cfg.discountDebitCoa.account_number || ''} ${cfg.discountDebitCoa.account_name || cfg.discountDebitCoa.name || ''}`.trim() : 'Potongan Pendapatan Siswa';
                                  const discKShort = cfg.discountCreditCoa ? `${cfg.discountCreditCoa.account_code || cfg.discountCreditCoa.account_number || ''} ${cfg.discountCreditCoa.account_name || cfg.discountCreditCoa.name || ''}`.trim() : 'Piutang Siswa';

                                  return (
                                    <div className="flex flex-col gap-2 min-w-[270px] py-0.5">
                                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/90 space-y-1.5">
                                        <div className="flex items-center justify-between gap-1.5">
                                          <div className="flex items-center gap-1 min-w-0">
                                            <span className="font-extrabold text-slate-800 text-[11px] truncate" title={ruleLabel}>
                                              💵 {ruleLabel}
                                            </span>
                                            {cfg.isCustomized ? (
                                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold rounded text-[8.5px] shrink-0">
                                                Custom
                                              </span>
                                            ) : (
                                              <span className="px-1.5 py-0.2 bg-slate-200/70 text-slate-600 rounded text-[8.5px] font-medium shrink-0">
                                                Default
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => openEditBillRuleModal(bill)}
                                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
                                            title="Ubah aturan transaksi pembayaran, diskon, akun debit/kredit, atau pos dana"
                                          >
                                            <Edit2 className="w-3 h-3 text-indigo-600" />
                                            <span>Edit</span>
                                          </button>
                                        </div>

                                        <div className="flex flex-col gap-0.5 text-[9.5px] tnum bg-white p-1 rounded-md border border-slate-200">
                                          <div className="flex items-center gap-1 text-emerald-800 min-w-0">
                                            <span className="px-1 bg-emerald-100 text-emerald-800 font-bold rounded text-[8.5px] shrink-0 font-sans">D</span>
                                            <span className="font-semibold truncate">{dShort}</span>
                                          </div>
                                          <div className="flex items-center gap-1 text-indigo-800 min-w-0">
                                            <span className="px-1 bg-indigo-100 text-indigo-800 font-bold rounded text-[8.5px] shrink-0 font-sans">K</span>
                                            <span className="font-semibold truncate">{kShort}</span>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-1 text-[9px] leading-tight text-slate-500">
                                          <div className="truncate flex items-center gap-1 w-full" title={`Pos Dana: ${posBiayaLabel}`}>
                                            <span className="text-slate-400 font-bold shrink-0">Pos Dana:</span>
                                            <span className="font-semibold text-indigo-700 truncate">{posBiayaLabel}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {discInfo.enabled && (
                                        <div className="p-2 rounded-xl border bg-emerald-50/90 border-emerald-300 shadow-2xs animate-in fade-in duration-150">
                                          <div className="flex items-center justify-between gap-1 mb-1">
                                            <div className="flex items-center gap-1 min-w-0">
                                              <span className="font-black text-[10.5px] truncate text-emerald-950" title={discRuleLabel}>
                                                🏷️ {discRuleLabel}
                                              </span>
                                            </div>
                                            <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-black rounded text-[8.5px] shrink-0">
                                              Diskon Aktif
                                            </span>
                                          </div>

                                          <div className="flex flex-col gap-0.5 text-[9.5px] tnum bg-white/90 p-1 rounded-md border border-slate-200">
                                            <div className="flex items-center gap-1 text-emerald-800 min-w-0" title={`Debit Potongan: ${discDShort}`}>
                                              <span className="px-1 bg-emerald-100 text-emerald-800 font-bold rounded text-[8.5px] shrink-0 font-sans">D</span>
                                              <span className="font-semibold truncate">{discDShort}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-indigo-800 min-w-0" title={`Kredit Piutang: ${discKShort}`}>
                                              <span className="px-1 bg-indigo-100 text-indigo-800 font-bold rounded text-[8.5px] shrink-0 font-sans">K</span>
                                              <span className="font-semibold truncate">{discKShort}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* 3. Diskon Checkbox */}
                              <td className="px-2.5 py-2.5 align-top text-center">
                                <div className="pt-2">
                                  <label className="inline-flex flex-col items-center justify-center cursor-pointer p-1.5 rounded-xl hover:bg-emerald-100/60 transition group">
                                    <input
                                      type="checkbox"
                                      checked={discInfo.enabled}
                                      onChange={() => handleEditToggleDiscount(bill.id)}
                                      className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span className={`text-[9px] font-bold mt-1 transition ${discInfo.enabled ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                      {discInfo.enabled ? 'Aktif' : 'Diskon'}
                                    </span>
                                  </label>
                                </div>
                              </td>

                              {/* 4. Tagihan (Total) */}
                              <td className="px-3 py-2.5 align-top text-right num-cell">
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`font-bold ${discInfo.enabled && discInfo.discountAmount > 0 ? 'line-through text-slate-400 text-[11px]' : 'text-slate-800'}`}>
                                    {formatCurrency(billTotal)}
                                  </span>
                                  {discInfo.enabled && discInfo.discountAmount > 0 && (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                        Potongan: -{formatCurrency(discInfo.discountAmount)}
                                      </span>
                                      <div className="text-[11px] font-black text-indigo-950 bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-200">
                                        <span className="text-[9.5px] text-indigo-700 font-sans block font-semibold">Tagihan Bersih:</span>
                                        {formatCurrency(discInfo.netBill)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 5. Sudah Bayar Lainnya */}
                              <td className="px-3 py-2.5 align-top text-right num-cell text-emerald-700 font-semibold">
                                {formatCurrency(billPaidOther)}
                              </td>

                              {/* 6. Sisa Piutang */}
                              <td className="px-3 py-2.5 align-top text-right num-cell font-bold text-rose-600">
                                <div className="flex flex-col items-end">
                                  <span>{formatCurrency(discInfo.effectiveRem)}</span>
                                  {discInfo.enabled && discInfo.discountAmount > 0 && (
                                    <span className="text-[9px] text-slate-400 font-sans font-normal">
                                      (setelah diskon)
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 7. Bayar Sekarang (Rp) & Tombol Penuh */}
                              <td className="px-3 py-2.5 align-top text-right" style={{ width: '190px', minWidth: '180px' }}>
                                <div className="space-y-1.5">
                                  <input
                                    type="number"
                                    value={editBillAllocations[bill.id] || ''}
                                    onChange={(e) => handleEditAllocationChange(bill.id, e.target.value)}
                                    placeholder="0"
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-right tnum font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs shadow-2xs"
                                  />

                                  {/* Tombol Penuh tepat di bawah isian nominal */}
                                  <div className="flex items-center justify-between gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditPayFullRow(bill)}
                                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded text-[9.5px] font-bold cursor-pointer transition shadow-2xs active:scale-95 flex items-center gap-1"
                                      title="Bayar Penuh Sisa Piutang Pos Ini (Setelah Diskon)"
                                    >
                                      <span>⚡ Penuh</span>
                                    </button>
                                    {allocated > 0 && (
                                      <span className="text-[9.5px] font-semibold text-indigo-600">
                                        {allocated >= discInfo.effectiveRem ? 'Lunas' : 'Sebagian'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Input Diskon jika Checkbox Diskon aktif */}
                                  {discInfo.enabled && (
                                    <div className="p-2 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-1.5 text-left text-[11px] shadow-xs animate-in fade-in slide-in-from-top-1 duration-150">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-emerald-950 text-[10px] flex items-center gap-1">
                                          <span>🏷️ Mode:</span>
                                        </span>
                                        <div className="inline-flex rounded-lg bg-emerald-100/80 p-0.5 text-[9.5px] font-bold">
                                          <button
                                            type="button"
                                            onClick={() => handleEditDiscountTypeChange(bill.id, 'percent')}
                                            className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                                              discInfo.type === 'percent'
                                                ? 'bg-emerald-700 text-white shadow-2xs'
                                                : 'text-emerald-800 hover:bg-emerald-200'
                                            }`}
                                          >
                                            % Persen
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleEditDiscountTypeChange(bill.id, 'nominal')}
                                            className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                                              discInfo.type === 'nominal'
                                                ? 'bg-emerald-700 text-white shadow-2xs'
                                                : 'text-emerald-800 hover:bg-emerald-200'
                                            }`}
                                          >
                                            Rp Nominal
                                          </button>
                                        </div>
                                      </div>

                                      <div>
                                        {discInfo.type === 'percent' ? (
                                          <div className="relative">
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="any"
                                              value={discInfo.percent}
                                              onChange={(e) => handleEditDiscountValueChange(bill.id, e.target.value)}
                                              placeholder="0"
                                              className="w-full pl-2 pr-6 py-1 bg-white border border-emerald-300 rounded-lg text-right tnum font-bold text-emerald-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none shadow-2xs"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700 pointer-events-none">%</span>
                                          </div>
                                        ) : (
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 pointer-events-none">Rp</span>
                                            <input
                                              type="number"
                                              min="0"
                                              max={billTotal}
                                              value={discInfo.amount}
                                              onChange={(e) => handleEditDiscountValueChange(bill.id, e.target.value)}
                                              placeholder="0"
                                              className="w-full pl-7 pr-2 py-1 bg-white border border-emerald-300 rounded-lg text-right tnum font-bold text-emerald-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none shadow-2xs"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      <input
                                        type="text"
                                        value={discInfo.reason}
                                        onChange={(e) => handleEditDiscountReasonChange(bill.id, e.target.value)}
                                        placeholder="Alasan diskon (opsional)..."
                                        className="w-full px-2 py-0.5 bg-white border border-emerald-200 rounded-lg text-[10px] text-slate-700 placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 8. Sisa Setelah Bayar */}
                              <td className="px-3 py-2.5 align-top text-right num-cell font-bold text-slate-800">
                                {formatCurrency(remAfter)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Baris 5: Live Allocation Indicator */}
              <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Total Diterima:</span>
                    <div className="tnum font-black text-slate-800 text-sm">
                      {formatCurrency(editForm.amount || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Teralokasi:</span>
                    <div className="tnum font-black text-indigo-700 text-sm">
                      {formatCurrency(editTotalAllocatedAmount)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Sisa Belum Teralokasi:</span>
                  <div className={`tnum font-black text-sm ${Math.abs(editUnallocatedAmount) < 0.01 ? 'text-emerald-700' : editUnallocatedAmount > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                    {formatCurrency(editUnallocatedAmount)}
                  </div>
                </div>
              </div>

              {/* Baris 6: Catatan / Keterangan Transaksi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan Transaksi</label>
                <input
                  type="text"
                  placeholder="Contoh: Pembayaran SPP via loket..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Baris 7: Alasan Koreksi Pembayaran (Audit Trail Wajib) */}
              <div className="p-3.5 bg-amber-50/90 border border-amber-300/80 rounded-xl space-y-1.5 shadow-2xs">
                <label className="block font-bold text-amber-950 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    Alasan Koreksi Pembayaran (Audit Log) <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold">Wajib Diisi untuk Integritas Finansial</span>
                </label>
                <textarea
                  value={editForm.correction_reason}
                  onChange={(e) => setEditForm(p => ({ ...p, correction_reason: e.target.value }))}
                  placeholder="Contoh: Koreksi nominal alokasi pos tagihan (SPP Rp 300.000, Uang Gedung Rp 200.000) dan penyesuaian akun kas/bank..."
                  required
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500/25 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Baris 8: Snapshot Data Sebelum Koreksi Terakhir jika ada */}
              {selectedPaymentToEdit.previous_data && (
                <div className="p-3 bg-slate-100/90 rounded-xl text-[11px] text-slate-600 space-y-1 border border-slate-200">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Snapshot Data Sebelum Koreksi Terakhir:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 tnum text-[10.5px]">
                    <div>Nominal: <b>{formatCurrency(selectedPaymentToEdit.previous_data.amount)}</b></div>
                    <div>Tgl: <b>{selectedPaymentToEdit.previous_data.paid_at}</b></div>
                    <div>Alasan Lalu: <span className="font-sans italic">{selectedPaymentToEdit.correction_reason || '-'}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs cursor-pointer transition"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => handleSaveEdit(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition disabled:opacity-50"
                >
                  {savingEdit ? 'Menyimpan Koreksi...' : 'Simpan Koreksi Saja'}
                </button>

                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => handleSaveEdit(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{savingEdit ? 'Memproses...' : 'Simpan & Cetak Ulang Kwitansi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: MODAL KWITANSI RESMI PREVIEW                         */}
      {/* ============================================================== */}
      {receiptModalOpen && activeReceiptData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className={`w-5 h-5 ${activeReceiptData.is_legacy ? 'text-amber-600' : 'text-emerald-600'}`} />
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    {activeReceiptData.is_legacy ? 'Kwitansi Catatan Riwayat (Non-Kas)' : 'Kwitansi Pembayaran Resmi'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeReceiptData.is_legacy && (
              <div className="p-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pembayaran ini adalah <strong>Pencatatan Riwayat Saja (Non-Kas)</strong> dan tidak memengaruhi mutasi kas/bank aktif.</span>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between font-bold text-slate-800">
                <span>No. Kwitansi:</span>
                <span className="text-indigo-700 font-black">{activeReceiptData.receipt_number}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Satuan Pendidikan:</span>
                <span className="font-bold text-slate-800">{activeReceiptData.school_unit?.name || activeSchoolUnit?.name || 'Satuan Pendidikan Aldepos'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tanggal Bayar:</span>
                <span>{activeReceiptData.paid_at ? String(activeReceiptData.paid_at).slice(0, 10) : '-'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{activeReceiptData.is_multi_student ? 'Nama Siswa:' : 'Nama Siswa:'}</span>
                <span className="font-bold text-slate-800 text-right max-w-xs">{activeReceiptData.student?.name || activeReceiptData.student_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kelas / Rombel:</span>
                <span className="font-bold text-slate-800">{activeReceiptData.student?.class_name || activeReceiptData.class_name || '-'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pembayaran Untuk:</span>
                <span>{activeReceiptData.payment_for || activeReceiptData.fee_type_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Akun Kas / Status:</span>
                <span className={activeReceiptData.is_legacy ? 'text-amber-800 font-bold' : ''}>
                  {activeReceiptData.cash_account_name || (activeReceiptData.is_legacy ? 'Non-Kas (Riwayat Saja)' : 'Kasir')}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>Nominal Total:</span>
                <span className="text-emerald-700">{formatCurrency(activeReceiptData.amount)}</span>
              </div>
            </div>

            {/* Terbilang */}
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold italic border border-emerald-200">
              Terbilang: # {activeReceiptData.amount_in_words || `${terbilang(activeReceiptData.amount)} Rupiah`} #
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => openReceiptInNewTab(activeReceiptData, activeReceiptData.school_unit?.name || activeSchoolUnit?.name)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Buka & Cetak di Tab Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CATAT PENERIMAAN LAINNYA                              */}
      {/* ============================================================== */}
      {otherIncomeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Catat Penerimaan Kas Lainnya (Non-Siswa &amp; RAPBS)</h3>
                  <p className="text-[11px] text-slate-400">Pencatatan kas masuk selain santri terintegrasi ke Rekening Koran, RAPBS &amp; Jurnal Umum</p>
                </div>
              </div>
              <button onClick={() => setOtherIncomeModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={(e) => { e.preventDefault(); }} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs overscroll-contain">
              
              {/* Pilihan Metode Pembayaran: Tunai vs Non-Tunai (Transfer Bank) */}
              <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
                <label className="text-xs font-bold text-slate-700">Metode Pembayaran:</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                    <input
                      type="radio"
                      name="otherIncomePaymentMethodRadio"
                      checked={otherIncomePaymentMethod === 'cash'}
                      onChange={() => {
                        setOtherIncomePaymentMethod('cash');
                        setOtherIncomeForm(p => ({ ...p, bank_statement_id: '' }));
                        const currentAcc = cashAccounts.find(a => String(a.id) === String(otherIncomeForm.cash_account_id));
                        if (!currentAcc || currentAcc.account_kind !== 'cash') {
                          const defaultCash = cashAccounts.find(a => a.account_kind === 'cash' && a.is_active) ||
                                              cashAccounts.find(a => a.account_kind === 'cash') ||
                                              cashAccounts[0];
                          if (defaultCash) {
                            handleOtherIncomeCashAccountChange(String(defaultCash.id), false);
                          }
                        }
                      }}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Tunai (Kasir Loket)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                    <input
                      type="radio"
                      name="otherIncomePaymentMethodRadio"
                      checked={otherIncomePaymentMethod === 'bank_transfer'}
                      onChange={() => {
                        setOtherIncomePaymentMethod('bank_transfer');
                        const currentAcc = cashAccounts.find(a => String(a.id) === String(otherIncomeForm.cash_account_id));
                        if (!currentAcc || currentAcc.account_kind !== 'bank') {
                          const defaultBank = cashAccounts.find(a => a.account_kind === 'bank' && a.name?.toLowerCase().includes('penerimaan')) ||
                                              cashAccounts.find(a => a.account_kind === 'bank' && a.is_active) ||
                                              cashAccounts.find(a => a.account_kind === 'bank');
                          if (defaultBank) {
                            handleOtherIncomeCashAccountChange(String(defaultBank.id), false);
                          }
                        }
                      }}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Non-Tunai (Transfer Bank)</span>
                  </label>
                </div>
              </div>

              {/* Pos RAPBS & Kategori Sumber (Diletakkan di Awal untuk Otomatisasi Isian Lainnya) */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50/60 to-slate-50 rounded-xl border border-emerald-200/90 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-700" />
                      <span>Pos Mata Anggaran RAPBS (Rencana Anggaran)</span>
                    </label>
                    {otherIncomeForm.budget_plan_income_item_id ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full animate-in fade-in duration-150">
                        ✨ Otomatis Mengisi Uraian, Kas &amp; Jurnal
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Penerimaan Bebas (Non-RAPBS)
                      </span>
                    )}
                  </div>
                  <SearchableSelect
                    options={otherIncomeRapbsOptions}
                    value={otherIncomeForm.budget_plan_income_item_id}
                    onChange={(val) => handleOtherIncomeRapbsSelect(val, false)}
                    placeholder="-- Di Luar Perencanaan RAPBS (Penerimaan Bebas) --"
                    searchPlaceholder="Cari pos RAPBS, pagu, atau kategori..."
                    accentColor="emerald"
                    allowClear={true}
                  />
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    💡 <em>Memilih pos RAPBS otomatis menentukan nama uraian, rekening kas penampung, kantong dana, serta akun jurnal akuntansi.</em>
                  </p>
                </div>

                {/* Input Kategori Sumber Penerimaan hanya tampil jika Di Luar Perencanaan RAPBS */}
                {!otherIncomeForm.budget_plan_income_item_id && (
                  <div className="pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                    <label className="block font-bold text-slate-700 mb-1 text-xs">
                      Kategori Sumber Penerimaan <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      options={otherIncomeCategoryOptions}
                      value={otherIncomeForm.source_category}
                      onChange={(val) => handleOtherIncomeSourceCategoryChange(val, false)}
                      placeholder="-- Pilih Kategori Sumber Penerimaan --"
                      searchPlaceholder="Cari kategori sumber..."
                      accentColor="emerald"
                      allowClear={false}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Pilih klasifikasi kategori sumber penerimaan di luar perencanaan RAPBS.
                    </p>
                  </div>
                )}
              </div>

              {/* Baris: Uraian & Nama Penyetor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Uraian / Keterangan Penerimaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pencairan Dana BOS Tahap 1 / Donasi Gedung"
                    value={otherIncomeForm.notes}
                    onChange={(e) => setOtherIncomeForm(p => ({ ...p, notes: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 transition font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Penyetor / Sumber Dana
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kemendikbudristek / Yayasan / H. Ahmad"
                    value={otherIncomeForm.payer_name}
                    onChange={(e) => setOtherIncomeForm(p => ({ ...p, payer_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Baris: Rekening Kas Penampung & Kantong Dana Terkait */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Rekening Kas / Bank Penampung <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={otherIncomeCashAccountOptions}
                    value={otherIncomeForm.cash_account_id}
                    onChange={(val) => handleOtherIncomeCashAccountChange(val, false)}
                    placeholder="-- Pilih Rekening Kas/Bank --"
                    searchPlaceholder="Cari nama bank, rekening, atau kode akun..."
                    accentColor="emerald"
                    allowClear={false}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Otomatis tersinkronisasi dengan akun kas debet akuntansi
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kantong Dana Terkait (Alokasi Dana)
                  </label>
                  <SearchableSelect
                    options={otherIncomeFundBalanceSelectOptions}
                    value={otherIncomeForm.fund_balance_id}
                    onChange={(val) => setOtherIncomeForm(p => ({ ...p, fund_balance_id: val }))}
                    placeholder="-- Otomatis Sesuai Pos RAPBS / Bebas --"
                    searchPlaceholder="Cari kantong dana..."
                    accentColor="emerald"
                    allowClear={true}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {otherIncomeForm.budget_plan_income_item_id ? 'Terkoneksi langsung ke mata anggaran RAPBS' : 'Mengikuti alokasi kantong dana yang dipilih'}
                  </p>
                </div>
              </div>

              {/* Referensi Mutasi Rekening Koran (Jika Nontunai / Transfer Bank) */}
              {otherIncomePaymentMethod === 'bank_transfer' && (
                <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Referensi Mutasi Rekening Koran (Nontunai)</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      💡 1 Mutasi Rekening Koran = 1 Kwitansi
                    </span>
                  </div>
                  <SearchableSelect
                    options={otherIncomeBankStatementsOptions}
                    value={otherIncomeForm.bank_statement_id}
                    onChange={(val) => handleOtherIncomeBankStatementSelect(val, false)}
                    onDisabledSelect={(opt) => setBlockedStatementModal(opt)}
                    placeholder="-- Pilih Mutasi Rekening Koran Masuk --"
                    searchPlaceholder="Ketik nominal, nomor referensi, atau uraian mutasi bank..."
                    accentColor="emerald"
                    allowClear={true}
                    isLoading={loadingOtherIncomeBankStatements}
                    emptyText="Tidak ada mutasi kredit rekening koran yang tersedia untuk akun bank ini"
                  />

                  {/* Card Rincian Mutasi Terpilih */}
                  {(() => {
                    const selectedOpt = otherIncomeBankStatementsOptions.find(o => String(o.value) === String(otherIncomeForm.bank_statement_id));
                    if (!selectedOpt) return null;
                    return (
                      <div className="p-2.5 bg-white border border-emerald-300 rounded-xl text-[10.5px] space-y-1.5 text-slate-700 shadow-2xs animate-in fade-in duration-150">
                        <div className="flex items-center justify-between font-bold gap-2">
                          <span className="text-emerald-900 flex items-center gap-1 truncate">
                            <span>🔗 RK Terpilih:</span>
                            <span className="truncate">{selectedOpt.desc}</span>
                          </span>
                          <span className="tnum text-emerald-800 shrink-0">
                            Plafon: {formatCurrency(selectedOpt.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 text-[10px] gap-2">
                          <span>Tgl: <b className="text-slate-800">{selectedOpt.rawDate || '-'}</b> {selectedOpt.refNo ? `• Ref: ${selectedOpt.refNo}` : ''} • Teralokasi: <b>{formatCurrency(selectedOpt.allocated_amount || 0)}</b></span>
                          <span className="text-emerald-700 font-bold tnum shrink-0">
                            Sisa Plafon: {formatCurrency(selectedOpt.remaining_amount || selectedOpt.amount)}
                          </span>
                        </div>
                        <StatementMatchIndicator
                          inputAmount={otherIncomeForm.amount}
                          statement={selectedOpt}
                          onSyncAmount={(amt) => setOtherIncomeForm(p => ({ ...p, amount: String(amt) }))}
                          isCompact={false}
                        />
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Baris: Nominal & Tanggal Diterima */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nominal Penerimaan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={otherIncomeForm.amount}
                    onChange={(e) => setOtherIncomeForm(p => ({ ...p, amount: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-emerald-800 text-sm focus:bg-white focus:border-emerald-500 transition"
                  />
                  {otherIncomeForm.amount && parseFloat(otherIncomeForm.amount) > 0 && (
                    <div className="mt-1 text-[11px] text-emerald-700 font-semibold italic">
                      # {terbilang(otherIncomeForm.amount)} Rupiah #
                    </div>
                  )}
                </div>
                <div>
                  <DatePickerField
                    label="Tanggal Diterima *"
                    value={otherIncomeForm.received_at}
                    onChange={(iso) => setOtherIncomeForm(p => ({ ...p, received_at: iso }))}
                    placeholder="DD/MM/YYYY"
                    required
                  />
                </div>
              </div>

              {/* Baris 5: Pemetaan Akun Akuntansi & Aturan Transaksi */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">
                        Pemetaan Akun Akuntansi &amp; Aturan Transaksi
                      </span>
                      <span className="text-[10px] text-indigo-700 font-medium">
                        Otomatis terisi dari RAPBS / Rekening Kas (Tetap dapat diedit)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1 text-[11px]">
                      Aturan Transaksi Kas Masuk
                    </label>
                    <SearchableSelect
                      options={otherIncomeTransactionRuleOptions}
                      value={otherIncomeForm.transaction_mapping_id}
                      onChange={(val) => {
                        const r = transactionRules.find(x => String(x.id) === String(val));
                        setOtherIncomeForm(p => ({
                          ...p,
                          transaction_mapping_id: val,
                          override_credit_account_id: r?.credit_account_id ? String(r.credit_account_id) : p.override_credit_account_id,
                          override_debit_account_id: r?.debit_account_id ? String(r.debit_account_id) : p.override_debit_account_id
                        }));
                      }}
                      placeholder="-- Pilih Aturan Transaksi Kas Masuk --"
                      searchPlaceholder="Cari aturan transaksi kas masuk..."
                      accentColor="emerald"
                      allowClear={true}
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1 text-[11px]">
                      Akun Kas / Bank (Debet) <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      options={otherIncomeDebitCoaOptions}
                      value={otherIncomeForm.override_debit_account_id}
                      onChange={(val) => setOtherIncomeForm(p => ({ ...p, override_debit_account_id: val }))}
                      placeholder="-- Pilih Akun Kas / Bank (COA Debet) --"
                      searchPlaceholder="Cari kode akun atau nama kas/bank..."
                      accentColor="emerald"
                      allowClear={false}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-medium text-slate-700 mb-1 text-[11px]">
                      Akun Pendapatan (Kredit) <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      options={otherIncomeCreditCoaOptions}
                      value={otherIncomeForm.override_credit_account_id}
                      onChange={(val) => setOtherIncomeForm(p => ({ ...p, override_credit_account_id: val }))}
                      placeholder="-- Pilih Akun Pendapatan (COA Grup 4/6) --"
                      searchPlaceholder="Cari kode akun atau nama pendapatan..."
                      accentColor="emerald"
                      allowClear={false}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-medium text-slate-600 mb-1 text-[11px]">
                      Catatan / Alasan Penyesuaian Akun (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pengalihan akun khusus bantuan hibah kemitraan atau penyesuaian pos"
                      value={otherIncomeForm.override_reason}
                      onChange={(e) => setOtherIncomeForm(p => ({ ...p, override_reason: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Box Info Jurnal Preview Dinamis */}
                {(() => {
                  const activeDebitCoa = chartOfAccounts.find(c => String(c.id) === String(otherIncomeForm.override_debit_account_id));
                  const activeCreditCoa = chartOfAccounts.find(c => String(c.id) === String(otherIncomeForm.override_credit_account_id));
                  const debitName = activeDebitCoa ? `[${activeDebitCoa.account_code}] ${activeDebitCoa.account_name}` : 'Kas/Bank Terpilih';
                  const creditName = activeCreditCoa ? `[${activeCreditCoa.account_code}] ${activeCreditCoa.account_name}` : 'Akun Pendapatan Terkait';
                  return (
                    <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-emerald-950">
                      <div>
                        <strong className="text-emerald-900 font-bold">Jurnal Otomatis:</strong> (D) {debitName} &bull; (K) {creditName}
                      </div>
                      <span className="font-mono font-black text-emerald-800 text-xs">
                        Rp {parseFloat(otherIncomeForm.amount || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </form>

            {/* Footer Modal 4: Tombol Batal, Simpan Penerimaan Saja, dan Simpan & Cetak Kwitansi */}
            <div className="flex flex-wrap items-center justify-end gap-2 p-3.5 sm:p-4 border-t border-slate-100 shrink-0 bg-slate-50/90">
              <button
                type="button"
                onClick={() => setOtherIncomeModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingOtherIncome}
                onClick={async () => {
                  if (!otherIncomeForm.notes?.trim()) {
                    alert('Silakan isi Uraian / Keterangan Penerimaan.');
                    return;
                  }
                  if (!otherIncomeForm.amount || parseFloat(otherIncomeForm.amount) <= 0) {
                    alert('Nominal penerimaan harus lebih dari 0.');
                    return;
                  }
                  if (!otherIncomeForm.received_at) {
                    alert('Silakan pilih Tanggal Diterima.');
                    return;
                  }
                  if (!otherIncomeForm.cash_account_id) {
                    alert('Silakan pilih Rekening Kas / Bank Penampung.');
                    return;
                  }
                  if (!otherIncomeForm.override_debit_account_id || !otherIncomeForm.override_credit_account_id) {
                    alert('Pemetaan Akun Akuntansi (Debet & Kredit) wajib dipilih.');
                    return;
                  }

                  try {
                    setSavingOtherIncome(true);
                    const payload = {
                      payer_name: otherIncomeForm.payer_name || null,
                      notes: otherIncomeForm.notes,
                      amount: parseFloat(otherIncomeForm.amount),
                      received_at: otherIncomeForm.received_at,
                      source_category: otherIncomeForm.source_category,
                      budget_plan_income_item_id: otherIncomeForm.budget_plan_income_item_id || null,
                      cash_account_id: otherIncomeForm.cash_account_id,
                      bank_statement_id: otherIncomePaymentMethod === 'bank_transfer' ? (otherIncomeForm.bank_statement_id || null) : null,
                      fund_balance_id: otherIncomeForm.fund_balance_id || null,
                      academic_year_id: activeAcademicYearId || 1,
                      transaction_mapping_id: otherIncomeForm.transaction_mapping_id || null,
                      override_debit_account_id: otherIncomeForm.override_debit_account_id || null,
                      override_credit_account_id: otherIncomeForm.override_credit_account_id || null,
                      override_reason: otherIncomeForm.override_reason || null
                    };

                    await api.post('/keuangan/other-incomes', payload);
                    alert('Penerimaan kas lainnya berhasil dicatat & jurnal otomatis telah dibukukan!');
                    setOtherIncomeModalOpen(false);
                    fetchOtherIncomeData();
                  } catch (err) {
                    alert(err.response?.data?.message || 'Gagal mencatat penerimaan');
                  } finally {
                    setSavingOtherIncome(false);
                  }
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-300" />
                <span>{savingOtherIncome ? 'Menyimpan...' : 'Simpan Penerimaan'}</span>
              </button>
              <button
                type="button"
                disabled={savingOtherIncome}
                onClick={async () => {
                  if (!otherIncomeForm.notes?.trim()) {
                    alert('Silakan isi Uraian / Keterangan Penerimaan.');
                    return;
                  }
                  if (!otherIncomeForm.amount || parseFloat(otherIncomeForm.amount) <= 0) {
                    alert('Nominal penerimaan harus lebih dari 0.');
                    return;
                  }
                  if (!otherIncomeForm.received_at) {
                    alert('Silakan pilih Tanggal Diterima.');
                    return;
                  }
                  if (!otherIncomeForm.cash_account_id) {
                    alert('Silakan pilih Rekening Kas / Bank Penampung.');
                    return;
                  }
                  if (!otherIncomeForm.override_debit_account_id || !otherIncomeForm.override_credit_account_id) {
                    alert('Pemetaan Akun Akuntansi (Debet & Kredit) wajib dipilih.');
                    return;
                  }

                  try {
                    setSavingOtherIncome(true);
                    const payload = {
                      payer_name: otherIncomeForm.payer_name || null,
                      notes: otherIncomeForm.notes,
                      amount: parseFloat(otherIncomeForm.amount),
                      received_at: otherIncomeForm.received_at,
                      source_category: otherIncomeForm.source_category,
                      budget_plan_income_item_id: otherIncomeForm.budget_plan_income_item_id || null,
                      cash_account_id: otherIncomeForm.cash_account_id,
                      bank_statement_id: otherIncomePaymentMethod === 'bank_transfer' ? (otherIncomeForm.bank_statement_id || null) : null,
                      fund_balance_id: otherIncomeForm.fund_balance_id || null,
                      academic_year_id: activeAcademicYearId || 1,
                      transaction_mapping_id: otherIncomeForm.transaction_mapping_id || null,
                      override_debit_account_id: otherIncomeForm.override_debit_account_id || null,
                      override_credit_account_id: otherIncomeForm.override_credit_account_id || null,
                      override_reason: otherIncomeForm.override_reason || null
                    };

                    const res = await api.post('/keuangan/other-incomes', payload);
                    alert('Penerimaan kas lainnya berhasil dicatat & jurnal otomatis telah dibukukan!');
                    setOtherIncomeModalOpen(false);
                    fetchOtherIncomeData();

                    if (res.data?.data) {
                      openOtherIncomeReceiptInNewTab(res.data.data, activeSchoolUnit?.name);
                    }
                  } catch (err) {
                    alert(err.response?.data?.message || 'Gagal mencatat penerimaan');
                  } finally {
                    setSavingOtherIncome(false);
                  }
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{savingOtherIncome ? 'Menyimpan...' : 'Simpan & Cetak Kwitansi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4B: EDIT / KOREKSI PENERIMAAN LAINNYA                    */}
      {/* ============================================================== */}
      {editOtherIncomeModalOpen && selectedOtherIncomeForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Edit / Koreksi Penerimaan Kas Lainnya</h3>
                  <p className="text-[11px] text-slate-400">
                    No. BKM: <strong className="text-slate-700 font-mono">{editOtherIncomeForm.receipt_number}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setEditOtherIncomeModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={(e) => { e.preventDefault(); }} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs overscroll-contain">

              {/* Pilihan Metode Pembayaran: Tunai vs Non-Tunai (Transfer Bank) */}
              <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
                <label className="text-xs font-bold text-slate-700">Metode Pembayaran:</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                    <input
                      type="radio"
                      name="editOtherIncomePaymentMethodRadio"
                      checked={editOtherIncomePaymentMethod === 'cash'}
                      onChange={() => {
                        setEditOtherIncomePaymentMethod('cash');
                        setEditOtherIncomeForm(p => ({ ...p, bank_statement_id: '' }));
                        const currentAcc = cashAccounts.find(a => String(a.id) === String(editOtherIncomeForm.cash_account_id));
                        if (!currentAcc || currentAcc.account_kind !== 'cash') {
                          const defaultCash = cashAccounts.find(a => a.account_kind === 'cash' && a.is_active) ||
                                              cashAccounts.find(a => a.account_kind === 'cash') ||
                                              cashAccounts[0];
                          if (defaultCash) {
                            handleOtherIncomeCashAccountChange(String(defaultCash.id), true);
                          }
                        }
                      }}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Tunai (Kasir Loket)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                    <input
                      type="radio"
                      name="editOtherIncomePaymentMethodRadio"
                      checked={editOtherIncomePaymentMethod === 'bank_transfer'}
                      onChange={() => {
                        setEditOtherIncomePaymentMethod('bank_transfer');
                        const currentAcc = cashAccounts.find(a => String(a.id) === String(editOtherIncomeForm.cash_account_id));
                        if (!currentAcc || currentAcc.account_kind !== 'bank') {
                          const defaultBank = cashAccounts.find(a => a.account_kind === 'bank' && a.name?.toLowerCase().includes('penerimaan')) ||
                                              cashAccounts.find(a => a.account_kind === 'bank' && a.is_active) ||
                                              cashAccounts.find(a => a.account_kind === 'bank');
                          if (defaultBank) {
                            handleOtherIncomeCashAccountChange(String(defaultBank.id), true);
                          }
                        }
                      }}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Non-Tunai (Transfer Bank)</span>
                  </label>
                </div>
              </div>

              {/* Pos RAPBS & Kategori Sumber (Diletakkan di Awal untuk Otomatisasi Isian Lainnya) */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50/60 to-slate-50 rounded-xl border border-indigo-200/90 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-700" />
                      <span>Pos Mata Anggaran RAPBS (Rencana Anggaran)</span>
                    </label>
                    {editOtherIncomeForm.budget_plan_income_item_id ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-full animate-in fade-in duration-150">
                        ✨ Otomatis Menyesuaikan Uraian, Kas &amp; Jurnal
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Penerimaan Bebas (Non-RAPBS)
                      </span>
                    )}
                  </div>
                  <SearchableSelect
                    options={otherIncomeRapbsOptions}
                    value={editOtherIncomeForm.budget_plan_income_item_id}
                    onChange={(val) => handleOtherIncomeRapbsSelect(val, true)}
                    placeholder="-- Di Luar Perencanaan RAPBS (Penerimaan Bebas) --"
                    searchPlaceholder="Cari pos RAPBS, pagu, atau kategori..."
                    accentColor="indigo"
                    allowClear={true}
                  />
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    💡 <em>Memilih pos RAPBS otomatis menentukan nama uraian, rekening kas penampung, kantong dana, serta akun jurnal akuntansi.</em>
                  </p>
                </div>

                {/* Input Kategori Sumber Penerimaan hanya tampil jika Di Luar Perencanaan RAPBS */}
                {!editOtherIncomeForm.budget_plan_income_item_id && (
                  <div className="pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                    <label className="block font-bold text-slate-700 mb-1 text-xs">
                      Kategori Sumber Penerimaan <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      options={otherIncomeCategoryOptions}
                      value={editOtherIncomeForm.source_category}
                      onChange={(val) => handleOtherIncomeSourceCategoryChange(val, true)}
                      placeholder="-- Pilih Kategori Sumber Penerimaan --"
                      searchPlaceholder="Cari kategori sumber..."
                      accentColor="indigo"
                      allowClear={false}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Pilih klasifikasi kategori sumber penerimaan di luar perencanaan RAPBS.
                    </p>
                  </div>
                )}
              </div>

              {/* Baris: Uraian & Penyetor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Uraian / Keterangan Penerimaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editOtherIncomeForm.notes}
                    onChange={(e) => setEditOtherIncomeForm(p => ({ ...p, notes: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 transition font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Penyetor / Sumber Dana</label>
                  <input
                    type="text"
                    value={editOtherIncomeForm.payer_name}
                    onChange={(e) => setEditOtherIncomeForm(p => ({ ...p, payer_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Baris: Rekening Kas Penampung & Kantong Dana */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Rekening Kas / Bank Penampung <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={otherIncomeCashAccountOptions}
                    value={editOtherIncomeForm.cash_account_id}
                    onChange={(val) => handleOtherIncomeCashAccountChange(val, true)}
                    placeholder="-- Pilih Rekening Kas/Bank --"
                    searchPlaceholder="Cari nama bank, rekening, atau kode akun..."
                    accentColor="indigo"
                    allowClear={false}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Otomatis tersinkronisasi dengan akun kas debet akuntansi
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kantong Dana Terkait
                  </label>
                  <SearchableSelect
                    options={otherIncomeFundBalanceSelectOptions}
                    value={editOtherIncomeForm.fund_balance_id}
                    onChange={(val) => setEditOtherIncomeForm(p => ({ ...p, fund_balance_id: val }))}
                    placeholder="-- Otomatis Sesuai Pos RAPBS / Bebas --"
                    searchPlaceholder="Cari kantong dana..."
                    accentColor="indigo"
                    allowClear={true}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {editOtherIncomeForm.budget_plan_income_item_id ? 'Terkoneksi langsung ke mata anggaran RAPBS' : 'Mengikuti alokasi kantong dana yang dipilih'}
                  </p>
                </div>
              </div>

              {/* Referensi Mutasi Rekening Koran (Jika Nontunai / Transfer Bank) */}
              {editOtherIncomePaymentMethod === 'bank_transfer' && (
                <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Referensi Mutasi Rekening Koran (Nontunai)</span>
                    </label>
                    <span className="text-[10px] text-indigo-700 font-semibold">
                      💡 1 Mutasi Rekening Koran = 1 Kwitansi
                    </span>
                  </div>
                  <SearchableSelect
                    options={editOtherIncomeBankStatementsOptions}
                    value={editOtherIncomeForm.bank_statement_id}
                    onChange={(val) => handleOtherIncomeBankStatementSelect(val, true)}
                    onDisabledSelect={(opt) => setBlockedStatementModal(opt)}
                    placeholder="-- Pilih Mutasi Rekening Koran Masuk --"
                    searchPlaceholder="Ketik nominal, nomor referensi, atau uraian mutasi bank..."
                    accentColor="indigo"
                    allowClear={true}
                    isLoading={loadingEditOtherIncomeBankStatements}
                    emptyText="Tidak ada mutasi kredit rekening koran yang tersedia untuk akun bank ini"
                  />

                  {/* Card Rincian Mutasi Terpilih */}
                  {(() => {
                    const selectedOpt = editOtherIncomeBankStatementsOptions.find(o => String(o.value) === String(editOtherIncomeForm.bank_statement_id));
                    if (!selectedOpt) return null;
                    return (
                      <div className="p-2.5 bg-white border border-indigo-300 rounded-xl text-[10.5px] space-y-1.5 text-slate-700 shadow-2xs animate-in fade-in duration-150">
                        <div className="flex items-center justify-between font-bold gap-2">
                          <span className="text-indigo-900 flex items-center gap-1 truncate">
                            <span>🔗 RK Terpilih:</span>
                            <span className="truncate">{selectedOpt.desc}</span>
                          </span>
                          <span className="tnum text-indigo-800 shrink-0">
                            Plafon: {formatCurrency(selectedOpt.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 text-[10px] gap-2">
                          <span>Tgl: <b className="text-slate-800">{selectedOpt.rawDate || '-'}</b> {selectedOpt.refNo ? `• Ref: ${selectedOpt.refNo}` : ''} • Teralokasi: <b>{formatCurrency(selectedOpt.allocated_amount || 0)}</b></span>
                          <span className="text-indigo-700 font-bold tnum shrink-0">
                            Sisa Plafon: {formatCurrency(selectedOpt.remaining_amount || selectedOpt.amount)}
                          </span>
                        </div>
                        <StatementMatchIndicator
                          inputAmount={editOtherIncomeForm.amount}
                          statement={selectedOpt}
                          onSyncAmount={(amt) => setEditOtherIncomeForm(p => ({ ...p, amount: String(amt) }))}
                          isCompact={false}
                        />
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Baris: Nominal & Tanggal Diterima */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nominal Penerimaan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editOtherIncomeForm.amount}
                    onChange={(e) => setEditOtherIncomeForm(p => ({ ...p, amount: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-emerald-800 text-sm focus:bg-white focus:border-indigo-500 transition"
                  />
                  {editOtherIncomeForm.amount && parseFloat(editOtherIncomeForm.amount) > 0 && (
                    <div className="mt-1 text-[11px] text-emerald-700 font-semibold italic">
                      # {terbilang(editOtherIncomeForm.amount)} Rupiah #
                    </div>
                  )}
                </div>
                <div>
                  <DatePickerField
                    label="Tanggal Diterima *"
                    value={editOtherIncomeForm.received_at}
                    onChange={(iso) => setEditOtherIncomeForm(p => ({ ...p, received_at: iso }))}
                    placeholder="DD/MM/YYYY"
                    required
                  />
                </div>
              </div>

              {/* Baris 5: Pemetaan Akun Akuntansi & Aturan Transaksi */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">
                        Pemetaan Akun Akuntansi &amp; Aturan Transaksi
                      </span>
                      <span className="text-[10px] text-indigo-700 font-medium">
                        Otomatis terisi dari RAPBS / Rekening Kas (Tetap dapat diedit)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1 text-[11px]">
                      Aturan Transaksi Kas Masuk
                    </label>
                    <SearchableSelect
                      options={otherIncomeTransactionRuleOptions}
                      value={editOtherIncomeForm.transaction_mapping_id}
                      onChange={(val) => {
                        const r = transactionRules.find(x => String(x.id) === String(val));
                        setEditOtherIncomeForm(p => ({
                          ...p,
                          transaction_mapping_id: val,
                          override_credit_account_id: r?.credit_account_id ? String(r.credit_account_id) : p.override_credit_account_id,
                          override_debit_account_id: r?.debit_account_id ? String(r.debit_account_id) : p.override_debit_account_id
                        }));
                      }}
                      placeholder="-- Pilih Aturan Transaksi Kas Masuk --"
                      searchPlaceholder="Cari aturan transaksi kas masuk..."
                      accentColor="indigo"
                      allowClear={true}
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1 text-[11px]">
                      Akun Kas / Bank (Debet) <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      options={otherIncomeDebitCoaOptions}
                      value={editOtherIncomeForm.override_debit_account_id}
                      onChange={(val) => setEditOtherIncomeForm(p => ({ ...p, override_debit_account_id: val }))}
                      placeholder="-- Pilih Akun Kas / Bank (COA Debet) --"
                      searchPlaceholder="Cari kode akun atau nama kas/bank..."
                      accentColor="indigo"
                      allowClear={false}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-medium text-slate-700 mb-1 text-[11px]">
                      Akun Pendapatan (Kredit) <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      options={otherIncomeCreditCoaOptions}
                      value={editOtherIncomeForm.override_credit_account_id}
                      onChange={(val) => setEditOtherIncomeForm(p => ({ ...p, override_credit_account_id: val }))}
                      placeholder="-- Pilih Akun Pendapatan (COA Grup 4/6) --"
                      searchPlaceholder="Cari kode akun atau nama pendapatan..."
                      accentColor="indigo"
                      allowClear={false}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-medium text-slate-600 mb-1 text-[11px]">
                      Catatan / Alasan Penyesuaian Akun (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Koreksi akun pendapatan unit usaha"
                      value={editOtherIncomeForm.override_reason}
                      onChange={(e) => setEditOtherIncomeForm(p => ({ ...p, override_reason: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Box Info Jurnal Preview Dinamis */}
                {(() => {
                  const activeDebitCoa = chartOfAccounts.find(c => String(c.id) === String(editOtherIncomeForm.override_debit_account_id));
                  const activeCreditCoa = chartOfAccounts.find(c => String(c.id) === String(editOtherIncomeForm.override_credit_account_id));
                  const debitName = activeDebitCoa ? `[${activeDebitCoa.account_code}] ${activeDebitCoa.account_name}` : 'Kas/Bank Terpilih';
                  const creditName = activeCreditCoa ? `[${activeCreditCoa.account_code}] ${activeCreditCoa.account_name}` : 'Akun Pendapatan Terkait';
                  return (
                    <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-indigo-950">
                      <div>
                        <strong className="text-indigo-900 font-bold">Jurnal Otomatis:</strong> (D) {debitName} &bull; (K) {creditName}
                      </div>
                      <span className="font-mono font-black text-indigo-800 text-xs">
                        Rp {parseFloat(editOtherIncomeForm.amount || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  );
                })()}
              </div>

            </form>

            {/* Footer Modal 4B: Tombol Batal, Simpan Koreksi Saja, dan Simpan & Cetak Ulang Kwitansi */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2 shrink-0 bg-slate-50/90">
              <button
                type="button"
                onClick={() => setEditOtherIncomeModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingOtherIncome}
                onClick={async () => {
                  if (!editOtherIncomeForm.notes?.trim()) {
                    alert('Silakan isi Uraian / Keterangan Penerimaan.');
                    return;
                  }
                  if (!editOtherIncomeForm.amount || parseFloat(editOtherIncomeForm.amount) <= 0) {
                    alert('Nominal penerimaan harus lebih dari 0.');
                    return;
                  }
                  if (!editOtherIncomeForm.received_at) {
                    alert('Silakan pilih Tanggal Diterima.');
                    return;
                  }
                  if (!editOtherIncomeForm.cash_account_id) {
                    alert('Silakan pilih Rekening Kas / Bank Penampung.');
                    return;
                  }
                  if (!editOtherIncomeForm.override_debit_account_id || !editOtherIncomeForm.override_credit_account_id) {
                    alert('Pemetaan Akun Akuntansi (Debet & Kredit) wajib dipilih.');
                    return;
                  }

                  try {
                    setSavingOtherIncome(true);
                    const payload = {
                      payer_name: editOtherIncomeForm.payer_name || null,
                      notes: editOtherIncomeForm.notes,
                      amount: parseFloat(editOtherIncomeForm.amount),
                      received_at: editOtherIncomeForm.received_at,
                      source_category: editOtherIncomeForm.source_category,
                      budget_plan_income_item_id: editOtherIncomeForm.budget_plan_income_item_id || null,
                      cash_account_id: editOtherIncomeForm.cash_account_id,
                      bank_statement_id: editOtherIncomePaymentMethod === 'bank_transfer' ? (editOtherIncomeForm.bank_statement_id || null) : null,
                      fund_balance_id: editOtherIncomeForm.fund_balance_id || null,
                      academic_year_id: activeAcademicYearId || 1,
                      transaction_mapping_id: editOtherIncomeForm.transaction_mapping_id || null,
                      override_debit_account_id: editOtherIncomeForm.override_debit_account_id || null,
                      override_credit_account_id: editOtherIncomeForm.override_credit_account_id || null,
                      override_reason: editOtherIncomeForm.override_reason || null
                    };

                    await api.put(`/keuangan/other-incomes/${editOtherIncomeForm.id}`, payload);
                    alert('Penerimaan kas lainnya berhasil diperbarui & jurnal otomatis telah disesuaikan!');
                    setEditOtherIncomeModalOpen(false);
                    fetchOtherIncomeData();
                  } catch (err) {
                    alert(err.response?.data?.message || 'Gagal memperbarui penerimaan');
                  } finally {
                    setSavingOtherIncome(false);
                  }
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-300" />
                <span>{savingOtherIncome ? 'Menyimpan...' : 'Simpan Koreksi'}</span>
              </button>
              <button
                type="button"
                disabled={savingOtherIncome}
                onClick={async () => {
                  if (!editOtherIncomeForm.notes?.trim()) {
                    alert('Silakan isi Uraian / Keterangan Penerimaan.');
                    return;
                  }
                  if (!editOtherIncomeForm.amount || parseFloat(editOtherIncomeForm.amount) <= 0) {
                    alert('Nominal penerimaan harus lebih dari 0.');
                    return;
                  }
                  if (!editOtherIncomeForm.received_at) {
                    alert('Silakan pilih Tanggal Diterima.');
                    return;
                  }
                  if (!editOtherIncomeForm.cash_account_id) {
                    alert('Silakan pilih Rekening Kas / Bank Penampung.');
                    return;
                  }
                  if (!editOtherIncomeForm.override_debit_account_id || !editOtherIncomeForm.override_credit_account_id) {
                    alert('Pemetaan Akun Akuntansi (Debet & Kredit) wajib dipilih.');
                    return;
                  }

                  try {
                    setSavingOtherIncome(true);
                    const payload = {
                      payer_name: editOtherIncomeForm.payer_name || null,
                      notes: editOtherIncomeForm.notes,
                      amount: parseFloat(editOtherIncomeForm.amount),
                      received_at: editOtherIncomeForm.received_at,
                      source_category: editOtherIncomeForm.source_category,
                      budget_plan_income_item_id: editOtherIncomeForm.budget_plan_income_item_id || null,
                      cash_account_id: editOtherIncomeForm.cash_account_id,
                      bank_statement_id: editOtherIncomePaymentMethod === 'bank_transfer' ? (editOtherIncomeForm.bank_statement_id || null) : null,
                      fund_balance_id: editOtherIncomeForm.fund_balance_id || null,
                      academic_year_id: activeAcademicYearId || 1,
                      transaction_mapping_id: editOtherIncomeForm.transaction_mapping_id || null,
                      override_debit_account_id: editOtherIncomeForm.override_debit_account_id || null,
                      override_credit_account_id: editOtherIncomeForm.override_credit_account_id || null,
                      override_reason: editOtherIncomeForm.override_reason || null
                    };

                    const res = await api.put(`/keuangan/other-incomes/${editOtherIncomeForm.id}`, payload);
                    alert('Penerimaan kas lainnya berhasil diperbarui & jurnal otomatis telah disesuaikan!');
                    setEditOtherIncomeModalOpen(false);
                    fetchOtherIncomeData();

                    if (res.data?.data) {
                      openOtherIncomeReceiptInNewTab(res.data.data, activeSchoolUnit?.name);
                    }
                  } catch (err) {
                    alert(err.response?.data?.message || 'Gagal memperbarui penerimaan');
                  } finally {
                    setSavingOtherIncome(false);
                  }
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{savingOtherIncome ? 'Menyimpan...' : 'Simpan & Cetak Kwitansi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4C: DETAIL TRANSAKSI PENERIMAAN LAINNYA                  */}
      {/* ============================================================== */}
      {detailOtherIncomeModalOpen && selectedOtherIncomeForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Detail Penerimaan Kas Lainnya</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedOtherIncomeForDetail.receipt_number || `BKM-${selectedOtherIncomeForDetail.id}`}</p>
                </div>
              </div>
              <button onClick={() => setDetailOtherIncomeModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-4 sm:p-5 space-y-3.5 text-xs flex-1 overflow-y-auto overscroll-contain">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Uraian Transaksi:</span>
                  <span className="font-bold text-slate-900 text-right max-w-[240px]">{selectedOtherIncomeForDetail.notes || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Penyetor / Sumber:</span>
                  <span className="font-bold text-slate-800">{selectedOtherIncomeForDetail.payer_name || 'Hamba Allah / Umum'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Tanggal Diterima:</span>
                  <span className="font-semibold text-slate-800">{formatDateToDMY(selectedOtherIncomeForDetail.received_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Pos RAPBS:</span>
                  <span className="font-bold text-indigo-700">{selectedOtherIncomeForDetail.budget_income_name || 'Di Luar Perencanaan RAPBS'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Rekening Kas/Bank:</span>
                  <span className="font-semibold text-slate-800">{selectedOtherIncomeForDetail.cash_account_name || 'Kasir'}</span>
                </div>
                {selectedOtherIncomeForDetail.bank_statement_id ? (
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-950 border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between font-bold text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-900">
                        <span>🔗 Mutasi Rekening Koran:</span>
                        <span className="truncate max-w-[180px]">{selectedOtherIncomeForDetail.bank_statement_desc || 'Mutasi Masuk'}</span>
                      </span>
                      <span className="tnum font-mono">{formatCurrency(selectedOtherIncomeForDetail.bank_statement_amount || selectedOtherIncomeForDetail.amount)}</span>
                    </div>
                    {selectedOtherIncomeForDetail.bank_statement_ref && (
                      <div className="text-[10px] text-emerald-700 font-mono">
                        No. Ref: {selectedOtherIncomeForDetail.bank_statement_ref}
                      </div>
                    )}
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Akun Pendapatan (Kredit):</span>
                  <span className="font-semibold text-slate-800">{selectedOtherIncomeForDetail.credit_account_name ? `${selectedOtherIncomeForDetail.credit_account_code} - ${selectedOtherIncomeForDetail.credit_account_name}` : '60800 Pendapatan Lain-lain'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Aturan Transaksi:</span>
                  <span className="text-slate-700">{selectedOtherIncomeForDetail.rule_label || 'Kas Masuk Default'}</span>
                </div>
                {selectedOtherIncomeForDetail.override_reason && (
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-900 border border-amber-200 text-[11px]">
                    <strong>Catatan Override:</strong> {selectedOtherIncomeForDetail.override_reason}
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Nominal Kas:</span>
                  <span className="text-emerald-700 font-black">{formatCurrency(selectedOtherIncomeForDetail.amount)}</span>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold italic border border-emerald-200">
                Terbilang: # {terbilang(selectedOtherIncomeForDetail.amount)} Rupiah #
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 bg-slate-50/90">
              <button
                type="button"
                onClick={() => setDetailOtherIncomeModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => openOtherIncomeReceiptInNewTab(selectedOtherIncomeForDetail, activeSchoolUnit?.name)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kwitansi BKM</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: PREVIEW GAMBAR BUKTI TRANSFER                         */}
      {/* ============================================================== */}
      {previewProof && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Gambar Bukti Transfer Bank</h3>
              <button onClick={() => setPreviewProof(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full h-80 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
              {previewProof.file_url ? (
                <img src={previewProof.file_url} alt="Bukti Transfer" className="object-contain w-full h-full" />
              ) : (
                <span className="text-xs text-slate-400 italic">File gambar tidak tersedia</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: PERINGATAN REKENING KORAN HABIS TERPAKAI               */}
      {/* ============================================================== */}
      {blockedStatementModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 text-xl font-bold shrink-0 shadow-xs">
                ⛔
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950">Rekening Koran Habis Terpakai</h3>
                <p className="text-[11px] text-rose-700">Mutasi ini tidak dapat dipilih untuk pembayaran</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-[11px]">
                <div className="flex justify-between border-b border-slate-200 pb-1.5 gap-2">
                  <span className="text-slate-500 font-sans shrink-0">Uraian Mutasi:</span>
                  <span className="font-bold text-slate-800 text-right truncate" title={blockedStatementModal.desc}>
                    {blockedStatementModal.desc}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-sans">Tgl & Ref:</span>
                  <span className="font-semibold text-slate-700">
                    {blockedStatementModal.rawDate || '-'} | Ref: {blockedStatementModal.refNo || '-'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-sans">Total Plafon RK:</span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(blockedStatementModal.amount)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-sans">Sudah Teralokasi:</span>
                  <span className="font-bold text-rose-600">
                    {formatCurrency(blockedStatementModal.allocated_amount || blockedStatementModal.amount)}
                  </span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500 font-sans">Sisa Plafon Tersedia:</span>
                  <span className="font-bold text-slate-500">
                    Rp 0 (Habis)
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-xl text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                <span className="text-amber-600 text-base leading-none shrink-0">💡</span>
                <span>
                  Seluruh nominal plafon mutasi rekening koran ini telah habis dialokasikan ke transaksi pembayaran sebelumnya. Silakan pilih baris rekening koran lain yang masih memiliki sisa saldo plafon.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-3 flex justify-end">
              <button
                type="button"
                onClick={() => setBlockedStatementModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Mengerti & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
