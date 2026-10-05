import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import * as XLSX from 'xlsx';
import {
  X,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingBag,
  History,
  Calendar,
  Search,
  Filter,
  Download,
  Loader2,
  RefreshCw,
  Clock,
  Building2,
  BadgeCheck,
  AlertCircle,
  CreditCard,
  Receipt,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

export default function StudentWalletHistoryModal({
  isOpen,
  onClose,
  student,
  apiEndpoint = '/kantin/wallet-transactions',
  onTopUpClick
}) {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'top_up' | 'withdrawal' | 'purchase'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const studentId = student?.student_id || student?.id;
  const studentName = student?.student_name || student?.full_name || student?.name || 'Santri';
  const studentNis = student?.nis || student?.student_no || student?.cached_nis || '-';
  const className = student?.class_group_name || student?.class_name || student?.cached_class_group_name || '-';
  const currentBalance = parseFloat(student?.wallet_balance !== undefined ? student.wallet_balance : (student?.balance || 0));

  const fetchHistory = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const params = {
        student_id: studentId
      };
      if (student?.canteen_student_id) {
        params.canteen_student_id = student.canteen_student_id;
      }
      const res = await api.get(apiEndpoint, { params });
      setTransactions(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching student wallet history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && studentId) {
      fetchHistory();
    } else {
      setTransactions([]);
      setSearch('');
      setTypeFilter('all');
      setDateFrom('');
      setDateTo('');
    }
  }, [isOpen, studentId]);

  // Hitung Agregat Total Mutasi
  const summary = useMemo(() => {
    let totalTopUp = 0;
    let totalWithdrawal = 0;
    let totalPurchase = 0;

    transactions.forEach(t => {
      const amt = parseFloat(t.amount || 0);
      if (t.transaction_type === 'top_up') {
        totalTopUp += amt;
      } else if (t.transaction_type === 'withdrawal') {
        totalWithdrawal += amt;
      } else if (t.transaction_type === 'purchase') {
        totalPurchase += amt;
      }
    });

    return {
      totalTopUp,
      totalWithdrawal,
      totalPurchase,
      netChange: totalTopUp - totalWithdrawal - totalPurchase
    };
  }, [transactions]);

  // Filtered list
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.transaction_type !== typeFilter) {
        return false;
      }
      if (dateFrom && t.occurred_at) {
        const tDate = t.occurred_at.slice(0, 10);
        if (tDate < dateFrom) return false;
      }
      if (dateTo && t.occurred_at) {
        const tDate = t.occurred_at.slice(0, 10);
        if (tDate > dateTo) return false;
      }
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        const desc = (t.notes || '').toLowerCase();
        const journal = (t.journal_number || '').toLowerCase();
        const cash = (t.cash_account_name || '').toLowerCase();
        const ref = (t.reference_number || '').toLowerCase();
        return desc.includes(q) || journal.includes(q) || cash.includes(q) || ref.includes(q);
      }
      return true;
    });
  }, [transactions, typeFilter, dateFrom, dateTo, search]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      alert('Tidak ada data mutasi untuk diekspor');
      return;
    }

    const excelRows = filteredTransactions.map((t, idx) => {
      const isTopUp = t.transaction_type === 'top_up';
      const isWithdrawal = t.transaction_type === 'withdrawal';
      const isPurchase = t.transaction_type === 'purchase';
      const amt = parseFloat(t.amount || 0);

      let typeLabel = 'Lainnya';
      if (isTopUp) typeLabel = 'Top Up Saldo';
      else if (isWithdrawal) typeLabel = 'Tarik Tunai';
      else if (isPurchase) typeLabel = 'Jajan / Belanja Kantin';

      return {
        'No': idx + 1,
        'Tanggal & Jam': t.occurred_at ? new Date(t.occurred_at).toLocaleString('id-ID') : '-',
        'Jenis Transaksi': typeLabel,
        'Uraian / Keterangan': t.notes || (isTopUp ? 'Setoran Top Up' : isWithdrawal ? 'Penarikan Tunai' : 'Belanja Kantin POS'),
        'Rekening Kas / Bank': t.cash_account_name || (t.payment_method === 'cash' ? 'Kas Tunai' : 'Transfer Bank'),
        'No. Jurnal / Ref': t.journal_number || t.bank_statement_ref || '-',
        'Masuk (Rp)': isTopUp ? amt : 0,
        'Keluar (Rp)': !isTopUp ? amt : 0,
        'Saldo Berjalan (Rp)': parseFloat(t.balance_after || 0)
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mutasi Dompet');
    XLSX.writeFile(wb, `Mutasi_Dompet_${studentNis}_${studentName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shadow-inner">
              <History className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-white tracking-tight">
                  Buku Tabungan & Mutasi Dompet Santri
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {className}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-white">{studentName}</span>
                <span>•</span>
                <span>NIS: <b className="font-mono text-indigo-200">{studentNis}</b></span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Cards Summary Ribbon */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Saldo Saat Ini */}
          <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Saldo Dompet Aktif
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-800 block mt-0.5">
              {formatCurrency(currentBalance)}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Status Siap Digunakan</span>
          </div>

          {/* Total Top Up */}
          <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                Total Top Up (+)
              </span>
              <ArrowDownCircle className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-sm sm:text-base font-bold font-mono text-blue-900 block mt-0.5">
              {formatCurrency(summary.totalTopUp)}
            </span>
            <span className="text-[10px] text-blue-600 font-medium">Setoran Kas / Bank</span>
          </div>

          {/* Total Tarik Tunai */}
          <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                Total Tarik Tunai (-)
              </span>
              <ArrowUpCircle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-sm sm:text-base font-bold font-mono text-amber-900 block mt-0.5">
              {formatCurrency(summary.totalWithdrawal)}
            </span>
            <span className="text-[10px] text-amber-600 font-medium">Penarikan Sisa Saldo</span>
          </div>

          {/* Total Jajan / Belanja */}
          <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                Total Belanja POS (-)
              </span>
              <ShoppingBag className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-sm sm:text-base font-bold font-mono text-rose-900 block mt-0.5">
              {formatCurrency(summary.totalPurchase)}
            </span>
            <span className="text-[10px] text-rose-600 font-medium">Transaksi Jajan Kantin</span>
          </div>
        </div>

        {/* Filter & Toolbar */}
        <div className="p-3 bg-white border-b border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-2">
          {/* Tabs Filter Kategori */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${typeFilter === 'all' ? 'bg-white text-indigo-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Semua ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('top_up')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${typeFilter === 'top_up' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span>Top Up</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('withdrawal')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${typeFilter === 'withdrawal' ? 'bg-white text-amber-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span>Tarik Tunai</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('purchase')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${typeFilter === 'purchase' ? 'bg-white text-rose-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span>Jajan POS</span>
            </button>
          </div>

          {/* Search, Rentang Tanggal, & Export */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari catatan, kas, jurnal..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 w-44 sm:w-56"
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </button>

            <button
              type="button"
              onClick={fetchHistory}
              disabled={loading}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer disabled:opacity-50"
              title="Muat Ulang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabel Mutasi Buku Tabungan */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-medium">Memuat riwayat mutasi dompet santri...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">Belum Ada Riwayat Transaksi</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Santri ini belum memiliki riwayat mutasi top up, penarikan tunai, atau transaksi belanja kantin.
              </p>
              {onTopUpClick && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTopUpClick(student);
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  + Lakukan Top Up Pertama Sekarang
                </button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3 w-36">Tanggal & Waktu</th>
                    <th className="py-2.5 px-3 w-32">Jenis Transaksi</th>
                    <th className="py-2.5 px-3">Uraian / Keterangan Transaksi</th>
                    <th className="py-2.5 px-3 w-32 text-right">Masuk (+)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Keluar (-)</th>
                    <th className="py-2.5 px-3 w-36 text-right">Saldo Berjalan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTransactions.map((tx, idx) => {
                    const isTopUp = tx.transaction_type === 'top_up';
                    const isWithdrawal = tx.transaction_type === 'withdrawal';
                    const isPurchase = tx.transaction_type === 'purchase';
                    const amt = parseFloat(tx.amount || 0);
                    const runningBal = parseFloat(tx.balance_after || 0);

                    return (
                      <tr
                        key={tx.id || idx}
                        className={`hover:bg-slate-50/80 transition ${isTopUp ? 'bg-blue-50/20' : isWithdrawal ? 'bg-amber-50/20' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap text-[11px]">
                          <div className="font-semibold text-slate-800">
                            {tx.occurred_at ? formatDate(tx.occurred_at) : '-'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {tx.occurred_at ? new Date(tx.occurred_at).toTimeString().slice(0, 5) : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {isTopUp && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <ArrowDownCircle className="w-3 h-3 text-blue-600" />
                              <span>Top Up</span>
                            </span>
                          )}
                          {isWithdrawal && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <ArrowUpCircle className="w-3 h-3 text-amber-600" />
                              <span>Tarik Tunai</span>
                            </span>
                          )}
                          {isPurchase && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <ShoppingBag className="w-3 h-3 text-rose-600" />
                              <span>Jajan POS</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-slate-800 font-semibold leading-snug">
                            {tx.notes || (isTopUp ? 'Setoran Top Up Saldo Dompet' : isWithdrawal ? 'Penarikan Sisa Saldo Dompet' : 'Pembelian / Jajan Kantin')}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-slate-500 flex-wrap">
                            {tx.cash_account_name && (
                              <span className="inline-flex items-center gap-1 font-medium bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                <CreditCard className="w-3 h-3" />
                                <span>{tx.cash_account_name}</span>
                              </span>
                            )}
                            {tx.journal_number && (
                              <span className="font-mono text-slate-400">
                                Jurnal: {tx.journal_number}
                              </span>
                            )}
                            {tx.bank_statement_id && (
                              <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                                <BadgeCheck className="w-3 h-3" /> Rekening Koran
                              </span>
                            )}
                            {tx.is_revised ? (
                              <span className="text-amber-700 font-bold bg-amber-50 px-1 rounded border border-amber-200">
                                (Revisi ke-{tx.revision_count || 1})
                              </span>
                            ) : null}
                          </div>
                        </td>
                        {/* Masuk (+) */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 text-[11.5px]">
                          {isTopUp ? `+${formatCurrency(amt)}` : '—'}
                        </td>
                        {/* Keluar (-) */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700 text-[11.5px]">
                          {!isTopUp ? `-${formatCurrency(amt)}` : '—'}
                        </td>
                        {/* Saldo Berjalan (Running Balance) */}
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-800 bg-slate-50/50 text-xs">
                          {formatCurrency(runningBal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan <b>{filteredTransactions.length}</b> dari <b>{transactions.length}</b> riwayat transaksi
          </div>
          <div className="flex items-center gap-2">
            {onTopUpClick && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTopUpClick(student);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>+ Top Up / Tarik Tunai</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
