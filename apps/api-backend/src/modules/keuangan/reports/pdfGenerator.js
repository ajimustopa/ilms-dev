/**
 * Financial PDF Report Generator using PDFKit
 * Supports:
 * 1. General Ledger (Buku Besar)
 * 2. Trial Balance (Neraca Saldo)
 * 3. Income Statement (Surplus / Defisit / Laba Rugi)
 * 4. Cash Flow (Laporan Arus Kas)
 * 5. Balance Sheet (Neraca Posisi Keuangan)
 */
const PDFDocument = require('pdfkit');

function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(val)) return 'Rp 0';
  const num = parseFloat(val);
  const isNegative = num < 0;
  const absFormatted = Math.abs(num).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return isNegative ? `(Rp ${absFormatted})` : `Rp ${absFormatted}`;
}

function formatRawNumber(val) {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Math.abs(parseFloat(val)).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function drawHeader(doc, schoolUnit, title, period) {
  const startX = 40;
  const contentWidth = doc.page.width - 80;

  // Header Lembaga
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text(schoolUnit?.name || 'ALDEPOS ISLAMIC BOARDING SCHOOL', startX, 40, { align: 'center' });
  doc.fontSize(9).font('Helvetica').fillColor('#475569').text('YAYASAN PENDIDIKAN ALDEPOS &bull; SISTEM KEUANGAN TERPADU', { align: 'center' });
  if (schoolUnit?.address) {
    doc.fontSize(8).fillColor('#64748b').text(schoolUnit.address, { align: 'center' });
  }

  doc.moveDown(0.4);
  const lineY = doc.y;
  doc.moveTo(startX, lineY).lineTo(startX + contentWidth, lineY).strokeColor('#0284c7').lineWidth(1.5).stroke();
  doc.moveDown(0.6);

  // Judul Laporan
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(title.toUpperCase(), { align: 'center' });
  doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text(`Periode: ${period || 'Semua Periode'}`, { align: 'center' });
  doc.moveDown(0.8);
}

function checkPageBreak(doc, neededHeight, schoolUnit, title, period) {
  if (doc.y + neededHeight > doc.page.height - 50) {
    doc.addPage();
    drawHeader(doc, schoolUnit, title, period);
  }
}

function applyPageNumbers(doc, user) {
  const range = doc.bufferedPageRange();
  const printDate = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const userName = user?.username || user?.name || 'Petugas Keuangan';

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottomY = doc.page.height - 30;

    // Divider footer
    doc.moveTo(40, bottomY - 6).lineTo(doc.page.width - 40, bottomY - 6).strokeColor('#e2e8f0').lineWidth(0.8).stroke();

    doc.fontSize(7.5).font('Helvetica').fillColor('#64748b');
    doc.text(`Dicetak oleh: ${userName} pada ${printDate}`, 40, bottomY, { width: 300, align: 'left' });
    doc.text(`Halaman ${i + 1} dari ${range.count}`, doc.page.width - 160, bottomY, { width: 120, align: 'right' });
  }
}

/**
 * 1. Generate Trial Balance (Neraca Saldo) PDF
 */
