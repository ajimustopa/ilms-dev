import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('aldepos_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem('aldepos_access_token') || null;
  });

  const [refreshToken, setRefreshToken] = useState(() => {
    return localStorage.getItem('aldepos_refresh_token') || null;
  });

  const [schoolUnits, setSchoolUnits] = useState(() => {
    const saved = localStorage.getItem('aldepos_school_units');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeSchoolUnit, setActiveSchoolUnit] = useState(() => {
    const saved = localStorage.getItem('aldepos_active_school_unit');
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync user profile when token exists
  useEffect(() => {
    const fetchMe = async () => {
      if (accessToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data.data) {
            const userData = res.data.data.user;
            setUser(userData);
            localStorage.setItem('aldepos_user', JSON.stringify(userData));

            const units = userData.roles?.map((r) => ({
              id: r.school_unit_id,
              name: r.school_name,
              role_name: r.role_name,
            })) || [];
            setSchoolUnits(units);
            localStorage.setItem('aldepos_school_units', JSON.stringify(units));

            if (!activeSchoolUnit && units.length > 0) {
              setActiveSchoolUnit(units[0]);
              localStorage.setItem('aldepos_active_school_unit', JSON.stringify(units[0]));
              localStorage.setItem('aldepos_active_school_unit_id', String(units[0].id));
            }
          }
        } catch (err) {
          console.warn('Gagal memverifikasi profil user aktif:', err);
        }
      }
    };

    fetchMe();
  }, [accessToken]);

  const login = async (username, password, schoolUnitId = null) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
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

  const logout = async () => {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
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
      window.location.href = '/login';
    }
  };

  const changeActiveSchoolUnit = (unit) => {
    setActiveSchoolUnit(unit);
    if (unit) {
      localStorage.setItem('aldepos_active_school_unit', JSON.stringify(unit));
      localStorage.setItem('aldepos_active_school_unit_id', String(unit.id));
    } else {
      localStorage.removeItem('aldepos_active_school_unit');
      localStorage.removeItem('aldepos_active_school_unit_id');
    }
    // Refresh window to re-fetch context-dependent data
    window.location.reload();
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
