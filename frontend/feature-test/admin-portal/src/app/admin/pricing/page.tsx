'use client';

import { useEffect, useMemo, useState } from 'react';
import { EditorialPageHeader, EditorialSection, MetricBand, StatusLabel } from 'ui-kit';
import { Button, Input, Modal, Select, TableState } from 'ui-components';
import { formatCurrency, formatNumber } from '@/lib/format';
import {
  PricingData,
  PricingRule,
  getPricing,
  initStore,
  removePricingRule,
  savePricingRule,
  setPricing,
  updatePricingRule,
} from '@/lib/local-store';

const MODEL_LABELS: Record<PricingRule['model'], string> = {
  fixed: 'Fixed',
  dynamic: 'Dynamic',
  surge: 'Surge',
};

const MODEL_TONE: Record<PricingRule['model'], 'neutral' | 'info' | 'warning'> = {
  fixed: 'neutral',
  dynamic: 'info',
  surge: 'warning',
};

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
}

type RuleForm = {
  id: string | null;
  route: string;
  model: PricingRule['model'];
  baseRate: string;
  demandFactor: string;
};

const EMPTY_FORM: RuleForm = {
  id: null,
  route: '',
  model: 'dynamic',
  baseRate: '90000',
  demandFactor: '1.1',
};

export default function PricingPage() {
  const [sheet, setSheet] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PricingRule | null>(null);

  useEffect(() => {
    initStore();
    try {
      setSheet(getPricing());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricing sheet');
    } finally {
      setLoading(false);
    }
  }, []);

  const rules = sheet?.rules ?? [];
  const activeRules = rules.filter((rule) => rule.active);

  const forecast = sheet?.forecast ?? [];
  const selectedForecast = useMemo(
    () => forecast.find((row) => row.month === selectedMonth) ?? forecast[forecast.length - 1],
    [forecast, selectedMonth],
  );

  const metrics = [
    {
      label: 'Pricing rules',
      value: formatNumber(rules.length),
      meta: `${activeRules.length} đang áp dụng`,
    },
    {
      label: 'Current price',
      value: formatCurrency(sheet?.currentPrice ?? 0),
      meta: 'Giá đang thu trên tuyến mẫu',
    },
    {
      label: 'Suggested price',
      value: formatCurrency(sheet?.suggestedPrice ?? 0),
      meta: `Confidence ${Math.round((sheet?.confidence ?? 0) * 100)}%`,
      tone: 'warning' as const,
    },
    {
      label: 'Demand next month',
      value: formatNumber(forecast[forecast.length - 1]?.demand ?? 0),
      meta: selectedForecast ? `Kỳ ${selectedForecast.month}` : 'Chưa có dự báo',
    },
  ];

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setOpen(true);
  };

  const openEdit = (rule: PricingRule) => {
    setForm({
      id: rule.id,
      route: rule.route,
      model: rule.model,
      baseRate: String(rule.baseRate),
      demandFactor: String(rule.demandFactor),
    });
    setFormError('');
    setOpen(true);
  };

  const submit = () => {
    if (!sheet) return;
    const route = form.route.trim();
    const baseRate = Number(form.baseRate);
    const demandFactor = Number(form.demandFactor);
    if (!route) {
      setFormError('Nhập tên tuyến.');
      return;
    }
    if (!Number.isFinite(baseRate) || baseRate <= 0) {
      setFormError('Giá cơ sở phải lớn hơn 0.');
      return;
    }
    if (!Number.isFinite(demandFactor) || demandFactor <= 0) {
      setFormError('Hệ số nhu cầu phải lớn hơn 0.');
      return;
    }
    if (
      !form.id &&
      rules.some((rule) => rule.route.toLowerCase() === route.toLowerCase())
    ) {
      setFormError('Tuyến này đã có quy tắc giá.');
      return;
    }
    const payload: PricingRule = {
      id: form.id ?? `rule_${Date.now()}`,
      route,
      model: form.model,
      baseRate,
      demandFactor,
      effective: Math.round(baseRate * demandFactor),
      active: form.id ? rules.find((rule) => rule.id === form.id)?.active ?? true : true,
    };
    const next = form.id
      ? updatePricingRule(payload.id, payload)
      : savePricingRule(payload);
    setSheet(next);
    setOpen(false);
    showToast(
      form.id ? `Đã cập nhật quy tắc ${payload.route}.` : `Đã thêm quy tắc ${payload.route}.`,
      'success',
    );
  };

  const toggleRule = (rule: PricingRule) => {
    const next = updatePricingRule(rule.id, { active: !rule.active });
    setSheet(next);
    showToast(
      `${rule.route} ${rule.active ? 'đã tạm dừng' : 'đã bật lại'}.`,
      rule.active ? 'warning' : 'success',
    );
  };

  const removeRule = () => {
    if (!deleteTarget) return;
    const next = removePricingRule(deleteTarget.id);
    setSheet(next);
    showToast(`Đã xoá quy tắc ${deleteTarget.route}.`, 'success');
    setDeleteTarget(null);
  };

  const applySuggestion = () => {
    if (!sheet) return;
    const next = { ...sheet, currentPrice: sheet.suggestedPrice };
    setPricing(next);
    setSheet(next);
    showToast(`Đã áp dụng giá ${formatCurrency(next.currentPrice)}.`, 'success');
  };

  const width = 720;
  const height = 250;
  const padding = { top: 18, right: 18, bottom: 36, left: 52 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxDemand = Math.max(1, ...forecast.map((row) => row.demand));
  const maxPrice = Math.max(1, ...forecast.map((row) => row.price));
  const step = innerW / Math.max(1, forecast.length);
  const barWidth = Math.min(46, step * 0.46);
  const pricePoints = forecast
    .map((row, index) => {
      const x = padding.left + step * index + step / 2;
      const y = padding.top + innerH - (row.price / maxPrice) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        eyebrow="Operations · Revenue"
        title="Dynamic pricing"
        description="Quy tắc giá theo tuyến, hệ số nhu cầu và dự báo giá 6 tháng. Giá đề xuất lấy từ mô hình động; áp dụng sẽ cập nhật giá đang thu trên tuyến mẫu."
        meta={`${rules.length} quy tắc · ${activeRules.length} đang chạy`}
        actions={
          <Button size="sm" onClick={openCreate}>
            Add rule
          </Button>
        }
      />

      <MetricBand metrics={metrics} />

      {error ? (
        <div className="flex items-center gap-3 border-l-2 border-danger bg-surface px-3 py-2">
          <StatusLabel tone="danger">Data error</StatusLabel>
          <span className="text-[12px] text-ink-soft">{error}</span>
        </div>
      ) : null}

      <EditorialSection
        eyebrow="Forecast"
        title="Demand & price forecast"
        action={
          selectedForecast ? (
            <span className="text-[11px] tabular-nums text-ink-faint">
              {selectedForecast.month}: {formatNumber(selectedForecast.demand)} đơn ·{' '}
              {formatCurrency(selectedForecast.price)}
            </span>
          ) : undefined
        }
      >
        {forecast.length === 0 ? (
          <p className="text-[12px] text-ink-faint">Chưa có dữ liệu dự báo.</p>
        ) : (
          <>
            <div className="border border-line bg-canvas">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label="Biểu đồ nhu cầu và giá dự báo"
                className="h-auto w-full"
              >
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = padding.top + innerH - innerH * ratio;
                  return (
                    <g key={ratio}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={width - padding.right}
                        y2={y}
                        stroke="#ece6da"
                        strokeWidth={1}
                      />
                      <text x={8} y={y + 3} fontSize="9" fill="#8a8578">
                        {Math.round(maxDemand * ratio)}
                      </text>
                    </g>
                  );
                })}
                {forecast.map((row, index) => {
                  const x = padding.left + step * index + step / 2 - barWidth / 2;
                  const barHeight = (row.demand / maxDemand) * innerH;
                  const y = padding.top + innerH - barHeight;
                  const selected = selectedForecast?.month === row.month;
                  return (
                    <g key={row.month}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill={selected ? '#2f4a3c' : '#c9c2b2'}
                        onClick={() => setSelectedMonth(row.month)}
                        style={{ cursor: 'pointer' }}
                      />
                      <text
                        x={padding.left + step * index + step / 2}
                        y={height - 14}
                        fontSize="10"
                        fill="#6a6e64"
                        textAnchor="middle"
                      >
                        {row.month}
                      </text>
                    </g>
                  );
                })}
                <polyline points={pricePoints} fill="none" stroke="#a3483f" strokeWidth={2} />
                {forecast.map((row, index) => {
                  const x = padding.left + step * index + step / 2;
                  const y = padding.top + innerH - (row.price / maxPrice) * innerH;
                  return <circle key={row.month} cx={x} cy={y} r={3} fill="#a3483f" />;
                })}
                <text x={16} y={14} fontSize="9" fill="#6a6e64">
                  Cột: nhu cầu (đơn) · Đường: giá (₫)
                </text>
              </svg>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-ink-faint">
                Chọn một cột để xem kỳ tương ứng. Giá đề xuất hiện tại{' '}
                <span className="font-semibold text-ink">
                  {formatCurrency(sheet?.suggestedPrice ?? 0)}
                </span>{' '}
                so với giá đang thu{' '}
                <span className="font-semibold text-ink">
                  {formatCurrency(sheet?.currentPrice ?? 0)}
                </span>
                .
              </div>
              <Button variant="outline" size="sm" onClick={applySuggestion}>
                Apply suggested price
              </Button>
            </div>
          </>
        )}
      </EditorialSection>

      <EditorialSection eyebrow="Rules" title="Route pricing rules">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                {['Route', 'Model', 'Base rate', 'Demand factor', 'Effective', 'Status', 'Actions'].map(
                  (label) => (
                    <th
                      key={label}
                      className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={loading}
                empty={!loading && rules.length === 0}
                error={error ? new Error(error) : undefined}
                colSpan={7}
                emptyTitle="No pricing rules"
                emptyDescription="Add the first rule to start dynamic pricing."
              >
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="h-[42px] border-b border-line/80 transition-colors hover:bg-surface-alt/60"
                  >
                    <td className="px-3 text-[12px] font-medium text-ink">{rule.route}</td>
                    <td className="px-3 text-[12px]">
                      <StatusLabel tone={MODEL_TONE[rule.model]}>
                        {MODEL_LABELS[rule.model]}
                      </StatusLabel>
                    </td>
                    <td className="px-3 text-[12px] tabular-nums text-ink-soft">
                      {formatCurrency(rule.baseRate)}
                    </td>
                    <td className="px-3 text-[12px] tabular-nums text-ink-soft">
                      ×{rule.demandFactor}
                    </td>
                    <td className="px-3 text-[12px] tabular-nums font-medium text-ink">
                      {formatCurrency(rule.effective)}
                    </td>
                    <td className="px-3 text-[12px]">
                      <StatusLabel tone={rule.active ? 'success' : 'neutral'}>
                        {rule.active ? 'Active' : 'Paused'}
                      </StatusLabel>
                    </td>
                    <td className="whitespace-nowrap px-3 text-[11px]">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="font-semibold text-ink-soft hover:text-accent"
                          onClick={() => openEdit(rule)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="font-semibold text-ink-soft hover:text-accent"
                          onClick={() => toggleRule(rule)}
                        >
                          {rule.active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="font-semibold text-danger hover:underline"
                          onClick={() => setDeleteTarget(rule)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </TableState>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          Giá hiệu lực = giá cơ sở × hệ số nhu cầu. Quy tắc tạm dừng không được dùng để báo giá mới.
        </p>
      </EditorialSection>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Edit pricing rule' : 'Add pricing rule'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit}>
              {form.id ? 'Save changes' : 'Add rule'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Route"
            value={form.route}
            onChange={(event) => setForm((current) => ({ ...current, route: event.target.value }))}
            placeholder="Hanoi -> Da Nang"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Model"
              value={form.model}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  model: event.target.value as PricingRule['model'],
                }))
              }
              options={(Object.keys(MODEL_LABELS) as PricingRule['model'][]).map((model) => ({
                value: model,
                label: MODEL_LABELS[model],
              }))}
            />
            <Input
              label="Base rate (₫)"
              type="number"
              min={0}
              step="1000"
              value={form.baseRate}
              onChange={(event) =>
                setForm((current) => ({ ...current, baseRate: event.target.value }))
              }
            />
            <Input
              label="Demand factor"
              type="number"
              min={0.1}
              step="0.05"
              value={form.demandFactor}
              onChange={(event) =>
                setForm((current) => ({ ...current, demandFactor: event.target.value }))
              }
            />
          </div>
          <div className="border border-line p-3 text-[12px] text-ink-soft">
            Giá hiệu lực dự kiến:{' '}
            <span className="font-semibold tabular-nums text-ink">
              {formatCurrency(
                Math.round((Number(form.baseRate) || 0) * (Number(form.demandFactor) || 0)),
              )}
            </span>
          </div>
          {formError ? (
            <p className="border-l-2 border-danger pl-2 text-[12px] text-danger">{formError}</p>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete pricing rule"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Keep rule
            </Button>
            <Button variant="danger" size="sm" onClick={removeRule}>
              Delete
            </Button>
          </div>
        }
      >
        {deleteTarget ? (
          <p className="text-[13px] text-ink-soft">
            Quy tắc <span className="font-semibold text-ink">{deleteTarget.route}</span> sẽ bị xoá
            khỏi bảng giá. Các báo giá đã phát hành không bị thay đổi.
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