function generateTrialBalancePdf(data, schoolUnit, user) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const title = 'Laporan Neraca Saldo (Trial Balance)';
  const period = data.period;

  drawHeader(doc, schoolUnit, title, period);

  const startX = 40;
  const colWidths = [60, 205, 75, 87, 87]; // total 514
  const headers = ['Kode Akun', 'Nama Akun (COA)', 'Kelompok', 'Debit (Rp)', 'Kredit (Rp)'];

  // Draw Table Header
  const renderTableHeader = () => {
    const y = doc.y;
    doc.rect(startX, y, 514, 20).fill('#f1f5f9');
    doc.strokeColor('#cbd5e1').lineWidth(0.5).rect(startX, y, 514, 20).stroke();

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b');
    let curX = startX;
    headers.forEach((h, idx) => {
      const align = idx >= 3 ? 'right' : 'left';
      const textX = idx >= 3 ? curX : curX + 4;
      const width = idx >= 3 ? colWidths[idx] - 6 : colWidths[idx] - 8;
      doc.text(h, textX, y + 6, { width, align });
      curX += colWidths[idx];
    });
    doc.y = y + 20;
  };

  renderTableHeader();

  // Draw Rows
  doc.font('Helvetica').fontSize(8);
  data.rows.forEach((r, rowIdx) => {
    checkPageBreak(doc, 20, schoolUnit, title, period);

    const y = doc.y;
    if (rowIdx % 2 === 1) {
      doc.rect(startX, y, 514, 18).fill('#f8fafc');
    }
    doc.strokeColor('#f1f5f9').lineWidth(0.5).rect(startX, y, 514, 18).stroke();

    let curX = startX;
    // 1. Kode Akun
    doc.font('Helvetica-Bold').fillColor('#047857').text(r.account_code, curX + 4, y + 5, { width: colWidths[0] - 6 });
    curX += colWidths[0];

    // 2. Nama Akun
    doc.font('Helvetica').fillColor('#1e293b').text(r.account_name, curX + 4, y + 5, { width: colWidths[1] - 6 });
    curX += colWidths[1];

    // 3. Kelompok
    doc.fontSize(7.5).fillColor('#64748b').text(r.account_group ? r.account_group.toUpperCase() : '-', curX + 4, y + 5, { width: colWidths[2] - 6 });
    curX += colWidths[2];

    // 4. Debit
    doc.fontSize(8).fillColor('#0f172a').text(r.debit > 0 ? formatRawNumber(r.debit) : '-', curX, y + 5, { width: colWidths[3] - 6, align: 'right' });
    curX += colWidths[3];

    // 5. Kredit
    doc.fontSize(8).fillColor('#0f172a').text(r.credit > 0 ? formatRawNumber(r.credit) : '-', curX, y + 5, { width: colWidths[4] - 6, align: 'right' });

    doc.y = y + 18;
  });

  // Table Total Footer
  checkPageBreak(doc, 30, schoolUnit, title, period);
  const totalY = doc.y;
  doc.rect(startX, totalY, 514, 22).fill('#f1f5f9');
  doc.strokeColor('#cbd5e1').lineWidth(1).rect(startX, totalY, 514, 22).stroke();

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('TOTAL NERACA SALDO', startX + 6, totalY + 6, { width: 340 });
  doc.text(formatRawNumber(data.total_debit), startX + 340, totalY + 6, { width: colWidths[3] - 6, align: 'right' });
  doc.text(formatRawNumber(data.total_credit), startX + 340 + colWidths[3], totalY + 6, { width: colWidths[4] - 6, align: 'right' });
  doc.y = totalY + 28;

  // Status Balance Badge
  const isBalanced = data.is_balanced;
  doc.fontSize(8).font('Helvetica-Bold')
    .fillColor(isBalanced ? '#047857' : '#b91c1c')
    .text(isBalanced ? '✓ Status: Neraca Saldo Seimbang (Match)' : '⚠ Status: Neraca Saldo Belum Seimbang (Selisih)', startX, doc.y, { align: 'right' });

  applyPageNumbers(doc, user);
  doc.end();
  return doc;
}

/**
 * 2. Generate General Ledger (Buku Besar) PDF
 */
