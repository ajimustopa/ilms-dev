import React from 'react';
import { Sun, Moon, ShieldCheck } from 'lucide-react';
import BrandLogo from '../../../../shared/components/brand/BrandLogo';
import LatticePattern from '../../../../shared/components/brand/LatticePattern';

/**
 * LoginMobileHeader — Header Mobile Interaktif (lg:hidden)
 * 
 * Tinggi dinamis:
 * - Default: ~200px (Brand Banner dengan LatticePattern dan teks lengkap)
 * - Focused / Keyboard: ~56px (Collapsed bar ringkas tanpa lompat tata letak)
 */
export default function LoginMobileHeader({
  isInputFocused = false,
  isDarkMode = false,
  onToggleTheme
}) {
  return (
    <header
      className={`relative w-full bg-brand-900 text-white overflow-hidden flex flex-col justify-between transition-all duration-300 ease-out select-none lg:hidden z-20 ${
        isInputFocused ? 'h-14 px-4 py-2 shadow-sm' : 'h-[200px] p-5 pb-8'
      }`}
    >
      {/* Background Islamic Lattice Pattern */}
      <LatticePattern
        opacity={isInputFocused ? 0.05 : 0.12}
        color="#6ee7b7"
        animated={!isInputFocused}
        patternSize={48}
      />

      {/* Top Utility Bar: Security status & Theme Switcher */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5 text-xs text-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
          <span className="text-[11px] font-medium tracking-wide">Portal Resmi Terproteksi</span>
        </div>

        {/* Theme Switcher Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center text-emerald-200 hover:text-white transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-emerald-200" />}
        </button>
      </div>

      {/* Logo & Identity Zone */}
      <div className="relative z-10 flex items-center gap-3">
        {isInputFocused ? (
          /* Collapsed View (Single compact row) */
          <div className="flex items-center gap-2">
            <BrandLogo variant="symbol" size="sm" theme="white" />
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-white tracking-tight">Aldepos</span>
              <span className="text-base font-bold text-emerald-300 tracking-tight">ILMS</span>
            </div>
          </div>
        ) : (
          /* Full Expanded View */
          <BrandLogo
            variant="full"
            size="md"
            theme="white"
            showSubtitle={true}
            subtitleText="Yayasan Ponpes Terpadu Aldepos"
          />
        )}
      </div>
    </header>
  );
}
