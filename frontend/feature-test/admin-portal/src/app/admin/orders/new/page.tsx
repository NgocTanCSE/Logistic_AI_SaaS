'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select } from 'ui-components';
import { EditorialPageHeader, EditorialSection } from 'ui-kit';
import { create, Order, initStore } from '@/lib/local-store';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'UNASSIGNED', label: 'Unassigned' },
  { value: 'PENDING_PICKUP', label: 'Pending pickup' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'RETURN_REQUESTED', label: 'Return requested' },
  { value: 'CANCELLED', label: 'Cancelled' },
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

  useEffect(() => {
    initStore();
    const year = new Date().getFullYear();
    const num = Math.floor(1000 + Math.random() * 9000);
    setTrackingCode(`TRK-${year}-${num}`);
    setClientOrderRef(`PO-${year}-${num + 1}`);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const newOrder: Order = {
        id: `ord_${Date.now()}`,
        trackingCode: trackingCode || `TRK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
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
    <div>
      <EditorialPageHeader
        eyebrow="Dashboard"
        title="New order"
        description="Create a new shipping order for one of your tenants' customers."
        actions={
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Back to orders
          </Button>
        }
      />

      <EditorialSection eyebrow="Order" title="Create order">
        <div className="max-w-3xl">
          {error && (
            <div className="mb-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-[12px] text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <Input label="Tracking code" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="TRK-2024-xxxx" required />
              </div>
              <div>
                <Input label="Client order ref" value={clientOrderRef} onChange={(e) => setClientOrderRef(e.target.value)} placeholder="PO-2024-xxxx" required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <Input label="Recipient name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Acme Logistics" required />
              </div>
              <div>
                <Input label="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Acme Logistics" />
              </div>
            </div>

            <div>
              <Input label="Recipient address" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder="e.g. 123 Main St, Hanoi" required />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <Input label="Origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. Bien Hoa Warehouse" required />
              </div>
              <div>
                <Input label="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. District 1, Ho Chi Minh" required />
              </div>
              <div>
                <Select label="Status" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value as Order['status'])} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <Input label="COD amount (VND)" value={codAmount} onChange={(e) => setCodAmount(e.target.value)} placeholder="e.g. 2450000" type="number" required />
              </div>
              <div>
                <Input label="Shipping fee (VND)" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} placeholder="e.g. 85000" type="number" />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving} isLoading={saving}>
                {saving ? 'Saving…' : 'Create order'}
              </Button>
            </div>
          </form>
        </div>
      </EditorialSection>
    </div>
  );
}
