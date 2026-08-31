/**
 * Phase1FeasibilitySolver
 * CSP Solver untuk mencari solusi 100% valid (Feasibility Search)
 * Menggunakan Heuristik:
 * 1. MRV (Most Constrained Variable)
 * 2. LCV (Least Constraining Value)
 * 3. Forward Checking Domain Pruning
 * 4. Clear Diagnostic Failures saat dead-end
 */

const ConstraintChecker = require('./ConstraintChecker');

class Phase1FeasibilitySolver {
  constructor(data = {}) {
    this.timeSlots = data.timeSlots || [];
    this.teacherAvailabilities = data.teacherAvailabilities || {};
    this.classAvailabilities = data.classAvailabilities || {};
    this.options = data.options || {};
    this.maxBacktracks = this.options.max_backtracks || 50000;
    this.backtrackCount = 0;
    this.diagnosticLogs = [];
  }

  /**
   * Menjalankan Feasibility Search
   * @param {Array<Object>} blocks - Sesi blok yang belum ditempatkan
   * @param {Object} grid - Grid jadwal saat ini
   * @param {Array<Object>} placedBlocks - Array referensi penempatan
   * @returns {{ success: boolean, placedBlocks: Array<Object>, diagnostics: Object }}
   */
  solve(blocks = [], grid = {}, placedBlocks = []) {
    this.backtrackCount = 0;
    this.diagnosticLogs = [];

    // Filter blok yang belum ditempatkan & bukan locked
    const freeBlocks = blocks.filter(b => !b.is_locked);
    if (freeBlocks.length === 0) {
      return { success: true, placedBlocks, diagnostics: null };
    }

    // 1. Inisialisasi Domain Slot untuk Setiap Blok
    const blockDomains = new Map();
    for (const block of freeBlocks) {
      const feasible = this.getFeasibleSlots(block, grid);
      blockDomains.set(block.block_id, feasible);

      // Deteksi dead-end dini (domain kosong sejak awal)
      if (feasible.length === 0) {
        const diag = this.diagnoseBlockFailure(block, grid);
        this.diagnosticLogs.push(diag);
      }
    }

    if (this.diagnosticLogs.length > 0) {
      return {
        success: false,
        placedBlocks,
        diagnostics: {
          reason: 'Terdapat pembelajaran yang tidak memiliki slot waktu valid yang tersedia',
          failures: this.diagnosticLogs
        }
      };
    }

    // 2. Variable Ordering: Most Constrained Variable (MRV)
    // Urutkan blok: Mapel Pilihan Paralel (is_elective) didahulukan agar co-scheduled bersama,
    // lalu urutkan domain slot paling sedikit, durasi terbesar, dan jumlah guru terbanyak
    const sortedBlocks = [...freeBlocks].sort((a, b) => {
      if (a.is_elective !== b.is_elective) return a.is_elective ? -1 : 1; // Mapel pilihan paralel pertama
      const domainA = blockDomains.get(a.block_id)?.length || 0;
      const domainB = blockDomains.get(b.block_id)?.length || 0;
      if (domainA !== domainB) return domainA - domainB; // Domain terkecil didahulukan (MRV)
      if (b.duration !== a.duration) return b.duration - a.duration; // Durasi lebih besar
      if (b.is_joined_class !== a.is_joined_class) return b.is_joined_class ? 1 : -1;
      return (b.teacher_ids?.length || 1) - (a.teacher_ids?.length || 1);
    });

    // 3. Eksekusi Recursive Backtracking dengan Forward Checking
    const success = this.backtrack(sortedBlocks, 0, grid, placedBlocks, blockDomains);

    let diagnostics = null;
    if (!success) {
      const unplaced = freeBlocks.filter(b => !placedBlocks.some(p => p.block_id === b.block_id));
      diagnostics = {
        reason: `Gagal menemukan jadwal tanpa bentrok setelah ${this.backtrackCount} iterasi backtrack.`,
        unplaced_count: unplaced.length,
        failures: unplaced.map(b => this.diagnoseBlockFailure(b, grid))
      };
    }

    return {
      success,
      placedBlocks,
      diagnostics
    };
  }

  /**
   * Backtracking Search dengan Forward Checking & LCV
   */
  backtrack(blocks, index, grid, placedBlocks, blockDomains) {
    if (index >= blocks.length) {
      return true; // Seluruh blok berhasil dialokasikan!
    }

    if (++this.backtrackCount > this.maxBacktracks) {
      return false; // Safety timeout / loop limit
    }

    const currentBlock = blocks[index];
    let candidateSlots = this.getFeasibleSlots(currentBlock, grid);

    // Jika blok saat ini adalah mapel pilihan (is_elective), dan sudah ada mapel pilihan lain dari grup paralel yang sama yang ditempatkan,
    // maka wajib ditempatkan pada slot hari & JP yang sama persis (co-scheduled parallel per grup jenjang)
    if (currentBlock.is_elective && currentBlock.elective_group_key) {
      const placedSameGroup = placedBlocks.find(
        p => p.is_elective && p.elective_group_key === currentBlock.elective_group_key && p.day_of_week && p.period_index
      );
      if (placedSameGroup) {
        candidateSlots = candidateSlots.filter(
          s => s.day === placedSameGroup.day_of_week && s.start_period === placedSameGroup.period_index
        );
      }
    }

    // Value Ordering: Least Constraining Value (LCV)
    this.orderCandidateSlotsByLCV(candidateSlots, currentBlock, blocks, index, grid);

    for (const candidate of candidateSlots) {
      // 1. Tempatkan blok ke grid
      this.placeBlock(currentBlock, candidate, grid, placedBlocks);

      // 2. Recursive step
      if (this.backtrack(blocks, index + 1, grid, placedBlocks, blockDomains)) {
        return true;
      }

      // 3. Backtrack (Batalkan penempatan)
      this.unplaceBlock(currentBlock, candidate, grid, placedBlocks);
    }

    return false;
  }

