'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Order, OrderStatus, CreateOrderRequest } from '@/types/business';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { formatAmountInput, parseAmount } from '@/lib/amount';

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_BADGE: Record<OrderStatus, string> = {
  PAID: 'bg-green-500/15 text-green-500',
  PENDING: 'bg-yellow-500/15 text-yellow-500',
  CANCELLED: 'bg-muted-foreground/15 text-muted-foreground',
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function OrdersPage() {
  const { currentUser } = useAuth();
  const { activeAccount, activeAccountId } = useActiveAccount();
  const canEdit = currentUser?.role !== 'VIEWER';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [customerName, setCustomerName] = useState('');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<OrderStatus>('PAID');
  const [note, setNote] = useState('');

  const currency = activeAccount?.currency || 'NGN';
  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value),
    [currency],
  );

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const fetchOrders = useCallback(async () => {
    if (!activeAccountId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/orders?accountId=${encodeURIComponent(activeAccountId)}`);
      const json = await res.json();
      if (Array.isArray(json?.data)) setOrders(json.data as Order[]);
    } catch {
      // Non-critical: list stays empty on failure.
    } finally {
      setLoading(false);
    }
  }, [activeAccountId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const resetForm = () => {
    setAmount('');
    setDate(todayIso());
    setCustomerName('');
    setReference('');
    setStatus('PAID');
    setNote('');
  };

  const createOrder = async () => {
    if (!activeAccountId || parseAmount(amount) <= 0) return;
    setSaving(true);
    try {
      const body: CreateOrderRequest = {
        accountId: activeAccountId,
        amount: parseAmount(amount),
        date,
        customerName: customerName.trim() || null,
        reference: reference.trim() || null,
        status,
        note: note.trim() || null,
      };
      const res = await authFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        resetForm();
        setShowForm(false);
        await fetchOrders();
      }
    } catch {
      // Ignore; the form stays open so the user can retry.
    } finally {
      setSaving(false);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this order?')) return;
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (res.ok) setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch {
      // Ignore delete failures.
    } finally {
      setDeletingId(null);
    }
  };

  // Only reachable for business accounts.
  if (activeAccount && activeAccount.mode !== 'BUSINESS') {
    return (
      <div className="container mx-auto px-6 py-16 max-w-3xl text-center">
        <span className="text-5xl mb-4 block">🧾</span>
        <h1 className="text-2xl font-bold text-foreground mb-2">Orders are for business accounts</h1>
        <p className="text-muted-foreground mb-6">
          Switch to a business account to record orders.
        </p>
        <Link href="/" className="text-blue-500 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">🧾 Orders</h1>
          <p className="text-muted-foreground">
            Sales for {activeAccount?.name ?? 'this account'}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
          >
            {showForm ? '✕ Close' : '➕ New Order'}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && canEdit && (
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">New Order</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Amount *</label>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                placeholder="0"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Customer name</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Optional"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Reference</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional (e.g. invoice no.)"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Note</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              disabled={saving}
              className="flex-1 bg-muted hover:bg-accent text-foreground px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createOrder}
              disabled={saving || parseAmount(amount) <= 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Create Order'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl mb-3 block">🧾</span>
            <p className="text-muted-foreground">No orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  {canEdit && <th className="px-4 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatDate(order.date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.reference || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.customerName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_BADGE[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">
                      {formatCurrency(order.amount)}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteOrder(order.id)}
                          disabled={deletingId === order.id}
                          className="text-red-500 hover:text-red-400 text-sm disabled:opacity-50"
                        >
                          {deletingId === order.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
