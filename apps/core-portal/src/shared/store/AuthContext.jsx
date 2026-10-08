import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { getAppLoginPath } from '../utils/authHelper';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('aldepos_user');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem('aldepos_access_token') || null;
  });

  const [refreshToken, setRefreshToken] = useState(() => {
    return localStorage.getItem('aldepos_refresh_token') || null;
  });

  const [schoolUnits, setSchoolUnits] = useState(() => {
    try {
      const saved = localStorage.getItem('aldepos_school_units');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeSchoolUnit, setActiveSchoolUnit] = useState(() => {
    try {
      const saved = localStorage.getItem('aldepos_active_school_unit');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Helper to extract all user roles into a normalized Set
  const getUserRoles = (userData) => {
    const roles = new Set();
    if (userData?.account_type) roles.add(String(userData.account_type).toLowerCase().trim());
    if (userData?.role) roles.add(String(userData.role).toLowerCase().trim());
    if (userData?.active_role) roles.add(String(userData.active_role).toLowerCase().trim());
    if (Array.isArray(userData?.roles)) {
      userData.roles.forEach((r) => {
        if (typeof r === 'string') roles.add(r.toLowerCase().trim());
        else if (r?.role_name) roles.add(String(r.role_name).toLowerCase().trim());
        else if (r?.name) roles.add(String(r.name).toLowerCase().trim());
      });
    }
    if (Array.isArray(userData?.school_roles)) {
      userData.school_roles.forEach((sr) => {
        if (typeof sr === 'string') roles.add(sr.toLowerCase().trim());
        else if (sr?.role_name) roles.add(String(sr.role_name).toLowerCase().trim());
        else if (sr?.name) roles.add(String(sr.name).toLowerCase().trim());
      });
    }
    if (Array.isArray(userData?.school_units)) {
      userData.school_units.forEach((su) => {
        if (su?.role) roles.add(String(su.role).toLowerCase().trim());
        if (Array.isArray(su?.roles)) {
          su.roles.forEach((r) => {
            if (typeof r === 'string') roles.add(r.toLowerCase().trim());
            else if (r?.role_name) roles.add(String(r.role_name).toLowerCase().trim());
            else if (r?.name) roles.add(String(r.name).toLowerCase().trim());
          });
        }
      });
    }
    return roles;
  };

  // Helper untuk sinkronisasi profil user & master data satuan pendidikan riil dari Core
  const syncUserAndUnits = async (token = accessToken, currentUser = user) => {
    const currentToken = token || localStorage.getItem('aldepos_access_token');
    if (!currentToken) return;

    try {
      const [meRes, unitsRes] = await Promise.all([
        api.get('/core/auth/me', { headers: { Authorization: `Bearer ${currentToken}` } }).catch(() => null),
        api.get('/core/school-units', { headers: { Authorization: `Bearer ${currentToken}` } }).catch(() => null),
      ]);

      let userData = currentUser;
      if (meRes?.data?.success && meRes.data.data) {
        userData = meRes.data.data.user || meRes.data.data;
        setUser(userData);
        localStorage.setItem('aldepos_user', JSON.stringify(userData));
      }

      const allUnits = unitsRes?.data?.data?.items || (Array.isArray(unitsRes?.data?.data) ? unitsRes.data.data : []);

      if (userData && allUnits.length > 0) {
        const rolesSet = getUserRoles(userData);
        const isUniversalAdmin =
          userData.is_super_admin ||
          rolesSet.has('super_admin') ||
          rolesSet.has('superadmin') ||
          rolesSet.has('admin') ||
          rolesSet.has('admin_yayasan') ||
          rolesSet.has('developer');

        let permittedUnits = allUnits;
        if (!isUniversalAdmin) {
          const allowedIds = new Set();
          if (Array.isArray(userData.roles)) {
            userData.roles.forEach((r) => {
              if (typeof r === 'object' && r.school_unit_id) allowedIds.add(String(r.school_unit_id));
            });
          }
          if (Array.isArray(userData.school_units)) {
            userData.school_units.forEach((su) => {
              if (su.id || su.school_unit_id) allowedIds.add(String(su.id || su.school_unit_id));
            });
          }
          if (allowedIds.size > 0) {
            permittedUnits = allUnits.filter((u) => allowedIds.has(String(u.id)));
          }
        }

        if (permittedUnits.length === 0 && allUnits.length > 0) {
          permittedUnits = allUnits;
        }

        setSchoolUnits(permittedUnits);
        localStorage.setItem('aldepos_school_units', JSON.stringify(permittedUnits));

        // Sinkronkan active school unit
        const savedUnitId = localStorage.getItem('aldepos_active_school_unit_id');
        const savedUnitRaw = localStorage.getItem('aldepos_active_school_unit');
        let initialUnit = null;
        if (savedUnitRaw && savedUnitRaw !== 'undefined') {
          try {
            initialUnit = JSON.parse(savedUnitRaw);
          } catch {
            initialUnit = null;
          }
        }

        if (initialUnit && initialUnit.id && initialUnit.id !== 'all') {
          const matched = permittedUnits.find((u) => String(u.id) === String(initialUnit.id));
          initialUnit = matched || permittedUnits[0] || null;
        } else if (savedUnitId === 'all') {
          initialUnit = { id: 'all', name: 'Semua Satuan (Gabungan)', is_foundation: true };
        } else if (savedUnitId) {
          initialUnit = permittedUnits.find((u) => String(u.id) === String(savedUnitId)) || permittedUnits[0] || null;
        } else {
          initialUnit = permittedUnits[0] || null;
        }

        setActiveSchoolUnit(initialUnit);
        if (initialUnit && initialUnit.id) {
          localStorage.setItem('aldepos_active_school_unit', JSON.stringify(initialUnit));
          localStorage.setItem('aldepos_active_school_unit_id', String(initialUnit.id));
        }
      }
    } catch (err) {
      console.warn('Gagal memverifikasi profil user aktif:', err);
      if (err.response?.status === 401) {
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        setActiveSchoolUnit(null);
        setSchoolUnits([]);
      }
    }
  };

  // Sync user profile & school units when token exists
  useEffect(() => {
    if (accessToken) {
      syncUserAndUnits(accessToken, user);
    }
  }, [accessToken]);

  const login = async (usernameOrPayload, password, schoolUnitId = null) => {
    setIsLoading(true);
    try {
      let finalUsername = '';
      let finalPassword = '';
      let finalSchoolUnitId = null;

      if (typeof usernameOrPayload === 'object' && usernameOrPayload !== null) {
        finalUsername = usernameOrPayload.username || '';
        finalPassword = usernameOrPayload.password || '';
        finalSchoolUnitId = usernameOrPayload.school_unit_id ?? usernameOrPayload.schoolUnitId ?? null;
      } else {
        finalUsername = usernameOrPayload || '';
        finalPassword = password || '';
        finalSchoolUnitId = schoolUnitId || null;
      }

      const response = await api.post('/core/auth/login', {
        username: typeof finalUsername === 'string' ? finalUsername.trim() : finalUsername,
        password: finalPassword,
        school_unit_id: finalSchoolUnitId,
      });

      if (response.data?.success && response.data.data) {
        const { user: userData, access_token, refresh_token } = response.data.data;
        
        setUser(userData);
        setAccessToken(access_token);
        setRefreshToken(refresh_token);

        localStorage.setItem('aldepos_user', JSON.stringify(userData));
        localStorage.setItem('aldepos_access_token', access_token);
        localStorage.setItem('aldepos_refresh_token', refresh_token);

        // Langsung sinkronkan master satuan pendidikan yang valid dari API Core
        await syncUserAndUnits(access_token, userData);

        return { success: true, user: userData };
      }

      return {
        success: false,
        message: response.data?.message || 'Login gagal',
        errors: response.data?.errors || null,
      };
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Kredensial tidak valid atau server tidak dapat dihubungi';

      return {
        success: false,
        message: errorMsg,
        errors: err.response?.data?.errors || null,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (redirectPath) => {
    // Tentukan URL login utama sebelum state/token dihapus
    const targetLogin = typeof redirectPath === 'string' && redirectPath 
      ? redirectPath 
      : '/login';

    try {
      if (refreshToken) {
        await api.post('/core/auth/logout', { refresh_token: refreshToken });
      }
    } catch (e) {
      console.warn('Logout API error:', e);
    } finally {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      setActiveSchoolUnit(null);
      setSchoolUnits([]);
      localStorage.clear();
      window.location.href = targetLogin;
    }
  };

  const changeActiveSchoolUnit = (unit) => {
    setActiveSchoolUnit(unit);
    if (unit && unit.id && unit.id !== 'all') {
      localStorage.setItem('aldepos_active_school_unit', JSON.stringify(unit));
      localStorage.setItem('aldepos_active_school_unit_id', String(unit.id));
    } else {
      localStorage.removeItem('aldepos_active_school_unit');
      localStorage.setItem('aldepos_active_school_unit_id', 'all');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        schoolUnits,
        activeSchoolUnit,
        isLoading,
        isAuthenticated: !!accessToken,
        login,
        logout,
        changeActiveSchoolUnit,
        refreshSchoolUnits: syncUserAndUnits,
        refreshUserData: syncUserAndUnits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
