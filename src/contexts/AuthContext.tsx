'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserPermissions, AuthResponse } from '@/types/user';

interface AuthContextType {
  currentUser: User | null;
  permissions: UserPermissions | null;
  isAuthenticated: boolean;
  login: (authData: AuthResponse) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const login = (authData: AuthResponse) => {
    console.log('🔐 Setting user session:', authData.user.name);
    setCurrentUser(authData.user);
    setPermissions(authData.permissions);
    
    // Store in localStorage for persistence (in production, use secure storage)
    localStorage.setItem('luka_auth', JSON.stringify(authData));
  };

  const logout = () => {
    console.log('🚪 Logging out user:', currentUser?.name);
    setCurrentUser(null);
    setPermissions(null);
    localStorage.removeItem('luka_auth');
  };

  // Load user session on app start
  useEffect(() => {
    try {
      const stored = localStorage.getItem('luka_auth');
      if (stored) {
        const authData: AuthResponse = JSON.parse(stored);
        console.log('🔄 Restoring user session:', authData.user.name);
        setCurrentUser(authData.user);
        setPermissions(authData.permissions);
      }
    } catch (error) {
      console.error('❌ Failed to restore session:', error);
      localStorage.removeItem('luka_auth');
    } finally {
      setLoading(false);
    }
  }, []);

  const isAuthenticated = !!currentUser;

  return (
    <AuthContext.Provider value={{
      currentUser,
      permissions,
      isAuthenticated,
      login,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}
