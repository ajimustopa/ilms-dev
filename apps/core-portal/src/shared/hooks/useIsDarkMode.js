import { useState, useEffect } from 'react';

/**
 * useIsDarkMode
 * Hook reaktif untuk mendeteksi mode gelap secara otomatis di seluruh portal.
 * Memantau class 'dark' atau attribute 'data-theme="dark"' pada document.documentElement & document.body
 * Menggunakan MutationObserver ringan tanpa ketergantungan pada context spesifik modul.
 */
export function useIsDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return (
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      document.body?.getAttribute('data-theme') === 'dark'
    );
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const checkDarkMode = () => {
      const darkActive =
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body?.getAttribute('data-theme') === 'dark';
      setIsDark(darkActive);
    };

    // Initial check
    checkDarkMode();

    // MutationObserver to watch class and data-theme attribute mutations
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')
        ) {
          checkDarkMode();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme'],
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return isDark;
}

export default useIsDarkMode;
