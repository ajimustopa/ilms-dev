import React from 'react';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, Sun, Moon, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../../../shared/hooks/useOnlineStatus';
import FlatAlertBanner from '../../../../shared/components/FlatAlertBanner';

/**
 * LoginFormCard — Kartu Form Login Utama
 * 
 * Mengatur input kredensial, toggle password, tab mode identifier, penanganan error banner,
 * deteksi status offline, serta tombol submit dengan status loading terproteksi.
 */
export default function LoginFormCard({
  username,
  setUsername,
  password,
  setPassword,
  activeTab,
  setActiveTab,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  handleSubmit,
  isLoading,
  errorMsg,
  errorList = [],
  fieldErrors = { username: '', password: '' },
  setFieldErrors,
  setErrorMsg,
  isDarkMode,
  onToggleTheme,
  onOpenForgotModal,
  onFocusField,
  onBlurField
}) {
  const isOnline = useOnlineStatus();

  return (
    <div className="w-full max-w-[420px] mx-auto my-auto py-2 sm:py-6">
      {/* Container Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm ilms-fade-up" style={{ '--i': 1 }}>
        
        {/* Top Header Card: Title + Utility Controls */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Masuk ke Akun
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Gunakan kredensial resmi institusi Anda
            </p>
          </div>

          {/* Theme Switcher Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            className="hidden sm:flex w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors items-center justify-center cursor-pointer shrink-0 shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>

        {/* Offline Warning Alert Banner */}
        {!isOnline && (
          <FlatAlertBanner
            variant="warning"
            icon={WifiOff}
            title="Tidak Ada Koneksi Internet"
            description="Perangkat Anda sedang offline. Sambungkan internet untuk melakukan autentikasi."
            className="mb-5 shadow-2xs"
          />
        )}

        {/* Tab Segmented Controller (Identifier Modes) */}
        <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg flex border border-slate-200 dark:border-slate-700 mb-5" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'username'}
            onClick={() => {
              setActiveTab('username');
              if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: '' }));
            }}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              activeTab === 'username'
                ? 'bg-brand-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Nama Pengguna
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'email'}
            onClick={() => {
              setActiveTab('email');
              if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: '' }));
            }}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              activeTab === 'email'
                ? 'bg-brand-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Email / ID Pegawai
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 mb-5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 ilms-shake shadow-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold leading-tight">{errorMsg}</div>
              {errorList.length > 0 && (
                <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-[11px] text-rose-600/90 dark:text-rose-300/90">
                  {errorList.map((err, i) => (
                    <li key={i}>{typeof err === 'string' ? err : err.message || JSON.stringify(err)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Field 1: Identifier (Username / Email / NIP) */}
          <div>
            <label
              htmlFor="login-identifier"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between"
            >
              <span>{activeTab === 'username' ? 'Nama Pengguna' : 'Email Resmi / ID Pegawai'}</span>
              {fieldErrors.username && (
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  {fieldErrors.username}
                </span>
              )}
            </label>
            <div className="relative">
              <span className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                fieldErrors.username ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
              }`}>
                {activeTab === 'username' ? <User className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              </span>
              <input
                id="login-identifier"
                name="username"
                type="text"
                autoComplete="username"
                disabled={isLoading}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: '' }));
                  if (errorMsg) setErrorMsg('');
                }}
                onFocus={onFocusField}
                onBlur={onBlurField}
                placeholder={activeTab === 'username' ? 'Contoh: superadmin' : 'nama@aldepos.sch.id'}
                required
                aria-invalid={!!fieldErrors.username}
                className={`w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-lg transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-75 disabled:cursor-not-allowed ${
                  fieldErrors.username
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-2 border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-brand-700 dark:focus:border-emerald-500 focus:ring-2 focus:ring-brand-700/20'
                }`}
              />
            </div>
          </div>

          {/* Field 2: Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={onOpenForgotModal}
                className="text-xs text-brand-700 dark:text-emerald-400 hover:underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded cursor-pointer"
              >
                Lupa sandi?
              </button>
            </div>
            <div className="relative">
              <span className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                fieldErrors.password ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
              }`}>
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isLoading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                  if (errorMsg) setErrorMsg('');
                }}
                onFocus={onFocusField}
                onBlur={onBlurField}
                placeholder="Masukkan kata sandi akun..."
                required
                aria-invalid={!!fieldErrors.password}
                className={`w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-lg transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-75 disabled:cursor-not-allowed ${
                  fieldErrors.password
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-2 border-rose-500 focus:ring-2 focus:ring-rose-500/20 ilms-shake'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-brand-700 dark:focus:border-emerald-500 focus:ring-2 focus:ring-brand-700/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1" role="alert">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-2.5 pt-1 select-none">
            <input
              id="login-policy-consent"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-brand-700 focus:ring-brand-700 border-slate-300 dark:border-slate-600 accent-brand-700 cursor-pointer"
            />
            <label
              htmlFor="login-policy-consent"
              className="text-xs text-slate-600 dark:text-slate-400 leading-normal cursor-pointer"
            >
              Saya menyetujui ketentuan akses sistem &amp; kebijakan privasi institusi
            </label>
          </div>

          {/* Submit Action CTA Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 sm:h-12 bg-brand-700 hover:bg-brand-800 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-wait mt-6 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700"
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

        {/* Escalation Footnote */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Belum memiliki akun?{' '}
            <button
              type="button"
              onClick={onOpenForgotModal}
              className="text-brand-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
            >
              Hubungi Administrator IT
            </button>
          </span>
        </div>
      </div>

      {/* Helpdesk Support Microcopy */}
      <div className="mt-4 text-center">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Bantuan teknis: it-helpdesk@aldepos.sch.id · Ext. 104
        </p>
      </div>
    </div>
  );
}
