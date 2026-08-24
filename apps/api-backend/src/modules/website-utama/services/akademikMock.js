/**
 * MOCK SEMENTARA — ganti ke HTTP call api.aldeposibs.com/api/v1/akademik/ppdb/intake begitu endpoint Akademik tersedia
 * 
 * Rujukan:
 * - rancangan-website-utama.md Bagian 7.1
 * - api-contract-website-utama.md Bagian 7
 * 
 * @param {Object} registrantData - Data calon siswa yang mendaftar PPDB
 * @returns {Promise<{ academic_ref_id: null, status: "verifying" }>}
 */
async function sendToAkademikForVerification(registrantData) {
  // MOCK SEMENTARA — ganti ke HTTP call api.aldeposibs.com/api/v1/akademik/ppdb/intake begitu endpoint Akademik tersedia
  return Promise.resolve({
    academic_ref_id: null,
    status: 'verifying'
  });
}

module.exports = {
  sendToAkademikForVerification
};
