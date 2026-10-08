import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  AlertTriangle,
  Info,
  Users,
  Clock,
  Briefcase,
  HeartPulse,
  Palmtree,
  FileText,
  MessageCircle,
  Eye,
  CheckCircle2,
  CalendarDays,
  LayoutGrid,
  List,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import api from '../../../../shared/services/api';
import LoadingSkeleton from '../../../../shared/components/LoadingSkeleton';
import EmptyState from '../../../../shared/components/EmptyState';
import ErrorState from '../../../../shared/components/ErrorState';

const CATEGORY_CHIPS = [
  { id: 'ALL', label: 'Semua', color: '#1e293b' },
  { id: 'annual', label: 'Cuti', color: '#006948', dot: 'bg-emerald-600' },
  { id: 'sick', label: 'Sakit', color: '#ba1a1a', dot: 'bg-rose-600' },
  { id: 'permit', label: 'Izin', color: '#d97706', dot: 'bg-amber-500' },
  { id: 'official', label: 'Dinas Luar', color: '#0284c7', dot: 'bg-sky-500' },
  { id: 'overtime', label: 'Lembur', color: '#4f46e5', dot: 'bg-indigo-600' }
];

export default function KalenderKetidakhadiranTab({ activeSchoolUnit, currentUser }) {
  // Current active date context
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [currentYearMonth, setCurrentYearMonth] = useState(() => todayStr.slice(0, 7)); // 'YYYY-MM'
  const [selectedDate, setSelectedDate] = useState(() => todayStr);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPosition, setSelectedPosition] = useState('all');

  // Matrix API State
  const [matrixData, setMatrixData] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch Matrix Data
  const fetchCalendarMatrix = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        month: currentYearMonth,
        include_overtime: true,
        include_pending: true
      };

      if (activeSchoolUnit?.id) {
        params.school_unit_id = activeSchoolUnit.id;
      }
      if (selectedCategory !== 'ALL' && selectedCategory !== 'overtime') {
        params.category = selectedCategory;
      }
      if (selectedPosition !== 'all') {
        params.position_id = selectedPosition;
      }

      const [matrixRes, posRes] = await Promise.all([
        api.get('/kepegawaian/leave-requests/calendar-matrix', { params }),
        api.get('/kepegawaian/job-positions').catch(() => ({ data: { data: [] } }))
      ]);

      if (matrixRes.data?.success) {
        setMatrixData(matrixRes.data.data);
      } else {
        setError(matrixRes.data?.message || 'Gagal memuat matriks kalender');
      }

      if (posRes.data?.success) {
        setPositions(posRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch calendar matrix:', err);
      setError(err.response?.data?.message || err.message || 'Terjadi kesalahan saat memuat kalender');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarMatrix();
  }, [currentYearMonth, activeSchoolUnit, selectedCategory, selectedPosition]);

  // Navigate Month
  const handlePrevMonth = () => {
    const [y, m] = currentYearMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentYearMonth(prevYm);
  };

  const handleNextMonth = () => {
    const [y, m] = currentYearMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextYm = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentYearMonth(nextYm);
  };

  const handleToday = () => {
    const ym = todayStr.slice(0, 7);
    setCurrentYearMonth(ym);
    setSelectedDate(todayStr);
  };

  // Month Display Name
  const monthDisplayName = useMemo(() => {
    const [y, m] = currentYearMonth.split('-').map(Number);
    const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${MONTHS[m - 1]} ${y}`;
  }, [currentYearMonth]);

  // Generate 7xN Calendar Grid Slots (Monday to Sunday)
  const calendarGridSlots = useMemo(() => {
    if (!currentYearMonth) return [];
    const [y, m] = currentYearMonth.split('-').map(Number);
    const firstDayOfMonth = new Date(y, m - 1, 1);
    const lastDayOfMonth = new Date(y, m, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // In JS, getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    // Convert to Monday=0, ..., Sunday=6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday

    const slots = [];

    // Previous month overflow slots
    const prevMonthLastDay = new Date(y, m - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const pMonth = m - 1 === 0 ? 12 : m - 1;
      const pYear = m - 1 === 0 ? y - 1 : y;
      const pDateStr = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
      slots.push({
        date: pDateStr,
        day: pDay,
        isCurrentMonth: false,
        isWeekend: (slots.length % 7 === 5 || slots.length % 7 === 6)
      });
    }

    // Current month slots
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${currentYearMonth}-${String(d).padStart(2, '0')}`;
      const dayIdx = new Date(y, m - 1, d).getDay();
      const isWeekend = dayIdx === 0 || dayIdx === 6;
      slots.push({
        date: dStr,
        day: d,
        isCurrentMonth: true,
        isWeekend
      });
    }

    // Next month overflow slots to complete 7-column grid
    const totalSlots = Math.ceil(slots.length / 7) * 7;
    const remaining = totalSlots - slots.length;
    for (let n = 1; n <= remaining; n++) {
      const nMonth = m + 1 > 12 ? 1 : m + 1;
      const nYear = m + 1 > 12 ? y + 1 : y;
      const nDateStr = `${nYear}-${String(nMonth).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      slots.push({
        date: nDateStr,
        day: n,
        isCurrentMonth: false,
        isWeekend: (slots.length % 7 === 5 || slots.length % 7 === 6)
      });
    }

    return slots;
  }, [currentYearMonth]);

  // Aggregate stats & employee entries for selected date
  const selectedDayDetails = useMemo(() => {
    if (!matrixData || !selectedDate) return { leaves: [], overtimes: [], stats: null, holiday: null };

    const stats = matrixData.daily_summary?.[selectedDate] || matrixData.dateStats?.[selectedDate] || null;
    const dayLeaves = [];
    const dayOvertimes = [];

    const rows = matrixData.employees || matrixData.rows || [];
    rows.forEach(emp => {
      const dayInfo = emp.days?.[selectedDate];
      if (dayInfo) {
        if (dayInfo.leaves && dayInfo.leaves.length > 0) {
          dayInfo.leaves.forEach(l => {
            dayLeaves.push({
              employee_id: emp.id || emp.employee_id,
              employee_name: emp.name || emp.employee_name,
              nip: emp.nip,
              position_name: emp.position_name,
              ...l
            });
          });
        }
        if (dayInfo.overtimes && dayInfo.overtimes.length > 0) {
          dayInfo.overtimes.forEach(o => {
            dayOvertimes.push({
              employee_id: emp.id || emp.employee_id,
              employee_name: emp.name || emp.employee_name,
              nip: emp.nip,
              position_name: emp.position_name,
              ...o
            });
          });
        }
      }
    });

    return {
      leaves: dayLeaves,
      overtimes: dayOvertimes,
      stats,
      holiday: stats?.is_holiday ? { name: stats.holiday_name } : null
    };
  }, [matrixData, selectedDate]);

  // WhatsApp Inval / Replacement Message Helper (SPEC §2 #33)
  const getWhatsAppInvalUrl = (employeeName, leaveTypeName, date) => {
    const text = encodeURIComponent(
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
      `*PEMBERITAHUAN GURU INVAL / PENGGANTI (ALDEPOS HRIS)*\n` +
      `Yth. Ustadz/Ustadzah,\n` +
      `Diinformasikan bahwa *${employeeName}* berhalangan hadir karena *${leaveTypeName}* pada tanggal *${date}*.\n\n` +
      `Mohon kesediaannya untuk menggantikan jadwal mengajar/tugas operasional pada jam pelajaran tersebut. Terima kasih.\n\n` +
      `_Bagian Kepegawaian & Akademik Aldepos_`
    );
    return `https://wa.me/?text=${text}`;
  };

  // Days with warnings in this month
  const warningDays = useMemo(() => {
    if (!matrixData?.daily_summary && !matrixData?.dateStats) return [];
    const summaryObj = matrixData.daily_summary || matrixData.dateStats || {};
    return Object.values(summaryObj).filter(s => s.warning || s.thresholdAlert?.isWarning);
  }, [matrixData]);

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar & Filters */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
        {/* Row 1: Month Nav, View Toggle, and Unit/Position Select */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                title="Bulan Sebelumnya"
                type="button"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 flex items-center gap-2 text-center min-w-[150px] justify-center">
                <CalendarIcon className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900 tracking-tight">{monthDisplayName}</span>
              </div>
              <button
                onClick={handleNextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                title="Bulan Berikutnya"
                type="button"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold transition-colors shadow-2xs"
              type="button"
            >
              Hari Ini
            </button>

            {/* View Mode Toggle */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 ml-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                type="button"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-700" />
                <span>Bulan</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                type="button"
              >
                <List className="w-3.5 h-3.5 text-emerald-700" />
                <span>Daftar</span>
              </button>
            </div>
          </div>

          {/* Scope Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Position Filter */}
            <div className="relative min-w-[160px]">
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="w-full h-9 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600 appearance-none cursor-pointer"
              >
                <option value="all">Semua Jabatan</option>
                {positions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            <button
              onClick={fetchCalendarMatrix}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-2xs"
              type="button"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Row 2: Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filter Kategori:
          </span>
          {CATEGORY_CHIPS.map(chip => {
            const isSelected = selectedCategory === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedCategory(chip.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white font-bold shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                }`}
                type="button"
              >
                {chip.dot && <span className={`w-2 h-2 rounded-full ${chip.dot}`} />}
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Global Warning Alert Banner (If Any Threshold Alert Triggered in Month) */}
      {warningDays.length > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-xs">
            <div className="font-bold text-amber-900">
              Peringatan Ambang Rawan Ketidakhadiran ({warningDays.length} Hari Terdeteksi)
            </div>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              Terdapat tanggal dengan jumlah pegawai tidak hadir melebihi ambang batas toleransi operasional. Mohon periksa kesiapan guru pengganti (inval) pada tanggal tersebut.
            </p>
          </div>
        </div>
      )}

      {/* 3. Main Calendar Split Layout */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-2xs">
          <LoadingSkeleton rows={6} />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-2xs">
          <ErrorState message={error} onRetry={fetchCalendarMatrix} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
          {/* LEFT MAIN: Monthly Grid or List View */}
          <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden flex flex-col">
            {viewMode === 'grid' ? (
              <>
                {/* 7-Column Day Headers */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center select-none text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="py-2.5 px-1 border-r border-slate-200">Senin</div>
                  <div className="py-2.5 px-1 border-r border-slate-200">Selasa</div>
                  <div className="py-2.5 px-1 border-r border-slate-200">Rabu</div>
                  <div className="py-2.5 px-1 border-r border-slate-200">Kamis</div>
                  <div className="py-2.5 px-1 border-r border-slate-200">Jumat</div>
                  <div className="py-2.5 px-1 border-r border-slate-200 bg-slate-100/70 text-slate-600">Sabtu</div>
                  <div className="py-2.5 px-1 bg-slate-100/70 text-slate-600">Minggu</div>
                </div>

                {/* Calendar Grid Cells */}
                <div className="grid grid-cols-7 divide-y divide-slate-200">
                  {calendarGridSlots.map((slot, idx) => {
                    const dStr = slot.date;
                    const isSelected = selectedDate === dStr;
                    const isToday = todayStr === dStr;
                    const dayStats = matrixData?.daily_summary?.[dStr] || matrixData?.dateStats?.[dStr] || null;
                    const isHoliday = Boolean(dayStats?.is_holiday);
                    const holidayName = dayStats?.holiday_name;
                    const absentCount = dayStats?.total_absent || 0;
                    const otCount = dayStats?.total_overtime || 0;
                    const hasWarning = Boolean(dayStats?.warning || dayStats?.thresholdAlert?.isWarning);

                    // Collect active leaves for this slot date from all employees
                    const activeEntries = [];
                    const rows = matrixData?.employees || matrixData?.rows || [];
                    rows.forEach(emp => {
                      const dInfo = emp.days?.[dStr];
                      if (dInfo?.leaves && dInfo.leaves.length > 0) {
                        dInfo.leaves.forEach(l => {
                          activeEntries.push({
                            type: 'leave',
                            name: emp.name || emp.employee_name,
                            category: l.category || l.leave_category,
                            code: l.leave_type_code,
                            color: l.color || '#006948',
                            label: l.leave_type_name || l.leave_type_code
                          });
                        });
                      }
                      if (dInfo?.overtimes && dInfo.overtimes.length > 0) {
                        dInfo.overtimes.forEach(o => {
                          activeEntries.push({
                            type: 'overtime',
                            name: emp.name || emp.employee_name,
                            category: 'overtime',
                            color: '#4f46e5',
                            label: `Lembur (${o.hours}j)`
                          });
                        });
                      }
                    });

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (slot.isCurrentMonth) setSelectedDate(dStr);
                        }}
                        className={`min-h-[118px] p-1.5 border-r border-slate-200 flex flex-col transition-all cursor-pointer relative ${
                          !slot.isCurrentMonth
                            ? 'bg-slate-50/50 opacity-40 select-none cursor-default'
                            : isSelected
                            ? 'bg-emerald-50/60 ring-2 ring-emerald-600 z-10'
                            : isHoliday
                            ? 'bg-rose-50/30 hover:bg-rose-50/50'
                            : slot.isWeekend
                            ? 'bg-slate-50/70 hover:bg-slate-100/70'
                            : hasWarning
                            ? 'bg-amber-50/30 hover:bg-amber-50/60'
                            : 'bg-white hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Day Cell Header */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <span
                              className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold leading-none ${
                                isToday
                                  ? 'bg-emerald-700 text-white'
                                  : isSelected
                                  ? 'bg-emerald-100 text-emerald-900 font-extrabold'
                                  : isHoliday
                                  ? 'text-rose-700'
                                  : slot.isWeekend
                                  ? 'text-slate-500'
                                  : 'text-slate-800'
                              }`}
                            >
                              {slot.day}
                            </span>
                            {isToday && (
                              <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-tight hidden sm:inline">
                                Hari Ini
                              </span>
                            )}
                          </div>

                          {/* Stat / Alert Pill */}
                          {hasWarning ? (
                            <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1 py-0.2 rounded flex items-center gap-0.5">
                              <span>⚠️</span> {absentCount} Rawan
                            </span>
                          ) : absentCount > 0 ? (
                            <span className="text-[9px] text-slate-500 font-semibold px-1 rounded bg-slate-100">
                              {absentCount} absen
                            </span>
                          ) : otCount > 0 ? (
                            <span className="text-[9px] text-indigo-700 font-semibold px-1 rounded bg-indigo-50">
                              {otCount} lembur
                            </span>
                          ) : null}
                        </div>

                        {/* Holiday Label if present */}
                        {isHoliday && holidayName && (
                          <div className="text-[10px] text-rose-700 font-bold leading-tight truncate mb-1" title={holidayName}>
                            {holidayName}
                          </div>
                        )}

                        {/* Badges List (Active Leaves & Overtimes) */}
                        <div className="space-y-1 overflow-hidden flex-1">
                          {activeEntries.slice(0, 3).map((entry, eIdx) => {
                            const isSick = entry.category === 'sick';
                            const isOvertime = entry.type === 'overtime';
                            const isDinas = entry.category === 'official';

                            let badgeBg = 'bg-emerald-50 text-emerald-900 border-emerald-200';
                            let dotColor = 'bg-emerald-600';

                            if (isSick) {
                              badgeBg = 'bg-rose-50 text-rose-900 border-rose-200';
                              dotColor = 'bg-rose-600';
                            } else if (isOvertime) {
                              badgeBg = 'bg-indigo-50 text-indigo-900 border-indigo-200';
                              dotColor = 'bg-indigo-600';
                            } else if (isDinas) {
                              badgeBg = 'bg-sky-50 text-sky-900 border-sky-200';
                              dotColor = 'bg-sky-600';
                            } else if (entry.category === 'permit') {
                              badgeBg = 'bg-amber-50 text-amber-900 border-amber-200';
                              dotColor = 'bg-amber-600';
                            }

                            // Short initials + name
                            const nameParts = (entry.name || '').split(' ');
                            const shortName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[1][0]}.` : nameParts[0];

                            return (
                              <div
                                key={eIdx}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border truncate flex items-center gap-1 ${badgeBg}`}
                                title={`${entry.name} (${entry.label})`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                <span className="truncate">{shortName} ({entry.label})</span>
                              </div>
                            );
                          })}

                          {activeEntries.length > 3 && (
                            <div className="text-[9px] font-bold text-emerald-800 pl-0.5 hover:underline">
                              +{activeEntries.length - 3} lainnya...
                            </div>
                          )}

                          {activeEntries.length === 0 && !isHoliday && slot.isCurrentMonth && (
                            <div className="text-[10px] text-slate-300 italic pt-2 text-center select-none">
                              Nihil
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* List View Mode */
              <div className="p-4 divide-y divide-slate-100">
                {calendarGridSlots
                  .filter(s => s.isCurrentMonth)
                  .map((slot, sIdx) => {
                    const dStr = slot.date;
                    const stats = matrixData?.daily_summary?.[dStr] || matrixData?.dateStats?.[dStr];
                    const absentCount = stats?.total_absent || 0;
                    const otCount = stats?.total_overtime || 0;
                    const isHoliday = Boolean(stats?.is_holiday);
                    const isSelected = selectedDate === dStr;

                    // Collect leaves for this date
                    const dayEntries = [];
                    const rows = matrixData?.employees || matrixData?.rows || [];
                    rows.forEach(emp => {
                      const dInfo = emp.days?.[dStr];
                      if (dInfo?.leaves) {
                        dInfo.leaves.forEach(l => dayEntries.push({ emp, leave: l }));
                      }
                    });

                    return (
                      <div
                        key={sIdx}
                        onClick={() => setSelectedDate(dStr)}
                        className={`p-3 rounded-xl flex items-center justify-between gap-4 transition-all cursor-pointer ${
                          isSelected ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold ${
                            todayStr === dStr ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-800'
                          }`}>
                            <span className="text-xs">{slot.day}</span>
                            <span className="text-[9px] uppercase">{currentYearMonth.slice(5, 7)}</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                              <span>{dStr}</span>
                              {isHoliday && (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                  {stats?.holiday_name || 'Hari Libur'}
                                </span>
                              )}
                              {stats?.warning && (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                                  ⚠️ Ambang Rawan
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {dayEntries.length > 0
                                ? `${dayEntries.length} Pegawai Tidak Hadir: ${dayEntries.map(e => e.emp.name).join(', ')}`
                                : 'Tidak ada permohonan cuti / izin'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {absentCount > 0 && (
                            <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-bold text-xs">
                              {absentCount} Cuti/Izin
                            </span>
                          )}
                          {otCount > 0 && (
                            <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 font-bold text-xs">
                              {otCount} Lembur
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Bottom Bar Information */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-slate-600 text-xs">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Sistem otomatis memberikan penanda <strong>Rawan</strong> saat jumlah ketidakhadiran mencapai ambang batas satuan pendidikan.
                </span>
              </div>
              <div className="flex items-center gap-2 font-semibold">
                <span>Pegawai Terpantau: <strong>{matrixData?.total_employees || matrixData?.employees?.length || 0} Orang</strong></span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE PANEL (Fixed 320px Sticky Day Details & Inval Actions) */}
          <div className="w-full xl:w-[320px] flex flex-col gap-4 sticky top-20">
            {/* CARD 1: Selected Day Details */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detail Harian</span>
                  <h4 className="text-sm font-bold text-slate-900">{selectedDate || 'Pilih Tanggal'}</h4>
                </div>
                <CalendarDays className="w-4 h-4 text-emerald-700" />
              </div>

              {/* Day Holiday Banner */}
              {selectedDayDetails.holiday && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>{selectedDayDetails.holiday.name}</span>
                </div>
              )}

              {/* Day Threshold Alert */}
              {selectedDayDetails.stats?.warning && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Peringatan Operasional:</span>
                    <p className="mt-0.5 text-[11px] leading-tight">{selectedDayDetails.stats.warning.message}</p>
                  </div>
                </div>
              )}

              {/* Absent Employees on Selected Date */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Pegawai Tidak Hadir ({selectedDayDetails.leaves.length})
                </span>

                {selectedDayDetails.leaves.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    Nihil ketidakhadiran pada tanggal ini.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {selectedDayDetails.leaves.map((l, lIdx) => {
                      const isSick = l.category === 'sick' || l.leave_category === 'sick';
                      return (
                        <div key={lIdx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-900 truncate">{l.employee_name}</h5>
                              <p className="text-[11px] text-slate-500 truncate">{l.position_name || 'Tenaga Pendidik'}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isSick ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {l.leave_type_name || l.leave_type_code}
                            </span>
                          </div>

                          {/* Reason (if authorized/not null per sick privacy) */}
                          {l.reason && (
                            <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-100">
                              "{l.reason}"
                            </p>
                          )}

                          {/* WhatsApp Inval Link (SPEC §2 #33) */}
                          <a
                            href={getWhatsAppInvalUrl(l.employee_name, l.leave_type_name || l.leave_type_code, selectedDate)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 w-full justify-center px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Hubungi Guru Inval / Pengganti</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Overtimes on Selected Date */}
              {selectedDayDetails.overtimes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Penugasan Lembur ({selectedDayDetails.overtimes.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedDayDetails.overtimes.map((ot, oIdx) => (
                      <div key={oIdx} className="p-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 flex items-center justify-between text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-indigo-950 truncate">{ot.employee_name}</p>
                          <p className="text-[10px] text-indigo-700">{ot.task_description || 'Tugas operasional'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold">
                          {ot.hours} Jam
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: Color Legend */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Legenda & Indikator
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>Cuti Tahunan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span>Sakit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Izin Pribadi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>Dinas Luar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span>Lembur</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-200 border border-rose-500" />
                  <span>Libur Resmi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