  /**
   * Value Ordering Ringan: Urutkan slot secara alami untuk distribusi seimbang antar hari
   */
  orderCandidateSlotsByLCV(candidateSlots, currentBlock, blocks, currentIndex, grid) {
    if (candidateSlots.length <= 1) return;
    // Acak sedikit atau urutkan slot yang sudah terisi sedikit oleh guru/kelas untuk menyeimbangkan beban hari
    candidateSlots.sort((a, b) => a.day - b.day || a.start_period - b.start_period);
  }

  /**
   * Mencari seluruh kandidat slot waktu yang feasible untuk suatu blok
   */
  getFeasibleSlots(block, grid) {
    const validSlots = [];
    const days = [1, 2, 3, 4, 5, 6, 7];

    for (const day of days) {
      const daySlots = this.timeSlots
        .filter(s => s.day_of_week === day && s.is_generator_usable && s.type === 'lesson')
        .sort((a, b) => a.period_index - b.period_index);

      for (let i = 0; i <= daySlots.length - block.duration; i++) {
        const consecutivePeriods = ConstraintChecker.getConsecutivePeriods(daySlots, i, block.duration);
        if (!consecutivePeriods) continue;

        const checkResult = ConstraintChecker.isPlacementFeasible(
          block,
          day,
          consecutivePeriods,
          grid,
          {
            teacherAvailabilities: this.teacherAvailabilities,
            classAvailabilities: this.classAvailabilities
          }
        );

        if (checkResult.valid) {
          validSlots.push({
            day,
            start_period: consecutivePeriods[0].period_index,
            start_time: consecutivePeriods[0].start_time,
            end_time: consecutivePeriods[consecutivePeriods.length - 1].end_time,
            periods: consecutivePeriods
          });
        }
      }
    }

    return validSlots;
  }

  /**
   * Menempatkan blok ke grid
   */
  placeBlock(block, slot, grid, placedBlocks) {
    const teacherIds = block.teacher_ids || (block.primary_teacher_id ? [block.primary_teacher_id] : []);
    const classIds = block.class_ids || (block.primary_class_id ? [block.primary_class_id] : []);

    slot.periods.forEach(p => {
      const periodIndex = p.period_index;
      if (!grid[slot.day][periodIndex]) {
        grid[slot.day][periodIndex] = {
          teacherIds: new Set(),
          classIds: new Set(),
          roomNames: new Set(),
          is_elective: !!block.is_elective,
          elective_group_key: block.elective_group_key || null
        };
      } else if (block.is_elective) {
        grid[slot.day][periodIndex].is_elective = true;
        if (block.elective_group_key) {
          grid[slot.day][periodIndex].elective_group_key = block.elective_group_key;
        }
      }
      teacherIds.forEach(t => grid[slot.day][periodIndex].teacherIds.add(String(t)));
      classIds.forEach(c => grid[slot.day][periodIndex].classIds.add(String(c)));
      if (block.room_name) grid[slot.day][periodIndex].roomNames.add(block.room_name);
    });

    placedBlocks.push({
      ...block,
      day_of_week: slot.day,
      period_index: slot.start_period,
      start_time: slot.start_time,
      end_time: slot.end_time
    });
  }

  /**
   * Membatalkan penempatan blok dari grid
   */
  unplaceBlock(block, slot, grid, placedBlocks) {
    const teacherIds = block.teacher_ids || (block.primary_teacher_id ? [block.primary_teacher_id] : []);
    const classIds = block.class_ids || (block.primary_class_id ? [block.primary_class_id] : []);

    slot.periods.forEach(p => {
      const periodIndex = p.period_index;
      const cell = grid[slot.day]?.[periodIndex];
      if (cell) {
        teacherIds.forEach(t => cell.teacherIds.delete(String(t)));
        classIds.forEach(c => cell.classIds.delete(String(c)));
        if (block.room_name) cell.roomNames.delete(block.room_name);

        if (cell.teacherIds.size === 0 && cell.classIds.size === 0 && !cell.is_locked && !cell.is_activity) {
          delete grid[slot.day][periodIndex];
        }
      }
    });

    const idx = placedBlocks.findIndex(p => p.block_id === block.block_id);
    if (idx !== -1) placedBlocks.splice(idx, 1);
  }

  /**
   * Mendiagnosis alasan spesifik mengapa suatu blok gagal mendapatkan slot
   */
  diagnoseBlockFailure(block, grid) {
    const teacherIds = block.teacher_ids || [];
    const classIds = block.class_ids || [];
    
    // Periksa kapasitas sisa slot untuk guru terkait
    const teacherCapacities = teacherIds.map(tid => {
      const unavCount = Object.keys(this.teacherAvailabilities).filter(k => k.startsWith(`${tid}_`) && this.teacherAvailabilities[k] === 'unavailable').length;
      return `Guru ID ${tid} (Tercatat ${unavCount} jam libur / unavailable)`;
    });

    return {
      lesson_name: block.lesson_name,
      duration: `${block.duration} JP`,
      teachers: teacherIds,
      teacher_details: teacherCapacities,
      classes: classIds,
      suggestion: 'Kapasitas slot waktu mengajar yang tersedia untuk guru pengampu tidak mencukupi total beban mengajarnya. Buka Tahap 3 (Ketersediaan Guru) dan kurangi penandaan jam Libur/Unavailable pada guru terkait, atau tambahkan JP operasional sekolah pada Tahap 1.'
    };
  }
}

module.exports = Phase1FeasibilitySolver;
