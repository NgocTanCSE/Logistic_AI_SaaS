'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import { formatVnd } from '@/lib/format';
import {
  EditorialPageHeader,
  EditorialSection,
  EmptyNote,
  MetricBand,
  StatusLabel,
  type StatusTone,
} from 'ui-kit';

const fetcher = async (url: string) => {
  const token = localStorage.getItem('smartlogi_customer_token');
  const userStr = localStorage.getItem('smartlogi_customer_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (user?.slug) headers['x-tenant-slug'] = user.slug;

  const res = await api.get(url, { headers });
  return res.data;
};

function readList(payload: any): any[] {
  const root = payload?.data ?? payload;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.items)) return root.items;
  return [];
}

function readTotal(payload: any): number {
  const root = payload?.data ?? payload;
  const total = root?.meta?.total ?? root?.total ?? payload?.meta?.total ?? payload?.total;
  return typeof total === 'number' ? total : readList(payload).length;
}

function formatStatus(status?: string) {
  if (!status) return 'Unknown';
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const STATUS_TONES: Record<string, StatusTone> = {
  DELIVERED: 'success',
  RETURNED: 'danger',
  CANCELLED: 'danger',
  FAILED: 'danger',
  IN_TRANSIT: 'info',
  OUT_FOR_DELIVERY: 'info',
  PICKED_UP: 'info',
  ASSIGNED: 'info',
  NEW: 'warning',
  PENDING: 'warning',
};

const IN_TRANSIT_STATUSES = new Set([
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'PICKED_UP',
  'ASSIGNED',
  'PICKUP_SCHEDULED',
]);

export default function ClientDashboard() {
  const {
    data: ordersData,
    error: ordersError,
    isLoading: ordersLoading,
    mutate: mutateOrders,
  } = useSWR('/client/orders', fetcher);
  const {
    data: invoicesData,
    error: invoicesError,
    mutate: mutateInvoices,
  } = useSWR('/client/invoices', fetcher);

  const [updatedAt, setUpdatedAt] = useState('');

  const orders = readList(ordersData);
  const invoices = readList(invoicesData);
  const totalShipments = readTotal(ordersData);
  const delivered = orders.filter((order: any) => order.status === 'DELIVERED').length;
  const inTransit = orders.filter((order: any) => IN_TRANSIT_STATUSES.has(order.status)).length;
  const returned = orders.filter(
    (order: any) => order.status === 'RETURNED' || order.status === 'CANCELLED',
  ).length;
  const returnRate = totalShipments > 0 ? `${((returned / totalShipments) * 100).toFixed(1)}%` : '—';
  const unpaidInvoices = invoices.filter(
    (invoice: any) => invoice.status === 'PENDING' || invoice.status === 'FAILED',
  );
  const outstandingAmount = unpaidInvoices.reduce(
    (sum: number, invoice: any) => sum + Number(invoice.totalAmount || 0),
    0,
  );

  useEffect(() => {
    if (ordersData) {
      setUpdatedAt(
        new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
      );
    }
  }, [ordersData]);

  const refresh = () => {
    void mutateOrders();
    void mutateInvoices();
  };

  const recentOrders = orders.slice(0, 6);

  return (
    <div className="space-y-4">
      <EditorialPageHeader
        eyebrow={
          <>
            <span>B2B customer</span>
            <span className="text-line-strong" aria-hidden="true">
              /
            </span>
            <span>Delivery performance</span>
          </>
        }
        title="Delivery desk"
        description="The shipments, exceptions and invoices that need attention on your account right now."
        meta={
          <>
            <p>{updatedAt ? `Updated at ${updatedAt}` : 'Syncing customer data'}</p>
            <p className="mt-0.5">
              <StatusLabel tone={ordersError ? 'danger' : ordersLoading ? 'neutral' : 'success'}>
                {ordersError ? 'Orders API unavailable' : ordersLoading ? 'Loading orders' : 'Orders API connected'}
              </StatusLabel>
            </p>
          </>
        }
        actions={
          <button
            type="button"
            onClick={refresh}
            className="h-9 rounded-md border border-line px-3 text-[12px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            Refresh data
          </button>
        }
      />

      {ordersError ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-danger bg-surface px-3 py-2 text-[12px] text-ink-soft">
          <span>Could not load shipments. Check your connection and try again.</span>
          <button
            type="button"
            onClick={() => void mutateOrders()}
            className="font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
          >
            Try again
          </button>
        </div>
      ) : null}

      <MetricBand
        metrics={[
          {
            label: 'Total shipments',
            value: ordersLoading ? '—' : new Intl.NumberFormat('vi-VN').format(totalShipments),
            meta: 'Orders visible to this account',
          },
          {
            label: 'Delivered',
            value: ordersLoading ? '—' : new Intl.NumberFormat('vi-VN').format(delivered),
            meta: 'Completed deliveries',
            tone: 'success',
          },
          {
            label: 'In transit',
            value: ordersLoading ? '—' : new Intl.NumberFormat('vi-VN').format(inTransit),
            meta: 'Picked up or on the way',
          },
          {
            label: 'Return / cancel',
            value: ordersLoading ? '—' : returnRate,
            meta: `${returned} exception${returned === 1 ? '' : 's'}`,
            tone: returned > 0 ? 'danger' : 'default',
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <EditorialSection
          eyebrow="Shipments"
          title="Recent orders"
          action={
            <Link
              href="/client/orders"
              className="text-[12px] font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
            >
              View all orders
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <caption className="sr-only">Recent customer shipments and their current status</caption>
              <thead>
                <tr className="border-b border-line">
                  <th
                    scope="col"
                    className="h-8 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    Tracking
                  </th>
                  <th
                    scope="col"
                    className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    Recipient
                  </th>
                  <th
                    scope="col"
                    className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="h-8 pl-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    Fee
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr className="border-b border-line/80">
                    <td colSpan={4} className="h-[42px] text-[12px] text-ink-faint">
                      Loading shipments…
                    </td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr className="border-b border-line/80">
                    <td colSpan={4} className="h-[42px] text-[12px] text-ink-faint">
                      No shipments yet. Create an order or upload a batch to get started.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order: any) => (
                    <tr
                      key={order.id}
                      className="h-[42px] border-b border-line/80 transition-colors hover:bg-surface-alt/60"
                    >
                      <td className="pr-3 font-mono text-[12px] font-medium text-ink">
                        {order.trackingCode || '—'}
                      </td>
                      <td className="px-3 text-[13px] text-ink-soft">
                        {order.recipientName || '—'}
                      </td>
                      <td className="px-3">
                        <StatusLabel tone={STATUS_TONES[order.status] ?? 'neutral'}>
                          {formatStatus(order.status)}
                        </StatusLabel>
                      </td>
                      <td className="pl-3 text-right text-[12px] font-medium tabular-nums text-ink">
                        {formatVnd(order.shippingFee)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </EditorialSection>

        <aside className="space-y-5 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Account
            </p>
            <dl className="mt-2 space-y-2 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-faint">Outstanding invoices</dt>
                <dd className="text-right font-medium text-ink">
                  {invoicesError ? '—' : unpaidInvoices.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-faint">Amount due</dt>
                <dd className="text-right font-semibold tabular-nums text-ink">
                  {invoicesError ? '—' : formatVnd(outstandingAmount)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-faint">Invoices API</dt>
                <dd>
                  <StatusLabel tone={invoicesError ? 'danger' : 'success'}>
                    {invoicesError ? 'Unavailable' : 'Connected'}
                  </StatusLabel>
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Next actions
            </p>
            <div className="mt-2 divide-y divide-line border-y border-line">
              {[
                { label: 'Orders', caption: 'Review shipments and exceptions', href: '/client/orders' },
                { label: 'Invoices', caption: 'Pay or download billing documents', href: '/client/invoices' },
                { label: 'Inventory', caption: 'Check stock allocated to your account', href: '/client/inventory' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex min-h-[42px] items-center justify-between gap-3 py-2 transition-colors hover:text-accent"
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink group-hover:text-accent">
                      {link.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
                      {link.caption}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-ink-faint group-hover:text-accent">
                    Open
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <EmptyNote>
            Shipments, invoices and inventory are fetched from separate services. The timestamps can
            differ by a few seconds.
          </EmptyNote>
        </aside>
      </div>
    </div>
  );
}
