'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Cost, CreateCostRequest } from '@/types/business';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { formatAmountInput, parseAmount } from '@/lib/amount';

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function CostsPage() {
  const { currentUser } = useAuth();
  const { activeAccount, activeAccountId } = useActiveAccount();
  const canEdit = currentUser?.role !== 'VIEWER';

  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  const currency = activeAccount?.currency || 'NGN';
  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value),
    [currency],
  );

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const fetchCosts = useCallback(async () => {
    if (!activeAccountId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/costs?accountId=${encodeURIComponent(activeAccountId)}`);
      const json = await res.json();
      if (Array.isArray(json?.data)) setCosts(json.data as Cost[]);
    } catch {
      // Non-critical: list stays empty on failure.
    } finally {
      setLoading(false);
    }
  }, [activeAccountId]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  const resetForm = () => {
    setAmount('');
    setDate(todayIso());
    setCategory('');
    setNote('');
  };

  const createCost = async () => {
    if (!activeAccountId || parseAmount(amount) <= 0) return;
    setSaving(true);
    try {
      const body: CreateCostRequest = {
        accountId: activeAccountId,
        amount: parseAmount(amount),
        date,
        category: category.trim() || null,
        note: note.trim() || null,
      };
      const res = await authFetch('/api/costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        resetForm();
        setShowForm(false);
        await fetchCosts();
      }
    } catch {
      // Ignore; the form stays open so the user can retry.
    } finally {
      setSaving(false);
    }
  };

  const deleteCost = async (id: string) => {
    if (!confirm('Delete this cost?')) return;
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/costs/${id}`, { method: 'DELETE' });
      if (res.ok) setCosts((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // Ignore delete failures.
    } finally {
      setDeletingId(null);
    }
  };

  // Only reachable for business accounts.
  if (activeAccount && activeAccount.mode !== 'BUSINESS') {
    return (
      <div className="container mx-auto px-6 py-16 max-w-3xl text-center">
        <span className="text-5xl mb-4 block">💸</span>
        <h1 className="text-2xl font-bold text-foreground mb-2">Costs are for business accounts</h1>
        <p className="text-muted-foreground mb-6">
          Switch to a business account to record costs.
        </p>
        <Link href="/" className="text-blue-500 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">💸 Costs</h1>
          <p className="text-muted-foreground">
            Expenses for {activeAccount?.name ?? 'this account'}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
          >
            {showForm ? '✕ Close' : '➕ New Cost'}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && canEdit && (
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">New Cost</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Amount *</label>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                placeholder="0"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Optional (e.g. Supplies)"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Note</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              disabled={saving}
              className="flex-1 bg-muted hover:bg-accent text-foreground px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createCost}
              disabled={saving || parseAmount(amount) <= 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Create Cost'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading costs…</div>
        ) : costs.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl mb-3 block">💸</span>
            <p className="text-muted-foreground">No costs yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  {canEdit && <th className="px-4 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {costs.map((cost) => (
                  <tr key={cost.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatDate(cost.date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cost.category || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cost.note || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-500 whitespace-nowrap">
                      {formatCurrency(cost.amount)}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteCost(cost.id)}
                          disabled={deletingId === cost.id}
                          className="text-red-500 hover:text-red-400 text-sm disabled:opacity-50"
                        >
                          {deletingId === cost.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
