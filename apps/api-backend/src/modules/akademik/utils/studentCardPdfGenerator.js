/**
 * Student ID Card PDF Generator for Modul Akademik using PDFKit
 * Fitur:
 * - Standar ID Card KTP / CR80 (85.6 x 54 mm), B2, B3, Compact, A6 Landscape, atau Ukuran Kustom
 * - Dukungan multi-paper (A4, F4/Folio, Letter, A3, Custom) & Margin/Gap dinamis
 * - Garis potong putus-putus (✂ Dashed Cutting Lines)
 * - Pilihan Tema Warna Desain: Emerald, Navy, Indigo, Maroon, Slate, Teal
 * - Integrasi QR Code NIPD (ISO Compliant pure JS engine)
 * - Informasi Fleksibel: NIS, NIPD, NISN, Rombel/Kelas, TTL, Alamat, dll.
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
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
  cr80: { name: 'Standar ID Card / KTP (85.6 x 54.0 mm)', width_mm: 85.6, height_mm: 54.0 },
  b2: { name: 'Ukuran B2 (106.0 x 82.0 mm)', width_mm: 106.0, height_mm: 82.0 },
  b3: { name: 'Ukuran B3 (124.0 x 95.0 mm)', width_mm: 124.0, height_mm: 95.0 },
  compact: { name: 'Ukuran Compact (70.0 x 45.0 mm)', width_mm: 70.0, height_mm: 45.0 },
  a6_landscape: { name: 'Ukuran A6 Landscape (148.0 x 105.0 mm)', width_mm: 148.0, height_mm: 105.0 },
  custom: { name: 'Ukuran Kustom (mm)', width_mm: 85.6, height_mm: 54.0 }
};

const THEME_PALETTES = {
  emerald: {
    primary: '#064e3b',       // emerald-900
    accent: '#059669',        // emerald-600
    subtext: '#a7f3d0',       // emerald-200
    lightBg: '#ecfdf5',       // emerald-50
    badgeText: '#065f46',
    border: '#059669',
    gold: '#d97706'
  },
  navy: {
    primary: '#0f172a',       // slate-900
    accent: '#1e40af',        // blue-800
    subtext: '#93c5fd',       // blue-300
    lightBg: '#eff6ff',       // blue-50
    badgeText: '#1e3a8a',
    border: '#2563eb',
    gold: '#eab308'
  },
  indigo: {
    primary: '#312e81',       // indigo-900
    accent: '#4f46e5',        // indigo-600
    subtext: '#c7d2fe',       // indigo-200
    lightBg: '#eef2ff',       // indigo-50
    badgeText: '#3730a3',
    border: '#6366f1',
    gold: '#f59e0b'
  },
  maroon: {
    primary: '#881337',       // rose-900
    accent: '#be123c',        // rose-700
    subtext: '#fecdd3',       // rose-200
    lightBg: '#fff1f2',       // rose-50
    badgeText: '#9f1239',
    border: '#e11d48',
    gold: '#d97706'
  },
  slate: {
    primary: '#0f172a',       // slate-900
    accent: '#334155',        // slate-700
    subtext: '#cbd5e1',       // slate-300
    lightBg: '#f8fafc',       // slate-50
    badgeText: '#1e293b',
    border: '#475569',
    gold: '#ca8a04'
  },
  teal: {
    primary: '#134e4a',       // teal-900
    accent: '#0f766e',        // teal-700
    subtext: '#99f6e4',       // teal-200
    lightBg: '#f0fdfa',       // teal-50
    badgeText: '#115e59',
    border: '#0d9488',
    gold: '#d97706'
  }
};

/**
 * Generate PDF buffer containing printable student ID cards
 * @param {Array<Object>} students
 * @param {Object} options
 * @returns {Promise<Buffer>}
 */
