'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { data } from '@/lib/data';
import {
  EditorialPageHeader,
  EditorialSection,
  MetricBand,
  StatusLabel,
  EmptyNote,
} from 'ui-kit';
import type { EditorialMetric } from 'ui-kit';
import { Button, DataState, Input, Modal, Select, TableState } from 'ui-components';
import type { CycleCount, Warehouse } from '@/lib/mock';
import {
  cycleCountStatusLabel,
  cycleCountStatusTone,
  formatCurrency,
  formatDateTimeVN,
  formatNumber,
} from '@/lib/labels';

export default function CycleCountPage() {
  const [counts, setCounts] = useState<CycleCount[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<CycleCount['status'] | 'ALL'>('ALL');

  const [countTarget, setCountTarget] = useState<CycleCount | null>(null);
  const [countedLines, setCountedLines] = useState('0');
  const [variance, setVariance] = useState('0');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [countRows, warehouseRows] = await Promise.all([
        data.cycleCounts.list(),
        data.warehouses.list(),
      ]);
      setCounts(countRows);
      setWarehouses(warehouseRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách kiểm kê.');
      setCounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      counts
        .filter((row) => warehouseFilter === 'ALL' || row.warehouseId === warehouseFilter)
        .filter((row) => (statusFilter === 'ALL' ? true : row.status === statusFilter))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [counts, warehouseFilter, statusFilter],
  );

  const pendingReview = counts.filter((row) => row.status === 'REVIEW').length;
  const counting = counts.filter((row) => row.status === 'COUNTING').length;
  const approved = counts.filter((row) => row.status === 'APPROVED').length;
  const varianceUnits = counts.reduce((sum, row) => sum + Math.abs(row.varianceUnits), 0);

  const metrics: EditorialMetric[] = [
    {
      label: 'Đang đếm',
      value: formatNumber(counting),
      meta: 'Phiếu chưa đủ dòng',
      tone: counting > 0 ? 'warning' : 'default',
    },
    {
      label: 'Chờ duyệt',
      value: formatNumber(pendingReview),
      meta: 'Đã đếm đủ, chờ quản lý',
      tone: pendingReview > 0 ? 'warning' : 'success',
    },
    {
      label: 'Đã duyệt',
      value: formatNumber(approved),
      meta: 'Đã khoá sổ',
    },
    {
      label: 'Lệch tuyệt đối',
      value: formatNumber(varianceUnits),
      meta: 'Đơn vị trên toàn bộ phiếu',
      tone: varianceUnits > 0 ? 'danger' : 'success',
    },
  ];

  const openCount = (row: CycleCount) => {
    setCountTarget(row);
    setCountedLines(String(row.countedLines));
    setVariance(String(row.varianceUnits));
    setNotice('');
  };

  const submitCount = async () => {
    if (!countTarget) return;
    setBusy(true);
    try {
      const updated = await data.cycleCounts.submit(
        countTarget.id,
        Number(countedLines),
        Number(variance),
      );
      setNotice(
        updated.status === 'REVIEW'
          ? `Phiếu ${updated.code} đã đếm đủ ${updated.lines} dòng, chuyển sang chờ duyệt.`
          : `Đã ghi ${updated.countedLines}/${updated.lines} dòng cho phiếu ${updated.code}.`,
      );
      setCountTarget(null);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không ghi nhận được kết quả đếm.');
    } finally {
      setBusy(false);
    }
  };

  const approve = async (row: CycleCount) => {
    setBusy(true);
    setNotice('');
    try {
      await data.cycleCounts.approve(row.id);
      setNotice(`Đã duyệt phiếu ${row.code}; chênh lệch được ghi vào sổ điều chỉnh.`);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không duyệt được phiếu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <EditorialPageHeader
        eyebrow="WMS · Kiểm kê"
        title="Kiểm kê định kỳ"
        description="Phiếu kiểm kê theo kho và khu vực. Hệ thống chỉ cho duyệt khi đã đếm đủ số dòng; chênh lệch sau duyệt được ghi thành bút toán điều chỉnh thay vì sửa tay tồn kho."
        meta={`${filtered.length} / ${counts.length} phiếu`}
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            Làm mới
          </Button>
        }
      />

      <MetricBand metrics={metrics} />

      {notice ? (
        <div className="border-l-2 border-accent bg-surface px-3 py-2 text-[12px] text-ink">
          {notice}
        </div>
      ) : null}

      <EditorialSection
        title="Danh sách phiếu kiểm kê"
        eyebrow="Theo kho"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <Select
                className="h-8"
                aria-label="Lọc theo kho"
                value={warehouseFilter}
                onChange={(event) => setWarehouseFilter(event.target.value)}
                options={[
                  { value: 'ALL', label: 'Mọi kho' },
                  ...warehouses.map((warehouse) => ({
                    value: warehouse.id,
                    label: warehouse.code,
                  })),
                ]}
              />
            </div>
            <div className="w-40">
              <Select
                className="h-8"
                aria-label="Lọc theo trạng thái"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as CycleCount['status'] | 'ALL')
                }
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái' },
                  ...(['DRAFT', 'COUNTING', 'REVIEW', 'APPROVED', 'CANCELLED'] as CycleCount['status'][]).map(
                    (status) => ({ value: status, label: cycleCountStatusLabel(status) }),
                  ),
                ]}
              />
            </div>
          </div>
        }
      >
        <DataState
          loading={loading}
          empty={!loading && filtered.length === 0}
          error={error}
          onRetry={load}
          emptyTitle="Chưa có phiếu kiểm kê"
          emptyDescription="Đổi bộ lọc hoặc chờ lịch kiểm kê kế tiếp."
        >
          <div className="overflow-x-auto border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface-alt">
                <tr>
                  {[
                    'Mã phiếu',
                    'Kho',
                    'Khu',
                    'Phạm vi',
                    'Tiến độ',
                    'Lệch',
                    'Giá trị lệch',
                    'Trạng thái',
                    'Bắt đầu',
                    'Phụ trách',
                    '',
                  ].map((label, index) => (
                    <th
                      key={`${label}-${index}`}
                      className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[12px]">
                <TableState
                  loading={loading}
                  empty={!loading && filtered.length === 0}
                  error={error ? new Error(error) : undefined}
                  onRetry={load}
                  colSpan={11}
                  emptyTitle="Không có phiếu khớp bộ lọc"
                  emptyDescription="Chọn kho hoặc trạng thái khác."
                >
                  {filtered.map((row) => {
                    const progress =
                      row.lines === 0 ? 0 : Math.round((row.countedLines / row.lines) * 100);
                    const canApprove =
                      row.status === 'REVIEW' && row.countedLines >= row.lines;
                    return (
                      <tr key={row.id} className="hover:bg-surface-alt">
                        <td className="px-3 py-2 font-mono font-semibold text-ink">{row.code}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-ink-soft">
                          {row.warehouseCode}
                        </td>
                        <td className="px-3 py-2 text-ink-soft">{row.zone}</td>
                        <td className="px-3 py-2 text-ink-faint">{row.scope}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-alt">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-[11px] text-ink-soft">
                              {row.countedLines}/{row.lines}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`px-3 py-2 tabular-nums font-medium ${
                            row.varianceUnits === 0
                              ? 'text-ink-soft'
                              : row.varianceUnits > 0
                                ? 'text-success'
                                : 'text-danger'
                          }`}
                        >
                          {row.varianceUnits > 0 ? '+' : ''}
                          {formatNumber(row.varianceUnits)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-ink-soft">
                          {formatCurrency(row.varianceValue)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusLabel tone={cycleCountStatusTone(row.status)}>
                            {cycleCountStatusLabel(row.status)}
                          </StatusLabel>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-ink-faint">
                          {formatDateTimeVN(row.startedAt)}
                        </td>
                        <td className="px-3 py-2 text-ink-soft">{row.assignee}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="flex items-center gap-3 text-[11px]">
                            {row.status === 'DRAFT' || row.status === 'COUNTING' ? (
                              <button
                                type="button"
                                className="font-semibold text-ink-soft hover:text-accent"
                                onClick={() => openCount(row)}
                              >
                                Ghi kết quả
                              </button>
                            ) : null}
                            {canApprove ? (
                              <button
                                type="button"
                                className="font-semibold text-accent hover:underline"
                                onClick={() => approve(row)}
                                disabled={busy}
                              >
                                Duyệt
                              </button>
                            ) : null}
                            {row.status === 'APPROVED' ? (
                              <span className="text-ink-faint">
                                Đóng {formatDateTimeVN(row.closedAt)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </TableState>
              </tbody>
            </table>
          </div>
        </DataState>
      </EditorialSection>

      <EditorialSection title="Quy trình kiểm kê" eyebrow="Ch. 10">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-line p-3 text-[12px] text-ink-soft">
            <div className="font-semibold text-ink">1. Đếm thực tế</div>
            <p className="mt-1">Thủ kho ghi số dòng đã đếm và chênh lệch so với sổ.</p>
          </div>
          <div className="border border-line p-3 text-[12px] text-ink-soft">
            <div className="font-semibold text-ink">2. Chờ duyệt</div>
            <p className="mt-1">
              Chỉ chuyển sang chờ duyệt khi đã đếm đủ dòng — tránh duyệt phiếu dở.
            </p>
          </div>
          <div className="border border-line p-3 text-[12px] text-ink-soft">
            <div className="font-semibold text-ink">3. Ghi điều chỉnh</div>
            <p className="mt-1">Duyệt phiếu sinh bút toán điều chỉnh, khoá sổ phiếu.</p>
          </div>
        </div>
        <EmptyNote>
          Chênh lệch dương nghĩa là đếm được nhiều hơn sổ; âm là thiếu so với sổ.
        </EmptyNote>
      </EditorialSection>

      <Modal
        isOpen={countTarget !== null}
        onClose={() => setCountTarget(null)}
        title="Ghi kết quả kiểm kê"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCountTarget(null)}>
              Đóng
            </Button>
            <Button size="sm" onClick={submitCount} isLoading={busy}>
              Ghi kết quả
            </Button>
          </div>
        }
      >
        {countTarget ? (
          <div className="space-y-3">
            <div className="border border-line p-3 text-[12px] text-ink-soft">
              <div className="flex justify-between">
                <span>Phiếu</span>
                <span className="font-mono text-ink">{countTarget.code}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Phạm vi</span>
                <span className="text-ink">{countTarget.scope}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Tổng dòng</span>
                <span className="tabular-nums text-ink">{countTarget.lines}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Đã đếm</span>
                <span className="tabular-nums text-ink">{countTarget.countedLines}</span>
              </div>
            </div>
            <Input
              label="Số dòng đã đếm"
              type="number"
              min={countTarget.countedLines}
              max={countTarget.lines}
              value={countedLines}
              onChange={(event) => setCountedLines(event.target.value)}
            />
            <Input
              label="Chênh lệch (đơn vị)"
              type="number"
              value={variance}
              onChange={(event) => setVariance(event.target.value)}
            />
            <p className="text-[11px] text-ink-faint">
              Đếm đủ {countTarget.lines} dòng thì phiếu tự chuyển sang Chờ duyệt. Số dòng vượt quá
              tổng dòng sẽ bị backend từ chối.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
