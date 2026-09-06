/**
 * Global Error Handler Middleware
 * Menyesuaikan format error response { success, data, message, errors }
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Terjadi kesalahan pada server internal';
  const errors = err.errors || null;

  // Handle MariaDB / MySQL Duplicate Entry gracefully (409 Conflict)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    statusCode = 409;
    if (message.includes('students_nisn_unique') || message.includes('key \'students_nisn_unique\'')) {
      const match = message.match(/Duplicate entry '(.*?)'/);
      message = `NISN ${match ? match[1] : ''} sudah terdaftar di sistem. Harap periksa kembali atau gunakan NISN yang valid.`;
    } else if (message.includes('students_nis_unique') || message.includes('key \'students_nis_unique\'') || message.includes('students_satuan_pendidikan_id_nis_unique')) {
      const match = message.match(/Duplicate entry '(.*?)'/);
      message = `NIS ${match ? match[1] : ''} sudah terdaftar pada Satuan Pendidikan ini.`;
    } else if (message.includes('students_nik_unique')) {
      const match = message.match(/Duplicate entry '(.*?)'/);
      message = `NIK ${match ? match[1] : ''} sudah terdaftar di sistem.`;
    } else {
      message = 'Data duplikat: Nilai unik yang Anda masukkan sudah terdaftar di sistem.';
    }
  }

  // Log error di console jika server error (500)
  if (statusCode >= 500) {
    console.error(`[ERROR 500] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    data: null,
    message,
    errors
  });
}

/**
 * 404 Not Found Middleware
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    data: null,
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
    errors: null
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
