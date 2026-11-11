'use client';

import { useEffect, useMemo, useState } from 'react';
import { EditorialPageHeader, EditorialSection, MetricBand, StatusLabel } from 'ui-kit';
import { Select, TableState } from 'ui-components';
import { formatDateTime, formatNumber } from '@/lib/format';
import {
  AIModel,
  AIInsight,
  LogisticsData,
  decideInsight,
  getAll,
  getInsights,
  initStore,
} from '@/lib/local-store';

const STATUS_TONE: Record<AIInsight['status'], 'warning' | 'success' | 'danger' | 'neutral'> = {
  NEW: 'warning',
  DECIDED: 'success',
  ESCALATED: 'danger',
  RESOLVED: 'neutral',
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

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [logistics, setLogistics] = useState<LogisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    initStore();
    try {
      setInsights(
        getInsights().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
      setModels(getAll<AIModel[]>('aiModels'));
      setLogistics(getAll<LogisticsData>('logisticsData'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  }, []);

  const types = useMemo(
    () => Array.from(new Set(insights.map((row) => row.type))).sort(),
    [insights],
  );

  const visible = insights
    .filter((row) => typeFilter === 'ALL' || row.type === typeFilter)
    .filter((row) => statusFilter === 'ALL' || row.status === statusFilter);

  const newCount = insights.filter((row) => row.status === 'NEW').length;
  const escalated = insights.filter((row) => row.status === 'ESCALATED').length;
  const avgConfidence =
    insights.length === 0
      ? 0
      : insights.reduce((sum, row) => sum + row.confidence, 0) / insights.length;
  const activeModels = models.filter((model) => model.is_current).length;

  const decide = (row: AIInsight, status: AIInsight['status']) => {
    try {
      decideInsight(row.id, status);
      setInsights(getInsights().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      showToast(`Insight "${row.title}" → ${status}.`, status === 'ESCALATED' ? 'warning' : 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update insight', 'error');
    }
  };

  const forecast = logistics?.predictedShipments ?? [];
  const maxForecast = Math.max(1, ...forecast.flatMap((row) => [row.predicted, row.actual]));
  const chartWidth = 720;
  const chartHeight = 230;
  const padding = { top: 18, right: 18, bottom: 34, left: 42 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;
  const step = innerW / Math.max(1, forecast.length);
  const barWidth = Math.min(22, step * 0.28);

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        eyebrow="AI & analytics"
        title="AI insights"
        description="Khuyến nghị từ các mô hình vận hành: rủi ro trễ, bảo trì, bất thường chi phí và rời bỏ tenant. Quyết định trên từng insight được lưu lại để kiểm toán."
        meta={`${insights.length} insights · ${activeModels} active models`}
      />

      <MetricBand
        metrics={[
          {
            label: 'New insights',
            value: formatNumber(newCount),
            meta: 'Chờ quyết định',
            tone: newCount > 0 ? 'warning' : 'success',
          },
          {
            label: 'Escalated',
            value: formatNumber(escalated),
            meta: 'Đã đẩy lên cấp trên',
            tone: escalated > 0 ? 'danger' : 'default',
          },
          {
            label: 'Avg confidence',
            value: `${Math.round(avgConfidence * 100)}%`,
            meta: 'Trung bình mọi mô hình',
          },
          {
            label: 'Active models',
            value: `${activeModels}/${models.length}`,
            meta: 'Đang phục vụ production',
          },
        ]}
      />

      {error ? (
        <div className="flex items-center gap-3 border-l-2 border-danger bg-surface px-3 py-2">
          <StatusLabel tone="danger">Data error</StatusLabel>
          <span className="text-[12px] text-ink-soft">{error}</span>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <EditorialSection
          eyebrow="Demand forecast"
          title="Predicted vs actual shipments"
          action={
            <span className="text-[11px] text-ink-faint">
              Cột đậm: dự báo · cột nhạt: thực tế
            </span>
          }
        >
          {forecast.length === 0 ? (
            <p className="text-[12px] text-ink-faint">Chưa có dữ liệu dự báo vận chuyển.</p>
          ) : (
            <div className="border border-line bg-canvas">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label="Biểu đồ dự báo và thực tế số shipment theo ngày"
                className="h-auto w-full"
              >
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = padding.top + innerH - innerH * ratio;
                  return (
                    <g key={ratio}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={chartWidth - padding.right}
                        y2={y}
                        stroke="#ece6da"
                        strokeWidth={1}
                      />
                      <text x={8} y={y + 3} fontSize="9" fill="#8a8578">
                        {Math.round(maxForecast * ratio)}
                      </text>
                    </g>
                  );
                })}
                {forecast.map((row, index) => {
                  const center = padding.left + step * index + step / 2;
                  const predictedHeight = (row.predicted / maxForecast) * innerH;
                  const actualHeight = (row.actual / maxForecast) * innerH;
                  return (
                    <g key={row.day}>
                      <rect
                        x={center - barWidth - 2}
                        y={padding.top + innerH - predictedHeight}
                        width={barWidth}
                        height={predictedHeight}
                        fill="#2f4a3c"
                      />
                      <rect
                        x={center + 2}
                        y={padding.top + innerH - actualHeight}
                        width={barWidth}
                        height={actualHeight}
                        fill="#c9c2b2"
                      />
                      <text
                        x={center}
                        y={chartHeight - 12}
                        fontSize="10"
                        fill="#6a6e64"
                        textAnchor="middle"
                      >
                        {row.day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
          {logistics ? (
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-ink-faint">
              <span>
                On-time delivery:{' '}
                <span className="font-semibold text-ink">{logistics.onTimeDelivery}</span>
              </span>
              <span>
                Route optimization saving:{' '}
                <span className="font-semibold text-ink">{logistics.avgOptimization}</span>
              </span>
              <span>
                Delayed: <span className="font-semibold text-ink">{logistics.delayedShipments}</span>
              </span>
            </div>
          ) : null}
        </EditorialSection>

        <EditorialSection eyebrow="Models" title="Accuracy">
          {models.length === 0 ? (
            <p className="text-[12px] text-ink-faint">Chưa có mô hình nào.</p>
          ) : (
            <div className="space-y-2.5">
              {models.map((model) => {
                const accuracy = Math.round((model.accuracy ?? 0) * 100);
                return (
                  <div key={model.id}>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate font-medium text-ink">{model.name}</span>
                      <StatusLabel tone={model.is_current ? 'success' : 'neutral'}>
                        {model.is_current ? 'Active' : 'Inactive'}
                      </StatusLabel>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, accuracy)}%`,
                            background:
                              accuracy < 80 ? '#a3483f' : accuracy < 90 ? '#8a5d28' : '#3f6b4f',
                          }}
                        />
                      </div>
                      <span className="w-10 text-right tabular-nums text-[11px] text-ink-soft">
                        {accuracy}%
                      </span>
                    </div>
                    <div className="mt-0.5 flex justify-between text-[10px] text-ink-faint">
                      <span className="font-mono">{model.version}</span>
                      <span>{formatDateTime(model.trained_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </EditorialSection>
      </div>

      <EditorialSection
        eyebrow="Decision queue"
        title="Insight cần xử lý"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <Select
                className="h-8"
                aria-label="Filter by type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                options={[
                  { value: 'ALL', label: 'All types' },
                  ...types.map((type) => ({
                    value: type,
                    label: TYPE_LABELS[type] ?? type,
                  })),
                ]}
              />
            </div>
            <div className="w-40">
              <Select
                className="h-8"
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                options={[
                  { value: 'ALL', label: 'All statuses' },
                  { value: 'NEW', label: 'New' },
                  { value: 'DECIDED', label: 'Decided' },
                  { value: 'ESCALATED', label: 'Escalated' },
                  { value: 'RESOLVED', label: 'Resolved' },
                ]}
              />
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                {['Type', 'Insight', 'Confidence', 'Created', 'Status', 'Decision'].map((label) => (
                  <th
                    key={label}
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
                empty={!loading && visible.length === 0}
                error={error ? new Error(error) : undefined}
                colSpan={6}
                emptyTitle="No insights match the filters"
                emptyDescription="Clear a filter or wait for the models to publish new signals."
              >
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-line/80 align-top transition-colors hover:bg-surface-alt/60"
                  >
                    <td className="px-3 py-2 text-[12px]">
                      <StatusLabel tone={TYPE_TONE[row.type] ?? 'neutral'}>
                        {TYPE_LABELS[row.type] ?? row.type}
                      </StatusLabel>
                    </td>
                    <td className="px-3 py-2 text-[12px]">
                      <p className="font-medium text-ink">{row.title}</p>
                      <p className="mt-0.5 text-[11px] text-ink-soft">{row.description}</p>
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        Recommendation: {row.recommendation}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-[12px] tabular-nums text-ink-soft">
                      {Math.round(row.confidence * 100)}%
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[12px] tabular-nums text-ink-faint">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-[12px]">
                      <StatusLabel tone={STATUS_TONE[row.status]}>{row.status}</StatusLabel>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px]">
                      <div className="flex flex-col gap-1">
                        {row.status !== 'DECIDED' ? (
                          <button
                            type="button"
                            className="text-left font-semibold text-accent hover:underline"
                            onClick={() => decide(row, 'DECIDED')}
                          >
                            Decide
                          </button>
                        ) : null}
                        {row.status !== 'ESCALATED' ? (
                          <button
                            type="button"
                            className="text-left font-semibold text-warning hover:underline"
                            onClick={() => decide(row, 'ESCALATED')}
                          >
                            Escalate
                          </button>
                        ) : null}
                        {row.status !== 'RESOLVED' ? (
                          <button
                            type="button"
                            className="text-left font-semibold text-ink-soft hover:text-accent"
                            onClick={() => decide(row, 'RESOLVED')}
                          >
                            Resolve
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
          Quyết định được lưu vào bản ghi insight và đồng bộ lên backend khi có kết nối. Escalate
          giữ insight mở cho cấp quản lý cao hơn.
        </p>
      </EditorialSection>
    </div>
  );
}
