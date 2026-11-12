'use client';

import { useEffect, useState } from 'react';
import { EditorialPageHeader, EditorialSection, MetricBand, StatusLabel } from 'ui-kit';
import { TableState } from 'ui-components';
import { formatNumber } from '@/lib/format';
import { AIInsight, decideInsight, getInsights, initStore } from '@/lib/local-store';

const STATUS_TONE: Record<AIInsight['status'], 'warning' | 'success' | 'danger' | 'info'> = {
  NEW: 'warning',
  ESCALATED: 'danger',
  DECIDED: 'info',
  RESOLVED: 'success',
};

const TYPE_LABELS: Record<string, string> = {
  delay: 'Delay risk',
  maintenance: 'Maintenance',
  cost: 'Cost anomaly',
  churn: 'Churn risk',
};

const TYPE_TONE: Record<string, 'info' | 'warning' | 'danger' | 'neutral'> = {
  delay: 'warning',
  maintenance: 'info',
  cost: 'danger',
  churn: 'danger',
};

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
}

export default function CustomerSupportPage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    try {
      initStore();
      setInsights(getInsights().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = (id: string, status: AIInsight['status']) => {
    try {
      decideInsight(id, status);
      load();
      showToast(
        `Insight marked ${status}.`,
        status === 'RESOLVED' || status === 'DECIDED' ? 'success' : 'info',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update insight');
    }
  };

  const total = insights.length;
  const newCount = insights.filter((row) => row.status === 'NEW').length;
  const escalated = insights.filter((row) => row.status === 'ESCALATED').length;
  const resolved = insights.filter((row) => row.status === 'RESOLVED').length;
  const decided = insights.filter((row) => row.status === 'DECIDED').length;

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        eyebrow="Customer support"
        title="Support queue"
        description="Review and action support escalations flagged by AI. Decide, resolve or escalate each insight."
      />

      <MetricBand
        metrics={[
          {
            label: 'Total insights',
            value: formatNumber(total),
            meta: 'All flagged by the models',
          },
          {
            label: 'New',
            value: formatNumber(newCount),
            meta: 'Awaiting a decision',
            tone: newCount > 0 ? 'warning' : 'default',
          },
          {
            label: 'Escalated',
            value: formatNumber(escalated),
            meta: 'Raised to a manager',
            tone: escalated > 0 ? 'danger' : 'default',
          },
          {
            label: 'Decided',
            value: formatNumber(decided),
            meta: 'Noted for review',
            tone: decided > 0 ? 'info' : 'default',
          },
          {
            label: 'Resolved',
            value: formatNumber(resolved),
            meta: 'Closed and verified',
            tone: resolved > 0 ? 'success' : 'default',
          },
        ]}
      />

      {error ? (
        <div className="flex items-center gap-3 border-l-2 border-danger bg-surface px-3 py-2">
          <StatusLabel tone="danger">Data error</StatusLabel>
          <span className="text-[12px] text-ink-soft">{error}</span>
        </div>
      ) : null}

      <EditorialSection eyebrow="Escalated" title="Open tickets">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">AI support insights and their statuses</caption>
            <thead>
              <tr className="border-b border-line">
                {['Type', 'Title', 'Description', 'Confidence', 'Status', 'Actions'].map((label) => (
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
                empty={!loading && insights.length === 0}
                error={error}
                onRetry={load}
                colSpan={6}
                emptyTitle="No insights to review"
                emptyDescription="The queue stays empty until the models flag a signal."
              >
                {insights.map((row) => (
                  <tr
                    key={row.id}
                    className="h-[42px] border-b border-line/80 transition-colors hover:bg-surface-alt/60"
                  >
                    <td className="px-3 py-2 text-[12px]">
                      <StatusLabel tone={TYPE_TONE[row.type] ?? 'neutral'}>
                        {TYPE_LABELS[row.type] ?? row.type}
                      </StatusLabel>
                    </td>
                    <td className="px-3 py-2 text-[12px]">
                      <p className="font-medium text-ink">{row.title}</p>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-ink-soft">{row.description}</td>
                    <td className="px-3 py-2 text-[12px] tabular-nums text-ink-soft">
                      {Math.round(row.confidence * 100)}%
                    </td>
                    <td className="px-3 py-2 text-[12px]">
                      <StatusLabel tone={STATUS_TONE[row.status]}>{row.status}</StatusLabel>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px]">
                      <div className="flex items-center gap-3">
                        {row.status !== 'DECIDED' && row.status !== 'RESOLVED' ? (
                          <button
                            type="button"
                            className="font-semibold text-accent hover:underline"
                            onClick={() => decide(row.id, 'RESOLVED')}
                          >
                            Resolve
                          </button>
                        ) : null}
                        {row.status !== 'DECIDED' && row.status !== 'ESCALATED' ? (
                          <button
                            type="button"
                            className="font-semibold text-warning hover:underline"
                            onClick={() => decide(row.id, 'ESCALATED')}
                          >
                            Escalate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </TableState>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          Decisions are saved to the insight record and synced to the backend when connected.
        </p>
      </EditorialSection>
    </div>
  );
}
