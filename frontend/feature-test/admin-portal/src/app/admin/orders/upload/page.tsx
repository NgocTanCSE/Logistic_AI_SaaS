'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Plus, Trash } from 'phosphor-react';
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

export default function BulkUploadPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftOrder[]>([
    {
      trackingCode: '',
      clientOrderRef: '',
      recipientName: '',
      recipientAddress: '',
      origin: '',
      destination: '',
      status: 'NEW',
      codAmount: '',
      shippingFee: '',
    },
  ]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addRow = () => {
    setDrafts([
      ...drafts,
      {
        trackingCode: '',
        clientOrderRef: '',
        recipientName: '',
        recipientAddress: '',
        origin: '',
        destination: '',
        status: 'NEW',
        codAmount: '',
        shippingFee: '',
      },
    ]);
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

        setDrafts(parsed);
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
        const trackingCode = draft.trackingCode || `TRK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const order: Order = {
          id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          trackingCode,
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
      router.push('/admin/orders');
    } catch (err: any) {
      setError(err?.message || 'Failed to upload orders.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Bulk Upload Orders</h2>
          <p className="text-sm text-inkSoft mt-1">
            Upload orders via CSV or add rows manually. Fill at least recipient name, address, origin, destination,
            and COD amount.
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/orders')}
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

      <div className="mb-6">
        <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 cursor-pointer hover:bg-surface-alt transition-colors w-max">
          <Upload className="w-5 h-5 text-inkSoft" />
          <span className="text-sm font-medium">Upload CSV</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface/30 text-inkSoft uppercase">
              <th className="py-3 pr-2 text-left">Tracking</th>
              <th className="py-3 pr-2 text-left">Client Ref</th>
              <th className="py-3 pr-2 text-left">Recipient</th>
              <th className="py-3 pr-2 text-left">Address</th>
              <th className="py-3 pr-2 text-left">Origin</th>
              <th className="py-3 pr-2 text-left">Destination</th>
              <th className="py-3 pr-2 text-left">Status</th>
              <th className="py-3 pr-2 text-left">COD</th>
              <th className="py-3 pr-2 text-left">Fee</th>
              <th className="py-3 pr-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={row.trackingCode}
                    onChange={(e) => updateRow(index, 'trackingCode', e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-ink focus:outline-none focus:border-primary/50"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={row.clientOrderRef}
                    onChange={(e) => updateRow(index, 'clientOrderRef', e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-ink focus:outline-none focus:border-primary/50"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={row.recipientName}
                    onChange={(e) => updateRow(index, 'recipientName', e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-ink focus:outline-none focus:border-primary/50"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={row.recipientAddress}
                    onChange={(e) => updateRow(index, 'recipientAddress', e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-ink focus:outline-none focus:border-primary/50"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={row.origin}
                    onChange={(e) => updateRow(index, 'origin', e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-ink focus:outline-none focus:border-primary/50"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={row.destination}
                    onChange={(e) => updateRow(index, 'destination', e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-ink focus:outline-none focus:border-primary/50"
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    value={row.status}
                    onChange={(e) => updateRow(index, 'status', e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-ink focus:outline-none focus:border-primary/50"
                  >
                    <option value="NEW">NEW</option>
                    <option value="UNASSIGNED">UNASSIGNED</option>
                    <option value="IN_TRANSIT">IN_TRANSIT</option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    value={row.codAmount}
                    onChange={(e) => updateRow(index, 'codAmount', e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-ink focus:outline-none focus:border-primary/50"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    value={row.shippingFee}
                    onChange={(e) => updateRow(index, 'shippingFee', e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-ink focus:outline-none focus:border-primary/50"
                  />
                </td>
                <td className="py-2 pr-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="text-rose-500 hover:text-rose-700"
                    title="Remove row"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-200">
        <button
          onClick={addRow}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-surface-alt transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Row
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/orders')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-ink hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? 'Uploading...' : 'Upload Orders'}
            {!uploading && <Upload className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
