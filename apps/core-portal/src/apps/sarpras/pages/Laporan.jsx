import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import DataTable from '../../../shared/components/DataTable';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import LoadingSkeleton from '../../../shared/components/LoadingSkeleton';
import { formatCurrency, formatDate, formatNumber } from '../../../shared/utils/formatters';
import {
  BarChart3,
  TrendingDown,
  Printer,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Coins
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
      if (res.data?.success) {
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
      if (res.data?.success) {
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

  // Columns for condition report
  const conditionColumns = useMemo(() => [
    {
      key: 'asset_code',
      header: 'Kode Aset',
      sortable: true,
      className: 'w-36 font-mono font-bold text-slate-800',
      render: (row) => row.asset_code
    },
    {
      key: 'name',
      header: 'Nama Barang',
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-800">{row.name}</span>
    },
    {
      key: 'category',
      header: 'Kategori',
      sortable: true,
      render: (row) => (
        <span className="capitalize text-slate-600 text-xs">
          {row.category || '-'}
        </span>
      )
    },
    {
      key: 'acquisition_value',
      header: 'Nilai Perolehan',
      sortable: true,
      align: 'right',
      className: 'num-cell font-medium text-slate-700',
      render: (row) => row.acquisition_value ? formatCurrency(row.acquisition_value) : '-'
    },
    {
      key: 'acquisition_date',
      header: 'Tgl Perolehan',
      sortable: true,
      className: 'w-28 text-slate-600 text-xs',
      render: (row) => formatDate(row.acquisition_date)
    },
    {
      key: 'condition',
      header: 'Status Kondisi',
      align: 'center',
      className: 'w-28 text-center',
      render: (row) => <StatusPill status={row.condition || 'baik'} />
    }
  ], []);

  // Columns for depreciation report
  const depreciationColumns = useMemo(() => [
    {
      key: 'asset_code',
      header: 'Kode Aset',
      sortable: true,
      className: 'w-36 font-mono font-bold text-slate-800',
      render: (row) => row.asset_code
    },
    {
      key: 'name',
      header: 'Nama Barang',
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-800">{row.name}</span>
    },
    {
      key: 'age_in_months',
      header: 'Usia (Bulan)',
      sortable: true,
      align: 'center',
      className: 'w-28 text-center text-slate-600 font-mono',
      render: (row) => `${row.age_in_months || 0} Bln`
    },
    {
      key: 'acquisition_value',
      header: 'Nilai Perolehan',
      sortable: true,
      align: 'right',
      className: 'num-cell font-medium text-slate-700',
      render: (row) => formatCurrency(row.acquisition_value)
    },
    {
      key: 'annual_depreciation',
      header: 'Penyusutan / Thn',
      sortable: true,
      align: 'right',
      className: 'num-cell text-slate-600',
      render: (row) => formatCurrency(row.annual_depreciation)
    },
    {
      key: 'accumulated_depreciation',
      header: 'Akumulasi Susut',
      sortable: true,
      align: 'right',
      className: 'num-cell font-medium text-rose-600',
      render: (row) => formatCurrency(row.accumulated_depreciation)
    },
    {
      key: 'book_value',
      header: 'Nilai Buku Saat Ini',
      sortable: true,
      align: 'right',
      className: 'num-cell font-bold text-emerald-700',
      render: (row) => formatCurrency(row.book_value)
    }
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Laporan Kondisi & Penyusutan Aset</h1>
          <p className="text-xs text-slate-500 mt-1">
            Analisis kelayakan fisik dan perhitungan depresiasi aset metode garis lurus (Straight-Line)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('condition')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'condition'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Laporan Kondisi Fisik</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('depreciation')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'depreciation'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Penyusutan Nilai Buku (Depresiasi)</span>
        </button>
      </div>

      {/* Tab 1: Kondisi Fisik */}
      {activeTab === 'condition' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {loading && !conditionData ? (
            <LoadingSkeleton type="card" count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <StatRibbonCard
                title="Total Aset"
                value={`${formatNumber(conditionData?.summary?.total_assets || 0)} Unit`}
                subtitle="Inventaris Keseluruhan"
                icon={Boxes}
                variant="slate"
              />
              <StatRibbonCard
                title="Kondisi Baik"
                value={`${formatNumber(conditionData?.summary?.baik || 0)} Unit`}
                subtitle="Siap Digunakan"
                icon={CheckCircle2}
                variant="emerald"
              />
              <StatRibbonCard
                title="Rusak Ringan"
                value={`${formatNumber(conditionData?.summary?.rusak_ringan || 0)} Unit`}
                subtitle="Perlu Perbaikan"
                icon={AlertTriangle}
                variant="amber"
              />
              <StatRibbonCard
                title="Rusak Berat"
                value={`${formatNumber(conditionData?.summary?.rusak_berat || 0)} Unit`}
                subtitle="Tidak Dapat Dipakai"
                icon={XCircle}
                variant="rose"
              />
            </div>
          )}

          {/* Table */}
          <DataTable
            columns={conditionColumns}
            data={conditionData?.assets || []}
            loading={loading}
            emptyTitle="Tidak Ada Data Aset"
            emptyDescription="Belum ada data kondisi aset fisik yang tercatat."
          />
        </div>
      )}

      {/* Tab 2: Depresiasi Nilai Buku */}
      {activeTab === 'depreciation' && (
        <div className="space-y-6">
          {/* Controls & Summary */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Masa Manfaat Rata-rata:</span>
              <select
                value={usefulLife}
                onChange={(e) => setUsefulLife(Number(e.target.value))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
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
                <span className="font-bold text-slate-900 ml-1.5 num-cell">
                  {formatCurrency(depreciationData?.summary?.total_acquisition_value || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Akumulasi Penyusutan:</span>
                <span className="font-bold text-rose-600 ml-1.5 num-cell">
                  {formatCurrency(depreciationData?.summary?.total_accumulated_depreciation || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Nilai Buku Terkini:</span>
                <span className="font-bold text-emerald-600 ml-1.5 num-cell">
                  {formatCurrency(depreciationData?.summary?.total_book_value || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <DataTable
            columns={depreciationColumns}
            data={depreciationData?.depreciation_list || []}
            loading={loading}
            emptyTitle="Tidak Ada Data Depresiasi"
            emptyDescription="Belum ada perhitungan depresiasi aset untuk masa manfaat ini."
          />
        </div>
      )}
    </div>
  );
}
