'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorialPageHeader, EditorialSection, MetricBand, StatusLabel, EmptyNote } from 'ui-kit';
import { TableState, Modal, Button, Select, Input } from 'ui-components';
import { data } from '@/lib/data';
import type { AiInsight, Client, Expense, Order } from '@/lib/mock';
import {
  clientStatusLabel,
  clientStatusTone,
  formatCurrency,
  formatNumber,
  insightStatusLabel,
  insightStatusTone,
} from '@/lib/labels';
import { BarSeries, CapacityBar, ScatterPlot } from '@/components/demo/MiniCharts';
import type { ScatterPoint, SeriesPoint } from '@/components/demo/MiniCharts';
import { RoleGuard } from '@/components/auth/RoleGuard';

const MODEL_LABELS: Record<AiInsight['model'], string> = {
  DEMAND_FORECAST: 'Dự báo nhu cầu',
  DELIVERY_ETA: 'ETA giao hàng',
  COST_ANOMALY: 'Bất thường chi phí',
  CHURN_RISK: 'Rủi ro rời bỏ',
  ROUTE_OPTIMIZER: 'Tối ưu tuyến',
};

const MODEL_TONES: Record<AiInsight['model'], 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  DEMAND_FORECAST: 'info',
  DELIVERY_ETA: 'info',
  COST_ANOMALY: 'warning',
  CHURN_RISK: 'danger',
  ROUTE_OPTIMIZER: 'neutral',
};

/** Entity reference dẫn về đúng phân hệ, ví dụ đơn hàng hoặc khách hàng. */
function entityTarget(row: AiInsight): { href: string; label: string } | null {
  const ref = row.entityRef;
  if (ref.startsWith('SLG-')) return { href: `/orders/${ref}`, label: `Đơn hàng ${ref}` };
  if (ref.startsWith('SKU-')) return { href: `/wms/products`, label: `Sản phẩm ${ref}` };
  // Chỉ khách hàng ghi rõ mã khách, không có trang chi tiết client riêng.
  if (ref.startsWith('CL-')) return { href: '/admin/clients', label: `Khách hàng ${ref}` };
  return null;
}

const dayLabel = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

