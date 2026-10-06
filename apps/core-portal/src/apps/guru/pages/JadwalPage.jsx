import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { scheduleService } from '../services/scheduleService';
import { journalService } from '../services/journalService';
import { formatIndonesianDate, getIndonesianDayName, formatShortTime, HARI_INDONESIA } from '../utils/dateHelper';
import {
  Button,
  Card,
  ListItem,
  StatusBadge,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  PageHeader,
  SegmentedTabs,
  BottomSheet,
  SelectorKonteks,
  useToast
} from '../components';
import {
  CalendarDays,
  Clock,
  BookOpen,
  UserCheck,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  Layers,
  ArrowRight,
  FileEdit,
  RotateCw
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Senin' },
  { id: 2, name: 'Selasa' },
  { id: 3, name: 'Rabu' },
  { id: 4, name: 'Kamis' },
  { id: 5, name: 'Jumat' },
  { id: 6, name: 'Sabtu' },
  { id: 7, name: 'Ahad' }
];

export default function JadwalPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useTeacherAuth();

  // Current real date & day
  const todayDayIndex = new Date().getDay(); // 0 is Sunday
  const todayDayNumber = todayDayIndex === 0 ? 7 : todayDayIndex; // 1=Senin..7=Ahad
  const todayDateStr = useMemo(() => formatIndonesianDate(new Date(), true), []);

  // View Mode: 'daily' | 'weekly'
  const [viewMode, setViewMode] = useState('daily');
  const [selectedDay, setSelectedDay] = useState(todayDayNumber);

  // Schedules & Journals Data
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [allSchedules, setAllSchedules] = useState([]);
  const [schedulesError, setSchedulesError] = useState(null);

  const [loadingJournals, setLoadingJournals] = useState(true);
  const [todayJournalStatus, setTodayJournalStatus] = useState(null);

  // Modal Detail Schedule
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Realtime clock for countdown
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Schedules for Teacher
  const fetchSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    setSchedulesError(null);
    try {
      const res = await scheduleService.getMySchedules();
      const list = res?.schedules || (Array.isArray(res) ? res : []);
      setAllSchedules(list);
    } catch (err) {
      setSchedulesError(err?.message || 'Gagal memuat jadwal mengajar guru');
      setAllSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  // Fetch Today's Teaching Journal Status
  const fetchTodayJournals = useCallback(async () => {
    setLoadingJournals(true);
    try {
      const res = await journalService.getTodayJournalStatus();
      const data = res?.data || res || null;
      setTodayJournalStatus(data);
    } catch {
      setTodayJournalStatus(null);
    } finally {
      setLoadingJournals(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchTodayJournals();
  }, [fetchSchedules, fetchTodayJournals]);

  // Helper konversi day_of_week dari database (string / integer) ke integer 1..7
  const normalizeDayNumber = (val) => {
    if (val === undefined || val === null) return 1;
    if (typeof val === 'number') return val;
    const str = String(val).toLowerCase().trim();
    if (str === 'senin' || str === 'monday') return 1;
    if (str === 'selasa' || str === 'tuesday') return 2;
    if (str === 'rabu' || str === 'wednesday') return 3;
    if (str === 'kamis' || str === 'thursday') return 4;
    if (str === 'jumat' || str === 'friday') return 5;
    if (str === 'sabtu' || str === 'saturday') return 6;
    if (str === 'ahad' || str === 'minggu' || str === 'sunday') return 7;
    const num = parseInt(str, 10);
    return !isNaN(num) ? num : 1;
  };

  // Helper evaluasi status sesi & sisa waktu (countdown)
  const evaluateScheduleTime = (startTime, endTime) => {
    if (!startTime || !endTime) return { status: 'neutral', label: 'Terjadwal', countdownText: null };
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [sH, sM] = String(startTime).split(':').map(Number);
    const [eH, eM] = String(endTime).split(':').map(Number);
    const startMinutes = (sH || 0) * 60 + (sM || 0);
    const endMinutes = (eH || 0) * 60 + (eM || 0);

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      const remainingMinutes = endMinutes - currentMinutes;
      return {
        status: 'info',
        label: 'Sedang Berlangsung',
        code: 'KBM',
        isOngoing: true,
        countdownText: `Sisa waktu: ${remainingMinutes} menit`
      };
    }

    if (currentMinutes < startMinutes) {
      const diffMinutes = startMinutes - currentMinutes;
      const diffH = Math.floor(diffMinutes / 60);
      const diffM = diffMinutes % 60;
      let diffStr = '';
      if (diffH > 0) diffStr += `${diffH} jam `;
      diffStr += `${diffM} menit`;

      return {
        status: 'warning',
        label: 'Berikutnya',
        isUpcoming: true,
        diffMinutes,
        countdownText: `Dimulai dalam ${diffStr}`
      };
    }

    return {
      status: 'success',
      label: 'Selesai',
      isPassed: true,
      countdownText: 'Sesi tatap muka selesai'
    };
  };

  // Jadwal Hari Ini
  const todaySchedules = useMemo(() => {
    return allSchedules
      .filter((s) => normalizeDayNumber(s.day_of_week) === todayDayNumber)
      .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
  }, [allSchedules, todayDayNumber]);

  // Evaluasi "Pelajaran Berikutnya / Sedang Berlangsung" untuk Card Pengingat
  const currentOrNextLesson = useMemo(() => {
    if (todaySchedules.length === 0) return null;

    // 1. Cek apakah ada yang sedang berlangsung
    const ongoing = todaySchedules.find((s) => {
      const evalRes = evaluateScheduleTime(s.start_time, s.end_time);
      return evalRes.isOngoing;
    });
    if (ongoing) {
      return { schedule: ongoing, evalInfo: evaluateScheduleTime(ongoing.start_time, ongoing.end_time) };
    }

    // 2. Cek jadwal terdekat berikutnya
    const upcomings = todaySchedules
      .map((s) => ({ schedule: s, evalInfo: evaluateScheduleTime(s.start_time, s.end_time) }))
      .filter((item) => item.evalInfo.isUpcoming)
      .sort((a, b) => (a.evalInfo.diffMinutes || 0) - (b.evalInfo.diffMinutes || 0));

    if (upcomings.length > 0) {
      return upcomings[0];
    }

    return null;
  }, [todaySchedules, currentTime]);

  // Map Jurnal Hari Ini untuk mendeteksi yang belum diisi
  const journalFilledMap = useMemo(() => {
    const map = new Map();
    if (todayJournalStatus?.schedules) {
      todayJournalStatus.schedules.forEach((item) => {
        map.set(Number(item.id), Boolean(item.has_journal_filled));
      });
    }
    return map;
  }, [todayJournalStatus]);

  // Jadwal Terfilter untuk Tampilan Hari Aktif
  const selectedDaySchedules = useMemo(() => {
    return allSchedules
      .filter((s) => normalizeDayNumber(s.day_of_week) === selectedDay)
      .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
  }, [allSchedules, selectedDay]);

  // Jadwal Terkelompok per Hari untuk Tampilan Pekanan
  const weeklyGroupedSchedules = useMemo(() => {
    const grouped = {};
    DAYS_OF_WEEK.forEach((d) => {
      grouped[d.id] = allSchedules
        .filter((s) => normalizeDayNumber(s.day_of_week) === d.id)
        .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
    });
    return grouped;
  }, [allSchedules]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <PageHeader
        title="Jadwal Mengajar & Roster KBM"
        subtitle="Roster Mingguan & Pengingat Sesi Pelajaran"
        badge={
          <StatusBadge status="info" size="sm">
            {allSchedules.length} Sesi Terjadwal
          </StatusBadge>
        }
        actions={<SelectorKonteks />}
      />

      {/* ========================================================================= */}
      {/* 2. CARD PENGINGAT PELAJARAN BERIKUTNYA / SEDANG BERLANGSUNG               */}
      {/* ========================================================================= */}
      {currentOrNextLesson && (
        <Card
          ribbon={currentOrNextLesson.evalInfo.isOngoing ? 'indigo' : 'amber'}
          className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/90 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={currentOrNextLesson.evalInfo.isOngoing ? 'info' : 'warning'}
                  code={currentOrNextLesson.evalInfo.code}
                  size="sm"
                >
                  {currentOrNextLesson.evalInfo.label}
                </StatusBadge>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                  {currentOrNextLesson.evalInfo.countdownText}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {currentOrNextLesson.schedule.subject_name || currentOrNextLesson.schedule.subject_code || 'Mata Pelajaran'}
              </h2>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                Kelas <strong className="text-slate-800 dark:text-slate-200">{currentOrNextLesson.schedule.class_group_name || currentOrNextLesson.schedule.class_name || '-'}</strong>
                {currentOrNextLesson.schedule.room_name && ` • Ruang ${currentOrNextLesson.schedule.room_name}`}
                <span className="ml-2 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                  ({formatShortTime(currentOrNextLesson.schedule.start_time)} - {formatShortTime(currentOrNextLesson.schedule.end_time)} WIB)
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/guru/absensi-kelas?class_group_id=${currentOrNextLesson.schedule.class_group_id || ''}&schedule_id=${currentOrNextLesson.schedule.id || ''}`)}
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                Mulai Presensi Kelas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/guru/jurnal-mengajar?schedule_id=${currentOrNextLesson.schedule.id || ''}`)}
                leftIcon={<BookOpen className="w-4 h-4" />}
              >
                Isi Jurnal
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Tab Switcher Tampilan (Per Hari vs Per Pekan) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SegmentedTabs
          tabs={[
            { id: 'daily', label: 'Tampilan Per Hari', icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: 'weekly', label: 'Roster Seluruh Pekan', count: allSchedules.length, icon: <CalendarDays className="w-3.5 h-3.5" /> }
          ]}
          activeTab={viewMode}
          onChange={setViewMode}
        />

        {viewMode === 'daily' && (
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Hari Ini: <strong className="text-slate-800 dark:text-slate-200">{todayDateStr}</strong>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAMPILAN 1: PER HARI (DAILY VIEW)                                         */}
      {/* ========================================================================= */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Day Buttons Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {DAYS_OF_WEEK.map((d) => {
              const isSelected = d.id === selectedDay;
              const isToday = d.id === todayDayNumber;
              const dayScheduleCount = allSchedules.filter((s) => normalizeDayNumber(s.day_of_week) === d.id).length;

              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDay(d.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span>{d.name}</span>
                  {isToday && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      Hari Ini
                    </span>
                  )}
                  {dayScheduleCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {dayScheduleCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* List Jadwal Hari Terpilih */}
          {loadingSchedules ? (
            <SkeletonList count={3} />
          ) : schedulesError ? (
            <ErrorState
              title="Gagal Memuat Jadwal"
              message={schedulesError}
              onRetry={fetchSchedules}
            />
          ) : selectedDaySchedules.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-6 h-6 text-slate-400" />}
              title={`Tidak Ada Jadwal Mengajar di Hari ${DAYS_OF_WEEK.find((d) => d.id === selectedDay)?.name}`}
              description="Tidak ditemukan sesi KBM atau tatap muka terjadwal untuk hari ini."
            />
          ) : (
            <div className="space-y-3">
              {selectedDaySchedules.map((item, idx) => {
                const isSelectedDayToday = selectedDay === todayDayNumber;
                const timeEval = isSelectedDayToday
                  ? evaluateScheduleTime(item.start_time, item.end_time)
                  : { status: 'neutral', label: 'Terjadwal' };

                const isJournalFilled = journalFilledMap.get(Number(item.id));
                const isJournalUnfilledForPassedSchedule = isSelectedDayToday && timeEval.isPassed && !isJournalFilled;

                return (
                  <Card
                    key={item.id || idx}
                    ribbon={
                      isJournalUnfilledForPassedSchedule
                        ? 'amber'
                        : timeEval.status === 'info'
                        ? 'indigo'
                        : timeEval.status === 'warning'
                        ? 'amber'
                        : 'slate'
                    }
                    hoverable
                    onClick={() => setSelectedSchedule(item)}
                    className="space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {item.subject_name || item.subject_code || 'Mata Pelajaran'}
                          </h3>

                          {isSelectedDayToday && (
                            <StatusBadge status={timeEval.status} code={timeEval.code} size="sm">
                              {timeEval.label}
                            </StatusBadge>
                          )}

                          {/* Penanda Jurnal Mengajar */}
                          {isSelectedDayToday && (
                            isJournalFilled ? (
                              <StatusBadge status="success" size="sm" dot>
                                Jurnal Terisi
                              </StatusBadge>
                            ) : isJournalUnfilledForPassedSchedule ? (
                              <StatusBadge status="warning" size="sm" dot>
                                Jurnal Belum Diisi
                              </StatusBadge>
                            ) : null
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                          <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                            Kelas {item.class_group_name || item.class_name || '-'}
                          </span>
                          {item.room_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              Ruang {item.room_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg">
                          {formatShortTime(item.start_time)} - {formatShortTime(item.end_time)} WIB
                        </span>
                      </div>
                    </div>

                    {/* Action Bar per Item */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/guru/absensi-kelas?class_group_id=${item.class_group_id || ''}&schedule_id=${item.id || ''}`);
                          }}
                          leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                          className="text-xs min-h-[38px]"
                        >
                          Absensi Siswa
                        </Button>

                        <Button
                          variant={isJournalUnfilledForPassedSchedule ? 'brand-subtle' : 'outline'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/guru/jurnal-mengajar?schedule_id=${item.id || ''}`);
                          }}
                          leftIcon={<FileEdit className="w-3.5 h-3.5" />}
                          className="text-xs min-h-[38px]"
                        >
                          {isJournalFilled ? 'Lihat Jurnal' : 'Isi Jurnal'}
                        </Button>
                      </div>

                      <span className="text-xs text-slate-400 flex items-center gap-0.5 hover:text-slate-600">
                        <span>Pintasan</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAMPILAN 2: PER PEKAN (WEEKLY VIEW)                                       */}
      {/* ========================================================================= */}
      {viewMode === 'weekly' && (
        <div className="space-y-4">
          {loadingSchedules ? (
            <SkeletonList count={4} />
          ) : allSchedules.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-6 h-6 text-slate-400" />}
              title="Belum Ada Roster Jadwal Mengajar"
              description="Anda belum memiliki alokasi jadwal pelajaran mingguan di pangkalan data kurikulum."
            />
          ) : (
            <div className="space-y-4">
              {DAYS_OF_WEEK.map((d) => {
                const dayItems = weeklyGroupedSchedules[d.id] || [];
                const isToday = d.id === todayDayNumber;

                return (
                  <Card key={d.id} padding="none" className="overflow-hidden">
                    {/* Header Hari */}
                    <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                      isToday
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {d.name}
                        </span>
                        {isToday && (
                          <StatusBadge status="success" size="sm">Hari Ini</StatusBadge>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-500 font-mono">
                        {dayItems.length} Sesi KBM
                      </span>
                    </div>

                    {/* List Sesi */}
                    {dayItems.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        Tidak ada jam mengajar
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dayItems.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            onClick={() => setSelectedSchedule(item)}
                            className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 cursor-pointer min-h-[44px]"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {item.subject_name || item.subject_code}
                                </p>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Kelas {item.class_group_name || '-'} {item.room_name && `• Ruang ${item.room_name}`}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                {formatShortTime(item.start_time)} - {formatShortTime(item.end_time)}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM SHEET DETAIL JADWAL & SHORTCUTS                                    */}
      {/* ========================================================================= */}
      <BottomSheet
        isOpen={Boolean(selectedSchedule)}
        onClose={() => setSelectedSchedule(null)}
        title="Detail Sesi Jadwal Mengajar"
        description={selectedSchedule?.academic_year_name ? `Tahun Ajaran: ${selectedSchedule.academic_year_name}` : undefined}
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setSelectedSchedule(null)}
            >
              Tutup
            </Button>
          </div>
        }
      >
        {selectedSchedule && (
          <div className="space-y-4 py-1 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Mata Pelajaran:</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedSchedule.subject_name || selectedSchedule.subject_code}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Kode Mapel: <span className="font-mono font-bold">{selectedSchedule.subject_code || '-'}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px]">Rombel / Kelas:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {selectedSchedule.class_group_name || selectedSchedule.class_name || '-'}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px]">Lokasi Ruangan:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {selectedSchedule.room_name || '-'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px]">Waktu Pelaksanaan:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {DAYS_OF_WEEK.find((d) => d.id === normalizeDayNumber(selectedSchedule.day_of_week))?.name || 'Hari Terjadwal'}
                </span>
              </div>
              <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-lg">
                {formatShortTime(selectedSchedule.start_time)} - {formatShortTime(selectedSchedule.end_time)} WIB
              </span>
            </div>

            {/* Tombol Pintasan Aksi KBM */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Pintasan Aksi Kelas:</p>

              <Button
                variant="primary"
                fullWidth
                size="md"
                onClick={() => {
                  const s = selectedSchedule;
                  setSelectedSchedule(null);
                  navigate(`/guru/absensi-kelas?class_group_id=${s.class_group_id || ''}&schedule_id=${s.id || ''}`);
                }}
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                Mulai Presensi Siswa Rombel Ini
              </Button>

              <Button
                variant="secondary"
                fullWidth
                size="md"
                onClick={() => {
                  const s = selectedSchedule;
                  setSelectedSchedule(null);
                  navigate(`/guru/jurnal-mengajar?schedule_id=${s.id || ''}`);
                }}
                leftIcon={<BookOpen className="w-4 h-4" />}
              >
                Tulis / Rekap Jurnal Mengajar
              </Button>

              <Button
                variant="outline"
                fullWidth
                size="md"
                onClick={() => {
                  const s = selectedSchedule;
                  setSelectedSchedule(null);
                  navigate(`/guru/nilai?class_group_id=${s.class_group_id || ''}&subject_id=${s.subject_id || ''}`);
                }}
                leftIcon={<GraduationCap className="w-4 h-4" />}
              >
                Input Nilai Asesmen Mapel Ini
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
