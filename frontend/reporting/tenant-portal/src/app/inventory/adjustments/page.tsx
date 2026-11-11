'use client';

import Link from 'next/link';
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
import { Button, DataState, Input, Modal, Pagination, Select, TableState } from 'ui-components';
import type { InventoryItem, StockMovement } from '@/lib/mock';
import {
  formatDateTimeVN,
  formatNumber,
  movementTypeLabel,
} from '@/lib/labels';

const PAGE_SIZE = 12;

const REASONS = [
  'Kiểm kê lệch',
  'Hàng hỏng / vỡ',
  'Hết hạn sử dụng',
  'Mất mát trong kho',
  'Sai lệch nhập liệu',
];

export default function InventoryAdjustmentsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [quantity, setQuantity] = useState('-1');
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [movementRows, itemRows] = await Promise.all([
        data.movements.list(),
        data.inventory.list(),
      ]);
      setMovements(movementRows);
      setItems(itemRows);
      setTargetId((current) => current || itemRows[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu điều chỉnh.');
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const adjustments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return movements
      .filter((row) => row.type === 'ADJUST' || row.type === 'CYCLE_COUNT')
      .filter((row) => {
        if (!term) return true;
        return (
          row.sku.toLowerCase().includes(term) ||
          row.productName.toLowerCase().includes(term) ||
          row.reference.toLowerCase().includes(term) ||
          (row.note ?? '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [movements, search]);

  const totalPages = Math.max(1, Math.ceil(adjustments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = adjustments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const increase = adjustments.filter((row) => row.quantity > 0);
  const decrease = adjustments.filter((row) => row.quantity < 0);

  const metrics: EditorialMetric[] = [
    {
      label: 'Phiếu điều chỉnh',
      value: formatNumber(adjustments.length),
      meta: 'Gồm điều chỉnh và kiểm kê',
    },
    {
      label: 'Tăng tồn',
      value: `+${formatNumber(increase.reduce((sum, row) => sum + row.quantity, 0))}`,
      meta: `${increase.length} bút toán`,
      tone: 'success',
    },
    {
      label: 'Giảm tồn',
      value: formatNumber(decrease.reduce((sum, row) => sum + row.quantity, 0)),
      meta: `${decrease.length} bút toán`,
      tone: 'danger',
    },
    {
      label: 'Chênh lệch ròng',
      value: formatNumber(adjustments.reduce((sum, row) => sum + row.quantity, 0)),
      meta: 'Đơn vị trên toàn bộ phiếu',
    },
  ];

  const target = items.find((item) => item.id === targetId) ?? null;
  const quantityValue = Number(quantity);
  const quantityValid = Number.isInteger(quantityValue) && quantityValue !== 0;
  const resultQuantity = target ? target.quantity + quantityValue : NaN;
  const wouldGoNegative = target !== null && quantityValid && resultQuantity < 0;

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    setNotice('');
    try {
      if (!quantityValid) {
        setNotice('Số lượng điều chỉnh phải là số nguyên khác 0.');
        setBusy(false);
        return;
      }
      if (wouldGoNegative) {
        setNotice(
          `Không thể ghi: tồn sau điều chỉnh sẽ âm (${formatNumber(resultQuantity)}).`,
        );
        setBusy(false);
        return;
      }

      // Optimistic locking: đọc lại bản ghi trước khi ghi, từ chối nếu version đổi.
      const latest = await data.inventory.get(target.id);
      if (!latest) {
        setNotice('Dòng tồn kho không còn tồn tại. Tải lại danh sách để tiếp tục.');
        await load();
        setBusy(false);
        return;
      }
      if (latest.version !== target.version) {
        setNotice(
          `Xung đột phiên bản (409): bản ghi đã chuyển từ v${target.version} sang v${latest.version}. ` +
            'Dữ liệu vừa được tải lại, kiểm tra số tồn mới rồi ghi lại.',
        );
        await load();
        setBusy(false);
        return;
      }
      if (latest.quantity + quantityValue < 0) {
        setNotice(
          `Không thể ghi: tồn hiện tại ${formatNumber(latest.quantity)} không đủ để trừ ${formatNumber(
            Math.abs(quantityValue),
          )}.`,
        );
        await load();
        setBusy(false);
        return;
      }

      await data.inventory.adjust({
        inventoryId: latest.id,
        quantity: quantityValue,
        reason,
      });
      setNotice(
        `Đã điều chỉnh ${target.sku} tại ${target.binCode}: ${quantityValue > 0 ? '+' : ''}${formatNumber(
          quantityValue,
        )}.`,
      );
      setOpen(false);
      setQuantity('-1');
      setReason(REASONS[0]);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không tạo được phiếu điều chỉnh.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <EditorialPageHeader
        eyebrow="WMS · Tồn kho"
        title="Phiếu điều chỉnh tồn"
        description="Mỗi điều chỉnh là một bút toán có lý do, người thực hiện và số dư sau ghi. Phiếu không sửa đè tồn kho cũ mà ghi nối tiếp vào sổ phát sinh."
        meta={`${adjustments.length} bút toán`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/inventory"
              className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[11px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Về tồn kho
            </Link>
            <Button size="sm" onClick={() => setOpen(true)}>
              Tạo điều chỉnh
            </Button>
          </div>
        }
      />

      <MetricBand metrics={metrics} />

      {notice ? (
        <div className="border-l-2 border-accent bg-surface px-3 py-2 text-[12px] text-ink">
          {notice}
        </div>
      ) : null}

      <EditorialSection
        title="Danh sách phiếu"
        eyebrow="Sổ điều chỉnh"
        action={
          <Input
            type="search"
            placeholder="Tìm SKU, chứng từ, lý do"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="h-8 w-64"
          />
        }
      >
        <DataState
          loading={loading}
          empty={!loading && adjustments.length === 0}
          error={error ? new Error(error) : undefined}
          onRetry={load}
          emptyTitle="Chưa có phiếu điều chỉnh"
          emptyDescription="Tạo phiếu đầu tiên khi phát hiện lệch tồn hoặc hàng hỏng."
        >
          <div className="overflow-x-auto border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface-alt">
                <tr>
                  {[
                    'Thời điểm',
                    'Loại',
                    'SKU',
                    'Kho / Bin',
                    'Thay đổi',
                    'Số dư sau',
                    'Chứng từ',
                    'Người thực hiện',
                    'Lý do',
                  ].map((label) => (
                    <th
                      key={label}
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
                  empty={!loading && paged.length === 0}
                  error={error ? new Error(error) : undefined}
                  onRetry={load}
                  colSpan={9}
                  emptyTitle="Không có phiếu khớp tìm kiếm"
                  emptyDescription="Xoá từ khoá để xem toàn bộ sổ điều chỉnh."
                >
                  {paged.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-alt">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-soft">
                        {formatDateTimeVN(row.at)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusLabel tone={row.quantity >= 0 ? 'success' : 'danger'}>
                          {movementTypeLabel(row.type)}
                        </StatusLabel>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-[11px] text-ink">{row.sku}</div>
                        <div className="text-[11px] text-ink-faint">{row.productName}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-soft">
                        {row.warehouseCode} · {row.binCode}
                      </td>
                      <td
                        className={`px-3 py-2 tabular-nums font-semibold ${
                          row.quantity >= 0 ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {row.quantity >= 0 ? '+' : ''}
                        {formatNumber(row.quantity)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink">
                        {formatNumber(row.balanceAfter)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-faint">
                        {row.reference}
                      </td>
                      <td className="px-3 py-2 text-ink-soft">{row.actor}</td>
                      <td className="px-3 py-2 text-ink-faint">{row.note ?? '—'}</td>
                    </tr>
                  ))}
                </TableState>
              </tbody>
            </table>
          </div>
          {adjustments.length > PAGE_SIZE ? (
            <div className="flex justify-center py-3">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </DataState>
      </EditorialSection>

      <EditorialSection title="Ảnh hưởng giá trị tồn" eyebrow="Ước tính">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border border-line p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Chênh lệch ròng
            </div>
            <div className="mt-1 font-editorial text-2xl text-ink tabular-nums">
              {formatNumber(adjustments.reduce((sum, row) => sum + row.quantity, 0))} đơn vị
            </div>
          </div>
          <div className="border border-line p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Phiếu tăng
            </div>
            <div className="mt-1 font-editorial text-2xl text-ink tabular-nums">
              {increase.length}
            </div>
          </div>
          <div className="border border-line p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Phiếu giảm
            </div>
            <div className="mt-1 font-editorial text-2xl text-ink tabular-nums">
              {decrease.length}
            </div>
          </div>
        </div>
        <EmptyNote>
          Giá trị tiền tệ của điều chỉnh được tính ở báo cáo tài chính, không ghi trong sổ kho để
          tránh sai lệch khi đơn giá thay đổi.
        </EmptyNote>
      </EditorialSection>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Tạo phiếu điều chỉnh"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <Button size="sm" onClick={submit} isLoading={busy} disabled={!target}>
              Ghi phiếu
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            label="Dòng tồn kho"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            options={items.map((item) => ({
              value: item.id,
              label: `${item.sku} · ${item.binCode} · tồn ${item.quantity}`,
            }))}
          />
          {target ? (
            <div className="grid grid-cols-3 gap-3 border border-line p-3 text-[12px]">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Tồn</div>
                <div className="tabular-nums text-ink">{formatNumber(target.quantity)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Khả dụng</div>
                <div className="tabular-nums text-ink">{formatNumber(target.available)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Phiên bản</div>
                <div className="font-mono text-ink">v{target.version}</div>
              </div>
            </div>
          ) : null}
          <Input
            label="Số lượng thay đổi (âm để giảm)"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <Select
            label="Lý do"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            options={REASONS.map((row) => ({ value: row, label: row }))}
          />
          {target && quantityValid && resultQuantity < 0 ? (
            <p className="border-l-2 border-danger pl-2 text-[12px] text-danger">
              Số lượng sau điều chỉnh sẽ âm ({formatNumber(resultQuantity)}).
              Backend sẽ từ chối phiếu này.
            </p>
          ) : (
            <p className="text-[11px] text-ink-faint">
              Số dư dự kiến sau ghi:{' '}
              {target && quantityValid ? formatNumber(resultQuantity) : '—'} đơn vị
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
