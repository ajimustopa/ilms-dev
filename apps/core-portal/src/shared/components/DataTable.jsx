import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronRight,
  CheckSquare,
  Square,
  MinusSquare,
  X
} from 'lucide-react';
import Pagination from './Pagination';
import StatusPill from './StatusPill';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';

/**
 * DataTable — Komponen tabel data generik terstandarisasi.
 * Sesuai Panduan Desain Enterprise Aldepos §4.1, §2, dan §5.
 * 
 * Fitur:
 * - Density: 'compact' (32px row) vs 'comfortable' (40px row)
 * - Sticky columns: kiri (identitas) dan kanan (aksi)
 * - Automatic .num-cell & right alignment untuk kolom tipe 'currency' dan 'number'
 * - Automatic StatusPill untuk tipe 'status'
 * - Row selection & batch action bar
 * - Expandable row render
 * - Sorting terintegrasi (client-side atau server-side callback)
 * - Loading skeleton, inline refreshing banner, error state dengan retry, & contextual empty state
 * - Pagination terintegrasi dengan Pagination.jsx
 */
export default function DataTable({
  columns = [],
  data = [],
  rowKey = 'id',
  density = 'compact',
  stickyColumns = {},
  selectable = false,
  selectedRowKeys = [],
  onSelectChange,
  batchActions,
  sortable = false,
  sortBy: controlledSortBy,
  sortDirection: controlledSortDir = 'asc',
  onSortChange,
  expandableRow,
  loading = false,
  isRefreshing = false,
  error = null,
  onRetry,
  emptyTitle = 'Belum Ada Data',
  emptyMessage,
  emptyDescription,
  emptyAction,
  emptyState,
  pagination,
  onRowClick,
  className = '',
  containerClassName = ''
}) {
  // State lokal untuk sorting jika tidak di-handle dari parent (client-side sort)
  const [internalSortBy, setInternalSortBy] = useState(null);
  const [internalSortDir, setInternalSortDir] = useState('asc');

  // State lokal untuk expandable row
  const [expandedRows, setExpandedRows] = useState(new Set());

  // State lokal untuk selection jika tidak controlled
  const [internalSelectedKeys, setInternalSelectedKeys] = useState([]);

  const isControlledSort = controlledSortBy !== undefined;
  const currentSortBy = isControlledSort ? controlledSortBy : internalSortBy;
  const currentSortDir = isControlledSort ? controlledSortDir : internalSortDir;

  const isControlledSelection = typeof onSelectChange === 'function';
  const currentSelectedKeys = isControlledSelection ? selectedRowKeys : internalSelectedKeys;

  // Helper mendapatkan key unik baris
  const getRowId = (row, idx) => {
    if (typeof rowKey === 'function') return rowKey(row, idx);
    return row[rowKey] !== undefined ? row[rowKey] : idx;
  };

  // Sorting handler
  const handleHeaderClick = (col) => {
    if (!col.sortable && !sortable) return;
    const key = col.key;
    let nextDir = 'asc';
    if (currentSortBy === key) {
      nextDir = currentSortDir === 'asc' ? 'desc' : 'asc';
    }

    if (isControlledSort) {
      onSortChange?.(key, nextDir);
    } else {
      setInternalSortBy(key);
      setInternalSortDir(nextDir);
    }
  };

  // Expand row handler
  const toggleRowExpand = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Selection handlers
  const handleSelectAll = () => {
    const allIds = data.map((r, i) => getRowId(r, i));
    const isAllSelected = allIds.length > 0 && allIds.every((id) => currentSelectedKeys.includes(id));
    const nextKeys = isAllSelected ? [] : allIds;

    if (isControlledSelection) {
      onSelectChange?.(nextKeys);
    } else {
      setInternalSelectedKeys(nextKeys);
    }
  };

  const handleSelectRow = (id, e) => {
    e?.stopPropagation();
    let nextKeys;
    if (currentSelectedKeys.includes(id)) {
      nextKeys = currentSelectedKeys.filter((k) => k !== id);
    } else {
      nextKeys = [...currentSelectedKeys, id];
    }

    if (isControlledSelection) {
      onSelectChange?.(nextKeys);
    } else {
      setInternalSelectedKeys(nextKeys);
    }
  };

  // Process data with client-side sort jika un-controlled
  const processedData = useMemo(() => {
    if (isControlledSort || !currentSortBy || !data.length) {
      return data;
    }
    return [...data].sort((a, b) => {
      const valA = a[currentSortBy];
      const valB = b[currentSortBy];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      const res = valA < valB ? -1 : 1;
      return currentSortDir === 'asc' ? res : -res;
    });
  }, [data, isControlledSort, currentSortBy, currentSortDir]);

  // Derived sticky columns lookup
  const stickyLeftKeys = useMemo(() => {
    const fromProps = stickyColumns.left || [];
    const fromCols = columns.filter((c) => c.sticky === 'left').map((c) => c.key);
    return Array.from(new Set([...fromProps, ...fromCols]));
  }, [stickyColumns, columns]);

  const stickyRightKeys = useMemo(() => {
    const fromProps = stickyColumns.right || [];
    const fromCols = columns.filter((c) => c.sticky === 'right').map((c) => c.key);
    return Array.from(new Set([...fromProps, ...fromCols]));
  }, [stickyColumns, columns]);

  // Density classes
  const densityCellPadding = density === 'comfortable' ? 'py-2.5 px-3.5' : 'py-1.5 px-3';
  const densityHeaderPadding = density === 'comfortable' ? 'py-2 px-3.5' : 'py-2 px-3';

  // Status map helper jika status column tidak punya render kustom
  const renderStatusCell = (val, row) => {
    if (!val && val !== 0) return '-';
    let variant = 'neutral';
    const str = String(val).toLowerCase();
    if (/lunas|disetujui|sukses|active|aktif|approved|posted|paid|surplus|selesai/i.test(str)) {
      variant = 'success';
    } else if (/batal|gagal|overdue|danger|tunggakan|ditolak|rejected|void|voided|rugi/i.test(str)) {
      variant = 'danger';
    } else if (/pending|menunggu|draft|draf|warning|peringatan|review/i.test(str)) {
      variant = 'warning';
    } else if (/info|terbayar|cicilan|partial|proses/i.test(str)) {
      variant = 'info';
    }
    return <StatusPill variant={row.status_variant || variant}>{val}</StatusPill>;
  };

  // State: Error
  if (error) {
    return (
      <div className={`p-4 rounded-lg bg-white border border-slate-200/80 ${containerClassName}`}>
        <ErrorState
          error={error}
          onRetry={onRetry}
          title="Gagal Memuat Tabel Data"
        />
      </div>
    );
  }

  // State: Initial Loading (No data yet)
  if (loading && (!data || data.length === 0)) {
    return (
      <div className={`rounded-lg bg-white border border-slate-200/80 ${containerClassName}`}>
        <LoadingSkeleton
          type="table"
          rows={pagination?.pageSize || 6}
          columns={columns.length + (selectable ? 1 : 0) + (expandableRow ? 1 : 0)}
        />
      </div>
    );
  }

  const allIds = data.map((r, i) => getRowId(r, i));
  const isAllSelected = allIds.length > 0 && allIds.every((id) => currentSelectedKeys.includes(id));
  const isPartiallySelected = !isAllSelected && allIds.some((id) => currentSelectedKeys.includes(id));
  const hasSelectedRows = currentSelectedKeys.length > 0;

  return (
    <div className={`rounded-lg bg-white border border-slate-200/80 flex flex-col shadow-2xs ${containerClassName}`}>
      {/* Subtle refreshing indicator banner */}
      {(isRefreshing || (loading && data.length > 0)) && (
        <LoadingSkeleton isRefreshing={true} />
      )}

      {/* Batch Action Bar saat baris dipilih */}
      {selectable && hasSelectedRows && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between gap-3 text-xs text-emerald-900 animate-fadeIn">
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              {currentSelectedKeys.length}
            </span>
            <span>item dipilih</span>
          </div>

          <div className="flex items-center gap-2">
            {typeof batchActions === 'function' ? batchActions(currentSelectedKeys) : batchActions}
            
            <button
              type="button"
              onClick={() => (isControlledSelection ? onSelectChange?.([]) : setInternalSelectedKeys([]))}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs px-2 py-1 rounded hover:bg-emerald-100 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Batal</span>
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Container dengan class table-container resmi */}
      <div className="table-container overflow-x-auto w-full relative">
        <table className={`w-full text-left border-collapse ${className}`}>
          {/* Table Header */}
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 select-none">
            <tr>
              {/* Expandable Row Toggle Header */}
              {expandableRow && (
                <th className={`w-9 text-center bg-slate-50 ${densityHeaderPadding}`}>
                  <span className="sr-only">Expand</span>
                </th>
              )}

              {/* Select All Checkbox */}
              {selectable && (
                <th className={`w-9 text-center bg-slate-50 sticky left-0 z-30 shadow-[1px_0_0_0_#e2e8f0] ${densityHeaderPadding}`}>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-slate-500 hover:text-emerald-600 p-0.5 rounded transition cursor-pointer flex items-center justify-center mx-auto"
                    aria-label="Pilih semua baris"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : isPartiallySelected ? (
                      <MinusSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
              )}

              {/* Data Column Headers */}
              {columns.map((col, colIdx) => {
                const isStickyLeft = stickyLeftKeys.includes(col.key);
                const isStickyRight = stickyRightKeys.includes(col.key);
                const isColSortable = col.sortable || (sortable && col.sortable !== false);
                const isSorted = currentSortBy === col.key;
                const isNumeric = col.type === 'currency' || col.type === 'number' || col.align === 'right';

                let alignClass = 'text-left';
                if (col.align === 'right' || isNumeric) alignClass = 'text-right';
                if (col.align === 'center') alignClass = 'text-center';

                return (
                  <th
                    key={col.key || colIdx}
                    style={{ width: col.width }}
                    onClick={() => isColSortable && handleHeaderClick(col)}
                    className={`bg-slate-50 ${densityHeaderPadding} ${alignClass} ${
                      isColSortable ? 'cursor-pointer hover:bg-slate-100/80 transition-colors' : ''
                    } ${
                      isStickyLeft
                        ? 'sticky left-0 z-30 shadow-[1px_0_0_0_#e2e8f0]'
                        : ''
                    } ${
                      isStickyRight
                        ? 'sticky right-0 z-30 shadow-[-1px_0_0_0_#e2e8f0]'
                        : ''
                    } ${col.className || ''}`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        alignClass === 'text-right' ? 'justify-end w-full' : alignClass === 'text-center' ? 'justify-center w-full' : ''
                      }`}
                    >
                      <span>{col.label}</span>
                      {isColSortable && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            currentSortDir === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 text-slate-300 hover:text-slate-500" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 bg-white">
            {processedData.length > 0 ? (
              processedData.map((row, rowIdx) => {
                const id = getRowId(row, rowIdx);
                const isSelected = currentSelectedKeys.includes(id);
                const isExpanded = expandedRows.has(id);

                return (
                  <React.Fragment key={id}>
                    <tr
                      onClick={() => onRowClick?.(row, rowIdx)}
                      className={`group transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/50 hover:bg-emerald-50/80'
                          : 'hover:bg-slate-50/70'
                      } ${onRowClick ? 'cursor-pointer' : ''}`}
                    >
                      {/* Expandable Toggle Cell */}
                      {expandableRow && (
                        <td className={`w-9 text-center ${densityCellPadding}`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpand(id);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                          >
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                isExpanded ? 'rotate-90 text-emerald-600' : ''
                              }`}
                            />
                          </button>
                        </td>
                      )}

                      {/* Checkbox Selection Cell */}
                      {selectable && (
                        <td
                          className={`w-9 text-center sticky left-0 z-10 bg-white group-hover:bg-slate-50/70 shadow-[1px_0_0_0_#e2e8f0] ${
                            isSelected ? '!bg-emerald-50/50' : ''
                          } ${densityCellPadding}`}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleSelectRow(id, e)}
                            className="text-slate-400 hover:text-emerald-600 p-0.5 rounded transition cursor-pointer flex items-center justify-center mx-auto"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* Data Cells */}
                      {columns.map((col, colIdx) => {
                        const val = row[col.key];
                        const isStickyLeft = stickyLeftKeys.includes(col.key);
                        const isStickyRight = stickyRightKeys.includes(col.key);
                        const isNumeric = col.type === 'currency' || col.type === 'number' || col.align === 'right';

                        let alignClass = 'text-left';
                        if (col.align === 'right' || isNumeric) alignClass = 'num-cell text-right';
                        if (col.align === 'center') alignClass = 'text-center';

                        let cellContent = val;

                        if (col.render) {
                          cellContent = col.render(val, row, rowIdx);
                        } else if (col.type === 'currency') {
                          cellContent = val != null ? formatCurrency(val) : '-';
                        } else if (col.type === 'number') {
                          cellContent = val != null ? formatNumber(val) : '-';
                        } else if (col.type === 'date') {
                          cellContent = formatDate(val);
                        } else if (col.type === 'status') {
                          cellContent = renderStatusCell(val, row);
                        } else if (val == null || val === '') {
                          cellContent = '-';
                        }

                        return (
                          <td
                            key={col.key || colIdx}
                            className={`${densityCellPadding} ${alignClass} ${
                              isStickyLeft
                                ? `sticky left-0 z-10 bg-white group-hover:bg-slate-50/70 shadow-[1px_0_0_0_#e2e8f0] ${
                                    isSelected ? '!bg-emerald-50/50' : ''
                                  }`
                                : ''
                            } ${
                              isStickyRight
                                ? `sticky right-0 z-10 bg-white group-hover:bg-slate-50/70 shadow-[-1px_0_0_0_#e2e8f0] ${
                                    isSelected ? '!bg-emerald-50/50' : ''
                                  }`
                                : ''
                            } ${col.cellClassName || ''}`}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Expandable Row Content */}
                    {expandableRow && isExpanded && (
                      <tr className="bg-slate-50/60 border-y border-slate-100">
                        <td
                          colSpan={columns.length + (selectable ? 1 : 0) + 1}
                          className="p-4 pl-12 text-xs text-slate-700"
                        >
                          {expandableRow(row, rowIdx)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : null}
          </tbody>
        </table>

        {/* Empty State View */}
        {processedData.length === 0 && (
          <div className="p-8">
            {emptyState || (
              <EmptyState
                title={emptyTitle}
                description={emptyDescription || emptyMessage}
                action={emptyAction}
                compact={density === 'compact'}
              />
            )}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
