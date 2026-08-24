import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
}) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
      <div>
        Menampilkan <span className="font-semibold text-slate-700">{startItem}</span>-
        <span className="font-semibold text-slate-700">{endItem}</span> dari{' '}
        <span className="font-semibold text-slate-700">{totalItems}</span> data
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2 font-medium">
          Halaman <span className="font-bold text-slate-800">{currentPage}</span> dari{' '}
          <span className="font-bold text-slate-800">{totalPages}</span>
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
