/**
 * Public Token Validation Middleware for Psychotest
 * Validates session_code/token existence, completion status, and expiration.
 */
const db = require('../../../config/db/kepegawaian');

async function validatePublicToken(req, res, next) {
  try {
    const token = req.params.token || req.headers['x-psychotest-token'] || req.query.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Token akses sesi psikotes tidak ditemukan',
        errors: { token: 'Token wajib disertakan' }
      });
    }

    const session = await db('psychotest_sessions as ps')
      .leftJoin('psychotest_types as pt', 'ps.test_type_id', 'pt.id')
      .where('ps.session_code', token)
      .select(
        'ps.*',
        'pt.code as test_type_code',
        'pt.name as test_type_name',
        'pt.scoring_method',
        'pt.instructions as test_instructions'
      )
      .first();

    if (!session) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Sesi psikotes dengan token tersebut tidak valid atau tidak ditemukan',
        errors: null
      });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        data: {
          session_code: session.session_code,
          status: session.status,
          completed_at: session.completed_at
        },
        message: 'Sesi psikotes ini sudah selesai dikerjakan dan telah ditutup',
        errors: null
      });
    }

    if (session.status === 'expired') {
      return res.status(400).json({
        success: false,
        data: {
          session_code: session.session_code,
          status: session.status
        },
        message: 'Sesi psikotes ini telah kedaluwarsa',
        errors: null
      });
    }

    // Attach verified session to req object
    req.psychotestSession = session;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Gagal memvalidasi token sesi psikotes',
      errors: error.message
    });
  }
}

module.exports = { validatePublicToken };
