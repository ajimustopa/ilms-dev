/**
 * Default Configuration: Soft Constraint Weights & Simulated Annealing Parameters
 */

const DEFAULT_WEIGHTS = {
  // Bobot relatif total = 100
  spread_distribution: 35,    // Anti-fatigue: menyebarkan sesi mapel di hari berbeda
  teacher_gap_reduction: 30,  // Meminimalkan jam kosong (window/idle) di jadwal guru
  subject_time_preference: 20,// Kesesuaian waktu mapel khusus (misal PJOK pagi)
  teacher_avoid_preference: 15// Menghindari slot yang ditandai guru sebagai 'avoid'
};

const DEFAULT_SA_OPTIONS = {
  initial_temperature: 100.0,
  cooling_rate: 0.95,
  iterations_per_temp: 50,
  max_iterations: 1500,
  max_time_ms: 15000,          // Batas waktu maksimal fase 2 (15 detik)
  min_temperature: 0.01
};

module.exports = {
  DEFAULT_WEIGHTS,
  DEFAULT_SA_OPTIONS
};
