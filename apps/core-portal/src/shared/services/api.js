import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token & Active School Unit ID
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('aldepos_access_token');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const activeSchoolUnitId = localStorage.getItem('aldepos_active_school_unit_id');
    if (activeSchoolUnitId) {
      config.headers['X-School-Unit-ID'] = activeSchoolUnitId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto Refresh Token on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Abaikan jika error berasal dari login atau refresh itu sendiri
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/core/auth/login') &&
      !originalRequest.url.includes('/core/auth/refresh') &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('aldepos_refresh_token');
      if (!refreshToken) {
        // Logout & arahkan ke login jika tidak ada refresh token
        localStorage.clear();
        window.location.href = '/core/login';
        return Promise.reject(error);
      }

      try {
        const { data: res } = await axios.post(`${API_BASE_URL}/core/auth/refresh`, {
          refresh_token: refreshToken,
        });

        if (res.success && res.data?.access_token) {
          const newAccessToken = res.data.access_token;
          localStorage.setItem('aldepos_access_token', newAccessToken);

          if (res.data.refresh_token) {
            localStorage.setItem('aldepos_refresh_token', res.data.refresh_token);
          }

          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          return api(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.clear();
        window.location.href = '/core/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
