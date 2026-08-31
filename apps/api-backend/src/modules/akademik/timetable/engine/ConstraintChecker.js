/**
 * ConstraintChecker
 * Validator sentral untuk 5 Hard Constraints (Wajib dipenuhi 100%)
 * Digunakan bersama oleh Fase 1 (CSP Solver) & Fase 2 (Simulated Annealing)
 */

class ConstraintChecker {
  /**
   * Memvalidasi apakah penempatan sesi `block` pada (day, periods) valid 100%
   * @param {Object} block - Sesi blok yang akan ditempatkan
   * @param {number} day - Hari (1..7)
   * @param {Array<Object>} consecutivePeriods - Daftar time slot periode berurutan
   * @param {Object} grid - Matriks status grid jadwal saat ini
   * @param {Object} context - { teacherAvailabilities, classAvailabilities, timeSlots }
   * @returns {{ valid: boolean, reason?: string }}
   */
  static isPlacementFeasible(block, day, consecutivePeriods, grid, context = {}) {
    const { teacherAvailabilities = {}, classAvailabilities = {} } = context;
    const teacherIds = block.teacher_ids || (block.primary_teacher_id ? [block.primary_teacher_id] : []);
    const classIds = block.class_ids || (block.primary_class_id ? [block.primary_class_id] : []);

    for (const slot of consecutivePeriods) {
      const periodIndex = slot.period_index;

      // 1. Hard Constraint 1: Teacher Availability (Tidak boleh 'unavailable')
      for (const teacherId of teacherIds) {
        if (!teacherId) continue;
        const key = `${teacherId}_${day}_${periodIndex}`;
        const status = teacherAvailabilities[key];
        if (status === 'unavailable') {
          return {
            valid: false,
            constraint: 'teacher_unavailable',
            reason: `Guru (ID: ${teacherId}) tidak bersedia mengajar pada hari ${day} JP ${periodIndex} (Status: Libur/Unavailable)`
          };
        }
      }

      // 2. Hard Constraint 2: Class Availability (Tidak boleh 'unavailable' atau 'blocked')
      for (const classId of classIds) {
        if (!classId) continue;
        const key = `${classId}_${day}_${periodIndex}`;
        const status = classAvailabilities[key];
        if (status === 'unavailable' || status === 'blocked') {
          return {
            valid: false,
            constraint: 'class_blocked',
            reason: `Rombel (ID: ${classId}) diblokir/tidak memiliki KBM pada hari ${day} JP ${periodIndex}`
          };
        }
      }

      // Periksa sel grid pada (day, periodIndex)
      const cell = grid[day]?.[periodIndex];
      if (cell) {
        // 3. Hard Constraint 5: Locked Entries (Tidak boleh menimpa slot terkunci)
        if (cell.is_locked) {
          return {
            valid: false,
            constraint: 'locked_slot',
            reason: `Slot hari ${day} JP ${periodIndex} telah dikunci manual (is_locked)`
          };
        }

        // Slot Non-KBM (Activity / Break)
        if (cell.is_activity || cell.is_break) {
          return {
            valid: false,
            constraint: 'non_kbm_activity',
            reason: `Slot hari ${day} JP ${periodIndex} dialokasikan untuk kegiatan non-KBM (${cell.label || 'Activity/Break'})`
          };
        }

        // 4. Hard Constraint 3: No Teacher Clashing
        for (const teacherId of teacherIds) {
          if (teacherId && cell.teacherIds && cell.teacherIds.has(String(teacherId))) {
            return {
              valid: false,
              constraint: 'teacher_clash',
              reason: `Bentrok Guru: Guru (ID: ${teacherId}) sudah mengajar di kelas lain pada hari ${day} JP ${periodIndex}`
            };
          }
        }

        // 5. Hard Constraint 4: No Class Clashing (Kecuali mapel pilihan paralel dalam kelompok yang sama)
        for (const classId of classIds) {
          if (classId && cell.classIds && cell.classIds.has(String(classId))) {
            // Pengecualian: Mapel Pilihan Paralel (is_elective) diizinkan co-exist HANYA jika sesama grup pilihan yang sama
            const isElectiveCoexist = block.is_elective && cell.is_elective && (
              !block.elective_group_key || !cell.elective_group_key || block.elective_group_key === cell.elective_group_key
            );
            if (!isElectiveCoexist) {
              return {
                valid: false,
                constraint: 'class_clash',
                reason: `Bentrok Rombel: Rombel (ID: ${classId}) sudah memiliki mapel lain pada hari ${day} JP ${periodIndex}`
              };
            }
          }
        }
      }
    }

    return { valid: true };
  }

  /**
   * Helper: Mendapatkan slot berurutan valid untuk suatu durasi
   */
  static getConsecutivePeriods(daySlots, startIndex, duration) {
    if (startIndex + duration > daySlots.length) return null;
    const periods = [];
    for (let d = 0; d < duration; d++) {
      const slot = daySlots[startIndex + d];
      if (!slot) return null;
      if (d > 0 && slot.period_index !== daySlots[startIndex].period_index + d) {
        // Tidak berurutan (misal terpotong istirahat)
        return null;
      }
      periods.push(slot);
    }
    return periods;
  }
}

module.exports = ConstraintChecker;
