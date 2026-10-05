/**
 * Unit Consolidation Helper
 * Mengelola definisi, konfigurasi, dan status satuan pendidikan yang tergabung dalam pengelolaan terpusat/gabungan Yayasan.
 */

const STORAGE_KEY = 'aldepos_unit_consolidation_config';

export const DEFAULT_CONSOLIDATION_CONFIG = {
  name: 'Pusat Yayasan (Gabungan)',
  code: 'YAYASAN_CONSOLIDATED',
  description: 'Pengelolaan dan konsolidasi keuangan terpadu untuk seluruh satuan pendidikan aktif di bawah naungan Yayasan Aldepos.',
  allUnitsIncluded: true,
  includedUnitIds: [1, 2], // Default: SMP (1) & SMA (2)
  scope: {
    accounting: true, // Pembukuan & Laporan Konsolidasi
    billing: true, // Rekap Tagihan & Pembayaran Santri
    fund_balances: true, // Monitoring Pos Dana & Rekening Kas/Bank
    budget: true, // RAPBS & Perencanaan Keuangan
    reports: true // Laporan Eksekutif & Manajemen
  },
  lastUpdated: new Date().toISOString(),
  updatedBy: 'Admin Yayasan'
};

/**
 * Membaca konfigurasi definisi gabungan dari LocalStorage
 */
export function getConsolidationConfig(availableUnits = []) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Jika belum ada di storage, buat default berdasarkan availableUnits jika ada
      const defaultIds = availableUnits.length > 0 ? availableUnits.map(u => u.id) : [1, 2];
      const initial = {
        ...DEFAULT_CONSOLIDATION_CONFIG,
        includedUnitIds: defaultIds
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONSOLIDATION_CONFIG,
      ...parsed,
      scope: {
        ...DEFAULT_CONSOLIDATION_CONFIG.scope,
        ...(parsed.scope || {})
      }
    };
  } catch (err) {
    console.warn('Gagal membaca konfigurasi unit consolidation:', err);
    return DEFAULT_CONSOLIDATION_CONFIG;
  }
}

/**
 * Menyimpan konfigurasi definisi gabungan ke LocalStorage dan broadcast event
 */
export function saveConsolidationConfig(newConfig) {
  try {
    const payload = {
      ...newConfig,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('keuangan:consolidation-updated', { detail: payload }));
    return payload;
  } catch (err) {
    console.error('Gagal menyimpan konfigurasi unit consolidation:', err);
    throw err;
  }
}

/**
 * Mengambil daftar objek satuan pendidikan yang terdaftar di dalam grup gabungan
 */
export function getIncludedUnits(availableUnits = [], config = null) {
  const currentConfig = config || getConsolidationConfig(availableUnits);
  if (!availableUnits || availableUnits.length === 0) return [];

  if (currentConfig.allUnitsIncluded) {
    return availableUnits;
  }

  const includedSet = new Set((currentConfig.includedUnitIds || []).map(id => String(id)));
  return availableUnits.filter(u => includedSet.has(String(u.id)));
}

/**
 * Menghasilkan label ringkas unit gabungan untuk badge & dropdown
 * Contoh: "2 Satuan: SMP & SMA"
 */
export function getConsolidatedBadgeLabel(availableUnits = [], config = null) {
  const included = getIncludedUnits(availableUnits, config);
  if (included.length === 0) return 'Tidak ada unit terpilih';
  if (included.length === availableUnits.length && availableUnits.length > 0) {
    return `Seluruh Satuan (${included.length} Unit)`;
  }
  const levels = included.map(u => u.level || u.name).filter(Boolean);
  return `${included.length} Unit: ${levels.join(' & ')}`;
}
