/**
 * Export Utility for Class Student Ledger & Monthly Collection Performance
 * Supports:
 * 1. Multi-Sheet Excel (.xlsx) with Native Formula SUM
 * 2. Landscape PDF with Kop, Monthly Performance Matrix, and Signatures
 */
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

function formatCurrency(val) {
  const num = parseFloat(val || 0);
  return 'Rp ' + num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatRawNumber(val) {
  const num = parseFloat(val || 0);
  return num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * 1. Generate Excel (.xlsx) 2 Sheets
 */
function generateExcel(recapData, schoolUnit) {
  const wb = XLSX.utils.book_new();

  const students = recapData.students || [];
  const ayName = recapData.academic_year?.name || 'Semua Tahun Ajaran';
  const unitName = schoolUnit?.name || 'Satuan Pendidikan Aldepos';

  // --- SHEET 1: Matriks Kinerja Penagihan Bulanan (Juli - Juni) ---
  const ws1Data = [
    [unitName.toUpperCase()],
    [`REKAPITULASI PENAGIHAN BULANAN SISWA (COLLECTION PERFORMANCE)`],
    [`Tahun Ajaran: ${ayName}`],
    [], // Blank line
    [
      'No',
      'NIS',
      'Nama Santri',
      'Kelas',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Kewajiban TP Ini',
      'Sudah Dibayar',
      'Sisa TP Ini',
      'Sisa TP Lalu',
      'Total Piutang',
      'Status Pelunasan'
    ]
  ];

  const monthKeys = ['jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun'];
  const startRow = 6; // 1-indexed row in Excel where student data begins

  students.forEach((s, idx) => {
    const rNum = startRow + idx;
    const row = [
      idx + 1,
      s.nis || '-',
      s.name,
      s.class_name || '-',
      s.months?.jul?.billed || 0,
      s.months?.aug?.billed || 0,
      s.months?.sep?.billed || 0,
      s.months?.oct?.billed || 0,
      s.months?.nov?.billed || 0,
      s.months?.dec?.billed || 0,
      s.months?.jan?.billed || 0,
      s.months?.feb?.billed || 0,
      s.months?.mar?.billed || 0,
      s.months?.apr?.billed || 0,
      s.months?.may?.billed || 0,
      s.months?.jun?.billed || 0,
      { f: `SUM(E${rNum}:P${rNum})` }, // Formula SUM 12 bulan (Kewajiban TP Ini)
      s.total_paid || 0,
      { f: `Q${rNum}-R${rNum}` }, // Formula Sisa TP Ini = Kewajiban TP Ini - Terbayar
      s.arrears_previous_year || 0, // Sisa TP Lalu
      { f: `S${rNum}+T${rNum}` }, // Total Piutang = Sisa TP Ini + Sisa TP Lalu
      s.settlement_status || '-'
    ];
    ws1Data.push(row);
  });

  // Footer Row Total
  if (students.length > 0) {
    const endRow = startRow + students.length - 1;
    const totalRow = [
      '',
      '',
      'TOTAL KESELURUHAN',
      '',
      { f: `SUM(E${startRow}:E${endRow})` },
      { f: `SUM(F${startRow}:F${endRow})` },
      { f: `SUM(G${startRow}:G${endRow})` },
      { f: `SUM(H${startRow}:H${endRow})` },
      { f: `SUM(I${startRow}:I${endRow})` },
      { f: `SUM(J${startRow}:J${endRow})` },
      { f: `SUM(K${startRow}:K${endRow})` },
      { f: `SUM(L${startRow}:L${endRow})` },
      { f: `SUM(M${startRow}:M${endRow})` },
      { f: `SUM(N${startRow}:N${endRow})` },
      { f: `SUM(O${startRow}:O${endRow})` },
      { f: `SUM(P${startRow}:P${endRow})` },
      { f: `SUM(Q${startRow}:Q${endRow})` },
      { f: `SUM(R${startRow}:R${endRow})` },
      { f: `SUM(S${startRow}:S${endRow})` },
      { f: `SUM(T${startRow}:T${endRow})` },
      { f: `SUM(U${startRow}:U${endRow})` },
      ''
    ];
    ws1Data.push(totalRow);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
  // Set column widths
  ws1['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // NIS
    { wch: 26 }, // Nama
    { wch: 12 }, // Kelas
    ...monthKeys.map(() => ({ wch: 13 })), // 12 bulan
    { wch: 18 }, // Kewajiban TP Ini
    { wch: 16 }, // Sudah Dibayar
    { wch: 16 }, // Sisa TP Ini
    { wch: 16 }, // Sisa TP Lalu
    { wch: 18 }, // Total Piutang
    { wch: 16 }  // Status
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Matriks Penagihan');

  // --- SHEET 2: Daftar Detail Tunggakan (Aging Schedule) ---
  const ws2Data = [
    [unitName.toUpperCase()],
    [`DAFTAR DETAIL TUNGGAKAN SISWA & UMUR PIUTANG (AGING SCHEDULE)`],
    [`Tahun Ajaran: ${ayName}`],
    [],
    [
      'No',
      'NIS',
      'Nama Santri',
      'Kelas',
      'Kewajiban TP Ini',
      'Sudah Dibayar',
      'Sisa TP Ini',
      'Sisa TP Lalu',
      'Total Piutang',
      'Umur Tunggakan (Hari)',
      'Status Risiko',
      'Kolektibilitas'
    ]
  ];

  const overdueStudents = students.filter(s => (s.grand_total_remaining || s.total_remaining || 0) > 0);
  overdueStudents.forEach((s, idx) => {
    ws2Data.push([
      idx + 1,
      s.nis || '-',
      s.name,
      s.class_name || '-',
      s.total_billed,
      s.total_paid,
      s.total_remaining,
      s.arrears_previous_year || 0,
      s.grand_total_remaining || (s.total_remaining + (s.arrears_previous_year || 0)),
      s.aging_days,
      s.aging_status.toUpperCase(),
      s.aging_days > 90 ? 'Macet (>90 hari)' : (s.aging_days > 60 ? 'Diragukan (61-90 hari)' : (s.aging_days > 30 ? 'Kurang Lancar (31-60 hari)' : 'Dalam Perhatian (0-30 hari)'))
    ]);
  });

  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  ws2['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // NIS
    { wch: 28 }, // Nama
    { wch: 12 }, // Kelas
    { wch: 16 }, // Kewajiban TP Ini
    { wch: 16 }, // Sudah Dibayar
    { wch: 16 }, // Sisa TP Ini
    { wch: 16 }, // Sisa TP Lalu
    { wch: 18 }, // Total Piutang
    { wch: 22 }, // Umur Tunggakan
    { wch: 16 }, // Status Risiko
    { wch: 28 }  // Kolektibilitas
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Detail Tunggakan');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * 2. Generate PDF Landscape Document
 */
function generatePdf(recapData, schoolUnit, user) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 35,
    bufferPages: true
  });

  const startX = 35;
  const contentWidth = doc.page.width - 70; // 841.89 - 70 = ~771.89 pt
  const ayName = recapData.academic_year?.name || 'Semua Tahun Ajaran';
  const unitName = schoolUnit?.name || 'PONDOK PESANTREN ALDEPOS';

  function drawHeaderLandscape() {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(unitName.toUpperCase(), startX, 30, { align: 'center' });
    doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('YAYASAN PENDIDIKAN ALDEPOS &bull; SISTEM KEUANGAN TERPADU', { align: 'center' });
    if (schoolUnit?.address) {
      doc.fontSize(7.5).fillColor('#64748b').text(schoolUnit.address, { align: 'center' });
    }
    doc.moveDown(0.3);
    const lineY = doc.y;
    doc.moveTo(startX, lineY).lineTo(startX + contentWidth, lineY).strokeColor('#0284c7').lineWidth(1.5).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a').text('LAPORAN REKAPITULASI PENAGIHAN SISWA & KINERJA BULANAN', { align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(`Tahun Ajaran / Siklus: ${ayName}`, { align: 'center' });
    doc.moveDown(0.6);
  }

  drawHeaderLandscape();

  // Summary Metrics Header Card
  const summary = recapData.performance_summary || {};
  const sumY = doc.y;
  doc.rect(startX, sumY, contentWidth, 34).fill('#f8fafc');
  doc.strokeColor('#e2e8f0').lineWidth(0.8).rect(startX, sumY, contentWidth, 34).stroke();

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#334155');
  doc.text(`Total Santri: ${summary.total_students || 0} orang`, startX + 10, sumY + 8);
  doc.text(`Kewajiban TP Ini: ${formatCurrency(summary.total_billed)}`, startX + 130, sumY + 8);
  doc.text(`Terbayar: ${formatCurrency(summary.total_paid)}`, startX + 290, sumY + 8);
  doc.text(`Sisa TP Ini: ${formatCurrency(summary.total_remaining)}`, startX + 430, sumY + 8);
  doc.text(`Sisa TP Lalu: ${formatCurrency(summary.total_arrears_previous_year)}`, startX + 570, sumY + 8);

  doc.fontSize(7).font('Helvetica').fillColor('#047857');
  doc.text(`Grand Total Piutang: ${formatCurrency(summary.grand_total_remaining || ((summary.total_remaining || 0) + (summary.total_arrears_previous_year || 0)))}`, startX + 10, sumY + 20);
  doc.text(`Tingkat Pelunasan TP: ${summary.overall_collection_rate || 0}%`, startX + 290, sumY + 20);

  doc.y = sumY + 44;

  // 2. Table: Monthly Performance Target vs Actual
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('KINERJA PENAGIHAN BULANAN (COLLECTION PERFORMANCE)', startX, doc.y);
  doc.moveDown(0.3);

  const mPerf = summary.monthly_performance || [];
  const colMWidth = contentWidth / 13; // 1 label + 12 bulan

  const mTableY = doc.y;
  doc.rect(startX, mTableY, contentWidth, 18).fill('#0f172a');
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('Indikator', startX + 4, mTableY + 5, { width: colMWidth - 6 });
  mPerf.forEach((m, i) => {
    doc.text(m.month_name.slice(0, 3), startX + colMWidth * (i + 1), mTableY + 5, { width: colMWidth - 2, align: 'center' });
  });

  // Target Row
  const row1Y = mTableY + 18;
  doc.rect(startX, row1Y, contentWidth, 16).fill('#f8fafc');
  doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(startX, row1Y, contentWidth, 16).stroke();
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#334155').text('Target (Rp)', startX + 4, row1Y + 4);
  mPerf.forEach((m, i) => {
    doc.font('Helvetica').text(formatRawNumber(m.target_billed), startX + colMWidth * (i + 1), row1Y + 4, { width: colMWidth - 2, align: 'center' });
  });

  // Realisasi Row
  const row2Y = row1Y + 16;
  doc.rect(startX, row2Y, contentWidth, 16).fill('#ffffff');
  doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(startX, row2Y, contentWidth, 16).stroke();
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#059669').text('Kas Masuk (Rp)', startX + 4, row2Y + 4);
  mPerf.forEach((m, i) => {
    doc.font('Helvetica').text(formatRawNumber(m.actual_collected), startX + colMWidth * (i + 1), row2Y + 4, { width: colMWidth - 2, align: 'center' });
  });

  // Rate Row
  const row3Y = row2Y + 16;
  doc.rect(startX, row3Y, contentWidth, 16).fill('#eff6ff');
  doc.strokeColor('#bfdbfe').lineWidth(0.5).rect(startX, row3Y, contentWidth, 16).stroke();
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#1d4ed8').text('Rate (%)', startX + 4, row3Y + 4);
  mPerf.forEach((m, i) => {
    doc.font('Helvetica-Bold').text(`${m.collection_rate}%`, startX + colMWidth * (i + 1), row3Y + 4, { width: colMWidth - 2, align: 'center' });
  });

  doc.y = row3Y + 24;

  // 3. Table: Student Recap Table
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('DAFTAR DETAIL SANTRI & REKAPITULASI PEMBAYARAN', startX, doc.y);
  doc.moveDown(0.3);

  const colWidths = [24, 55, 140, 50, 70, 70, 70, 70, 75, 55, 70]; // total ~749 pt
  const headers = ['No', 'NIS', 'Nama Santri', 'Kelas', 'Kewajiban TP', 'Terbayar', 'Sisa TP Ini', 'Sisa TP Lalu', 'Total Piutang', 'Status', 'Aging'];

  const renderTableHeader = () => {
    const y = doc.y;
    doc.rect(startX, y, contentWidth, 18).fill('#f1f5f9');
    doc.strokeColor('#cbd5e1').lineWidth(0.5).rect(startX, y, contentWidth, 18).stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e293b');
    let curX = startX;
    headers.forEach((h, idx) => {
      const align = (idx >= 4 && idx <= 8) ? 'right' : (idx === 0 || idx >= 9 ? 'center' : 'left');
      doc.text(h, curX + 3, y + 5, { width: colWidths[idx] - 6, align });
      curX += colWidths[idx];
    });
    doc.y = y + 18;
  };

  renderTableHeader();

  const students = recapData.students || [];
  students.forEach((s, idx) => {
    // Check page break
    if (doc.y + 18 > doc.page.height - 70) {
      doc.addPage();
      drawHeaderLandscape();
      renderTableHeader();
    }

    const ry = doc.y;
    if (idx % 2 === 1) doc.rect(startX, ry, contentWidth, 16).fill('#f8fafc');
    doc.strokeColor('#f1f5f9').lineWidth(0.5).rect(startX, ry, contentWidth, 16).stroke();

    doc.fontSize(7).font('Helvetica').fillColor('#1e293b');
    let curX = startX;

    // No
    doc.text(String(idx + 1), curX + 2, ry + 4, { width: colWidths[0] - 4, align: 'center' });
    curX += colWidths[0];

    // NIS
    doc.text(s.nis || '-', curX + 2, ry + 4, { width: colWidths[1] - 4 });
    curX += colWidths[1];

    // Nama
    doc.font('Helvetica-Bold').text(s.name, curX + 2, ry + 4, { width: colWidths[2] - 4 });
    curX += colWidths[2];

    // Kelas
    doc.font('Helvetica').text(s.class_name || '-', curX + 2, ry + 4, { width: colWidths[3] - 4 });
    curX += colWidths[3];

    // Kewajiban TP Ini
    doc.text(formatRawNumber(s.total_billed), curX + 2, ry + 4, { width: colWidths[4] - 4, align: 'right' });
    curX += colWidths[4];

    // Total Bayar
    doc.fillColor('#059669').text(formatRawNumber(s.total_paid), curX + 2, ry + 4, { width: colWidths[5] - 4, align: 'right' });
    curX += colWidths[5];

    // Sisa TP Ini
    doc.fillColor(s.total_remaining > 0 ? '#e11d48' : '#059669').text(formatRawNumber(s.total_remaining), curX + 2, ry + 4, { width: colWidths[6] - 4, align: 'right' });
    curX += colWidths[6];

    // Sisa TP Lalu
    doc.fillColor(s.arrears_previous_year > 0 ? '#b45309' : '#94a3b8').text(s.arrears_previous_year > 0 ? formatRawNumber(s.arrears_previous_year) : '-', curX + 2, ry + 4, { width: colWidths[7] - 4, align: 'right' });
    curX += colWidths[7];

    // Total Piutang
    doc.fillColor(s.grand_total_remaining > 0 ? '#b91c1c' : '#059669').font('Helvetica-Bold').text(formatRawNumber(s.grand_total_remaining), curX + 2, ry + 4, { width: colWidths[8] - 4, align: 'right' });
    curX += colWidths[8];

    // Status
    doc.font('Helvetica').fillColor('#1e293b').text(s.settlement_status || '-', curX + 2, ry + 4, { width: colWidths[9] - 4, align: 'center' });
    curX += colWidths[9];

    // Aging
    const agingLabel = s.grand_total_remaining > 0 ? `${s.aging_days}h (${s.aging_status})` : 'Lancar';
    doc.text(agingLabel, curX + 2, ry + 4, { width: colWidths[10] - 4, align: 'center' });

    doc.y = ry + 16;
  });

  // Check page break for Signatures
  if (doc.y + 70 > doc.page.height - 40) {
    doc.addPage();
    drawHeaderLandscape();
  }

  // Signatures
  doc.moveDown(1.5);
  const ttdY = doc.y;
  const leftX = startX + 50;
  const rightX = doc.page.width - 250;

  doc.fontSize(8).font('Helvetica').fillColor('#334155');
  doc.text('Mengetahui,', leftX, ttdY, { align: 'center', width: 180 });
  doc.text('Kepala Satuan Pendidikan', leftX, ttdY + 12, { align: 'center', width: 180 });
  doc.text('( .................................................. )', leftX, ttdY + 52, { align: 'center', width: 180 });

  doc.text('Bogor, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), rightX, ttdY, { align: 'center', width: 180 });
  doc.text('Bendahara Sekolah / Keuangan', rightX, ttdY + 12, { align: 'center', width: 180 });
  doc.font('Helvetica-Bold').text(`( ${user?.name || user?.username || 'Petugas Keuangan'} )`, rightX, ttdY + 52, { align: 'center', width: 180 });

  // Page Numbers
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bY = doc.page.height - 24;
    doc.moveTo(startX, bY - 4).lineTo(doc.page.width - startX, bY - 4).strokeColor('#e2e8f0').lineWidth(0.8).stroke();
    doc.fontSize(7).font('Helvetica').fillColor('#64748b');
    doc.text(`Dicetak dari Sistem Keuangan Terpadu &bull; ${new Date().toLocaleString('id-ID')}`, startX, bY, { width: 350 });
    doc.text(`Halaman ${i + 1} dari ${range.count}`, doc.page.width - 200, bY, { width: 165, align: 'right' });
  }

  doc.end();
  return doc;
}

module.exports = {
  generateExcel,
  generatePdf
};
