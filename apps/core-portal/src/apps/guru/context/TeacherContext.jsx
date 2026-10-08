import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../../shared/services/api';
import { scheduleService } from '../services/scheduleService';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { getIndonesianDayName } from '../utils/dateHelper';
import { getScheduleClassGroupDisplay, getScheduleRoomDisplay } from '../utils/scheduleHelper';

const TeacherContext = createContext(null);

const STORAGE_KEY = 'aldepos_teacher_active_context';

/**
 * Helper mendapatkan waktu sekarang dalam zona waktu Asia/Jakarta (WIB)
 */
function getWibNow() {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'narrow'
    });
    const parts = formatter.formatToParts(now);
    const map = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });

    const hour = parseInt(map.hour, 10) || 0;
    const minute = parseInt(map.minute, 10) || 0;
    const currentMinutes = hour * 60 + minute;

    // Hitung day_of_week (1=Senin..7=Minggu)
    const dayOfWeek = now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' }).toLowerCase();
    const dayIndexMap = {
      senin: 1,
      selasa: 2,
      rabu: 3,
      kamis: 4,
      jumat: 5,
      sabtu: 6,
      minggu: 7
    };
    const numericDay = dayIndexMap[dayOfWeek] || 1;

    return {
      hour,
      minute,
      currentMinutes,
      dayName: dayOfWeek,
      numericDay
    };
  } catch {
    const d = new Date();
    const currentMinutes = d.getHours() * 60 + d.getMinutes();
    const dayIdx = d.getDay();
    return {
      hour: d.getHours(),
      minute: d.getMinutes(),
      currentMinutes,
      dayName: getIndonesianDayName(d).toLowerCase(),
      numericDay: dayIdx === 0 ? 7 : dayIdx
    };
  }
}

/**
 * Helper konversi string jam "HH:mm" atau "HH:mm:ss" ke menit harian
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = String(timeStr).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const DEFAULT_SCHOOL_UNITS = [
  { id: 1, name: 'SMP Aldepos Islamic Boarding School', code: 'SMP-IT', level: 'SMP', jenjang: 'SMP' },
  { id: 2, name: 'SMA Aldepos Islamic Boarding School', code: 'SMA-IT', level: 'SMA', jenjang: 'SMA' }
];

export const DEFAULT_ACADEMIC_YEARS = [
  { id: 2, name: '2026/2027', is_active: true },
  { id: 1, name: '2025/2026', is_active: false }
];

export const DEFAULT_SEMESTERS = [
  { id: 1, name: 'Semester Ganjil', semester_type: 'ganjil', is_active: true },
  { id: 2, name: 'Semester Genap', semester_type: 'genap', is_active: false }
];

/**
 * Helper format nama gabungan beberapa satuan pendidikan terpilih
 */
export function formatUnitsLabel(selectedUnitIds = [], allUnits = []) {
  if (!selectedUnitIds || selectedUnitIds.length === 0) return 'Semua Satuan Pendidikan';
  const unitsList = allUnits && allUnits.length > 0 ? allUnits : DEFAULT_SCHOOL_UNITS;
  if (unitsList.length > 0 && selectedUnitIds.length >= unitsList.length) {
    return 'Semua Satuan Pendidikan';
  }
  const matched = unitsList.filter((u) => selectedUnitIds.some((id) => String(id) === String(u.id)));
  if (matched.length === 0) return 'Semua Satuan Pendidikan';
  if (matched.length === 1) return matched[0].name;
  
  const shortNames = matched.map((u) => u.code || u.jenjang || u.name.replace(' Aldepos Islamic Boarding School', '').replace(' Aldepos', ''));
  return shortNames.join(' & ');
}

/**
 * TeacherProvider Context
 * Menyimpan dan menyinkronkan konteks aktif guru merujuk pada:
 * - Satuan Pendidikan dari Core Admin (/core/school-units) - Mendukung Multi-Select Satuan Pendidikan
 * - Tahun Ajaran & Semester dari Master Akademik (/akademik/academic-years & /akademik/semesters)
 */
