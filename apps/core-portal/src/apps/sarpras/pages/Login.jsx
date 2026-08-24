import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { Building2, AlertCircle, Loader2, KeyRound, User, Lock, School, ArrowLeft } from 'lucide-react';

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
      const from = location.state?.from?.pathname || '/sarpras/dashboard';
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
        school_unit_id: schoolUnitId ? Number(schoolUnitId) : undefined
      });
      navigate('/sarpras/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal login ke Modul Sarpras');
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
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

        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black text-white tracking-tight">
          Sarana & Prasarana
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Pesantren & Sekolah Islam Terpadu Aldepos IBS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Satuan Pendidikan
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <select
                  value={schoolUnitId}
                  onChange={(e) => setSchoolUnitId(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-500 transition"
                >
                  {schoolUnits?.length > 0 ? (
                    schoolUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </option>
                    ))
                  ) : (
                    <option value="1">Satuan Pendidikan Utama</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username / Email / NIP
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau NIP"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition duration-150 disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Masuk ke Modul Sarpras</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center space-y-3">
            <p className="text-[11px] text-slate-500">
              Satu Sesi SSO Terintegrasi &bull; Akses Sesuai Hak Izin Pengguna
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
