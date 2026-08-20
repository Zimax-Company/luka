'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ProfitAndLoss } from '@/types/business';
import { authFetch } from '@/lib/api';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';

// Business-account home: a lean Profit & Loss overview scoped to the active
// business account, fed by Orders (revenue) and Costs (expenditure).
export default function BusinessDashboard() {
  const { activeAccount, activeAccountId, switchAccount } = useActiveAccount();
  const [pnl, setPnl] = useState<ProfitAndLoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currency = activeAccount?.currency || 'NGN';
  const formatCurrency = useCallback(
    (amount: number) =>
      new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount),
    [currency],
  );

  useEffect(() => {
    if (!activeAccountId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          `/api/pnl?accountId=${encodeURIComponent(activeAccountId)}`,
        );
        const json = await res.json();
        if (!cancelled) {
          if (json?.data) setPnl(json.data as ProfitAndLoss);
          else setError('Failed to load profit & loss');
        }
      } catch {
        if (!cancelled) setError('Failed to load profit & loss');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeAccountId]);

  const profit = pnl?.profit ?? 0;

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-500">BUSINESS</p>
          <h1 className="text-3xl font-bold text-foreground">
            {activeAccount?.name ?? 'Business'}
          </h1>
          {activeAccount?.handle && (
            <p className="text-muted-foreground">@{activeAccount.handle}</p>
          )}
        </div>
        <button
          onClick={switchAccount}
          className="bg-muted hover:bg-accent border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          🔀 Switch account
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-lg text-muted-foreground">Loading profit & loss…</div>
        </div>
      ) : (
        <>
          {/* Hero cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Revenue */}
            <div className="border border-border rounded-lg bg-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🧾</span>
                <h3 className="text-lg font-semibold text-foreground">Revenue</h3>
              </div>
              <p className="text-3xl font-bold text-green-500">
                {formatCurrency(pnl?.revenue ?? 0)}
              </p>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Paid</span>
                  <span className="text-green-500 font-medium">
                    {formatCurrency(pnl?.paidRevenue ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Pending</span>
                  <span className="text-yellow-500 font-medium">
                    {formatCurrency(pnl?.pendingRevenue ?? 0)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {pnl?.orderCount ?? 0} orders
              </p>
            </div>

            {/* Costs */}
            <div className="border border-border rounded-lg bg-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💸</span>
                <h3 className="text-lg font-semibold text-foreground">Costs</h3>
              </div>
              <p className="text-3xl font-bold text-red-500">
                {formatCurrency(pnl?.costs ?? 0)}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {pnl?.costCount ?? 0} costs
              </p>
            </div>

            {/* Profit */}
            <div className="border border-border rounded-lg bg-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📈</span>
                <h3 className="text-lg font-semibold text-foreground">Profit / Loss</h3>
              </div>
              <p className={`text-3xl font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(profit)}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">Revenue − Costs</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/orders"
              className="border border-border rounded-lg bg-card p-6 hover:bg-accent transition-colors flex items-center gap-4"
            >
              <span className="text-3xl">🧾</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">Orders</h3>
                <p className="text-sm text-muted-foreground">
                  Record sales that make up your revenue.
                </p>
              </div>
              <span className="text-muted-foreground">→</span>
            </Link>

            <Link
              href="/costs"
              className="border border-border rounded-lg bg-card p-6 hover:bg-accent transition-colors flex items-center gap-4"
            >
              <span className="text-3xl">💸</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">Costs</h3>
                <p className="text-sm text-muted-foreground">
                  Log expenses that reduce your profit.
                </p>
              </div>
              <span className="text-muted-foreground">→</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
