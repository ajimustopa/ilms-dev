/**
 * Barcode Helper & Canvas Label Generator
 * Menghasilkan barcode Code 128 presisi & label siap cetak/unduh JPG.
 */

// Code 128 Pattern Table (Subset B)
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 = Stop)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Encode string ke bar pattern Code 128
 */
export function encodeCode128(text) {
  if (!text) return '';
  const cleanText = String(text).trim();
  if (!cleanText) return '';

  const codes = [START_CODE_B];
  let checkSum = START_CODE_B;

  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    const codeVal = charCode - 32; // Code 128B mapping (ASCII 32 to 127)
    const validVal = codeVal >= 0 && codeVal <= 95 ? codeVal : 0;
    codes.push(validVal);
    checkSum += validVal * (i + 1);
  }

  const checkDigit = checkSum % 103;
  codes.push(checkDigit);
  codes.push(STOP_CODE);

  let patternStr = '';
  for (const c of codes) {
    patternStr += CODE128_PATTERNS[c] || '';
  }

  // Convert pattern digits (e.g. '212222') into binary sequence '11011001100'
  let binary = '';
  for (let i = 0; i < patternStr.length; i++) {
    const count = parseInt(patternStr[i], 10);
    const bit = i % 2 === 0 ? '1' : '0';
    binary += bit.repeat(count);
  }

  return binary;
}

/**
 * Render Barcode ke Canvas Element
 */
export function drawBarcodeToCanvas(canvas, text, options = {}) {
  if (!canvas || !text) return;
  const binary = encodeCode128(text);
  if (!binary) return;

  const barWidth = options.barWidth || 2;
  const barHeight = options.barHeight || 55;
  const padding = options.padding || 10;
  const showText = options.showText !== false;
  const fontSize = options.fontSize || 12;

  const totalWidth = binary.length * barWidth + padding * 2;
  const totalHeight = barHeight + padding * 2 + (showText ? fontSize + 8 : 0);

  canvas.width = totalWidth;
  canvas.height = totalHeight;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Gambar Bar Hitam
  ctx.fillStyle = '#0f172a';
  let x = padding;
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      ctx.fillRect(x, padding, barWidth, barHeight);
    }
    x += barWidth;
  }

  // Gambar Angka / Teks Barcode
  if (showText) {
    ctx.fillStyle = '#334155';
    ctx.font = `bold ${fontSize}px "SF Pro", "Segoe UI", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, totalWidth / 2, totalHeight - 4);
  }
}

/**
 * Buat Label Lengkap dan Unduh sebagai File JPG
 */
export function downloadBarcodeLabelJpg({
  productName,
  barcode,
  salePrice,
  category,
  vendor
}) {
  const canvas = document.createElement('canvas');
  const width = 480;
  const height = 300;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background Putih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border Label
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Header Kantin Aldepos
  ctx.fillStyle = '#059669';
  ctx.fillRect(10, 10, width - 20, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KANTIN YAYASAN ALDEPOS', width / 2, 33);

  // Nama Produk
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const displayTitle = productName.length > 32 ? productName.slice(0, 30) + '...' : productName;
  ctx.fillText(displayTitle, width / 2, 72);

  // Harga Jual
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 20px "Segoe UI", monospace';
  ctx.textAlign = 'center';
  const formattedPrice = salePrice ? `Rp ${Number(salePrice).toLocaleString('id-ID')}` : 'Rp 0';
  ctx.fillText(formattedPrice, width / 2, 100);

  // Gambar Barcode di tengah
  const binary = encodeCode128(barcode);
  if (binary) {
    const barWidth = 2;
    const barHeight = 70;
    const barcodeVisualWidth = binary.length * barWidth;
    let startX = (width - barcodeVisualWidth) / 2;
    const startY = 120;

    ctx.fillStyle = '#000000';
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        ctx.fillRect(startX, startY, barWidth, barHeight);
      }
      startX += barWidth;
    }

    // Angka Barcode
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(barcode, width / 2, startY + barHeight + 20);
  }

  // Footer Informasi Kategori / Vendor
  ctx.fillStyle = '#64748b';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const metaText = [category, vendor].filter(Boolean).join(' • ');
  if (metaText) {
    ctx.fillText(metaText, width / 2, height - 22);
  }

  // Convert to JPG Data URL and trigger download
  const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
  const link = document.createElement('a');
  link.href = jpgUrl;
  const cleanName = (productName || 'barcode').toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.download = `barcode_${cleanName}_${barcode || 'code'}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Kompres / Minimizer Gambar Produk Otomatis Menggunakan HTML5 Canvas
 * @param {File} file - File gambar mentah dari input
 * @param {Object} options - { maxWidth: 600, maxHeight: 600, quality: 0.8 }
 * @returns {Promise<{ base64: string, originalSize: number, compressedSize: number, reductionPct: string }>}
 */
export function compressProductImage(file, options = {}) {
  const maxWidth = options.maxWidth || 600;
  const maxHeight = options.maxHeight || 600;
  const quality = options.quality || 0.8;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('File harus berupa gambar (JPG, PNG, WEBP)'));
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw background white for transparent PNG converted to JPEG/WEBP
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        const approxCompressedSize = Math.round((compressedBase64.length * 3) / 4);
        const reductionPct = originalSize > approxCompressedSize
          ? (((originalSize - approxCompressedSize) / originalSize) * 100).toFixed(1)
          : '0';

        resolve({
          base64: compressedBase64,
          originalSize,
          compressedSize: approxCompressedSize,
          reductionPct
        });
      };

      img.onerror = () => reject(new Error('Gagal memproses gambar produk'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}
