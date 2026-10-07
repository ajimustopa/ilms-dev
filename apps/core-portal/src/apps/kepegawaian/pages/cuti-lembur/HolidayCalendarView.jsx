import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isWeekend
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function HolidayCalendarView({
  holidays = [],
  selectedYear = '2026',
  onEditHoliday,
  onDeleteHoliday,
  onConfirmHoliday,
  canManage = false
}) {
  const yearNum = parseInt(selectedYear, 10) || 2026;
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [selectedDateDetail, setSelectedDateDetail] = useState(null);

  const currentDate = new Date(yearNum, currentMonthIndex, 1);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const daysInCalendar = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Map holidays by dateStr
  const holidayMap = {};
  holidays.forEach(h => {
    if (!h.start_date) return;
    const sDate = h.start_date;
    const eDate = h.end_date || h.start_date;

    const cur = new Date(`${sDate}T00:00:00`);
    const end = new Date(`${eDate}T00:00:00`);
    while (cur <= end) {
      const dStr = format(cur, 'yyyy-MM-dd');
      if (!holidayMap[dStr]) holidayMap[dStr] = [];
      if (!holidayMap[dStr].some(existing => existing.id === h.id)) {
        holidayMap[dStr].push(h);
      }
      cur.setDate(cur.getDate() + 1);
    }
  });

  const getHolidayBadgeStyle = (h) => {
    if (h.review_status === 'draft_needs_review') {
      return 'bg-amber-50 text-amber-800 border border-dashed border-amber-300';
    }
    switch (h.holiday_type) {
      case 'national':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'joint_leave':
        return 'bg-orange-50 text-orange-800 border border-orange-200';
      case 'school_semester':
      case 'school_ramadan':
      case 'school_exam':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'foundation':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'unit_special':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const monthsList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <div className="space-y-4">
      {/* Calendar Header / Month Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonthIndex(prev => (prev === 0 ? 11 : prev - 1))}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <select
              value={currentMonthIndex}
              onChange={(e) => setCurrentMonthIndex(parseInt(e.target.value, 10))}
              className="py-1 px-3 text-sm font-bold bg-white border border-slate-200 text-slate-800 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {monthsList.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
            <span className="font-bold text-slate-700 text-sm">{yearNum}</span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentMonthIndex(prev => (prev === 11 ? 0 : prev + 1))}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Libur Nasional</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>Cuti Bersama</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>Libur Sekolah</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span>Agenda Yayasan</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-dashed border-amber-600"></span>
            <span>Draft Perlu Tinjauan</span>
          </span>
        </div>
      </div>

      {/* Grid Calendar */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-slate-600 text-center font-bold text-xs py-2.5">
          <span className="text-red-600">Minggu</span>
          <span>Senin</span>
          <span>Selasa</span>
          <span>Rabu</span>
          <span>Kamis</span>
          <span>Jumat</span>
          <span className="text-red-500">Sabtu</span>
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 text-xs">
          {daysInCalendar.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayHolidays = holidayMap[dateStr] || [];
            const inCurrentMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const weekend = isWeekend(day);

            return (
              <div
                key={idx}
                onClick={() => {
                  if (dayHolidays.length > 0) {
                    setSelectedDateDetail({ dateStr, holidays: dayHolidays });
                  }
                }}
                className={`min-h-[96px] p-2 flex flex-col justify-between transition-colors ${
                  !inCurrentMonth
                    ? 'bg-slate-50/50 text-slate-300'
                    : weekend
                    ? 'bg-red-50/20 text-slate-800'
                    : 'bg-white text-slate-800'
                } ${today ? 'ring-2 ring-emerald-500 ring-inset z-10' : ''} ${
                  dayHolidays.length > 0 ? 'cursor-pointer hover:bg-emerald-50/30' : ''
                }`}
              >
                {/* Date Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold text-xs inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      today
                        ? 'bg-emerald-600 text-white font-bold'
                        : weekend && inCurrentMonth
                        ? 'text-red-600'
                        : inCurrentMonth
                        ? 'text-slate-700'
                        : 'text-slate-300'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayHolidays.length > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                      {dayHolidays.length} libur
                    </span>
                  )}
                </div>

                {/* Holiday Pills */}
                <div className="space-y-1 mt-1 flex-1">
                  {dayHolidays.slice(0, 2).map((h) => (
                    <div
                      key={h.id}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate leading-tight flex items-center gap-1 ${getHolidayBadgeStyle(
                        h
                      )}`}
                      title={`${h.name} (${h.holiday_type})`}
                    >
                      {h.review_status === 'draft_needs_review' && (
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                      )}
                      <span className="truncate">{h.name}</span>
                    </div>
                  ))}
                  {dayHolidays.length > 2 && (
                    <div className="text-[9px] text-slate-500 font-medium pl-1">
                      +{dayHolidays.length - 2} lainnya...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Detail Drawer / Popover Modal */}
      {selectedDateDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-800 text-sm">
                  Hari Libur pada {format(new Date(`${selectedDateDetail.dateStr}T00:00:00`), 'dd MMMM yyyy', { locale: idLocale })}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {selectedDateDetail.holidays.map((h) => (
                <div key={h.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs">{h.name}</h5>
                      <span className="text-[11px] text-slate-500">
                        {h.start_date} s/d {h.end_date || h.start_date}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getHolidayBadgeStyle(h)}`}>
                      {h.holiday_type}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                    <span>Off-Day: <b>{h.is_off_day ? 'Ya' : 'Tidak'}</b></span>
                    <span>Potong Cuti: <b>{h.deducts_annual_leave ? 'Ya' : 'Tidak'}</b></span>
                    <span>Berlaku: <b>{h.applies_to === 'schedules' ? 'Jadwal Tertentu' : 'Semua Pegawai'}</b></span>
                  </div>

                  {h.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                      "{h.notes}"
                    </p>
                  )}

                  {canManage && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                      {h.review_status === 'draft_needs_review' && (
                        <button
                          type="button"
                          onClick={() => {
                            onConfirmHoliday?.(h.id);
                            setSelectedDateDetail(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Konfirmasi
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onEditHoliday?.(h);
                          setSelectedDateDetail(null);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteHoliday?.(h.id);
                          setSelectedDateDetail(null);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
