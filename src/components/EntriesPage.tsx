'use client';

import React, { useState, useEffect } from 'react';
import { EntryWithCategory } from '@/types/entry';
import { Category } from '@/types/category';
import { Account } from '@/types/account';
import { authFetch } from '@/lib/api';
import { PaginationMeta } from '@/lib/pagination';

const PAGE_SIZE = 20;

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

  // Form handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (transferBlocked) {
      setError('Enter a valid recipient handle or clear the posting field.');
      return;
    }

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
          amount: parseFloat(formData.amount)
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

  const handleEdit = (transaction: EntryWithCategory) => {
    setEditingTransaction(transaction);
    setFormData({
      accountId: transaction.accountId,
      date: transaction.date,
      note: transaction.note,
      categoryId: transaction.categoryId,
      amount: transaction.amount.toString(),
      toHandle: ''
    });
    setShowForm(true);
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-foreground">
              {editingTransaction ? 'Edit Entry' : 'Add New Entry'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Account
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

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Date
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
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Note
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
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Amount
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

              {/* Transfer: only offered for new EXPENSE entries */}
              {canTransfer && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Post to account (@handle)
                    <span className="ml-1 text-xs text-muted-foreground/70">optional</span>
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

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={transferBlocked}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {isTransfer ? 'Post to account' : editingTransaction ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg font-medium transition-colors"
                >
                  Cancel
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