function generateGeneralLedgerPdf(data, schoolUnit, user, periodStr = '') {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const title = 'Laporan Buku Besar (General Ledger)';

  drawHeader(doc, schoolUnit, title, periodStr);

  const startX = 40;
  const colWidths = [55, 80, 185, 64, 64, 66]; // total 514

  data.forEach((acc) => {
    checkPageBreak(doc, 60, schoolUnit, title, periodStr);

    // Account Group Header Box
    const boxY = doc.y;
    doc.rect(startX, boxY, 514, 20).fill('#f8fafc');
    doc.strokeColor('#cbd5e1').lineWidth(0.8).rect(startX, boxY, 514, 20).stroke();

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text(`${acc.account_code} - ${acc.account_name}`, startX + 6, boxY + 5, { width: 340 });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#047857');
    doc.text(`Saldo Akhir: ${formatCurrency(acc.ending_balance)}`, startX + 350, boxY + 5, { width: 158, align: 'right' });

    doc.y = boxY + 20;

    // Table Header
    const thY = doc.y;
    doc.rect(startX, thY, 514, 16).fill('#f1f5f9');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569');

    let curX = startX;
    const ths = ['Tanggal', 'No. Jurnal', 'Keterangan', 'Debit (Rp)', 'Kredit (Rp)', 'Saldo (Rp)'];
    ths.forEach((h, idx) => {
      const align = idx >= 3 ? 'right' : 'left';
      const textX = idx >= 3 ? curX : curX + 4;
      const width = idx >= 3 ? colWidths[idx] - 4 : colWidths[idx] - 6;
      doc.text(h, textX, thY + 4, { width, align });
      curX += colWidths[idx];
    });
    doc.y = thY + 16;

    // Mutations Rows
    if (!acc.mutations || acc.mutations.length === 0) {
      const empY = doc.y;
      doc.rect(startX, empY, 514, 16).fill('#ffffff');
      doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(startX, empY, 514, 16).stroke();
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text('Tidak ada mutasi transaksi pada periode ini', startX, empY + 4, { align: 'center', width: 514 });
      doc.y = empY + 16;
    } else {
      acc.mutations.forEach((m, mIdx) => {
        checkPageBreak(doc, 18, schoolUnit, title, periodStr);
        const rY = doc.y;
        if (mIdx % 2 === 1) doc.rect(startX, rY, 514, 16).fill('#fafafa');
        doc.strokeColor('#f1f5f9').lineWidth(0.5).rect(startX, rY, 514, 16).stroke();

        let cx = startX;
        doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
        // Tanggal
        const tglStr = m.journal_date ? (typeof m.journal_date === 'string' ? m.journal_date.slice(0, 10) : m.journal_date.toISOString().slice(0, 10)) : '-';
        doc.text(tglStr, cx + 4, rY + 4, { width: colWidths[0] - 6 });
        cx += colWidths[0];

        // No Jurnal
        doc.font('Helvetica-Bold').fillColor('#0284c7').text(m.journal_number || '-', cx + 4, rY + 4, { width: colWidths[1] - 6 });
        cx += colWidths[1];

        // Keterangan
        doc.font('Helvetica').fillColor('#334155').text(m.description || '-', cx + 4, rY + 4, { width: colWidths[2] - 6 });
        cx += colWidths[2];

        // Debit
        doc.text(m.entry_side === 'debit' ? formatRawNumber(m.amount) : '-', cx, rY + 4, { width: colWidths[3] - 4, align: 'right' });
        cx += colWidths[3];

        // Kredit
        doc.text(m.entry_side === 'credit' ? formatRawNumber(m.amount) : '-', cx, rY + 4, { width: colWidths[4] - 4, align: 'right' });
        cx += colWidths[4];

        // Saldo
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(formatRawNumber(m.balance_after), cx, rY + 4, { width: colWidths[5] - 4, align: 'right' });

        doc.y = rY + 16;
      });
    }

    doc.moveDown(0.6);
  });

  applyPageNumbers(doc, user);
  doc.end();
  return doc;
}

/**
 * 3. Generate Income Statement (Surplus / Defisit) PDF
 */
