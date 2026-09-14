import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Users,
  QrCode,
  KeyRound,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Printer,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

export default function DataSiswaKantin() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStudentQr, setSelectedStudentQr] = useState(null);
  const [pinModalData, setPinModalData] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/kantin/canteen-students');
      setStudents(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleGenerateQr = async (studentId) => {
    try {
      const res = await api.post(`/kantin/canteen-students/${studentId}/generate-qr`);
      setSelectedStudentQr(res.data.data);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal generate QR');
    }
  };

  const handleResetChildPin = async (studentId) => {
    if (!window.confirm('Reset PIN anak untuk santri ini?')) return;
    try {
      const res = await api.post(`/kantin/canteen-students/${studentId}/reset-child-pin`);
      setPinModalData({
        title: 'PIN Anak Berhasil Direset',
        pin: res.data.data.new_pin,
        note: 'Berikan PIN baru ini kepada santri untuk transaksi dompet di kasir.'
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal reset PIN');
    }
  };

  const handleResetParentPin = async (studentId) => {
    if (!window.confirm('Reset PIN orangtua untuk santri ini?')) return;
    try {
      const res = await api.post(`/kantin/canteen-students/${studentId}/reset-parent-pin`);
      setPinModalData({
        title: 'PIN Orangtua Berhasil Direset',
        pin: res.data.data.new_pin,
        note: 'Berikan PIN baru ini kepada orangtua santri untuk akses Portal Orangtua.'
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal reset PIN');
    }
  };

  const handleToggleStatus = async (studentId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/kantin/canteen-students/${studentId}/status`, {
        status: nextStatus
      });
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal update status');
    }
  };

  const filteredStudents = students.filter(s =>
    s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.class_group_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.qr_code?.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Data Santri & Dompet Kantin</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola kode QR transaksi santri, reset PIN keamanan, dan monitoring status blokir orangtua
          </p>
        </div>
      </div>

      {/* Control Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama santri, rombel, kode QR..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Total: <span className="font-bold text-slate-700">{filteredStudents.length}</span> Santri Terdaftar
        </div>
      </div>

      {/* Table Santri Kantin */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data santri...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Santri & Rombel</th>
                  <th className="px-4 py-3">Kode QR</th>
                  <th className="px-4 py-3">Saldo Dompet</th>
                  <th className="px-4 py-3">Limit Kustom</th>
                  <th className="px-4 py-3">Blokir Ortu</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi Keamanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.student_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{s.student_name}</p>
                      <p className="text-[11px] text-slate-400">{s.class_group_name || 'Rombel -'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {s.qr_code ? (
                        <button
                          type="button"
                          onClick={() => setSelectedStudentQr(s)}
                          className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 w-fit"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>{s.qr_code}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleGenerateQr(s.student_id)}
                          className="text-[10px] text-amber-600 hover:underline font-semibold"
                        >
                          + Generate QR
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                      Rp{s.wallet_balance.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">
                      {s.custom_daily_limit ? `Rp${s.custom_daily_limit.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {s.is_blocked_by_parent ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-fit">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Diblokir</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(s.student_id, s.status)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize transition ${
                          s.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {s.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleResetChildPin(s.student_id)}
                          title="Reset PIN Anak"
                          className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg text-[11px] font-semibold transition"
                        >
                          PIN Anak
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetParentPin(s.student_id)}
                          title="Reset PIN Ortu"
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                        >
                          PIN Ortu
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                      Tidak ada data santri ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal QR Code */}
      {selectedStudentQr && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-100 text-center space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Kartu QR Santri</h3>
              <button
                type="button"
                onClick={() => setSelectedStudentQr(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 border-2 border-dashed border-amber-300 rounded-xl space-y-3">
              <div className="w-32 h-32 bg-white border border-slate-200 rounded-xl mx-auto flex flex-col items-center justify-center shadow-xs">
                <QrCode className="w-20 h-20 text-slate-800" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">{selectedStudentQr.student_name}</p>
                <p className="text-xs text-slate-500">{selectedStudentQr.class_group_name}</p>
                <p className="font-mono text-xs font-bold text-amber-700 mt-1">{selectedStudentQr.qr_code}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kartu</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudentQr(null)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Notifikasi Reset PIN */}
      {pinModalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">{pinModalData.title}</h3>
              <p className="text-xs text-slate-500">{pinModalData.note}</p>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl font-mono text-2xl font-black text-slate-800 tracking-widest">
              {pinModalData.pin}
            </div>

            <button
              type="button"
              onClick={() => setPinModalData(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
            >
              Saya Sudah Mencatat PIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
