import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { scheduleService } from '../services/scheduleService';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { getIndonesianDayName } from '../utils/dateHelper';

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

/**
 * TeacherProvider Context
 * Menyimpan dan menyinkronkan konteks aktif guru, data jadwal ter-cache, dan sesi mengajar terdekat (WIB).
 */
export const TeacherProvider = ({ children }) => {
  const { user } = useTeacherAuth();

  const [loadingContext, setLoadingContext] = useState(true);
  const [teachingAssignments, setTeachingAssignments] = useState([]);
  const [homeroomClasses, setHomeroomClasses] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [availableAcademicYears, setAvailableAcademicYears] = useState([]);

  // Cache Jadwal Mengajar (Diambil sekali pada mount, diperbarui via refreshSchedules)
  const [cachedSchedules, setCachedSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Active Selected Context
  const [activeContext, setActiveContext] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      satuanPendidikanId: null,
      satuanPendidikanName: '',
      academicYearId: null,
      academicYearName: '',
      semester: 'Ganjil' // 'Ganjil' | 'Genap'
    };
  });

  // 1. Fetch Konteks & Penugasan Guru
  const fetchContextData = useCallback(async () => {
    setLoadingContext(true);
    try {
      const res = await scheduleService.getMyTeachingAssignments();
      const data = res?.data || res || {};
      const assignments = data.assignments || [];
      const homerooms = data.homeroom_classes || [];

      setTeachingAssignments(assignments);
      setHomeroomClasses(homerooms);

      // Extract unique Units from assignments & user profile
      const unitMap = new Map();
      if (user?.school_units && Array.isArray(user.school_units)) {
        user.school_units.forEach((u) => {
          unitMap.set(String(u.id), { id: u.id, name: u.name || u.nama });
        });
      }
      assignments.forEach((a) => {
        if (a.satuan_pendidikan_id) {
          unitMap.set(String(a.satuan_pendidikan_id), {
            id: a.satuan_pendidikan_id,
            name: a.satuan_pendidikan_name || `Unit #${a.satuan_pendidikan_id}`
          });
        }
      });
      homerooms.forEach((h) => {
        if (h.satuan_pendidikan_id) {
          unitMap.set(String(h.satuan_pendidikan_id), {
            id: h.satuan_pendidikan_id,
            name: h.satuan_pendidikan_name || `Unit #${h.satuan_pendidikan_id}`
          });
        }
      });

      const units = Array.from(unitMap.values());
      setAvailableUnits(units);

      // Extract unique Academic Years
      const yearMap = new Map();
      assignments.forEach((a) => {
        if (a.academic_year_id && a.academic_year_name) {
          yearMap.set(String(a.academic_year_id), {
            id: a.academic_year_id,
            name: a.academic_year_name
          });
        }
      });
      homerooms.forEach((h) => {
        if (h.academic_year_id && h.academic_year_name) {
          yearMap.set(String(h.academic_year_id), {
            id: h.academic_year_id,
            name: h.academic_year_name
          });
        }
      });
      const years = Array.from(yearMap.values());
      setAvailableAcademicYears(years);

      // Auto-set default context if not set yet
      setActiveContext((prev) => {
        let newUnitId = prev.satuanPendidikanId;
        let newUnitName = prev.satuanPendidikanName;
        let newYearId = prev.academicYearId;
        let newYearName = prev.academicYearName;

        if (!newUnitId && units.length > 0) {
          newUnitId = units[0].id;
          newUnitName = units[0].name;
        }
        if (!newYearId && years.length > 0) {
          newYearId = years[0].id;
          newYearName = years[0].name;
        }

        const updated = {
          ...prev,
          satuanPendidikanId: newUnitId,
          satuanPendidikanName: newUnitName,
          academicYearId: newYearId,
          academicYearName: newYearName
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    } catch {
      setTeachingAssignments([]);
      setHomeroomClasses([]);
    } finally {
      setLoadingContext(false);
    }
  }, [user]);

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
      const className = s.class_name || s.rombel_name || s.kelas || 'Kelas';
      const room = s.room_name || s.ruang || s.room || null;

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
      const className = s.class_name || s.rombel_name || s.kelas || 'Kelas';
      const room = s.room_name || s.ruang || s.room || null;

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

  return (
    <TeacherContext.Provider
      value={{
        activeContext,
        updateContext,
        availableUnits,
        availableAcademicYears,
        teachingAssignments,
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
        satuanPendidikanId: null,
        satuanPendidikanName: 'Semua Unit',
        academicYearId: null,
        academicYearName: '2026/2027',
        semester: 'Ganjil'
      },
      updateContext: () => {},
      availableUnits: [],
      availableAcademicYears: [],
      teachingAssignments: [],
      homeroomClasses: [],
      loadingContext: false,
      refreshContext: () => {},
      cachedSchedules: [],
      loadingSchedules: false,
      refreshSchedules: () => {},
      nextTeachingSession: { hasActiveSession: false }
    };
  }
  return context;
};

export default TeacherContext;
