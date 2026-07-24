'use client';

import React, { useState, useEffect, useRef } from 'react';
import { EntryWithCategory } from '@/types/entry';
import { Category } from '@/types/category';
import { Account } from '@/types/account';
import { authFetch } from '@/lib/api';
import { PaginationMeta } from '@/lib/pagination';

const PAGE_SIZE = 20;

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  type: 'INCOME' | 'EXPENSE';
  confidence: number;
}

interface TransactionsSummary {
  totals: {
    income: number;
    expenses: number;
    net: number;
  };
  statistics: {
    totalTransactions: number;
    incomeTransactions: number;
    expenseTransactions: number;
    avgTransactionAmount: number;
    lastTransactionDate: string;
    categoryBreakdown: Record<string, {
      count: number;
      total: number;
      type: string;
    }>;
  };
}

// A line item on the entry form (amount kept as string while editing).
interface ItemRow {
  name: string;
  amount: string;
  categoryItemId?: string | null;
}

interface CatalogItem {
  id: string;
  categoryId: string;
  name: string;
}

// --- Small inline icons (no external packages; CSP blocks them) --------------
function EditIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
function PlusCircleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function WalletIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M16 12h.01M3 9h18" />
    </svg>
  );
}
function CalendarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function NoteIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4Z" />
      <path d="M8 9h8M8 13h6" />
    </svg>
  );
}
function TagIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41 12 22l-9-9V4a1 1 0 0 1 1-1h9Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}
function CoinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5h3.5a1.5 1.5 0 0 1 0 3H10a1.5 1.5 0 0 0 0 3h3.5" />
    </svg>
  );
}
function ListIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function CloseIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function SearchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function ChevronDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Searchable / filterable category picker. The catalog can be 100+ entries, so
// a native <select> is replaced by a button + filterable dropdown panel.
function SearchableCategorySelect({
  categories,
  value,
  onChange,
  id,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = categories.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    // Focus the filter input as soon as the panel opens.
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onDown);
      clearTimeout(t);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? categories.filter((c) => c.name.toLowerCase().includes(q))
    : categories;

  return (
    <div className="relative" ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-input border border-border rounded-lg text-left text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={selected ? 'text-foreground truncate' : 'text-muted-foreground'}>
          {selected ? `${selected.name} (${selected.type})` : 'Select a category'}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card">
            <SearchIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No categories match “{query}”.</li>
            ) : (
              filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-accent ${
                      c.id === value ? 'bg-accent text-foreground' : 'text-foreground'
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className={`text-xs shrink-0 ${c.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
                      {c.type}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function EntriesPage() {
  const [transactions, setTransactions] = useState<EntryWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<TransactionsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EntryWithCategory | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    accountId: string;
    date: string;
    note: string;
    categoryId: string;
    amount: string;
    toHandle: string;
  }>({
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    categoryId: '',
    amount: '',
    toHandle: ''
  });

  // Transfer recipient live-preview (only used for EXPENSE entries).
  const [resolvedRecipient, setResolvedRecipient] = useState<
    { id: string; name: string; handle: string } | null
  >(null);
  const [resolving, setResolving] = useState(false);
  const [resolveChecked, setResolveChecked] = useState(false);

  // Smart category suggestion state (only for brand-new entries).
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [categoryAutoFilled, setCategoryAutoFilled] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);

  // Optional per-entry line items + the selected category's item catalog.
  const [items, setItems] = useState<ItemRow[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

  // Fetch data
  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('categoryId', filterCategory);
      if (filterType) params.append('type', filterType);
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      if (search) params.append('search', search);
      params.append('page', String(page));
      params.append('pageSize', String(PAGE_SIZE));

      const response = await authFetch(`/api/entries?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTransactions(data.data);
        setPagination(data.pagination ?? null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch transactions');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await authFetch('/api/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      setError('Failed to fetch categories');
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await authFetch('/api/accounts');
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.data);
        // Set default account if none selected
        if (!formData.accountId && data.data.length > 0) {
          setFormData(prev => ({ ...prev, accountId: data.data[0].id }));
        }
      }
    } catch (err) {
      setError('Failed to fetch accounts');
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await authFetch('/api/entries/summary');
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.data);
      }
    } catch (err) {
      setError('Failed to fetch summary');
    }
  };

  // Reference data (categories/accounts/summary) is independent of filters/page,
  // so it only needs to load once on mount.
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCategories(), fetchAccounts(), fetchSummary()]);
      setIsLoading(false);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch the (server-paginated) transaction list whenever a filter or the
  // current page changes.
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterType, filterMonth, filterYear, search, page]);

  // Reset to the first page whenever a filter changes so results aren't hidden
  // on an out-of-range page.
  useEffect(() => {
    setPage(1);
  }, [filterCategory, filterType, filterMonth, filterYear, search]);

  // Debounce the search input (~300ms) before applying it as a filter.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Line-item running total vs the entry amount. Submit is blocked when the
  // items' sum exceeds the entry amount (matches the server-side rule).
  const entryAmount = parseFloat(formData.amount) || 0;
  const itemsTotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const itemsRemaining = entryAmount - itemsTotal;
  const itemsExceed = Math.round(itemsTotal * 100) > Math.round(entryAmount * 100);

  // The selected category's type decides whether a transfer is possible.
  const selectedCategory = categories.find((c) => c.id === formData.categoryId);
  const isExpenseCategory = selectedCategory?.type === 'EXPENSE';
  // A transfer is only offered for brand-new EXPENSE entries.
  const canTransfer = !editingTransaction && isExpenseCategory;
  const handleTrimmed = formData.toHandle.trim().replace(/^@/, '');
  const isTransfer = canTransfer && handleTrimmed.length > 0;
  // Block submit while a non-empty handle hasn't resolved to an account.
  const transferBlocked = isTransfer && (!resolvedRecipient || resolving || !resolveChecked);

  // Live-preview the transfer recipient as the user types a handle.
  useEffect(() => {
    if (!canTransfer || handleTrimmed.length === 0) {
      setResolvedRecipient(null);
      setResolving(false);
      setResolveChecked(false);
      return;
    }

    let cancelled = false;
    setResolving(true);
    setResolveChecked(false);
    const timer = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/accounts/resolve?handle=@${encodeURIComponent(handleTrimmed)}`);
        const json = await res.json();
        if (cancelled) return;
        setResolvedRecipient(json?.success ? json.data : null);
      } catch {
        if (!cancelled) setResolvedRecipient(null);
      } finally {
        if (!cancelled) {
          setResolving(false);
          setResolveChecked(true);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handleTrimmed, canTransfer]);

  // Smart category suggestion: as the note (debounced ~300ms) or amount changes
  // on a NEW entry, ask the backend for likely categories learned from the
  // account's own history.
  useEffect(() => {
    if (editingTransaction || !showForm || !formData.accountId) {
      setSuggestions([]);
      return;
    }
    const note = formData.note.trim();
    const amount = parseFloat(formData.amount);
    if (!note && !(amount > 0)) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.append('accountId', formData.accountId);
        // Pass the current type (derived from any chosen category) so income and
        // expense entries are suggested against their own history.
        if (selectedCategory?.type) params.append('type', selectedCategory.type);
        params.append('note', note);
        params.append('amount', String(amount > 0 ? amount : 0));
        const res = await authFetch(`/api/entries/suggest-category?${params.toString()}`);
        const json = await res.json();
        if (cancelled) return;
        setSuggestions(json?.success ? (json.data?.suggestions ?? []) : []);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.note, formData.amount, formData.accountId, showForm, editingTransaction]);

  // Auto-select the top suggestion when highly confident (≥0.75) — but never
  // override a category the user explicitly chose.
  useEffect(() => {
    const top = suggestions[0];
    if (!top || categoryTouched) {
      if (!top) setCategoryAutoFilled(false);
      return;
    }
    if (top.confidence >= 0.75) {
      setFormData((prev) =>
        prev.categoryId === top.categoryId ? prev : { ...prev, categoryId: top.categoryId }
      );
      setCategoryAutoFilled(true);
    } else {
      setCategoryAutoFilled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions, categoryTouched]);

  // Load the selected category's item catalog to offer as quick-pick / autocomplete
  // suggestions for line items (free text is still allowed).
  useEffect(() => {
    if (!showForm || !formData.categoryId) {
      setCatalogItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/categories/${formData.categoryId}/items`);
        const json = await res.json();
        if (!cancelled) setCatalogItems(json?.success ? (json.data ?? []) : []);
      } catch {
        if (!cancelled) setCatalogItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.categoryId, showForm]);

  // Item row helpers.
  const addItem = (preset?: CatalogItem) => {
    setItems((prev) => [
      ...prev,
      { name: preset?.name ?? '', amount: '', categoryItemId: preset?.id ?? null },
    ]);
  };
  const updateItem = (index: number, patch: Partial<ItemRow>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Fill the category from a mid-confidence suggestion chip (explicit accept).
  const applySuggestion = (s: CategorySuggestion) => {
    setFormData((prev) => ({ ...prev, categoryId: s.categoryId }));
    setCategoryTouched(true);
    setCategoryAutoFilled(false);
  };

  // Form handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (transferBlocked) {
      setError('Enter a valid recipient handle or clear the posting field.');
      return;
    }

    // Block when line items add up to more than the entry amount.
    if (itemsExceed) {
      setError(
        `Item total (${formatCurrency(itemsTotal)}) exceeds the entry amount (${formatCurrency(entryAmount)}). Remove items or increase the amount.`
      );
      return;
    }

    // Clean line items: drop blank rows, coerce amounts to numbers.
    const cleanedItems = items
      .map((i) => ({
        name: i.name.trim(),
        amount: parseFloat(i.amount),
        categoryItemId: i.categoryItemId ?? null,
      }))
      .filter((i) => i.name && i.amount > 0);

    try {
      // Route to the transfer endpoint when a recipient handle is set on a
      // new expense entry; otherwise create/update a normal entry.
      if (isTransfer) {
        const response = await authFetch('/api/transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromAccountId: formData.accountId,
            categoryId: formData.categoryId,
            amount: parseFloat(formData.amount),
            date: formData.date,
            note: formData.note || undefined,
            toHandle: `@${handleTrimmed}`,
          }),
        });

        const data = await response.json();
        if (data.success) {
          resetForm();
          await fetchTransactions();
          await fetchSummary();
        } else {
          setError(data.error || 'Failed to send posting');
        }
        return;
      }

      const url = editingTransaction
        ? `/api/entries/${editingTransaction.id}`
        : '/api/entries';

      const method = editingTransaction ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          items: cleanedItems,
        })
      });

      const data = await response.json();

      if (data.success) {
        resetForm();
        await fetchTransactions();
        await fetchSummary();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to save transaction');
    }
  };

  const handleEdit = async (transaction: EntryWithCategory) => {
    setEditingTransaction(transaction);
    setFormData({
      accountId: transaction.accountId,
      date: transaction.date,
      note: transaction.note,
      categoryId: transaction.categoryId,
      amount: transaction.amount.toString(),
      toHandle: ''
    });
    setItems([]);
    setShowForm(true);

    // Prefill line items from the entry detail (the list rows don't include them).
    try {
      const res = await authFetch(`/api/entries/${transaction.id}`);
      const json = await res.json();
      if (json?.success && Array.isArray(json.data?.items)) {
        setItems(
          json.data.items.map((it: { name: string; amount: number; categoryItemId?: string | null }) => ({
            name: it.name,
            amount: String(it.amount),
            categoryItemId: it.categoryItemId ?? null,
          }))
        );
      }
    } catch {
      // Non-critical: fall back to no prefilled items.
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      const response = await authFetch(`/api/entries/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchTransactions();
        await fetchSummary();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      accountId: accounts.length > 0 ? accounts[0].id : '',
      date: new Date().toISOString().split('T')[0],
      note: '',
      categoryId: '',
      amount: '',
      toHandle: ''
    });
    setResolvedRecipient(null);
    setResolving(false);
    setResolveChecked(false);
    setSuggestions([]);
    setCategoryAutoFilled(false);
    setCategoryTouched(false);
    setItems([]);
    setCatalogItems([]);
    setEditingTransaction(null);
    setShowForm(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-muted-foreground">Loading entries...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Entries</h1>
        <p className="text-muted-foreground">Track your income and expenses</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-400 hover:text-red-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="border border-border rounded-lg bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💰</span>
              <h3 className="text-lg font-semibold text-foreground">Total Income</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">{formatCurrency(summary.totals.income)}</p>
            <p className="text-sm text-muted-foreground">{summary.statistics.incomeTransactions} entries</p>
          </div>

          <div className="border border-border rounded-lg bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💳</span>
              <h3 className="text-lg font-semibold text-foreground">Total Expenses</h3>
            </div>
            <p className="text-3xl font-bold text-red-400">{formatCurrency(summary.totals.expenses)}</p>
            <p className="text-sm text-muted-foreground">{summary.statistics.expenseTransactions} entries</p>
          </div>

          <div className="border border-border rounded-lg bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📈</span>
              <h3 className="text-lg font-semibold text-foreground">Net Total</h3>
            </div>
            <p className={`text-3xl font-bold ${summary.totals.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(summary.totals.net)}
            </p>
            <p className="text-sm text-muted-foreground">Average: {formatCurrency(summary.statistics.avgTransactionAmount)}</p>
          </div>

          <div className="border border-border rounded-lg bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📊</span>
              <h3 className="text-lg font-semibold text-foreground">Total Entries</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">{summary.statistics.totalTransactions}</p>
            <p className="text-sm text-muted-foreground">Last: {formatDate(summary.statistics.lastTransactionDate)}</p>
          </div>
        </div>
      )}

      {/* Actions and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
            }}
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search notes & categories…"
              className="w-full md:w-64 px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.type})
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="INCOME">Income Only</option>
            <option value="EXPENSE">Expenses Only</option>
          </select>
          
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Years</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
          
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Months</option>
            <option value="01">January</option>
            <option value="02">February</option>
            <option value="03">March</option>
            <option value="04">April</option>
            <option value="05">May</option>
            <option value="06">June</option>
            <option value="07">July</option>
            <option value="08">August</option>
            <option value="09">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
          
          {/* Clear Filters Button */}
          {(filterCategory || filterType || filterMonth || filterYear || searchInput) && (
            <button
              onClick={() => {
                setFilterCategory('');
                setFilterType('');
                setFilterMonth('');
                setFilterYear('');
                setSearchInput('');
                setSearch('');
              }}
              className="px-3 py-2 bg-muted hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-colors text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          Add Entry
        </button>
      </div>

      {/* Transaction Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-500/15 text-blue-500">
                  {editingTransaction ? <EditIcon className="w-5 h-5" /> : <PlusCircleIcon className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {editingTransaction ? 'Edit Entry' : 'Add New Entry'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {editingTransaction ? 'Update this income or expense' : 'Record a new income or expense'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Close"
                className="p-2 -mr-2 -mt-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                    <WalletIcon className="w-4 h-4" /> Account
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select an account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type}) - {formatCurrency(account.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                      <CalendarIcon className="w-4 h-4" /> Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                      <CoinIcon className="w-4 h-4" /> Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00 NGN"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                    <NoteIcon className="w-4 h-4" /> Note
                  </label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter note (optional)"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <TagIcon className="w-4 h-4" /> Category
                    </label>
                    {!editingTransaction && categoryAutoFilled && !categoryTouched && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-500">
                        ✨ Suggested
                      </span>
                    )}
                  </div>

                  {/* Mid-confidence (0.4–0.75) tappable suggestion chip */}
                  {!editingTransaction && !categoryTouched && suggestions[0] &&
                    suggestions[0].confidence >= 0.4 && suggestions[0].confidence < 0.75 &&
                    formData.categoryId !== suggestions[0].categoryId && (
                      <button
                        type="button"
                        onClick={() => applySuggestion(suggestions[0])}
                        className="mb-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                      >
                        ✨ Suggested: {suggestions[0].categoryName}
                      </button>
                    )}

                  <SearchableCategorySelect
                    categories={categories}
                    value={formData.categoryId}
                    onChange={(id) => {
                      setFormData(prev => ({ ...prev, categoryId: id }));
                      setCategoryTouched(true);
                      setCategoryAutoFilled(false);
                    }}
                  />
                </div>

                {/* Optional line items */}
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <ListIcon className="w-4 h-4 text-muted-foreground" />
                      Items
                      <span className="text-xs font-normal text-muted-foreground">optional</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addItem()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-card border border-border text-foreground hover:bg-accent transition-colors"
                    >
                      <PlusCircleIcon className="w-4 h-4" /> Add item
                    </button>
                  </div>

                  {/* Quick-pick from the category's catalog */}
                  {catalogItems.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {catalogItems.map((ci) => (
                        <button
                          key={ci.id}
                          type="button"
                          onClick={() => addItem(ci)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                        >
                          + {ci.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Break this entry into line items (e.g. individual products). Free text is allowed; pick from the catalog above for quick entry.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            list={`catalog-${idx}`}
                            value={item.name}
                            onChange={(e) => {
                              const name = e.target.value;
                              const match = catalogItems.find((ci) => ci.name === name);
                              updateItem(idx, { name, categoryItemId: match?.id ?? null });
                            }}
                            placeholder="Item name"
                            className="flex-1 min-w-0 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <datalist id={`catalog-${idx}`}>
                            {catalogItems.map((ci) => (
                              <option key={ci.id} value={ci.name} />
                            ))}
                          </datalist>
                          <input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) => updateItem(idx, { amount: e.target.value })}
                            placeholder="0.00"
                            className="w-28 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            aria-label="Remove item"
                            className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                          >
                            <CloseIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total <span className="font-medium text-foreground">{formatCurrency(itemsTotal)}</span>
                      </span>
                      <span className={itemsExceed ? 'text-red-400 font-medium' : 'text-muted-foreground'}>
                        {itemsExceed
                          ? `Over by ${formatCurrency(Math.abs(itemsRemaining))}`
                          : `Remaining ${formatCurrency(itemsRemaining)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Transfer: only offered for new EXPENSE entries */}
                {canTransfer && (
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                      <WalletIcon className="w-4 h-4" /> Post to account (@handle)
                      <span className="text-xs text-muted-foreground/70">optional</span>
                    </label>
                    <div className="flex items-center bg-input border border-border rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500">
                      <span className="text-muted-foreground">@</span>
                      <input
                        type="text"
                        value={formData.toHandle.replace(/^@/, '')}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            toHandle: e.target.value.replace(/^@/, '').toLowerCase(),
                          }))
                        }
                        className="w-full bg-transparent py-2 pl-1 text-foreground focus:outline-none"
                        placeholder="recipient handle"
                      />
                    </div>
                    {handleTrimmed.length > 0 && (
                      <p className="mt-1 text-xs">
                        {resolving ? (
                          <span className="text-muted-foreground">Checking…</span>
                        ) : resolvedRecipient ? (
                          <span className="text-green-400">→ {resolvedRecipient.name.toUpperCase()}</span>
                        ) : resolveChecked ? (
                          <span className="text-muted-foreground">No account found for that handle</span>
                        ) : null}
                      </p>
                    )}
                    {isTransfer && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        This will record the expense now and queue a pending posting for the recipient to accept.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-border bg-card">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferBlocked || itemsExceed}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {isTransfer ? 'Post to account' : editingTransaction ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Recent Entries</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-4xl mb-4 block">📝</span>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Entries Found</h3>
            <p className="text-muted-foreground mb-4">Start by adding your first entry</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Add Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-accent">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {transaction.note}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.category.type === 'INCOME' 
                          ? 'bg-green-900/50 text-green-300' 
                          : 'bg-red-900/50 text-red-300'
                      }`}>
                        {transaction.category.name}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      transaction.category.type === 'INCOME' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.category.type === 'INCOME' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {pagination && pagination.total > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {(pagination.page - 1) * pagination.pageSize + 1}
            </span>
            –
            <span className="font-medium text-foreground">
              {(pagination.page - 1) * pagination.pageSize + transactions.length}
            </span>{' '}
            of <span className="font-medium text-foreground">{pagination.total}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-sm text-muted-foreground px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
