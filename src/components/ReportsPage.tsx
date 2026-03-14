'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, subMonths, eachMonthOfInterval } from 'date-fns';

interface Transaction {
  id: string;
  amount: number;
  note: string;
  date: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
  };
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  createdAt: string;
  updatedAt: string;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

interface CategoryData {
  name: string;
  value: number;
  type: 'INCOME' | 'EXPENSE';
  color: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

const EXPENSE_COLORS = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'];
const INCOME_COLORS = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'];

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories')
      ]);

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.data || []);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setPredefinedPeriod = (period: 'month' | 'quarter' | 'year') => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        start = quarterStart;
        end = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        return;
    }

    setSelectedPeriod(period);
    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    return transactionDate >= start && transactionDate <= end;
  });

  // Calculate summary statistics
  const summary = filteredTransactions.reduce((acc, transaction) => {
    if (transaction.category.type === 'INCOME') {
      acc.totalIncome += transaction.amount;
    } else {
      acc.totalExpense += transaction.amount;
    }
    return acc;
  }, { totalIncome: 0, totalExpense: 0 });

  const netAmount = summary.totalIncome - summary.totalExpense;

  // Generate monthly trend data for the last 12 months
  const generateMonthlyData = (): MonthlyData[] => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });

      const income = monthTransactions
        .filter(t => t.category.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expense = monthTransactions
        .filter(t => t.category.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        month: format(month, 'MMM yyyy'),
        income: income / 1000, // Convert to thousands for better readability
        expense: expense / 1000,
        net: (income - expense) / 1000
      };
    });
  };

  // Generate category breakdown data
  const generateCategoryData = (): CategoryData[] => {
    const categoryTotals = filteredTransactions.reduce((acc, transaction) => {
      const categoryName = transaction.category.name;
      const type = transaction.category.type;
      
      if (!acc[categoryName]) {
        acc[categoryName] = { total: 0, type };
      }
      acc[categoryName].total += transaction.amount;
      
      return acc;
    }, {} as Record<string, { total: number; type: 'INCOME' | 'EXPENSE' }>);

    return Object.entries(categoryTotals)
      .map(([name, data], index) => ({
        name,
        value: Math.round(data.total),
        type: data.type,
        color: data.type === 'EXPENSE' ? EXPENSE_COLORS[index % EXPENSE_COLORS.length] : INCOME_COLORS[index % INCOME_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  };

  const monthlyData = generateMonthlyData();
  const categoryData = generateCategoryData();
  const expenseData = categoryData.filter(c => c.type === 'EXPENSE');
  const incomeData = categoryData.filter(c => c.type === 'INCOME');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyK = (value: number) => {
    return `₦${value}K`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">📊 Financial Reports</h1>
          <p className="text-gray-400">Comprehensive analysis of your financial data</p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-8 bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">📅 Time Period</h2>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              onClick={() => setPredefinedPeriod('month')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedPeriod === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setPredefinedPeriod('quarter')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedPeriod === 'quarter'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              This Quarter
            </button>
            <button
              onClick={() => setPredefinedPeriod('year')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedPeriod === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              This Year
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => {
                  setSelectedPeriod('custom');
                  setDateRange({ ...dateRange, startDate: e.target.value });
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => {
                  setSelectedPeriod('custom');
                  setDateRange({ ...dateRange, endDate: e.target.value });
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm font-medium">Total Income</p>
                <p className="text-2xl font-bold text-green-300">{formatCurrency(summary.totalIncome)}</p>
              </div>
              <span className="text-3xl">💰</span>
            </div>
          </div>
          
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-sm font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-red-300">{formatCurrency(summary.totalExpense)}</p>
              </div>
              <span className="text-3xl">💸</span>
            </div>
          </div>
          
          <div className={`border rounded-lg p-6 ${netAmount >= 0 ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${netAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>Net Amount</p>
                <p className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {formatCurrency(Math.abs(netAmount))}
                </p>
              </div>
              <span className="text-3xl">{netAmount >= 0 ? '📈' : '📉'}</span>
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm font-medium">Transactions</p>
                <p className="text-2xl font-bold text-blue-300">{filteredTransactions.length}</p>
              </div>
              <span className="text-3xl">📋</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trend */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">📈 Monthly Trend (Last 12 Months)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" tickFormatter={formatCurrencyK} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value * 1000)}
                    labelStyle={{ color: '#000' }}
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} name="Income" />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} name="Expenses" />
                  <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={3} name="Net" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Income vs Expenses Bar Chart */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">💊 Income vs Expenses (Last 12 Months)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" tickFormatter={formatCurrencyK} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value * 1000)}
                    labelStyle={{ color: '#000' }}
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Income" />
                  <Bar dataKey="expense" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pie Charts for Categories */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Expense Categories */}
          {expenseData.length > 0 && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">💳 Expense Categories</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Income Categories */}
          {incomeData.length > 0 && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">💰 Income Categories</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Category Breakdown Table */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">📊 Category Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 text-gray-400">Category</th>
                    <th className="text-left py-2 text-gray-400">Type</th>
                    <th className="text-right py-2 text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((category, index) => (
                    <tr key={index} className="border-b border-gray-800">
                      <td className="py-2 text-white">{category.name}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          category.type === 'INCOME' 
                            ? 'bg-green-900 text-green-300' 
                            : 'bg-red-900 text-red-300'
                        }`}>
                          {category.type}
                        </span>
                      </td>
                      <td className="py-2 text-right text-white">{formatCurrency(category.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">🕐 Recent Transactions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 text-gray-400">Date</th>
                    <th className="text-left py-2 text-gray-400">Note</th>
                    <th className="text-right py-2 text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-800">
                        <td className="py-2 text-gray-300">{format(new Date(transaction.date), 'MMM dd')}</td>
                        <td className="py-2 text-white truncate max-w-0" title={transaction.note}>
                          {transaction.note}
                        </td>
                        <td className={`py-2 text-right ${
                          transaction.category.type === 'INCOME' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.category.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
