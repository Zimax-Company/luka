'use client';

import { useState, useEffect } from 'react';
import { Account, AccountWithStats, AccountType, CreateAccountRequest } from '@/types/account';
import { authFetch } from '@/lib/api';

const ACCOUNT_TYPES = [
  { value: 'PERSONAL' as AccountType, label: '👤 Personal', description: 'Personal finances and expenses' },
  { value: 'BUSINESS' as AccountType, label: '🏢 Business', description: 'Business income and expenses' },
  { value: 'SAVINGS' as AccountType, label: '💰 Savings', description: 'Savings and emergency fund' },
  { value: 'CHECKING' as AccountType, label: '🏦 Checking', description: 'Primary spending account' },
  { value: 'CREDIT' as AccountType, label: '💳 Credit', description: 'Credit card and loans' },
  { value: 'INVESTMENT' as AccountType, label: '📈 Investment', description: 'Investment portfolio' }
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  const [newAccount, setNewAccount] = useState<CreateAccountRequest>({
    userId: 'user_admin_001', // Default admin user for now
    name: '',
    description: '',
    type: 'PERSONAL',
    currency: 'NGN'
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        
        // Fetch stats for each account
        const accountsWithStats = await Promise.all(
          data.data.map(async (account: Account) => {
            const statsResponse = await authFetch(`/api/accounts/${account.id}?withStats=true`);
            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              return statsData.data;
            }
            return account;
          })
        );
        
        setAccounts(accountsWithStats);
        
        // Set first account as selected if none selected
        if (!selectedAccountId && accountsWithStats.length > 0) {
          setSelectedAccountId(accountsWithStats[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async () => {
    if (!newAccount.name.trim()) return;
    
    setCreating(true);
    try {
      const response = await authFetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount)
      });
      
      if (response.ok) {
        await fetchAccounts();
        setNewAccount({
          userId: 'user_admin_001', // Default admin user for now
          name: '',
          description: '',
          type: 'PERSONAL',
          currency: 'NGN'
        });
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error creating account:', error);
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getAccountTypeIcon = (type: AccountType) => {
    const accountType = ACCOUNT_TYPES.find(t => t.value === type);
    return accountType?.label.split(' ')[0] || '🏦';
  };

  const getAccountTypeLabel = (type: AccountType) => {
    const accountType = ACCOUNT_TYPES.find(t => t.value === type);
    return accountType?.label.split(' ').slice(1).join(' ') || type;
  };

  const selectedAccount = accounts.find(account => account.id === selectedAccountId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-foreground">🏦 Account Management</h1>
            <p className="text-muted-foreground">Manage your financial accounts</p>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
          >
            ➕ New Account
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Account Selector */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Your Accounts</h2>
              
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors border ${
                      selectedAccountId === account.id
                        ? 'border-blue-600 bg-blue-600/10'
                        : 'border-border bg-muted hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getAccountTypeIcon(account.type)}</span>
                        <div>
                          <h3 className="font-medium text-foreground">{account.name}</h3>
                          <p className="text-sm text-muted-foreground">{getAccountTypeLabel(account.type)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className={`text-lg font-bold ${
                        account.currentBalance >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(account.currentBalance)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {account.transactionCount} transactions
                      </span>
                    </div>
                  </div>
                ))}
                
                {accounts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-2">No accounts found</p>
                    <p className="text-sm">Create your first account to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="lg:col-span-2">
            {selectedAccount ? (
              <div className="space-y-6">
                {/* Account Overview */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{getAccountTypeIcon(selectedAccount.type)}</span>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">{selectedAccount.name}</h2>
                        <p className="text-muted-foreground">{selectedAccount.description || 'No description'}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className={`text-3xl font-bold ${
                        selectedAccount.currentBalance >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(selectedAccount.currentBalance)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
                      <p className="text-green-400 text-sm font-medium">Total Income</p>
                      <p className="text-xl font-bold text-green-300">{formatCurrency(selectedAccount.totalIncome)}</p>
                    </div>
                    
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
                      <p className="text-red-400 text-sm font-medium">Total Expenses</p>
                      <p className="text-xl font-bold text-red-300">{formatCurrency(selectedAccount.totalExpenses)}</p>
                    </div>
                    
                    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 text-center">
                      <p className="text-blue-400 text-sm font-medium">Transactions</p>
                      <p className="text-xl font-bold text-blue-300">{selectedAccount.transactionCount}</p>
                    </div>
                    
                    <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4 text-center">
                      <p className="text-purple-400 text-sm font-medium">Categories</p>
                      <p className="text-xl font-bold text-purple-300">{selectedAccount.categoryCount}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-foreground">Quick Actions</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <a
                      href={`/entries?account=${selectedAccount.id}`}
                      className="bg-muted hover:bg-accent border border-border rounded-lg p-4 text-center transition-colors"
                    >
                      <div className="text-2xl mb-2">💳</div>
                      <p className="text-sm font-medium">View Transactions</p>
                    </a>
                    
                    <a
                      href={`/categories?account=${selectedAccount.id}`}
                      className="bg-muted hover:bg-accent border border-border rounded-lg p-4 text-center transition-colors"
                    >
                      <div className="text-2xl mb-2">📊</div>
                      <p className="text-sm font-medium">Manage Categories</p>
                    </a>
                    
                    <a
                      href={`/reports?account=${selectedAccount.id}`}
                      className="bg-muted hover:bg-accent border border-border rounded-lg p-4 text-center transition-colors"
                    >
                      <div className="text-2xl mb-2">📈</div>
                      <p className="text-sm font-medium">View Reports</p>
                    </a>
                    
                    <button
                      className="bg-muted hover:bg-accent border border-border rounded-lg p-4 text-center transition-colors"
                      onClick={() => {/* TODO: Implement settings */}}
                    >
                      <div className="text-2xl mb-2">⚙️</div>
                      <p className="text-sm font-medium">Account Settings</p>
                    </button>
                  </div>
                </div>

                {/* Account Info */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-foreground">Account Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Account ID</p>
                      <p className="text-foreground font-mono text-sm bg-muted px-3 py-2 rounded">{selectedAccount.id}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Account Type</p>
                      <p className="text-foreground">{getAccountTypeLabel(selectedAccount.type)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Currency</p>
                      <p className="text-foreground">{selectedAccount.currency}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Created</p>
                      <p className="text-foreground">{new Date(selectedAccount.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <span className="text-6xl mb-4 block">🏦</span>
                <h2 className="text-xl font-semibold text-foreground mb-2">Select an Account</h2>
                <p className="text-muted-foreground">Choose an account from the list to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Account Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-background bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-foreground">Create New Account</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    placeholder="Enter account name"
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newAccount.description}
                    onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                    placeholder="Enter description (optional)"
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Account Type *
                  </label>
                  <select
                    value={newAccount.type}
                    onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as AccountType })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-blue-500"
                  >
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-muted hover:bg-accent text-foreground px-4 py-2 rounded-lg transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={createAccount}
                  disabled={creating || !newAccount.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
