/**
 * Card & PIN Label PDF Generator for Modul Kantin using PDFKit
 * Fitur:
 * - Template Label Gunting PIN Siswa (Standard 10/lembar, Compact 21/lembar, atau Kustom)
 * - Template Kartu Siswa ID Card CR80 / B2 / B3 / Compact
 * - Menampilkan: PIN Siswa, Nama Siswa, NIPD / NIS, Kelas / Rombel, dan QR Code NIPD
 * - Dilengkapi garis potong putus-putus (dashed cutting lines) & tanda gunting (✂) untuk kemudahan distribusi
 */
const PDFDocument = require('pdfkit');
const { createCompliantQRMatrix } = require('./qrCodeGenerator');

const MM_TO_PT = 72 / 25.4; // 2.83464567

const PAPER_SIZES = {
  a4: { name: 'A4 (210 x 297 mm)', width_mm: 210, height_mm: 297 },
  f4: { name: 'F4 / Folio (215 x 330 mm)', width_mm: 215, height_mm: 330 },
  letter: { name: 'Letter (215.9 x 279.4 mm)', width_mm: 215.9, height_mm: 279.4 },
  a3: { name: 'A3 (297 x 420 mm)', width_mm: 297, height_mm: 420 },
  custom: { name: 'Ukuran Kustom', width_mm: 210, height_mm: 297 }
};

const CARD_SIZES = {
  // Mode Label Slip Gunting
  label_standard: { name: 'Slip Label Standar (95 x 52 mm - ~10 slip/A4)', width_mm: 95.0, height_mm: 52.0, is_label: true },
  label_compact: { name: 'Slip Label Hemat / Compact (64 x 38 mm - ~21 slip/A4)', width_mm: 64.0, height_mm: 38.0, is_label: true },
  label_mini: { name: 'Slip Mini Strip (95 x 36 mm - ~14 slip/A4)', width_mm: 95.0, height_mm: 36.0, is_label: true },
  
  // Mode Kartu Identitas
  cr80: { name: 'Standar ID Card / CR80 (85.6 x 54 mm)', width_mm: 85.6, height_mm: 54.0, is_label: false },
  b2: { name: 'Ukuran B2 (106 x 82 mm)', width_mm: 106.0, height_mm: 82.0, is_label: false },
  b3: { name: 'Ukuran B3 (124 x 95 mm)', width_mm: 124.0, height_mm: 95.0, is_label: false },
  compact: { name: 'Ukuran Compact (70 x 45 mm)', width_mm: 70.0, height_mm: 45.0, is_label: false },
  a6_landscape: { name: 'Ukuran A6 Landscape (148 x 105 mm)', width_mm: 148.0, height_mm: 105.0, is_label: false },
  custom: { name: 'Ukuran Kustom (mm)', width_mm: 95.0, height_mm: 52.0, is_label: true }
};

/**
 * Generate PDF buffer containing printable cards or PIN labels for selected students
 * @param {Array<Object>} students - Array of student objects
 * @param {Object} options - Configuration options
 * @returns {Promise<Buffer>}
 */
