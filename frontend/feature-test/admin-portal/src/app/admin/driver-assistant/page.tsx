'use client';

import { useEffect, useState } from 'react';
import { EditorialPageHeader, EditorialSection, MetricBand, StatusLabel } from 'ui-kit';
import { TableState } from 'ui-components';
import { formatNumber } from '@/lib/format';
import { LogisticsData, Shipment, getAll, initStore, update } from '@/lib/local-store';

const STATUS_TONE: Record<Shipment['status'], 'info' | 'danger' | 'success' | 'neutral'> = {
  IN_TRANSIT: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELAYED: 'danger',
  DELIVERED: 'success',
  PENDING: 'neutral',
};

const STATUS_LABEL: Record<Shipment['status'], string> = {
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELAYED: 'Delayed',
  DELIVERED: 'Delivered',
  PENDING: 'Pending',
};

/** Priority so the most time-critical routes render first. */
const STATUS_PRIORITY: Record<Shipment['status'], number> = {
  OUT_FOR_DELIVERY: 0,
  IN_TRANSIT: 1,
  DELAYED: 2,
  DELIVERED: 3,
  PENDING: 4,
};

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
}

export default function DriverAssistantPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [logistics, setLogistics] = useState<LogisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    try {
      initStore();
      setShipments(getAll<Shipment[]>('shipments').sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]));
      setLogistics(getAll<LogisticsData>('logisticsData'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fleet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markDelivered = (id: string) => {
    try {
      update('shipments', id, { status: 'DELIVERED' });
      load();
      showToast('Shipment marked delivered.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shipment');
    }
  };

  const inTransit = shipments.filter((row) => row.status === 'IN_TRANSIT' || row.status === 'OUT_FOR_DELIVERY').length;

  const columns = ['Tracking #', 'Driver', 'Origin to destination', 'Status', 'Progress', 'ETA', 'Actions'];

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        eyebrow="Fleet"
        title="Driver & fleet"
        description="Active vehicles, drivers and the routes they are running with live status."
      />

      <MetricBand
        metrics={[
          {
            label: 'Active vehicles',
            value: formatNumber(logistics?.activeVehicles),
            meta: `${loading ? '…' : 'Out on routes'}`,
          },
          {
            label: 'Active drivers',
            value: formatNumber(logistics?.activeDrivers),
            meta: `${loading ? '…' : 'In service'}`,
          },
          {
            label: 'In transit',
            value: formatNumber(inTransit),
            meta: `${loading ? '…' : 'En route to destination'}`,
            tone: inTransit > 0 ? 'info' : 'default',
          },
          {
            label: 'On-time',
            value: logistics?.onTimeDelivery ?? '—',
            meta: `${loading ? '…' : '24h rolling average'}`,
          },
        ]}
      />

      {error ? (
        <div className="flex items-center gap-3 border-l-2 border-danger bg-surface px-3 py-2">
          <StatusLabel tone="danger">Data error</StatusLabel>
          <span className="text-[12px] text-ink-soft">{error}</span>
        </div>
      ) : null}

      <EditorialSection eyebrow="Active routes" title="Shipments in motion">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Shipments currently in motion</caption>
            <thead>
              <tr className="border-b border-line">
                {columns.map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={loading}
                empty={!loading && shipments.length === 0}
                error={error}
                onRetry={load}
                colSpan={columns.length}
                emptyTitle="No shipments in motion"
                emptyDescription="Actively moving shipments appear here."
              >
                {shipments.map((row) => (
                  <tr
                    key={row.id}
                    className="h-[42px] border-b border-line/80 transition-colors hover:bg-surface-alt/60"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-[12px] font-medium text-ink">
                      {row.trackingNumber}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-ink">{row.driver}</td>
                    <td className="px-3 py-2 text-[12px] text-ink-soft">
                      {row.origin} → {row.destination}
                    </td>
                    <td className="px-3 py-2 text-[12px]">
                      <StatusLabel tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</StatusLabel>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-ink-soft">
                      <span className="tabular-nums">{row.progress}%</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[12px] tabular-nums text-ink-soft">
                      {row.eta ? new Date(row.eta).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[12px]">
                      {row.status === 'OUT_FOR_DELIVERY' ? (
                        <button
                          type="button"
                          className="font-semibold text-accent hover:underline"
                          onClick={() => markDelivered(row.id)}
                        >
                          Mark delivered
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </TableState>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          A shipment in transit stays on the route until a driver marks it delivered. Marking a
          shipment delivered updates the driver performance record.
        </p>
      </EditorialSection>
    </div>
  );
}
