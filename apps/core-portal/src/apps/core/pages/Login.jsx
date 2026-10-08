import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { isCashierOnlyUser } from '../../../shared/utils/authHelper';
import LoginBrandPanel from './login/LoginBrandPanel';
import LoginMobileHeader from './login/LoginMobileHeader';
import LoginFormCard from './login/LoginFormCard';
import LoginForgotModal from './login/LoginForgotModal';

/**
 * Login — Halaman Autentikasi Tunggal Aldepos ILMS (Desktop & Mobile)
 * 
 * Bertindak sebagai kontainer pengelola state, validasi kredensial, autentikasi sesi,
 * dan penanganan alur pengalihan (redirect).
 */
export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeTab, setActiveTab] = useState('username'); // 'username' | 'email'
  const [errorMsg, setErrorMsg] = useState('');
  const [errorList, setErrorList] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Darkmode & Lightmode state (Default: Light Mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('portal_theme');
    return saved === 'dark';
  });

  const { login, isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Terapkan class dark mode ke dokumen HTML
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('portal_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('portal_theme', 'light');
    }
  }, [isDarkMode]);

  // Pengalihan otomatis bila sesi sudah terotentikasi
  useEffect(() => {
    if (isAuthenticated) {
      if (isCashierOnlyUser(user)) {
        navigate('/kantin/pos', { replace: true });
      } else {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorList([]);
    setFieldErrors({ username: '', password: '' });

    if (!username.trim()) {
      const msg = 'Nama pengguna (username) wajib diisi';
      setErrorMsg(msg);
      setFieldErrors({ username: msg, password: '' });
      return;
    }

    if (!password.trim()) {
      const msg = 'Kata sandi (password) wajib diisi';
      setErrorMsg(msg);
      setFieldErrors({ username: '', password: msg });
      return;
    }

    const res = await login(username, password);
    if (res.success) {
      if (isCashierOnlyUser(res.user || user)) {
        navigate('/kantin/pos', { replace: true });
      } else {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } else {
      const msg = res.message || 'Nama pengguna atau kata sandi tidak sesuai. Silakan coba kembali.';
      setErrorMsg(msg);
      if (res.errors && Array.isArray(res.errors)) {
        setErrorList(res.errors);
      }

      // Deteksi otomatis apakah kesalahan ada pada username atau password
      const msgLower = msg.toLowerCase();
      if (msgLower.includes('username') || msgLower.includes('nama pengguna') || msgLower.includes('tidak terdaftar')) {
        setFieldErrors({ username: msg, password: '' });
      } else if (msgLower.includes('password') || msgLower.includes('kata sandi') || msgLower.includes('salah')) {
        setFieldErrors({ username: '', password: msg });
      }
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900 transition-colors duration-200">
      
      {/* Layout Split: Desktop 55%/45% & Mobile Stacked */}
      <div className="flex flex-col lg:flex-row w-full flex-1">
        
        {/* PANEL KIRI: Desktop Institutional Brand (55%) */}
        <LoginBrandPanel />

        {/* PANEL KANAN / MOBILE BODY: Interactive Form Area (45%) */}
        <section className="w-full lg:w-[45%] flex-1 flex flex-col justify-between relative bg-slate-50 dark:bg-slate-950">
          
          {/* Header Mobile Collapsible (lg:hidden) */}
          <LoginMobileHeader
            isInputFocused={isInputFocused}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
          />

          {/* Form Card Body */}
          <main className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 pb-safe">
            <LoginFormCard
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              errorMsg={errorMsg}
              errorList={errorList}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
              setErrorMsg={setErrorMsg}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
              onOpenForgotModal={() => setIsForgotModalOpen(true)}
              onFocusField={() => setIsInputFocused(true)}
              onBlurField={() => setIsInputFocused(false)}
            />
          </main>

          {/* Footer Mobile/Desktop Bottom Note */}
          <footer className="w-full px-6 py-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800/60 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600"></span>
              <span>Pesantren Modern Aldepos</span>
            </div>
            <span className="hidden sm:inline">Server Terproteksi &bull; TLS 1.3 256-Bit</span>
          </footer>
        </section>
      </div>

      {/* Dialog Bantuan Reset Kata Sandi */}
      <LoginForgotModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}