function generateCardsPdf(students, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const {
        paper_size = 'a4',
        paper_orientation = 'portrait', // 'portrait' | 'landscape'
        custom_paper_width_mm = 210,
        custom_paper_height_mm = 297,
        card_size = 'label_standard',
        custom_card_width_mm = 95.0,
        custom_card_height_mm = 52.0,
        margin_mm = 8,
        gap_mm = 3,
        show_cutting_lines = true,
        show_pin = true,
        show_qr = true,
        show_class = true,
        school_name = 'ALDEPOS ISLAMIC BOARDING SCHOOL',
        header_title = 'SLIP PIN KANTIN SANTRI'
      } = options;

      // 1. Resolve Paper Dimensions (in points)
      let paperDef = PAPER_SIZES[paper_size] || PAPER_SIZES.a4;
      let paperWidthMm = paper_size === 'custom' ? parseFloat(custom_paper_width_mm) || 210 : paperDef.width_mm;
      let paperHeightMm = paper_size === 'custom' ? parseFloat(custom_paper_height_mm) || 297 : paperDef.height_mm;

      if (paper_orientation === 'landscape') {
        const temp = paperWidthMm;
        paperWidthMm = Math.max(paperWidthMm, paperHeightMm);
        paperHeightMm = Math.min(temp, paperHeightMm);
      } else {
        const temp = paperWidthMm;
        paperWidthMm = Math.min(paperWidthMm, paperHeightMm);
        paperHeightMm = Math.max(temp, paperHeightMm);
      }

      const paperWidthPt = paperWidthMm * MM_TO_PT;
      const paperHeightPt = paperHeightMm * MM_TO_PT;

      // 2. Resolve Card / Label Dimensions (selalu Landscape: lebar >= tinggi)
      let cardDef = CARD_SIZES[card_size] || CARD_SIZES.label_standard;
      let rawCardWidthMm = card_size === 'custom' ? parseFloat(custom_card_width_mm) || 95.0 : cardDef.width_mm;
      let rawCardHeightMm = card_size === 'custom' ? parseFloat(custom_card_height_mm) || 52.0 : cardDef.height_mm;

      const cardWidthMm = Math.max(rawCardWidthMm, rawCardHeightMm);
      const cardHeightMm = Math.min(rawCardWidthMm, rawCardHeightMm);

      const cardWidthPt = cardWidthMm * MM_TO_PT;
      const cardHeightPt = cardHeightMm * MM_TO_PT;

      const marginPt = (parseFloat(margin_mm) >= 0 ? parseFloat(margin_mm) : 8) * MM_TO_PT;
      const gapPt = (parseFloat(gap_mm) >= 0 ? parseFloat(gap_mm) : 3) * MM_TO_PT;

      // 3. Grid Calculation
      const availableWidth = paperWidthPt - (2 * marginPt);
      const availableHeight = paperHeightPt - (2 * marginPt);

      const cols = Math.max(1, Math.floor((availableWidth + gapPt) / (cardWidthPt + gapPt)));
      const rows = Math.max(1, Math.floor((availableHeight + gapPt) / (cardHeightPt + gapPt)));
      const cardsPerPage = cols * rows;

      const totalGridWidth = cols * cardWidthPt + (cols - 1) * gapPt;
      const totalGridHeight = rows * cardHeightPt + (rows - 1) * gapPt;

      // Pusatkan grid kartu di tengah lembar kertas
      const startX = marginPt + Math.max(0, (availableWidth - totalGridWidth) / 2);
      const startY = marginPt + Math.max(0, (availableHeight - totalGridHeight) / 2);

      // 4. Inisialisasi PDF Document
      const doc = new PDFDocument({
        autoFirstPage: true,
        size: [paperWidthPt, paperHeightPt],
        margin: 0,
        bufferPages: true,
        info: {
          Title: 'Label PIN Santri Kantin Aldepos',
          Author: 'Core Aldepos System',
          Subject: 'Label Slip PIN dan Kartu Santri Cashless',
          Keywords: 'Kantin, PIN Siswa, Label Gunting, QR Code'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', (err) => reject(err));

      const isLabelStyle = cardDef.is_label !== false || show_pin;

      // 5. Render Setiap Kartu / Label Siswa
      students.forEach((student, index) => {
        if (index > 0 && index % cardsPerPage === 0) {
          doc.addPage({ size: [paperWidthPt, paperHeightPt], margin: 0 });
        }

        const pageIndex = index % cardsPerPage;
        const col = pageIndex % cols;
        const row = Math.floor(pageIndex / cols);

        const cardX = startX + col * (cardWidthPt + gapPt);
        const cardY = startY + row * (cardHeightPt + gapPt);

        if (isLabelStyle) {
          renderSinglePinLabel(doc, student, cardX, cardY, cardWidthPt, cardHeightPt, {
            show_cutting_lines,
            show_pin,
            show_qr,
            show_class,
            school_name,
            header_title
          });
        } else {
          renderSingleCard(doc, student, cardX, cardY, cardWidthPt, cardHeightPt, {
            show_cutting_lines,
            show_pin,
            show_qr,
            show_class,
            school_name
          });
        }
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Render single PIN Label Slip (khusus format gunting & bagikan ke siswa)
 */
function renderSinglePinLabel(doc, student, x, y, width, height, opts = {}) {
  const {
    show_cutting_lines = true,
    show_pin = true,
    show_qr = true,
    show_class = true,
    school_name = 'ALDEPOS ISLAMIC BOARDING SCHOOL',
    header_title = 'SLIP PIN KANTIN'
  } = opts;

  doc.save();

  // 1. Background Slip Putih
  doc.rect(x, y, width, height)
     .fillColor('#ffffff')
     .fill();

  // 2. Garis Batas Gunting Putus-putus (Dashed Border)
  if (show_cutting_lines) {
    doc.save();
    doc.rect(x, y, width, height)
       .lineWidth(0.7)
       .dash(3, { space: 2 })
       .strokeColor('#94a3b8') // slate-400
       .stroke();
    doc.restore();

    // Tanda Gunting kecil di pojok kiri atas slip
    if (width > 120 && height > 80) {
      doc.fontSize(6)
         .font('Helvetica')
         .fillColor('#94a3b8')
         .text('✂ potong', x + 3, y + 2, { lineBreak: false });
    }
  }

  // 3. Header Strip Atas yang Rapi & Elegan
  const headerHeight = Math.max(12, Math.min(18, height * 0.18));
  doc.rect(x + 1, y + 1, width - 2, headerHeight)
     .fillColor('#064e3b') // emerald-900 / dark emerald
     .fill();

  // Teks Header Sekolah & Judul
  const headerFontSize = Math.max(5.5, Math.min(7.5, headerHeight * 0.5));
  doc.font('Helvetica-Bold')
     .fontSize(headerFontSize)
     .fillColor('#ffffff')
     .text(school_name, x + 6, y + 3, {
       width: width - 12,
       align: 'left',
       lineBreak: false,
       ellipsis: true
     });

  const subHeaderFontSize = Math.max(4.5, Math.min(6, headerHeight * 0.38));
  doc.font('Helvetica')
     .fontSize(subHeaderFontSize)
     .fillColor('#a7f3d0') // emerald-200
     .text(header_title, x + 6, y + 3 + headerFontSize + 1, {
       width: width - 12,
       align: 'left',
       lineBreak: false,
       ellipsis: true
     });

  // 4. Data Siswa
  const studentName = (student.student_name || student.cached_student_name || 'Nama Santri').toUpperCase();
  const nipd = student.nipd || student.nis || String(student.student_id || '-');
  const classGroup = student.class_group_name || student.cached_class_group_name || '-';
  const pin = String(student.child_pin || student.child_pin_plain || '123456');
  const qrText = String(student.qr_code || nipd).trim();

  // 5. Layout Area Konten (Di bawah Header)
  const contentY = y + headerHeight + 3;
  const contentHeight = height - headerHeight - 5;
  const paddingH = Math.max(5, Math.min(9, width * 0.04));

  // Lebar kolom QR code jika ditampilkan
  let qrSize = 0;
  let qrX = x + paddingH;
  let textX = x + paddingH;
  let textWidth = width - (paddingH * 2);

  if (show_qr && width >= 140) {
    qrSize = Math.min(contentHeight - 8, width * 0.28);
    const qrY = contentY + (contentHeight - qrSize) / 2;

    try {
      const matrix = createCompliantQRMatrix(qrText);
      const numModules = matrix.size;
      const moduleSize = qrSize / numModules;

      doc.fillColor('#000000');
      for (let r = 0; r < numModules; r++) {
        for (let c = 0; c < numModules; c++) {
          if (matrix.get(r, c)) {
            doc.rect(
              qrX + c * moduleSize,
              qrY + r * moduleSize,
              moduleSize + 0.05,
              moduleSize + 0.05
            ).fill('#000000');
          }
        }
      }
    } catch (e) {
      doc.rect(qrX, qrY, qrSize, qrSize).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
    }

    textX = qrX + qrSize + 6;
    textWidth = x + width - paddingH - textX;
  }

  // 6. Render Informasi Teks Siswa & PIN
  let currY = contentY + 1;

  // Nama Siswa (Bold, Highlight)
  const nameFontSize = Math.max(7, Math.min(10, height * 0.12));
  doc.font('Helvetica-Bold')
     .fontSize(nameFontSize)
     .fillColor('#0f172a') // slate-900
     .text(studentName, textX, currY, {
       width: textWidth,
       align: 'left',
       ellipsis: true,
       height: nameFontSize + 2
     });
  currY += nameFontSize + 2;

  // NIPD & Kelas Siswa
  const metaFontSize = Math.max(5.5, Math.min(7.5, height * 0.09));
  doc.font('Helvetica-Bold')
     .fontSize(metaFontSize)
     .fillColor('#475569'); // slate-600

  let metaText = `NIPD: ${nipd}`;
  if (show_class && classGroup && classGroup !== '-') {
    metaText += `  •  Kelas: ${classGroup}`;
  }

  doc.text(metaText, textX, currY, {
    width: textWidth,
    align: 'left',
    ellipsis: true
  });
  currY += metaFontSize + 4;

  // 7. Kotak PIN Highlight (Kunci utama slip)
  if (show_pin) {
    const pinBoxHeight = Math.max(15, Math.min(22, height * 0.26));
    const pinBoxWidth = Math.min(textWidth, 160);
    const pinBoxY = currY;

    // Background Kotak PIN Kuning/Hijau Muda Lembut
    doc.roundedRect(textX, pinBoxY, pinBoxWidth, pinBoxHeight, 3)
       .fillColor('#f0fdf4') // emerald-50
       .fill();
    doc.roundedRect(textX, pinBoxY, pinBoxWidth, pinBoxHeight, 3)
       .lineWidth(0.8)
       .strokeColor('#10b981') // emerald-500
       .stroke();

    // Label Kecil "PIN TRANSAKSI"
    const pinLabelSize = Math.max(4.5, Math.min(6, pinBoxHeight * 0.3));
    doc.font('Helvetica-Bold')
       .fontSize(pinLabelSize)
       .fillColor('#047857') // emerald-700
       .text('PIN KASIR KANTIN', textX + 5, pinBoxY + 2.5, {
         width: pinBoxWidth - 10,
         align: 'left'
       });

    // Angka PIN Besar Terformat (e.g. 1 2 3 4 5 6)
    const pinValSize = Math.max(8, Math.min(12, pinBoxHeight * 0.58));
    const spacedPin = pin.split('').join('  ');
    doc.font('Helvetica-Bold')
       .fontSize(pinValSize)
       .fillColor('#064e3b') // emerald-950
       .text(spacedPin, textX + 5, pinBoxY + pinLabelSize + 3, {
         width: pinBoxWidth - 10,
         align: 'left'
       });

    currY = pinBoxY + pinBoxHeight + 3;
  }

  // 8. Footer Catatan Keamanan Singkat
  if (height >= 110 && currY < y + height - 8) {
    doc.font('Helvetica-Oblique')
       .fontSize(4.5)
       .fillColor('#64748b')
       .text('*Gunakan NIPD/QR & PIN ini saat bertransaksi di Kasir Kantin. Jaga kerahasiaan PIN.', textX, currY, {
         width: textWidth,
         align: 'left',
         ellipsis: true
       });
  }

  doc.restore();
}

/**
 * Render single landscape student ID card
 */
function renderSingleCard(doc, student, x, y, width, height, opts = {}) {
  const { show_cutting_lines = true, show_pin = false, show_class = true } = opts;

  doc.save();

  // 1. Background Card & Cutting Border
  const borderRadius = Math.min(6, height * 0.05);
  
  doc.roundedRect(x, y, width, height, borderRadius)
     .fillColor('#ffffff')
     .fill();

  if (show_cutting_lines) {
    doc.roundedRect(x, y, width, height, borderRadius)
       .lineWidth(0.6)
       .strokeColor('#cbd5e1') // slate-300
       .stroke();
  }

  // 2. Akses Data Siswa
  const studentName = (student.student_name || student.cached_student_name || 'Nama Santri').toUpperCase();
  const nipd = student.nipd || student.nis || String(student.student_id || '-');
  const classGroup = student.class_group_name || student.cached_class_group_name || '-';
  const pin = String(student.child_pin || student.child_pin_plain || '123456');
  const qrText = String(student.qr_code || nipd).trim();

  // 3. Layout Komponen (Landscape: QR di Kiri, Identitas di Kanan)
  const padding = Math.max(6, Math.min(12, height * 0.08));
  const innerWidth = width - (padding * 2);
  const innerHeight = height - (padding * 2);

  const qrBoxSize = Math.min(innerHeight - 4, innerWidth * 0.40);
  const qrX = x + padding + 2;
  const qrY = y + (height - qrBoxSize) / 2;

  // Render Vector QR Code
  try {
    const matrix = createCompliantQRMatrix(qrText);
    const numModules = matrix.size;
    const moduleSize = qrBoxSize / numModules;

    doc.fillColor('#000000');
    for (let r = 0; r < numModules; r++) {
      for (let c = 0; c < numModules; c++) {
        if (matrix.get(r, c)) {
          doc.rect(
            qrX + c * moduleSize,
            qrY + r * moduleSize,
            moduleSize + 0.05,
            moduleSize + 0.05
          ).fill('#000000');
        }
      }
    }
  } catch (qrErr) {
    doc.rect(qrX, qrY, qrBoxSize, qrBoxSize).lineWidth(1).strokeColor('#000000').stroke();
    doc.fontSize(7).font('Helvetica').fillColor('#64748b').text('QR CODE', qrX, qrY + qrBoxSize / 2 - 4, {
      width: qrBoxSize,
      align: 'center'
    });
  }

  // Divider vertikal tipis
  const dividerX = qrX + qrBoxSize + (padding * 0.7);
  doc.moveTo(dividerX, y + padding + 4)
     .lineTo(dividerX, y + height - padding - 4)
     .lineWidth(0.5)
     .strokeColor('#e2e8f0')
     .stroke();

  // 4. Bagian Kanan: Identitas Siswa
  const textX = dividerX + (padding * 0.7);
  const textWidth = x + width - padding - textX;

  const baseScale = height / 153.1;
  const nipdLabelSize = Math.max(6, Math.min(8.5, 7.5 * baseScale));
  const nipdValueSize = Math.max(8, Math.min(13, 11 * baseScale));
  const nameLabelSize = Math.max(5.5, Math.min(7.5, 6.5 * baseScale));
  const nameValueSize = Math.max(8.5, Math.min(13.5, 11.5 * baseScale));

  let currY = y + padding + 2;

  // Label & Nomor NIPD
  doc.font('Helvetica-Bold')
     .fontSize(nipdLabelSize)
     .fillColor('#64748b')
     .text('NIPD', textX, currY, { width: textWidth });
  currY += nipdLabelSize + 1;

  doc.font('Helvetica-Bold')
     .fontSize(nipdValueSize)
     .fillColor('#0f172a')
     .text(nipd, textX, currY, { width: textWidth });
  currY += nipdValueSize + 4;

  // Nama Siswa
  doc.font('Helvetica-Bold')
     .fontSize(nameLabelSize)
     .fillColor('#64748b')
     .text('NAMA SISWA', textX, currY, { width: textWidth });
  currY += nameLabelSize + 1;

  doc.font('Helvetica-Bold')
     .fontSize(nameValueSize)
     .fillColor('#0f172a')
     .text(studentName, textX, currY, {
       width: textWidth,
       ellipsis: true
     });
  currY += nameValueSize + 3;

  // Info Kelas atau PIN Tambahan jika diaktifkan
  if (show_class && classGroup && classGroup !== '-') {
    doc.font('Helvetica')
       .fontSize(nipdLabelSize)
       .fillColor('#475569')
       .text(`Kelas: ${classGroup}`, textX, currY, { width: textWidth });
    currY += nipdLabelSize + 2;
  }

  if (show_pin) {
    doc.font('Helvetica-Bold')
       .fontSize(nipdLabelSize)
       .fillColor('#059669')
       .text(`PIN Kasir: ${pin}`, textX, currY, { width: textWidth });
  }

  doc.restore();
}

module.exports = {
  PAPER_SIZES,
  CARD_SIZES,
  generateCardsPdf
};
