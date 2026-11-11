'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select } from 'ui-components';
import { EditorialPageHeader, EditorialSection, EmptyNote } from 'ui-kit';
import { create, Order, initStore } from '@/lib/local-store';

type DraftOrder = {
  trackingCode: string;
  clientOrderRef: string;
  recipientName: string;
  recipientAddress: string;
  origin: string;
  destination: string;
  status: Order['status'];
  codAmount: string;
  shippingFee: string;
};

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

function emptyRow(): DraftOrder {
  return {
    trackingCode: '',
    clientOrderRef: '',
    recipientName: '',
    recipientAddress: '',
    origin: '',
    destination: '',
    status: 'NEW',
    codAmount: '',
    shippingFee: '',
  };
}

export default function BulkUploadPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftOrder[]>([emptyRow()]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () => {
    setDrafts([...drafts, emptyRow()]);
  };

  const removeRow = (index: number) => {
    setDrafts(drafts.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof DraftOrder, value: string) => {
    setDrafts((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());
        const headers = lines[0]?.split(',').map((h) => h.trim().toLowerCase()) ?? [];

        if (headers.length === 0) {
          setError('CSV file is empty or has no headers.');
          return;
        }

        const parsed: DraftOrder[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = cols[idx] ?? '';
          });

          parsed.push({
            trackingCode: row['tracking_code'] || row['trackingCode'] || '',
            clientOrderRef: row['client_order_ref'] || row['clientOrderRef'] || '',
            recipientName: row['recipient_name'] || row['recipientName'] || '',
            recipientAddress: row['recipient_address'] || row['recipientAddress'] || '',
            origin: row['origin'] || '',
            destination: row['destination'] || '',
            status: (row['status'] as Order['status']) || 'NEW',
            codAmount: row['cod_amount'] || row['codAmount'] || '',
            shippingFee: row['shipping_fee'] || row['shippingFee'] || '',
          });
        }

        setDrafts(parsed.length > 0 ? parsed : [emptyRow()]);
        setError(null);
      } catch (err: any) {
        setError(err?.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    setError(null);
    const validDrafts = drafts.filter(
      (d) => d.recipientName && d.recipientAddress && d.origin && d.destination && d.codAmount,
    );

    if (validDrafts.length === 0) {
      setError('At least one row must be filled with recipient name, address, origin, destination, and COD amount.');
      return;
    }

    setUploading(true);
    try {
      initStore();
      validDrafts.forEach((draft) => {
        const order: Order = {
          id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          trackingCode: draft.trackingCode || `TRK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          clientOrderRef: draft.clientOrderRef,
          recipientName: draft.recipientName,
          recipientAddress: draft.recipientAddress,
          origin: draft.origin,
          destination: draft.destination,
          status: draft.status || 'NEW',
          codAmount: Number(draft.codAmount) || 0,
          shippingFee: Number(draft.shippingFee) || 0,
          createdAt: new Date().toISOString(),
        };
        create('orders', order as any);
      });
      setDrafts([emptyRow()]);
      router.push('/admin/orders');
    } catch (err: any) {
      setError(err?.message || 'Failed to upload orders.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <EditorialPageHeader
        eyebrow="Dashboard"
        title="Bulk upload orders"
        description="Upload orders via CSV or add rows manually. Fields marked required note must include recipient name, address, origin, destination, and COD amount."
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/orders')}>
            Back to orders
          </Button>
        }
      />

      <EditorialSection eyebrow="Order" title="Upload table">
        {error && (
          <div className="mb-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-[12px] text-danger">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <label className="inline-flex items-center gap-3 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-[12px] font-medium text-ink-soft hover:bg-surface-alt transition-colors cursor-pointer">
            <span>Upload CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="sr-only"
            />
          </label>
          <Button variant="outline" size="sm" onClick={addRow}>
            Add row
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Draft rows for bulk upload</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="h-8 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Tracking</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Client ref</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Recipient</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Address</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Origin</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Destination</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Status</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">COD</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Fee</th>
                <th scope="col" className="h-8 pl-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-[42px] text-center text-[12px] text-ink-faint">No rows to display.</td>
                </tr>
              ) : (
                drafts.map((row, index) => (
                  <tr key={index} className="h-[42px] border-b border-line/80 transition-colors hover:bg-surface-alt/60">
                    <td className="pr-3">
                      <input
                        type="text"
                        value={row.trackingCode}
                        onChange={(e) => updateRow(index, 'trackingCode', e.target.value)}
                        className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                        placeholder="TRK-2024-xxxx"
                      />
                    </td>
                    <td className="px-3">
                      <input
                        type="text"
                        value={row.clientOrderRef}
                        onChange={(e) => updateRow(index, 'clientOrderRef', e.target.value)}
                        className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                        placeholder="PO-2024-xxxx"
                      />
                    </td>
                    <td className="px-3">
                      <input
                        type="text"
                        value={row.recipientName}
                        onChange={(e) => updateRow(index, 'recipientName', e.target.value)}
                        className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                        placeholder="Company name"
                      />
                    </td>
                    <td className="px-3">
                      <input
                        type="text"
                        value={row.recipientAddress}
                        onChange={(e) => updateRow(index, 'recipientAddress', e.target.value)}
                        className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                        placeholder="Full address"
                      />
                    </td>
                    <td className="px-3">
                      <input
                        type="text"
                        value={row.origin}
                        onChange={(e) => updateRow(index, 'origin', e.target.value)}
                        className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                        placeholder="Warehouse"
                      />
                    </td>
                    <td className="px-3">
                      <input
                        type="text"
                        value={row.destination}
                        onChange={(e) => updateRow(index, 'destination', e.target.value)}
                        className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                        placeholder="Destination"
                      />
                    </td>
                    <td className="px-3">
                      <select
                        value={row.status}
                        onChange={(e) => updateRow(index, 'status', e.target.value)}
                        className="h-8 w-full rounded-md border border-line bg-white px-2 text-[11px] font-medium text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3">
                      <input
                        type="number"
                        value={row.codAmount}
                        onChange={(e) => updateRow(index, 'codAmount', e.target.value)}
                        className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                        placeholder="2450000"
                      />
                    </td>
                    <td className="px-3">
                      <input
                        type="number"
                        value={row.shippingFee}
                        onChange={(e) => updateRow(index, 'shippingFee', e.target.value)}
                        className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                        placeholder="85000"
                      />
                    </td>
                    <td className="pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="text-[11px] font-medium text-ink-soft underline decoration-ink-faint/30 underline-offset-2 hover:text-danger hover:decoration-danger"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" size="sm" onClick={addRow}>
            Add row
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/orders')}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleUpload} disabled={uploading} isLoading={uploading}>
              {uploading ? 'Uploading…' : 'Upload orders'}
            </Button>
          </div>
        </div>
      </EditorialSection>
    </div>
  );
}
