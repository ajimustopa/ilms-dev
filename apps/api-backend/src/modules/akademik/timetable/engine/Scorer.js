/**
 * Scorer
 * Evaluator Soft Constraints & Objective Function
 * Menghitung skor kualitas 0-100 dan memberikan breakdown komponen
 */

const { DEFAULT_WEIGHTS } = require('./config/defaultWeights');

class Scorer {
  constructor(options = {}) {
    this.weights = {
      ...DEFAULT_WEIGHTS,
      ...(options.weights || {})
    };
  }

  /**
   * Menghitung total skor dan rincian per komponen dari jadwal yang ditempatkan
   * @param {Array<Object>} placedBlocks - Daftar sesi blok yang berhasil ditempatkan
   * @param {Object} context - { teacherAvailabilities, timeSlots, subjectConstraints }
   * @returns {{ score: number, breakdown: Object, warnings: Array<string> }}
   */
  evaluate(placedBlocks, context = {}) {
    const { teacherAvailabilities = {}, subjectConstraints = {} } = context;
    const warnings = [];

    if (!placedBlocks || placedBlocks.length === 0) {
      return {
        score: 0,
        breakdown: {
          spread_distribution: 0,
          teacher_gap_reduction: 0,
          subject_time_preference: 0,
          teacher_avoid_preference: 0
        },
        warnings: ['Tidak ada sesi pelajaran yang ditempatkan']
      };
    }

    // 1. Evaluasi Spread Distribution (Bobot: spread_distribution)
    const spreadResult = this.evaluateSpreadDistribution(placedBlocks);
    if (spreadResult.penaltyCount > 0) {
      warnings.push(...spreadResult.warnings);
    }

    // 2. Evaluasi Teacher Gap / Window Hours (Bobot: teacher_gap_reduction)
    const gapResult = this.evaluateTeacherGaps(placedBlocks);
    if (gapResult.penaltyCount > 0) {
      warnings.push(...gapResult.warnings);
    }

    // 3. Evaluasi Subject Time Preference (Bobot: subject_time_preference)
    const subjectPrefResult = this.evaluateSubjectPreferences(placedBlocks, subjectConstraints);
    if (subjectPrefResult.penaltyCount > 0) {
      warnings.push(...subjectPrefResult.warnings);
    }

    // 4. Evaluasi Teacher Avoid Slots (Bobot: teacher_avoid_preference)
    const avoidResult = this.evaluateTeacherAvoidSlots(placedBlocks, teacherAvailabilities);
    if (avoidResult.penaltyCount > 0) {
      warnings.push(...avoidResult.warnings);
    }

    // Normalisasi total bobot
    const totalWeight =
      (this.weights.spread_distribution || 0) +
      (this.weights.teacher_gap_reduction || 0) +
      (this.weights.subject_time_preference || 0) +
      (this.weights.teacher_avoid_preference || 0) || 100;

    const weightedScore = (
      spreadResult.score * (this.weights.spread_distribution || 0) +
      gapResult.score * (this.weights.teacher_gap_reduction || 0) +
      subjectPrefResult.score * (this.weights.subject_time_preference || 0) +
      avoidResult.score * (this.weights.teacher_avoid_preference || 0)
    ) / totalWeight;

    const finalScore = Math.max(0, Math.min(100, Math.round(weightedScore)));

    return {
      score: finalScore,
      breakdown: {
        spread_distribution: spreadResult.score,
        teacher_gap_reduction: gapResult.score,
        subject_time_preference: subjectPrefResult.score,
        teacher_avoid_preference: avoidResult.score
      },
      warnings: warnings.slice(0, 15) // Maksimal 15 warning representatif
    };
  }

  /**
   * Spread Distribution: Memastikan sesi dari pelajaran yang sama disebar ke hari yang berbeda
   */
  evaluateSpreadDistribution(placedBlocks) {
    const lessonDaysMap = new Map(); // lessonId -> Array<day>
    placedBlocks.forEach(b => {
      if (!lessonDaysMap.has(b.lesson_id)) {
        lessonDaysMap.set(b.lesson_id, []);
      }
      lessonDaysMap.get(b.lesson_id).push({ day: b.day_of_week, name: b.lesson_name });
    });

    let totalChecks = 0;
    let penalties = 0;
    const warnings = [];

    lessonDaysMap.forEach((occurrences, lessonId) => {
      if (occurrences.length <= 1) return;
      totalChecks += occurrences.length - 1;

      // Cek apakah ada di hari yang sama
      const dayCounts = {};
      occurrences.forEach(o => {
        dayCounts[o.day] = (dayCounts[o.day] || 0) + 1;
      });

      Object.entries(dayCounts).forEach(([day, count]) => {
        if (count > 1) {
          penalties += (count - 1) * 1.5; // Penalti berat jika 2 pertemuan ditaruh di hari sama
          warnings.push(`Pelajaran "${occurrences[0].name}" dijadwalkan ${count}x di hari yang sama (${this.getDayName(day)})`);
        }
      });

      // Cek apakah hari berurutan (misal Senin & Selasa)
      const sortedDays = occurrences.map(o => o.day).sort((a, b) => a - b);
      for (let i = 0; i < sortedDays.length - 1; i++) {
        if (sortedDays[i + 1] - sortedDays[i] === 1) {
          penalties += 0.5; // Penalti ringan untuk hari berurutan
        }
      }
    });

    if (totalChecks === 0) return { score: 100, penaltyCount: 0, warnings: [] };
    const score = Math.max(0, Math.round(100 - (penalties / totalChecks) * 100));
    return { score, penaltyCount: penalties, warnings };
  }

