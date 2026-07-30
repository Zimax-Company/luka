'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import { Category } from '@/types/category';
import { formatAmountInput, parseAmount } from '@/lib/amount';

interface Draft {
  id: string;
  accountId: string;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  type: 'INCOME' | 'EXPENSE';
  amount: number | null;
  note: string | null;
  date: string;
  source: 'RECURRING' | string;
  suggestedConf?: number | null;
}

interface RowEdit {
  categoryId: string;
  amount: string;
  note: string;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const sourceBadge = (source: string) => {
  switch (source) {
    case 'RECURRING':
      return 'bg-purple-900/50 text-purple-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export default function InboxPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await authFetch('/api/categories');
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) setCategories(json.data);
    } catch {
      // Non-critical: dropdowns simply fall back to the draft's own category.
    }
  }, []);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/drafts');
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load inbox');
      const list = (json.data as Draft[]) ?? [];
      setDrafts(list);
      // Seed each row's editable values from the draft.
      setEdits(
        Object.fromEntries(
          list.map((d) => [
            d.id,
            {
              categoryId: d.categoryId ?? '',
              amount: d.amount == null ? '' : formatAmountInput(String(d.amount)),
              note: d.note ?? '',
            },
          ])
        )
      );
    } catch {
      setError('Could not load your inbox. Please try again.');
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchDrafts();
  }, [fetchCategories, fetchDrafts]);

  const setEdit = (id: string, patch: Partial<RowEdit>) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const approve = async (draft: Draft) => {
    const edit = edits[draft.id];
    if (!edit?.categoryId) {
      setError('Choose a category before approving.');
      return;
    }
    const amount = parseAmount(edit.amount);
    if (!(amount > 0)) {
      setError('Enter a valid amount before approving.');
      return;
    }
    setBusyId(draft.id);
    setError(null);
    try {
      const res = await authFetch(`/api/drafts/${draft.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: edit.categoryId,
          amount,
          note: edit.note,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Failed to approve');
      await fetchDrafts();
    } catch {
      setError('Could not approve this item. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (draft: Draft) => {
    setBusyId(draft.id);
    setError(null);
    try {
      const res = await authFetch(`/api/drafts/${draft.id}/dismiss`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Failed to dismiss');
      await fetchDrafts();
    } catch {
      setError('Could not dismiss this item. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const approveAll = async () => {
    setApprovingAll(true);
    setError(null);
    try {
      const res = await authFetch('/api/drafts/approve-all', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Failed to approve all');
      const approved = json?.approved ?? 0;
      const skipped = json?.skipped ?? 0;
      showToast(
        `Approved ${approved} item${approved === 1 ? '' : 's'}` +
          (skipped > 0 ? ` · ${skipped} skipped (need a category or amount)` : '')
      );
      await fetchDrafts();
    } catch {
      setError('Could not approve all ready items. Please try again.');
    } finally {
      setApprovingAll(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">📥 Inbox</h1>
          <p className="text-muted-foreground">Confirm items before they land in your books</p>
        </div>
        {drafts.length > 0 && (
          <button
            onClick={approveAll}
            disabled={approvingAll}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-muted disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {approvingAll ? 'Approving…' : 'Approve all ready'}
          </button>
        )}
      </div>

      {toast && (
        <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-300">
          {toast}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="border border-border rounded-lg bg-card p-8 text-center text-muted-foreground">
          Loading inbox…
        </div>
      ) : drafts.length === 0 ? (
        <div className="border border-border rounded-lg bg-card p-12 text-center">
          <span className="text-4xl mb-4 block">✅</span>
          <h3 className="text-lg font-semibold text-foreground mb-1">Your inbox is clear.</h3>
          <p className="text-muted-foreground">New items to review will show up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => {
            const edit = edits[draft.id] ?? { categoryId: '', amount: '', note: '' };
            const rowCategories = categories.filter(
              (c) => c.accountId === draft.accountId && c.type === draft.type
            );
            const busy = busyId === draft.id;
            const needsAmount = draft.amount == null;
            return (
              <div key={draft.id} className="border border-border rounded-lg bg-card p-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-foreground">
                    {draft.accountName || 'Account'}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      draft.type === 'INCOME'
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-red-900/50 text-red-300'
                    }`}
                  >
                    {draft.type}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sourceBadge(
                      draft.source
                    )}`}
                  >
                    {draft.source}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDate(draft.date)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Category
                    </label>
                    <select
                      value={edit.categoryId}
                      onChange={(e) => setEdit(draft.id, { categoryId: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a category</option>
                      {rowCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Amount{needsAmount && <span className="text-red-400"> *</span>}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={edit.amount}
                      onChange={(e) => setEdit(draft.id, { amount: formatAmountInput(e.target.value) })}
                      placeholder={needsAmount ? 'Enter amount' : '0.00'}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Note
                    </label>
                    <input
                      type="text"
                      value={edit.note}
                      onChange={(e) => setEdit(draft.id, { note: e.target.value })}
                      placeholder="Add a note (optional)"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-4">
                  <button
                    onClick={() => dismiss(draft)}
                    disabled={busy}
                    className="px-4 py-2 bg-muted hover:bg-accent border border-border text-foreground rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {busy ? '…' : 'Dismiss'}
                  </button>
                  <button
                    onClick={() => approve(draft)}
                    disabled={busy}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-muted disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {busy ? '…' : 'Approve'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
