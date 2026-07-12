'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

type Theme = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolved: Resolved;
}

const STORAGE_KEY = 'luka-theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

function getSystemPreference(): Resolved {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function resolveTheme(theme: Theme): Resolved {
  return theme === 'system' ? getSystemPreference() : theme;
}

function applyTheme(resolved: Resolved) {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<Resolved>('dark');

  // Read persisted preference on mount.
  useEffect(() => {
    let stored: Theme = 'system';
    try {
      const value = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (value === 'light' || value === 'dark' || value === 'system') {
        stored = value;
      }
    } catch {
      // ignore storage errors
    }
    setThemeState(stored);
    const next = resolveTheme(stored);
    setResolved(next);
    applyTheme(next);
  }, []);

  // React to OS changes while in system mode.
  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const next = getSystemPreference();
      setResolved(next);
      applyTheme(next);
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
    const resolvedNext = resolveTheme(next);
    setResolved(resolvedNext);
    applyTheme(resolvedNext);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