function generateIncomeStatementPdf(data, schoolUnit, user) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const title = 'Laporan Surplus / Defisit (Laba Rugi)';
  const period = data.period;

  drawHeader(doc, schoolUnit, title, period);

  const startX = 60;
  const contentWidth = doc.page.width - 120;

  // I. PENDAPATAN
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#047857').text('I. PENDAPATAN & PENERIMAAN', startX, doc.y);
  doc.moveDown(0.3);

  const revY = doc.y;
  doc.rect(startX, revY, contentWidth, 18).fill('#f1f5f9');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b');
  doc.text('Nama Akun Pendapatan', startX + 6, revY + 5, { width: contentWidth - 120 });
  doc.text('Nominal (Rp)', startX + contentWidth - 110, revY + 5, { width: 104, align: 'right' });
  doc.y = revY + 18;

  if (!data.revenues || data.revenues.length === 0) {
    const ey = doc.y;
    doc.rect(startX, ey, contentWidth, 18).fill('#ffffff').strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('Tidak ada pendapatan pada periode ini', startX, ey + 5, { align: 'center', width: contentWidth });
    doc.y = ey + 18;
  } else {
    data.revenues.forEach((r, idx) => {
      const ry = doc.y;
      if (idx % 2 === 1) doc.rect(startX, ry, contentWidth, 18).fill('#fafafa');
      doc.strokeColor('#f1f5f9').lineWidth(0.5).rect(startX, ry, contentWidth, 18).stroke();

      doc.fontSize(8).font('Helvetica').fillColor('#1e293b').text(r.account_name, startX + 6, ry + 5, { width: contentWidth - 120 });
      doc.font('Helvetica-Bold').fillColor('#047857').text(formatRawNumber(r.credit - r.debit), startX + contentWidth - 110, ry + 5, { width: 104, align: 'right' });
      doc.y = ry + 18;
    });
  }

  // Total Pendapatan
  const totRevY = doc.y;
  doc.rect(startX, totRevY, contentWidth, 20).fill('#ecfdf5');
  doc.strokeColor('#a7f3d0').lineWidth(0.8).rect(startX, totRevY, contentWidth, 20).stroke();
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#065f46');
  doc.text('TOTAL PENDAPATAN', startX + 6, totRevY + 5, { width: contentWidth - 120 });
  doc.text(formatCurrency(data.total_revenue), startX + contentWidth - 120, totRevY + 5, { width: 114, align: 'right' });
  doc.y = totRevY + 28;

  // II. BEBAN OPERASIONAL
  checkPageBreak(doc, 60, schoolUnit, title, period);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#b91c1c').text('II. BEBAN & BIAYA OPERASIONAL', startX, doc.y);
  doc.moveDown(0.3);

  const expY = doc.y;
  doc.rect(startX, expY, contentWidth, 18).fill('#f1f5f9');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b');
  doc.text('Nama Akun Beban', startX + 6, expY + 5, { width: contentWidth - 120 });
  doc.text('Nominal (Rp)', startX + contentWidth - 110, expY + 5, { width: 104, align: 'right' });
  doc.y = expY + 18;

  if (!data.expenses || data.expenses.length === 0) {
    const ey = doc.y;
    doc.rect(startX, ey, contentWidth, 18).fill('#ffffff').strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('Tidak ada beban pada periode ini', startX, ey + 5, { align: 'center', width: contentWidth });
    doc.y = ey + 18;
  } else {
    data.expenses.forEach((e, idx) => {
      const ry = doc.y;
      if (idx % 2 === 1) doc.rect(startX, ry, contentWidth, 18).fill('#fafafa');
      doc.strokeColor('#f1f5f9').lineWidth(0.5).rect(startX, ry, contentWidth, 18).stroke();

      doc.fontSize(8).font('Helvetica').fillColor('#1e293b').text(e.account_name, startX + 6, ry + 5, { width: contentWidth - 120 });
      doc.font('Helvetica-Bold').fillColor('#b91c1c').text(formatRawNumber(e.debit - e.credit), startX + contentWidth - 110, ry + 5, { width: 104, align: 'right' });
      doc.y = ry + 18;
    });
  }

  // Total Beban
  const totExpY = doc.y;
  doc.rect(startX, totExpY, contentWidth, 20).fill('#fef2f2');
  doc.strokeColor('#fecaca').lineWidth(0.8).rect(startX, totExpY, contentWidth, 20).stroke();
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#991b1b');
  doc.text('TOTAL BEBAN OPERASIONAL', startX + 6, totExpY + 5, { width: contentWidth - 120 });
  doc.text(formatCurrency(data.total_expense), startX + contentWidth - 120, totExpY + 5, { width: 114, align: 'right' });
  doc.y = totExpY + 30;

  // NET SURPLUS / DEFISIT
  checkPageBreak(doc, 40, schoolUnit, title, period);
  const netY = doc.y;
  const isSurplus = data.is_surplus;
  doc.rect(startX, netY, contentWidth, 26).fill(isSurplus ? '#dcfce7' : '#fee2e2');
  doc.strokeColor(isSurplus ? '#86efac' : '#fca5a5').lineWidth(1.2).rect(startX, netY, contentWidth, 26).stroke();

  doc.fontSize(9).font('Helvetica-Bold').fillColor(isSurplus ? '#14532d' : '#7f1d1d');
  doc.text(isSurplus ? 'SURPLUS BERSIH PERIODE BERJALAN' : 'DEFISIT BERSIH PERIODE BERJALAN', startX + 8, netY + 8, { width: contentWidth - 140 });
  doc.fontSize(10).text(formatCurrency(data.surplus_defisit), startX + contentWidth - 130, netY + 8, { width: 122, align: 'right' });

  applyPageNumbers(doc, user);
  doc.end();
  return doc;
}

