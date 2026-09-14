import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  ShieldCheck,
  Lock,
  User,
  AlertCircle,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Fingerprint,
  ArrowRight,
  Shield,
  Layers
} from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorList, setErrorList] = useState([]);

  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorList([]);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan password wajib diisi');
      return;
    }

    const res = await login(username, password);
    if (res.success) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } else {
      setErrorMsg(res.message || 'Kredensial tidak valid atau server tidak dapat dihubungi');
      if (res.errors && Array.isArray(res.errors)) {
        setErrorList(res.errors);
      }
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-[#030712] text-slate-100 overflow-hidden font-sans p-4 sm:p-6 lg:p-8">
      {/* ======================================================== */}
      {/* FUTURISTIC AMBIENT BACKGROUND GLOWS & CYBER GRID         */}
      {/* ======================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Cyber Neon Radial Blurs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl" />
        
        {/* Subtle Cyber Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(to right, #6366f1 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* ======================================================== */}
      {/* MAIN CONSOLE CARD                                        */}
      {/* ======================================================== */}
      <div className="relative z-10 w-full max-w-[460px]">
        {/* Top Status HUD Pill */}
        <div className="flex items-center justify-center mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 shadow-lg backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </span>
            <span className="text-[11px] font-mono font-bold tracking-widest text-slate-300 uppercase">
              ALDEPOS QUANTUM SSO &bull; SYSTEM ONLINE
            </span>
          </div>
        </div>

        {/* Card Box */}
        <div className="relative rounded-xl bg-slate-900/70 border border-slate-800/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(99,102,241,0.12)] backdrop-blur-2xl p-6 sm:p-8">
          {/* Subtle glowing border highlight at top */}
          <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="relative inline-block mb-3.5">
              <div className="w-14 h-14 rounded-xl bg-emerald-600 p-0.5 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950 items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>CORE ALDEPOS</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
              Pusat Otentikasi Terpadu & Gerbang Akses Modul Ekosistem Sekolah
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs rounded-xl flex items-start gap-2.5 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <div className="font-bold text-rose-200">{errorMsg}</div>
                {errorList.length > 0 && (
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-rose-300">
                    {errorList.map((err, i) => (
                      <li key={i}>{typeof err === 'string' ? err : err.message || JSON.stringify(err)}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Nama Pengguna / Username</span>
                <span className="text-[10px] font-mono text-slate-500">ID Terdaftar</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda..."
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Kata Sandi / Password</span>
                <span className="text-[10px] font-mono text-slate-500">Min. 6 Karakter</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 relative group overflow-hidden rounded-xl p-px font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <div className="absolute inset-0 bg-emerald-600 transition-all group-hover:scale-105 group-hover:brightness-110" />
              <div className="relative px-4 py-3 rounded-[11px] bg-slate-950/20 flex items-center justify-center gap-2 text-white font-extrabold tracking-wide uppercase">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>Mengotentikasi Sesi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Gerbang Aplikasi</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Footer Security Badges */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-2">
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 font-mono">
              <span className="inline-flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" /> 256-Bit SSL
              </span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1">
                <Fingerprint className="w-3 h-3 text-indigo-400" /> Token Auth
              </span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" /> RBAC Engine
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} Aldepos Islamic Boarding School &bull; All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
