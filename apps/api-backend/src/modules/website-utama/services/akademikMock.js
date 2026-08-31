/**
 * Service Integrasi Website Utama PPDB -> Akademik PSB
 * Mengirim data pendaftaran calon siswa ke modul Akademik via endpoint internal intake
 */

const API_BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'aldepos_internal_secret_service_key';

/**
 * Mengirim data pendaftar calon siswa ke modul Akademik
 * @param {Object} registrantData - Data calon siswa yang mendaftar PPDB
 * @returns {Promise<{ academic_ref_id: number, psb_registrant_id: number, username: string, password: string, status: string }>}
 */
async function sendToAkademikForVerification(registrantData) {
  const payload = {
    school_unit_id: registrantData.school_unit_id,
    school_year: registrantData.school_year,
    registration_path: registrantData.registration_path,
    candidate_full_name: registrantData.candidate_full_name,
    candidate_birth_place: registrantData.candidate_birth_place,
    candidate_birth_date: registrantData.candidate_birth_date,
    candidate_gender: registrantData.candidate_gender,
    candidate_address: registrantData.candidate_address,
    previous_school_name: registrantData.previous_school_name,
    father_name: registrantData.father_name,
    mother_name: registrantData.mother_name,
    parent_contact: registrantData.parent_contact,
    nisn: registrantData.nisn,
    website_registrant_id: registrantData.id
  };

  try {
    const url = `${API_BASE_URL}/api/v1/akademik/internal/psb/intake`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': INTERNAL_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const resJson = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = resJson.message || `Gagal integrasi ke sistem Akademik (HTTP ${response.status})`;
      const error = new Error(errMsg);
      error.statusCode = response.status || 400;
      throw error;
    }

    const data = resJson.data || {};
    return {
      academic_ref_id: data.academic_ref_id || data.psb_registrant_id,
      psb_registrant_id: data.psb_registrant_id,
      registration_number: data.registration_number,
      username: data.username,
      password: data.password,
      status: 'verifying'
    };
  } catch (err) {
    console.error('[Akademik Integration Error]:', err.message);
    if (err.statusCode) {
      throw err;
    }
    const networkError = new Error('Pendaftaran belum dapat diproses oleh sistem Akademik. Pastikan periode PSB telah dibuka untuk satuan ini.');
    networkError.statusCode = 503;
    throw networkError;
  }
}

module.exports = {
  sendToAkademikForVerification
};
