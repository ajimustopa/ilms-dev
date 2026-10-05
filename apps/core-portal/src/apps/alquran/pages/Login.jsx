import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { BookMarked, Loader2, KeyRound, User, Lock, School, ArrowLeft } from 'lucide-react';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [schoolUnitId, setSchoolUnitId] = useState('1');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, isAuthenticated, schoolUnits, activeSchoolUnit, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Otomatis SSO redirect jika sesi sudah aktif
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/alquran/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    if (activeSchoolUnit) {
      setSchoolUnitId(String(activeSchoolUnit.id));
    } else if (schoolUnits && schoolUnits.length > 0) {
      setSchoolUnitId(String(schoolUnits[0].id));
    }
  }, [activeSchoolUnit, schoolUnits]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await login(username, password, schoolUnitId ? Number(schoolUnitId) : undefined);
      if (res?.success || isAuthenticated) {
        const from = location.state?.from?.pathname || '/alquran/dashboard';
        navigate(from, { replace: true });
      } else {
        setError(res?.message || 'Gagal login ke Modul Tahfidz & Al-Quran');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal masuk. Periksa username dan password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        {/* Tombol Kembali ke Pusat Akses */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition group"
          >
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 group-hover:bg-slate-800 transition">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Pusat Akses Launcher</span>
          </Link>
        </div>

        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-md">
            <BookMarked className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-3 text-center text-xl font-bold text-white tracking-tight">
          Tahfidz & Al-Quran IBS
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Pesantren & Sekolah Islam Terpadu Aldepos IBS
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 py-6 px-6 shadow-xl rounded-xl sm:px-8">
          {error && (
            <FlatAlertBanner
              variant="danger"
              title="Otentikasi Gagal"
              description={error}
              className="mb-4"
            />
          )}

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Satuan Pendidikan
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                <select
                  value={schoolUnitId}
                  onChange={(e) => setSchoolUnitId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 transition"
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Username / Email / NIP
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username/NIP"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses Otentikasi...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Masuk ke Modul Tahfidz</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-3 border-t border-slate-800 text-center space-y-2">
            <p className="text-[11px] text-slate-500">
              Sistem Otentikasi Terpadu (SSO) Aldepos IBS
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-emerald-400 transition"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Kembali ke Launcher</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
