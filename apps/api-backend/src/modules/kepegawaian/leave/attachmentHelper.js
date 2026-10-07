/**
 * Attachment Storage & Streaming Helper for Leave Module
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §9.3
 * 
 * Rules:
 * - Stored in a NON-STATIC, protected directory outside public/
 * - Random, unguessable filenames using crypto.randomUUID()
 * - Strict magic-bytes inspection for MIME type validation
 * - Authorized streaming download only
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Protected storage directory outside public/
const PROTECTED_STORAGE_DIR = path.resolve(__dirname, '../../../../storage/leave-attachments');
const LEGACY_PUBLIC_DIR = path.resolve(__dirname, '../../../../public/uploads/leave-attachments');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Detect MIME type and extension from buffer magic bytes
 * @param {Buffer} buffer
 * @returns {{ mimeType: string, ext: string } | null}
 */
function detectMimeFromBuffer(buffer) {
  if (!buffer || buffer.length < 4) return null;

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { mimeType: 'application/pdf', ext: 'pdf' };
  }

  // 2. JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { mimeType: 'image/jpeg', ext: 'jpg' };
  }

  // 3. PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return { mimeType: 'image/png', ext: 'png' };
  }

  // 4. WEBP: 'RIFF' at 0..3 and 'WEBP' at 8..11
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { mimeType: 'image/webp', ext: 'webp' };
  }

  return null;
}

/**
 * Ensures the protected storage directory exists
 */
function ensureStorageDirectory() {
  if (!fs.existsSync(PROTECTED_STORAGE_DIR)) {
    fs.mkdirSync(PROTECTED_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Saves an uploaded attachment to protected storage with randomized name
 * @param {object|string} payload - Base64 string or { data, name, mimeType }
 * @param {number|string} employeeId - Owner employee ID
 * @returns {{
 *   attachment_url: string,
 *   attachment_name: string,
 *   attachment_mime_type: string,
 *   attachment_size_bytes: number
 * }}
 */
function saveLeaveAttachment(payload, employeeId = 'emp') {
  if (!payload) return null;

  let rawBase64 = '';
  let originalName = 'lampiran.pdf';

  if (typeof payload === 'string') {
    if (payload.startsWith('data:')) {
      const commaIndex = payload.indexOf(',');
      rawBase64 = commaIndex !== -1 ? payload.slice(commaIndex + 1) : payload;
    } else {
      rawBase64 = payload;
    }
  } else if (typeof payload === 'object') {
    originalName = payload.name || payload.filename || originalName;
    const data = payload.data || payload.base64 || payload.content || '';
    if (typeof data === 'string' && data.startsWith('data:')) {
      const commaIndex = data.indexOf(',');
      rawBase64 = commaIndex !== -1 ? data.slice(commaIndex + 1) : data;
    } else {
      rawBase64 = String(data);
    }
  }

  if (!rawBase64 || !rawBase64.trim()) {
    return null;
  }

  const buffer = Buffer.from(rawBase64.trim(), 'base64');
  if (buffer.length === 0) {
    const error = new Error('Konten file lampiran tidak valid');
    error.statusCode = 422;
    error.code = 'INVALID_ATTACHMENT';
    throw error;
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const error = new Error(`Ukuran file lampiran (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 5 MB`);
    error.statusCode = 422;
    error.code = 'ATTACHMENT_TOO_LARGE';
    throw error;
  }

  // Validate MIME from magic bytes
  const detected = detectMimeFromBuffer(buffer);
  if (!detected) {
    const error = new Error('Format konten file tidak valid atau berbahaya. Hanya format PDF, JPG, PNG, dan WEBP yang diizinkan');
    error.statusCode = 422;
    error.code = 'INVALID_MIME_TYPE';
    throw error;
  }

  ensureStorageDirectory();

  // Random UUID filename to prevent guessing/enumeration
  const randomId = crypto.randomUUID();
  const safeFilename = `leave_${employeeId}_${randomId}.${detected.ext}`;
  const absoluteFilePath = path.join(PROTECTED_STORAGE_DIR, safeFilename);

  fs.writeFileSync(absoluteFilePath, buffer);

  // Sanitize original display filename
  const cleanOriginalName = path.basename(originalName).replace(/[^\w\s.-]/gi, '_');

  return {
    attachment_url: `/storage/leave-attachments/${safeFilename}`,
    attachment_name: cleanOriginalName || safeFilename,
    attachment_mime_type: detected.mimeType,
    attachment_size_bytes: buffer.length
  };
}

/**
 * Resolves absolute file path for an attachment and checks existence
 * @param {string} attachmentUrl
 * @returns {{ absolutePath: string, exists: boolean, isProtected: boolean }}
 */
function resolveAttachmentPath(attachmentUrl) {
  if (!attachmentUrl) return { absolutePath: '', exists: false, isProtected: false };

  const basename = path.basename(attachmentUrl);

  // Check in protected storage first
  const protectedPath = path.join(PROTECTED_STORAGE_DIR, basename);
  if (fs.existsSync(protectedPath)) {
    return { absolutePath: protectedPath, exists: true, isProtected: true };
  }

  // Fallback to legacy uploads dir if exists
  const legacyPath = path.join(LEGACY_PUBLIC_DIR, basename);
  if (fs.existsSync(legacyPath)) {
    return { absolutePath: legacyPath, exists: true, isProtected: false };
  }

  return { absolutePath: protectedPath, exists: false, isProtected: true };
}

module.exports = {
  detectMimeFromBuffer,
  saveLeaveAttachment,
  resolveAttachmentPath,
  PROTECTED_STORAGE_DIR,
  LEGACY_PUBLIC_DIR
};
