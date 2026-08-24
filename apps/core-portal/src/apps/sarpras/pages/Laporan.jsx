import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  BarChart3,
  TrendingDown,
  FileSpreadsheet,
  Printer,
  Calendar,
  Layers,
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function Laporan() {
  const [activeTab, setActiveTab] = useState('condition'); // 'condition', 'depreciation'
  const [conditionData, setConditionData] = useState(null);
  const [depreciationData, setDepreciationData] = useState(null);
  const [usefulLife, setUsefulLife] = useState(5);
  const [loading, setLoading] = useState(false);

  const fetchConditionReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sarpras/reports/asset-condition');
      if (res.data.success) {
        setConditionData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching condition report:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepreciationReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sarpras/reports/asset-depreciation?useful_life_years=${usefulLife}`);
      if (res.data.success) {
        setDepreciationData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching depreciation report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'condition') {
      fetchConditionReport();
    } else {
      fetchDepreciationReport();
    }
  }, [activeTab, usefulLife]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Laporan Kondisi & Penyusutan Aset</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis kelayakan fisik dan perhitungan depresiasi aset metode garis lurus (Straight-Line)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('condition')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'condition'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Laporan Kondisi Fisik</span>
        </button>
        <button
          onClick={() => setActiveTab('depreciation')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'depreciation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Penyusutan Nilai Buku (Depresiasi)</span>
        </button>
      </div>

      {/* Tab 1: Kondisi Fisik */}
      {activeTab === 'condition' && conditionData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Total Aset</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{conditionData.summary?.total_assets || 0} Unit</h3>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <p className="text-xs text-emerald-700 font-medium">Kondisi Baik</p>
              <h3 className="text-xl font-bold text-emerald-800 mt-1">{conditionData.summary?.baik || 0} Unit</h3>
            </div>
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-xs">
              <p className="text-xs text-amber-700 font-medium">Rusak Ringan</p>
              <h3 className="text-xl font-bold text-amber-800 mt-1">{conditionData.summary?.rusak_ringan || 0} Unit</h3>
            </div>
            <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200 shadow-xs">
              <p className="text-xs text-rose-700 font-medium">Rusak Berat</p>
              <h3 className="text-xl font-bold text-rose-800 mt-1">{conditionData.summary?.rusak_berat || 0} Unit</h3>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Kode Aset</th>
                    <th className="px-4 py-3">Nama Barang</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3 text-right">Nilai Perolehan</th>
                    <th className="px-4 py-3">Tgl Perolehan</th>
                    <th className="px-4 py-3 text-center">Status Kondisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conditionData.assets?.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{a.asset_code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{a.name}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{a.category || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {a.acquisition_value ? `Rp ${Number(a.acquisition_value).toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.acquisition_date || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          a.condition === 'baik'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : a.condition === 'rusak_ringan'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {a.condition}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Depresiasi Nilai Buku */}
      {activeTab === 'depreciation' && depreciationData && (
        <div className="space-y-6">
          {/* Controls & Summary */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Masa Manfaat Rata-rata:</span>
              <select
                value={usefulLife}
                onChange={(e) => setUsefulLife(Number(e.target.value))}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-indigo-600"
              >
                <option value={3}>3 Tahun</option>
                <option value={4}>4 Tahun</option>
                <option value={5}>5 Tahun (Standar)</option>
                <option value={8}>8 Tahun</option>
                <option value={10}>10 Tahun</option>
              </select>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-500">Nilai Perolehan Total:</span>
                <span className="font-bold text-slate-900 ml-1.5">
                  Rp {Number(depreciationData.summary?.total_acquisition_value || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Akumulasi Penyusutan:</span>
                <span className="font-bold text-rose-600 ml-1.5">
                  Rp {Number(depreciationData.summary?.total_accumulated_depreciation || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Nilai Buku Terkini:</span>
                <span className="font-bold text-emerald-600 ml-1.5">
                  Rp {Number(depreciationData.summary?.total_book_value || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Kode Aset</th>
                    <th className="px-4 py-3">Nama Barang</th>
                    <th className="px-4 py-3 text-center">Usia (Bulan)</th>
                    <th className="px-4 py-3 text-right">Nilai Perolehan</th>
                    <th className="px-4 py-3 text-right">Penyusutan / Thn</th>
                    <th className="px-4 py-3 text-right">Akumulasi Susut</th>
                    <th className="px-4 py-3 text-right">Nilai Buku Saat Ini</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depreciationData.depreciation_list?.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{d.asset_code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{d.name}</td>
                      <td className="px-4 py-3 text-center text-slate-600 font-mono">{d.age_in_months} Bln</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        Rp {Number(d.acquisition_value).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        Rp {Number(d.annual_depreciation).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-rose-600">
                        Rp {Number(d.accumulated_depreciation).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        Rp {Number(d.book_value).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
