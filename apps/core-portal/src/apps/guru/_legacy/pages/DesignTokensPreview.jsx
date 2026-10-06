import React, { useState } from 'react';
import '../styles/guru-theme.css';

export default function DesignTokensPreview() {
  const [activeChip, setActiveChip] = useState('H');
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={`guru-shell min-h-screen p-4 pb-24 ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-md mx-auto space-y-5">
        
        {/* Header Preview */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Design System Token</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Portal Guru • Mobile-First Enterprise</p>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            className="guru-touch-target px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-sm"
          >
            {isDark ? '☀️ Terang' : '🌙 Gelap'}
          </button>
        </div>

        {/* 1. Palet Warna Semantik */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">1. Palet Warna Semantik</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="w-full h-6 rounded bg-emerald-600 mb-1.5 flex items-center justify-center text-white font-bold text-[10px]">#059669</div>
              <span className="font-semibold block">Brand Emerald</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Primary CTA</span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="w-full h-6 rounded bg-slate-900 dark:bg-slate-100 mb-1.5 flex items-center justify-center text-white dark:text-slate-900 font-bold text-[10px]">#0F172A</div>
              <span className="font-semibold block">Text Primary</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Kontras 16.5:1</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-semibold">
            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Sukses
            </div>
            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              Peringatan
            </div>
            <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              Bahaya
            </div>
            <div className="p-2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Info
            </div>
          </div>
        </section>

        {/* 2. Tipografi & Tabular Numbers */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">2. Tipografi & Angka Tabular (.tnum)</h2>
          <div className="guru-card space-y-2">
            <div className="text-xl font-bold">Judul Halaman 20px / 600</div>
            <div className="text-base font-semibold">Judul Seksi 16px / 600</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Teks Body 14px reguler untuk deskripsi instruksi guru dan catatan KBM.</div>
            <div className="text-xs text-slate-500 font-medium">Sublabel & Meta 12px font-medium</div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs flex justify-between tnum">
              <span>Jadwal: 07.30 - 09.00 WIB</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Nilai: 94 / 100</span>
            </div>
          </div>
        </section>

        {/* 3. StatRibbonCard */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">3. Kartu Stat & Ribbon Semantik</h2>
          <div className="space-y-2">
            <div className="guru-card guru-ribbon-card">
              <div className="text-xs font-semibold text-slate-500 uppercase">Jadwal Mengajar</div>
              <div className="text-sm font-bold mt-0.5">Matematika • Kelas VIII-A</div>
              <div className="text-xs text-slate-500 mt-1">Ruang 201 • Sesi 1-2 (07.30 - 09.00)</div>
            </div>

            <div className="guru-card guru-ribbon-card warning">
              <div className="text-xs font-semibold text-amber-600 uppercase">Status Kehadiran</div>
              <div className="text-sm font-bold mt-0.5">Belum Melakukan Check-In</div>
              <div className="text-xs text-slate-500 mt-1">Batas waktu tepat waktu: 07.15 WIB</div>
            </div>
          </div>
        </section>

        {/* 4. Chip Kehadiran Santri (Multi-Modal H/I/S/A) */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">4. Chip Kehadiran Siswa (Huruf + Warna)</h2>
          <div className="guru-card space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Abdullah Faiz Ramadhan</span>
              <span className="text-slate-400 tnum">NISN 0092817261</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setActiveChip('H')} 
                className={`guru-chip h ${activeChip === 'H' ? 'active' : ''}`}
                title="Hadir"
              >
                H
              </button>
              <button 
                type="button" 
                onClick={() => setActiveChip('I')} 
                className={`guru-chip i ${activeChip === 'I' ? 'active' : ''}`}
                title="Izin"
              >
                I
              </button>
              <button 
                type="button" 
                onClick={() => setActiveChip('S')} 
                className={`guru-chip s ${activeChip === 'S' ? 'active' : ''}`}
                title="Sakit"
              >
                S
              </button>
              <button 
                type="button" 
                onClick={() => setActiveChip('A')} 
                className={`guru-chip a ${activeChip === 'A' ? 'active' : ''}`}
                title="Alpa"
              >
                A
              </button>
            </div>
            <div className="text-[11px] text-slate-500">Status Terpilih: <strong className="text-slate-800 dark:text-slate-200">{activeChip === 'H' ? 'Hadir (H)' : activeChip === 'I' ? 'Izin (I)' : activeChip === 'S' ? 'Sakit (S)' : 'Alpa (A)'}</strong></div>
          </div>
        </section>

        {/* 5. Tombol & Touch Target (Min 44px) */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">5. Tombol & Touch Target (Min 44px)</h2>
          <div className="space-y-2">
            <button type="button" className="guru-btn-primary w-full shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              Tombol Utama (Height 44px)
            </button>
            <button type="button" className="guru-btn-outline w-full shadow-sm">
              Tombol Sekunder (Height 44px)
            </button>
          </div>
        </section>

        {/* 6. Form Input & Box Nilai */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">6. Form Input & Kotak Nilai</h2>
          <div className="guru-card space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Materi Pembelajaran</label>
              <input 
                type="text" 
                defaultValue="Teorema Pythagoras" 
                className="w-full h-11 px-3 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Input Nilai Siswa (0-100):</span>
              <input 
                type="number" 
                defaultValue="88" 
                className="w-16 h-10 text-center font-bold text-base rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 tnum focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-600 dark:text-emerald-400" 
              />
            </div>
          </div>
        </section>

      </div>

      {/* Floating Sample of Bottom Bar */}
      <div className="guru-bottom-nav">
        <div className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          Beranda
        </div>
        <div className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-slate-400 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          Jadwal
        </div>
        <div className="guru-nav-quick-btn" title="Presensi Masuk (Anti-Glow)">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
        </div>
        <div className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-slate-400 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Nilai
        </div>
        <div className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-slate-400 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          Akun
        </div>
      </div>
    </div>
  );
}
