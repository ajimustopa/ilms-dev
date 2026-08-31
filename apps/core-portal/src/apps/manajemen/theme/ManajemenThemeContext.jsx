import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'aldepos_manajemen_theme';

const ManajemenThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  isLight: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ManajemenThemeProvider({ children, defaultTheme = 'dark' }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // Ignore localStorage errors
    }
    return defaultTheme;
  });

  const setTheme = (newTheme) => {
    const validTheme = newTheme === 'light' ? 'light' : 'dark';
    setThemeState(validTheme);
    try {
      localStorage.setItem(STORAGE_KEY, validTheme);
    } catch (e) {
      console.warn('Gagal menyimpan preferensi tema ke localStorage', e);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Sync to data-theme attribute & dark class on document root & body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-manajemen-root', '');

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    // Also sync if other tabs change the theme
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    setTheme,
    toggleTheme,
  }), [theme]);

  return (
    <ManajemenThemeContext.Provider value={value}>
      <div data-theme={theme} data-manajemen-root="" className="contents">
        {children}
      </div>
    </ManajemenThemeContext.Provider>
  );
}

export function useManajemenTheme() {
  const context = useContext(ManajemenThemeContext);
  if (!context) {
    throw new Error('useManajemenTheme must be used within a ManajemenThemeProvider');
  }
  return context;
}

export default ManajemenThemeContext;
