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

export function ActiveAccountProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(null);
  const [lastAccountId, setLastAccountId] = useState<string | null>(null);
  const [chosen, setChosen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  // Restore the last-used account id (for pre-highlighting the chooser).
  useEffect(() => {
    setLastAccountId(readStored(LAST_ACCOUNT_KEY) ?? readStored(ACTIVE_ACCOUNT_KEY));
    setIsReady(true);
  }, []);

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

  // Sign-out returns to the chooser and drops the active selection.
  useEffect(() => {
    if (!isAuthenticated) {
      setActiveAccountIdState(null);
      setChosen(false);
    }
  }, [isAuthenticated]);

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
    },
    [setActiveAccountId],
  );

  const switchAccount = useCallback(() => {
    setChosen(false);
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
