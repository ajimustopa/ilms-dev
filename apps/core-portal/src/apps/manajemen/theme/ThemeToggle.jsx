import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useManajemenTheme } from './ManajemenThemeContext';

export default function ThemeToggle({ className = '', showLabel = false }) {
  const { theme, isDark, toggleTheme } = useManajemenTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
      aria-label="Ubah Tema"
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold select-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-sm hover:shadow-indigo-500/10'
          : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-sm hover:shadow-amber-500/10'
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
        {/* Animated Sun & Moon Icons */}
        <Sun
          className={`w-4 h-4 text-amber-500 absolute transition-all duration-300 ${
            isDark
              ? 'rotate-90 scale-0 opacity-0 pointer-events-none'
              : 'rotate-0 scale-100 opacity-100'
          }`}
        />
        <Moon
          className={`w-4 h-4 text-indigo-400 absolute transition-all duration-300 ${
            isDark
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0 pointer-events-none'
          }`}
        />
      </div>

      {showLabel && (
        <span className="text-[11px] font-medium tracking-tight transition-colors duration-200">
          {isDark ? 'Gelap' : 'Terang'}
        </span>
      )}
    </button>
  );
}
