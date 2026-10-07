/**
 * Script Migrasi Manual Lampiran Cuti (Legacy Public -> Protected Storage)
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §9.3 & Tahap 1
 * 
 * Usage:
 *   node migrate_legacy_attachments.js          # Dry-run mode (default, no files modified)
 *   node migrate_legacy_attachments.js --execute # Actually copies files and updates DB records
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../../../../config/db/kepegawaian');
const { assertDevDatabase } = require('../../../../config/db/dbGuard');
const { PROTECTED_STORAGE_DIR, LEGACY_PUBLIC_DIR, detectMimeFromBuffer } = require('../attachmentHelper');

(async () => {
  const isExecute = process.argv.includes('--execute');

  console.log('=== MIGRASI LAMPIRAN CUTI (LEGACY PUBLIC -> PROTECTED STORAGE) ===');
  console.log(`Mode: ${isExecute ? 'EXECUTE (REAL)' : 'DRY-RUN (Simulasi saja)'}`);
  console.log(`Legacy Directory   : ${LEGACY_PUBLIC_DIR}`);
  console.log(`Protected Directory: ${PROTECTED_STORAGE_DIR}`);

  if (isExecute) {
    assertDevDatabase(db.client.connectionSettings, 'MIGRATE_ATTACHMENTS');
  }

  // 1. Check legacy directory existence
  if (!fs.existsSync(LEGACY_PUBLIC_DIR)) {
    console.log('[INFO] Folder legacy public/uploads/leave-attachments tidak ditemukan. Tidak ada berkas yang perlu dimigrasi.');
    process.exit(0);
  }

  // 2. Scan DB records pointing to legacy upload path
  const records = await db('employee_leave_requests')
    .where('attachment_url', 'like', '/uploads/leave-attachments/%')
    .orWhere('attachment_url', 'like', 'uploads/leave-attachments/%')
    .select('id', 'employee_id', 'attachment_url', 'attachment_name', 'attachment_mime_type');

  console.log(`[INFO] Ditemukan ${records.length} baris di employee_leave_requests dengan lampiran legacy.`);

  // 3. Scan disk files
  const legacyFiles = fs.readdirSync(LEGACY_PUBLIC_DIR);
  console.log(`[INFO] Ditemukan ${legacyFiles.length} file di folder legacy disk.`);

  let migratedCount = 0;

  for (const rec of records) {
    const filename = path.basename(rec.attachment_url);
    const sourcePath = path.join(LEGACY_PUBLIC_DIR, filename);

    if (fs.existsSync(sourcePath)) {
      const buffer = fs.readFileSync(sourcePath);
      const detected = detectMimeFromBuffer(buffer) || { ext: 'bin', mimeType: rec.attachment_mime_type || 'application/octet-stream' };
      const newFilename = `leave_${rec.employee_id}_migrated_${crypto.randomUUID()}.${detected.ext}`;
      const destPath = path.join(PROTECTED_STORAGE_DIR, newFilename);
      const newUrl = `/storage/leave-attachments/${newFilename}`;

      console.log(`  - [Leave ID ${rec.id}] ${filename} -> ${newFilename} (${buffer.length} bytes)`);

      if (isExecute) {
        if (!fs.existsSync(PROTECTED_STORAGE_DIR)) {
          fs.mkdirSync(PROTECTED_STORAGE_DIR, { recursive: true });
        }
        fs.copyFileSync(sourcePath, destPath);
        await db('employee_leave_requests').where({ id: rec.id }).update({
          attachment_url: newUrl,
          attachment_mime_type: detected.mimeType,
          attachment_size_bytes: buffer.length
        });
      }
      migratedCount++;
    } else {
      console.warn(`  - [Leave ID ${rec.id}] Berkas ${filename} terdaftar di DB tetapi TIDAK ADA di disk.`);
    }
  }

  console.log(`\n[SELESAI] Total berkas yang ${isExecute ? 'dimigrasi' : 'akan dimigrasi'}: ${migratedCount}`);
  if (!isExecute) {
    console.log('[CATATAN] Jalankan dengan parameter --execute untuk melakukan migrasi nyata di database dev.');
  }

  process.exit(0);
})().catch(err => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
