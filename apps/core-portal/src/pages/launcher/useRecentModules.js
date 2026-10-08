import { useState, useEffect, useCallback, useMemo } from 'react';
import { LAUNCHER_MODULES } from './launcherModules';
import { canAccessModule } from './accessControl';

/**
 * useRecentModules — Hook Pengelola Riwayat 4 Modul Terakhir Dibuka
 * 
 * Fitur:
 * - Menyimpan riwayat unik per user di localStorage (`aldepos_recent_modules:<user.id>`)
 * - Maksimal 4 modul aktif
 * - Otomatis menyaring modul yang statusnya 'active' dan diizinkan oleh hak akses pengguna saat ini
 */
export function useRecentModules(user) {
  const userId = user?.id || user?.username || 'guest';
  const storageKey = `aldepos_recent_modules:${userId}`;

  // Baca daftar ID modul tersimpan
  const [recentSlugs, setRecentSlugs] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
    } catch {
      return [];
    }
  });

  // Sinkronkan ke state bila user berganti
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setRecentSlugs([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setRecentSlugs(Array.isArray(parsed) ? parsed.slice(0, 4) : []);
    } catch {
      setRecentSlugs([]);
    }
  }, [storageKey]);

  // Catat pembukaan modul baru (taruh di urutan paling depan, unik, max 4)
  const trackModuleOpen = useCallback((moduleId) => {
    if (!moduleId) return;
    setRecentSlugs((prev) => {
      const next = [moduleId, ...prev.filter((id) => id !== moduleId)].slice(0, 4);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {
        console.warn('Gagal menyimpan recent modules ke localStorage:', err);
      }
      return next;
    });
  }, [storageKey]);

  // Bersihkan riwayat
  const clearRecentModules = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setRecentSlugs([]);
  }, [storageKey]);

  // Petakan slug ke objek modul utuh yang aktif dan diizinkan
  const recentModules = useMemo(() => {
    if (!recentSlugs.length || !user) return [];

    const moduleMap = new Map(LAUNCHER_MODULES.map((m) => [m.id, m]));
    const valid = [];

    for (const slug of recentSlugs) {
      const mod = moduleMap.get(slug);
      if (mod && mod.status === 'active' && canAccessModule(user, mod)) {
        valid.push(mod);
      }
    }

    return valid;
  }, [recentSlugs, user]);

  return {
    recentModules,
    recentSlugs,
    trackModuleOpen,
    clearRecentModules
  };
}

export default useRecentModules;
