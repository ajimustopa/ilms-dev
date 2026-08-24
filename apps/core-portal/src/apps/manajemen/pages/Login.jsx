import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { ShieldCheck, AlertCircle, Loader2, KeyRound, User, Lock, School, ArrowLeft } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, schoolUnits, activeSchoolUnit, loading: authLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [schoolUnitId, setSchoolUnitId] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto redirect jika sudah memiliki sesi aktif (SSO Satu Sesi)
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/manajemen/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    if (activeSchoolUnit) {
      setSchoolUnitId(activeSchoolUnit.id);
    } else if (schoolUnits && schoolUnits.length > 0) {
      setSchoolUnitId(schoolUnits[0].id);
    }
  }, [activeSchoolUnit, schoolUnits]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({
        username,
        password,
        school_unit_id: schoolUnitId ? Number(schoolUnitId) : undefined,
      });
      navigate('/manajemen/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal login ke Modul Manajemen');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-950 font-sans text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* Tombol Kembali ke Pusat Akses */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition group"
          >
            <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 group-hover:bg-slate-800 transition">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Pusat Akses 14 Modul Aplikasi Sekolah</span>
          </Link>
        </div>

        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-950/50 mb-4 border border-indigo-400/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Sistem Manajemen & Mutu Sekolah
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Portal Eksekutif Perencanaan, Penjaminan Mutu & Kinerja Terpadu
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Satuan Pendidikan
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  value={schoolUnitId}
                  onChange={(e) => setSchoolUnitId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {schoolUnits?.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Username / Email / NIP
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau email"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-950/50 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Masuk ke Manajemen</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center space-y-3">
            <p className="text-[11px] text-slate-400">
              Satu Akun Terpadu (SSO) untuk seluruh ekosistem Aldepos
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Pusat Akses 14 Modul</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
