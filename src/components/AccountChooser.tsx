'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Account } from '@/types/account';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';

// The profile gate shown after login when no account has been chosen this
// session (Netflix-style). Picking an account enters its mode-specific
// experience. Auto-chooses when exactly one account is accessible.
export default function AccountChooser() {
  const { accounts, accountsLoading, lastAccountId, chooseAccount } = useActiveAccount();

  // Auto-enter when there's exactly one account to choose from.
  useEffect(() => {
    if (!accountsLoading && accounts.length === 1) {
      chooseAccount(accounts[0].id);
    }
  }, [accountsLoading, accounts, chooseAccount]);

  const avatarFor = (account: Account) => (account.mode === 'BUSINESS' ? '🏢' : '👤');
  const modeLabel = (account: Account) =>
    account.mode === 'BUSINESS' ? 'Business' : 'Personal';

  if (accountsLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your accounts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Choose an account</h1>
          <p className="text-muted-foreground">
            Select which account you want to work in.
          </p>
        </div>

        {accounts.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <span className="text-5xl mb-4 block">🏦</span>
            <h2 className="text-xl font-semibold text-foreground mb-2">No accounts yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first account to get started.
            </p>
            <Link
              href="/accounts"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              ➕ New account
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.map((account) => {
              const isLast = account.id === lastAccountId;
              return (
                <button
                  key={account.id}
                  onClick={() => chooseAccount(account.id)}
                  className={`group text-left rounded-2xl border p-6 transition-all hover:-translate-y-0.5 ${
                    isLast
                      ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/40'
                      : 'border-border bg-card hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl">{avatarFor(account)}</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        account.mode === 'BUSINESS'
                          ? 'bg-purple-500/15 text-purple-500'
                          : 'bg-blue-500/15 text-blue-500'
                      }`}
                    >
                      {modeLabel(account)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground truncate" title={account.name}>
                    {account.name}
                  </h3>
                  {account.handle && (
                    <p className="text-sm text-muted-foreground truncate">@{account.handle}</p>
                  )}
                  {isLast && (
                    <p className="mt-3 text-xs font-medium text-blue-500">Last used</p>
                  )}
                </button>
              );
            })}

            {/* New-account affordance */}
            <Link
              href="/accounts"
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center transition-colors hover:bg-accent hover:border-blue-500 min-h-[160px]"
            >
              <span className="text-4xl mb-2">➕</span>
              <span className="text-sm font-medium text-foreground">New account</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
