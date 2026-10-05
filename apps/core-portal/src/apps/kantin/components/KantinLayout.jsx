import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { isCashierOnlyUser } from '../../../shared/utils/authHelper';
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Users,
  Sliders,
  Package,
  Tags,
  Store,
  PackagePlus,
  RotateCcw,
  Coins,
  Receipt,
  BadgeDollarSign,
  BarChart3,
  LogOut,
  ChevronDown,
  School,
  Building2,
  Grid,
  UtensilsCrossed,
  RotateCw,
  Check,
  ChevronLeft,
  ChevronRight,
  Menu,
  UserCog,
  ShieldCheck
} from 'lucide-react';

const YAYASAN_CONTEXT = {
  id: 'all',
  name: 'Pusat Yayasan (Gabungan)',
  is_foundation: true,
  code: 'YAYASAN'
};

export default function KantinLayout() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('kantin_sidebar_collapsed') === 'true';
  });
  const [isReloading, setIsReloading] = useState(false);
  const dropdownRef = useRef(null);

  // Evaluasi Hak Akses User
  const isCashierOnly = useMemo(() => isCashierOnlyUser(user), [user]);

  const currentRole = isCashierOnly
    ? 'Kasir POS (Hanya Penjualan)'
    : (user?.school_roles?.[0]?.role_name || user?.account_type || 'pengelola_kantin');

  const isYayasanActive =
    !activeSchoolUnit ||
    activeSchoolUnit.id === 'all' ||
    activeSchoolUnit.is_foundation;

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('kantin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleReloadDatabase = () => {
    setIsReloading(true);
    window.dispatchEvent(new CustomEvent('kantin:reload'));
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

  const navGroups = useMemo(() => {
    if (isCashierOnly) {
      return [
        {
          title: 'Operasional Kasir',
          items: [
            { label: 'Kasir POS (Penjualan)', path: '/kantin/pos', icon: ShoppingCart },
          ]
        }
      ];
    }

    return [
      {
        title: 'Operasional Kasir',
        items: [
          { label: 'Dashboard', path: '/kantin/dashboard', icon: LayoutDashboard },
          { label: 'Kasir POS (Penjualan)', path: '/kantin/pos', icon: ShoppingCart },
          { label: 'Top Up & Tarik Tunai', path: '/kantin/wallet', icon: Wallet },
          { label: 'Akun Kasir POS', path: '/kantin/cashiers', icon: UserCog },
        ]
      },
      {
        title: 'Santri & Limit',
        items: [
          { label: 'Data Santri Kantin', path: '/kantin/students', icon: Users },
          { label: 'Limit Jajan Harian', path: '/kantin/limits', icon: Sliders },
        ]
      },
      {
        title: 'Produk & Inventori',
        items: [
          { label: 'Vendor / Supplier', path: '/kantin/vendors', icon: Store },
          { label: 'Kategori Produk', path: '/kantin/categories', icon: Tags },
          { label: 'Daftar Produk', path: '/kantin/products', icon: Package },
          { label: 'Penerimaan Barang', path: '/kantin/goods-receipts', icon: PackagePlus },
          { label: 'Retur Barang', path: '/kantin/product-returns', icon: RotateCcw },
        ]
      },
      {
        title: 'Keuangan & Bagi Hasil',
        items: [
          { label: 'Piutang Hak Kantin', path: '/kantin/receivables-canteen', icon: Coins },
          { label: 'Hak Vendor & Pembayaran', path: '/kantin/receivables-vendor', icon: Receipt },
          { label: 'Kas & Operasional Kantin', path: '/kantin/expenses', icon: BadgeDollarSign },
          { label: 'Laporan Komprehensif', path: '/kantin/reports', icon: BarChart3 },
        ]
      }
    ];
  }, [isCashierOnly]);

  // Jika akun kasir (cashier-only), render langsung halaman POS tanpa menu navigasi portal dan tanpa pilihan konteks
  if (isCashierOnly) {
    if (location.pathname !== '/kantin/pos') {
      return <Navigate to="/kantin/pos" replace />;
    }
    return (
      <div className="min-h-screen w-full bg-slate-100 font-sans antialiased overflow-x-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden font-sans antialiased">
      {/* Sidebar Kiri */}
      <aside
        className={`h-full bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 transition-all duration-300 ease-in-out relative z-30 overflow-hidden ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Logo & Modul */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-200 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs shrink-0">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <h1 className="text-sm font-bold text-white tracking-wide leading-none truncate">KANTIN SMART</h1>
                <p className="text-xs text-emerald-400 font-medium mt-0.5 truncate">POS &amp; Revenue Sharing</p>
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

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          {navGroups.map((group, gIdx) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 select-none">
                  {group.title}
                </div>
              ) : (
                gIdx > 0 && <div className="my-2 border-t border-slate-800/80 mx-2" />
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
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

                      {/* Tooltip when Collapsed */}
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

        {/* Footer Sidebar & User Profile */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 shrink-0 space-y-2">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-800/40">
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate">{user?.full_name || 'Pengguna Kantin'}</p>
                <p className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wider">
                  {currentRole}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-1">
            {!isCashierOnly ? (
              <Link
                to="/"
                className={`flex items-center justify-center gap-2 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition border border-slate-700 ${
                  isCollapsed ? 'w-full' : 'flex-1'
                }`}
                title="Kembali ke Menu Utama Portal"
              >
                <Grid className="w-3.5 h-3.5" />
                {!isCollapsed && <span>Portal Utama</span>}
              </Link>
            ) : (
              !isCollapsed && (
                <div className="flex-1 px-2 py-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 rounded-lg border border-emerald-800/40 truncate">
                  POS Kantin Aktif
                </div>
              )
            )}

            <button
              type="button"
              onClick={toggleCollapse}
              title={isCollapsed ? 'Perluas Menu Sidebar' : 'Kecilkan Menu Sidebar'}
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Konten Kanan */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header Atas */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 relative z-40 shadow-xs">
          {/* Header Title & Navigation Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={toggleCollapse}
              title={isCollapsed ? 'Perluas Navigasi' : 'Kecilkan Navigasi'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition shadow-2xs"
            >
              <Menu className="w-4 h-4" />
            </button>

            {!isCashierOnly ? (
              <Link
                to="/"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition shadow-2xs"
                title="Ke Portal Utama"
              >
                <Grid className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Portal Aplikasi</span>
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 shadow-2xs">
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kasir POS Cashless</span>
              </span>
            )}

            <div className="text-xs font-semibold text-slate-600 hidden md:block">
              Sistem Manajemen Kantin Smart, Kasir POS &amp; Bagi Hasil Vendor
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
              <span className="hidden md:inline">{isReloading ? 'Memuat...' : 'Reload Data'}</span>
            </button>

            {/* Dropdown Konteks Data Kantin (Yayasan Gabungan vs Satuan Pendidikan) */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition shadow-2xs text-xs font-semibold ${
                  isYayasanActive
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 hover:bg-emerald-100/90'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title="Pilih Konteks Data Kantin"
              >
                {isYayasanActive ? (
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <School className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <div className="flex items-center gap-1.5 max-w-[200px] truncate text-left">
                  <span className="truncate">
                    {isYayasanActive ? 'Pusat Yayasan (Gabungan)' : activeSchoolUnit?.name || 'Pilih Konteks'}
                  </span>
                </div>
                {isYayasanActive && (
                  <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-600 text-white tracking-wider shrink-0">
                    Gabungan
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
                          <span className="font-bold truncate">Pusat Yayasan</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                              isYayasanActive ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Gabungan
                          </span>
                        </div>
                        <p className={`text-[10px] mt-0.5 line-clamp-1 ${isYayasanActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                          Konsolidasi data kantin seluruh satuan pendidikan
                        </p>
                      </div>
                      {isYayasanActive && <Check className="w-4 h-4 text-white shrink-0 mt-1" />}
                    </button>
                  </div>

                  <div className="my-1 border-t border-slate-100 mx-2" />

                  {/* Opsi 2: Per Satuan Pendidikan */}
                  <div className="p-1.5 space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Satuan Pendidikan Mandiri
                    </div>
                    {schoolUnits?.length > 0 ? (
                      schoolUnits.map((u) => {
                        const isSelected = !isYayasanActive && String(activeSchoolUnit?.id) === String(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              changeActiveSchoolUnit(u);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <School
                                className={`w-4 h-4 shrink-0 ${
                                  isSelected ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                              />
                              <span className="truncate">{u.name}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-xs text-slate-400 italic">
                        Tidak ada satuan pendidikan terdaftar
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-slate-50 w-full">
          <Outlet key={activeSchoolUnit?.id || 'all'} />
        </main>
      </div>
    </div>
  );
}
