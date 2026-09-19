'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/api';

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to change password');
        return;
      }
      setOk(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch {
      setError('Network error — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <div>
        <label className="block text-sm mb-1 text-muted-foreground">Current password</label>
        <input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" className={field} />
      </div>
      <div>
        <label className="block text-sm mb-1 text-muted-foreground">New password</label>
        <input type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" className={field} />
      </div>
      <div>
        <label className="block text-sm mb-1 text-muted-foreground">Confirm new password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" className={field} />
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {ok ? <p className="text-sm text-green-600">Password updated.</p> : null}

      <button
        type="submit"
        disabled={busy || !current || !next || !confirm}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'Updating…' : 'Change password'}
      </button>
    </form>
  );
}
