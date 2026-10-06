import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { scheduleService } from '../services/scheduleService';
import { useTeacherAuth } from '../hooks/useTeacherAuth';

const TeacherContext = createContext(null);

const STORAGE_KEY = 'aldepos_teacher_active_context';

/**
 * TeacherProvider Context
 * Menyimpan dan menyinkronkan konteks aktif guru (Satuan Pendidikan, Tahun Ajaran, Semester, Penugasan).
 */
export const TeacherProvider = ({ children }) => {
  const { user } = useTeacherAuth();

  const [loadingContext, setLoadingContext] = useState(true);
  const [teachingAssignments, setTeachingAssignments] = useState([]);
  const [homeroomClasses, setHomeroomClasses] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [availableAcademicYears, setAvailableAcademicYears] = useState([]);

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
    } catch (err) {
      // If error or unauthenticated, maintain graceful empty state
      setTeachingAssignments([]);
      setHomeroomClasses([]);
    } finally {
      setLoadingContext(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContextData();
  }, [fetchContextData]);

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
        refreshContext: fetchContextData
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
      refreshContext: () => {}
    };
  }
  return context;
};

export default TeacherContext;
