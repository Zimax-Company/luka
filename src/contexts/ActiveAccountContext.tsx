'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Account } from '@/types/account';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Tracks which account the user is currently working in (Netflix-style profile),
// mirroring the mobile ActiveAccountContext. After login the user must CHOOSE an
// account (`chosen`) before the app renders; the active account's mode then
// drives the whole experience. The last-used id is persisted so the chooser can
// pre-highlight it. Switching returns to the chooser.

const ACTIVE_ACCOUNT_KEY = 'luka.activeAccountId';
const LAST_ACCOUNT_KEY = 'luka.lastAccountId';
const CHOSEN_KEY = 'luka.accountChosen';

interface ActiveAccountContextValue {
  activeAccountId: string | null;
  activeAccount: Account | null; // resolved from the accounts list
  accounts: Account[]; // accounts accessible to the current user
  accountsLoading: boolean;
  lastAccountId: string | null; // remembered across sessions (for the chooser)
  chosen: boolean; // has an account been entered this session?
  chooseAccount: (id: string) => void;
  switchAccount: () => void; // leave the current account -> back to the chooser
  setActiveAccountId: (id: string | null) => void;
  refreshAccounts: () => Promise<void>;
  isReady: boolean;
}

const ActiveAccountContext = createContext<ActiveAccountContextValue | undefined>(
  undefined,
);

function readStored(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeStored(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function ActiveAccountProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(null);
  const [lastAccountId, setLastAccountId] = useState<string | null>(null);
  const [chosen, setChosen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  // Restore the last-used account id (for pre-highlighting the chooser).
  useEffect(() => {
    setLastAccountId(readStored(LAST_ACCOUNT_KEY) ?? readStored(ACTIVE_ACCOUNT_KEY));
  }, []);

  // Restore the active account + chosen flag once auth resolves. This keeps the
  // active account's mode (personal vs business) stable across page navigations
  // and refreshes — without it, loading a sub-route like /orders would resolve
  // no active account and the nav would fall back to the personal menu.
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      const stored = readStored(ACTIVE_ACCOUNT_KEY);
      if (stored) {
        setActiveAccountIdState(stored);
        if (readStored(CHOSEN_KEY) === '1') setChosen(true);
      }
    } else {
      // Real sign-out (after auth has resolved): drop the selection and its
      // persisted markers so the chooser reappears on next sign-in.
      setActiveAccountIdState(null);
      setChosen(false);
      removeStored(ACTIVE_ACCOUNT_KEY);
      removeStored(CHOSEN_KEY);
    }
    setIsReady(true);
  }, [isAuthenticated, authLoading]);

  const refreshAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const res = await authFetch('/api/accounts');
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setAccounts(json.data as Account[]);
      }
    } catch {
      // Non-critical: the chooser simply shows no accounts on failure.
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  // Load accessible accounts once authenticated; clear on sign-out.
  useEffect(() => {
    if (isAuthenticated) {
      refreshAccounts();
    } else {
      setAccounts([]);
    }
  }, [isAuthenticated, refreshAccounts]);

  const setActiveAccountId = useCallback((id: string | null) => {
    setActiveAccountIdState(id);
    if (id) {
      setLastAccountId(id);
      try {
        window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
        window.localStorage.setItem(LAST_ACCOUNT_KEY, id);
      } catch {
        // Ignore storage failures (e.g. private mode); state still updates.
      }
    }
  }, []);

  const chooseAccount = useCallback(
    (id: string) => {
      setActiveAccountId(id);
      setChosen(true);
      try {
        window.localStorage.setItem(CHOSEN_KEY, '1');
      } catch {
        // Ignore storage failures; state still updates for this session.
      }
    },
    [setActiveAccountId],
  );

  // Return to the chooser. Clear the persisted "chosen" marker so a refresh
  // keeps showing the chooser (the last account id is kept for pre-highlighting).
  const switchAccount = useCallback(() => {
    setChosen(false);
    removeStored(CHOSEN_KEY);
  }, []);

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  );

  const value = useMemo(
    () => ({
      activeAccountId,
      activeAccount,
      accounts,
      accountsLoading,
      lastAccountId,
      chosen,
      chooseAccount,
      switchAccount,
      setActiveAccountId,
      refreshAccounts,
      isReady,
    }),
    [
      activeAccountId,
      activeAccount,
      accounts,
      accountsLoading,
      lastAccountId,
      chosen,
      chooseAccount,
      switchAccount,
      setActiveAccountId,
      refreshAccounts,
      isReady,
    ],
  );

  return (
    <ActiveAccountContext.Provider value={value}>
      {children}
    </ActiveAccountContext.Provider>
  );
}

export function useActiveAccount(): ActiveAccountContextValue {
  const ctx = useContext(ActiveAccountContext);
  if (!ctx) throw new Error('useActiveAccount must be used within ActiveAccountProvider');
  return ctx;
}
