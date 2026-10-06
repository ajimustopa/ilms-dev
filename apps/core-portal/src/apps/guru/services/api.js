import api from '../../../shared/services/api';

/**
 * Helper extractor response seragam untuk API Core Aldepos
 * Menjamin pengembalian { data, message } atau melempar Error dengan pesan ramah pengguna.
 */
export async function handleApiResponse(promise) {
  try {
    const response = await promise;
    // Format standar monorepo: { success: true, data, message, errors: null }
    if (response.data && response.data.success !== undefined) {
      if (response.data.success) {
        return response.data.data;
      }
      const errorMsg = response.data.message || 'Permintaan gagal diproses';
      throw new Error(errorMsg);
    }
    // Jika response data langsung berupa objek/array
    return response.data;
  } catch (error) {
    const serverMessage = error.response?.data?.message;
    const errorsList = error.response?.data?.errors;
    let detailedMessage = serverMessage || error.message || 'Terjadi kesalahan pada server';

    if (Array.isArray(errorsList) && errorsList.length > 0) {
      detailedMessage += `: ${errorsList.map((e) => (typeof e === 'string' ? e : e.message || JSON.stringify(e))).join(', ')}`;
    }

    const customError = new Error(detailedMessage);
    customError.status = error.response?.status;
    customError.raw = error;
    customError.errors = errorsList;
    throw customError;
  }
}

export default api;
