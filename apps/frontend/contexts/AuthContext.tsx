'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore, AuthUser } from '../stores/authStore';
import api from '../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  // On mount, try to restore session from stored user data
  useEffect(() => {
    const storedUser         = typeof window !== 'undefined' ? localStorage.getItem('getidfix_user') : null;
    const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('getidfix_refresh_token') : null;

    if (storedUser && storedRefreshToken && !user) {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        api.post('/auth/refresh', { userId: parsedUser.id, refreshToken: storedRefreshToken })
          .then((res) => {
            setAuth(parsedUser, res.data.data.accessToken);
          })
          .catch(() => {
            localStorage.removeItem('getidfix_user');
            localStorage.removeItem('getidfix_refresh_token');
          })
          .finally(() => setIsLoading(false));
      } catch {
        localStorage.removeItem('getidfix_user');
        localStorage.removeItem('getidfix_refresh_token');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData, accessToken: token, refreshToken } = res.data.data;
    setAuth(userData, token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('getidfix_user', JSON.stringify(userData));
      if (refreshToken) localStorage.setItem('getidfix_refresh_token', refreshToken);
    }
  };

  const register = async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    const { user: userData, accessToken: token, refreshToken } = res.data.data;
    setAuth(userData, token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('getidfix_user', JSON.stringify(userData));
      if (refreshToken) localStorage.setItem('getidfix_refresh_token', refreshToken);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      clearAuth();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('getidfix_user');
        localStorage.removeItem('getidfix_refresh_token');
        window.location.href = '/login';
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
