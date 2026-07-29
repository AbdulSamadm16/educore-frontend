import { createContext, useCallback, useMemo, useState } from 'react';
import apiClient from '../services/api';

export const AuthContext = createContext(null);


const emptyAuth = {
  user: null,
  accessToken: null,
  refreshToken: null,
};

const canUseStorage = () => typeof window !== 'undefined' && window.localStorage;

const removeStoredAuth = () => {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

const readStoredAuth = () => {
  if (!canUseStorage()) {
    return emptyAuth;
  }

  const storedUser = localStorage.getItem('user');
  const storedAccessToken = localStorage.getItem('accessToken');
  const storedRefreshToken = localStorage.getItem('refreshToken');

  if (!storedUser || !storedAccessToken) {
    return emptyAuth;
  }

  try {
    const user = JSON.parse(storedUser);
    
    // Safety check: ensure user has required fields for the new UI
    if (!user || !user.role) {
      removeStoredAuth();
      return emptyAuth;
    }

    return {
      user,
      accessToken: storedAccessToken,
      refreshToken: storedRefreshToken,
    };
  } catch (error) {
    console.error('Failed to parse stored auth data:', error);
    removeStoredAuth();
    return emptyAuth;
  }
};

const writeStoredAuth = ({ user, accessToken, refreshToken }) => {
  if (!canUseStorage()) {
    return;
  }

  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
  }

  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(readStoredAuth);
  const [error, setError] = useState(null);

  const clearAuth = useCallback(() => {
    setAuth(emptyAuth);
    setError(null);
    removeStoredAuth();
  }, []);

  const login = useCallback((authData) => {
    const nextAuth = {
      user: authData.user || null,
      accessToken: authData.accessToken || null,
      refreshToken: authData.refreshToken || null,
    };

    setAuth(nextAuth);
    setError(null);
    removeStoredAuth();
    writeStoredAuth(nextAuth);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = auth.refreshToken;

    try {
      await apiClient.post(
        '/auth/logout',
        refreshToken ? { refreshToken } : {},
        { skipAuthRefresh: true }
      );
    } catch {
      // Local sign-out should still finish if the server session is already gone.
    } finally {
      clearAuth();
    }
  }, [auth.refreshToken, clearAuth]);

  const updateUser = useCallback((updatedUser) => {
    setAuth((currentAuth) => {
      const nextAuth = {
        ...currentAuth,
        user: updatedUser,
      };

      writeStoredAuth(nextAuth);
      return nextAuth;
    });
  }, []);

  const setAuthError = useCallback((errorMessage) => {
    setError(errorMessage);
  }, []);

  const clearAuthError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(() => ({
    user: auth.user,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    isLoading: false,
    error,
    login,
    logout,
    clearAuth,
    updateUser,
    setAuthError,
    clearAuthError,
    isAuthenticated: Boolean(auth.accessToken && auth.user),
  }), [
    auth,
    clearAuth,
    clearAuthError,
    error,
    login,
    logout,
    setAuthError,
    updateUser,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
