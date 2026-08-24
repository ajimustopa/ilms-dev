/**
 * Helper Username Generator & Sanitizer
 * Menghasilkan username unik sesingkat mungkin berdasarkan nama lengkap
 */
function cleanName(fullName) {
  if (!fullName) return ['user'];
  // Hapus gelar akademik umum (S.Pd, M.Pd, S.Si, M.E., S.Pd.I, S.Sos, S.Hum, dsb)
  let name = fullName
    .replace(/(,\s*)?(S\.Pd(\.I)?|M\.Pd|S\.Si|M\.E\.|S\.Sos|S\.Hum|S\.Kom|M\.Kom|S\.Ag|Lc|M\.Ag|Drs|Dr)\.?/gi, '')
    .replace(/[^\w\s]/gi, ' ') // hapus karakter aneh
    .trim()
    .toLowerCase();

  // Pisahkan kata nama
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 0 ? words : ['user'];
}

/**
 * Generate candidate username unik sesingkat mungkin
 * @param {string} fullName 
 * @param {Set<string>} existingUsernames 
 */
function generateShortUsername(fullName, existingUsernames = new Set()) {
  const words = cleanName(fullName);
  const first = words[0];
  const second = words[1] || '';
  const last = words[words.length - 1] || '';

  const candidates = [];

  // Strategi 1: Nama depan saja jika unik (mis. "aji", "putri", "mamuri")
  if (first.length >= 3) {
    candidates.push(first);
  }

  // Strategi 2: Nama depan + inisial nama belakang (mis. "ajim", "putrip", "desiy")
  if (second && second[0]) {
    candidates.push(`${first}${second[0]}`);
  }
  if (last && last !== second && last[0]) {
    candidates.push(`${first}${last[0]}`);
  }

  // Strategi 3: Inisial nama depan + nama belakang (mis. "amustopa", "ppertiwi")
  if (last && last !== first) {
    candidates.push(`${first[0]}${last}`);
  }

  // Strategi 4: Nama depan + nama kedua (mis. "ajimustopa", "putrimahardhika")
  if (second) {
    candidates.push(`${first}${second}`);
  }

  // Cari kandidat pertama yang belum dipakai
  for (const cand of candidates) {
    const cleanCand = cand.replace(/[^a-z0-9]/g, '');
    if (cleanCand.length >= 3 && !existingUsernames.has(cleanCand)) {
      existingUsernames.add(cleanCand);
      return cleanCand;
    }
  }

  // Strategi 5: Fallback dengan angka penambah (mis. "aji1", "aji2")
  let counter = 1;
  const base = first.replace(/[^a-z0-9]/g, '') || 'user';
  while (true) {
    const candWithNum = `${base}${counter}`;
    if (!existingUsernames.has(candWithNum)) {
      existingUsernames.add(candWithNum);
      return candWithNum;
    }
    counter++;
  }
}

module.exports = {
  cleanName,
  generateShortUsername
};
