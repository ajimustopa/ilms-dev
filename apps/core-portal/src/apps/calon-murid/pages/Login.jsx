import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { Lock, User, AlertCircle, Loader2, ArrowLeft, GraduationCap, Globe, CheckCircle2 } from 'lucide-react';

export default function CalonMuridLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/calon-murid/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan password wajib diisi');
      return;
    }

    const res = await login(username, password);
    if (res.success) {
      navigate('/calon-murid/dashboard');
    } else {
      setErrorMsg(res.message || 'Login gagal. Periksa kembali username dan kata sandi Anda.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="max-w-md w-full">
        
        {/* Navigasi Kembali */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition group"
          >
            <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 group-hover:bg-slate-800 transition">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Portal Utama</span>
          </Link>

          <a
            href="http://localhost:3001/ppdb"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Daftar Baru PPDB</span>
          </a>
        </div>

        {/* Card Login Calon Murid */}
        <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 p-8 space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg shadow-emerald-500/25">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-white">Portal Calon Santri & Murid</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Masuk menggunakan username dan kata sandi yang Anda peroleh saat mengisi formulir pendaftaran PPDB.
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
                Username Calon Murid
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: zaid / mfarhan"
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
                  placeholder="Masukkan 8 karakter kata sandi..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <span>Masuk ke Portal Calon Murid</span>
              )}
            </button>
          </form>

          {/* Info Bantuan */}
          <div className="pt-2 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400">
              Lupa kata sandi atau belum menerima akun? <br />
              <span className="text-emerald-400 font-semibold">Hubungi Layanan Panitia PPDB: 0812-3456-7890</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
