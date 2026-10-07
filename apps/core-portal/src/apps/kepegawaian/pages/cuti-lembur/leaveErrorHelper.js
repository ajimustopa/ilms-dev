/**
 * Leave Error & Message Mapper for Core Aldepos HRIS
 * Maps backend error codes (SPEC §4.4, §12) to clear Indonesian messages.
 */

export const LEAVE_ERROR_MESSAGES = {
  // Order 1: Range & Portions
  INVALID_RANGE: 'Rentang tanggal tidak valid: Tanggal mulai harus lebih awal atau sama dengan tanggal akhir',
  INVALID_PORTION: 'Kombinasi setengah hari (porsi) tidak valid untuk rentang tanggal yang diajukan',
  EMPLOYEE_INACTIVE: 'Pegawai tidak dalam status aktif atau akun telah dinonaktifkan',
  ACTOR_NOT_EMPLOYEE: 'Akun Anda tidak terikat dengan profil pegawai yang sah',
  FORBIDDEN_SCOPE: 'Pegawai berada di luar cakupan unit sekolah yang dapat Anda akses',
  EMPLOYEE_NOT_FOUND: 'Data pegawai tidak ditemukan dalam sistem',

  // Order 2: Type Eligibility
  TYPE_NOT_FOUND: 'Jenis cuti tidak ditemukan atau belum terdaftar dalam sistem',
  TYPE_INACTIVE: 'Jenis cuti ini sedang dinonaktifkan oleh bagian HRD',
  TYPE_NOT_ALLOWED_FOR_EMPLOYEE: 'Pegawai tidak memenuhi kriteria jenis cuti ini (jenis kelamin, status kepegawaian, status nikah, atau masa kerja)',
  UNKNOWN_JOIN_DATE: 'Tanggal bergabung pegawai belum terisi untuk verifikasi masa kerja / hak cuti',

  // Order 3: Schedule & Days
  NO_SCHEDULE_ASSIGNMENT: 'Tidak ada penetapan jadwal kerja aktif pada rentang tanggal pengajuan',
  NO_WORKING_DAYS: 'Tidak ada hari kerja efektif dalam rentang pengajuan (seluruhnya hari libur/non-kerja)',
  INVALID_DURATION: 'Durasi hari kerja tidak valid',

  // Order 4: Lead Time & Locks
  BACKDATE_EXCEEDED: 'Pengajuan tanggal mundur melampaui batas toleransi yang diizinkan untuk jenis cuti ini',
  NOTICE_TOO_SHORT: 'Pengajuan cuti terlalu mendadak (kurang dari batas minimum hari pemberitahuan)',
  PERIOD_LOCKED: 'Periode presensi untuk tanggal cuti ini telah dikunci / diserahkan ke payroll',

  // Order 5: Limits
  MAX_DAYS_PER_REQUEST: 'Durasi pengajuan (atau akumulasi cuti berdempetan) melampaui batas maksimal per pengajuan',
  MAX_DAYS_PER_YEAR: 'Penggunaan jenis cuti ini telah melampaui batas kuota maksimal dalam setahun',
  MAX_OCCURRENCES: 'Frekuensi pengambilan jenis cuti ini telah mencapai batas maksimal seumur kerja',

  // Order 6: Attachment & Reason
  ATTACHMENT_REQUIRED: 'Lampiran dokumen/surat bukti wajib diunggah untuk pengajuan jenis cuti ini',
  REASON_REQUIRED: 'Alasan / keterangan permohonan wajib diisi',

  // Order 7: Overlaps & Conflicts
  OVERLAP_APPROVED: 'Rentang tanggal bertabrakan dengan permohonan cuti yang telah disetujui sebelumnya',
  OVERLAP_PENDING: 'Rentang tanggal bertabrakan dengan permohonan cuti lain yang sedang dalam proses persetujuan',
  ATTENDANCE_PRESENT_CONFLICT: 'Terdapat catatan presensi hadir (present) pada tanggal yang diajukan cuti',
  OVERTIME_CONFLICT: 'Terdapat penugasan lembur pada hari yang diajukan cuti penuh',

  // Order 8: Balances
  ENTITLEMENT_NOT_ELIGIBLE: 'Pegawai belum memiliki hak kuota jatah cuti tahunan aktif untuk periode ini',
  BALANCE_INSUFFICIENT: 'Sisa saldo jatah cuti tahunan tidak mencukupi untuk durasi yang diajukan',

  // Approval Engine & Lifecycle Errors
  NOT_AUTHORIZED_APPROVER: 'Anda tidak memiliki wewenang untuk menyetujui langkah pengajuan ini',
  ILLEGAL_TRANSITION: 'Status pengajuan tidak valid untuk tindakan persetujuan ini',
  SELF_CANCEL_DEADLINE_EXCEEDED: 'Batas waktu pembatalan mandiri telah terlewati (hanya HRD yang dapat membatalkan)'
};

export const LEAVE_WARNING_MESSAGES = {
  ABSENCE_THRESHOLD_EXCEEDED: 'Jumlah rekan sejawat yang tidak hadir pada unit ini melebihi ambang batas operasional',
  COLLEAGUE_CONCURRENT_LEAVE: 'Terdapat rekan satu unit kerja yang juga mengajukan cuti pada tanggal yang sama',
  FLEXIBLE_SCHEDULE_RULE_APPLIED: 'Perhitungan durasi menggunakan ketentuan hari kerja fleksibel (Senin-Jumat)'
};

/**
 * Maps error code to Indonesian message
 */
export function getLeaveErrorMessage(err) {
  if (!err) return 'Terjadi kesalahan pada sistem';
  const code = err.code || err.response?.data?.code || err.response?.data?.errors?.[0]?.code;
  if (code && LEAVE_ERROR_MESSAGES[code]) {
    return LEAVE_ERROR_MESSAGES[code];
  }
  return err.response?.data?.message || err.message || 'Terjadi kesalahan pada sistem';
}

/**
 * Generates WhatsApp notification URL (SPEC §2 #25)
 */
export function generateWhatsAppNotificationUrl({
  phone,
  employeeName,
  leaveTypeName,
  startDate,
  endDate,
  status,
  comment
}) {
  if (!phone) return null;
  // Clean phone number (replace leading 0 with 62)
  let cleanPhone = String(phone).replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }

  const statusTextMap = {
    pending: 'menunggu persetujuan',
    approved: 'DISETUJUI',
    rejected: 'DITOLAK',
    revision_requested: 'MEMERLUKAN REVISI',
    cancelled: 'DIBATALKAN'
  };

  const statusLabel = statusTextMap[status] || status;
  let text = `Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu ${employeeName || 'Pegawai'},\n\n`;
  text += `Pemberitahuan mengenai pengajuan *${leaveTypeName || 'Cuti/Izin'}* (${startDate} s.d ${endDate}):\n`;
  text += `Status: *${statusLabel}*\n`;
  if (comment) {
    text += `Catatan: _"${comment}"_\n`;
  }
  text += `\nInformasi lebih lanjut dapat dilihat melalui Portal Pegawai Aldepos.\nTerima kasih.\n\n_Sistem HRIS Core Aldepos_`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
