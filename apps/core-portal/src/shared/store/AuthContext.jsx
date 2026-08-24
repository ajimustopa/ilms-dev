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

  // Sync user profile & school units when token exists
  useEffect(() => {
    const fetchMeAndUnits = async () => {
      if (accessToken) {
        try {
          const [meRes, unitsRes] = await Promise.all([
            api.get('/core/auth/me'),
            api.get('/core/school-units').catch(() => ({ data: { data: { items: [] } } }))
          ]);

          if (meRes.data?.success && meRes.data.data) {
            const userData = meRes.data.data.user || meRes.data.data;
            if (userData) {
              setUser(userData);
              localStorage.setItem('aldepos_user', JSON.stringify(userData));

              let allUnits = unitsRes.data?.data?.items || (Array.isArray(unitsRes.data?.data) ? unitsRes.data.data : []);
              
              // Check if user is super_admin or admin_yayasan
              const isAdmin = userData.account_type === 'admin' || userData.account_type === 'super_admin' || 
                              userData.roles?.some(r => r.role_name === 'admin_yayasan' || r.role_name === 'super_admin');

            let permittedUnits = allUnits;
            if (!isAdmin && userData.roles && userData.roles.length > 0) {
              const allowedIds = userData.roles.map(r => r.school_unit_id).filter(Boolean);
              if (allowedIds.length > 0) {
                permittedUnits = allUnits.filter(u => allowedIds.includes(u.id));
              }
            }

            if (permittedUnits.length === 0 && allUnits.length > 0) {
              permittedUnits = allUnits;
            }

            setSchoolUnits(permittedUnits);
            localStorage.setItem('aldepos_school_units', JSON.stringify(permittedUnits));

            // Sync active school unit
            const savedUnitId = localStorage.getItem('aldepos_active_school_unit_id');
            let initialUnit = null;
            if (savedUnitId === 'all' && isAdmin) {
              initialUnit = null;
            } else if (savedUnitId) {
              initialUnit = permittedUnits.find(u => String(u.id) === String(savedUnitId)) || permittedUnits[0] || null;
            } else {
              initialUnit = permittedUnits[0] || null;
            }

            setActiveSchoolUnit(initialUnit);
            if (initialUnit) {
              localStorage.setItem('aldepos_active_school_unit', JSON.stringify(initialUnit));
              localStorage.setItem('aldepos_active_school_unit_id', String(initialUnit.id));
            }
          }
        }
      } catch (err) {
          console.warn('Gagal memverifikasi profil user aktif:', err);
        }
      }
    };

    fetchMeAndUnits();
  }, [accessToken]);

  const login = async (username, password, schoolUnitId = null) => {
    setIsLoading(true);
    try {
      const response = await api.post('/core/auth/login', {
        username: username.trim(),
        password,
        school_unit_id: schoolUnitId,
      });

      if (response.data?.success && response.data.data) {
        const { user: userData, access_token, refresh_token } = response.data.data;
        
        setUser(userData);
        setAccessToken(access_token);
        setRefreshToken(refresh_token);

        const units = userData.roles?.map((r) => ({
          id: r.school_unit_id,
          name: r.school_name,
          role_name: r.role_name,
        })) || [];
        setSchoolUnits(units);

        const activeUnit = userData.active_school_unit || (units.length > 0 ? units[0] : null);
        setActiveSchoolUnit(activeUnit);

        localStorage.setItem('aldepos_user', JSON.stringify(userData));
        localStorage.setItem('aldepos_access_token', access_token);
        localStorage.setItem('aldepos_refresh_token', refresh_token);
        localStorage.setItem('aldepos_school_units', JSON.stringify(units));
        if (activeUnit) {
          localStorage.setItem('aldepos_active_school_unit', JSON.stringify(activeUnit));
          localStorage.setItem('aldepos_active_school_unit_id', String(activeUnit.id));
        }

        return { success: true };
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
    // Tentukan URL login aplikasi asal sebelum state/token dihapus
    const targetLogin = typeof redirectPath === 'string' && redirectPath 
      ? redirectPath 
      : getAppLoginPath(window.location.pathname);

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
    if (unit && unit.id) {
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
