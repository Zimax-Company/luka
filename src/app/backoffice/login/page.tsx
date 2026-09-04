'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BackofficeLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bootstrap, setBootstrap] = useState<{ email: string; password: string } | null>(null);

  // First run (no admins yet): surface the default credentials so the operator
  // can get in and create real accounts. Once an admin exists, this disappears.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/backoffice/status');
        const json = await res.json().catch(() => ({}));
        if (json?.bootstrap && json?.defaults) {
          setBootstrap(json.defaults);
          setEmail(prev => prev || json.defaults.email);
        }
      } catch {
        // ignore — the form still works
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/backoffice/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.error || 'Login failed');
        return;
      }
      router.replace('/backoffice');
    } catch {
      setError('Network error — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold">🛡️ Luka Back Office</div>
          <p className="text-sm text-muted-foreground mt-1">Platform administration</p>
        </div>

        {bootstrap ? (
          <div className="mb-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
            First run — sign in with the default admin, then create real accounts:
            <div className="mt-2 font-mono text-xs">
              {bootstrap.email} / {bootstrap.password}
            </div>
          </div>
        ) : null}

        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold mb-4">Sign in</h1>

          <label className="block text-sm mb-1 text-muted-foreground" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="username"
            className="mb-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="owner@luka.app"
          />

          <label className="block text-sm mb-1 text-muted-foreground" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mb-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="••••••••"
          />

          {error ? <p className="mb-4 text-sm text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
