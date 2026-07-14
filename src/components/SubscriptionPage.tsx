'use client';

import React, { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

interface SubscriptionCustomer {
  name: string;
  rootEmail: string;
  plan: string;
  status: string;
}

interface SubscriptionHistoryItem {
  id: string;
  plan: string;
  type: string;
  amount: number;
  currency: string;
  note: string | null;
  createdAt: string;
}

interface SubscriptionData {
  customer: SubscriptionCustomer;
  isRoot: boolean;
  history: SubscriptionHistoryItem[] | null;
}

export default function SubscriptionPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoading(true);
        const response = await authFetch('/api/subscription');
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to load subscription');
        }
      } catch (err) {
        setError('Failed to load subscription');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: currency || 'NGN',
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-muted-foreground">Loading subscription...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Subscription</h1>
          <p className="text-muted-foreground">Manage your billable account</p>
        </div>
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error || 'No subscription data available.'}
        </div>
      </div>
    );
  }

  const { customer, isRoot, history } = data;
  const isActive = customer.status?.toUpperCase() === 'ACTIVE';

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Subscription</h1>
        <p className="text-muted-foreground">Manage your billable account</p>
      </div>

      {/* Account card */}
      <div className="border border-border rounded-lg bg-card p-6 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">{customer.name}</h2>
            <p className="text-sm text-muted-foreground">{customer.rootEmail}</p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive
                ? 'bg-green-900/50 text-green-300'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {customer.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Plan</p>
            <p className="text-lg font-semibold text-foreground">{customer.plan}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Root email</p>
            <p className="text-lg font-semibold text-foreground break-all">{customer.rootEmail}</p>
          </div>
        </div>
      </div>

      {/* Billing history */}
      {isRoot ? (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Billing history</h2>
          </div>

          {!history || history.length === 0 ? (
            <div className="p-8 text-center">
              <span className="text-4xl mb-4 block">🧾</span>
              <p className="text-muted-foreground">No billing history yet.</p>
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
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-accent">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {item.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {item.plan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-foreground">
                        {formatAmount(item.amount, item.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Only the account owner (rootEmail) can view billing history.
          </p>
        </div>
      )}
    </div>
  );
}
