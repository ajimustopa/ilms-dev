/**
 * Helper Terbilang Bahasa Indonesia
 * Digunakan untuk mencetak kwitansi pembayaran (Fitur #19)
 */

const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

function terbilang(n) {
  let num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return 'nol rupiah';

  function convert(x) {
    if (x < 12) {
      return satuan[x];
    } else if (x < 20) {
      return convert(x - 10) + ' belas';
    } else if (x < 100) {
      return convert(Math.floor(x / 10)) + ' puluh ' + convert(x % 10);
    } else if (x < 200) {
      return 'seratus ' + convert(x - 100);
    } else if (x < 1000) {
      return convert(Math.floor(x / 100)) + ' ratus ' + convert(x % 100);
    } else if (x < 2000) {
      return 'seribu ' + convert(x - 1000);
    } else if (x < 1000000) {
      return convert(Math.floor(x / 1000)) + ' ribu ' + convert(x % 1000);
    } else if (x < 1000000000) {
      return convert(Math.floor(x / 1000000)) + ' juta ' + convert(x % 1000000);
    } else if (x < 1000000000000) {
      return convert(Math.floor(x / 1000000000)) + ' milyar ' + convert(x % 1000000000);
    } else {
      return convert(Math.floor(x / 1000000000000)) + ' triliun ' + convert(x % 1000000000000);
    }
  }

  const result = convert(num).replace(/\s+/g, ' ').trim();
  return (result + ' rupiah').toLowerCase();
}

module.exports = {
  terbilang
};