export const TeacherProvider = ({ children }) => {
  const { user } = useTeacherAuth();

  const [loadingContext, setLoadingContext] = useState(false);
  const [teachingAssignments, setTeachingAssignments] = useState([]);
  const [homeroomClasses, setHomeroomClasses] = useState([]);
  const [availableUnits, setAvailableUnits] = useState(DEFAULT_SCHOOL_UNITS);
  const [availableAcademicYears, setAvailableAcademicYears] = useState(DEFAULT_ACADEMIC_YEARS);
  const [availableSemesters, setAvailableSemesters] = useState(DEFAULT_SEMESTERS);

  // Cache Jadwal Mengajar (Diambil sekali pada mount, diperbarui via refreshSchedules)
  const [cachedSchedules, setCachedSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Active Selected Context (Mendukung Multi-Unit)
  const [activeContext, setActiveContext] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const unitIds = Array.isArray(parsed.satuanPendidikanIds) && parsed.satuanPendidikanIds.length > 0
          ? parsed.satuanPendidikanIds
          : (parsed.satuanPendidikanId ? [parsed.satuanPendidikanId] : [1, 2]);

        const isAll = unitIds.length >= DEFAULT_SCHOOL_UNITS.length;
        return {
          ...parsed,
          satuanPendidikanIds: unitIds,
          satuanPendidikanId: unitIds.length === 1 ? unitIds[0] : (unitIds[0] || 1),
          satuanPendidikanName: parsed.satuanPendidikanName || formatUnitsLabel(unitIds, DEFAULT_SCHOOL_UNITS),
          isAllUnits: isAll
        };
      }
    } catch {
      // fallback
    }
    return {
      satuanPendidikanIds: [1, 2],
      satuanPendidikanId: 1,
      satuanPendidikanName: 'Semua Satuan Pendidikan',
      isAllUnits: true,
      academicYearId: 2,
      academicYearName: '2026/2027',
      semester: 'Ganjil',
      semesterId: null,
      semesterName: 'Semester Ganjil'
    };
  });

  /**
   * Helper mengambil data Tahun Ajaran dan Semester untuk unit sekolah tertentu dari modul Akademik
   */
  const fetchAcademicDataForUnit = useCallback(async (unitId) => {
    try {
      const params = unitId ? { satuan_pendidikan_id: unitId } : {};
      const [yearsRes, semsRes] = await Promise.all([
        api.get('/akademik/academic-years', { params }).catch(() => null),
        api.get('/akademik/semesters', { params }).catch(() => null)
      ]);

      const rawYears = yearsRes?.data?.data || [];
      const rawSems = semsRes?.data?.data || [];

      const years = Array.isArray(rawYears) && rawYears.length > 0
        ? rawYears.map((y) => ({
            id: y.id,
            name: y.name,
            is_active: Boolean(y.is_active),
            satuan_pendidikan_id: y.satuan_pendidikan_id
          }))
        : DEFAULT_ACADEMIC_YEARS;

      const sems = Array.isArray(rawSems) && rawSems.length > 0
        ? rawSems.map((s) => ({
            id: s.id,
            name: s.name,
            semester_type: s.semester_type || (s.name.toLowerCase().includes('genap') ? 'genap' : 'ganjil'),
            is_active: Boolean(s.is_active),
            satuan_pendidikan_id: s.satuan_pendidikan_id,
            academic_year_id: s.academic_year_id
          }))
        : DEFAULT_SEMESTERS;

      return { years, semesters: sems };
    } catch (err) {
      console.warn('Gagal memuat tahun ajaran & semester untuk unit:', unitId, err);
      return { years: DEFAULT_ACADEMIC_YEARS, semesters: DEFAULT_SEMESTERS };
    }
  }, []);

  // 1. Fetch Konteks (Satuan Pendidikan dari Core & Master Akademik) & Penugasan Guru
  const fetchContextData = useCallback(async () => {
    setLoadingContext(true);
    try {
      // a. Ambil Satuan Pendidikan langsung dari Master Core Service (/core/school-units)
      const [unitsRes, assignmentsRes] = await Promise.all([
        api.get('/core/school-units').catch(() => null),
        scheduleService.getMyTeachingAssignments().catch(() => null)
      ]);

      const rawUnits = unitsRes?.data?.data?.items || unitsRes?.data?.data || [];
      let units = [];
      if (Array.isArray(rawUnits) && rawUnits.length > 0) {
        units = rawUnits
          .filter((u) => u.is_active !== 0 && u.is_active !== false)
          .map((u) => ({
            id: u.id,
            name: u.name,
            code: u.code || u.level || '',
            level: u.level || '',
            jenjang: u.level || u.jenjang || ''
          }));
      }

      // Jika user memiliki batasan school_units spesifik dan bukan admin yayasan/super admin
      const isUniversalAdmin = user?.is_super_admin || user?.account_type === 'super_admin' || user?.account_type === 'admin_yayasan';
      if (!isUniversalAdmin && user?.school_units && Array.isArray(user.school_units) && user.school_units.length > 0 && units.length > 0) {
        const allowedIds = new Set(user.school_units.map((su) => String(su.id || su.school_unit_id)));
        const filtered = units.filter((u) => allowedIds.has(String(u.id)));
        if (filtered.length > 0) {
          units = filtered;
        }
      }

      const finalUnits = units.length > 0 ? units : DEFAULT_SCHOOL_UNITS;
      setAvailableUnits(finalUnits);

      // b. Penugasan mengajar & wali kelas
      const assignData = assignmentsRes?.data || assignmentsRes || {};
      const assignments = assignData.assignments || [];
      const homerooms = assignData.homeroom_classes || [];
      setTeachingAssignments(assignments);
      setHomeroomClasses(homerooms);

      // c. Tentukan unit yang sedang aktif
      const currentUnitId = activeContext?.satuanPendidikanId || finalUnits[0]?.id || 1;
      const currentUnitObj = finalUnits.find((u) => String(u.id) === String(currentUnitId)) || finalUnits[0];

      // d. Ambil Tahun Ajaran dan Semester dari Master Akademik (/akademik/academic-years & /akademik/semesters)
      const { years: finalYears, semesters: finalSems } = await fetchAcademicDataForUnit(currentUnitObj?.id);
      setAvailableAcademicYears(finalYears);
      setAvailableSemesters(finalSems);

      // e. Auto-set default context sinkron dengan Master
      setActiveContext((prev) => {
        let validUnitIds = (prev.satuanPendidikanIds || []).filter((id) =>
          finalUnits.some((u) => String(u.id) === String(id))
        );
        if (validUnitIds.length === 0) {
          validUnitIds = finalUnits.map((u) => u.id);
        }

        const isAll = validUnitIds.length >= finalUnits.length;
        const activeYear = finalYears.find((y) => y.is_active) || finalYears.find((y) => String(y.id) === String(prev.academicYearId)) || finalYears[0];
        const activeSem = finalSems.find((s) => s.is_active) || finalSems[0];

        const semLabel = prev.semester || (activeSem?.name?.toLowerCase().includes('genap') ? 'Genap' : 'Ganjil');
        const unitLabel = formatUnitsLabel(validUnitIds, finalUnits);

        const updated = {
          ...prev,
          satuanPendidikanIds: validUnitIds,
          satuanPendidikanId: validUnitIds.length === 1 ? validUnitIds[0] : (validUnitIds[0] || 1),
          satuanPendidikanName: unitLabel,
          isAllUnits: isAll,
          academicYearId: activeYear ? activeYear.id : 2,
          academicYearName: activeYear ? activeYear.name : '2026/2027',
          semester: semLabel,
          semesterId: activeSem ? activeSem.id : null,
          semesterName: activeSem ? activeSem.name : `Semester ${semLabel}`
        };

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    } catch (err) {
      console.error('Error fetching teacher context data:', err);
      setAvailableUnits(DEFAULT_SCHOOL_UNITS);
      setAvailableAcademicYears(DEFAULT_ACADEMIC_YEARS);
      setAvailableSemesters(DEFAULT_SEMESTERS);
    } finally {
      setLoadingContext(false);
    }
  }, [user, fetchAcademicDataForUnit]);

  // 2. Fetch Seluruh Jadwal Mengajar (Di-cache untuk evaluasi sesi countdown)
  const fetchSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const res = await scheduleService.getMySchedules();
      const scheduleList = res?.schedules || (Array.isArray(res) ? res : res?.data || []);
      setCachedSchedules(scheduleList);
    } catch {
      setCachedSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  useEffect(() => {
    fetchContextData();
    fetchSchedules();
  }, [fetchContextData, fetchSchedules]);

  const updateContext = useCallback((updates) => {
    setActiveContext((prev) => {
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // 3. Heartbeat Timer (Setiap 60 Detik) untuk Evaluasi Sesi Mengajar Asia/Jakarta
  const [timeHeartbeat, setTimeHeartbeat] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeHeartbeat((v) => v + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 4. Kalkulasi Sesi Mengajar Berikutnya / Sedang Berlangsung
  const nextTeachingSession = useMemo(() => {
    if (!cachedSchedules || cachedSchedules.length === 0) {
      return { hasActiveSession: false };
    }

    const wib = getWibNow();
    const todaySchedules = cachedSchedules.filter((s) => {
      if (!s) return false;
      if (Number(s.day_of_week) === wib.numericDay) return true;
      const sDay = String(s.day_of_week || '').toLowerCase();
      return sDay === wib.dayName || sDay.includes(wib.dayName);
    });

    if (todaySchedules.length === 0) {
      return { hasActiveSession: false };
    }

    // Urutkan berdasarkan waktu mulai
    todaySchedules.sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));

    let ongoingSession = null;
    let upcomingSession = null;

    for (const sched of todaySchedules) {
      const startMin = parseTimeToMinutes(sched.start_time);
      const endMin = parseTimeToMinutes(sched.end_time);

      // Sedang berlangsung
      if (wib.currentMinutes >= startMin && wib.currentMinutes <= endMin) {
        ongoingSession = {
          session: sched,
          minutesLeft: endMin - wib.currentMinutes,
          startMin,
          endMin
        };
        break; // Utamakan yang sedang berlangsung
      }

      // Sesi berikutnya dalam 30 menit
      if (startMin > wib.currentMinutes && startMin - wib.currentMinutes <= 30) {
        if (!upcomingSession) {
          upcomingSession = {
            session: sched,
            minutesUntil: startMin - wib.currentMinutes,
            startMin,
            endMin
          };
        }
      }
    }

    if (ongoingSession) {
      const s = ongoingSession.session;
      const subjectName = s.subject_name || s.mata_pelajaran || s.nama_mapel || 'Mata Pelajaran';
      const className = getScheduleClassGroupDisplay(s);
      const room = getScheduleRoomDisplay(s);

      return {
        hasActiveSession: true,
        status: 'ongoing',
        minutesDiff: ongoingSession.minutesLeft,
        session: s,
        subjectName,
        className,
        room,
        startTime: s.start_time ? String(s.start_time).slice(0, 5) : '',
        endTime: s.end_time ? String(s.end_time).slice(0, 5) : ''
      };
    }

    if (upcomingSession) {
      const s = upcomingSession.session;
      const subjectName = s.subject_name || s.mata_pelajaran || s.nama_mapel || 'Mata Pelajaran';
      const className = getScheduleClassGroupDisplay(s);
      const room = getScheduleRoomDisplay(s);

      return {
        hasActiveSession: true,
        status: 'upcoming',
        minutesDiff: upcomingSession.minutesUntil,
        session: s,
        subjectName,
        className,
        room,
        startTime: s.start_time ? String(s.start_time).slice(0, 5) : '',
        endTime: s.end_time ? String(s.end_time).slice(0, 5) : ''
      };
    }

    return { hasActiveSession: false };
  }, [cachedSchedules, timeHeartbeat]);

  const activeSchoolUnits = useMemo(() => {
    const ids = activeContext?.satuanPendidikanIds || (activeContext?.satuanPendidikanId ? [activeContext.satuanPendidikanId] : []);
    return availableUnits.filter((u) => ids.some((id) => String(id) === String(u.id)));
  }, [availableUnits, activeContext?.satuanPendidikanIds, activeContext?.satuanPendidikanId]);

  const activeSchoolUnit = useMemo(() => {
    return availableUnits.find((u) => String(u.id) === String(activeContext?.satuanPendidikanId)) || {
      id: activeContext?.satuanPendidikanId,
      name: activeContext?.satuanPendidikanName
    };
  }, [availableUnits, activeContext?.satuanPendidikanId, activeContext?.satuanPendidikanName]);

  const activeAcademicYear = useMemo(() => {
    return availableAcademicYears.find((y) => String(y.id) === String(activeContext?.academicYearId)) || {
      id: activeContext?.academicYearId,
      name: activeContext?.academicYearName
    };
  }, [availableAcademicYears, activeContext?.academicYearId, activeContext?.academicYearName]);

  return (
    <TeacherContext.Provider
      value={{
        activeContext,
        updateContext,
        availableUnits,
        availableAcademicYears,
        availableSemesters,
        fetchAcademicDataForUnit,
        activeSchoolUnit,
        activeSchoolUnits,
        activeAcademicYear,
        teachingAssignments,
        myTeachingAssignments: teachingAssignments,
        homeroomClasses,
        loadingContext,
        refreshContext: fetchContextData,
        cachedSchedules,
        loadingSchedules,
        refreshSchedules: fetchSchedules,
        nextTeachingSession
      }}
    >
      {children}
    </TeacherContext.Provider>
  );
};

export const useTeacherContext = () => {
  const context = useContext(TeacherContext);
  if (!context) {
    return {
      activeContext: {
        satuanPendidikanIds: [1, 2],
        satuanPendidikanId: 1,
        satuanPendidikanName: 'Semua Satuan Pendidikan',
        isAllUnits: true,
        academicYearId: 2,
        academicYearName: '2026/2027',
        semester: 'Ganjil'
      },
      updateContext: () => { },
      availableUnits: DEFAULT_SCHOOL_UNITS,
      availableAcademicYears: DEFAULT_ACADEMIC_YEARS,
      availableSemesters: DEFAULT_SEMESTERS,
      fetchAcademicDataForUnit: async () => ({ years: DEFAULT_ACADEMIC_YEARS, semesters: DEFAULT_SEMESTERS }),
      activeSchoolUnit: DEFAULT_SCHOOL_UNITS[0],
      activeSchoolUnits: DEFAULT_SCHOOL_UNITS,
      activeAcademicYear: DEFAULT_ACADEMIC_YEARS[0],
      teachingAssignments: [],
      myTeachingAssignments: [],
      homeroomClasses: [],
      loadingContext: false,
      refreshContext: () => { },
      cachedSchedules: [],
      loadingSchedules: false,
      refreshSchedules: () => { },
      nextTeachingSession: { hasActiveSession: false }
    };
  }
  return context;
};

export default TeacherContext;
