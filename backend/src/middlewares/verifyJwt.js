/**
 * JWT Verification Middleware (Local verification without database call)
 * Standar verifikasi token JWT untuk Core Service dan 13 aplikasi satelit.
 */
const jwt = require('jsonwebtoken');

function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Token otentikasi tidak ditemukan. Harap sertakan Bearer Token di header Authorization.',
      errors: null
    });
  }

  const token = authHeader.substring(7).trim();
  const secret = process.env.CORE_JWT_SECRET || 'default_core_jwt_secret_key';

  try {
    const decoded = jwt.verify(token, secret);
    // Format standar payload: { id, sub, username, full_name, account_type, ref_type, ref_id, school_units }
    req.user = {
      id: decoded.id || decoded.sub,
      username: decoded.username,
      full_name: decoded.full_name,
      account_type: decoded.account_type,
      ref_type: decoded.ref_type,
      ref_id: decoded.ref_id,
      school_units: decoded.school_units || [],
      ...decoded
    };
    next();
  } catch (err) {
    let message = 'Token otentikasi tidak valid atau rusak';
    if (err.name === 'TokenExpiredError') {
      message = 'Token otentikasi sudah kedaluwarsa. Silakan perbarui dengan refresh token.';
    }

    return res.status(401).json({
      success: false,
      data: null,
      message,
      errors: null
    });
  }
}

module.exports = verifyJwt;
