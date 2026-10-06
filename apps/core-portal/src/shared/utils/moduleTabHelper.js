/**
 * Module Tab & Favicon Helper for Core Aldepos
 * Menangani dynamic browser tab title (<Nama Modul> - Aldepos) dan icon SVG khusus tiap modul
 */

function createSvgFavicon(bgGradient, pathSvg) {
  const [c1, c2] = bgGradient;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#g)"/>
  <g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(4, 4)">
    ${pathSvg}
  </g>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Koleksi Icon SVG Presisi 24x24 (didalam frame 32x32 dengan translate(4,4))
const SVG_ICONS = {
  // 1. Akademik (Graduation Cap)
  akademik: createSvgFavicon(['#047857', '#10b981'], `
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  `),

  // 2. Keuangan (Wallet & Coins)
  keuangan: createSvgFavicon(['#0f766e', '#d97706'], `
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
  `),

  // 3. Kepegawaian (Users / ID Card)
  kepegawaian: createSvgFavicon(['#1e3a8a', '#3b82f6'], `
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  `),

  // 4. Al-Quran (Mushaf & Bintang)
  alquran: createSvgFavicon(['#064e3b', '#059669'], `
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    <circle cx="12" cy="5" r="1" fill="#ffffff"/>
  `),

  // 5. Kantin (Utensils & Cup)
  kantin: createSvgFavicon(['#c2410c', '#f97316'], `
    <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/>
    <path d="M15 2v18"/>
    <path d="M6 2v4a3 3 0 0 0 3 3 3 3 0 0 0 3-3V2"/>
    <path d="M9 2v18"/>
  `),

  // 6. Sarpras (Building & Box)
  sarpras: createSvgFavicon(['#78350f', '#d97706'], `
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>
  `),

  // 7. Dapur (Chef Hat)
  dapur: createSvgFavicon(['#881337', '#e11d48'], `
    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 10.5-.3A4 4 0 0 1 18 13.87V21H6Z"/>
    <line x1="6" y1="17" x2="18" y2="17"/>
  `),

  // 8. Perpustakaan (Library Books)
  perpustakaan: createSvgFavicon(['#3730a3', '#6366f1'], `
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
    <path d="M6 6h10M6 10h10M6 14h6"/>
  `),

  // 9. Manajemen (LineChart / Shield)
  manajemen: createSvgFavicon(['#334155', '#7c3aed'], `
    <path d="M3 3v18h18"/>
    <path d="m19 9-5 5-4-4-3 3"/>
  `),

  // 10. Core Service / Admin
  core: createSvgFavicon(['#0f172a', '#334155'], `
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  `),

  // 11. Website Utama (CMS)
  'website-utama': createSvgFavicon(['#0f766e', '#06b6d4'], `
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  `),

  // 12. PPDB
  ppdb: createSvgFavicon(['#047857', '#0d9488'], `
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/>
    <line x1="23" y1="11" x2="17" y2="11"/>
  `),

  // 13. Guru
  guru: createSvgFavicon(['#5b21b6', '#8b5cf6'], `
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  `),

  // 14. Parent / Orang Tua
  parent: createSvgFavicon(['#0369a1', '#0ea5e9'], `
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  `),

  // 15. Student / Siswa
  student: createSvgFavicon(['#0891b2', '#06b6d4'], `
    <circle cx="12" cy="7" r="4"/>
    <path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/>
  `),

  // 16. Default Aldepos Launcher / Home / Login
  aldepos: createSvgFavicon(['#064e3b', '#10b981'], `
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#f59e0b" stroke="#f59e0b"/>
  `)
};

const MODULE_DEFINITIONS = [
  { prefix: '/akademik', name: 'Akademik', iconKey: 'akademik' },
  { prefix: '/keuangan', name: 'Keuangan', iconKey: 'keuangan' },
  { prefix: '/kepegawaian', name: 'Kepegawaian', iconKey: 'kepegawaian' },
  { prefix: '/alquran', name: 'Al-Qur\'an', iconKey: 'alquran' },
  { prefix: '/kantin', name: 'Kantin', iconKey: 'kantin' },
  { prefix: '/sarpras', name: 'Sarpras', iconKey: 'sarpras' },
  { prefix: '/dapur', name: 'Dapur', iconKey: 'dapur' },
  { prefix: '/perpustakaan', name: 'Perpustakaan', iconKey: 'perpustakaan' },
  { prefix: '/manajemen', name: 'Manajemen', iconKey: 'manajemen' },
  { prefix: '/core', name: 'Core Admin', iconKey: 'core' },
  { prefix: '/website-utama', name: 'Website Utama', iconKey: 'website-utama' },
  { prefix: '/ppdb', name: 'PPDB', iconKey: 'ppdb' },
  { prefix: '/guru', name: 'Portal Guru', iconKey: 'guru' },
  { prefix: '/parent', name: 'Portal Orang Tua', iconKey: 'parent' },
  { prefix: '/student', name: 'Portal Siswa', iconKey: 'student' },
  { prefix: '/login', name: 'Login', iconKey: 'aldepos' }
];

export function resolveModuleInfo(pathname) {
  const cleanPath = pathname || window.location.pathname || '/';

  if (cleanPath === '/' || cleanPath === '/launcher') {
    return {
      name: 'Launcher',
      title: 'Launcher - Aldepos',
      iconUrl: SVG_ICONS.aldepos
    };
  }

  for (const mod of MODULE_DEFINITIONS) {
    if (cleanPath.startsWith(mod.prefix)) {
      return {
        name: mod.name,
        title: `${mod.name} - Aldepos`,
        iconUrl: SVG_ICONS[mod.iconKey] || SVG_ICONS.aldepos
      };
    }
  }

  return {
    name: 'Sistem Terpadu',
    title: 'Aldepos',
    iconUrl: SVG_ICONS.aldepos
  };
}

export function updateBrowserTab(pathname) {
  const info = resolveModuleInfo(pathname);

  // 1. Update Document Title
  document.title = info.title;

  // 2. Update Favicon Link
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = info.iconUrl;
}
