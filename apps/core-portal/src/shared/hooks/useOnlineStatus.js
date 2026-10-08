import { useState, useEffect } from 'react';

/**
 * useOnlineStatus — Hook Deteksi Status Koneksi Internet Real-Time
 * 
 * Mendengarkan event 'online' dan 'offline' dari browser window
 * untuk menampilkan banner peringatan koneksi jaringan.
 * 
 * @returns {boolean} isOnline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default useOnlineStatus;
