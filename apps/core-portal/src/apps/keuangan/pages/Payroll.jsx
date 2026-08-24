import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Coins,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  Calendar,
  Wallet
} from 'lucide-react';

export default function Payroll() {
  const [disbursements, setDisbursements] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [disbursingId, setDisbursingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, cashRes] = await Promise.all([
        api.get('/keuangan/payroll-disbursements'),
        api.get('/keuangan/cash-accounts')
      ]);
      setDisbursements(payRes.data?.data || []);
      setCashAccounts(cashRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching payroll disbursements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDisburse = async (id) => {
    const defaultCash = cashAccounts[0]?.id || 1;
    if (!window.confirm('Konfirmasi pencairan dana gaji pegawai ini? Jurnal beban gaji & pengeluaran kas akan otomatis dicatat.')) return;

    setDisbursingId(id);
    try {
      await api.post(`/keuangan/payroll-disbursements/${id}/disburse`, {
        cash_account_id: defaultCash
      });
      alert('Pencairan gaji berhasil dieksekusi & dibukukan ke jurnal!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencairkan gaji');
    } finally {
      setDisbursingId(null);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pencairan Gaji & Honorarium Pegawai</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Eksekusi pencairan payroll dari modul Kepegawaian & pencatatan jurnal beban gaji otomatis
          </p>
        </div>
      </div>

      {/* Table Payroll */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data payroll...</p>
          </div>
        ) : disbursements.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            Belum ada data antrian pencairan gaji dari modul Kepegawaian
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Nama Pegawai / Guru</th>
                  <th className="px-5 py-3">NIP / ID</th>
                  <th className="px-5 py-3">Periode Gaji</th>
                  <th className="px-5 py-3 text-right">Nominal Bersih (Take Home Pay)</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disbursements.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-800">{d.employee_name}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">{d.employee_number || `EMP#${d.employee_id}`}</td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">Bulan {d.period_month}/{d.period_year}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-800">{formatCurrency(d.amount)}</td>
                    <td className="px-5 py-3.5">
                      {d.status === 'disbursed' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Sudah Dicairkan
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" /> Menunggu Pencairan
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {d.status !== 'disbursed' && (
                        <button
                          type="button"
                          disabled={disbursingId === d.id}
                          onClick={() => handleDisburse(d.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1 ml-auto"
                        >
                          {disbursingId === d.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Cairkan Gaji</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