/**
 * 4. Generate Cash Flow (Laporan Arus Kas) PDF
 */
function generateCashFlowPdf(data, schoolUnit, user) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const title = 'Laporan Arus Kas (Cash Flow)';
  const period = data.period;

  drawHeader(doc, schoolUnit, title, period);

  const startX = 40;
  const contentWidth = doc.page.width - 80;

  // Summary Card
  const sumY = doc.y;
  doc.rect(startX, sumY, contentWidth, 40).fill('#f8fafc');
  doc.strokeColor('#cbd5e1').lineWidth(0.8).rect(startX, sumY, contentWidth, 40).stroke();

  const cardW = contentWidth / 3;
  // Box 1: Inflow
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748b').text('KAS MASUK (INFLOW)', startX + 8, sumY + 8);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#047857').text(formatCurrency(data.cash_inflow), startX + 8, sumY + 20);

  // Box 2: Outflow
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748b').text('KAS KELUAR (OUTFLOW)', startX + cardW + 8, sumY + 8);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#b91c1c').text(formatCurrency(data.cash_outflow), startX + cardW + 8, sumY + 20);

  // Box 3: Net
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748b').text('ARUS KAS BERSIH', startX + (cardW * 2) + 8, sumY + 8);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(data.net_cash_flow >= 0 ? '#047857' : '#b91c1c').text(formatCurrency(data.net_cash_flow), startX + (cardW * 2) + 8, sumY + 20);

  doc.y = sumY + 50;

  // Activities Table
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text('Rincian Mutasi Kas Masuk & Keluar', startX, doc.y);
  doc.moveDown(0.3);

  const colWidths = [60, 244, 90, 120];
  const thY = doc.y;
  doc.rect(startX, thY, contentWidth, 18).fill('#f1f5f9');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b');

  doc.text('Tanggal', startX + 4, thY + 5, { width: colWidths[0] - 6 });
  doc.text('Keterangan Transaksi', startX + colWidths[0] + 4, thY + 5, { width: colWidths[1] - 6 });
  doc.text('Jenis Arus Kas', startX + colWidths[0] + colWidths[1] + 4, thY + 5, { width: colWidths[2] - 6 });
  doc.text('Nominal (Rp)', startX + colWidths[0] + colWidths[1] + colWidths[2], thY + 5, { width: colWidths[3] - 6, align: 'right' });
  doc.y = thY + 18;

  if (!data.activities || data.activities.length === 0) {
    const ey = doc.y;
    doc.rect(startX, ey, contentWidth, 18).fill('#ffffff').strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('Tidak ada aktivitas kas pada periode ini', startX, ey + 5, { align: 'center', width: contentWidth });
    doc.y = ey + 18;
  } else {
    data.activities.forEach((act, idx) => {
      checkPageBreak(doc, 18, schoolUnit, title, period);
      const ry = doc.y;
      if (idx % 2 === 1) doc.rect(startX, ry, contentWidth, 18).fill('#fafafa');
      doc.strokeColor('#f1f5f9').lineWidth(0.5).rect(startX, ry, contentWidth, 18).stroke();

      const tglStr = act.journal_date ? (typeof act.journal_date === 'string' ? act.journal_date.slice(0, 10) : act.journal_date.toISOString().slice(0, 10)) : '-';
      const isInflow = act.entry_side === 'debit';

      doc.fontSize(7.5).font('Helvetica').fillColor('#334155').text(tglStr, startX + 4, ry + 5, { width: colWidths[0] - 6 });
      doc.text(act.description || '-', startX + colWidths[0] + 4, ry + 5, { width: colWidths[1] - 6 });
      doc.font('Helvetica-Bold').fillColor(isInflow ? '#047857' : '#b91c1c').text(isInflow ? 'Kas Masuk' : 'Kas Keluar', startX + colWidths[0] + colWidths[1] + 4, ry + 5, { width: colWidths[2] - 6 });
      doc.text(formatRawNumber(act.amount), startX + colWidths[0] + colWidths[1] + colWidths[2], ry + 5, { width: colWidths[3] - 6, align: 'right' });

      doc.y = ry + 18;
    });
  }

  applyPageNumbers(doc, user);
  doc.end();
  return doc;
}

