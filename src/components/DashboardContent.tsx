'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardSummary {
  year: number | 'all';
  availableYears: number[];
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

interface RecentTransaction {
  id: string;
  date: string;
  note: string;
  amount: number;
  category: {
    name: string;
    type: 'INCOME' | 'EXPENSE';
  };
}

const CURRENT_YEAR = new Date().getFullYear();

export default function DashboardContent() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The dashboard defaults to the current calendar year; 'all' shows every year.
  const [year, setYear] = useState<number | 'all'>(CURRENT_YEAR);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const yearQuery = `year=${year}`;
        const [summaryResponse, transactionsResponse] = await Promise.all([
          fetch(`/api/entries/summary?${yearQuery}`),
          fetch(`/api/entries?limit=5&${yearQuery}`)
        ]);

        const summaryData = await summaryResponse.json();
        const transactionsData = await transactionsResponse.json();

        if (summaryData.success) {
          setSummary(summaryData.data);
          if (Array.isArray(summaryData.data.availableYears)) {
            setAvailableYears(summaryData.data.availableYears);
          }
        }

        if (transactionsData.success) {
          setRecentTransactions(transactionsData.data.slice(0, 5));
        }

      } catch (err) {
        setError('Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [year]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Merge current year into the option list so it's always selectable even with no data yet.
  const yearOptions = Array.from(new Set([CURRENT_YEAR, ...availableYears])).sort((a, b) => b - a);

  const yearFilter = (
    <div className="flex items-center gap-2">
      <label htmlFor="year-filter" className="text-sm text-muted-foreground">Year</label>
      <select
        id="year-filter"
        value={String(year)}
        onChange={(e) => setYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
        className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
        <option value="all">All years</option>
      </select>
    </div>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-muted-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {year === 'all' ? 'All-time overview' : `Overview for ${year}`}
          </p>
        </div>
        {yearFilter}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* Quick Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="border border-border rounded-lg bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💰</span>
              <h3 className="text-lg font-semibold text-foreground">Total Income</h3>
            </div>
            <p className="text-3xl font-bold text-green-500">
              {formatCurrency(summary.totals.income)}
            </p>
            <p className="text-sm text-muted-foreground">
              {year === 'all' ? 'All years' : `Year ${year}`}
            </p>
          </div>

          <div className="border border-border rounded-lg bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💳</span>
              <h3 className="text-lg font-semibold text-foreground">Total Expenses</h3>
            </div>
            <p className="text-3xl font-bold text-red-500">
              {formatCurrency(summary.totals.expenses)}
            </p>
            <p className="text-sm text-muted-foreground">
              {summary.statistics.expenseTransactions} entries
            </p>
          </div>

          <div className="border border-border rounded-lg bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📈</span>
              <h3 className="text-lg font-semibold text-foreground">Net Savings</h3>
            </div>
            <p className={`text-3xl font-bold ${summary.totals.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(summary.totals.net)}
            </p>
            <p className="text-sm text-muted-foreground">
              {Math.round(((summary.totals.net / (summary.totals.income || 1)) * 100))}% savings rate
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="border border-border rounded-lg bg-card p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/categories"
              className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:opacity-80 transition-colors text-foreground"
            >
              <span className="text-xl">📁</span>
              <span>Manage Categories</span>
              <span className="ml-auto text-muted-foreground">→</span>
            </Link>
            <Link
              href="/entries"
              className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:opacity-80 transition-colors text-foreground"
            >
              <span className="text-xl">💰</span>
              <span>Add Entry</span>
              <span className="ml-auto text-muted-foreground">→</span>
            </Link>
            <Link
              href="/reports"
              className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:opacity-80 transition-colors text-foreground"
            >
              <span className="text-xl">📊</span>
              <span>View Reports</span>
              <span className="ml-auto text-muted-foreground">→</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="border border-border rounded-lg bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">Recent Activity</h3>
            <Link
              href="/entries"
              className="text-blue-500 hover:opacity-80 text-sm"
            >
              View All
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📝</span>
              <p className="text-muted-foreground mb-4">No entries for this period</p>
              <Link
                href="/entries"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Add First Entry
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <span className="text-lg">
                    {transaction.category.type === 'INCOME' ? '💼' :
                     transaction.category.name.toLowerCase().includes('food') ? '🍔' :
                     transaction.category.name.toLowerCase().includes('transport') ? '⛽' : '💳'}
                  </span>
                  <div className="flex-1">
                    <p className="text-foreground text-sm">{transaction.note}</p>
                    <p className="text-muted-foreground text-xs">
                      {transaction.category.name} • {formatDate(transaction.date)}
                    </p>
                  </div>
                  <span className={`font-medium ${transaction.category.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.category.type === 'INCOME' ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Categories Overview */}
      {summary && Object.keys(summary.statistics.categoryBreakdown).length > 0 && (
        <div className="mt-6">
          <div className="border border-border rounded-lg bg-card p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">Category Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(summary.statistics.categoryBreakdown).map(([category, data]) => (
                <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="text-foreground text-sm font-medium">{category}</p>
                    <p className="text-muted-foreground text-xs">{data.count} entries</p>
                  </div>
                  <span className={`font-medium ${data.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(Math.abs(data.total))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
