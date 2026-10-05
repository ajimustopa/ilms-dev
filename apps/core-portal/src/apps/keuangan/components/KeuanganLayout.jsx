import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  LayoutDashboard,
  FolderTree,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Wallet,
  Coins,
  BookOpen,
  BarChart3,
  LogOut,
  ChevronDown,
  School,
  Building2,
  Grid,
  Check,
  RotateCw,
  Tags,
  UserCheck,
  FileText,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Menu,
  Layers,
  Settings2,
  Sliders,
  Store
} from 'lucide-react';
import UnitConsolidationModal from './UnitConsolidationModal';
import {
  getConsolidationConfig,
  getIncludedUnits,
  DEFAULT_CONSOLIDATION_CONFIG
} from '../../../shared/utils/unitConsolidationHelper';

const YAYASAN_CONTEXT = {
  id: 'all',
  name: 'Pusat Yayasan (Gabungan)',
  is_foundation: true,
  code: 'YAYASAN'
};

export default function KeuanganLayout() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('keuangan_sidebar_collapsed') === 'true';
  });
  const [isReloading, setIsReloading] = useState(false);
  const [consolidationModalOpen, setConsolidationModalOpen] = useState(false);
  const [consolidationConfig, setConsolidationConfig] = useState(() => getConsolidationConfig(schoolUnits));
  const dropdownRef = useRef(null);

  // Sinkronisasi konfigurasi konsolidasi saat schoolUnits berubah atau event dipicu
  useEffect(() => {
    setConsolidationConfig(getConsolidationConfig(schoolUnits));
    
    const handleConfigUpdate = (e) => {
      if (e.detail) {
        setConsolidationConfig(e.detail);
      } else {
        setConsolidationConfig(getConsolidationConfig(schoolUnits));
      }
    };

    window.addEventListener('keuangan:consolidation-updated', handleConfigUpdate);
    return () => window.removeEventListener('keuangan:consolidation-updated', handleConfigUpdate);
  }, [schoolUnits]);

  const currentRole = user?.school_roles?.[0]?.role_name || user?.account_type || 'admin_keuangan';

  const isYayasanActive =
    !activeSchoolUnit ||
    activeSchoolUnit.id === 'all' ||
    activeSchoolUnit.is_foundation;

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('keuangan_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleReloadDatabase = () => {
    setIsReloading(true);
    window.dispatchEvent(new CustomEvent('keuangan:reload'));
    setTimeout(() => {
      setIsReloading(false);
    }, 600);
  };

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeIncludedUnits = getIncludedUnits(schoolUnits, consolidationConfig);

  // Pengelompokan Navigasi Berdasarkan Fungsi
  const navSections = [
    {
      title: 'Utama',
      items: [
        {
          label: 'Dashboard',
          path: '/keuangan/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Perencanaan & Tarif',
      items: [
        {
          label: 'Data Master & COA',
          path: '/keuangan/master-data',
          icon: FolderTree,
        },
        {
          label: 'Pengelolaan Gabungan',
          path: '/keuangan/unit-consolidation',
          icon: Layers,
        },
        {
          label: 'Rencana Anggaran (RAPBS)',
          path: '/keuangan/budget',
          icon: FileSpreadsheet,
        },
        {
          label: 'Pos Alokasi Dana',
          path: '/keuangan/fund-balances',
          icon: Coins,
        },
        {
          label: 'Skema Biaya Pendidikan',
          path: '/keuangan/fee-schemes',
          icon: Tags,
        },
        {
          label: 'Penetapan Biaya Siswa',
          path: '/keuangan/fee-assignments',
          icon: UserCheck,
        },
      ],
    },
    {
      title: 'Penagihan & Transaksi',
      items: [
        {
          label: 'Tagihan Siswa',
          path: '/keuangan/bills',
          icon: Receipt,
        },
        {
          label: 'Pendaftaran PPDB',
          path: '/keuangan/ppdb-billing',
          icon: UserCheck,
        },
        {
          label: 'Penerimaan Kas',
          path: '/keuangan/payments',
          icon: CreditCard,
        },
        {
          label: 'Pengeluaran & Belanja',
          path: '/keuangan/expenses',
          icon: Wallet,
        },
        {
          label: 'Kantin & Dompet Digital',
          path: '/keuangan/canteen',
          icon: Store,
        },
        {
          label: 'Kartu Bayar Siswa',
          path: '/keuangan/student-ledger',
          icon: FileText,
        },
      ],
    },
    {
      title: 'Bank & Pembukuan',
      items: [
        {
          label: 'Rekening Koran (Bank)',
          path: '/keuangan/bank-statements',
          icon: Landmark,
        },
        {
          label: 'Akuntansi & Buku Besar',
          path: '/keuangan/bookkeeping',
          icon: BookOpen,
        },
        {
          label: 'Laporan Keuangan',
          path: '/keuangan/reports',
          icon: BarChart3,
        },
      ],
    },
  ];

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden font-sans antialiased">
      {/* Sidebar Kiri */}
      <aside
        className={`h-full bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 transition-all duration-300 ease-in-out relative z-30 overflow-hidden ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-200 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs shrink-0">
              K
            </div>
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <h1 className="text-sm font-bold text-white tracking-wide leading-none truncate">ALDEPOS</h1>
                <p className="text-xs text-emerald-400 font-medium mt-0.5 truncate">Modul Keuangan</p>
              </div>
            )}
          </div>
        </div>

        {/* Role Badge Indicator */}
        {!isCollapsed ? (
          <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between transition-all">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Peran Aktif</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 truncate max-w-[120px]">
              {currentRole}
            </span>
          </div>
        ) : (
          <div className="py-2 bg-slate-950/60 border-b border-slate-800/80 flex justify-center" title={`Peran: ${currentRole}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        )}

        {/* Nav Links Diklasifikasikan per Section */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          {navSections.map((section, sIdx) => (
            <div key={section.title} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 select-none">
                  {section.title}
                </div>
              ) : (
                sIdx > 0 && <div className="my-2 border-t border-slate-800/80 mx-2" />
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center rounded-lg text-xs font-medium transition-all group relative ${
                          isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                        } ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                            : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}

                      {/* Floating Tooltip when Collapsed */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-slate-800">
                          {item.label}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Sidebar & Collapse Toggle */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          {!isCollapsed && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>v1.0.0 Keuangan</span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Perluas Menu Sidebar' : 'Kecilkan Menu Sidebar (Menyisakan Icon)'}
            className={`p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition ${
              isCollapsed ? 'w-full flex justify-center' : 'ml-auto'
            }`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Konten Kanan */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header Atas */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 relative z-40 shadow-xs">
          {/* Header Title & Portal Link */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Toggle Sidebar Button di Header */}
            <button
              type="button"
              onClick={toggleCollapse}
              title={isCollapsed ? 'Perluas Navigasi' : 'Kecilkan Navigasi (Menyisakan Icon)'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition shadow-2xs"
            >
              <Menu className="w-4 h-4" />
            </button>

            <Link
              to="/"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition shadow-2xs"
              title="Ke Portal Utama"
            >
              <Grid className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Portal Aplikasi</span>
            </Link>
            <div className="text-xs font-semibold text-slate-600 hidden md:block">
              Sistem Pengelolaan Keuangan &amp; Akuntansi Terintegrasi
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 sm:gap-4 ml-auto">
            {/* Global Reload Data Button */}
            <button
              type="button"
              onClick={handleReloadDatabase}
              disabled={isReloading}
              title="Perbarui data tabel dari database"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-emerald-700 text-xs font-semibold rounded-lg transition shadow-2xs cursor-pointer disabled:opacity-75"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden md:inline">{isReloading ? 'Memuat...' : 'Reload Database'}</span>
            </button>

            {/* Dropdown Konteks Data Keuangan (Yayasan vs Satuan Pendidikan) */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition shadow-2xs text-xs font-semibold ${
                  isYayasanActive
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 hover:bg-emerald-100/90'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title="Pilih Konteks Data yang Dikelola"
              >
                {isYayasanActive ? (
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <School className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                )}
                <div className="flex items-center gap-1.5 max-w-[200px] truncate text-left">
                  <span className="truncate">
                    {isYayasanActive ? (consolidationConfig.name || 'Pusat Yayasan (Gabungan)') : activeSchoolUnit?.name || 'Pilih Konteks'}
                  </span>
                </div>
                {isYayasanActive && (
                  <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-600 text-white tracking-wider shrink-0">
                    {activeIncludedUnits.length} Unit
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                    <span>Konteks Data yang Dikelola</span>
                    <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                      {isYayasanActive ? 'Konteks Gabungan' : 'Konteks Satuan'}
                    </span>
                  </div>

                  {/* Opsi 1: Tingkat Yayasan (Gabungan Seluruh Satuan) */}
                  <div className="p-1.5 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        changeActiveSchoolUnit(YAYASAN_CONTEXT);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-start gap-3 transition ${
                        isYayasanActive
                          ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                          : 'hover:bg-emerald-50/70 text-slate-700'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isYayasanActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold truncate">
                            {consolidationConfig.name || 'Pusat Yayasan'}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                              isYayasanActive ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Gabungan
                          </span>
                        </div>
                        <p className={`text-[10px] mt-0.5 line-clamp-1 ${isYayasanActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {consolidationConfig.description || 'Konsolidasi keuangan terpadu'}
                        </p>
                        
                        {/* Chips Satuan Pendidikan yang Digabung */}
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {activeIncludedUnits.map((u) => (
                            <span
                              key={u.id}
                              className={`text-[9px] px-1.5 py-0.2 rounded font-medium border ${
                                isYayasanActive
                                  ? 'bg-emerald-700/80 text-white border-emerald-500/50'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {u.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      {isYayasanActive && <Check className="w-4 h-4 text-white shrink-0 mt-1" />}
                    </button>

                    {/* Tombol Khusus untuk Mengatur Definisi Gabungan */}
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        setConsolidationModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 text-[11px] font-semibold rounded-lg transition"
                      title="Atur satuan pendidikan mana saja yang digabung"
                    >
                      <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Atur Definisi Unit Gabungan</span>
                    </button>
                  </div>

                  {/* Opsi 2: Daftar Satuan Pendidikan Mandiri */}
                  {schoolUnits && schoolUnits.length > 0 && (
                    <>
                      <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 flex items-center justify-between">
                        <span>Satuan Pendidikan Mandiri</span>
                        <span className="text-[9px] font-normal text-slate-400">({schoolUnits.length})</span>
                      </div>

                      <div className="p-1.5 max-h-52 overflow-y-auto space-y-1 custom-scrollbar">
                        {schoolUnits.map((unit) => {
                          const isSelected = !isYayasanActive && String(activeSchoolUnit?.id) === String(unit.id);
                          return (
                            <button
                              key={unit.id}
                              type="button"
                              onClick={() => {
                                changeActiveSchoolUnit(unit);
                                setDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-3 transition ${
                                isSelected
                                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <School className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">{unit.name}</div>
                                <div className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                                  NPSN: {unit.npsn || '-'} {unit.level ? `• Jenjang ${unit.level}` : ''}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Profil User Badge */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                  {user?.full_name?.charAt(0) || 'K'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user?.full_name || 'Bendahara / Keuangan'}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider capitalize">
                    {user?.username} ({currentRole})
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                title="Keluar / Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Konten Halaman */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-50">
          <Outlet />
        </main>
      </div>

      {/* Modal Popup Definisi Unit Gabungan */}
      <UnitConsolidationModal
        isOpen={consolidationModalOpen}
        onClose={() => setConsolidationModalOpen(false)}
        onSaved={(newCfg) => setConsolidationConfig(newCfg)}
      />
    </div>
  );
}

