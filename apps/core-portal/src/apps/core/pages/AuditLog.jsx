import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  FileClock,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [search, setSearch] = useState('');
  const [appFilter, setAppFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Modal Detail Diff
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/core/activity-logs/admin', {
        params: {
          search: search || undefined,
          application: appFilter !== 'all' ? appFilter : undefined,
          page: currentPage,
          limit: pageSize,
        },
      });

      if (res.data?.success && res.data.data) {
        setLogs(res.data.data.items || []);
        if (res.data.data.pagination) {
          setTotalPages(res.data.data.pagination.total_pages || 1);
          setTotalItems(res.data.data.pagination.total_items || 0);
        }
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal memuat log audit aktivitas admin'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, appFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const applicationsList = [
    'core',
    'akademik',
    'kepegawaian',
    'keuangan',
    'ppdb',
    'alumni',
    'perpustakaan',
    'bk',
    'sarpras',
    'asrama',
    'tahfidz',
    'lms',
    'portal_ortu',
    'mobile_wali'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Audit Log Aktivitas Lintas Aplikasi</h2>
          <p className="text-xs text-slate-500">
            Rekaman aktivitas administratif terpusat dari seluruh 14 aplikasi sekolah (Fitur #5 & #13).
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition self-start"
          title="Muat Ulang Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari log berdasarkan username, modul, atau aksi..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={appFilter}
            onChange={(e) => {
              setAppFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none uppercase"
          >
            <option value="all">Semua Aplikasi</option>
            {applicationsList.map((app) => (
              <option key={app} value={app}>
                {app}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition shrink-0"
          >
            Cari
          </button>
        </div>
      </form>

      {/* Table Logs */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="table-container">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Waktu & Tanggal</th>
                <th className="px-5 py-3">Pelaku (Admin)</th>
                <th className="px-5 py-3">Aplikasi & Modul</th>
                <th className="px-5 py-3">Aksi</th>
                <th className="px-5 py-3">Satuan Pendidikan</th>
                <th className="px-5 py-3">IP Address</th>
                <th className="px-5 py-3 text-right">Detail Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Memuat log audit...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-slate-400">
                    Tidak ada catatan audit log yang cocok dengan filter
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.occurred_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      {log.admin_username ? `@${log.admin_username}` : `User #${log.user_id || 'System'}`}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-800 uppercase tracking-wide">
                        {log.application}
                      </span>
                      {log.module && (
                        <span className="text-slate-500"> &bull; {log.module}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          log.action.includes('delete')
                            ? 'bg-red-50 text-red-700'
                            : log.action.includes('create')
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[11px] text-slate-600">
                      {log.school_name || (log.school_unit_id ? `Unit #${log.school_unit_id}` : 'Global')}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {log.data_before || log.data_after ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat JSON</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total {totalItems} log aktivitas tercatat
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Detail JSON Diff */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Snapshot Perubahan Data (Log #{selectedLog.id})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Aplikasi: <strong className="uppercase">{selectedLog.application}</strong> &bull; Aksi: {selectedLog.action}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>Data Sebelum (data_before):</span>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto min-h-[120px]">
                    {selectedLog.data_before
                      ? JSON.stringify(selectedLog.data_before, null, 2)
                      : 'null (Tidak ada data sebelumnya / Create)'}
                  </pre>
                </div>

                <div>
                  <div className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Data Sesudah (data_after):</span>
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto min-h-[120px]">
                    {selectedLog.data_after
                      ? JSON.stringify(selectedLog.data_after, null, 2)
                      : 'null (Data dihapus / Delete)'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
