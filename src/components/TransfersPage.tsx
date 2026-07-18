'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/api';

type TransferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note: string | null;
  date: string;
  status: TransferStatus;
  senderName: string | null;
  fromAccountName: string | null;
  fromHandle: string | null;
  toAccountName: string | null;
  toHandle: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
}

type Box = 'incoming' | 'outgoing';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const relativeTime = (iso: string) => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
};

const statusBadge = (status: TransferStatus) => {
  switch (status) {
    case 'ACCEPTED':
      return 'bg-green-900/50 text-green-300';
    case 'REJECTED':
      return 'bg-red-900/50 text-red-300';
    default:
      return 'bg-yellow-900/50 text-yellow-300';
  }
};

export default function TransfersPage() {
  const [box, setBox] = useState<Box>('incoming');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchTransfers = useCallback(async (which: Box) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/transfers?box=${which}`);
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load postings');
      setTransfers(json.data as Transfer[]);
    } catch {
      setError('Could not load postings. Please try again.');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers(box);
  }, [box, fetchTransfers]);

  const decide = async (id: string, action: 'accept' | 'reject') => {
    setBusyId(id);
    setError(null);
    try {
      const res = await authFetch(`/api/transfers/${id}/${action}`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || `Failed to ${action} posting`);
      }
      await fetchTransfers(box);
    } catch {
      setError(`Could not ${action} the posting. Please try again.`);
    } finally {
      setBusyId(null);
    }
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
    }`;

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">🔄 Postings</h1>
        <p className="text-muted-foreground">Review incoming postings and track what you have sent</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button className={tabClass(box === 'incoming')} onClick={() => setBox('incoming')}>
          Incoming
        </button>
        <button className={tabClass(box === 'outgoing')} onClick={() => setBox('outgoing')}>
          Outgoing
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchTransfers(box)} className="text-red-200 hover:text-white text-sm underline">
            Retry
          </button>
        </div>
      )}

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {box === 'incoming' ? 'Pending Incoming' : 'Sent Postings'}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading postings…</div>
        ) : transfers.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-4xl mb-4 block">📭</span>
            <p className="text-muted-foreground">
              {box === 'incoming' ? 'No pending postings.' : 'You have not sent any postings.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {transfers.map((t) => (
              <li key={t.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{t.senderName || 'Someone'}</span>
                    <span className="text-muted-foreground"> · </span>
                    {t.fromAccountName || 'Account'}
                    {t.fromHandle && <span className="text-blue-400"> (@{t.fromHandle})</span>}
                    <span className="text-muted-foreground"> → </span>
                    {t.toAccountName || 'Account'}
                    {t.toHandle && <span className="text-blue-400"> (@{t.toHandle})</span>}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-lg font-bold text-foreground">{formatCurrency(t.amount)}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(t.createdAt)}</span>
                    {box === 'outgoing' && (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    )}
                  </div>
                  {t.note && <p className="text-sm text-muted-foreground mt-1">{t.note}</p>}
                  {box === 'outgoing' && t.status !== 'PENDING' && t.decidedByName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.status === 'ACCEPTED' ? 'Accepted' : 'Rejected'} by {t.decidedByName}
                      {t.decidedAt ? ` · ${relativeTime(t.decidedAt)}` : ''}
                    </p>
                  )}
                </div>

                {box === 'incoming' && t.status === 'PENDING' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => decide(t.id, 'accept')}
                      disabled={busyId === t.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-muted disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {busyId === t.id ? '…' : 'Accept'}
                    </button>
                    <button
                      onClick={() => decide(t.id, 'reject')}
                      disabled={busyId === t.id}
                      className="px-4 py-2 bg-muted hover:bg-accent border border-border text-foreground rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {busyId === t.id ? '…' : 'Reject'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
