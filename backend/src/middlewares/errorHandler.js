/**
 * Global Error Handler Middleware
 * Menyesuaikan format error response { success, data, message, errors }
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Terjadi kesalahan pada server internal';
  const errors = err.errors || null;

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
