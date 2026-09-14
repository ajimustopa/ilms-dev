import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Receipt,
  User
} from 'lucide-react';

export default function TopUpTarikTunai() {
  const [activeTab, setActiveTab] = useState('top_up'); // 'top_up' | 'withdrawal'
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/kantin/canteen-students?status=active');
      const list = res.data?.data || [];
      setStudents(list);
      if (list.length > 0) setSelectedStudentId(list[0].student_id);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/kantin/wallet-transactions');
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching wallet transactions:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchHistory();
  }, []);

  const selectedStudent = students.find(s => String(s.student_id) === String(selectedStudentId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const endpoint = activeTab === 'top_up'
        ? '/kantin/wallet-transactions/top-up'
        : '/kantin/wallet-transactions/withdrawal';

      const payload = {
        student_id: Number(selectedStudentId),
        amount: parseFloat(amount),
        payment_method: paymentMethod
      };

      const res = await api.post(endpoint, payload);
      setSuccessMsg(
        activeTab === 'top_up'
          ? `Top up sebesar Rp${parseFloat(amount).toLocaleString('id-ID')} berhasil! Saldo baru: Rp${res.data.data.balance_after.toLocaleString('id-ID')}`
          : `Penarikan saldo sebesar Rp${parseFloat(amount).toLocaleString('id-ID')} berhasil! Sisa saldo: Rp${res.data.data.balance_after.toLocaleString('id-ID')}`
      );

      setAmount('');
      fetchStudents();
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memproses transaksi dompet');
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [10000, 20000, 50000, 100000, 200000];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Manajemen Saldo Dompet Santri</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Layanan setoran top-up saldo jajan cashless santri dan penarikan tunai saldo tersisa
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Form Transaksi Dompet (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('top_up');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'top_up'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
              <span>Top Up Saldo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('withdrawal');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'withdrawal'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4 text-amber-600" />
              <span>Tarik Tunai</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Santri</label>
              <SearchableSelect
                options={students.map(s => ({
                  value: String(s.student_id),
                  label: s.student_name,
                  sublabel: `${s.class_group_name || ''} • Saldo: Rp${(s.wallet_balance || 0).toLocaleString('id-ID')}`,
                }))}
                value={String(selectedStudentId)}
                onChange={(val) => setSelectedStudentId(val)}
                placeholder="-- Cari & Pilih Santri --"
                searchPlaceholder="Ketik nama atau kelas santri..."
                emptyText="Santri tidak ditemukan"
              />
            </div>

            {selectedStudent && (
              <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Saldo Saat Ini</p>
                  <h3 className="text-xl font-extrabold text-amber-400 mt-0.5 font-mono">
                    Rp{selectedStudent.wallet_balance.toLocaleString('id-ID')}
                  </h3>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <p className="font-bold text-slate-200">{selectedStudent.student_name}</p>
                  <p>{selectedStudent.class_group_name}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                required
                min={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 50000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:outline-hidden focus:border-amber-500"
              />
              {/* Quick buttons */}
              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {quickAmounts.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(q)}
                    className="py-1 text-[10px] font-bold bg-slate-100 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 hover:text-emerald-900 dark:hover:text-emerald-300 rounded-lg text-slate-600 transition"
                  >
                    {q / 1000}k
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Bayar / Kas</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="cash">Tunai (Kas Kasir)</option>
                <option value="transfer">Transfer Bank</option>
                <option value="qris">QRIS / Online</option>
                <option value="other">Lainnya</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !amount}
              className={`w-full py-3 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                activeTab === 'top_up'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-amber-950/20'
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : activeTab === 'top_up' ? (
                <>
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>Proses Top Up Saldo</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Proses Penarikan Tunai</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: History Log (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-600" />
              <span>Riwayat Mutasi Dompet Terkini</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">50 Mutasi Terakhir</span>
          </div>

          {historyLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
              <p className="text-xs text-slate-400">Memuat riwayat transaksi...</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Waktu</th>
                    <th className="px-4 py-2.5">Santri</th>
                    <th className="px-4 py-2.5">Jenis</th>
                    <th className="px-4 py-2.5">Nominal</th>
                    <th className="px-4 py-2.5">Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-[11px] text-slate-500 font-mono">
                        {tx.occurred_at ? new Date(tx.occurred_at).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">
                        {tx.student_name || `Santri #${tx.student_id}`}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.transaction_type === 'top_up'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.transaction_type === 'withdrawal'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold">
                        <span
                          className={
                            tx.transaction_type === 'top_up'
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }
                        >
                          {tx.transaction_type === 'top_up' ? '+' : '-'}Rp{parseFloat(tx.amount).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-700">
                        Rp{parseFloat(tx.balance_after).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}

                  {history.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400 italic">
                        Belum ada riwayat mutasi dompet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
