/**
 * PPDB Stage Helper
 * apps/api-backend/src/modules/psb/common/ppdbStageHelper.js
 *
 * Mengakomodasi 7 Tahapan PPDB:
 * 1. Registrasi (Pendaftaran awal santri)
 * 2. Bayar Biaya Pendaftaran (Gratis / Lunas / Menunggu)
 * 3. Testing (Penjadwalan ujian / Nilai seleksi)
 * 4. Dinyatakan Lulus / Tidak (Pengumuman hasil seleksi panitia)
 * 5. Membayar Uang Pangkal (Sesuai skema biaya, minimal komponen biaya tertentu)
 * 6. Dinyatakan Sebagai Calon Siswa (Siap dimasukkan ke dalam rombel)
 * 7. Siswa Aktif / Pindah / Lulus (Dalam PPDB sampai calon siswa atau mengundurkan diri)
 */

function calculatePpdbStage(registrant, regBill = null, enrollmentBill = null, testSessions = []) {
  if (!registrant) return null;

  // 1. Data Flags
  const isWithdrawn = registrant.status === 'withdrawn';
  const isPlaced = registrant.status === 'placed' || Boolean(registrant.placed_class_group_id || registrant.placed_student_id);

  // Tahap 2: Biaya Formulir / Pendaftaran
  // ATURAN: Hanya tergantung kepada proses pembayaran yang dicatat oleh bendahara pada Keuangan PPDB Billing!
  let regFeeAmount = 0;
  if (regBill && Number(regBill.amount) > 0) {
    regFeeAmount = Number(regBill.amount);
  } else if (registrant.registration_fee_amount && Number(registrant.registration_fee_amount) > 0) {
    regFeeAmount = Number(registrant.registration_fee_amount);
  }

  const isRegFeeFree = regFeeAmount === 0 && (!regBill || Number(regBill.amount) === 0);
  const hasRegPayments = Boolean(regBill && Array.isArray(regBill.payments) && regBill.payments.length > 0);
  const isRegFeePaid = !isRegFeeFree && (
    (Boolean(regBill?.is_paid) && (hasRegPayments || regBill.status === 'paid')) ||
    (hasRegPayments && Number(regBill?.paid_amount || 0) >= regFeeAmount && regFeeAmount > 0) ||
    (regBill && regBill.status === 'paid')
  );

  // Tahap 3: Testing
  const hasCompositeScore = registrant.final_selection_score !== null && registrant.final_selection_score !== undefined;
  const hasSessions = Array.isArray(testSessions) && testSessions.length > 0;
  const sessionsGraded = hasSessions && testSessions.some(s => s.status === 'graded' || s.total_score !== null);
  const isTested = hasCompositeScore || sessionsGraded || registrant.status === 'tested';

  // Tahap 4: Hasil Seleksi (Lulus / Tidak / Cadangan)
  let decision = registrant.selection_decision || null;
  if (!decision) {
    if (['accepted', 'enrolled', 'prospective_student', 'placed'].includes(registrant.status)) decision = 'accepted';
    else if (registrant.status === 'rejected') decision = 'rejected';
    else if (registrant.status === 'waitlisted') decision = 'waitlisted';
  }

  // Tahap 5: Uang Pangkal
  // ATURAN: Hanya tergantung kepada proses pembayaran yang dicatat oleh bendahara pada Keuangan PPDB Billing!
  const enrAmount = Number(enrollmentBill?.amount || 0);
  const enrPaid = Number(enrollmentBill?.paid_amount || 0);
  const enrRemaining = Number(enrollmentBill?.remaining_balance || Math.max(0, enrAmount - enrPaid));
  const hasEnrPayments = Boolean(enrollmentBill && Array.isArray(enrollmentBill.payments) && enrollmentBill.payments.length > 0);
  const isEnrFullPaid = Boolean(enrollmentBill && hasEnrPayments && (enrollmentBill.is_paid || (enrAmount > 0 && enrRemaining <= 0)));
  const isEnrMinPaid = Boolean(enrollmentBill && hasEnrPayments && enrPaid > 0);

  // Tahap 6: Dinyatakan Calon Siswa (Siap Rombel)
  // Menjadi calon siswa jika telah lulus seleksi DAN uang pangkal telah tercatat dibayar di Keuangan (atau sudah ditempatkan di rombel)
  const isProspectiveStudent = isPlaced || (decision === 'accepted' && (isEnrFullPaid || isEnrMinPaid));

  // ==========================================
  // Rincian 7 Tahap (Stages)
  // ==========================================
  const stages = [
    {
      step: 1,
      id: 'registration',
      name: 'Registrasi',
      status: 'completed',
      detail: `No. Reg: ${registrant.registration_number || '-'}`
    },
    {
      step: 2,
      id: 'registration_fee',
      name: 'Bayar Biaya Pendaftaran',
      status: (isRegFeeFree || isRegFeePaid) ? 'completed' : 'in_progress',
      is_free: isRegFeeFree,
      is_paid: isRegFeePaid,
      amount: regFeeAmount,
      paid_amount: Number(regBill?.paid_amount || (isRegFeePaid && !isRegFeeFree ? regFeeAmount : 0)),
      receipt_number: regBill?.receipt_number || null,
      detail: isRegFeeFree
        ? 'Bebas Biaya Formulir (Rp 0)'
        : (isRegFeePaid
          ? `Lunas Terbayar di Keuangan (Rp ${Number(regBill?.paid_amount || regFeeAmount).toLocaleString('id-ID')}) - Kwt: ${regBill?.receipt_number || '-'}`
          : `Menunggu Pembayaran dicatat Bendahara di Keuangan PPDB (Rp ${regFeeAmount.toLocaleString('id-ID')})`)
    },
    {
      step: 3,
      id: 'testing',
      name: 'Testing Seleksi',
      status: isTested ? 'completed' : (hasSessions ? 'in_progress' : (isRegFeePaid ? 'in_progress' : 'pending')),
      score: hasCompositeScore ? Number(registrant.final_selection_score) : null,
      sessions_count: hasSessions ? testSessions.length : 0,
      detail: hasCompositeScore
        ? `Nilai Komposit: ${Number(registrant.final_selection_score).toFixed(1)}`
        : (isTested ? 'Selesai Mengikuti Ujian' : (hasSessions ? 'Jadwal Ujian Telah Ditetapkan' : 'Belum Dijadwalkan Ujian'))
    },
    {
      step: 4,
      id: 'announcement',
      name: 'Dinyatakan Lulus / Tidak',
      status: decision === 'accepted' ? 'completed' : (decision === 'rejected' ? 'failed' : (decision === 'waitlisted' ? 'in_progress' : 'pending')),
      decision: decision || 'pending',
      decision_label: decision === 'accepted'
        ? 'Dinyatakan Lulus'
        : (decision === 'rejected' ? 'Tidak Lulus' : (decision === 'waitlisted' ? 'Cadangan' : 'Menunggu Pengumuman')),
      letter_number: registrant.decision_letter_number || null,
      detail: decision === 'accepted'
        ? `Selamat, Dinyatakan Lulus (SK: ${registrant.decision_letter_number || '-'})`
        : (decision === 'rejected' ? 'Belum memenuhi kriteria kelulusan' : (decision === 'waitlisted' ? 'Masuk daftar cadangan' : 'Menunggu Rilis Hasil Seleksi'))
    },
    {
      step: 5,
      id: 'enrollment_fee',
      name: 'Membayar Uang Pangkal',
      status: isEnrFullPaid ? 'completed' : (isEnrMinPaid ? 'completed' : (decision === 'accepted' ? 'in_progress' : 'pending')),
      is_full_paid: isEnrFullPaid,
      is_min_paid: isEnrMinPaid,
      amount: enrAmount,
      paid_amount: enrPaid,
      remaining: enrRemaining,
      detail: isEnrFullPaid
        ? `Lunas Terbayar di Keuangan: Rp ${enrAmount.toLocaleString('id-ID')} (Kwt: ${enrollmentBill?.receipt_number || '-'})`
        : (isEnrMinPaid
          ? `Cicilan Dicatat Bendahara: Rp ${enrPaid.toLocaleString('id-ID')} (Sisa Rp ${enrRemaining.toLocaleString('id-ID')})`
          : (decision === 'accepted' ? `Menunggu Pembayaran dicatat Bendahara di Keuangan PPDB (Tagihan: Rp ${enrAmount.toLocaleString('id-ID')})` : 'Menunggu Kelulusan Seleksi'))
    },
    {
      step: 6,
      id: 'prospective_student',
      name: 'Calon Siswa Definitif',
      status: isProspectiveStudent ? 'completed' : (isEnrMinPaid || isEnrFullPaid ? 'in_progress' : 'pending'),
      is_declared: isProspectiveStudent,
      detail: isProspectiveStudent
        ? 'Resmi Calon Siswa (Siap Dimasukkan ke Rombel)'
        : (decision === 'accepted' ? 'Menunggu Pembayaran Uang Pangkal di Keuangan PPDB' : 'Belum Memenuhi Syarat Calon Siswa')
    },
    {
      step: 7,
      id: 'student_status',
      name: 'Status Siswa (Rombel / Aktif)',
      status: isWithdrawn ? 'withdrawn' : (isPlaced ? 'completed' : 'pending'),
      student_status: isWithdrawn ? 'withdrawn' : (isPlaced ? 'active' : 'prospective'),
      placed_class_name: registrant.placed_class_name || null,
      placed_nipd: registrant.placed_nipd || null,
      detail: isWithdrawn
        ? 'Mengundurkan Diri dari PPDB'
        : (isPlaced ? `Siswa Aktif di Rombel ${registrant.placed_class_name || '-'} (NIPD: ${registrant.placed_nipd || '-'})` : 'Menunggu Penempatan Rombel Kelas')
    }
  ];

  // ==========================================
  // Current Stage Indicator
  // ==========================================
  let currentStageNumber = 1;
  let currentStageCode = 'registered';
  let currentStageLabel = 'Registrasi Baru';
  let badgeClass = 'bg-slate-100 text-slate-800 border-slate-200';

  if (isWithdrawn) {
    currentStageNumber = 0;
    currentStageCode = 'withdrawn';
    currentStageLabel = 'Mengundurkan Diri';
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
  } else if (isPlaced) {
    currentStageNumber = 7;
    currentStageCode = 'placed';
    currentStageLabel = `Siswa Aktif (${registrant.placed_class_name || 'Rombel'})`;
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  } else if (isProspectiveStudent) {
    currentStageNumber = 6;
    currentStageCode = 'prospective_student';
    currentStageLabel = 'Calon Siswa (Siap Rombel)';
    badgeClass = 'bg-teal-100 text-teal-800 border-teal-200';
  } else if (decision === 'accepted') {
    if (isEnrMinPaid) {
      currentStageNumber = 6;
      currentStageCode = 'prospective_student';
      currentStageLabel = 'Calon Siswa (Siap Rombel)';
      badgeClass = 'bg-teal-100 text-teal-800 border-teal-200';
    } else {
      currentStageNumber = 5;
      currentStageCode = 'accepted_unpaid';
      currentStageLabel = 'Lulus (Uang Pangkal)';
      badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  } else if (decision === 'waitlisted') {
    currentStageNumber = 4;
    currentStageCode = 'waitlisted';
    currentStageLabel = 'Cadangan';
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
  } else if (decision === 'rejected') {
    currentStageNumber = 4;
    currentStageCode = 'rejected';
    currentStageLabel = 'Tidak Lulus';
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
  } else if (isTested) {
    currentStageNumber = 4;
    currentStageCode = 'tested';
    currentStageLabel = 'Menunggu Pengumuman';
    badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (hasSessions) {
    currentStageNumber = 3;
    currentStageCode = 'testing';
    currentStageLabel = 'Ujian Terjadwal';
    badgeClass = 'bg-cyan-100 text-cyan-800 border-cyan-200';
  } else if (isRegFeePaid) {
    currentStageNumber = 3;
    currentStageCode = 'fee_paid';
    currentStageLabel = 'Biaya Formulir Lunas';
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  } else {
    currentStageNumber = 2;
    currentStageCode = 'registered';
    currentStageLabel = 'Registrasi (Menunggu Biaya)';
    badgeClass = 'bg-slate-100 text-slate-800 border-slate-200';
  }

  return {
    current_stage_number: currentStageNumber,
    current_stage_code: currentStageCode,
    current_stage_label: currentStageLabel,
    badge_class: badgeClass,
    is_withdrawn: isWithdrawn,
    is_placed: isPlaced,
    is_prospective_student: isProspectiveStudent,
    is_accepted: decision === 'accepted',
    is_reg_fee_paid: isRegFeePaid,
    is_enrollment_fee_paid: isEnrFullPaid,
    is_enrollment_fee_min_paid: isEnrMinPaid,
    stages
  };
}

module.exports = {
  calculatePpdbStage
};
