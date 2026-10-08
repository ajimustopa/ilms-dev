import React from 'react';

/**
 * BrandLogo — Komponen Logo Resmi Aldepos ILMS
 * 
 * Mendukung varian:
 * - 'full': Mark Simbol + Wordmark "Aldepos ILMS"
 * - 'symbol' / 'monogram': Hanya Mark Simbol Monogram Geometris 'A'
 * 
 * Mendukung tema:
 * - 'light': Default untuk latar putih/terang (Teks: Slate 900 / Emerald)
 * - 'dark': Untuk mode gelap (Teks: Putih / Emerald 400)
 * - 'white': Khusus latar belakang hijau gelap institusi (Teks: Putih / Emerald 200)
 */
export default function BrandLogo({
  variant = 'full',
  size = 'md',
  theme = 'light',
  className = '',
  showSubtitle = false,
  subtitleText = 'Sistem Informasi Sekolah',
  onClick = null
}) {
  // Dimensi berdasarkan ukuran
  const sizeMap = {
    xs: {
      symbol: 'w-6 h-6',
      image: 'h-6',
      title: 'text-base leading-none',
      subtitle: 'text-[9px] tracking-wider'
    },
    sm: {
      symbol: 'w-8 h-8',
      image: 'h-7',
      title: 'text-lg leading-none',
      subtitle: 'text-[10px] tracking-wider'
    },
    md: {
      symbol: 'w-10 h-10',
      image: 'h-9',
      title: 'text-xl leading-none',
      subtitle: 'text-[11px] tracking-wide'
    },
    lg: {
      symbol: 'w-12 h-12',
      image: 'h-11',
      title: 'text-2xl leading-tight',
      subtitle: 'text-xs tracking-wider'
    },
    xl: {
      symbol: 'w-16 h-16',
      image: 'h-14',
      title: 'text-3xl leading-tight',
      subtitle: 'text-xs tracking-widest'
    }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Warna teks berdasarkan tema
  const themeTextColors = {
    light: {
      brandWord: 'text-slate-900',
      ilmsWord: 'text-emerald-700',
      subtitle: 'text-slate-500'
    },
    dark: {
      brandWord: 'text-white',
      ilmsWord: 'text-emerald-400',
      subtitle: 'text-slate-400'
    },
    white: {
      brandWord: 'text-white',
      ilmsWord: 'text-emerald-300 font-bold',
      subtitle: 'text-emerald-100/80'
    }
  };

  const colors = themeTextColors[theme] || themeTextColors.light;

  // Render simbol geometris monogram resmi (Vektor SVG presisi)
  const renderSymbol = () => (
    <div
      className={`shrink-0 flex items-center justify-center rounded-lg bg-white p-1 shadow-sm border border-slate-200/80 ${currentSize.symbol}`}
    >
      <img
        src="/brand/favicon-32x32.png"
        alt="Aldepos Emblem"
        className="w-full h-full object-contain"
        loading="eager"
      />
    </div>
  );

  // Jika hanya simbol / monogram
  if (variant === 'symbol' || variant === 'monogram') {
    return (
      <div
        className={`inline-flex items-center ${className}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
      >
        {renderSymbol()}
      </div>
    );
  }

  // Render Full Logo (Symbol + Typography)
  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {renderSymbol()}
      <div className="flex flex-col min-w-0">
        <div className={`font-sans tracking-tight font-normal ${currentSize.title}`}>
          <span className={colors.brandWord}>Aldepos </span>
          <span className={`font-bold tracking-tight ${colors.ilmsWord}`}>ILMS</span>
        </div>
        {showSubtitle && (
          <span className={`uppercase font-medium mt-0.5 truncate ${currentSize.subtitle} ${colors.subtitle}`}>
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
}
