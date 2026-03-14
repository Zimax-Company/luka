'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardSummary {
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

export default function DashboardContent() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch summary and recent transactions
        const [summaryResponse, transactionsResponse] = await Promise.all([
          fetch('/api/transactions/summary'),
          fetch('/api/transactions?limit=5')
        ]);

        const summaryData = await summaryResponse.json();
        const transactionsData = await transactionsResponse.json();

        if (summaryData.success) {
          setSummary(summaryData.data);
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
  }, []);

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

  const getChangePercentage = (current: number, type: 'income' | 'expenses') => {
    // Mock percentage change for now - in a real app, you'd compare to previous period
    const mockChanges = {
      income: +12,
      expenses: -8
    };
    return mockChanges[type];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-gray-400">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">Dashboard</h1>
        <p className="text-gray-400">Welcome to your financial management dashboard</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* Quick Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💰</span>
              <h3 className="text-lg font-semibold text-white">Total Income</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">
              {formatCurrency(summary.totals.income)}
            </p>
            <p className="text-sm text-gray-400">
              {getChangePercentage(summary.totals.income, 'income') > 0 ? '+' : ''}
              {getChangePercentage(summary.totals.income, 'income')}% from last month
            </p>
          </div>

          <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💳</span>
              <h3 className="text-lg font-semibold text-white">Total Expenses</h3>
            </div>
            <p className="text-3xl font-bold text-red-400">
              {formatCurrency(summary.totals.expenses)}
            </p>
            <p className="text-sm text-gray-400">
              {getChangePercentage(summary.totals.expenses, 'expenses')}% from last month
            </p>
          </div>

          <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📈</span>
              <h3 className="text-lg font-semibold text-white">Net Savings</h3>
            </div>
            <p className={`text-3xl font-bold ${summary.totals.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(summary.totals.net)}
            </p>
            <p className="text-sm text-gray-400">
              +{Math.round(((summary.totals.net / (summary.totals.income || 1)) * 100))}% savings rate
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/categories"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
            >
              <span className="text-xl">📁</span>
              <span>Manage Categories</span>
              <span className="ml-auto text-gray-500">→</span>
            </Link>
            <Link
              href="/transactions"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
            >
              <span className="text-xl">💰</span>
              <span>Add Transaction</span>
              <span className="ml-auto text-gray-500">→</span>
            </Link>
            <Link
              href="/reports"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
            >
              <span className="text-xl">📊</span>
              <span>View Reports</span>
              <span className="ml-auto text-gray-500">→</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
            <Link 
              href="/transactions"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              View All
            </Link>
          </div>
          
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📝</span>
              <p className="text-gray-400 mb-4">No transactions yet</p>
              <Link
                href="/transactions"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Add First Transaction
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
                  <span className="text-lg">
                    {transaction.category.type === 'INCOME' ? '💼' : 
                     transaction.category.name.toLowerCase().includes('food') ? '🍔' : 
                     transaction.category.name.toLowerCase().includes('transport') ? '⛽' : '💳'}
                  </span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{transaction.note}</p>
                    <p className="text-gray-400 text-xs">
                      {transaction.category.name} • {formatDate(transaction.date)}
                    </p>
                  </div>
                  <span className={`font-medium ${transaction.category.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
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
          <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Category Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(summary.statistics.categoryBreakdown).map(([category, data]) => (
                <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30">
                  <div>
                    <p className="text-white text-sm font-medium">{category}</p>
                    <p className="text-gray-400 text-xs">{data.count} transactions</p>
                  </div>
                  <span className={`font-medium ${data.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
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