  /**
   * Teacher Gap Reduction: Menghitung jam kosong di sela-sela jam mengajar guru dalam sehari
   */
  evaluateTeacherGaps(placedBlocks) {
    // Map: teacherId -> { [day]: Array<period_index> }
    const teacherDailyPeriods = new Map();

    placedBlocks.forEach(b => {
      const teacherIds = b.teacher_ids || (b.primary_teacher_id ? [b.primary_teacher_id] : []);
      teacherIds.forEach(tid => {
        if (!tid) return;
        if (!teacherDailyPeriods.has(tid)) {
          teacherDailyPeriods.set(tid, {});
        }
        const dayMap = teacherDailyPeriods.get(tid);
        if (!dayMap[b.day_of_week]) dayMap[b.day_of_week] = [];
        
        // Tambahkan seluruh period yang dicakup blok ini
        for (let p = 0; p < (b.duration || 1); p++) {
          dayMap[b.day_of_week].push(b.period_index + p);
        }
      });
    });

    let totalGaps = 0;
    let activeDaysCount = 0;
    const warnings = [];

    teacherDailyPeriods.forEach((dayMap, teacherId) => {
      Object.entries(dayMap).forEach(([day, periods]) => {
        if (periods.length <= 1) return;
        activeDaysCount++;
        const sorted = Array.from(new Set(periods)).sort((a, b) => a - b);
        const minP = sorted[0];
        const maxP = sorted[sorted.length - 1];
        const span = maxP - minP + 1;
        const gaps = span - sorted.length;

        if (gaps > 0) {
          totalGaps += gaps;
          if (gaps >= 2) {
            warnings.push(`Guru ID ${teacherId} memiliki ${gaps} JP jam kosong di sela mengajar hari ${this.getDayName(day)}`);
          }
        }
      });
    });

    if (activeDaysCount === 0) return { score: 100, penaltyCount: 0, warnings: [] };
    // Rata-rata gap per hari aktif
    const avgGap = totalGaps / activeDaysCount;
    const score = Math.max(0, Math.round(100 - avgGap * 35));
    return { score, penaltyCount: totalGaps, warnings };
  }

  /**
   * Subject Time Preferences (misal PJOK di jam pagi JP 1-3)
   */
  evaluateSubjectPreferences(placedBlocks, subjectConstraints = {}) {
    let checked = 0;
    let penalties = 0;
    const warnings = [];

    placedBlocks.forEach(b => {
      const pref = subjectConstraints[b.subject_id] || b.constraints?.preferred_time || 'any';
      if (pref === 'any') return;
      checked++;

      if (pref === 'morning_only' && b.period_index > 3) {
        penalties++;
        warnings.push(`Mapel "${b.lesson_name}" dijadwalkan di JP ${b.period_index} (Melebihi preferensi jam pagi JP 1-3)`);
      } else if (pref === 'first_periods' && b.period_index > 2) {
        penalties++;
      } else if (pref === 'no_friday' && b.day_of_week === 5) {
        penalties += 2;
        warnings.push(`Mapel "${b.lesson_name}" dijadwalkan di hari Jumat (Preferensi melarang hari Jumat)`);
      }
    });

    if (checked === 0) return { score: 100, penaltyCount: 0, warnings: [] };
    const score = Math.max(0, Math.round(100 - (penalties / checked) * 100));
    return { score, penaltyCount: penalties, warnings };
  }

  /**
   * Teacher Avoid Slots (Status 'avoid' / Kuning pada ketersediaan guru)
   */
  evaluateTeacherAvoidSlots(placedBlocks, teacherAvailabilities = {}) {
    let checked = 0;
    let avoidHits = 0;
    const warnings = [];

    placedBlocks.forEach(b => {
      const teacherIds = b.teacher_ids || (b.primary_teacher_id ? [b.primary_teacher_id] : []);
      teacherIds.forEach(tid => {
        if (!tid) return;
        for (let p = 0; p < (b.duration || 1); p++) {
          checked++;
          const key = `${tid}_${b.day_of_week}_${b.period_index + p}`;
          if (teacherAvailabilities[key] === 'avoid') {
            avoidHits++;
            warnings.push(`Guru ID ${tid} ditempatkan pada slot yang dihindari (hari ${this.getDayName(b.day_of_week)} JP ${b.period_index + p})`);
          }
        }
      });
    });

    if (checked === 0) return { score: 100, penaltyCount: 0, warnings: [] };
    const score = Math.max(0, Math.round(100 - (avoidHits / checked) * 100));
    return { score, penaltyCount: avoidHits, warnings };
  }

  getDayName(day) {
    const names = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 7: 'Minggu' };
    return names[day] || `Hari ${day}`;
  }
}

module.exports = Scorer;
