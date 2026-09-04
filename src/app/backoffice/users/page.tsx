'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BackofficeUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

export default function BackofficeAdmins() {
  const router = useRouter();
  const [users, setUsers] = useState<BackofficeUser[] | null>(null);
  const [me, setMe] = useState<{ email: string; bootstrap: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/backoffice/users');
    if (res.status === 401) {
      router.replace('/backoffice/login');
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      setError(json.error || 'Failed to load admins');
      return;
    }
    setUsers(json.data as BackofficeUser[]);
  }, [router]);

  useEffect(() => {
    (async () => {
      const meRes = await fetch('/api/backoffice/me');
      if (meRes.status === 401) {
        router.replace('/backoffice/login');
        return;
      }
      const meJson = await meRes.json().catch(() => ({}));
      if (meJson?.user) setMe({ email: meJson.user.email, bootstrap: !!meJson.user.bootstrap });
      await load();
    })();
  }, [router, load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch('/api/backoffice/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setFormError(json.error || 'Failed to create admin');
        return;
      }
      setName('');
      setEmail('');
      setPassword('');
      await load();
    } catch {
      setFormError('Network error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, label: string) => {
    if (!window.confirm(`Remove back-office admin "${label}"?`)) return;
    const res = await fetch(`/api/backoffice/users/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      setError(json.error || 'Failed to remove admin');
      return;
    }
    await load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="font-bold text-lg">🛡️ Luka Back Office</div>
          <Link
            href="/backoffice"
            className="text-sm text-muted-foreground hover:text-foreground rounded-md px-3 py-2"
          >
            ← Customers
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-xl font-semibold mb-1">Back-office admins</h1>
        <p className="text-sm text-muted-foreground mb-6">
          People who can sign in to the back office. {me ? `Signed in as ${me.email}.` : null}
        </p>

        {me?.bootstrap ? (
          <div className="mb-6 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
            You’re signed in with the default bootstrap login. Create a real admin below — once one
            exists, the default credentials stop working.
          </div>
        ) : null}

        {error ? <p className="text-red-500 text-sm mb-4">{error}</p> : null}

        <form onSubmit={create} className="rounded-xl border border-border bg-card p-5 mb-8 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="block text-xs text-muted-foreground mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Jane Doe"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="jane@luka.app"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs text-muted-foreground mb-1">Password (min 8)</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>
          {formError ? <p className="sm:col-span-3 text-sm text-red-500">{formError}</p> : null}
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Adding…' : 'Add admin'}
            </button>
          </div>
        </form>

        {users === null ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-sm">No admins yet — add the first one above.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Name</th>
                  <th className="text-left font-medium px-4 py-3">Email</th>
                  <th className="text-left font-medium px-4 py-3">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(u.id, u.email)}
                        className="text-sm text-red-500 hover:underline underline-offset-4"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
