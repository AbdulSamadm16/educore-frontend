import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const clearStoredAuth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

const getStoredRefreshToken = () => localStorage.getItem('refreshToken');

const getLoginPath = () => {
  return '/login';
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important: Send cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      if (config.headers && typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  refreshQueue = [];
};

// Response interceptor to handle token refresh and errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isLoginRequest = originalRequest?.url?.includes('/auth/login');
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh-token');
    const isVerifyEmailRequest = originalRequest?.url?.includes('/auth/verify-email');

    // Handle 401 - Try to refresh token (skip for login-related requests)
    if (
      error.response?.status === 401
      && originalRequest
      && !originalRequest._retry
      && !originalRequest.skipAuthRefresh
      && !isRefreshRequest
      && !isLoginRequest
      && !isVerifyEmailRequest
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getStoredRefreshToken();

        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          refreshToken ? { refreshToken } : {},
          {
            withCredentials: true,
          }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data || {};
        if (!accessToken) {
          throw new Error('Token refresh did not return an access token');
        }

        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        processQueue(null, accessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        if (originalRequest?.method?.toUpperCase() === 'DELETE') {
          return Promise.reject(error);
        }

        // If refresh fails, clear auth and redirect to login
        const loginPath = getLoginPath();
        clearStoredAuth();

        const isAuthPage = window.location.pathname === '/login' || 
                          window.location.pathname === '/register' ||
                          window.location.pathname.endsWith('-login');

        if (!isAuthPage) {
          window.location.href = loginPath;
        }

        return Promise.reject(refreshError);
      }
    }

    if (error.response?.data?.errorCode === 'INSTITUTION_REQUIRED') {
      window.location.href = '/institution-setup-required';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Collapsing/Deduplicating identical concurrent GET requests to optimize performance
const originalGet = apiClient.get;
const activeGetPromises = new Map();

apiClient.get = function (url, config) {
  // If the request contains an abort signal or cancel token, bypass deduplication entirely
  if (config?.signal || config?.cancelToken) {
    return originalGet.call(this, url, config);
  }

  const token = localStorage.getItem('accessToken');
  const headers = { ...config?.headers };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  const key = JSON.stringify({ url, params: config?.params, headers });
  
  if (activeGetPromises.has(key)) {
    return activeGetPromises.get(key);
  }
  
  const promise = originalGet.call(this, url, config)
    .then((response) => {
      activeGetPromises.delete(key);
      return response;
    })
    .catch((error) => {
      activeGetPromises.delete(key);
      throw error;
    });
    
  activeGetPromises.set(key, promise);
  return promise;
};

export default apiClient;