export default function AiInsightsPage() {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState<string>('');
  const [decideId, setDecideId] = useState<string | null>(null);
  const [decideStatus, setDecideStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [insightRows, orderRows, expenseRows, clientRows] = await Promise.all([
        data.aiInsights.list(),
        data.orders.list(),
        data.expenses.list(),
        data.clients.list(),
      ]);
      setInsights(insightRows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setOrders(orderRows);
      setExpenses(expenseRows);
      setClients(clientRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được khuyến nghị AI.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = insights.filter((row) => {
    if (modelFilter && row.model !== modelFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      return row.title.toLowerCase().includes(term) || row.detail.toLowerCase().includes(term);
    }
    return true;
  });

  const newCount = insights.filter((row) => row.status === 'NEW').length;
  const avgConfidence =
    insights.length === 0
      ? 0
      : insights.reduce((sum, row) => sum + row.confidence, 0) / insights.length;
  const actioned = insights.filter((row) => row.status === 'ACTIONED').length;

  /** Nhu cầu 7 ngày gần nhất + 3 ngày dự báo (trung bình trượt 3 ngày). */
  const demandSeries = useMemo<SeriesPoint[]>(() => {
    const series: SeriesPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let offset = 6; offset >= 0; offset -= 1) {
      const start = new Date(today);
      start.setDate(start.getDate() - offset);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const count = orders.filter((order) => {
        const at = new Date(order.createdAt).getTime();
        return at >= start.getTime() && at < end.getTime();
      }).length;
      series.push({ label: dayLabel(start), value: count });
    }
    const recent = series.slice(-3);
    const base = recent.reduce((sum, point) => sum + point.value, 0) / Math.max(1, recent.length);
    for (let offset = 1; offset <= 3; offset += 1) {
      const date = new Date(today);
      date.setDate(date.getDate() + offset);
      const weekday = date.getDay();
      const factor = weekday === 0 ? 0.7 : weekday === 6 ? 0.85 : 1.05;
      const predicted = Math.max(1, Math.round(base * factor));
      series.push({ label: `${dayLabel(date)}*`, value: 0, forecast: predicted });
    }
    return series;
  }, [orders]);

  /** Phân tán chi phí chuyến: điểm lệch > 1.8 độ lệch chuẩn bị đánh dấu bất thường. */
  const { expensePoints, anomalies } = useMemo(() => {
    const values = expenses.map((row) => row.amount);
    const mean = values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.length === 0
        ? 0
        : values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const sd = Math.sqrt(variance);
    const flagged = expenses
      .map((row) => {
        const z = sd === 0 ? 0 : (row.amount - mean) / sd;
        return { row, z, anomaly: z > 1.8 };
      })
      .sort((a, b) => b.z - a.z);
    const points: ScatterPoint[] = expenses.map((row) => {
      const z = sd === 0 ? 0 : (row.amount - mean) / sd;
      return {
        x: Math.max(1, row.receiptCount) * 1000 + row.amount / 1000,
        y: row.amount,
        label: row.code,
        anomaly: z > 1.8,
      };
    });
    return { expensePoints: points, anomalies: flagged.filter((item) => item.anomaly) };
  }, [expenses]);

  /** Rủi ro rời bỏ: khách tạm dừng hoặc ít đơn trong tháng bị chấm điểm cao. */
  const churnRisk = useMemo(() => {
    return clients
      .map((client) => {
        const base =
          client.status === 'CHURNED' ? 85 : client.status === 'PAUSED' ? 60 : 10;
        const orderPenalty = Math.max(0, 30 - client.ordersThisMonth) * 1.2;
        const codPenalty = client.codOutstanding > 30_000_000 ? 12 : 0;
        const score = Math.min(98, Math.round(base + orderPenalty + codPenalty));
        return { client, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [clients]);

  const highRiskCount = churnRisk.filter((row) => row.score >= 60).length;

  const handleDecide = async () => {
    if (!decideId) return;
    setSaving(true);
    setActionError('');
    try {
      await data.aiInsights.decide(decideId, decideStatus as AiInsight['status']);
      setDecideId(null);
      setDecideStatus('');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không xử lý được khuyến nghị.');
    } finally {
      setSaving(false);
    }
  };

  const openDecide = (row: AiInsight) => {
    setDecideId(row.id);
    setDecideStatus(row.status);
    setActionError('');
  };

  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER', 'LOGISTICS_MANAGER']} fallbackHref="/dashboard">
      <div className="space-y-6">
        <EditorialPageHeader
          eyebrow={
            <>
              <span>Quản trị</span>
              <span className="text-line-strong">/</span>
              <span>AI Core · Ch. 13</span>
            </>
          }
          title="AI dự báo & khuyến nghị"
          description="Bốn mô hình chạy trên dữ liệu vận hành: dự báo nhu cầu theo ngày, phát hiện chi phí bất thường, ước lượng ETA và chấm điểm rủi ro rời bỏ khách hàng. Mỗi khuyến nghị đều có độ tin cậy và đường dẫn tới đối tượng liên quan."
          meta={`${insights.length} khuyến nghị`}
          actions={
            <Link
              href="/demo"
              className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[11px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Về trung tâm demo
            </Link>
          }
        />

        {error ? (
          <div className="flex items-center gap-3 border-l-2 border-danger bg-surface px-3 py-2">
            <StatusLabel tone="danger">Lỗi dữ liệu</StatusLabel>
            <span className="text-[12px] text-ink-soft">{error}</span>
            <button
              type="button"
              onClick={load}
              className="ml-auto text-[11px] font-medium text-accent hover:underline"
            >
              Thử lại
            </button>
          </div>
        ) : null}

        <MetricBand
          metrics={[
            {
              label: 'Khuyến nghị mới',
              value: String(newCount),
              meta: `${insights.length} khuyến nghị đã gửi`,
              tone: newCount > 0 ? 'warning' : 'default',
            },
            {
              label: 'Độ tin cậy trung bình',
              value: `${Math.round(avgConfidence * 100)}%`,
              meta: 'Trung bình trên mọi mô hình',
            },
            {
              label: 'Đã xử lý',
              value: String(actioned),
              meta: 'Đã hành động',
              tone: 'success',
            },
            {
              label: 'Khách rủi ro cao',
              value: String(highRiskCount),
              meta: 'Điểm rời bỏ ≥ 60',
              tone: highRiskCount > 0 ? 'danger' : 'success',
            },
          ]}
        />

        <EditorialSection
          eyebrow="Mô hình dự báo"
          title="Nhu cầu đơn hàng 7 ngày + 3 ngày tới"
          action={
            <span className="text-[11px] text-ink-faint">
              Cột đặc = thực tế · đường = dự báo trung bình trượt
            </span>
          }
        >
          <BarSeries
            data={demandSeries}
            unit="đơn/ngày"
            formatter={(value) => formatNumber(Math.round(value))}
          />
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-ink-faint">
            <span>
              Ngày có dấu * là dự báo. Cuối tuần áp hệ số thấp hơn vì nhu cầu giao hàng giảm.
            </span>
            <span>
              Tổng 7 ngày:{' '}
              <span className="tabular-nums text-ink">
                {formatNumber(
                  demandSeries.filter((point) => !point.label.endsWith('*')).reduce((sum, point) => sum + point.value, 0),
                )}{' '}
                đơn
              </span>
            </span>
          </div>
        </EditorialSection>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <EditorialSection
            eyebrow="Bất thường chi phí"
            title="Phân tán chi phí chuyến"
            action={
              <span className="text-[11px] text-ink-faint">
                Điểm đỏ: lệch &gt; 1,8σ so với trung bình
              </span>
            }
          >
            <ScatterPlot
              points={expensePoints}
              xLabel="Số chứng từ (nghìn) + quy mô chi phí"
              yLabel="Chi phí chuyến (₫)"
              formatter={(value) => formatNumber(Math.round(value / 1000)) + 'K'}
            />
            {anomalies.length === 0 ? (
              <EmptyNote>Không phát hiện chi phí vượt ngưỡng bất thường.</EmptyNote>
            ) : (
              <div className="mt-3 divide-y divide-line border-y border-line">
                {anomalies.slice(0, 5).map(({ row, z }) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 py-1.5 text-[12px]">
                    <span className="font-mono text-[11px] text-ink">{row.code}</span>
                    <span className="text-ink-faint">{row.tripCode}</span>
                    <span className="tabular-nums text-ink">{formatCurrency(row.amount)}</span>
                    <StatusLabel tone="danger">z = {z.toFixed(1)}</StatusLabel>
                  </div>
                ))}
              </div>
            )}
          </EditorialSection>

          <EditorialSection
            eyebrow="Rủi ro rời bỏ"
            title="Khách hàng cần giữ chân"
            action={<span className="text-[11px] text-ink-faint">Điểm 0–100</span>}
          >
            {churnRisk.length === 0 ? (
              <EmptyNote>Chưa có dữ liệu khách hàng.</EmptyNote>
            ) : (
              <div className="space-y-2.5">
                {churnRisk.map(({ client, score }) => (
                  <div key={client.id}>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate font-medium text-ink">{client.name}</span>
                      <StatusLabel tone={clientStatusTone(client.status)}>
                        {clientStatusLabel(client.status)}
                      </StatusLabel>
                    </div>
                    <div className="mt-1">
                      <CapacityBar
                        used={score}
                        total={100}
                        unit="điểm"
                        tone={score >= 75 ? 'danger' : score >= 60 ? 'warning' : 'success'}
                      />
                    </div>
                    <div className="mt-0.5 flex justify-between text-[10px] text-ink-faint">
                      <span>{client.code}</span>
                      <span className="tabular-nums">
                        {formatNumber(client.ordersThisMonth)} đơn/tháng ·{' '}
                        {formatCurrency(client.codOutstanding)} COD
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <EmptyNote>
              Điểm cao khi khách đang tạm dừng, ít đơn trong tháng hoặc còn nhiều COD chưa đối soát.
            </EmptyNote>
          </EditorialSection>
        </div>

        <EditorialSection
          title="Khuyến nghị"
          eyebrow="Danh mục"
          action={
            <div className="flex items-center gap-2">
              <div className="w-44">
                <Select
                  className="h-8"
                  aria-label="Lọc mô hình"
                  value={modelFilter}
                  onChange={(event) => setModelFilter(event.target.value)}
                  options={[
                    { value: '', label: 'Tất cả mô hình' },
                    ...Object.entries(MODEL_LABELS).map(([key, label]) => ({
                      value: key,
                      label,
                    })),
                  ]}
                />
              </div>
              <Input
                type="search"
                placeholder="Tìm nội dung..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 w-48"
              />
            </div>
          }
        >
          <div className="overflow-x-auto border border-line">
            <table className="w-full text-left">
              <thead className="bg-surface-alt">
                <tr>
                  {['Mô hình', 'Tiêu đề', 'Chỉ số', 'Tin cậy', 'Thực thể', 'Trạng thái', ''].map(
                    (label, index) => (
                      <th
                        key={`${label}-${index}`}
                        className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <TableState
                  loading={loading}
                  empty={!loading && visible.length === 0}
                  error={error ? new Error(error) : undefined}
                  onRetry={load}
                  colSpan={7}
                  emptyTitle="Chưa có khuyến nghị AI nào"
                  emptyDescription="Khuyến nghị sẽ hiển thị nơi đây khi có dữ liệu."
                >
                  {visible.map((row) => (
                    <tr key={row.id} className="group transition-colors hover:bg-surface-alt">
                      <td className="px-3 py-2">
                        <StatusLabel tone={MODEL_TONES[row.model]}>
                          {MODEL_LABELS[row.model]}
                        </StatusLabel>
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-[12px] font-medium text-ink">{row.title}</p>
                        <p className="mt-0.5 text-[11px] text-ink-soft">{row.detail}</p>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                          {row.metricLabel}
                        </span>
                        <p className="text-[12px] font-medium text-ink">{row.metricValue}</p>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-end gap-1">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                            <div
                              className="h-1.5 rounded-full bg-accent"
                              style={{ width: `${Math.round(row.confidence * 100)}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-[10px] text-ink-faint">
                            {Math.round(row.confidence * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {(() => {
                          const target = entityTarget(row);
                          return target ? (
                            <Link
                              href={target.href}
                              className="text-[11px] font-medium text-accent hover:underline"
                            >
                              {target.label}
                            </Link>
                          ) : (
                            <span className="text-[11px] text-ink-faint">{row.entityRef}</span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2">
                        <StatusLabel tone={insightStatusTone(row.status)}>
                          {insightStatusLabel(row.status)}
                        </StatusLabel>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.status === 'NEW' || row.status === 'ACKNOWLEDGED' ? (
                          <button
                            type="button"
                            onClick={() => openDecide(row)}
                            className="text-[11px] font-medium text-accent hover:underline"
                          >
                            Xử lý
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </TableState>
              </tbody>
            </table>
          </div>
        </EditorialSection>

        <Modal isOpen={decideId !== null} onClose={() => setDecideId(null)} title="Xử lý khuyến nghị" size="sm">
          {decideId ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleDecide();
              }}
            >
              <div className="mb-4">
                <p className="text-[12px] text-ink-soft">
                  {insights.find((row) => row.id === decideId)?.title}
                </p>
                <p className="mt-1 text-[11px] text-ink-faint">
                  Đánh dấu trạng thái cho khuyến nghị này. Khuyến nghị đã xử lý không thể đổi lại.
                </p>
              </div>
              <div className="mb-4">
                <label
                  className="mb-1 block text-[11px] font-bold uppercase tracking-[0.13em] text-ink-faint"
                  htmlFor="decide-status"
                >
                  Trạng thái
                </label>
                <Select
                  id="decide-status"
                  required
                  value={decideStatus}
                  onChange={(event) => setDecideStatus(event.target.value)}
                  options={[
                    { value: 'ACKNOWLEDGED', label: 'Ghi nhận' },
                    { value: 'ACTIONED', label: 'Đã xử lý' },
                    { value: 'DISMISSED', label: 'Bỏ qua' },
                  ]}
                />
              </div>
              {actionError ? (
                <p className="mb-4 text-[11px] font-medium text-danger">{actionError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDecideId(null)}>
                  Bỏ qua
                </Button>
                <Button type="submit" isLoading={saving} disabled={saving}>
                  Xác nhận
                </Button>
              </div>
            </form>
          ) : null}
        </Modal>
      </div>
    </RoleGuard>
  );
}
