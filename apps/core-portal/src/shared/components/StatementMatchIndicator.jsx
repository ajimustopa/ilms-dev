import React from 'react';
import { HelpCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

/**
 * Komponen Indikator Pemeriksaan Kecocokan Nominal Pembayaran vs Mutasi Rekening Koran
 * Standar Enterprise Keuangan Aldepos
 */
export default function StatementMatchIndicator({ inputAmount, statement, onSyncAmount, isCompact = false }) {
  if (!statement) return null;

  const inputVal = parseFloat(inputAmount) || 0;
  const statTotal = parseFloat(statement.amount) || 0;
  const statRemaining = parseFloat(statement.remaining_amount !== undefined ? statement.remaining_amount : statement.amount) || 0;

  // Keadaan / Status Kecocokan
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

  // Detailed Card Banner (Standard Mode)
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
            {isInputEmpty && 'Pemeriksaan: Nominal Transaksi Belum Diisi'}
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

      <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-200/60 pt-1 flex-wrap gap-1">
        <span>Input: <strong className="font-mono text-slate-800">{formatCurrency(inputVal)}</strong></span>
        <span>Teralokasi: <strong className="font-mono text-amber-700">{formatCurrency(statement.allocated_amount || 0)}</strong></span>
        <span>Sisa Plafon RK: <strong className="font-mono text-emerald-700">{formatCurrency(statRemaining)}</strong></span>
      </div>
    </div>
  );
}
