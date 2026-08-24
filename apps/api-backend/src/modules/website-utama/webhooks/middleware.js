/**
 * Webhook HMAC Signature Verification Middleware
 * Sesuai api-contract-website-utama.md Bagian 6
 */
const crypto = require('crypto');

function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-webhook-signature'];

  if (!signature) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Header X-Webhook-Signature wajib disertakan untuk endpoint webhook',
      errors: null
    });
  }

  const secret = process.env.WEBHOOK_SECRET || process.env.CORE_JWT_SECRET || 'aldepos_webhook_secret_key';
  
  // Format body untuk kalkulasi HMAC
  const payloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  // Bersihkan prefix jika dikirim dalam format sha256=<hash>
  const cleanSignature = signature.startsWith('sha256=') ? signature.slice(7) : signature;

  try {
    const isMatched = crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );

    if (!isMatched) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Signature webhook tidak valid (HMAC verification failed)',
        errors: null
      });
    }
  } catch (err) {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Signature webhook tidak valid',
      errors: null
    });
  }

  next();
}

module.exports = { verifyWebhookSignature };
