'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CustomerUsage {
  users: number;
  accounts: number;
  entries: number;
  accountsByType: Record<string, number>;
}
interface CustomerRow {
  id: string;
  name: string;
  rootEmail: string;
  plan: string;
  status: string;
  createdAt: string;
  usage: CustomerUsage;
}

function typeSummary(byType: Record<string, number>): string {
  const entries = Object.entries(byType);
  if (entries.length === 0) return '—';
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t.toLowerCase()} ${n}`)
    .join(', ');
}

export default function BackofficeDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    await fetch('/api/backoffice/logout', { method: 'POST' }).catch(() => {});
    router.replace('/backoffice/login');
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetch('/api/backoffice/me');
        if (me.status === 401) {
          router.replace('/backoffice/login');
          return;
        }
        const res = await fetch('/api/backoffice/customers');
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setError(json.error || 'Failed to load customers');
          return;
        }
        setRows(json.data as CustomerRow[]);
      } catch {
        if (!cancelled) setError('Network error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const totals = (rows ?? []).reduce(
    (acc, r) => {
      acc.customers += 1;
      acc.users += r.usage.users;
      acc.accounts += r.usage.accounts;
      acc.entries += r.usage.entries;
      return acc;
    },
    { customers: 0, users: 0, accounts: 0, entries: 0 },
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="font-bold text-lg">🛡️ Luka Back Office</div>
          <button
            onClick={logout}
            className="text-sm text-muted-foreground hover:text-foreground rounded-md px-3 py-2"
          >
            🚪 Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-xl font-semibold mb-6">Customers</h1>

        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Customers', value: totals.customers },
            { label: 'Users (sign-ups)', value: totals.users },
            { label: 'Accounts', value: totals.accounts },
            { label: 'Entries', value: totals.entries },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {error ? <p className="text-red-500 text-sm mb-4">{error}</p> : null}

        {rows === null && !error ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : rows && rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No customers yet.</p>
        ) : rows ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Customer</th>
                  <th className="text-left font-medium px-4 py-3">Plan</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">Users</th>
                  <th className="text-right font-medium px-4 py-3">Accounts</th>
                  <th className="text-right font-medium px-4 py-3">Entries</th>
                  <th className="text-left font-medium px-4 py-3">Account types</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.rootEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">{r.plan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                          r.status === 'ACTIVE'
                            ? 'bg-green-500/15 text-green-500'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.usage.users}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.usage.accounts}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.usage.entries}</td>
                    <td className="px-4 py-3 text-muted-foreground">{typeSummary(r.usage.accountsByType)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/backoffice/customers/${r.id}`}
                        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </div>
  );
}