function generateStudentCardsPdf(students = [], options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const {
        paper_size = 'a4',
        paper_orientation = 'portrait', // 'portrait' | 'landscape'
        custom_paper_width_mm = 210,
        custom_paper_height_mm = 297,
        card_size = 'cr80',
        custom_card_width_mm = 85.6,
        custom_card_height_mm = 54.0,
        margin_mm = 8,
        gap_mm = 3,
        show_cutting_lines = true,
        theme = 'emerald',
        school_name = 'YAYASAN ALDEPOS SALAM',
        unit_name = 'SMP ISLAM TERPADU ALDEPOS',
        card_title = 'KARTU TANDA SISWA',
        show_nis = true,
        show_nipd = true,
        show_nisn = true,
        show_class = true,
        show_birth_info = true,
        show_gender = false,
        show_address = false,
        show_qr = true,
        show_academic_year = true,
        academic_year_name = '2026/2027'
      } = options;

      // 1. Resolve Paper Dimensions
      const paperDef = PAPER_SIZES[paper_size] || PAPER_SIZES.a4;
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

      // 2. Resolve Card Dimensions (Landscape)
      const cardDef = CARD_SIZES[card_size] || CARD_SIZES.cr80;
      const rawCardWidthMm = card_size === 'custom' ? parseFloat(custom_card_width_mm) || 85.6 : cardDef.width_mm;
      const rawCardHeightMm = card_size === 'custom' ? parseFloat(custom_card_height_mm) || 54.0 : cardDef.height_mm;

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

      const startX = marginPt + Math.max(0, (availableWidth - totalGridWidth) / 2);
      const startY = marginPt + Math.max(0, (availableHeight - totalGridHeight) / 2);

      const palette = THEME_PALETTES[theme] || THEME_PALETTES.emerald;

      // 4. Inisialisasi PDFKit
      const doc = new PDFDocument({
        autoFirstPage: true,
        size: [paperWidthPt, paperHeightPt],
        margin: 0,
        bufferPages: true,
        info: {
          Title: `Kartu Tanda Siswa - ${unit_name}`,
          Author: 'Core Aldepos System',
          Subject: 'Kartu Pelajar Siswa Resmi Terintegrasi QR Code',
          Keywords: 'Kartu Siswa, ID Card, Akademik, Aldepos'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // 5. Render Tiap Kartu Siswa
      students.forEach((student, index) => {
        if (index > 0 && index % cardsPerPage === 0) {
          doc.addPage({ size: [paperWidthPt, paperHeightPt], margin: 0 });
        }

        const pageIndex = index % cardsPerPage;
        const col = pageIndex % cols;
        const row = Math.floor(pageIndex / cols);

        const cardX = startX + col * (cardWidthPt + gapPt);
        const cardY = startY + row * (cardHeightPt + gapPt);

        renderStudentCard(doc, student, cardX, cardY, cardWidthPt, cardHeightPt, {
          show_cutting_lines,
          palette,
          school_name,
          unit_name,
          card_title,
          show_nis,
          show_nipd,
          show_nisn,
          show_class,
          show_birth_info,
          show_gender,
          show_address,
          show_qr,
          show_academic_year,
          academic_year_name
        });
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Render satu kartu siswa presisi landscape
 */
function renderStudentCard(doc, student, x, y, width, height, opts = {}) {
  const {
    show_cutting_lines = true,
    palette = THEME_PALETTES.emerald,
    school_name = 'YAYASAN ALDEPOS SALAM',
    unit_name = 'SMP ISLAM TERPADU ALDEPOS',
    card_title = 'KARTU TANDA SISWA',
    show_nis = true,
    show_nipd = true,
    show_nisn = true,
    show_class = true,
    show_birth_info = true,
    show_gender = false,
    show_address = false,
    show_qr = true,
    show_academic_year = true,
    academic_year_name = '2026/2027'
  } = opts;

  doc.save();

  // 1. Background Kartu & Border
  const borderRadius = Math.min(6, height * 0.05);

  doc.roundedRect(x, y, width, height, borderRadius)
     .fillColor('#ffffff')
     .fill();

  if (show_cutting_lines) {
    doc.save();
    doc.roundedRect(x, y, width, height, borderRadius)
       .lineWidth(0.6)
       .dash(3, { space: 2 })
       .strokeColor('#94a3b8') // slate-400
       .stroke();
    doc.restore();
  }

  // 2. Header Strip Kartu (Elegan dengan Background Warna Primer)
  const headerHeight = Math.max(22, Math.min(36, height * 0.24));

  doc.save();
  // Clip header to rounded rect top
  doc.roundedRect(x + 0.5, y + 0.5, width - 1, headerHeight, borderRadius)
     .fillColor(palette.primary)
     .fill();
  doc.rect(x + 0.5, y + headerHeight - 4, width - 1, 4)
     .fillColor(palette.primary)
     .fill();

  // Garis Aksen Emas tipis di bawah header
  doc.rect(x + 0.5, y + headerHeight, width - 1, 1.5)
     .fillColor(palette.gold)
     .fill();
  doc.restore();

  // Teks Header
  const headerPadding = 5;
  const logoBoxSize = headerHeight - 8;
  const logoX = x + headerPadding + 2;
  const logoY = y + 4;

  // Mini Emblem / Logo Box
  doc.roundedRect(logoX, logoY, logoBoxSize, logoBoxSize, 2)
     .fillColor('#ffffff')
     .fill();
  doc.font('Helvetica-Bold')
     .fontSize(Math.max(6, logoBoxSize * 0.45))
     .fillColor(palette.primary)
     .text('A', logoX, logoY + (logoBoxSize * 0.22), {
       width: logoBoxSize,
       align: 'center'
     });

  const headerTextX = logoX + logoBoxSize + 5;
  const headerTextWidth = width - (headerTextX - x) - headerPadding - 4;

  const schoolTitleSize = Math.max(5.5, Math.min(7.5, headerHeight * 0.26));
  const unitTitleSize = Math.max(5, Math.min(6.5, headerHeight * 0.22));
  const cardTitleSize = Math.max(4.5, Math.min(5.5, headerHeight * 0.18));

  doc.font('Helvetica-Bold')
     .fontSize(schoolTitleSize)
     .fillColor('#ffffff')
     .text(school_name, headerTextX, y + 3.5, {
       width: headerTextWidth,
       align: 'left',
       ellipsis: true
     });

  doc.font('Helvetica-Bold')
     .fontSize(unitTitleSize)
     .fillColor(palette.subtext)
     .text(unit_name, headerTextX, y + 3.5 + schoolTitleSize + 1, {
       width: headerTextWidth,
       align: 'left',
       ellipsis: true
     });

  doc.font('Helvetica')
     .fontSize(cardTitleSize)
     .fillColor('#ffffff')
     .text(card_title, headerTextX, y + 3.5 + schoolTitleSize + unitTitleSize + 1.5, {
       width: headerTextWidth,
       align: 'left',
       ellipsis: true
     });

  // 3. Ekstraksi Data Siswa
  const studentName = String(student.full_name || student.student_name || 'NAMA SISWA').toUpperCase();
  const nis = student.nis || '-';
  const nipd = student.nipd || nis;
  const nisn = student.nisn || '-';
  const genderStr = String(student.gender || 'L').toUpperCase().startsWith('P') ? 'Akhwat / Perempuan' : 'Ikhwan / Laki-laki';
  const classGroup = student.class_group_name || student.rombel || '-';
  const birthPlace = student.birth_place || '';
  const birthDate = student.birth_date ? String(student.birth_date).slice(0, 10) : '';
  const ttl = birthPlace || birthDate ? `${birthPlace}${birthPlace && birthDate ? ', ' : ''}${birthDate}` : '-';
  const address = student.address || '-';
  const qrIdentifier = String(nipd !== '-' ? nipd : (nis !== '-' ? nis : student.id)).trim();

  // 4. Content Area Layout
  const contentY = y + headerHeight + 3.5;
  const contentHeight = height - headerHeight - 7;
  const pad = 6;

  // Layout:
  // Kiri: Avatar / Photo Box
  // Tengah: Identitas Siswa
  // Kanan: QR Code NIPD + Teks Scan
  const photoWidth = Math.max(28, Math.min(38, width * 0.18));
  const photoHeight = Math.min(contentHeight - 4, photoWidth * 1.25);
  const photoX = x + pad;
  const photoY = contentY + (contentHeight - photoHeight) / 2;

  // Render Frame Foto Siswa
  doc.roundedRect(photoX, photoY, photoWidth, photoHeight, 3)
     .fillColor(palette.lightBg)
     .fill();

  let photoRendered = false;
  if (student.photo_url) {
    try {
      let imageBufferOrPath = null;
      if (typeof student.photo_url === 'string') {
        if (student.photo_url.startsWith('data:image/')) {
          const parts = student.photo_url.split(',');
          if (parts.length === 2) {
            imageBufferOrPath = Buffer.from(parts[1], 'base64');
          }
        } else if (student.photo_url.startsWith('/uploads/')) {
          const localPath = path.join(__dirname, '../../../../public', student.photo_url);
          if (fs.existsSync(localPath)) {
            imageBufferOrPath = localPath;
          }
        } else if (fs.existsSync(student.photo_url)) {
          imageBufferOrPath = student.photo_url;
        }
      }

      if (imageBufferOrPath) {
        doc.save();
        doc.roundedRect(photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1, 2.5).clip();
        doc.image(imageBufferOrPath, photoX + 0.5, photoY + 0.5, {
          fit: [photoWidth - 1, photoHeight - 1],
          align: 'center',
          valign: 'center'
        });
        doc.restore();
        photoRendered = true;
      }
    } catch (e) {
      photoRendered = false;
    }
  }

  // Border Frame
  doc.roundedRect(photoX, photoY, photoWidth, photoHeight, 3)
     .lineWidth(0.8)
     .strokeColor(palette.accent)
     .stroke();

  if (!photoRendered) {
    // Avatar Placeholder Graphic (Icon Orang Elegan)
    const isFemale = String(student.gender || 'L').toUpperCase().startsWith('P');
    doc.fontSize(Math.max(6, photoWidth * 0.22))
       .font('Helvetica-Bold')
       .fillColor(palette.accent)
       .text(isFemale ? 'AKHWAT' : 'IKHWAN', photoX, photoY + photoHeight / 2 - 4, {
         width: photoWidth,
         align: 'center'
       });
  }

  // Bagian Kanan: QR Code Box jika diaktifkan
  let qrSize = 0;
  let qrX = 0;
  let qrY = 0;

  if (show_qr && qrIdentifier) {
    qrSize = Math.max(30, Math.min(48, contentHeight - 8));
    qrX = x + width - pad - qrSize;
    qrY = contentY + (contentHeight - qrSize - 6) / 2;

    try {
      const matrix = createCompliantQRMatrix(qrIdentifier);
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
      doc.rect(qrX, qrY, qrSize, qrSize).lineWidth(0.5).strokeColor('#000000').stroke();
    }

    // Label di bawah QR Code
    doc.font('Helvetica-Bold')
       .fontSize(4)
       .fillColor(palette.primary)
       .text(`NIPD: ${nipd}`, qrX - 4, qrY + qrSize + 1.5, {
         width: qrSize + 8,
         align: 'center',
         ellipsis: true
       });
  }

  // Bagian Tengah: Detail Informasi Siswa
  const infoX = photoX + photoWidth + 6;
  const infoMaxX = show_qr && qrSize > 0 ? (qrX - 5) : (x + width - pad);
  const infoWidth = infoMaxX - infoX;

  let curY = contentY + 2;

  // Nama Siswa (Tebal & Dominan)
  const nameSize = Math.max(7, Math.min(9.5, height * 0.065));
  doc.font('Helvetica-Bold')
     .fontSize(nameSize)
     .fillColor(palette.primary)
     .text(studentName, infoX, curY, {
       width: infoWidth,
       ellipsis: true
     });
  curY += nameSize + 2.5;

  // Divider tipis di bawah nama
  doc.moveTo(infoX, curY)
     .lineTo(infoX + infoWidth, curY)
     .lineWidth(0.5)
     .strokeColor(palette.gold)
     .stroke();
  curY += 3;

  // Baris-baris Data Siswa
  const labelFontSize = Math.max(4.5, Math.min(6, height * 0.042));
  const lineSpacing = labelFontSize + 2;

  function renderInfoRow(label, value) {
    if (!value || value === '-') return;
    if (curY + lineSpacing > y + height - 5) return;

    const labelColWidth = 36;
    doc.font('Helvetica-Bold')
       .fontSize(labelFontSize)
       .fillColor('#64748b')
       .text(label, infoX, curY, { width: labelColWidth });

    doc.font('Helvetica-Bold')
       .fontSize(labelFontSize)
       .fillColor('#334155')
       .text(':', infoX + labelColWidth, curY, { width: 4 });

    doc.font('Helvetica')
       .fontSize(labelFontSize)
       .fillColor('#0f172a')
       .text(value, infoX + labelColWidth + 5, curY, {
         width: infoWidth - labelColWidth - 5,
         ellipsis: true
       });

    curY += lineSpacing;
  }

  if (show_nis && nis !== '-') renderInfoRow('NIS', nis);
  if (show_nisn && nisn !== '-') renderInfoRow('NISN', nisn);
  if (show_class && classGroup !== '-') renderInfoRow('Kelas/Rombel', classGroup);
  if (show_birth_info && ttl !== '-') renderInfoRow('TTL', ttl);
  if (show_gender) renderInfoRow('Gender', genderStr);
  if (show_academic_year && academic_year_name) renderInfoRow('Tahun Ajaran', `TA ${academic_year_name}`);
  if (show_address && address !== '-') renderInfoRow('Alamat', address);

  // 5. Footer Strip Mini Kartu
  const footerHeight = 4.5;
  doc.rect(x + 0.5, y + height - footerHeight - 0.5, width - 1, footerHeight)
     .fillColor(palette.primary)
     .fill();

  doc.font('Helvetica')
     .fontSize(3.5)
     .fillColor(palette.subtext)
     .text('KARTU TANDA SISWA RESMI • YAYASAN ALDEPOS', x, y + height - footerHeight + 0.5, {
       width: width,
       align: 'center'
     });

  doc.restore();
}

module.exports = {
  PAPER_SIZES,
  CARD_SIZES,
  THEME_PALETTES,
  generateStudentCardsPdf
};
