import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { Lock, User, AlertCircle, Loader2, Info, ArrowLeft, GraduationCap } from 'lucide-react';

export default function GuruLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/guru/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleFillDemo = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan password wajib diisi');
      return;
    }

    const res = await login(username, password);
    if (res.success) {
      navigate('/guru/dashboard');
    } else {
      setErrorMsg(res.message || 'Login gagal. Periksa kembali kredensial Anda.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="max-w-md w-full">
        
        {/* Tombol Kembali ke Launcher */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition group"
          >
            <div className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 group-hover:bg-slate-700 transition">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Portal Manajemen Terpadu</span>
          </Link>
        </div>

        {/* Card Login */}
        <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 p-8">
          
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg shadow-emerald-500/25 mb-3">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Portal Guru Login</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sistem Manajemen Pendidik & Pembelajaran Mandiri
            </p>
          </div>

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="font-semibold">{errorMsg}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Username / NIP / Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau NIP..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password Anda..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi SSO...</span>
                </>
              ) : (
                <span>Masuk ke Portal Guru</span>
              )}
            </button>
          </form>

          {/* Akun Cepat untuk Uji Coba Demo */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-2">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>Akun Demo Cepat:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('ahmad.fauzi', 'Password123!')}
                className="p-2.5 border border-slate-800 rounded-xl text-left bg-slate-800/60 hover:bg-slate-800 hover:border-emerald-500/40 transition text-xs"
              >
                <p className="font-bold text-white">Guru / Pendidik</p>
                <p className="text-[10px] text-slate-400 font-mono">ahmad.fauzi</p>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('superadmin', 'Password123!')}
                className="p-2.5 border border-slate-800 rounded-xl text-left bg-slate-800/60 hover:bg-slate-800 hover:border-emerald-500/40 transition text-xs"
              >
                <p className="font-bold text-white">Super Admin</p>
                <p className="text-[10px] text-slate-400 font-mono">superadmin</p>
              </button>
            </div>
          </div>

        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          &copy; 2026 Aldepos Integrated Management System
        </p>

      </div>
    </div>
  );
}
