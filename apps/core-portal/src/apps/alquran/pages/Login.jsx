import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { BookMarked, Lock, User, AlertCircle, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [schoolUnitId, setSchoolUnitId] = useState('1');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Otomatis SSO redirect jika sesi sudah aktif
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/alquran/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password, schoolUnitId ? Number(schoolUnitId) : undefined);
      const from = location.state?.from?.pathname || '/alquran/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal masuk. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (userType) => {
    if (userType === 'superadmin') {
      setUsername('superadmin');
      setPassword('Password123!');
      setSchoolUnitId('1');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Tombol Kembali ke Pusat Akses */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300/70 hover:text-white transition group"
          >
            <div className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700 group-hover:bg-slate-700 transition">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Pusat Akses 14 Modul Aplikasi Sekolah</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xl shadow-emerald-950/50 mb-4 ring-4 ring-emerald-500/20">
            <BookMarked className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tahfidz & Al-Quran IBS</h1>
          <p className="text-emerald-300/80 text-xs mt-1 font-medium">
            Sistem Manajemen Target Hafalan, Setoran & Ujian Munaqasyah
          </p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-7 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username / Email</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Satuan Pendidikan</label>
              <select
                value={schoolUnitId}
                onChange={(e) => setSchoolUnitId(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              >
                <option value="1">SMA Aldepos IBS (ID: 1)</option>
                <option value="2">SMP Aldepos IBS (ID: 2)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>Masuk ke Modul Tahfidz</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Shortcut */}
          <div className="pt-4 border-t border-slate-700/60 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gunakan Akun Demo:</span>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => handleDemoLogin('superadmin')}
                className="px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-medium transition"
              >
                Superadmin / Musyrif
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            &larr; Kembali ke Portal Aplikasi Sekolah
          </button>
        </div>
      </div>
    </div>
  );
}