/**
 * 5. Generate Balance Sheet (Neraca Posisi Keuangan) PDF
 */
function generateBalanceSheetPdf(data, schoolUnit, user) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const title = 'Laporan Posisi Keuangan (Neraca)';
  const period = data.period;

  drawHeader(doc, schoolUnit, title, period);

  const startX = 50;
  const contentWidth = doc.page.width - 100;

  // I. ASET (AKTIVA)
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0284c7').text('I. ASET / AKTIVA', startX, doc.y);
  doc.moveDown(0.3);

  const astY = doc.y;
  doc.rect(startX, astY, contentWidth, 18).fill('#f1f5f9');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b');
  doc.text('Nama Akun Aset', startX + 6, astY + 5, { width: contentWidth - 120 });
  doc.text('Nilai Buku (Rp)', startX + contentWidth - 110, astY + 5, { width: 104, align: 'right' });
  doc.y = astY + 18;

  if (!data.assets || data.assets.length === 0) {
    const ey = doc.y;
    doc.rect(startX, ey, contentWidth, 18).fill('#ffffff').strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('Tidak ada akun aset tercatat', startX, ey + 5, { align: 'center', width: contentWidth });
    doc.y = ey + 18;
  } else {
    data.assets.forEach((a, idx) => {
      const ry = doc.y;
      if (idx % 2 === 1) doc.rect(startX, ry, contentWidth, 18).fill('#fafafa');
      doc.strokeColor('#f1f5f9').lineWidth(0.5).rect(startX, ry, contentWidth, 18).stroke();

      doc.fontSize(8).font('Helvetica').fillColor('#1e293b').text(a.account_name, startX + 6, ry + 5, { width: contentWidth - 120 });
      doc.font('Helvetica-Bold').fillColor('#0284c7').text(formatRawNumber(a.debit - a.credit), startX + contentWidth - 110, ry + 5, { width: 104, align: 'right' });
      doc.y = ry + 18;
    });
  }

  // Total Aset
  const totAstY = doc.y;
  doc.rect(startX, totAstY, contentWidth, 20).fill('#f0f9ff');
  doc.strokeColor('#bae6fd').lineWidth(0.8).rect(startX, totAstY, contentWidth, 20).stroke();
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0369a1');
  doc.text('TOTAL ASET (AKTIVA)', startX + 6, totAstY + 5, { width: contentWidth - 120 });
  doc.text(formatCurrency(data.total_assets), startX + contentWidth - 120, totAstY + 5, { width: 114, align: 'right' });
  doc.y = totAstY + 28;

  // II. KEWAJIBAN & EKUITAS (PASIVA)
  checkPageBreak(doc, 80, schoolUnit, title, period);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#7c3aed').text('II. KEWAJIBAN & EKUITAS (PASIVA)', startX, doc.y);
  doc.moveDown(0.3);

  // Sub Kewajiban
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text('A. Kewajiban (Liabilitas)', startX + 4, doc.y);
  doc.moveDown(0.2);

  data.liabilities.forEach((l, idx) => {
    const ry = doc.y;
    if (idx % 2 === 1) doc.rect(startX, ry, contentWidth, 18).fill('#fafafa');
    doc.strokeColor('#f1f5f9').lineWidth(0.5).rect(startX, ry, contentWidth, 18).stroke();

    doc.fontSize(8).font('Helvetica').fillColor('#1e293b').text(l.account_name, startX + 6, ry + 5, { width: contentWidth - 120 });
    doc.font('Helvetica-Bold').fillColor('#475569').text(formatRawNumber(l.credit - l.debit), startX + contentWidth - 110, ry + 5, { width: 104, align: 'right' });
    doc.y = ry + 18;
  });

  const totLiabY = doc.y;
  doc.rect(startX, totLiabY, contentWidth, 18).fill('#f8fafc');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text('Subtotal Kewajiban', startX + 6, totLiabY + 4);
  doc.text(formatCurrency(data.total_liabilities), startX + contentWidth - 110, totLiabY + 4, { width: 104, align: 'right' });
  doc.y = totLiabY + 22;

  // Sub Ekuitas
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569').text('B. Ekuitas (Modal / Saldo Dana)', startX + 4, doc.y);
  doc.moveDown(0.2);

  data.equity.forEach((eq, idx) => {
    const ry = doc.y;
    if (idx % 2 === 1) doc.rect(startX, ry, contentWidth, 18).fill('#fafafa');
    doc.strokeColor('#f1f5f9').lineWidth(0.5).rect(startX, ry, contentWidth, 18).stroke();

    doc.fontSize(8).font('Helvetica').fillColor('#1e293b').text(eq.account_name, startX + 6, ry + 5, { width: contentWidth - 120 });
    doc.font('Helvetica-Bold').fillColor('#475569').text(formatRawNumber(eq.credit - eq.debit), startX + contentWidth - 110, ry + 5, { width: 104, align: 'right' });
    doc.y = ry + 18;
  });

  const totEqY = doc.y;
  doc.rect(startX, totEqY, contentWidth, 18).fill('#f8fafc');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text('Subtotal Ekuitas', startX + 6, totEqY + 4);
  doc.text(formatCurrency(data.total_equity), startX + contentWidth - 110, totEqY + 4, { width: 104, align: 'right' });
  doc.y = totEqY + 22;

  // TOTAL KEWAJIBAN & EKUITAS
  const totPasY = doc.y;
  const totalPasiva = data.total_liabilities + data.total_equity;
  doc.rect(startX, totPasY, contentWidth, 20).fill('#f5f3ff');
  doc.strokeColor('#ddd6fe').lineWidth(0.8).rect(startX, totPasY, contentWidth, 20).stroke();
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#6d28d9');
  doc.text('TOTAL KEWAJIBAN & EKUITAS (PASIVA)', startX + 6, totPasY + 5, { width: contentWidth - 120 });
  doc.text(formatCurrency(totalPasiva), startX + contentWidth - 120, totPasY + 5, { width: 114, align: 'right' });
  doc.y = totPasY + 28;

  // Status Neraca Seimbang
  const isBalanced = data.is_balanced;
  doc.fontSize(8).font('Helvetica-Bold')
    .fillColor(isBalanced ? '#047857' : '#b91c1c')
    .text(isBalanced ? '✓ Neraca Seimbang: Total Aset = Total Kewajiban & Ekuitas' : '⚠ Neraca Belum Seimbang Terdapat Selisih', startX, doc.y, { align: 'right', width: contentWidth });

  applyPageNumbers(doc, user);
  doc.end();
  return doc;
}

module.exports = {
  generateTrialBalancePdf,
  generateGeneralLedgerPdf,
  generateIncomeStatementPdf,
  generateCashFlowPdf,
  generateBalanceSheetPdf
};
