/**
 * Mock Akademik PPDB Intake Service
 * Sesuai api-contract-website-utama.md §7.1
 * Dipanggil saat submit final pendaftar PPDB
 */
async function sendToAkademikIntake(registrantData) {
  // Simulasi respons intake Akademik
  return {
    academic_ref_id: Math.floor(100 + Math.random() * 900),
    status: 'verifying',
    submitted_at: new Date().toISOString()
  };
}

module.exports = {
  sendToAkademikIntake
};
