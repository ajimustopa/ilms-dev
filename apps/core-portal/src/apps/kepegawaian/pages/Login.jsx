import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { Lock, User, AlertCircle, Loader2, Info, ArrowLeft, Users } from 'lucide-react';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';

export default function KepegawaianLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorList, setErrorList] = useState([]);
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/kepegawaian/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleFillDemo = (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
  };

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
      navigate('/kepegawaian/dashboard');
    } else {
      setErrorMsg(res.message || 'Login gagal. Periksa kembali kredensial Anda.');
      if (res.errors && Array.isArray(res.errors)) {
        setErrorList(res.errors);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="max-w-md w-full">
        {/* Tombol Kembali ke Pusat Akses */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition group"
          >
            <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 group-hover:bg-slate-800 transition">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Pusat Akses 14 Modul</span>
          </Link>
        </div>

        {/* Card Login */}
        <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 p-8">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl mx-auto shadow-md mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Modul Kepegawaian Login</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sistem Informasi SDM & Manajemen Kepegawaian (HRIS)
            </p>
          </div>

          {/* Quick Demo Credentials Info */}
          <div className="mb-5 p-3 bg-slate-800/60 border border-slate-700/70 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 mb-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>Akun Awal Development (Database Seed):</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
              <div>
                <span className="font-mono font-semibold text-slate-200">superadmin</span>
                <span className="text-slate-400 text-[11px]"> / Password123!</span>
              </div>
              <button
                type="button"
                onClick={() => handleFillDemo('superadmin', 'Password123!')}
                className="text-[10px] font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30"
              >
                Gunakan
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-5">
              <FlatAlertBanner
                type="error"
                message={errorMsg}
                details={errorList.length > 0 ? errorList.map(err => typeof err === 'string' ? err : err.message || JSON.stringify(err)).join(', ') : undefined}
              />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username / NIP
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password Anda"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/40 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <span>Masuk ke Panel Kepegawaian</span>
              )}
            </button>
          </form>

          {/* Link Kembali di bagian bawah card */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Pusat Akses 14 Modul</span>
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          &copy; {new Date().getFullYear()} Yayasan Pendidikan Aldepos IBS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
