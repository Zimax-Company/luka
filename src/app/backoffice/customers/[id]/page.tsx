'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Detail {
  customer: { id: string; name: string; rootEmail: string; plan: string; status: string; createdAt: string };
  usage: { users: number; accounts: number; entries: number; accountsByType: Record<string, number> };
  users: { id: string; name: string; email: string; role: string; createdAt: string }[];
  accounts: { id: string; name: string; type: string; mode: string; currency: string; createdAt: string }[];
  subscription: {
    plan: string;
    status: string;
    history: {
      id: string;
      plan: string;
      type: string;
      amount: number | null;
      currency: string | null;
      note: string | null;
      createdAt: string;
    }[];
  };
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

export default function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetch('/api/backoffice/me');
        if (me.status === 401) {
          router.replace('/backoffice/login');
          return;
        }
        const res = await fetch(`/api/backoffice/customers/${id}`);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setError(json.error || 'Failed to load customer');
          return;
        }
        setData(json.data as Detail);
      } catch {
        if (!cancelled) setError('Network error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="font-bold text-lg">🛡️ Luka Back Office</div>
          <Link
            href="/backoffice"
            className="text-sm text-muted-foreground hover:text-foreground rounded-md px-3 py-2"
          >
            ← All customers
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {error ? <p className="text-red-500 text-sm">{error}</p> : null}
        {!data && !error ? <p className="text-muted-foreground text-sm">Loading…</p> : null}

        {data ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold">{data.customer.name}</h1>
              <p className="text-sm text-muted-foreground">{data.customer.rootEmail}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Customer since {fmtDate(data.customer.createdAt)}
              </p>
            </div>

            {/* Usage */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Users (sign-ups)', value: data.usage.users },
                { label: 'Accounts', value: data.usage.accounts },
                { label: 'Entries', value: data.usage.entries },
                { label: 'Plan', value: data.subscription.plan },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-semibold mt-1">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Subscription */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Subscription</h2>
              <div className="rounded-xl border border-border bg-card p-4 mb-4 flex flex-wrap gap-6">
                <div>
                  <div className="text-xs text-muted-foreground">Plan</div>
                  <div className="font-medium">{data.subscription.plan}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-medium">{data.subscription.status}</div>
                </div>
              </div>
              {data.subscription.history.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="text-left font-medium px-4 py-3">Date</th>
                        <th className="text-left font-medium px-4 py-3">Type</th>
                        <th className="text-left font-medium px-4 py-3">Plan</th>
                        <th className="text-right font-medium px-4 py-3">Amount</th>
                        <th className="text-left font-medium px-4 py-3">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.subscription.history.map(h => (
                        <tr key={h.id} className="border-t border-border">
                          <td className="px-4 py-3">{fmtDate(h.createdAt)}</td>
                          <td className="px-4 py-3">{h.type}</td>
                          <td className="px-4 py-3">{h.plan}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {h.amount != null ? `${h.currency ?? ''} ${h.amount}`.trim() : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{h.note ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No billing history.</p>
              )}
            </section>

            {/* Accounts */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Accounts ({data.accounts.length})</h2>
              {data.accounts.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="text-left font-medium px-4 py-3">Name</th>
                        <th className="text-left font-medium px-4 py-3">Type</th>
                        <th className="text-left font-medium px-4 py-3">Mode</th>
                        <th className="text-left font-medium px-4 py-3">Currency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.accounts.map(a => (
                        <tr key={a.id} className="border-t border-border">
                          <td className="px-4 py-3 font-medium">{a.name}</td>
                          <td className="px-4 py-3">{a.type}</td>
                          <td className="px-4 py-3">{a.mode}</td>
                          <td className="px-4 py-3">{a.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No accounts.</p>
              )}
            </section>

            {/* Users */}
            <section>
              <h2 className="text-lg font-semibold mb-3">Users ({data.users.length})</h2>
              {data.users.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="text-left font-medium px-4 py-3">Name</th>
                        <th className="text-left font-medium px-4 py-3">Email</th>
                        <th className="text-left font-medium px-4 py-3">Role</th>
                        <th className="text-left font-medium px-4 py-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map(u => (
                        <tr key={u.id} className="border-t border-border">
                          <td className="px-4 py-3 font-medium">{u.name}</td>
                          <td className="px-4 py-3">{u.email}</td>
                          <td className="px-4 py-3">{u.role}</td>
                          <td className="px-4 py-3">{fmtDate(u.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No users.</p>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
