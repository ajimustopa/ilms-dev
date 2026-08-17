/**
 * Central Authentication & Authorization Middlewares
 */
const verifyJwt = require('./verifyJwt');
const requirePermission = require('./requirePermission');

function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'X-API-Key header wajib disertakan untuk akses internal service',
      errors: null
    });
  }
  // TODO: Validasi hash API key di tabel api_clients
  next();
}

module.exports = {
  authenticate: verifyJwt,
  verifyJwt,
  requirePermission,
  requireApiKey
};
