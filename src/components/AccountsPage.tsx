'use client';

import { useState, useEffect } from 'react';
import { Account, AccountWithStats, AccountType, AccountMode, CreateAccountRequest, UpdateAccountRequest } from '@/types/account';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import AccountMembersModal from '@/components/AccountMembersModal';

// The account "mode" drives the whole app experience: PERSONAL is the finance
// tracker, BUSINESS is the lean P&L (Orders + Costs) module.
const ACCOUNT_MODES: { value: AccountMode; label: string; description: string }[] = [
  { value: 'PERSONAL', label: '👤 Personal', description: 'Personal finance tracker' },
  { value: 'BUSINESS', label: '🏢 Business', description: 'Orders, costs & profit/loss' },
];

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
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<UpdateAccountRequest>({});
  const { currentUser } = useAuth();
  const { refreshAccounts } = useActiveAccount();
  const isAdmin = currentUser?.role === 'ADMIN';
  const canEdit = currentUser?.role !== 'VIEWER';

  const [newAccount, setNewAccount] = useState<CreateAccountRequest>({
    userId: 'user_admin_001', // Default admin user for now
    name: '',
    handle: '',
    description: '',
    type: 'PERSONAL',
    mode: 'PERSONAL',
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
        await refreshAccounts();
        setNewAccount({
          userId: 'user_admin_001', // Default admin user for now
          name: '',
          handle: '',
          description: '',
          type: 'PERSONAL',
          mode: 'PERSONAL',
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

  const openSettings = (account: AccountWithStats) => {
    setSettingsForm({
      name: account.name,
      handle: account.handle ?? '',
      description: account.description ?? '',
      type: account.type,
      mode: account.mode,
      isActive: account.isActive,
    });
    setShowSettings(true);
  };

  const saveSettings = async () => {
    if (!selectedAccountId || !settingsForm.name?.trim()) return;

    setSavingSettings(true);
    try {
      const response = await authFetch(`/api/accounts/${selectedAccountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });

      if (response.ok) {
        await fetchAccounts();
        await refreshAccounts();
        setShowSettings(false);
      }
    } catch (error) {
      console.error('Error updating account:', error);
    } finally {
      setSavingSettings(false);
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
                          <p className="text-sm text-muted-foreground">
                            {getAccountTypeLabel(account.type)}
                            {account.handle && (
                              <span className="ml-2 text-blue-400">@{account.handle}</span>
                            )}
                          </p>
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
                        <h2 className="text-2xl font-bold text-foreground">
                          {selectedAccount.name}
                          {selectedAccount.handle && (
                            <span className="ml-2 text-lg font-medium text-blue-400">@{selectedAccount.handle}</span>
                          )}
                        </h2>
                        <p className="text-muted-foreground">{selectedAccount.description || 'No description'}</p>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                        <p className={`text-3xl font-bold ${
                          selectedAccount.currentBalance >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(selectedAccount.currentBalance)}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setShowMembers(true)}
                          className="bg-muted hover:bg-accent border border-border text-foreground px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                          👥 Members
                        </button>
                      )}
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
                      className="bg-muted hover:bg-accent border border-border rounded-lg p-4 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => openSettings(selectedAccount)}
                      disabled={!canEdit}
                      title={canEdit ? 'Edit account settings' : 'You have read-only access'}
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

        {/* Members Modal */}
        {showMembers && selectedAccount && (
          <AccountMembersModal
            accountId={selectedAccount.id}
            accountName={selectedAccount.name}
            onClose={() => setShowMembers(false)}
          />
        )}

        {/* Account Settings / Edit Modal */}
        {showSettings && selectedAccount && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-500/15 text-blue-500">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Account Settings</h2>
                    <p className="text-sm text-muted-foreground">Edit “{selectedAccount.name}”</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  aria-label="Close"
                  className="p-2 -mr-2 -mt-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41 12 22l-9-9V4a1 1 0 0 1 1-1h9Z" />
                      <circle cx="7.5" cy="7.5" r="1.5" />
                    </svg>
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={settingsForm.name ?? ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    placeholder="Enter account name"
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                    <span className="text-muted-foreground">@</span> Handle
                  </label>
                  <div className="flex items-center bg-input border border-border rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500">
                    <span className="text-muted-foreground">@</span>
                    <input
                      type="text"
                      value={settingsForm.handle ?? ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          handle: e.target.value.replace(/^@/, '').toLowerCase(),
                        })
                      }
                      placeholder="handle used for transfers"
                      className="w-full bg-transparent py-2 pl-1 text-foreground focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    A globally-unique handle used for transfers. De-duplicated on save.
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16v16H4Z" />
                      <path d="M8 9h8M8 13h6" />
                    </svg>
                    Description
                  </label>
                  <input
                    type="text"
                    value={settingsForm.description ?? ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                    placeholder="Enter description (optional)"
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18" />
                      <path d="M5 21V7l7-4 7 4v14" />
                      <path d="M9 21v-6h6v6" />
                    </svg>
                    Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {ACCOUNT_MODES.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, mode: m.value })}
                        className={`text-left rounded-lg border p-3 transition-colors ${
                          (settingsForm.mode ?? selectedAccount.mode) === m.value
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-border bg-input hover:bg-accent'
                        }`}
                      >
                        <span className="block text-sm font-medium text-foreground">{m.label}</span>
                        <span className="block text-xs text-muted-foreground">{m.description}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Switching mode changes this account&apos;s experience (tracker vs P&amp;L).
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="14" rx="2" />
                      <path d="M3 10h18" />
                    </svg>
                    Account Type
                  </label>
                  <select
                    value={settingsForm.type ?? selectedAccount.type}
                    onChange={(e) => setSettingsForm({ ...settingsForm, type: e.target.value as AccountType })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 cursor-pointer">
                  <span>
                    <span className="block text-sm font-medium text-foreground">Active</span>
                    <span className="block text-xs text-muted-foreground">Inactive accounts are hidden from most views.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settingsForm.isActive ?? true}
                    onChange={(e) => setSettingsForm({ ...settingsForm, isActive: e.target.checked })}
                    className="h-5 w-5 accent-blue-600"
                  />
                </label>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-border bg-card">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 bg-muted hover:bg-accent text-foreground px-4 py-2 rounded-lg font-medium transition-colors"
                  disabled={savingSettings}
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={savingSettings || !settingsForm.name?.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {savingSettings ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                    Handle
                  </label>
                  <div className="flex items-center bg-input border border-border rounded-lg px-3 focus-within:border-blue-500">
                    <span className="text-muted-foreground">@</span>
                    <input
                      type="text"
                      value={newAccount.handle ?? ''}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          handle: e.target.value.replace(/^@/, '').toLowerCase(),
                        })
                      }
                      placeholder="auto-generated from name if left blank"
                      className="w-full bg-transparent py-2 pl-1 text-foreground focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    A globally-unique handle used for transfers. De-duplicated on save.
                  </p>
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
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Mode *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {ACCOUNT_MODES.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setNewAccount({ ...newAccount, mode: m.value })}
                        className={`text-left rounded-lg border p-3 transition-colors ${
                          (newAccount.mode ?? 'PERSONAL') === m.value
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-border bg-input hover:bg-accent'
                        }`}
                      >
                        <span className="block text-sm font-medium text-foreground">{m.label}</span>
                        <span className="block text-xs text-muted-foreground">{m.description}</span>
                      </button>
                    ))}
                  </div>
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
