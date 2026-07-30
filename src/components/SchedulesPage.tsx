'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import { Category } from '@/types/category';
import { Account } from '@/types/account';
import { formatAmountInput, parseAmount } from '@/lib/amount';

type Cadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface Template {
  id: string;
  accountId: string;
  accountName: string | null;
  categoryId: string;
  categoryName: string | null;
  type: 'INCOME' | 'EXPENSE';
  amount: number | null;
  note: string | null;
  cadence: Cadence;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  autoPost: boolean;
  active: boolean;
  nextRunOn: string | null;
  lastRunOn: string | null;
}

interface FormState {
  accountId: string;
  categoryId: string;
  amount: string;
  note: string;
  cadence: Cadence;
  dayOfMonth: string;
  dayOfWeek: string;
  autoPost: boolean;
}

const CADENCES: Cadence[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyForm: FormState = {
  accountId: '',
  categoryId: '',
  amount: '',
  note: '',
  cadence: 'MONTHLY',
  dayOfMonth: '1',
  dayOfWeek: '1',
  autoPost: false,
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

const cadenceLabel = (t: Template) => {
  switch (t.cadence) {
    case 'WEEKLY':
      return `Weekly · ${WEEKDAYS[t.dayOfWeek ?? 0]}`;
    case 'MONTHLY':
      return `Monthly · day ${t.dayOfMonth ?? 1}`;
    case 'YEARLY':
      return 'Yearly';
    default:
      return 'Daily';
  }
};

export default function SchedulesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/recurring');
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load schedules');
      setTemplates((json.data as Template[]) ?? []);
    } catch {
      setError('Could not load schedules. Please try again.');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRefData = useCallback(async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        authFetch('/api/accounts'),
        authFetch('/api/categories'),
      ]);
      const accJson = await accRes.json();
      const catJson = await catRes.json();
      if (accJson?.success && Array.isArray(accJson.data)) setAccounts(accJson.data);
      if (catJson?.success && Array.isArray(catJson.data)) setCategories(catJson.data);
    } catch {
      // Non-critical: the create form simply has no options until this succeeds.
    }
  }, []);

  useEffect(() => {
    fetchRefData();
    fetchTemplates();
  }, [fetchRefData, fetchTemplates]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, accountId: accounts[0]?.id ?? '' });
    setShowForm(true);
  };

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({
      accountId: t.accountId,
      categoryId: t.categoryId,
      amount: t.amount == null ? '' : formatAmountInput(String(t.amount)),
      note: t.note ?? '',
      cadence: t.cadence,
      dayOfMonth: String(t.dayOfMonth ?? 1),
      dayOfWeek: String(t.dayOfWeek ?? 1),
      autoPost: t.autoPost,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const formCategories = categories.filter((c) => c.accountId === form.accountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId || !form.categoryId) {
      setError('Pick an account and a category.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        accountId: form.accountId,
        categoryId: form.categoryId,
        amount: form.amount.trim() === '' ? null : parseAmount(form.amount),
        note: form.note || undefined,
        cadence: form.cadence,
        dayOfMonth: form.cadence === 'MONTHLY' ? Number(form.dayOfMonth) : undefined,
        dayOfWeek: form.cadence === 'WEEKLY' ? Number(form.dayOfWeek) : undefined,
        autoPost: form.autoPost,
      };
      const url = editingId ? `/api/recurring/${editingId}` : '/api/recurring';
      const method = editingId ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Failed to save');
      closeForm();
      await fetchTemplates();
    } catch {
      setError('Could not save the schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const patchTemplate = async (t: Template, patch: Record<string, unknown>) => {
    setBusyId(t.id);
    setError(null);
    try {
      const res = await authFetch(`/api/recurring/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Failed to update');
      await fetchTemplates();
    } catch {
      setError('Could not update the schedule. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteTemplate = async (t: Template) => {
    if (!confirm('Delete this schedule?')) return;
    setBusyId(t.id);
    setError(null);
    try {
      const res = await authFetch(`/api/recurring/${t.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Failed to delete');
      await fetchTemplates();
    } catch {
      setError('Could not delete the schedule. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">🔁 Recurring Schedules</h1>
          <p className="text-muted-foreground">Automate the entries you make again and again</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          New Schedule
        </button>
      </div>

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
          Loading schedules…
        </div>
      ) : templates.length === 0 ? (
        <div className="border border-border rounded-lg bg-card p-12 text-center">
          <span className="text-4xl mb-4 block">🗓️</span>
          <h3 className="text-lg font-semibold text-foreground mb-1">No schedules yet.</h3>
          <p className="text-muted-foreground mb-4">
            Create one to post recurring entries automatically or drop them into your inbox.
          </p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            New Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => {
            const busy = busyId === t.id;
            return (
              <div
                key={t.id}
                className={`border border-border rounded-lg bg-card p-5 ${t.active ? '' : 'opacity-60'}`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {t.accountName || 'Account'}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.type === 'INCOME'
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-red-900/50 text-red-300'
                        }`}
                      >
                        {t.categoryName || 'Category'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-lg font-bold text-foreground">
                        {t.amount == null ? 'Ask me' : formatCurrency(t.amount)}
                      </span>
                      <span className="text-muted-foreground">{cadenceLabel(t)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Next run: {formatDate(t.nextRunOn)}
                      {t.lastRunOn ? ` · Last: ${formatDate(t.lastRunOn)}` : ''}
                    </p>
                    {t.note && <p className="text-sm text-muted-foreground mt-1">{t.note}</p>}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.autoPost}
                        disabled={busy}
                        onChange={() => patchTemplate(t, { autoPost: !t.autoPost })}
                        className="accent-blue-600"
                      />
                      Auto-post
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.active}
                        disabled={busy}
                        onChange={() => patchTemplate(t, { active: !t.active })}
                        className="accent-blue-600"
                      />
                      Active
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-4">
                  <button
                    onClick={() => openEdit(t)}
                    disabled={busy}
                    className="px-3 py-1.5 bg-muted hover:bg-accent border border-border text-foreground rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTemplate(t)}
                    disabled={busy}
                    className="px-3 py-1.5 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-foreground">
              {editingId ? 'Edit Schedule' : 'New Schedule'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Account</label>
                <select
                  value={form.accountId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, accountId: e.target.value, categoryId: '' }))
                  }
                  disabled={!!editingId}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                  disabled={!!editingId}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  required
                >
                  <option value="">Select a category</option>
                  {formCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Cadence</label>
                <select
                  value={form.cadence}
                  onChange={(e) => setForm((prev) => ({ ...prev, cadence: e.target.value as Cadence }))}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CADENCES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0) + c.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {form.cadence === 'MONTHLY' && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Day of month
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.dayOfMonth}
                    onChange={(e) => setForm((prev) => ({ ...prev, dayOfMonth: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {form.cadence === 'WEEKLY' && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Day of week
                  </label>
                  <select
                    value={form.dayOfWeek}
                    onChange={(e) => setForm((prev) => ({ ...prev, dayOfWeek: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {WEEKDAYS.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Amount
                  <span className="ml-1 text-xs text-muted-foreground/70">blank = ask me</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: formatAmountInput(e.target.value) }))}
                  placeholder="Leave blank to confirm the amount each time"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Note</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoPost}
                    onChange={(e) => setForm((prev) => ({ ...prev, autoPost: e.target.checked }))}
                    className="accent-blue-600"
                  />
                  <span className="text-sm font-medium text-foreground">Auto-post</span>
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  On: posts automatically. Off: drops into your inbox to confirm.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
