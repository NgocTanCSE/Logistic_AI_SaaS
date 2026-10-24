'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'phosphor-react';
import { create, Order, initStore } from '@/lib/local-store';

const STATUSES: Order['status'][] = [
  'NEW',
  'UNASSIGNED',
  'PENDING_PICKUP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'RETURNED',
  'RETURN_REQUESTED',
  'CANCELLED',
];

export default function NewOrderPage() {
  const router = useRouter();
  const [trackingCode, setTrackingCode] = useState('');
  const [clientOrderRef, setClientOrderRef] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [status, setStatus] = useState<Order['status']>('NEW');
  const [codAmount, setCodAmount] = useState('');
  const [shippingFee, setShippingFee] = useState('');
  const [clientName, setClientName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTrackingCode = () => {
    const year = new Date().getFullYear();
    const num = Math.floor(1000 + Math.random() * 9000);
    return `TRK-${year}-${num}`;
  };

  const handleGenerateCode = () => {
    setTrackingCode(generateTrackingCode());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      initStore();
      const newOrder: Order = {
        id: `ord_${Date.now()}`,
        trackingCode: trackingCode || generateTrackingCode(),
        clientOrderRef,
        recipientName,
        recipientAddress,
        origin,
        destination,
        status,
        codAmount: Number(codAmount) || 0,
        shippingFee: Number(shippingFee) || 0,
        createdAt: new Date().toISOString(),
        client: clientName ? { name: clientName } : undefined,
      };
      create('orders', newOrder as any);
      router.push('/admin/orders');
    } catch (err: any) {
      setError(err?.message || 'Failed to create order.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/orders');
  };

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-ink">New Order</h2>
        <button
          onClick={handleCancel}
          className="text-sm text-inkSoft hover:text-ink underline"
        >
          Back to Orders
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-slate-200 rounded-2xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Tracking Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary/50"
                placeholder="TRK-2024-xxxx"
              />
              <button
                type="button"
                onClick={handleGenerateCode}
                className="px-3 rounded-xl border border-slate-200 hover:bg-surface-alt text-xs font-medium"
                title="Generate random tracking code"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Client Order Ref</label>
            <input
              type="text"
              value={clientOrderRef}
              onChange={(e) => setClientOrderRef(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary/50"
              placeholder="PO-2024-xxxx"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Recipient Name</label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Client Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary/50"
              placeholder="e.g. Acme Logistics"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Recipient Address</label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary/50"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Origin</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Order['status'])}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary/50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">COD Amount (đ)</label>
            <input
              type="number"
              value={codAmount}
              onChange={(e) => setCodAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary/50"
              placeholder="e.g. 2450000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Shipping Fee (đ)</label>
            <input
              type="number"
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary/50"
              placeholder="e.g. 85000"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-ink hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Saving...' : 'Create Order'}
            {!saving && <Plus className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
