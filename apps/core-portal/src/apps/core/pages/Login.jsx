import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { isCashierOnlyUser } from '../../../shared/utils/authHelper';
import {
  ShieldCheck,
  Lock,
  User,
  AlertCircle,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  CheckCircle2,
  Sun,
  Moon,
  HelpCircle,
  KeyRound,
  Fingerprint,
  Mail,
  Building2
} from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeTab, setActiveTab] = useState('username'); // 'username' | 'email'
  const [errorMsg, setErrorMsg] = useState('');
  const [errorList, setErrorList] = useState([]);

  // Darkmode & Lightmode state (Default: Light Mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('portal_theme');
    return saved === 'dark'; // Default: false (Light Mode)
  });

  const { login, isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Apply dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('portal_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('portal_theme', 'light');
    }
  }, [isDarkMode]);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      if (isCashierOnlyUser(user)) {
        navigate('/kantin/pos', { replace: true });
      } else {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorList([]);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Nama pengguna dan kata sandi wajib diisi');
      return;
    }

    const res = await login(username, password);
    if (res.success) {
      if (isCashierOnlyUser(res.user || user)) {
        navigate('/kantin/pos', { replace: true });
      } else {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } else {
      setErrorMsg(res.message || 'Nama pengguna atau kata sandi tidak sesuai. Silakan coba kembali.');
      if (res.errors && Array.isArray(res.errors)) {
        setErrorList(res.errors);
      }
    }
  };

  return (
    <div className={`min-h-screen w-full font-sans antialiased relative overflow-hidden flex flex-col justify-between transition-colors duration-300 ${
      isDarkMode
        ? 'dark bg-slate-950 text-slate-100'
        : 'bg-gradient-to-br from-[#EEF4FF] via-[#F6F9FF] to-[#E5EFFE] text-slate-800'
    }`}>

      {/* ========================================================================= */}
      {/* BACKGROUND FLUID WAVES & LUMINOUS ACCENTS (MATCHING NOVOS AESTHETICS)     */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft Radial Ambient Glows */}
        <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[750px] h-[750px] bg-indigo-300/25 dark:bg-indigo-600/10 rounded-full blur-[160px]" />
        <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] bg-sky-200/30 dark:bg-cyan-500/5 rounded-full blur-[130px]" />

        {/* Fluid Ribbon Waves SVG Graphic */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full h-[380px] lg:h-[480px] opacity-70 dark:opacity-20"
          viewBox="0 0 1440 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M0 240C240 180 480 320 720 260C960 200 1200 120 1440 160V400H0V240Z"
            fill="url(#waveGradient1)"
          />
          <path
            d="M0 300C300 220 600 360 900 280C1200 200 1350 250 1440 230V400H0V300Z"
            fill="url(#waveGradient2)"
            opacity="0.6"
          />
          <defs>
            <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#C7D2FE" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="waveGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#A5B4FC" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* TOP HEADER: BRAND LOGO & THEME SWITCHER                                  */}
      {/* ========================================================================= */}
      <header className="relative z-20 px-6 sm:px-10 lg:px-16 py-6 flex items-center justify-between">
        {/* Logo & Brand Name */}
        <div className="flex items-center gap-3">
          {/* Stylized Aldepos Geometric 'A' Mark */}
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 100 100" className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow-xs">
              <defs>
                <linearGradient id="logoGold" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#FBBF24" />
                </linearGradient>
                <linearGradient id="logoNavy" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E3A8A" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              <polygon points="15,85 45,20 52,38 28,85" fill="url(#logoGold)" />
              <polygon points="85,85 45,20 62,20 95,85" fill="url(#logoNavy)" />
              <polygon points="32,60 78,60 73,70 37,70" fill="#1E40AF" />
            </svg>
          </div>

          <div>
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              ALDEPOS <span className="text-blue-600 dark:text-blue-400">QUANTUM</span>
            </span>
            <span className="hidden sm:block text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">
              Sistem Informasi Sekolah
            </span>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
            className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-amber-400 hover:bg-white dark:hover:bg-slate-800 transition shadow-2xs backdrop-blur-md cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER: 2-COLUMN LAYOUT (DESKTOP) & CENTERED CARD (MOBILE)        */}
      {/* ========================================================================= */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-4 lg:py-8 w-full flex items-center justify-between gap-8 lg:gap-16">
        
        {/* ======================================================================= */}
        {/* LEFT COLUMN: FUTURISTIC TYPOGRAPHY & FLOATING AI CHAT PILLS (DESKTOP)  */}
        {/* ======================================================================= */}
        <div className="hidden lg:flex flex-col justify-center flex-1 max-w-lg space-y-8 select-none">
          {/* Floating Conversational / Status Bubbles matching screenshot style */}
          <div className="space-y-2.5 pl-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium shadow-2xs animate-in fade-in duration-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sistem Manajemen Sekolah Cerdas &amp; Terintegrasi</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/90 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Otentikasi Aman &bull; Single Sign-On (SSO) 256-Bit</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-blue-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Akses Cepat 17 Modul Pendidikan &amp; Keuangan</span>
            </div>
          </div>

          {/* Large Futuristic Stylized Brand Typography matching Novos screenshot */}
          <div className="relative pt-4">
            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 mb-1">
              THE PLATFORM
            </div>

            {/* Glowing Accent Dots */}
            <div className="absolute top-1 left-32 w-2 h-2 rounded-full bg-blue-500/60 blur-xs" />
            <div className="absolute bottom-6 left-0 w-3 h-3 rounded-full bg-indigo-500/40 blur-xs" />

            <h1 className="text-5xl xl:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
              aldepos
            </h1>
            <div className="text-xl xl:text-2xl font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase mt-1">
              Q U A N T U M
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed max-w-md font-normal">
              Satu portal terpadu untuk kepala sekolah, dewan guru, staf kepegawaian, bendahara keuangan, pengelola sarpras, dan kasir kantin.
            </p>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: MODERN LOGIN FORM CARD                                    */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[440px] shrink-0 mx-auto">
          {/* Card Container with Soft Glassmorphism */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-7 sm:p-9 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.12)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] border border-white/80 dark:border-slate-800/90 space-y-6">
            
            {/* Card Header */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Masuk ke Akun
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gunakan kredensial resmi institusi Anda
              </p>
            </div>

            {/* Login Tab Switchers (Matching Chinese Screenshot Tabs) */}
            <div className="flex items-center gap-6 border-b border-slate-100 dark:border-slate-800 pb-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('username')}
                className={`pb-2 font-bold transition-all relative ${
                  activeTab === 'username'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <span>Nama Pengguna</span>
                {activeTab === 'username' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`pb-2 font-bold transition-all relative ${
                  activeTab === 'email'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <span>Email / ID Pegawai</span>
                {activeTab === 'email' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>
                  <div className="font-bold">{errorMsg}</div>
                  {errorList.length > 0 && (
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                      {errorList.map((err, i) => (
                        <li key={i}>{typeof err === 'string' ? err : err.message || JSON.stringify(err)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Username / Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {activeTab === 'username' ? 'Nama Pengguna' : 'Alamat Email / NIP'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    {activeTab === 'username' ? <User className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={activeTab === 'username' ? 'Contoh: admin / super_admin' : 'Contoh: pegawai@aldepos.sch.id'}
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-2xs outline-none font-medium"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kata Sandi
                  </label>
                  <span className="text-[11px] text-slate-400 hover:text-blue-600 transition cursor-pointer">
                    Lupa sandi?
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun..."
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-2xs outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox & Terms Agreement */}
              <div className="pt-1 flex items-start gap-2.5">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                />
                <label htmlFor="remember-me" className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug cursor-pointer select-none">
                  Saya menyetujui ketentuan akses sistem &amp; kebijakan privasi institusi
                </label>
              </div>

              {/* Submit Button (Vibrant Blue matching Novos screenshot) */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md hover:shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Support Link */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Belum memiliki akun?{' '}
                <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer">
                  Hubungi Administrator IT
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FOOTER                                                                    */}
      {/* ========================================================================= */}
      <footer className="relative z-20 py-4 px-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
        <span>&copy; {new Date().getFullYear()} Yayasan Aldepos &bull; Aldepos Quantum Core v3.0</span>
      </footer>
    </div>
  );
}
