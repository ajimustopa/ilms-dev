import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { Lock, User, AlertCircle, Loader2, Info, ArrowLeft } from 'lucide-react';

export default function AkademikLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorList, setErrorList] = useState([]);
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/akademik/dashboard', { replace: true });
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
      navigate('/akademik/dashboard');
    } else {
      setErrorMsg(res.message || 'Login gagal. Periksa kembali kredensial Anda.');
      if (res.errors && Array.isArray(res.errors)) {
        setErrorList(res.errors);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-10">
      <div className="max-w-md w-full">
        {/* Tombol Kembali ke Pusat Akses */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition group"
          >
            <div className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 group-hover:bg-slate-700 group-hover:border-slate-600 transition">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Pusat Akses 14 Modul Aplikasi Sekolah</span>
          </Link>
        </div>

        {/* Card Login */}
        <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-8">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl mx-auto shadow-md mb-3">
              A
            </div>
            <h2 className="text-xl font-bold text-slate-800">Modul Akademik Login</h2>
            <p className="text-xs text-slate-500 mt-1">
              Sistem Informasi Akademik & Kesiswaan (SIAKAD)
            </p>
          </div>

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{errorMsg}</p>
                  {errorList.length > 0 && (
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {errorList.map((err, i) => (
                        <li key={i}>{err.message || err.field}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username / Email / NIP / NIS
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau NIS..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password Anda..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk ke Panel Akademik</span>
              )}
            </button>
          </form>

          {/* Akun Cepat untuk Uji Coba */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-2">
              <Info className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pilihan Akun Demo (Uji Coba Cepat):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('superadmin', 'Password123!')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-emerald-50 hover:border-emerald-300 transition text-[11px]"
              >
                <p className="font-bold text-slate-800">Super Admin</p>
                <p className="text-[10px] text-slate-500">Akses Penuh</p>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('ahmad.fauzi', 'Password123!')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-emerald-50 hover:border-emerald-300 transition text-[11px]"
              >
                <p className="font-bold text-slate-800">Guru / Wali Kelas</p>
                <p className="text-[10px] text-slate-500">Ahmad Fauzi</p>
              </button>
            </div>
          </div>

          {/* Link Kembali di bagian bawah card */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Pusat Akses 14 Modul</span>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-4">
          &copy; 2026 Aldepos Integrated School Management Platform
        </p>
      </div>
    </div>
  );
}
